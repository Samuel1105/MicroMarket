"use client"
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Card, CardBody, CardHeader, Input, Button, Divider,
  Chip, Modal, ModalContent, ModalHeader,
  ModalBody, ModalFooter, useDisclosure,
  CheckboxGroup, Checkbox
} from '@heroui/react';
import { Icon } from '@iconify/react';
import {
  searchClientByCarnet,
  createClient,
  getGeneralClient,
  searchProductByBarcode,
  getAvailableProductsForSale,
  processSale,
} from '@/actions/sales/sales-action';
import { enviarProformaPorCorreo } from '@/actions/sales/email-proforma-action';
import { useAuth } from '@/app/context/AuthContext';
import { MAX_DESCUENTO_SIN_ADMIN, puedeCambiarPrecio } from '@/src/lib/sales-rules';
import { carnetValido, MENSAJE_CARNET, normalizarCarnet } from '@/src/lib/carnet';
import { toast } from 'react-toastify';

interface Cliente {
  id: number;
  carnet: string;
  nombre: string;
  correo: string;
}

interface CodigoBarras {
  id: number;
  codigo: string;
}

interface ProductoVenta {
  stockVentaId: number;
  producto: {
    id: number;
    nombre: string;
    descripcion: string | null;
    categoria: string;
  };
  unidad: {
    id: number;
    nombre: string;
    abreviatura: string | null;
  };
  lote: {
    id: number;
    numeroLote: string;
  } | null;
  cantidadDisponible: number;
  precioVenta: number;
  fechaVencimiento: string | null;
  codigosBarras: CodigoBarras[];
}

interface ItemVenta {
  id: string;
  stockVentaId: number;
  codigoBarrasId?: number;
  productoNombre: string;
  unidadNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  descuento: number;
  total: number;
  esEscaneado: boolean;
  codigosSeleccionados?: number[];
}

const redondear2 = (n: number) => Math.round(n * 100) / 100;

export function generateSaleNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const time = now.getTime().toString().slice(-6);
  return `VENTA-${year}${month}${day}-${time}`;
}

