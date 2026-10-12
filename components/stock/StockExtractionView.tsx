"use client"
import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, CardBody, CardHeader, Button, Select, SelectItem,
  Input, Chip, Spinner, Divider
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { extractStockForSale, getAvailableStockForExtraction } from '@/actions/purchase/stock-extraction-action';
import { toast } from 'react-toastify';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { formatVencimiento, getDiasParaVencer, getSeveridad } from '@/src/utils/expiry';


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
  const [searchTerm, setSearchTerm] = useState('');

  // Estado para el formulario de agregar (lote actualmente expandido)
  const [selectedLote, setSelectedLote] = useState<StockDisponible | null>(null);
  const [selectedUnidad, setSelectedUnidad] = useState<UnidadDisponible | null>(null);
  const [cantidad, setCantidad] = useState<number>(1);
  const [codigosBarras, setCodigosBarras] = useState<string[]>([]);
  const [scanValue, setScanValue] = useState('');
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

  // Prioriza por vencimiento (FEFO: First Expire, First Out). Los lotes sin
  // fecha de vencimiento van al final.
  const stockOrdenado = useMemo(() => {
    return [...stockDisponible].sort((a, b) => {
      if (!a.fechaVencimiento && !b.fechaVencimiento) return 0;
      if (!a.fechaVencimiento) return 1;
      if (!b.fechaVencimiento) return -1;
      return new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime();
    });
  }, [stockDisponible]);

  const stockFiltrado = useMemo(() => {
    if (!searchTerm.trim()) return stockOrdenado;
    const q = searchTerm.toLowerCase();
    return stockOrdenado.filter(s =>
      s.producto.nombre.toLowerCase().includes(q) ||
      s.numeroLote.toLowerCase().includes(q)
    );
  }, [stockOrdenado, searchTerm]);

  const lotesPorVencerPronto = useMemo(() => {
    return stockDisponible.filter(s => {
      const dias = getDiasParaVencer(s.fechaVencimiento);
      return dias !== null && dias >= 0 && dias <= 14;
    }).length;
  }, [stockDisponible]);

  const lotesVencidos = useMemo(() => {
    return stockDisponible.filter(s => {
      const dias = getDiasParaVencer(s.fechaVencimiento);
      return dias !== null && dias < 0;
    }).length;
  }, [stockDisponible]);

  const handleLoteChange = (loteId: string) => {
    if (!loteId) {
      setSelectedLote(null);
      setSelectedUnidad(null);
      setCantidad(1);
      setPrecioVenta(0);
      setCodigosBarras([]);
      setScanValue('');
      return;
    }
    const lote = stockDisponible.find(s => s.loteId === Number(loteId));
    setSelectedLote(lote || null);
    setSelectedUnidad(null);
    setCantidad(1);
    setPrecioVenta(0);
    setCodigosBarras([]);
    setScanValue('');
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
    const esEntero = Number.isInteger(newCantidad) && newCantidad > 0;
    // Los códigos de barras representan unidades físicas enteras. Con
    // cantidades decimales (venta por peso) no se asignan códigos; si baja
    // la cantidad, se recortan los códigos ya escaneados de más.
    if (!esEntero) {
      setCodigosBarras([]);
    } else {
      setCodigosBarras(prev => prev.slice(0, newCantidad));
    }
  };

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !scanValue.trim()) return;
    e.preventDefault();
    const codigo = scanValue.trim();
    if (codigosBarras.includes(codigo)) {
      toast.error('Este código ya fue escaneado');
      return;
    }
    if (codigosBarras.length >= cantidad) {
      toast.info(`Ya alcanzaste el máximo de ${cantidad} código(s)`);
      return;
    }
    setCodigosBarras([...codigosBarras, codigo]);
    setScanValue('');
  };

  const removeCodigo = (codigo: string) => {
    setCodigosBarras(codigosBarras.filter(c => c !== codigo));
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
      codigosBarras: codigosBarras
    };

    setExtracciones([...extracciones, nuevaExtraccion]);

    // Limpiar formulario y cerrar el acordeón
    handleLoteChange('');
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
      const usuarioId = user?.id || 0;

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
        toast.success('Extracción procesada con éxito');
        setExtracciones([]);
        await loadAvailableStock();
        router.push('/Dashboard/Purchase/Shelf')
      } else {
        toast.error(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error al procesar extracción:', error);
      toast.error('Error al procesar la extracción');
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
    <div className="w-full space-y-4">
      {/* Barra de búsqueda */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar producto o número de lote..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            startContent={<Icon icon="mdi:magnify" width="20" height="20" className="text-gray-400" />}
            isClearable
            onClear={() => setSearchTerm('')}
          />
        </div>
        <p className="text-sm text-gray-500 shrink-0">
          {stockDisponible.length} lote(s) disponible(s) para extraer
        </p>
      </div>

      {lotesVencidos > 0 && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <Icon icon="mdi:cancel" width="20" height="20" className="shrink-0 mt-0.5" />
          <span>
            <b>{lotesVencidos} lote(s) ya vencieron</b> y no se pueden pasar al estante. Aparecen abajo en gris; retíralos del almacén.
          </span>
        </div>
      )}

      {lotesPorVencerPronto > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold px-4 py-3 rounded-xl">
          <Icon icon="mdi:alert-circle" width="20" height="20" className="shrink-0" />
          {lotesPorVencerPronto} lote(s) vencen en 14 días o menos — priorízalos al extraer
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
        {/* Lista de lotes (acordeón) */}
        <div className="space-y-3">
          {stockFiltrado.length === 0 && (
            <Card>
              <CardBody className="p-8 text-center">
                <Icon icon="mdi:package-variant-remove" width="56" height="56" className="mx-auto text-gray-400 mb-3" />
                <h3 className="text-lg font-semibold text-gray-700 mb-1">
                  {searchTerm ? 'Sin resultados' : 'No hay stock disponible'}
                </h3>
                <p className="text-gray-500 text-sm">
                  {searchTerm ? 'Intenta con otro producto o número de lote' : 'No hay productos en el almacén para extraer. Realiza una compra primero.'}
                </p>
              </CardBody>
            </Card>
          )}

          {stockFiltrado.map((stock) => {
            const dias = getDiasParaVencer(stock.fechaVencimiento);
            const sev = getSeveridad(dias);
            const isOpen = selectedLote?.loteId === stock.loteId;
            const vencido = dias !== null && dias < 0;

            return (
              <Card key={stock.loteId} className={`shadow-sm transition-colors ${isOpen ? 'ring-2 ring-primary-300' : ''} ${vencido ? 'opacity-70 bg-default-50' : ''}`}>
                <button
                  type="button"
                  disabled={vencido}
                  aria-disabled={vencido}
                  className={`w-full flex items-center gap-3 p-4 text-left ${vencido ? 'cursor-not-allowed' : ''}`}
                  onClick={() => !vencido && handleLoteChange(isOpen ? '' : stock.loteId.toString())}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      sev === 'danger' ? 'bg-red-500' : sev === 'warning' ? 'bg-amber-500' : sev === 'success' ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{stock.producto.nombre}</p>
                    <p className="text-xs text-gray-500">
                      Lote {stock.numeroLote} · {stock.cantidadDisponibleUnidadesBase} {stock.producto.unidadBase.abreviatura} disponibles · {stock.compra.proveedor}
                    </p>
                    {vencido && (
                      <p className="text-xs font-semibold text-red-600 mt-0.5">
                        No se puede extraer: pasó su fecha de vencimiento
                      </p>
                    )}
                  </div>
                  {dias !== null && sev && (
                    <Chip size="sm" color={sev} variant="flat" className="shrink-0">
                      {formatVencimiento(dias)}
                    </Chip>
                  )}
                  {!vencido && (
                    <Icon
                      icon={isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}
                      width="20" height="20"
                      className="text-gray-400 shrink-0"
                    />
                  )}
                </button>

                {isOpen && (
                  <CardBody className="pt-0 pb-4 border-t border-dashed border-default-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      <Select
                        label="Unidad de Medida"
                        placeholder="Selecciona unidad"
                        selectedKeys={selectedUnidad ? [selectedUnidad.unidadId.toString()] : []}
                        onSelectionChange={(keys) => {
                          const key = Array.from(keys)[0] as string;
                          handleUnidadChange(key);
                        }}
                      >
                        {stock.unidadesDisponibles.map((unidad) => (
                          <SelectItem key={unidad.unidadId.toString()}>
                            {`${unidad.nombre} (${unidad.abreviatura}) - Max: ${unidad.cantidadMaxima}`}
                          </SelectItem>
                        ))}
                      </Select>

                      <Input
                        type="number"
                        label="Cantidad"
                        placeholder="0"
                        min="0.01"
                        step="0.01"
                        max={selectedUnidad?.cantidadMaxima || 1}
                        value={cantidad.toString()}
                        onChange={(e) => handleCantidadChange(e.target.value)}
                        isDisabled={!selectedUnidad}
                        description={selectedUnidad ? `Máximo: ${selectedUnidad.cantidadMaxima}` : ''}
                      />

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

                      {selectedUnidad && selectedUnidad.factor > 1 && (
                        <div className="flex items-center gap-2 text-sm bg-primary-50 border border-primary-200 rounded-lg p-3">
                          <Icon icon="mdi:swap-horizontal" width="18" height="18" className="text-primary-600 shrink-0" />
                          <p>
                            <strong>Conversión:</strong> {cantidad} × {selectedUnidad.factor} ={' '}
                            <span className="font-bold text-primary-600">{cantidad * selectedUnidad.factor} unidades base</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedUnidad && cantidad > 0 && Number.isInteger(cantidad) && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                          <Icon icon="mdi:barcode-scan" width="16" height="16" />
                          Códigos de barras · opcional, máximo {cantidad}
                        </p>
                        <Input
                          placeholder="Escanea o escribe un código y presiona Enter..."
                          value={scanValue}
                          onChange={(e) => setScanValue(e.target.value)}
                          onKeyDown={handleScanKeyDown}
                          startContent={<Icon icon="mdi:barcode" width="18" height="18" className="text-gray-400" />}
                        />
                        {codigosBarras.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {codigosBarras.map((codigo) => (
                              <Chip key={codigo} size="sm" color="secondary" variant="flat" onClose={() => removeCodigo(codigo)}>
                                {codigo}
                              </Chip>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedUnidad && cantidad > 0 && !Number.isInteger(cantidad) && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-secondary-800 bg-secondary-50 border border-secondary-200 rounded-lg p-3">
                        <Icon icon="mdi:information-outline" width="18" height="18" className="text-secondary-600 shrink-0" />
                        <p>Cantidad con decimales: no se asignan códigos de barras individuales.</p>
                      </div>
                    )}

                    <Button
                      color="primary"
                      className="w-full justify-center mt-4"
                      onPress={addExtraccion}
                      isDisabled={!selectedUnidad || cantidad <= 0}
                      startContent={<Icon icon="mdi:plus" width="20" height="20" />}
                    >
                      Agregar a la Lista
                    </Button>
                  </CardBody>
                )}
              </Card>
            );
          })}
        </div>

        {/* Panel lateral: lista para extraer */}
        <Card className="shadow-sm lg:sticky lg:top-20">
          <CardHeader className="flex items-center gap-2 pb-2">
            <Icon icon="mdi:format-list-checks" width="20" height="20" className="text-primary-600" />
            <p className="font-semibold">Lista para extraer {extracciones.length > 0 && `(${extracciones.length})`}</p>
          </CardHeader>
          <CardBody className="pt-0">
            {extracciones.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500">
                Todavía no agregaste ningún lote.
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {extracciones.map((ext) => (
                  <div key={ext.id} className="border border-default-200 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{ext.productoNombre}</p>
                        <p className="text-xs text-gray-500">Lote {ext.numeroLote} · {ext.cantidad} {ext.unidadNombre}</p>
                      </div>
                      <Button
                        size="sm"
                        color="danger"
                        variant="light"
                        isIconOnly
                        onPress={() => removeExtraccion(ext.id)}
                      >
                        <Icon icon="mdi:close" width="18" height="18" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="font-semibold text-primary-700">Bs. {ext.precioVenta.toFixed(2)}</span>
                      {ext.codigosBarras.length > 0 ? (
                        <Chip size="sm" color="success" variant="flat">{ext.codigosBarras.length} código(s)</Chip>
                      ) : (
                        <span className="text-gray-400">Sin códigos</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {extracciones.length > 0 && (
              <>
                <Divider className="my-4" />
                <div className="space-y-1 text-sm text-gray-600 mb-4">
                  <p className="flex justify-between"><span>Total de productos</span><strong>{extracciones.length}</strong></p>
                  <p className="flex justify-between">
                    <span>Total unidades base</span>
                    <strong>{extracciones.reduce((sum, ext) => sum + ext.cantidadUnidadesBase, 0)}</strong>
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    color="success"
                    onPress={processExtraction}
                    isLoading={isProcessing}
                    startContent={!isProcessing && <Icon icon="mdi:check-circle" width="20" height="20" />}
                  >
                    {isProcessing ? 'Procesando...' : 'Extraer Stock'}
                  </Button>
                  <Button
                    color="default"
                    variant="light"
                    onPress={() => setExtracciones([])}
                    startContent={<Icon icon="mdi:broom" width="18" height="18" />}
                  >
                    Limpiar Todo
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
