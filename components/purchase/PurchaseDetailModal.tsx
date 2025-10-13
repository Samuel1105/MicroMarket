import React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Card,
  CardBody,
  Chip,
  Divider
} from '@heroui/react';
import { Icon } from '@iconify/react';

interface PurchaseDetail {
  id: number;
  producto: string;
  productoId: number;
  unidad: string;
  unidadId: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  descuento: number;
  total: number;
  lote: string;
  loteId: number | null;
  fechaVencimiento: string | null;
  cantidadUnidadesBase: number;
}

interface Purchase {
  id: number;
  numeroCompra: string;
  fecha: string;
  proveedor: {
    id: number;
    nombre: string;
  };
  subtotal: number;
  descuento: number;
  total: number;
  estado: number;
  detalles: PurchaseDetail[];
}

interface PurchaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
}

export default function PurchaseDetailModal({
  isOpen,
  onClose,
  purchase
}: PurchaseDetailModalProps) {
  if (!purchase) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-BO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-BO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Calcular la conversión basada en cantidad y unidades base
  const getConversionInfo = (detail: PurchaseDetail) => {
    if (detail.cantidadUnidadesBase === detail.cantidad) {
      // Es unidad base (no hay conversión)
      return null;
    }

    const unidadesPorPaquete = detail.cantidadUnidadesBase / detail.cantidad;
    return {
      cantidadPaquetes: detail.cantidad,
      unidadesPorPaquete: unidadesPorPaquete,
      totalUnidades: detail.cantidadUnidadesBase
    };
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      scrollBehavior="inside"
      classNames={{
        base: "max-h-[90vh]",
        body: "py-6"
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 pb-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Detalles de la Compra</h3>
                  <p className="text-sm text-gray-500 font-normal mt-1">
                    {purchase.numeroCompra}
                  </p>
                </div>
                <Chip color="success" variant="flat" size="lg">
                  Bs. {purchase.total.toFixed(2)}
                </Chip>
              </div>
            </ModalHeader>

            <ModalBody>
              {/* Información General */}
              <Card className="bg-gray-50">
                <CardBody className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Icon
                        icon="mdi:store"
                        width="24"
                        height="24"
                        className="text-blue-600 mt-0.5"
                      />
                      <div>
                        <p className="text-xs text-gray-600">Proveedor</p>
                        <p className="font-semibold">{purchase.proveedor.nombre}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Icon
                        icon="mdi:calendar"
                        width="24"
                        height="24"
                        className="text-blue-600 mt-0.5"
                      />
                      <div>
                        <p className="text-xs text-gray-600">Fecha de Compra</p>
                        <p className="font-semibold">{formatDate(purchase.fecha)}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Icon
                        icon="mdi:package-variant"
                        width="24"
                        height="24"
                        className="text-blue-600 mt-0.5"
                      />
                      <div>
                        <p className="text-xs text-gray-600">Total Productos</p>
                        <p className="font-semibold">{purchase.detalles.length} producto(s)</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Icon
                        icon="mdi:cash-multiple"
                        width="24"
                        height="24"
                        className="text-blue-600 mt-0.5"
                      />
                      <div>
                        <p className="text-xs text-gray-600">Estado</p>
                        <Chip color="success" size="sm" variant="flat">
                          Completada
                        </Chip>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Divider className="my-4" />

              {/* Lista de Productos */}
              <div className="space-y-3">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <Icon icon="mdi:format-list-bulleted" width="20" height="20" />
                  Productos Comprados
                </h4>

                {purchase.detalles.map((detail, index) => {
                  const conversionInfo = getConversionInfo(detail);

                  return (
                    <Card key={detail.id} className="border">
                      <CardBody className="p-4">
                        <div className="space-y-3">
                          {/* Encabezado del producto */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Icon
                                  icon="mdi:package-variant-closed"
                                  width="18"
                                  height="18"
                                  className="text-blue-600"
                                />
                                <h5 className="font-semibold text-base">
                                  {detail.producto}
                                </h5>
                              </div>
                              <p className="text-sm text-gray-600">
                                Unidad: <span className="font-medium">{detail.unidad}</span>
                              </p>
                            </div>
                            <Chip color="primary" variant="flat" size="sm">
                              #{index + 1}
                            </Chip>
                          </div>

                          {/* Información de cantidad y conversión */}
                          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Cantidad Comprada</p>
                                <p className="text-lg font-bold text-blue-600">
                                  {detail.cantidad} {detail.unidad.split('(')[0].trim()}
                                </p>
                              </div>

                              {conversionInfo && (
                                <div className="bg-white rounded-md p-2 border border-blue-200">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Icon
                                      icon="mdi:swap-horizontal"
                                      width="16"
                                      height="16"
                                      className="text-green-600"
                                    />
                                    <p className="text-xs font-semibold text-green-700">
                                      Conversión
                                    </p>
                                  </div>
                                  <p className="text-sm font-medium">
                                    {conversionInfo.cantidadPaquetes} × {conversionInfo.unidadesPorPaquete} unidades
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    = {conversionInfo.totalUnidades} unidades base
                                  </p>
                                </div>
                              )}

                              {!conversionInfo && (
                                <div className="flex items-center gap-2">
                                  <Icon
                                    icon="mdi:information-outline"
                                    width="16"
                                    height="16"
                                    className="text-gray-500"
                                  />
                                  <p className="text-sm text-gray-600">
                                    Unidad base (sin conversión)
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Precios */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-gray-600">Precio Unit.</p>
                              <p className="font-semibold">Bs. {detail.precioUnitario.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Subtotal</p>
                              <p className="font-semibold">Bs. {detail.subtotal.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Descuento</p>
                              <p className="font-semibold text-red-600">
                                {detail.descuento > 0 ? `- Bs. ${detail.descuento.toFixed(2)}` : 'Bs. 0.00'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Total</p>
                              <p className="font-bold text-green-600">Bs. {detail.total.toFixed(2)}</p>
                            </div>
                          </div>

                          {/* Información de Lote */}
                          <div className="flex flex-col md:flex-row md:items-center gap-3 pt-2 border-t">
                            <div className="flex items-center gap-2 flex-1">
                              <Icon
                                icon="mdi:barcode"
                                width="18"
                                height="18"
                                className="text-gray-600"
                              />
                              <div>
                                <p className="text-xs text-gray-600">Lote</p>
                                <p className="font-medium text-sm">{detail.lote}</p>
                              </div>
                            </div>

                            {detail.fechaVencimiento && (
                              <div className="flex items-center gap-2">
                                <Icon
                                  icon="mdi:calendar-clock"
                                  width="18"
                                  height="18"
                                  className="text-orange-600"
                                />
                                <div>
                                  <p className="text-xs text-gray-600">Vencimiento</p>
                                  <p className="font-medium text-sm">
                                    {formatShortDate(detail.fechaVencimiento)}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>

              <Divider className="my-4" />

              {/* Resumen de Totales */}
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                <CardBody className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Subtotal:</span>
                      <span className="font-semibold">Bs. {purchase.subtotal.toFixed(2)}</span>
                    </div>
                    
                    {purchase.descuento > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Descuento Total:</span>
                        <span className="font-semibold text-red-600">
                          - Bs. {purchase.descuento.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <Divider />

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-lg font-bold text-gray-800">Total Final:</span>
                      <span className="text-2xl font-bold text-green-600">
                        Bs. {purchase.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </ModalBody>

            <ModalFooter className="border-t">
              <Button color="primary" variant="light" onPress={onClose}>
                Cerrar
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}