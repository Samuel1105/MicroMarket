"use client"
import React, { useState, useEffect } from 'react';
import { 
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, 
  Button, Input, Chip, Spinner, Card, CardBody, useDisclosure
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { getPurchaseHistory } from '@/actions/purchase/list-purchase-action';
import PurchaseDetailModal from './PurchaseDetailModal';
import { useRouter } from 'next/navigation';

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

export default function PurchaseHistoryView() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const router = useRouter();

  useEffect(() => {
    loadPurchases();
  }, []);

  useEffect(() => {
    filterPurchases();
  }, [searchTerm, purchases]);

  const loadPurchases = async () => {
    setIsLoading(true);
    try {
      const result = await getPurchaseHistory();
      if (result.success && result.data) {
        setPurchases(result.data);
        setFilteredPurchases(result.data);
      }
    } catch (error) {
      console.error('Error al cargar compras:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterPurchases = () => {
    if (!searchTerm.trim()) {
      setFilteredPurchases(purchases);
      return;
    }

    const filtered = purchases.filter(purchase =>
      purchase.numeroCompra.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.fecha.includes(searchTerm)
    );

    setFilteredPurchases(filtered);
  };

  const handleViewDetails = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    onOpen();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-BO', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getTotalItems = (purchase: Purchase) => {
    return purchase.detalles.reduce((sum, detail) => sum + detail.cantidad, 0);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" label="Cargando historial de compras..." />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Barra de búsqueda */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="w-full  md:w-96">
          <Input
            placeholder="Buscar por número, proveedor o fecha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            startContent={
              <Icon icon="mdi:magnify" width="20" height="20" className="text-gray-400" />
            }
            isClearable
            onClear={() => setSearchTerm('')}
          />
        </div>
        
        <div className='w-full md:w-auto flex justify-end'>
          <Button
            color='primary'
            onPress={() => router.push("/Dashboard/Purchase/New")}
          >
            <Icon
              className="md:mr-2"
              height="20"
              icon="heroicons:plus"
              width="20"
            />
            <span className="hidden md:inline">Registrar Compra</span>
          </Button>
        </div>
        
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Compras</p>
                <p className="text-2xl font-bold">{filteredPurchases.length}</p>
              </div>
              <Icon icon="mdi:cart" width="32" height="32" className="text-blue-500" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monto Total</p>
                <p className="text-2xl font-bold text-green-600">
                  Bs. {filteredPurchases.reduce((sum, p) => sum + p.total, 0).toFixed(2)}
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
                  Bs. {filteredPurchases.reduce((sum, p) => sum + p.descuento, 0).toFixed(2)}
                </p>
              </div>
              <Icon icon="mdi:tag-percent" width="32" height="32" className="text-red-500" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Vista Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {filteredPurchases.length === 0 ? (
          <Card>
            <CardBody className="p-6 text-center">
              <Icon
                icon="mdi:package-variant"
                width="48"
                height="48"
                className="mx-auto text-gray-400 mb-2"
              />
              <p className="text-gray-600">No se encontraron compras</p>
            </CardBody>
          </Card>
        ) : (
          filteredPurchases.map((purchase) => (
            <Card key={purchase.id} className="border">
              <CardBody className="p-4">
                <div className="space-y-3">
                  {/* Encabezado */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{purchase.numeroCompra}</p>
                      <p className="text-xs text-gray-500">{formatDate(purchase.fecha)}</p>
                    </div>
                    <Chip color="success" size="sm" variant="flat">
                      Bs. {purchase.total.toFixed(2)}
                    </Chip>
                  </div>

                  {/* Información */}
                  <div className="space-y-1 text-sm">
                    <p><strong>Proveedor:</strong> {purchase.proveedor.nombre}</p>
                    <p><strong>Productos:</strong> {purchase.detalles.length}</p>
                    <p><strong>Items totales:</strong> {getTotalItems(purchase)}</p>
                    {purchase.descuento > 0 && (
                      <p className="text-red-600">
                        <strong>Descuento:</strong> Bs. {purchase.descuento.toFixed(2)}
                      </p>
                    )}
                  </div>

                  {/* Botón ver detalles */}
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    fullWidth
                    onPress={() => handleViewDetails(purchase)}
                    startContent={<Icon icon="mdi:eye" width="18" height="18" />}
                  >
                    Ver Detalles
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>

      {/* Vista Desktop: Tabla */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-xl border bg-white">
          <Table aria-label="Historial de compras">
            <TableHeader>
              <TableColumn>NÚMERO</TableColumn>
              <TableColumn>FECHA</TableColumn>
              <TableColumn>PROVEEDOR</TableColumn>
              <TableColumn>PRODUCTOS</TableColumn>
              <TableColumn>SUBTOTAL</TableColumn>
              <TableColumn>DESCUENTO</TableColumn>
              <TableColumn>TOTAL</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No se encontraron compras">
              {filteredPurchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell className="font-medium">{purchase.numeroCompra}</TableCell>
                  <TableCell>{formatDate(purchase.fecha)}</TableCell>
                  <TableCell>{purchase.proveedor.nombre}</TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat">
                      {purchase.detalles.length} producto(s)
                    </Chip>
                  </TableCell>
                  <TableCell>Bs. {purchase.subtotal.toFixed(2)}</TableCell>
                  <TableCell>
                    {purchase.descuento > 0 ? (
                      <span className="text-red-600">- Bs. {purchase.descuento.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-400">Bs. 0.00</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-green-600">
                      Bs. {purchase.total.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      color="primary"
                      variant="light"
                      isIconOnly
                      onPress={() => handleViewDetails(purchase)}
                    >
                      <Icon icon="mdi:eye" width="20" height="20" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mensaje cuando no hay resultados */}
      {filteredPurchases.length === 0 && !isLoading && (
        <Card>
          <CardBody className="p-8 text-center">
            <Icon
              icon="mdi:package-variant"
              width="64"
              height="64"
              className="mx-auto text-gray-400 mb-3"
            />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No se encontraron compras
            </h3>
            <p className="text-gray-500">
              {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Aún no hay compras registradas'}
            </p>
          </CardBody>
        </Card>
      )}

      {/* Modal de detalles */}
      <PurchaseDetailModal
        isOpen={isOpen}
        onClose={onClose}
        purchase={selectedPurchase}
      />
    </div>
  );
}