export default function SalesView() {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [carnetBusqueda, setCarnetBusqueda] = useState('');
  const [itemsVenta, setItemsVenta] = useState<ItemVenta[]>([]);
  const [numeroVenta, setNumeroVenta] = useState(generateSaleNumber());

  const [codigoBarras, setCodigoBarras] = useState('');
  const [isSearchingBarcode, setIsSearchingBarcode] = useState(false);

  const [productosDisponibles, setProductosDisponibles] = useState<ProductoVenta[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');

  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoVenta | null>(null);
  const [cantidadManual, setCantidadManual] = useState(1);
  const [codigosSeleccionados, setCodigosSeleccionados] = useState<string[]>([]);

  const [montoRecibido, setMontoRecibido] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const { isOpen: isClientModalOpen, onOpen: onClientModalOpen, onClose: onClientModalClose } = useDisclosure();
  const { isOpen: isManualModalOpen, onOpen: onManualModalOpen, onClose: onManualModalClose } = useDisclosure();
  const { isOpen: isPaymentModalOpen, onOpen: onPaymentModalOpen, onClose: onPaymentModalClose } = useDisclosure();

  const { user } = useAuth();

  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    correo: '',
  });

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  // Texto que va llegando del lector (se guarda aparte para no perder letras si llegan muy rápido)
  const bufferRef = useRef('');
  const buscandoRef = useRef(false);
  const listaRef = useRef<HTMLDivElement>(null);
  const [ultimoEscaneo, setUltimoEscaneo] = useState<{ texto: string; ok: boolean } | null>(null);
  const [resaltado, setResaltado] = useState<number | null>(null);
  const [ajustesAbiertos, setAjustesAbiertos] = useState<string[]>([]);

  useEffect(() => {
    loadProductosDisponibles();
  }, []);

  const hayModalAbierto = isClientModalOpen || isManualModalOpen || isPaymentModalOpen;
  const modalAbiertoRef = useRef(false);
  const buscarCodigoRef = useRef<(c: string) => void>(() => {});

  modalAbiertoRef.current = hayModalAbierto;

  // El lector de códigos "teclea" en el campo que tenga el foco: al cerrar cualquier ventana se lo devolvemos
  // (el modal tarda en irse y le quita el foco, por eso se intenta dos veces)
  useEffect(() => {
    if (hayModalAbierto) return;
    const t1 = setTimeout(() => barcodeInputRef.current?.focus(), 350);
    const t2 = setTimeout(() => barcodeInputRef.current?.focus(), 900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [hayModalAbierto]);

  // El lector funciona AUNQUE no hagas clic en el campo: si no estás escribiendo en otro campo, todo lo que
  // "teclee" el lector se manda al campo del código, y el Enter final busca el producto.
  useEffect(() => {
    const esCampo = (el: Element | null) =>
      !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el as HTMLElement).isContentEditable);

    const onKey = (e: KeyboardEvent) => {
      if (modalAbiertoRef.current || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;

      if (el === barcodeInputRef.current || esCampo(el)) return;

      if (e.key.length === 1) {
        e.preventDefault();
        bufferRef.current += e.key;
        setCodigoBarras(bufferRef.current);
        barcodeInputRef.current?.focus();
      } else if (e.key === 'Enter' && bufferRef.current.trim()) {
        e.preventDefault();
        buscarCodigoRef.current(bufferRef.current);
      }
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Si el campo pierde el foco por un clic en una zona sin campos, vuelve solo
  const devolverFoco = () => {
    setTimeout(() => {
      const el = document.activeElement;
      const enOtroCampo = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');

      if (!modalAbiertoRef.current && !enOtroCampo) barcodeInputRef.current?.focus();
    }, 120);
  };

  // Al agregar un producto: se resalta su línea del carrito y se muestra
  useEffect(() => {
    if (resaltado === null) return;
    const el = listaRef.current?.querySelector(`[data-sv="${resaltado}"]`);

    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const t = setTimeout(() => setResaltado(null), 1600);

    return () => clearTimeout(t);
  }, [resaltado, itemsVenta.length]);

  const loadProductosDisponibles = async () => {
    const result = await getAvailableProductsForSale();
    if (result.success && result.data) {
      setProductosDisponibles(result.data);
    }
  };

  // ========== BÚSQUEDA / FILTRADO DE PRODUCTOS ==========
  const categorias = useMemo(() => {
    const set = new Set(productosDisponibles.map(p => p.producto.categoria));
    return ['Todos', ...Array.from(set)];
  }, [productosDisponibles]);

  const productosFiltrados = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return productosDisponibles.filter(p => {
      const matchCat = activeCategory === 'Todos' || p.producto.categoria === activeCategory;
      const matchSearch = !q || p.producto.nombre.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [productosDisponibles, searchTerm, activeCategory]);

  // ========== CLIENTE ==========
  const handleSearchClient = async () => {
    if (!carnetBusqueda.trim()) {
      toast.error('Ingresa un carnet');
      return;
    }

    if (carnetBusqueda.trim() !== '0' && !carnetValido(carnetBusqueda)) {
      toast.error(MENSAJE_CARNET);
      return;
    }

    const result = await searchClientByCarnet(carnetBusqueda);
    if (result.success && result.data) {
      setCliente(result.data);
    } else if (result.success === false && result.error) {
      toast.error(result.error);
    } else {
      onClientModalOpen();
    }
  };

  const handleGeneralClient = async () => {
    const result = await getGeneralClient(user?.id || 0);

    if (result.success && result.data) {
      setCliente(result.data);
    } else {
      toast.error(result.error || 'No se pudo usar el cliente general');
    }
  };

  const handleCreateClient = async () => {
    if (!nuevoCliente.nombre.trim() || !nuevoCliente.correo.trim()) {
      toast.info('Completa todos los campos');
      return;
    }

    const usuarioId = user?.id || 0;
    const result = await createClient({
      carnet: normalizarCarnet(carnetBusqueda),
      nombre: nuevoCliente.nombre,
      correo: nuevoCliente.correo,
      usuarioIdRegistro: usuarioId,
    });

    if (result.success && result.data) {
      setCliente(result.data);
      onClientModalClose();
      setNuevoCliente({ nombre: '', correo: '' });
    } else {
      toast.error(result.error || 'Error al crear cliente');
    }
  };

  // ========== ESCANEO DE CÓDIGO DE BARRAS ==========
  const buscarCodigo = async (codigo: string) => {
    const c = codigo.trim();

    if (!c || buscandoRef.current) return;
    buscandoRef.current = true;
    setIsSearchingBarcode(true);
    // Se limpia de una vez: el lector ya empezó con el siguiente código
    bufferRef.current = '';
    setCodigoBarras('');
    try {
      const result = await searchProductByBarcode(c);

      if (result.success && result.data) {
        if (addProductByBarcode(result.data)) {
          setUltimoEscaneo({ texto: result.data.producto.nombre, ok: true });
        }
      } else {
        setUltimoEscaneo({ texto: `${c}: ${result.error || 'Producto no encontrado'}`, ok: false });
      }
    } catch (error) {
      console.error('Error:', error);
      setUltimoEscaneo({ texto: 'Error al buscar el producto', ok: false });
    } finally {
      buscandoRef.current = false;
      setIsSearchingBarcode(false);
      barcodeInputRef.current?.focus();
    }
  };

  buscarCodigoRef.current = buscarCodigo;

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && bufferRef.current.trim()) {
      e.preventDefault();
      buscarCodigo(bufferRef.current);
    }
  };

  const addProductByBarcode = (producto: any): boolean => {
    const yaExisteEscaneado = itemsVenta.find(item => item.codigoBarrasId === producto.codigoBarrasId);
    if (yaExisteEscaneado) {
      setUltimoEscaneo({ texto: `${producto.producto.nombre}: ese código ya está en el carrito`, ok: false });
      return false;
    }

    const yaExisteEnSeleccionManual = itemsVenta.find(item =>
      item.codigosSeleccionados && item.codigosSeleccionados.includes(producto.codigoBarrasId)
    );

    if (yaExisteEnSeleccionManual) {
      setUltimoEscaneo({ texto: `${producto.producto.nombre}: ese código ya se agregó a mano`, ok: false });
      return false;
    }

    const nuevoItem: ItemVenta = {
      id: Date.now().toString(),
      stockVentaId: producto.stockVentaId,
      codigoBarrasId: producto.codigoBarrasId,
      productoNombre: producto.producto.nombre,
      unidadNombre: `${producto.unidad.nombre} (${producto.unidad.abreviatura})`,
      cantidad: 1,
      precioUnitario: producto.precioVenta,
      subtotal: producto.precioVenta,
      descuento: 0,
      total: producto.precioVenta,
      esEscaneado: true,
    };

    setItemsVenta(prev => [...prev, nuevoItem]);
    setResaltado(producto.stockVentaId);

    return true;
  };

  // ========== AGREGAR PRODUCTO DESDE LA GRILLA ==========
  const handleProductCardClick = (producto: ProductoVenta) => {
    if (producto.cantidadDisponible <= 0) return;

    if (producto.codigosBarras.length > 0) {
      setProductoSeleccionado(producto);
      setCantidadManual(1);
      setCodigosSeleccionados([]);
      onManualModalOpen();
      return;
    }

    // Sin códigos de barras: agrega 1 unidad, o suma a la línea ya existente
    setResaltado(producto.stockVentaId);
    barcodeInputRef.current?.focus();
    setItemsVenta(prev => {
      const existente = prev.find(item =>
        item.stockVentaId === producto.stockVentaId &&
        !item.esEscaneado &&
        (!item.codigosSeleccionados || item.codigosSeleccionados.length === 0)
      );

      if (existente) {
        if (existente.cantidad >= producto.cantidadDisponible - 0.0001) {
          toast.warning(`Solo hay ${producto.cantidadDisponible} unidades disponibles`);
          return prev;
        }
        return prev.map(item => {
          if (item.id !== existente.id) return item;
          // Con decimales (venta por peso) no se pasa de lo que queda en el estante
          const cantidad = redondear2(Math.min(item.cantidad + 1, producto.cantidadDisponible));
          const subtotal = redondear2(cantidad * item.precioUnitario);
          return { ...item, cantidad, subtotal, total: Math.max(0, redondear2(subtotal - item.descuento)) };
        });
      }

      const cantidadInicial = Math.min(1, producto.cantidadDisponible);
      const subtotalInicial = redondear2(cantidadInicial * producto.precioVenta);
      const nuevoItem: ItemVenta = {
        id: Date.now().toString(),
        stockVentaId: producto.stockVentaId,
        productoNombre: producto.producto.nombre,
        unidadNombre: `${producto.unidad.nombre} (${producto.unidad.abreviatura})`,
        cantidad: cantidadInicial,
        precioUnitario: producto.precioVenta,
        subtotal: subtotalInicial,
        descuento: 0,
        total: subtotalInicial,
        esEscaneado: false,
      };
      return [...prev, nuevoItem];
    });
  };

  const handleAddManualProduct = () => {
    if (!productoSeleccionado || cantidadManual <= 0) {
      toast.error('Selecciona una cantidad válida');
      return;
    }

    const tieneCodigos = productoSeleccionado.codigosBarras.length > 0;

    if (tieneCodigos) {
      if (codigosSeleccionados.length === 0) {
        toast.error('Debes seleccionar los códigos de barras que deseas vender');
        return;
      }

      if (codigosSeleccionados.length !== cantidadManual) {
        toast.error(`Debes seleccionar exactamente ${cantidadManual} código(s) de barras`);
        return;
      }

      const codigosYaUsados = itemsVenta
        .filter(item => item.codigoBarrasId)
        .map(item => item.codigoBarrasId);

      const codigosSeleccionadosIds = codigosSeleccionados.map(c => parseInt(c));
      const hayDuplicados = codigosSeleccionadosIds.some(id => codigosYaUsados.includes(id));

      if (hayDuplicados) {
        toast.error('Algunos códigos seleccionados ya están en la venta');
        return;
      }
    }

    if (cantidadManual > productoSeleccionado.cantidadDisponible) {
      toast.error(`Solo hay ${productoSeleccionado.cantidadDisponible} unidades disponibles`);
      return;
    }

    const subtotal = cantidadManual * productoSeleccionado.precioVenta;
    const nuevoItem: ItemVenta = {
      id: Date.now().toString(),
      stockVentaId: productoSeleccionado.stockVentaId,
      productoNombre: productoSeleccionado.producto.nombre,
      unidadNombre: `${productoSeleccionado.unidad.nombre} (${productoSeleccionado.unidad.abreviatura})`,
      cantidad: cantidadManual,
      precioUnitario: productoSeleccionado.precioVenta,
      subtotal: subtotal,
      descuento: 0,
      total: subtotal,
      esEscaneado: false,
      codigosSeleccionados: tieneCodigos ? codigosSeleccionados.map(c => parseInt(c)) : undefined,
    };

    setItemsVenta(prev => [...prev, nuevoItem]);
    setResaltado(productoSeleccionado.stockVentaId);
    setProductoSeleccionado(null);
    setCantidadManual(1);
    setCodigosSeleccionados([]);
    onManualModalClose();
  };

  const removeItem = (id: string) => {
    setItemsVenta(itemsVenta.filter(item => item.id !== id));
  };

  // Cambia un dato (precio o descuento) de una o varias líneas a la vez (las escaneadas del mismo producto van juntas)
  const updateItems = (ids: string[], field: keyof ItemVenta, value: any) => {
    const updated = itemsVenta.map(item => {
      if (!ids.includes(item.id)) return item;

      if (item.esEscaneado && field === 'cantidad') {
        toast.warning('No puedes cambiar la cantidad de un producto escaneado');
        return item;
      }

      if (item.codigosSeleccionados && item.codigosSeleccionados.length > 0 && field === 'cantidad') {
        toast.warning('No puedes cambiar la cantidad porque tiene códigos específicos asignados');
        return item;
      }

      let sanitizedValue = value;
      if (field === 'precioUnitario') {
        if (!puedeCambiarPrecio(user?.rol)) {
          toast.warning('Solo el administrador puede cambiar el precio de venta', { toastId: 'precio-admin' });
          return item;
        }
        if (sanitizedValue < 0) sanitizedValue = 0;
      }
      if (field === 'descuento') {
        const subtotalActual = item.cantidad * item.precioUnitario;
        // Sin ser administrador el descuento tiene tope por línea
        const tope = puedeCambiarPrecio(user?.rol) ? subtotalActual : subtotalActual * MAX_DESCUENTO_SIN_ADMIN;
        if (sanitizedValue > tope + 0.005) {
          toast.warning(`Sin ser administrador el descuento máximo es del ${MAX_DESCUENTO_SIN_ADMIN * 100}% (Bs. ${tope.toFixed(2)})`, { toastId: 'desc-tope' });
        }
        sanitizedValue = redondear2(Math.min(Math.max(0, sanitizedValue), tope));
      }

      const newItem = { ...item, [field]: sanitizedValue };
      if (field === 'cantidad' || field === 'precioUnitario' || field === 'descuento') {
        newItem.subtotal = redondear2(newItem.cantidad * newItem.precioUnitario);
        newItem.total = Math.max(0, redondear2(newItem.subtotal - newItem.descuento));
      }
      return newItem;
    });
    setItemsVenta(updated);
  };

  const updateItem = (id: string, field: keyof ItemVenta, value: any) => updateItems([id], field, value);

  // ========== CARRITO AGRUPADO ==========
  // Las unidades escaneadas del mismo producto se muestran en una sola línea ("× 3"), aunque por detrás sean una por código
  const grupos = useMemo(() => {
    const out: Array<{ key: string; items: ItemVenta[] }> = [];
    const indice = new Map<string, number>();

    for (const it of itemsVenta) {
      if (it.esEscaneado) {
        const k = `scan-${it.stockVentaId}-${it.precioUnitario}`;
        const pos = indice.get(k);

        if (pos === undefined) {
          indice.set(k, out.length);
          out.push({ key: k, items: [it] });
        } else {
          out[pos].items.push(it);
        }
      } else {
        out.push({ key: `item-${it.id}`, items: [it] });
      }
    }

    return out;
  }, [itemsVenta]);

  const unidadesTotales = itemsVenta.reduce((n, i) => n + i.cantidad, 0);

  const quitarUnEscaneado = (ids: string[]) => {
    const ultimo = ids[ids.length - 1];

    setItemsVenta(prev => prev.filter(i => i.id !== ultimo));
  };

  const alternarAjustes = (key: string) =>
    setAjustesAbiertos(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));

  const changeItemQty = (id: string, delta: number) => {
    setItemsVenta(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (item.esEscaneado || (item.codigosSeleccionados && item.codigosSeleccionados.length > 0)) return item;

      const disponible = productosDisponibles.find(p => p.stockVentaId === item.stockVentaId)?.cantidadDisponible ?? Infinity;
      const nuevaCantidad = redondear2(item.cantidad + delta);

      if (nuevaCantidad <= 0) return item;
      if (nuevaCantidad > disponible + 0.0001) {
        toast.warning(`Solo hay ${disponible} unidades disponibles`);
        return item;
      }

      const subtotal = redondear2(nuevaCantidad * item.precioUnitario);
      return { ...item, cantidad: nuevaCantidad, subtotal, total: Math.max(0, redondear2(subtotal - item.descuento)) };
    }));
  };

  // Escribir la cantidad a mano (admite decimales: 0.5 kg). Se confirma al salir del campo o con Enter.
  const setItemQty = (id: string, valor: string) => {
    setItemsVenta(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (item.esEscaneado || (item.codigosSeleccionados && item.codigosSeleccionados.length > 0)) return item;

      const disponible = productosDisponibles.find(p => p.stockVentaId === item.stockVentaId)?.cantidadDisponible ?? Infinity;
      const nueva = redondear2(Number(valor.replace(',', '.')));

      if (!Number.isFinite(nueva) || nueva <= 0) {
        toast.warning('Escribe una cantidad mayor a 0');
        return item;
      }
      if (nueva > disponible + 0.0001) {
        toast.warning(`Solo hay ${disponible} disponibles`);
        const subtotalMax = redondear2(disponible * item.precioUnitario);
        return { ...item, cantidad: disponible, subtotal: subtotalMax, total: Math.max(0, redondear2(subtotalMax - item.descuento)) };
      }

      const subtotal = redondear2(nueva * item.precioUnitario);
      return { ...item, cantidad: nueva, subtotal, total: Math.max(0, redondear2(subtotal - item.descuento)) };
    }));
  };

  const calcularTotales = () => {
    const subtotal = itemsVenta.reduce((sum, item) => sum + item.subtotal, 0);
    const descuento = itemsVenta.reduce((sum, item) => sum + item.descuento, 0);
    const total = subtotal - descuento;
    const cambio = montoRecibido - total;
    return { subtotal, descuento, total, cambio };
  };

  const handleProcessSale = async () => {
    if (!cliente) {
      toast.error('Debes seleccionar un cliente');
      return;
    }

    if (itemsVenta.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }

    const totales = calcularTotales();

    if (montoRecibido < totales.total) {
      toast.error('El monto recibido es menor al total');
      return;
    }

    setIsProcessing(true);
    try {
      const usuarioId = user?.id || 0;

      const detalles = itemsVenta.flatMap(item => {
        if (item.codigosSeleccionados && item.codigosSeleccionados.length > 0) {
          return item.codigosSeleccionados.map(codigoId => ({
            stockVentaId: item.stockVentaId,
            codigoBarrasId: codigoId,
            cantidadVendida: 1,
            cantidadUnidadesBase: 1,
            precioUnitario: item.precioUnitario,
            subtotal: item.precioUnitario,
            descuento: item.descuento / item.cantidad,
            total: item.precioUnitario - (item.descuento / item.cantidad),
          }));
        }

        if (item.codigoBarrasId) {
          return [{
            stockVentaId: item.stockVentaId,
            codigoBarrasId: item.codigoBarrasId,
            cantidadVendida: 1,
            cantidadUnidadesBase: 1,
            precioUnitario: item.precioUnitario,
            subtotal: item.subtotal,
            descuento: item.descuento,
            total: item.total,
          }];
        }

        return [{
          stockVentaId: item.stockVentaId,
          cantidadVendida: item.cantidad,
          cantidadUnidadesBase: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: item.subtotal,
          descuento: item.descuento,
          total: item.total,
        }];
      });

      const result = await processSale({
        numeroVenta,
        clienteId: cliente.id,
        subtotal: totales.subtotal,
        descuento: totales.descuento,
        total: totales.total,
        montoRecibido,
        cambio: totales.cambio,
        detalles,
        usuarioId,
      });

      if (result.success && result.data) {
        // El cliente general no tiene correo: no se envía proforma
        const enviaCorreo = cliente.carnet !== '0' && !!cliente.correo;
        const emailResult = !enviaCorreo ? { success: true } : await enviarProformaPorCorreo({
          venta: {
            id: result.data.ventaId,
            numeroVenta: result.data.numeroVenta,
            subtotal: totales.subtotal,
            descuento: totales.descuento,
            total: result.data.total,
            montoRecibido: montoRecibido,
            cambio: totales.cambio,
          },
          cliente: {
            nombre: cliente.nombre,
            correo: cliente.correo,
            carnet: cliente.carnet,
          },
          items: itemsVenta.map(item => ({
            id: parseInt(item.id),
            productoNombre: item.productoNombre,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            descuento: item.descuento,
            total: item.total,
          })),
        });

        const emailStatus = !enviaCorreo
          ? ''
          : emailResult.success
            ? ' 📧 Proforma enviada'
            : ' ⚠️ Error al enviar correo';

        toast.success('Venta procesada exitosamente' + emailStatus);
        resetSale();
      } else {
        toast.error(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al procesar la venta');
    } finally {
      setIsProcessing(false);
      onPaymentModalClose();
    }
  };

  const resetSale = () => {
    setCliente(null);
    setCarnetBusqueda('');
    setItemsVenta([]);
    setMontoRecibido(0);
    setNumeroVenta(generateSaleNumber());
    loadProductosDisponibles();
  };

  const totales = calcularTotales();

  const getCodigosDisponibles = (producto: ProductoVenta) => {
    const codigosUsados = itemsVenta
      .filter(item => item.codigoBarrasId || (item.codigosSeleccionados && item.codigosSeleccionados.length > 0))
      .flatMap(item => item.codigoBarrasId ? [item.codigoBarrasId] : (item.codigosSeleccionados || []));

    return producto.codigosBarras.filter(codigo => !codigosUsados.includes(codigo.id));
  };

  return (
    <div className="w-full pb-24 lg:pb-0">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 items-start">

        {/* ============ PANEL PRINCIPAL: BÚSQUEDA Y PRODUCTOS ============ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Venta nueva <span className="text-xs text-gray-400">· el número se asigna al cobrar</span>
            </p>
          </div>

          <Card className="shadow-sm">
            <CardBody className="gap-2 p-4">
              <Input
                ref={barcodeInputRef}
                autoFocus
                aria-label="Código de barras"
                classNames={{ input: 'text-base' }}
                endContent={isSearchingBarcode ? <Icon className="animate-spin text-primary-600" height="18" icon="mdi:loading" width="18" /> : null}
                placeholder="Escanea o ingresa código de barras..."
                size="lg"
                startContent={<Icon className="text-primary-600" height="22" icon="mdi:barcode-scan" width="22" />}
                value={codigoBarras}
                onBlur={devolverFoco}
                onChange={(e) => {
                  bufferRef.current = e.target.value;
                  setCodigoBarras(e.target.value);
                }}
                onKeyDown={handleBarcodeKeyDown}
              />
              <p className={`flex items-center gap-1.5 text-xs ${ultimoEscaneo ? (ultimoEscaneo.ok ? 'text-green-700' : 'text-red-600') : 'text-gray-500'}`}>
                {ultimoEscaneo ? (
                  <>
                    <Icon height="14" icon={ultimoEscaneo.ok ? 'mdi:check-circle' : 'mdi:alert-circle'} width="14" />
                    {ultimoEscaneo.ok ? `Agregado: ${ultimoEscaneo.texto}` : ultimoEscaneo.texto}
                  </>
                ) : (
                  <>
                    <Icon height="14" icon="mdi:flash" width="14" />
                    Lector listo: escanea directamente, no hace falta hacer clic aquí.
                  </>
                )}
              </p>
            </CardBody>
          </Card>

          <Input
            placeholder="Buscar producto por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            startContent={<Icon icon="mdi:magnify" width="20" height="20" className="text-gray-400" />}
            isClearable
            onClear={() => setSearchTerm('')}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchTerm('');
                barcodeInputRef.current?.focus();
              } else if (e.key === 'Enter' && /^\d{8,}$/.test(searchTerm.trim())) {
                // Parece un código de barras (el lector escribió aquí): se busca como código
                buscarCodigo(searchTerm);
                setSearchTerm('');
              }
            }}
          />

          <div className="flex gap-2 flex-wrap">
            {categorias.map((cat) => (
              <Chip
                key={cat}
                variant={activeCategory === cat ? 'solid' : 'flat'}
                color={activeCategory === cat ? 'primary' : 'default'}
                className="cursor-pointer"
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Chip>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {productosFiltrados.map((p) => {
              const agotado = p.cantidadDisponible <= 0;
              return (
                <button
                  key={p.stockVentaId}
                  type="button"
                  disabled={agotado}
                  onClick={() => handleProductCardClick(p)}
                  className={`text-left rounded-xl border p-3 bg-white shadow-sm transition-all ${
                    agotado
                      ? 'opacity-50 cursor-not-allowed border-default-200'
                      : 'border-default-200 hover:border-primary-300 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Chip size="sm" variant="flat" color="secondary" className="text-[10px]">
                      {p.producto.categoria}
                    </Chip>
                    {p.codigosBarras.length > 0 && (
                      <Icon icon="mdi:barcode" width="16" height="16" className="text-gray-400" />
                    )}
                  </div>
                  <p className="font-semibold text-sm leading-tight mb-1">{p.producto.nombre}</p>
                  <p className="text-base font-bold text-primary-700">Bs. {p.precioVenta.toFixed(2)}</p>
                  <p className={`text-xs mt-1 ${!agotado && p.cantidadDisponible < 10 ? 'text-warning-600 font-semibold' : 'text-gray-500'}`}>
                    {agotado ? 'Agotado' : `${p.cantidadDisponible} disponibles`}
                  </p>
                </button>
              );
            })}

            {productosFiltrados.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500 text-sm">
                No se encontraron productos.
              </div>
            )}
          </div>
        </div>

        {/* ============ PANEL LATERAL: CARRITO ============ */}
        <Card className="scroll-mt-20 shadow-sm lg:sticky lg:top-20" id="carrito-pos">
          <CardHeader className="flex items-center gap-3 pb-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Icon height="22" icon="mdi:cart" width="22" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold leading-tight">Carrito</p>
              <p className="text-xs text-gray-500">
                {itemsVenta.length === 0
                  ? 'Vacío'
                  : `${grupos.length} ${grupos.length === 1 ? 'producto' : 'productos'} · ${redondear2(unidadesTotales)} ${unidadesTotales === 1 ? 'unidad' : 'unidades'}`}
              </p>
            </div>
            {itemsVenta.length > 0 && (
              <Button className="ml-auto" color="danger" size="sm" variant="light" onPress={() => setItemsVenta([])}>
                Vaciar
              </Button>
            )}
          </CardHeader>
          <CardBody className="px-3 pt-0">
            {itemsVenta.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                Aún no agregaste productos.<br />Escanea un código o haz clic en un producto.
              </div>
            ) : (
              <div ref={listaRef} className="max-h-[calc(100vh-490px)] min-h-[180px] space-y-2 overflow-y-auto pr-1">
                {grupos.map((g) => {
                  const first = g.items[0];
                  const ids = g.items.map((i) => i.id);
                  const escaneado = first.esEscaneado;
                  const conCodigos = !!first.codigosSeleccionados && first.codigosSeleccionados.length > 0;
                  const bloqueada = escaneado || conCodigos;
                  const cantidad = redondear2(g.items.reduce((n, i) => n + i.cantidad, 0));
                  const total = g.items.reduce((n, i) => n + i.total, 0);
                  const descuento = g.items.reduce((n, i) => n + i.descuento, 0);
                  const subtotal = g.items.reduce((n, i) => n + i.subtotal, 0);
                  const abierto = ajustesAbiertos.includes(g.key);
                  const esAdmin = puedeCambiarPrecio(user?.rol);

                  return (
                    <div
                      key={g.key}
                      className={`rounded-xl border p-3 transition-colors ${
                        resaltado === first.stockVentaId ? 'border-primary-300 bg-primary-50/60' : 'border-default-200 bg-white'
                      }`}
                      data-sv={first.stockVentaId}
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold leading-snug">{first.productoNombre}</p>
                          <p className="text-xs text-gray-500">
                            {first.unidadNombre} · Bs. {first.precioUnitario.toFixed(2)} c/u
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-base font-bold leading-tight text-gray-900">Bs. {total.toFixed(2)}</p>
                          {descuento > 0 && <p className="text-[11px] text-red-600">Desc. − Bs. {descuento.toFixed(2)}</p>}
                        </div>
                        <Button
                          isIconOnly
                          aria-label={`Quitar ${first.productoNombre}`}
                          className="-mr-1 -mt-1 h-7 w-7 min-w-7"
                          color="danger"
                          size="sm"
                          variant="light"
                          onPress={() => setItemsVenta((prev) => prev.filter((i) => !ids.includes(i.id)))}
                        >
                          <Icon height="16" icon="mdi:close" width="16" />
                        </Button>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        {escaneado ? (
                          <div className="flex h-8 items-center gap-1 rounded-lg border border-default-200 px-1">
                            <button
                              aria-label="Quitar uno"
                              className="h-6 w-6 font-bold text-gray-600"
                              type="button"
                              onClick={() => (g.items.length > 1 ? quitarUnEscaneado(ids) : setItemsVenta((prev) => prev.filter((i) => i.id !== ids[0])))}
                            >
                              −
                            </button>
                            <span className="min-w-[4.5rem] text-center text-sm font-semibold">
                              {cantidad} <span className="text-[11px] font-normal text-green-700">escaneado{cantidad === 1 ? '' : 's'}</span>
                            </span>
                            <button
                              aria-label="Escanear otro"
                              className="h-6 w-6 font-bold text-gray-600"
                              title="Escanea otro código de este producto"
                              type="button"
                              onClick={() => barcodeInputRef.current?.focus()}
                            >
                              +
                            </button>
                          </div>
                        ) : conCodigos ? (
                          <Chip color="warning" size="sm" variant="flat">
                            {cantidad} con código elegido
                          </Chip>
                        ) : (
                          <div className="flex h-8 w-fit items-center gap-1 rounded-lg border border-default-200 px-1">
                            <button className="h-6 w-6 font-bold text-gray-600" type="button" onClick={() => changeItemQty(first.id, -1)}>
                              −
                            </button>
                            <input
                              key={`${first.id}-${first.cantidad}`}
                              aria-label={`Cantidad de ${first.productoNombre}`}
                              className="w-14 bg-transparent text-center text-sm font-semibold outline-none"
                              defaultValue={first.cantidad}
                              inputMode="decimal"
                              onBlur={(e) => {
                                if (Number(e.target.value) !== first.cantidad) setItemQty(first.id, e.target.value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              }}
                            />
                            <button className="h-6 w-6 font-bold text-gray-600" type="button" onClick={() => changeItemQty(first.id, 1)}>
                              +
                            </button>
                          </div>
                        )}

                        <button
                          className="flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:underline"
                          type="button"
                          onClick={() => alternarAjustes(g.key)}
                        >
                          {esAdmin ? 'Precio y descuento' : 'Descuento'}
                          <Icon height="14" icon={abierto ? 'mdi:chevron-up' : 'mdi:chevron-down'} width="14" />
                        </button>
                      </div>

                      {abierto && (
                        <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-default-50 p-2">
                          <Input
                            aria-label="Precio unitario"
                            description={!esAdmin ? 'Solo el administrador cambia el precio' : undefined}
                            isReadOnly={!esAdmin}
                            label="Precio c/u"
                            labelPlacement="outside"
                            min={0}
                            size="sm"
                            startContent={<span className="text-xs text-gray-400">Bs.</span>}
                            step="0.01"
                            type="number"
                            value={first.precioUnitario.toString()}
                            onChange={(e) => updateItems(ids, 'precioUnitario', Number(e.target.value) || 0)}
                          />
                          <Input
                            aria-label="Descuento"
                            description={`Sobre Bs. ${subtotal.toFixed(2)}`}
                            label="Descuento"
                            labelPlacement="outside"
                            max={subtotal}
                            min={0}
                            size="sm"
                            startContent={<span className="text-xs text-gray-400">Bs.</span>}
                            step="0.01"
                            type="number"
                            value={descuento ? redondear2(descuento).toString() : ''}
                            placeholder="0.00"
                            onChange={(e) => updateItems(ids, 'descuento', (Number(e.target.value) || 0) / ids.length)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>

          <div className="border-t border-default-200 p-4 pt-3">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm text-gray-500">Subtotal</span>
              <span className="text-sm font-semibold">Bs. {totales.subtotal.toFixed(2)}</span>
            </div>
            {totales.descuento > 0 && (
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-sm text-gray-500">Descuento</span>
                <span className="text-sm font-semibold text-red-600">- Bs. {totales.descuento.toFixed(2)}</span>
              </div>
            )}
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-3xl font-bold text-primary-700">Bs. {totales.total.toFixed(2)}</span>
            </div>
            <Button
              className="w-full"
              color="success"
              isDisabled={itemsVenta.length === 0}
              size="lg"
              startContent={<Icon height="22" icon="mdi:cash-register" width="22" />}
              onPress={onPaymentModalOpen}
            >
              Cobrar
            </Button>
          </div>
        </Card>
      </div>

      {/* Celular: barra fija con el total y el botón de cobrar, para no tener que bajar hasta el carrito */}
      {itemsVenta.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-default-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <button
              className="flex min-w-0 flex-1 flex-col text-left"
              type="button"
              onClick={() => document.getElementById('carrito-pos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              <span className="text-xs text-gray-500">
                {grupos.length} {grupos.length === 1 ? 'producto' : 'productos'} · {redondear2(unidadesTotales)} un. · <span className="text-primary-600">ver carrito</span>
              </span>
              <span className="text-xl font-bold leading-tight text-primary-700">Bs. {totales.total.toFixed(2)}</span>
            </button>
            <Button color="success" size="lg" startContent={<Icon height="20" icon="mdi:cash-register" width="20" />} onPress={onPaymentModalOpen}>
              Cobrar
            </Button>
          </div>
        </div>
      )}

      {/* Modal: Registrar nuevo cliente */}
      <Modal backdrop="blur" isOpen={isClientModalOpen} radius="lg" onClose={onClientModalClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-100 text-primary-600 shrink-0">
                    <Icon icon="mdi:account-plus" width="24" height="24" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold leading-tight">Registrar Nuevo Cliente</h2>
                    <p className="text-sm text-zinc-500 font-normal">Se creará con el carnet buscado</p>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    label="Carnet"
                    value={carnetBusqueda}
                    isReadOnly
                    variant="bordered"
                  />
                  <Input
                    label="Nombre Completo"
                    placeholder="Ingresa el nombre"
                    value={nuevoCliente.nombre}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                    isRequired
                  />
                  <Input
                    label="Correo Electrónico"
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={nuevoCliente.correo}
                    onChange={(e) => setNuevoCliente({ ...nuevoCliente, correo: e.target.value })}
                    isRequired
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="flat" radius="lg" onPress={onClose}>
                  Cancelar
                </Button>
                <Button color="primary" radius="lg" onPress={handleCreateClient} startContent={<Icon icon="mdi:check" width="18" height="18" />}>
                  Registrar Cliente
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal: Seleccionar códigos de barras de un producto */}
      <Modal backdrop="blur" isOpen={isManualModalOpen} radius="lg" scrollBehavior="inside" size="2xl" onClose={onManualModalClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 pt-6 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-secondary-100 text-secondary-600 shrink-0">
                    <Icon icon="mdi:barcode" width="24" height="24" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold leading-tight">{productoSeleccionado?.producto.nombre}</h2>
                    <p className="text-sm text-zinc-500 font-normal">Este producto tiene códigos de barras registrados</p>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody className="py-5">
                {productoSeleccionado && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg space-y-1 text-sm">
                      <p><strong>Precio:</strong> Bs. {productoSeleccionado.precioVenta.toFixed(2)}</p>
                      <p><strong>Disponible:</strong> {productoSeleccionado.cantidadDisponible} unidades</p>
                      {productoSeleccionado.lote && (
                        <p><strong>Lote:</strong> {productoSeleccionado.lote.numeroLote}</p>
                      )}
                    </div>

                    <Input
                      type="number"
                      label="Cantidad"
                      value={cantidadManual.toString()}
                      onChange={(e) => {
                        const nuevaCantidad = Number(e.target.value) || 0;
                        setCantidadManual(nuevaCantidad);
                        if (codigosSeleccionados.length !== nuevaCantidad) {
                          setCodigosSeleccionados([]);
                        }
                      }}
                      min="1"
                      max={productoSeleccionado.cantidadDisponible}
                    />

                    <div className="space-y-2">
                      <div className="bg-warning-50 border border-warning-200 p-3 rounded-lg">
                        <p className="text-sm font-semibold text-warning-800 mb-2">
                          <Icon icon="mdi:information" width="16" height="16" className="inline mr-1" />
                          Selecciona exactamente {cantidadManual} código(s) de barras
                        </p>
                      </div>

                      <CheckboxGroup
                        label="Códigos de Barras Disponibles"
                        value={codigosSeleccionados}
                        onValueChange={setCodigosSeleccionados}
                        color="primary"
                      >
                        {getCodigosDisponibles(productoSeleccionado).map((codigo) => (
                          <Checkbox
                            key={codigo.id.toString()}
                            value={codigo.id.toString()}
                            isDisabled={codigosSeleccionados.length >= cantidadManual && !codigosSeleccionados.includes(codigo.id.toString())}
                          >
                            <div className="flex items-center gap-2">
                              <Icon icon="mdi:barcode" width="18" height="18" />
                              <span className="font-mono text-sm">{codigo.codigo}</span>
                            </div>
                          </Checkbox>
                        ))}
                      </CheckboxGroup>

                      {getCodigosDisponibles(productoSeleccionado).length === 0 && (
                        <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                          <p className="text-sm text-red-800">
                            <Icon icon="mdi:alert-circle" width="16" height="16" className="inline mr-1" />
                            No hay códigos de barras disponibles. Todos están en uso o ya fueron vendidos.
                          </p>
                        </div>
                      )}

                      {codigosSeleccionados.length > 0 && (
                        <div className="bg-success-50 border border-success-200 p-3 rounded-lg">
                          <p className="text-sm text-success-800">
                            <Icon icon="mdi:check-circle" width="16" height="16" className="inline mr-1" />
                            Seleccionados: {codigosSeleccionados.length} de {cantidadManual} requeridos
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter className="border-t border-zinc-100">
                <Button color="default" variant="flat" radius="lg" onPress={onClose}>
                  Cancelar
                </Button>
                <Button
                  color="primary"
                  radius="lg"
                  onPress={handleAddManualProduct}
                  startContent={<Icon icon="mdi:plus" width="18" height="18" />}
                  isDisabled={
                    !productoSeleccionado ||
                    cantidadManual <= 0 ||
                    codigosSeleccionados.length !== cantidadManual
                  }
                >
                  Agregar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal: Cobrar (cliente + pago) */}
      <Modal backdrop="blur" isOpen={isPaymentModalOpen} radius="lg" onClose={onPaymentModalClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-green-100 text-green-600 shrink-0">
                    <Icon icon="mdi:cash-register" width="24" height="24" />
                  </div>
                  <h2 className="text-lg font-semibold leading-tight">Cobrar</h2>
                </div>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  {/* Cliente */}
                  {cliente ? (
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon icon="mdi:account" width="22" height="22" className="text-green-600" />
                        <div>
                          <p className="font-semibold text-sm">{cliente.nombre}</p>
                          <p className="text-xs text-gray-500">{cliente.carnet}</p>
                        </div>
                      </div>
                      <Button size="sm" color="danger" variant="light" onPress={() => setCliente(null)}>
                        Cambiar
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Carnet del cliente"
                          value={carnetBusqueda}
                          onChange={(e) => setCarnetBusqueda(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSearchClient()}
                          startContent={<Icon icon="mdi:card-account-details" width="20" height="20" />}
                        />
                        <Button color="primary" onPress={handleSearchClient} isIconOnly>
                          <Icon icon="mdi:magnify" width="20" height="20" />
                        </Button>
                      </div>
                      <Button
                        fullWidth
                        variant="flat"
                        startContent={<Icon icon="mdi:account-off-outline" width="18" height="18" />}
                        onPress={handleGeneralClient}
                      >
                        Venta rápida: cliente general (sin datos)
                      </Button>
                    </div>
                  )}

                  <Divider />

                  {/* Resumen de productos */}
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {itemsVenta.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600 truncate pr-2">
                          {item.cantidad} × {item.productoNombre}
                        </span>
                        <span className="font-medium shrink-0">Bs. {item.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal</span>
                      <span>Bs. {totales.subtotal.toFixed(2)}</span>
                    </div>
                    {totales.descuento > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Descuento</span>
                        <span>- Bs. {totales.descuento.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-primary-50 p-4 rounded-lg">
                    <div className="flex justify-between text-lg">
                      <span>Total a Pagar:</span>
                      <span className="font-bold text-primary-600">Bs. {totales.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <Input
                    type="number"
                    label="Monto Recibido"
                    placeholder="0.00"
                    min={0}
                    step="0.01"
                    value={montoRecibido.toString()}
                    onChange={(e) => setMontoRecibido(Math.max(0, Number(e.target.value) || 0))}
                    startContent={<span className="text-sm">Bs.</span>}
                    size="lg"
                  />

                  {montoRecibido >= totales.total && montoRecibido > 0 && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex justify-between text-lg">
                        <span className="font-semibold">Cambio:</span>
                        <span className="font-bold text-green-600">Bs. {totales.cambio.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {montoRecibido > 0 && montoRecibido < totales.total && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <p className="text-red-600 text-sm">
                        Falta: Bs. {(totales.total - montoRecibido).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="flat" radius="lg" onPress={onClose}>
                  Cancelar
                </Button>
                <Button
                  color="success"
                  radius="lg"
                  onPress={handleProcessSale}
                  isLoading={isProcessing}
                  isDisabled={!cliente || totales.total <= 0 || montoRecibido < totales.total}
                  startContent={!isProcessing && <Icon icon="mdi:check-circle" width="20" height="20" />}
                >
                  {isProcessing ? 'Procesando...' : 'Confirmar Venta'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
