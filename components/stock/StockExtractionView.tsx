"use client"
import React, { useState, useEffect } from 'react';
import {
  Card, CardBody, CardHeader, Button, Select, SelectItem,
  Input, Chip, Spinner, Divider, Table, TableHeader,
  TableColumn, TableBody, TableRow, TableCell
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { extractStockForSale, getAvailableStockForExtraction } from '@/actions/purchase/stock-extraction-action';
import { toast } from 'react-toastify';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';


interface UnidadDisponible {
  conversionId: number;
  unidadId: number;
  nombre: string;
  abreviatura: string | null;
  factor: number;
  precioVenta: number;
  cantidadMaxima: number;
}

interface StockDisponible {
  loteId: number;
  numeroLote: string;
  producto: {
    id: number;
    nombre: string;
    descripcion: string | null;
    unidadBase: {
      id: number;
      nombre: string;
      abreviatura: string | null;
    };
  };
  compra: {
    numeroCompra: string | null;
    fecha: string | null | undefined;
    proveedor: string;
  };
  fechaVencimiento: string | null;
  cantidadTotalUnidadesBase: number;
  cantidadExtraidaUnidadesBase: number;
  cantidadDisponibleUnidadesBase: number;
  unidadesDisponibles: UnidadDisponible[];
}

interface ExtraccionItem {
  id: string;
  loteId: number;
  productoId: number;
  productoNombre: string;
  numeroLote: string;
  unidadMedidaId: number;
  unidadNombre: string;
  cantidad: number;
  factor: number;
  cantidadUnidadesBase: number;
  precioVenta: number;
  codigosBarras: string[];
}

export default function StockExtractionView() {
  const [stockDisponible, setStockDisponible] = useState<StockDisponible[]>([]);
  const [extracciones, setExtracciones] = useState<ExtraccionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estado para el formulario de agregar
  const [selectedLote, setSelectedLote] = useState<StockDisponible | null>(null);
  const [selectedUnidad, setSelectedUnidad] = useState<UnidadDisponible | null>(null);
  const [cantidad, setCantidad] = useState<number>(1);
  const [codigosBarras, setCodigosBarras] = useState<string[]>(['']);
  const [precioVenta, setPrecioVenta] = useState<number>(0);
  const router = useRouter()
  const {user} = useAuth()

  useEffect(() => {
    loadAvailableStock();
  }, []);

  const loadAvailableStock = async () => {
    setIsLoading(true);
    try {
      const result = await getAvailableStockForExtraction();
      if (result.success && result.data) {
        setStockDisponible(result.data);
      }
    } catch (error) {
      console.error('Error al cargar stock:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoteChange = (loteId: string) => {
    const lote = stockDisponible.find(s => s.loteId === Number(loteId));
    setSelectedLote(lote || null);
    setSelectedUnidad(null);
    setCantidad(1);
    setPrecioVenta(0); // Resetea el precio
    setCodigosBarras(['']);
  };

  const handleUnidadChange = (unidadId: string) => {
    if (!selectedLote) return;
    const unidad = selectedLote.unidadesDisponibles.find(u => u.unidadId === Number(unidadId));
    if (unidad) {
      setSelectedUnidad(unidad);
      setPrecioVenta(unidad.precioVenta); // Establece el precio por defecto
    } else {
      setSelectedUnidad(null);
      setPrecioVenta(0);
    }
  };

  const handleCantidadChange = (value: string) => {
    const newCantidad = Number(value) || 0;
    setCantidad(newCantidad);
    // Ajustar array de códigos de barras según la cantidad
    setCodigosBarras(Array(newCantidad).fill(''));
  };

  const handleCodigoBarraChange = (index: number, value: string) => {
    const newCodigos = [...codigosBarras];
    newCodigos[index] = value;
    setCodigosBarras(newCodigos);
  };

  const addExtraccion = () => {
    if (!selectedLote || !selectedUnidad || cantidad <= 0) {
      toast.info('Por favor completa todos los campos')
      
      return;
    }

    if (cantidad > selectedUnidad.cantidadMaxima) {
      toast.info(`Solo hay disponible ${selectedUnidad.cantidadMaxima} unidades de ${selectedUnidad.nombre}`);
      return;
    }

    const nuevaExtraccion: ExtraccionItem = {
      id: Date.now().toString(),
      loteId: selectedLote.loteId,
      productoId: selectedLote.producto.id,
      productoNombre: selectedLote.producto.nombre,
      numeroLote: selectedLote.numeroLote,
      unidadMedidaId: selectedUnidad.unidadId,
      unidadNombre: `${selectedUnidad.nombre} (${selectedUnidad.abreviatura})`,
      cantidad: cantidad,
      factor: selectedUnidad.factor,
      cantidadUnidadesBase: cantidad * selectedUnidad.factor,
      precioVenta: precioVenta,
      codigosBarras: codigosBarras.filter(c => c.trim() !== '')
    };

    setExtracciones([...extracciones, nuevaExtraccion]);

    // Limpiar formulario
    setSelectedLote(null);
    setSelectedUnidad(null);
    setCantidad(1);
    setPrecioVenta(0);
    setCodigosBarras(['']);
  };

  const removeExtraccion = (id: string) => {
    setExtracciones(extracciones.filter(e => e.id !== id));
  };

  const processExtraction = async () => {
    if (extracciones.length === 0) {
      toast.error('Agrega al menos un producto para extraer');
      return;
    }

    setIsProcessing(true);
    try {
      const usuarioId = user?.id || 0; // TODO: Obtener del contexto de autenticación

      const items = extracciones.map(ext => ({
        loteId: ext.loteId,
        productoId: ext.productoId,
        unidadMedidaId: ext.unidadMedidaId,
        cantidad: ext.cantidad,
        cantidadUnidadesBase: ext.cantidadUnidadesBase,
        precioVenta: ext.precioVenta,
        codigosBarras: ext.codigosBarras
      }));

      const result = await extractStockForSale({ items, usuarioId });

      if (result.success && result.data) {
        // alert(
        //   `¡Extracción exitosa!\n\n` +
        //   `Stocks creados: ${result.data.stocksCreados}\n` +
        //   `Movimientos registrados: ${result.data.movimientosCreados}\n` +
        //   `Códigos de barras: ${result.data.codigosCreados}`
        // );
        toast.success('Extracción procesada con éxito');

        // Recargar datos y limpiar
        setExtracciones([]);
        await loadAvailableStock();

        router.push('/Dashboard/Purchase/Stock/')
      } else {
        toast.error(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error al procesar extracción:', error);
      toast.error
      ('Error al procesar la extracción');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" label="Cargando stock disponible..." />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Información de stock disponible */}
      <Card>
        <CardHeader className="flex gap-3">
          <Icon icon="mdi:warehouse" width="24" height="24" className="text-blue-600" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">Stock Disponible en Almacén</p>
            <p className="text-small text-default-500">
              {stockDisponible.length} lote(s) disponible(s) para extraer
            </p>
          </div>
        </CardHeader>
      </Card>

      {/* Formulario de extracción */}
      <Card>
        <CardBody className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Icon icon="mdi:package-variant-closed-plus" width="20" height="20" />
            Agregar Producto para Extraer
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Seleccionar Lote/Producto */}
            <Select
              label="Producto / Lote"
              placeholder="Selecciona un producto"
              selectedKeys={selectedLote ? [selectedLote.loteId.toString()] : []}
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0] as string;
                handleLoteChange(key);
              }}
              classNames={{ base: "col-span-full md:col-span-2" }}
            >
              {stockDisponible.map((stock) => (
                <SelectItem key={stock.loteId.toString()}>
                  {`${stock.producto.nombre} - ${stock.numeroLote} (Disponible: ${stock.cantidadDisponibleUnidadesBase} ${stock.producto.unidadBase.abreviatura})`}
                </SelectItem>
              ))}
            </Select>

            {/* Información del lote seleccionado */}
            {selectedLote && (
              <div className="col-span-full bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Proveedor</p>
                    <p className="font-semibold">{selectedLote.compra.proveedor}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Compra</p>
                    <p className="font-semibold">{selectedLote.compra.numeroCompra}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Disponible</p>
                    <p className="font-semibold text-green-600">
                      {selectedLote.cantidadDisponibleUnidadesBase} {selectedLote.producto.unidadBase.nombre}
                    </p>
                  </div>
                  {selectedLote.fechaVencimiento && (
                    <div>
                      <p className="text-gray-600">Vencimiento</p>
                      <p className="font-semibold">{selectedLote.fechaVencimiento}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Seleccionar Unidad */}
            <Select
              label="Unidad de Medida"
              placeholder="Selecciona unidad"
              isDisabled={!selectedLote}
              selectedKeys={selectedUnidad ? [selectedUnidad.unidadId.toString()] : []}
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0] as string;
                handleUnidadChange(key);
              }}
            >
              {selectedLote?.unidadesDisponibles.map((unidad) => (
                <SelectItem key={unidad.unidadId.toString()}>
                  {`${unidad.nombre} (${unidad.abreviatura}) - Max: ${unidad.cantidadMaxima}`}
                </SelectItem>
              )) || []}
            </Select>

            {/* Cantidad */}
            <Input
              type="number"
              label="Cantidad"
              placeholder="0"
              min="1"
              max={selectedUnidad?.cantidadMaxima || 1}
              value={cantidad.toString()}
              onChange={(e) => handleCantidadChange(e.target.value)}
              isDisabled={!selectedUnidad}
              description={selectedUnidad ? `Máximo: ${selectedUnidad.cantidadMaxima}` : ''}
            />

            {/* Precio */}
            <Input
              type="number"
              label="Precio de Venta"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={precioVenta.toString()}
              onChange={(e) => setPrecioVenta(Number(e.target.value) || 0)}
              isDisabled={!selectedUnidad}
              startContent={<span className="text-gray-500">Bs.</span>}
              description={selectedUnidad ? `Precio sugerido: Bs. ${selectedUnidad.precioVenta.toFixed(2)}` : ''}
            />

            {/* Conversión */}
            {selectedUnidad && selectedUnidad.factor > 1 && (
              <div className="col-span-full bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-sm">
                  <Icon icon="mdi:swap-horizontal" width="18" height="18" className="text-blue-600" />
                  <p>
                    <strong>Conversión:</strong> {cantidad} × {selectedUnidad.factor} = {' '}
                    <span className="font-bold text-blue-600">
                      {cantidad * selectedUnidad.factor} unidades base
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Códigos de barras */}
            {selectedUnidad && cantidad > 0 && (
              <div className="col-span-full space-y-3">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:barcode" width="20" height="20" className="text-gray-600" />
                  <h4 className="font-semibold">Códigos de Barras (Opcional)</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: cantidad }).map((_, index) => (
                    <Input
                      key={index}
                      label={`Código ${index + 1}`}
                      placeholder="Escanea o ingresa código"
                      value={codigosBarras[index] || ''}
                      onChange={(e) => handleCodigoBarraChange(index, e.target.value)}
                      startContent={
                        <Icon icon="mdi:barcode-scan" width="18" height="18" className="text-gray-400" />
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <Divider className="my-4" />

          <div className="flex justify-end">
            <Button
              color="primary"
              onPress={addExtraccion}
              isDisabled={!selectedLote || !selectedUnidad || cantidad <= 0}
              startContent={<Icon icon="mdi:plus" width="20" height="20" />}
            >
              Agregar a la Lista
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Lista de extracciones */}
      {extracciones.length > 0 && (
        <Card>
          <CardBody className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Icon icon="mdi:format-list-checks" width="20" height="20" />
              Productos para Extraer ({extracciones.length})
            </h3>

            {/* Mobile */}
            <div className="md:hidden space-y-3">
              {extracciones.map((ext) => (
                <Card key={ext.id} className="border">
                  <CardBody className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{ext.productoNombre}</p>
                          <p className="text-xs text-gray-500">Lote: {ext.numeroLote}</p>
                        </div>
                        <Button
                          size="sm"
                          color="danger"
                          variant="light"
                          isIconOnly
                          onPress={() => removeExtraccion(ext.id)}
                        >
                          <Icon icon="mdi:close" width="20" height="20" />
                        </Button>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><strong>Unidad:</strong> {ext.unidadNombre}</p>
                        <p><strong>Cantidad:</strong> {ext.cantidad}</p>
                        <p><strong>Precio:</strong> Bs. {ext.precioVenta.toFixed(2)}</p>
                        {ext.factor > 1 && (
                          <p className="text-blue-600">
                            <strong>Conversión:</strong> {ext.cantidadUnidadesBase} unidades base
                          </p>
                        )}
                        {ext.codigosBarras.length > 0 && (
                          <div>
                            <p className="font-semibold">Códigos:</p>
                            {ext.codigosBarras.map((codigo, idx) => (
                              <Chip key={idx} size="sm" variant="flat" className="mt-1 mr-1">
                                {codigo}
                              </Chip>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <Table aria-label="Lista de extracciones">
                <TableHeader>
                  <TableColumn>PRODUCTO</TableColumn>
                  <TableColumn>LOTE</TableColumn>
                  <TableColumn>UNIDAD</TableColumn>
                  <TableColumn>CANTIDAD</TableColumn>
                  <TableColumn>UNIDADES BASE</TableColumn>
                  <TableColumn>PRECIO VENTA</TableColumn>
                  <TableColumn>CÓDIGOS</TableColumn>
                  <TableColumn>ACCIONES</TableColumn>
                </TableHeader>
                <TableBody>
                  {extracciones.map((ext) => (
                    <TableRow key={ext.id}>
                      <TableCell className="font-medium">{ext.productoNombre}</TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat">{ext.numeroLote}</Chip>
                      </TableCell>
                      <TableCell>{ext.unidadNombre}</TableCell>
                      <TableCell className="text-center font-semibold">{ext.cantidad}</TableCell>
                      <TableCell>
                        {ext.factor > 1 ? (
                          <span className="text-blue-600 font-semibold">
                            {ext.cantidadUnidadesBase}
                          </span>
                        ) : (
                          <span className="text-gray-500">{ext.cantidadUnidadesBase}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        Bs. {ext.precioVenta.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {ext.codigosBarras.length > 0 ? (
                          <Chip size="sm" color="success" variant="flat">
                            {ext.codigosBarras.length} código(s)
                          </Chip>
                        ) : (
                          <span className="text-gray-400 text-sm">Sin códigos</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          color="danger"
                          variant="light"
                          isIconOnly
                          onPress={() => removeExtraccion(ext.id)}
                        >
                          <Icon color="red" height="24" icon="weui:delete-outlined" width="24" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Divider className="my-4" />

            {/* Resumen y botón procesar */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Total de productos:</strong> {extracciones.length}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Total unidades base:</strong>{' '}
                  {extracciones.reduce((sum, ext) => sum + ext.cantidadUnidadesBase, 0)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Códigos registrados:</strong>{' '}
                  {extracciones.reduce((sum, ext) => sum + ext.codigosBarras.length, 0)}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  color="default"
                  variant="bordered"
                  onPress={() => setExtracciones([])}
                  startContent={<Icon icon="mdi:broom" width="20" height="20" />}
                >
                  Limpiar Todo
                </Button>
                <Button
                  color="success"
                  onPress={processExtraction}
                  isLoading={isProcessing}
                  startContent={
                    !isProcessing && <Icon icon="mdi:check-circle" width="20" height="20" />
                  }
                >
                  {isProcessing ? 'Procesando...' : 'Extraer Stock'}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Mensaje cuando no hay stock */}
      {stockDisponible.length === 0 && (
        <Card>
          <CardBody className="p-8 text-center">
            <Icon
              icon="mdi:package-variant-remove"
              width="64"
              height="64"
              className="mx-auto text-gray-400 mb-3"
            />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No hay stock disponible
            </h3>
            <p className="text-gray-500">
              No hay productos en el almacén para extraer. Realiza una compra primero.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}