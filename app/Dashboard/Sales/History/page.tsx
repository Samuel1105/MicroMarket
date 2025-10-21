"use client"
import React, { useState, useEffect } from 'react';
import {
  Card, CardBody, Table, TableHeader, TableColumn,
  TableBody, TableRow, TableCell, Chip, Spinner,
  Input, Button, useDisclosure, Modal, ModalContent,
  ModalHeader, ModalBody, ModalFooter
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { getSalesHistory } from '@/actions/sales/sales-history-action';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface DetalleVenta {
  id: number;
  producto: string;
  productoId: number;
  descripcion: string | null;
  unidad: string;
  unidadId: number;
  lote: string;
  loteId: number | null;
  fechaVencimiento?: string | null;
  cantidad: number;
  cantidadUnidadesBase: number;
  precioUnitario: number;
  subtotal: number;
  descuento: number;
  total: number;
  codigoBarras: string | null;
  codigoBarrasId: number | null;
}

interface Venta {
  id: number;
  numeroVenta: string;
  fecha: string;
  cliente: {
    id: number;
    nombre: string;
    carnet: string;
    correo: string;
  };
  subtotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  montoRecibido: number;
  cambio: number;
  metodoPago: number;
  estado: number;
  detalles: DetalleVenta[];
}

export default function SalesHistoryView() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [filteredVentas, setFilteredVentas] = useState<Venta[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    loadSalesHistory();
  }, []);

  useEffect(() => {
    filterVentas();
  }, [searchTerm, ventas]);

  const loadSalesHistory = async () => {
    setIsLoading(true);
    try {
      const result = await getSalesHistory();
      if (result.success && result.data) {
        setVentas(result.data);
        setFilteredVentas(result.data);
      }
    } catch (error) {
      console.error('Error al cargar ventas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterVentas = () => {
    if (!searchTerm.trim()) {
      setFilteredVentas(ventas);
      return;
    }

    const filtered = ventas.filter(venta =>
      venta.numeroVenta.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venta.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venta.cliente.carnet.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredVentas(filtered);
  };

  const handleViewDetails = (venta: Venta) => {
    setSelectedVenta(venta);
    onOpen();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-BO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMetodoPagoLabel = (metodo: number) => {
    const metodos: Record<number, { label: string; color: "primary" | "success" | "warning" }> = {
      1: { label: 'Efectivo', color: 'success' },
      2: { label: 'Tarjeta', color: 'primary' },
      3: { label: 'Transferencia', color: 'warning' },
    };
    return metodos[metodo] || { label: 'Desconocido', color: 'primary' };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" label="Cargando historial de ventas..." />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={[1, 2]}>
      <div className="w-full space-y-6">
        {/* Búsqueda y resumen */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="w-full md:w-96">
            <Input
              placeholder="Buscar por número, cliente o carnet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              startContent={<Icon icon="mdi:magnify" width="20" height="20" />}
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
                  <p className="text-sm text-gray-600">Total Ventas</p>
                  <p className="text-2xl font-bold">{filteredVentas.length}</p>
                </div>
                <Icon icon="mdi:receipt" width="32" height="32" className="text-blue-500" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Monto Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    Bs. {filteredVentas.reduce((sum, v) => sum + v.total, 0).toFixed(2)}
                  </p>
                </div>
                <Icon icon="mdi:cash-multiple" width="32" height="32" className="text-green-500" />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Descuentos</p>
                  <p className="text-2xl font-bold text-red-600">
                    Bs. {filteredVentas.reduce((sum, v) => sum + v.descuento, 0).toFixed(2)}
                  </p>
                </div>
                <Icon icon="mdi:tag-percent" width="32" height="32" className="text-red-500" />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Vista Mobile: Cards */}
        <div className="md:hidden space-y-3">
          {filteredVentas.map((venta) => (
            <Card key={venta.id} className="border">
              <CardBody className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{venta.numeroVenta}</p>
                      <p className="text-xs text-gray-500">{formatDate(venta.fecha)}</p>
                    </div>
                    <Chip color="success" size="sm" variant="flat">
                      Bs. {venta.total.toFixed(2)}
                    </Chip>
                  </div>

                  <div className="space-y-1 text-sm">
                    <p><strong>Cliente:</strong> {venta.cliente.nombre}</p>
                    <p><strong>Carnet:</strong> {venta.cliente.carnet}</p>
                    <p><strong>Productos:</strong> {venta.detalles.length}</p>
                  </div>

                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    fullWidth
                    onPress={() => handleViewDetails(venta)}
                    startContent={<Icon icon="mdi:eye" width="18" height="18" />}
                  >
                    Ver Detalles
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Vista Desktop: Tabla */}
        <div className="hidden md:block">
          <Card>
            <CardBody className="p-0">
              <Table aria-label="Historial de ventas">
                <TableHeader>
                  <TableColumn>NÚMERO</TableColumn>
                  <TableColumn>FECHA</TableColumn>
                  <TableColumn>CLIENTE</TableColumn>
                  <TableColumn>MÉTODO PAGO</TableColumn>
                  <TableColumn>TOTAL</TableColumn>
                  <TableColumn>ACCIONES</TableColumn>
                </TableHeader>
                <TableBody emptyContent="No hay ventas registradas">
                  {filteredVentas.map((venta) => {
                    const metodoPago = getMetodoPagoLabel(venta.metodoPago);
                    return (
                      <TableRow key={venta.id}>
                        <TableCell className="font-medium">{venta.numeroVenta}</TableCell>
                        <TableCell>{formatDate(venta.fecha)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{venta.cliente.nombre}</p>
                            <p className="text-xs text-gray-500">{venta.cliente.carnet}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Chip size="sm" color={metodoPago.color} variant="flat">
                            {metodoPago.label}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-green-600">
                            Bs. {venta.total.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            color="primary"
                            variant="light"
                            isIconOnly
                            onPress={() => handleViewDetails(venta)}
                          >
                            <Icon icon="mdi:eye" width="20" height="20" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        </div>

        {/* Modal de detalles */}
        <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>Detalles de la Venta</ModalHeader>
                <ModalBody>
                  {selectedVenta && (
                    <div className="space-y-4">
                      {/* Información general */}
                      <Card className="bg-gray-50">
                        <CardBody className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Número de Venta</p>
                              <p className="font-semibold">{selectedVenta.numeroVenta}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Fecha</p>
                              <p className="font-semibold">{formatDate(selectedVenta.fecha)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Cliente</p>
                              <p className="font-semibold">{selectedVenta.cliente.nombre}</p>
                              <p className="text-xs text-gray-500">{selectedVenta.cliente.carnet}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Método de Pago</p>
                              <Chip size="sm" color={getMetodoPagoLabel(selectedVenta.metodoPago).color} variant="flat">
                                {getMetodoPagoLabel(selectedVenta.metodoPago).label}
                              </Chip>
                            </div>
                          </div>
                        </CardBody>
                      </Card>

                      {/* Detalles de productos */}
                      <div>
                        <h4 className="font-semibold mb-3">Productos</h4>
                        <div className="space-y-2">
                          {selectedVenta.detalles.map((detalle) => (
                            <Card key={detalle.id} className="border">
                              <CardBody className="p-3 space-y-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="font-medium">{detalle.producto}</p>
                                    <p className="text-sm text-gray-600">{detalle.unidad}</p>
                                    <div className="flex gap-2 mt-1">
                                      <Chip size="sm" variant="flat">
                                        Lote: {detalle.lote}
                                      </Chip>
                                      {detalle.codigoBarras && (
                                        <Chip size="sm" color="success" variant="flat">
                                          <Icon icon="mdi:barcode" width="14" height="14" className="mr-1" />
                                          {detalle.codigoBarras}
                                        </Chip>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm">
                                      {detalle.cantidad} × Bs. {detalle.precioUnitario.toFixed(2)}
                                    </p>
                                    <p className="font-bold text-green-600">
                                      Bs. {detalle.total.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                                {detalle.cantidadUnidadesBase !== detalle.cantidad && (
                                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                    <Icon icon="mdi:swap-horizontal" width="14" height="14" className="inline mr-1" />
                                    Equivalente: {detalle.cantidadUnidadesBase} unidades base
                                  </div>
                                )}
                              </CardBody>
                            </Card>
                          ))}
                        </div>
                      </div>

                      {/* Totales */}
                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                        <CardBody className="p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span className="font-semibold">Bs. {selectedVenta.subtotal.toFixed(2)}</span>
                            </div>
                            {selectedVenta.descuento > 0 && (
                              <div className="flex justify-between">
                                <span>Descuento:</span>
                                <span className="font-semibold text-red-600">
                                  -Bs. {selectedVenta.descuento.toFixed(2)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between text-xl font-bold pt-2 border-t">
                              <span>Total:</span>
                              <span className="text-green-600">Bs. {selectedVenta.total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Monto Recibido:</span>
                              <span>Bs. {selectedVenta.montoRecibido.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Cambio:</span>
                              <span className="text-green-600">Bs. {selectedVenta.cambio.toFixed(2)}</span>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    </div>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button color="primary" variant="light" onPress={onClose}>
                    Cerrar
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    </ProtectedRoute>

  );
}