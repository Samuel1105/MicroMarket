"use client"
import React, { useState, useEffect, useRef } from 'react';
import {
  Card, CardBody, CardHeader, Input, Button, Divider,
  Table, TableHeader, TableColumn, TableBody, TableRow,
  TableCell, Chip, Modal, ModalContent, ModalHeader,
  ModalBody, ModalFooter, useDisclosure, Select, SelectItem,
  CheckboxGroup, Checkbox
} from '@heroui/react';
import { Icon } from '@iconify/react';
import {
  searchClientByCarnet,
  createClient,
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
    // Verificar si el código ya fue escaneado directamente
    const yaExisteEscaneado = itemsVenta.find(item => item.codigoBarrasId === producto.codigoBarrasId);
    if (yaExisteEscaneado) {
      toast.error('Este código de barras ya fue escaneado');
      return;
    }
    
    // Verificar si el código está en alguna selección manual de códigos
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
    
    setItemsVenta([...itemsVenta, nuevoItem]);
  };
  
  const handleAddManualProduct = () => {
    if (!productoSeleccionado || cantidadManual <= 0) {
      toast.error('Selecciona un producto y cantidad válida');
      return;
    }
    
    const tieneCodigos = productoSeleccionado.codigosBarras.length > 0;
    
    // Si tiene códigos, debe seleccionar exactamente la cantidad que va a vender
    if (tieneCodigos) {
      if (codigosSeleccionados.length === 0) {
        toast.error('Debes seleccionar los códigos de barras que deseas vender');
        return;
      }
      
      if (codigosSeleccionados.length !== cantidadManual) {
        toast.error(`Debes seleccionar exactamente ${cantidadManual} código(s) de barras`);
        return;
      }
      
      // Verificar que los códigos no estén ya en la venta
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
    
    setItemsVenta([...itemsVenta, nuevoItem]);
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
        // Si es escaneado, NO permitir cambiar cantidad
        if (item.esEscaneado && field === 'cantidad') {
          toast.warning('No puedes cambiar la cantidad de un producto escaneado');
          return item;
        }
        
        // Si tiene códigos seleccionados, NO permitir cambiar cantidad
        if (item.codigosSeleccionados && item.codigosSeleccionados.length > 0 && field === 'cantidad') {
          toast.warning('No puedes cambiar la cantidad porque tiene códigos específicos asignados');
          return item;
        }
        
        const newItem = { ...item, [field]: value };
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
      
      // Preparar detalles considerando códigos múltiples
      const detalles = itemsVenta.flatMap(item => {
        // Si tiene códigos seleccionados múltiples, crear un detalle por cada código
        if (item.codigosSeleccionados && item.codigosSeleccionados.length > 0) {
          return item.codigosSeleccionados.map(codigoId => ({
            stockVentaId: item.stockVentaId,
            codigoBarrasId: codigoId,
            cantidadVendida: 1, // Cada código es 1 unidad
            cantidadUnidadesBase: 1,
            precioUnitario: item.precioUnitario,
            subtotal: item.precioUnitario,
            descuento: item.descuento / item.cantidad, // Descuento prorrateado
            total: item.precioUnitario - (item.descuento / item.cantidad),
          }));
        }
        
        // Si es un código escaneado individual
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
        
        // Venta manual sin códigos
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
        const emailResult = await enviarProformaPorCorreo({
          venta: {
            id: result.data.ventaId,
            numeroVenta: result.data.numeroVenta,
            subtotal: totales.subtotal,      // ✅ Agregado
            descuento: totales.descuento,    // ✅ Agregado
            total: result.data.total,
            montoRecibido: montoRecibido,    // ✅ Agregado
            cambio: totales.cambio,          // ✅ Agregado
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
            descuento: item.descuento,       // ✅ Agregado
            total: item.total,
          })),
        });

        const emailStatus = emailResult.success 
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
  
  // Obtener códigos disponibles (no usados en la venta actual)
  const getCodigosDisponibles = (producto: ProductoVenta) => {
    const codigosUsados = itemsVenta
      .filter(item => item.codigoBarrasId || (item.codigosSeleccionados && item.codigosSeleccionados.length > 0))
      .flatMap(item => item.codigoBarrasId ? [item.codigoBarrasId] : (item.codigosSeleccionados || []));
    
    return producto.codigosBarras.filter(codigo => !codigosUsados.includes(codigo.id));
  };
  
  return (
    <div className="w-full space-y-6">
      {/* Información de venta y cliente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <Icon icon="mdi:receipt" width="24" height="24" className="text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Número de Venta</p>
                <p className="font-bold text-lg">{numeroVenta}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="p-4">
            {cliente ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon icon="mdi:account" width="24" height="24" className="text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Cliente</p>
                    <p className="font-bold">{cliente.nombre}</p>
                    <p className="text-xs text-gray-500">{cliente.carnet}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  color="danger"
                  variant="light"
                  onPress={() => setCliente(null)}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Carnet del cliente"
                  value={carnetBusqueda}
                  onChange={(e) => setCarnetBusqueda(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchClient()}
                  startContent={<Icon icon="mdi:card-account-details" width="20" height="20" />}
                />
                <Button
                  color="primary"
                  onPress={handleSearchClient}
                  isIconOnly
                >
                  <Icon icon="mdi:magnify" width="20" height="20" />
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
      
      {/* Búsqueda de productos */}
      <Card>
        <CardHeader className="flex gap-3 px-6 py-4">
          <Icon icon="mdi:barcode-scan" width="24" height="24" className="text-blue-600" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">Agregar Productos</p>
            <p className="text-small text-default-500">Escanea código de barras o selecciona manualmente</p>
          </div>
        </CardHeader>
        <CardBody className="px-6 pb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              ref={barcodeInputRef}
              placeholder="Escanea o ingresa código de barras..."
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              onKeyPress={handleBarcodeSearch}
              isDisabled={isSearchingBarcode}
              startContent={<Icon icon="mdi:barcode-scan" width="20" height="20" />}
              className="flex-1"
              autoFocus
            />
            <Button
              color="primary"
              variant="flat"
              onPress={onManualModalOpen}
              startContent={<Icon icon="mdi:plus" width="20" height="20" />}
            >
              Agregar Manual
            </Button>
          </div>
        </CardBody>
      </Card>
      
      {/* Lista de items */}
      {itemsVenta.length > 0 && (
        <Card>
          <CardHeader className="px-6 py-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Icon icon="mdi:cart" width="24" height="24" className="text-blue-600" />
                <p className="text-md font-semibold">Productos en la Venta ({itemsVenta.length})</p>
              </div>
              <Button
                size="sm"
                color="danger"
                variant="light"
                onPress={() => setItemsVenta([])}
                startContent={<Icon icon="mdi:delete-sweep" width="18" height="18" />}
              >
                Limpiar Todo
              </Button>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {/* Mobile */}
            <div className="md:hidden space-y-2 p-4">
              {itemsVenta.map((item) => (
                <Card key={item.id} className="border">
                  <CardBody className="p-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">{item.productoNombre}</p>
                          <p className="text-xs text-gray-500">{item.unidadNombre}</p>
                          {item.esEscaneado && (
                            <Chip size="sm" color="success" variant="flat" className="mt-1">
                              <Icon icon="mdi:barcode" width="12" height="12" className="mr-1" />
                              Escaneado - Cantidad fija
                            </Chip>
                          )}
                          {item.codigosSeleccionados && item.codigosSeleccionados.length > 0 && (
                            <Chip size="sm" color="warning" variant="flat" className="mt-1">
                              <Icon icon="mdi:barcode-scan" width="12" height="12" className="mr-1" />
                              {item.codigosSeleccionados.length} código(s) - Cantidad fija
                            </Chip>
                          )}
                        </div>
                        <Button
                          size="sm"
                          color="danger"
                          variant="light"
                          isIconOnly
                          onPress={() => removeItem(item.id)}
                        >
                          <Icon icon="mdi:close" width="18" height="18" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          size="sm"
                          label="Cantidad"
                          value={item.cantidad.toString()}
                          onChange={(e) => updateItem(item.id, 'cantidad', Number(e.target.value) || 0)}
                          min="1"
                          isDisabled={item.esEscaneado || (item.codigosSeleccionados && item.codigosSeleccionados.length > 0)}
                        />
                        <Input
                          type="number"
                          size="sm"
                          label="Precio"
                          value={item.precioUnitario.toString()}
                          onChange={(e) => updateItem(item.id, 'precioUnitario', Number(e.target.value) || 0)}
                          startContent={<span className="text-xs">Bs.</span>}
                        />
                        <Input
                          type="number"
                          size="sm"
                          label="Descuento"
                          value={item.descuento.toString()}
                          onChange={(e) => updateItem(item.id, 'descuento', Number(e.target.value) || 0)}
                          startContent={<span className="text-xs">Bs.</span>}
                          className="col-span-2"
                        />
                      </div>
                      
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span>Subtotal:</span>
                        <span className="font-semibold">Bs. {item.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold">
                        <span>Total:</span>
                        <span className="text-green-600">Bs. {item.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
            
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <Table aria-label="Items de venta">
                <TableHeader>
                  <TableColumn>PRODUCTO</TableColumn>
                  <TableColumn>CANTIDAD</TableColumn>
                  <TableColumn>PRECIO UNIT.</TableColumn>
                  <TableColumn>SUBTOTAL</TableColumn>
                  <TableColumn>DESCUENTO</TableColumn>
                  <TableColumn>TOTAL</TableColumn>
                  <TableColumn>ACCIONES</TableColumn>
                </TableHeader>
                <TableBody>
                  {itemsVenta.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.productoNombre}</p>
                          <p className="text-xs text-gray-500">{item.unidadNombre}</p>
                          {item.esEscaneado && (
                            <Chip size="sm" color="success" variant="flat" className="mt-1">
                              <Icon icon="mdi:barcode" width="14" height="14" />
                            </Chip>
                          )}
                          {item.codigosSeleccionados && item.codigosSeleccionados.length > 0 && (
                            <Chip size="sm" color="warning" variant="flat" className="mt-1">
                              {item.codigosSeleccionados.length} código(s)
                            </Chip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          size="sm"
                          value={item.cantidad.toString()}
                          onChange={(e) => updateItem(item.id, 'cantidad', Number(e.target.value) || 0)}
                          min="1"
                          className="w-20"
                          isDisabled={item.esEscaneado || (item.codigosSeleccionados && item.codigosSeleccionados.length > 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          size="sm"
                          value={item.precioUnitario.toString()}
                          onChange={(e) => updateItem(item.id, 'precioUnitario', Number(e.target.value) || 0)}
                          startContent={<span className="text-xs">Bs.</span>}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">Bs. {item.subtotal.toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          size="sm"
                          value={item.descuento.toString()}
                          onChange={(e) => updateItem(item.id, 'descuento', Number(e.target.value) || 0)}
                          startContent={<span className="text-xs">Bs.</span>}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-green-600">Bs. {item.total.toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          color="danger"
                          variant="light"
                          isIconOnly
                          onPress={() => removeItem(item.id)}
                        >
                          <Icon icon="mdi:delete" width="20" height="20" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardBody>
        </Card>
      )}
      
      {/* Totales y pago */}
      {itemsVenta.length > 0 && cliente && (
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardBody className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between text-lg">
                  <span>Subtotal:</span>
                  <span className="font-semibold">Bs. {totales.subtotal.toFixed(2)}</span>
                </div>
                {totales.descuento > 0 && (
                  <div className="flex justify-between text-lg">
                    <span>Descuento:</span>
                    <span className="font-semibold text-red-600">- Bs. {totales.descuento.toFixed(2)}</span>
                  </div>
                )}
                <Divider />
                <div className="flex justify-between text-2xl font-bold">
                  <span>Total a Pagar:</span>
                  <span className="text-green-600">Bs. {totales.total.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-center">
                <Button
                  color="success"
                  size="lg"
                  className="w-full md:w-auto px-12"
                  onPress={onPaymentModalOpen}
                  startContent={<Icon icon="mdi:cash-register" width="24" height="24" />}
                >
                  Procesar Pago
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
      
      {/* Modal: Registrar nuevo cliente */}
      <Modal isOpen={isClientModalOpen} onClose={onClientModalClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Registrar Nuevo Cliente</ModalHeader>
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
                    onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
                    isRequired
                  />
                  <Input
                    label="Correo Electrónico"
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={nuevoCliente.correo}
                    onChange={(e) => setNuevoCliente({...nuevoCliente, correo: e.target.value})}
                    isRequired
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancelar
                </Button>
                <Button color="primary" onPress={handleCreateClient}>
                  Registrar Cliente
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      
      {/* Modal: Agregar producto manual */}
      <Modal isOpen={isManualModalOpen} onClose={onManualModalClose} size="3xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Seleccionar Producto</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Select
                    label="Producto"
                    placeholder="Selecciona un producto"
                    selectedKeys={productoSeleccionado ? [productoSeleccionado.stockVentaId.toString()] : []}
                    onSelectionChange={(keys) => {
                      const key = Array.from(keys)[0] as string;
                      const producto = productosDisponibles.find(p => p.stockVentaId === Number(key));
                      setProductoSeleccionado(producto || null);
                      setCantidadManual(1);
                      setCodigosSeleccionados([]);
                    }}
                  >
                    {productosDisponibles.map((producto) => (
                      <SelectItem key={producto.stockVentaId.toString()}>
                        {producto.producto.nombre} - {producto.unidad.nombre} 
                        (Disponible: {producto.cantidadDisponible})
                        {producto.codigosBarras.length > 0 && ` - ${producto.codigosBarras.length} código(s)`}
                      </SelectItem>
                    ))}
                  </Select>
                  
                  {productoSeleccionado && (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <p><strong>Precio:</strong> Bs. {productoSeleccionado.precioVenta.toFixed(2)}</p>
                        <p><strong>Disponible:</strong> {productoSeleccionado.cantidadDisponible} unidades</p>
                        {productoSeleccionado.lote && (
                          <p><strong>Lote:</strong> {productoSeleccionado.lote.numeroLote}</p>
                        )}
                        {productoSeleccionado.codigosBarras.length > 0 && (
                          <p className="text-warning">
                            <Icon icon="mdi:alert" width="16" height="16" className="inline mr-1" />
                            <strong>Este producto tiene códigos de barras registrados</strong>
                          </p>
                        )}
                      </div>
                      
                      <Input
                        type="number"
                        label="Cantidad"
                        value={cantidadManual.toString()}
                        onChange={(e) => {
                          const nuevaCantidad = Number(e.target.value) || 0;
                          setCantidadManual(nuevaCantidad);
                          // Limpiar selección de códigos si cambia la cantidad
                          if (productoSeleccionado.codigosBarras.length > 0 && codigosSeleccionados.length !== nuevaCantidad) {
                            setCodigosSeleccionados([]);
                          }
                        }}
                        min="1"
                        max={productoSeleccionado.cantidadDisponible}
                      />
                      
                      {/* Selección de códigos de barras */}
                      {productoSeleccionado.codigosBarras.length > 0 && (
                        <div className="space-y-2">
                          <div className="bg-warning-50 border border-warning-200 p-3 rounded-lg">
                            <p className="text-sm font-semibold text-warning-800 mb-2">
                              <Icon icon="mdi:information" width="16" height="16" className="inline mr-1" />
                              Selecciona exactamente {cantidadManual} código(s) de barras
                            </p>
                            <p className="text-xs text-warning-700">
                              Este producto tiene códigos registrados. Debes seleccionar cuáles deseas vender.
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
                      )}
                      
                      {productoSeleccionado.codigosBarras.length === 0 && (
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <Icon icon="mdi:information" width="16" height="16" className="inline mr-1" />
                            Este producto no tiene códigos de barras. Puedes modificar la cantidad libremente.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancelar
                </Button>
                <Button 
                  color="primary" 
                  onPress={handleAddManualProduct}
                  isDisabled={
                    !productoSeleccionado || 
                    cantidadManual <= 0 ||
                    (productoSeleccionado.codigosBarras.length > 0 && codigosSeleccionados.length !== cantidadManual)
                  }
                >
                  Agregar
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      
      {/* Modal: Procesar pago */}
      <Modal isOpen={isPaymentModalOpen} onClose={onPaymentModalClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Procesar Pago</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex justify-between text-lg mb-2">
                      <span>Total a Pagar:</span>
                      <span className="font-bold text-blue-600">Bs. {totales.total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <Input
                    type="number"
                    label="Monto Recibido"
                    placeholder="0.00"
                    value={montoRecibido.toString()}
                    onChange={(e) => setMontoRecibido(Number(e.target.value) || 0)}
                    startContent={<span className="text-sm">Bs.</span>}
                    size="lg"
                  />
                  
                  {montoRecibido >= totales.total && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex justify-between text-lg">
                        <span className="font-semibold">Cambio:</span>
                        <span className="font-bold text-green-600">
                          Bs. {totales.cambio.toFixed(2)}
                        </span>
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
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancelar
                </Button>
                <Button
                  color="success"
                  onPress={handleProcessSale}
                  isLoading={isProcessing}
                  isDisabled={montoRecibido < totales.total}
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