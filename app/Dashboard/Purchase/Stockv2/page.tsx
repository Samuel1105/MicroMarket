"use client"
import React, { useState, useEffect } from 'react';
import {
  Card, CardBody, Table, TableHeader, TableColumn,
  TableBody, TableRow, TableCell, Chip, Spinner,
  Input
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { getAvailableSalesStock } from '@/actions/purchase/stock-extraction-action';

//REvisar capas no usemos este page
interface StockVenta {
  id: number;
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
  cantidadUnidadesBase: number;
  precioVenta: number;
  fechaVencimiento: string | null;
  fechaRegistro: string | null;
  codigosBarras: {
    id: number;
    codigo: string;
  }[];
}

export default function SalesStockView() {
  const [stockVenta, setStockVenta] = useState<StockVenta[]>([]);
  const [filteredStock, setFilteredStock] = useState<StockVenta[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSalesStock();
  }, []);

  useEffect(() => {
    filterStock();
  }, [searchTerm, stockVenta]);

  const loadSalesStock = async () => {
    setIsLoading(true);
    try {
      const result = await getAvailableSalesStock();
      if (result.success && result.data) {
        setStockVenta(result.data);
        setFilteredStock(result.data);
      }
    } catch (error) {
      console.error('Error al cargar stock de venta:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterStock = () => {
    if (!searchTerm.trim()) {
      setFilteredStock(stockVenta);
      return;
    }

    const filtered = stockVenta.filter(stock =>
      stock.producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.lote?.numeroLote.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.codigosBarras.some(cb => cb.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setFilteredStock(filtered);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-BO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getTotalValue = () => {
    return filteredStock.reduce((sum, stock) => sum + (stock.cantidadDisponible * stock.precioVenta), 0);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" label="Cargando stock de venta..." />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Barra de búsqueda y resumen */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="w-full md:w-96">
          <Input
            placeholder="Buscar por producto, lote o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            startContent={
              <Icon icon="mdi:magnify" width="20" height="20" className="text-gray-400" />
            }
            isClearable
            onClear={() => setSearchTerm('')}
          />
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Productos en Venta</p>
                <p className="text-2xl font-bold">{filteredStock.length}</p>
              </div>
              <Icon icon="mdi:package-variant" width="32" height="32" className="text-blue-500" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-green-600">
                  Bs. {getTotalValue().toFixed(2)}
                </p>
              </div>
              <Icon icon="mdi:cash" width="32" height="32" className="text-green-500" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Códigos Registrados</p>
                <p className="text-2xl font-bold text-purple-600">
                  {filteredStock.reduce((sum, stock) => sum + stock.codigosBarras.length, 0)}
                </p>
              </div>
              <Icon icon="mdi:barcode" width="32" height="32" className="text-purple-500" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Vista Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {filteredStock.length === 0 ? (
          <Card>
            <CardBody className="p-6 text-center">
              <Icon
                icon="mdi:package-variant-remove"
                width="48"
                height="48"
                className="mx-auto text-gray-400 mb-2"
              />
              <p className="text-gray-600">No hay stock disponible para venta</p>
            </CardBody>
          </Card>
        ) : (
          filteredStock.map((stock) => (
            <Card key={stock.id} className="border">
              <CardBody className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">{stock.producto.nombre}</p>
                      {stock.lote && (
                        <p className="text-xs text-gray-500">Lote: {stock.lote.numeroLote}</p>
                      )}
                    </div>
                    <Chip color="success" size="sm" variant="flat">
                      {stock.cantidadDisponible} disponible
                    </Chip>
                  </div>

                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Unidad:</strong> {stock.unidad.nombre} ({stock.unidad.abreviatura})
                    </p>
                    <p>
                      <strong>Precio:</strong> Bs. {stock.precioVenta.toFixed(2)}
                    </p>
                    <p>
                      <strong>Unidades base:</strong> {stock.cantidadUnidadesBase}
                    </p>
                    {stock.fechaVencimiento && (
                      <p>
                        <strong>Vencimiento:</strong> {formatDate(stock.fechaVencimiento)}
                      </p>
                    )}
                  </div>

                  {stock.codigosBarras.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-1">Códigos de barras:</p>
                      <div className="flex flex-wrap gap-1">
                        {stock.codigosBarras.map((cb) => (
                          <Chip key={cb.id} size="sm" variant="flat">
                            {cb.codigo}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>

      {/* Vista Desktop: Tabla */}
      <div className="hidden md:block">
        <Card>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <Table aria-label="Stock de venta">
                <TableHeader>
                  <TableColumn>PRODUCTO</TableColumn>
                  <TableColumn>LOTE</TableColumn>
                  <TableColumn>UNIDAD</TableColumn>
                  <TableColumn>CANTIDAD</TableColumn>
                  <TableColumn>UNIDADES BASE</TableColumn>
                  <TableColumn>PRECIO</TableColumn>
                  <TableColumn>VENCIMIENTO</TableColumn>
                  <TableColumn>CÓDIGOS</TableColumn>
                  <TableColumn>REGISTRADO</TableColumn>
                </TableHeader>
                <TableBody emptyContent="No hay stock disponible">
                  {filteredStock.map((stock) => (
                    <TableRow key={stock.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{stock.producto.nombre}</p>
                          {stock.producto.descripcion && (
                            <p className="text-xs text-gray-500">{stock.producto.descripcion}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {stock.lote ? (
                          <Chip size="sm" variant="flat">
                            {stock.lote.numeroLote}
                          </Chip>
                        ) : (
                          <span className="text-gray-400 text-sm">Sin lote</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {stock.unidad.nombre} ({stock.unidad.abreviatura})
                      </TableCell>
                      <TableCell>
                        <Chip color="success" size="sm" variant="flat">
                          {stock.cantidadDisponible}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-center">{stock.cantidadUnidadesBase}</TableCell>
                      <TableCell className="font-semibold">
                        Bs. {stock.precioVenta.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {stock.fechaVencimiento ? (
                          <span className="text-sm">{formatDate(stock.fechaVencimiento)}</span>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {stock.codigosBarras.length > 0 ? (
                          <div className="space-y-1">
                            {stock.codigosBarras.map((cb) => (
                              <Chip key={cb.id} size="sm" variant="flat" className="mr-1">
                                {cb.codigo}
                              </Chip>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Sin códigos</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(stock.fechaRegistro)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Mensaje cuando no hay resultados */}
      {filteredStock.length === 0 && !isLoading && (
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
              {searchTerm
                ? 'Intenta con otros términos de búsqueda'
                : 'Aún no se ha extraído stock para venta'}
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}