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

  useEffect(() => {
    loadProductosDisponibles();
  }, []);

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

    const result = await searchClientByCarnet(carnetBusqueda);
    if (result.success && result.data) {
      setCliente(result.data);
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
      carnet: carnetBusqueda,
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
  const handleBarcodeSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && codigoBarras.trim()) {
      setIsSearchingBarcode(true);
      try {
        const result = await searchProductByBarcode(codigoBarras);
        if (result.success && result.data) {
          addProductByBarcode(result.data);
          setCodigoBarras('');
        } else {
          toast.info(result.error || 'Producto no encontrado');
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('Error al buscar producto');
      } finally {
        setIsSearchingBarcode(false);
      }
    }
  };

  const addProductByBarcode = (producto: any) => {
    const yaExisteEscaneado = itemsVenta.find(item => item.codigoBarrasId === producto.codigoBarrasId);
    if (yaExisteEscaneado) {
      toast.error('Este código de barras ya fue escaneado');
      return;
    }

    const yaExisteEnSeleccionManual = itemsVenta.find(item =>
      item.codigosSeleccionados && item.codigosSeleccionados.includes(producto.codigoBarrasId)
    );

    if (yaExisteEnSeleccionManual) {
      toast.error('Este código ya fue agregado manualmente en la venta');
      return;
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
    setItemsVenta(prev => {
      const existente = prev.find(item =>
        item.stockVentaId === producto.stockVentaId &&
        !item.esEscaneado &&
        (!item.codigosSeleccionados || item.codigosSeleccionados.length === 0)
      );

      if (existente) {
        if (existente.cantidad + 1 > producto.cantidadDisponible) {
          toast.warning(`Solo hay ${producto.cantidadDisponible} unidades disponibles`);
          return prev;
        }
        return prev.map(item => {
          if (item.id !== existente.id) return item;
          const cantidad = item.cantidad + 1;
          const subtotal = cantidad * item.precioUnitario;
          return { ...item, cantidad, subtotal, total: Math.max(0, subtotal - item.descuento) };
        });
      }

      const nuevoItem: ItemVenta = {
        id: Date.now().toString(),
        stockVentaId: producto.stockVentaId,
        productoNombre: producto.producto.nombre,
        unidadNombre: `${producto.unidad.nombre} (${producto.unidad.abreviatura})`,
        cantidad: 1,
        precioUnitario: producto.precioVenta,
        subtotal: producto.precioVenta,
        descuento: 0,
        total: producto.precioVenta,
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
    setProductoSeleccionado(null);
    setCantidadManual(1);
    setCodigosSeleccionados([]);
    onManualModalClose();
  };

  const removeItem = (id: string) => {
    setItemsVenta(itemsVenta.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ItemVenta, value: any) => {
    const updated = itemsVenta.map(item => {
      if (item.id === id) {
        if (item.esEscaneado && field === 'cantidad') {
          toast.warning('No puedes cambiar la cantidad de un producto escaneado');
          return item;
        }

        if (item.codigosSeleccionados && item.codigosSeleccionados.length > 0 && field === 'cantidad') {
          toast.warning('No puedes cambiar la cantidad porque tiene códigos específicos asignados');
          return item;
        }

        let sanitizedValue = value;
        if (field === 'precioUnitario' && sanitizedValue < 0) {
          sanitizedValue = 0;
        }
        if (field === 'descuento') {
          const subtotalActual = item.cantidad * item.precioUnitario;
          sanitizedValue = Math.min(Math.max(0, sanitizedValue), subtotalActual);
        }

        const newItem = { ...item, [field]: sanitizedValue };
        if (field === 'cantidad' || field === 'precioUnitario' || field === 'descuento') {
          newItem.subtotal = newItem.cantidad * newItem.precioUnitario;
          newItem.total = Math.max(0, newItem.subtotal - newItem.descuento);
        }
        return newItem;
      }
      return item;
    });
    setItemsVenta(updated);
  };

  const changeItemQty = (id: string, delta: number) => {
    setItemsVenta(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (item.esEscaneado || (item.codigosSeleccionados && item.codigosSeleccionados.length > 0)) return item;

      const disponible = productosDisponibles.find(p => p.stockVentaId === item.stockVentaId)?.cantidadDisponible ?? Infinity;
      const nuevaCantidad = item.cantidad + delta;

      if (nuevaCantidad <= 0) return item;
      if (nuevaCantidad > disponible) {
        toast.warning(`Solo hay ${disponible} unidades disponibles`);
        return item;
      }

      const subtotal = nuevaCantidad * item.precioUnitario;
      return { ...item, cantidad: nuevaCantidad, subtotal, total: Math.max(0, subtotal - item.descuento) };
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
      // El lector de códigos escribe en el campo con foco: se lo devolvemos para el siguiente cliente
      setTimeout(() => barcodeInputRef.current?.focus(), 250);
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
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 items-start">

        {/* ============ PANEL PRINCIPAL: BÚSQUEDA Y PRODUCTOS ============ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Venta <span className="font-semibold text-gray-700">{numeroVenta}</span>
            </p>
          </div>

          <Card className="shadow-sm">
            <CardBody className="p-4">
              <Input
                ref={barcodeInputRef}
                placeholder="Escanea o ingresa código de barras..."
                value={codigoBarras}
                onChange={(e) => setCodigoBarras(e.target.value)}
                onKeyPress={handleBarcodeSearch}
                isDisabled={isSearchingBarcode}
                startContent={<Icon icon="mdi:barcode-scan" width="20" height="20" className="text-primary-600" />}
                autoFocus
              />
            </CardBody>
          </Card>

          <Input
            placeholder="Buscar producto por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            startContent={<Icon icon="mdi:magnify" width="20" height="20" className="text-gray-400" />}
            isClearable
            onClear={() => setSearchTerm('')}
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
        <Card className="shadow-sm lg:sticky lg:top-20">
          <CardHeader className="flex items-center gap-2">
            <Icon icon="mdi:cart" width="22" height="22" className="text-primary-600" />
            <p className="font-semibold">Carrito {itemsVenta.length > 0 && `(${itemsVenta.length})`}</p>
            {itemsVenta.length > 0 && (
              <Button
                size="sm"
                color="danger"
                variant="light"
                className="ml-auto"
                onPress={() => setItemsVenta([])}
              >
                Limpiar
              </Button>
            )}
          </CardHeader>
          <CardBody className="pt-0">
            {itemsVenta.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-500">
                Aún no agregaste productos.<br />Escanea un código o haz clic en un producto.
              </div>
            ) : (
              <div className="space-y-0 max-h-[400px] overflow-y-auto pr-1">
                {itemsVenta.map((item) => {
                  const locked = item.esEscaneado || (item.codigosSeleccionados && item.codigosSeleccionados.length > 0);
                  return (
                    <div key={item.id} className="py-3 border-b border-default-200 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{item.productoNombre}</p>
                          <p className="text-xs text-gray-500">{item.unidadNombre}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {item.esEscaneado && (
                              <Chip size="sm" color="success" variant="flat">Escaneado</Chip>
                            )}
                            {item.codigosSeleccionados && item.codigosSeleccionados.length > 0 && (
                              <Chip size="sm" color="warning" variant="flat">{item.codigosSeleccionados.length} código(s)</Chip>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          color="danger"
                          variant="light"
                          isIconOnly
                          onPress={() => removeItem(item.id)}
                        >
                          <Icon icon="mdi:close" width="16" height="16" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Cantidad</p>
                          {locked ? (
                            <div className="text-sm font-semibold px-2 py-1.5 bg-default-100 rounded-lg">
                              {item.cantidad} unid.
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 border border-default-200 rounded-lg px-1 h-9 w-fit">
                              <button
                                type="button"
                                className="w-6 h-6 font-bold text-gray-600"
                                onClick={() => changeItemQty(item.id, -1)}
                              >
                                −
                              </button>
                              <span className="text-sm font-semibold w-5 text-center">{item.cantidad}</span>
                              <button
                                type="button"
                                className="w-6 h-6 font-bold text-gray-600"
                                onClick={() => changeItemQty(item.id, 1)}
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Precio unitario</p>
                          <Input
                            type="number"
                            size="sm"
                            min={0}
                            step="0.01"
                            aria-label="Precio unitario"
                            value={item.precioUnitario.toString()}
                            onChange={(e) => updateItem(item.id, 'precioUnitario', Number(e.target.value) || 0)}
                            startContent={<span className="text-xs text-gray-400">Bs.</span>}
                          />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Descuento</p>
                          <Input
                            type="number"
                            size="sm"
                            min={0}
                            max={item.subtotal}
                            step="0.01"
                            aria-label="Descuento"
                            value={item.descuento.toString()}
                            onChange={(e) => updateItem(item.id, 'descuento', Number(e.target.value) || 0)}
                            startContent={<span className="text-xs text-gray-400">Bs.</span>}
                          />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Total línea</p>
                          <div className="h-9 flex items-center text-sm font-bold text-green-600">
                            Bs. {item.total.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>

          <div className="p-4 pt-2 border-t border-default-200">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-sm text-gray-500">Subtotal</span>
              <span className="text-sm font-semibold">Bs. {totales.subtotal.toFixed(2)}</span>
            </div>
            {totales.descuento > 0 && (
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm text-gray-500">Descuento</span>
                <span className="text-sm font-semibold text-red-600">- Bs. {totales.descuento.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-2xl font-bold text-primary-700">Bs. {totales.total.toFixed(2)}</span>
            </div>
            <Button
              color="success"
              size="lg"
              className="w-full"
              isDisabled={itemsVenta.length === 0}
              onPress={onPaymentModalOpen}
              startContent={<Icon icon="mdi:cash-register" width="22" height="22" />}
            >
              Cobrar
            </Button>
          </div>
        </Card>
      </div>

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
