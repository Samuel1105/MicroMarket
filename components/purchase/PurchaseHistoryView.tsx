"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { Button, Card, CardBody, Chip, Pagination, Select, SelectItem, Spinner, useDisclosure } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';

import { getPurchaseHistory } from '@/actions/purchase/list-purchase-action';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import ListHeaderCard from '@/components/ui/ListHeaderCard';
import StatCard from '@/components/ui/StatCard';
import DateRangeFilter from '@/components/ui/DateRangeFilter';
import { formatShortDate, inDateRange, inPeriod, Period, PERIOD_OPTIONS } from '@/src/utils/period';

import PurchaseDetailModal from './PurchaseDetailModal';

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

const ROWS_PER_PAGE = 10;

export default function PurchaseHistoryView() {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [proveedor, setProveedor] = useState('todos');
  const [periodo, setPeriodo] = useState<Period>('todo');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [rangeKey, setRangeKey] = useState(0);
  const hayRango = Boolean(desde || hasta);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const result = await getPurchaseHistory();

        if (result.success && result.data) setPurchases(result.data);
      } catch (error) {
        console.error('Error al cargar compras:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, proveedor, periodo, desde, hasta]);

  const proveedores = useMemo(
    () => Array.from(new Set(purchases.map((p) => p.proveedor.nombre))).sort(),
    [purchases],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return purchases.filter((p) => {
      if (
        q &&
        !p.numeroCompra.toLowerCase().includes(q) &&
        !p.proveedor.nombre.toLowerCase().includes(q) &&
        !p.detalles.some((d) => d.producto.toLowerCase().includes(q))
      )
        return false;
      if (proveedor !== 'todos' && p.proveedor.nombre !== proveedor) return false;
      if (hayRango ? !inDateRange(p.fecha, desde, hasta) : !inPeriod(p.fecha, periodo)) return false;

      return true;
    });
  }, [purchases, search, proveedor, periodo, desde, hasta, hayRango]);

  const pages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageItems = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);
  const activeFilters = (proveedor !== 'todos' ? 1 : 0) + (hayRango ? 1 : periodo !== 'todo' ? 1 : 0);

  const getTotalItems = (purchase: Purchase) =>
    purchase.detalles.reduce((sum, detail) => sum + detail.cantidad, 0);

  const handleViewDetails = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    onOpen();
  };

  return (
    <div className="p-4 md:p-8 space-y-5">
      <Breadcrumbs items={[{ label: 'Compras' }, { label: 'Historial' }]} />

      <ListHeaderCard
        actionLabel="Registrar compra"
        activeFilters={activeFilters}
        description="Consulta lo que le compraste a tus proveedores"
        filters={
          <>
            <Select
              disallowEmptySelection
              label="Proveedor"
              selectedKeys={[proveedor]}
              onSelectionChange={(k) => setProveedor((Array.from(k)[0] as string) || 'todos')}
            >
              {[
                <SelectItem key="todos">Todos</SelectItem>,
                ...proveedores.map((p) => <SelectItem key={p}>{p}</SelectItem>),
              ]}
            </Select>
            <Select
              description={hayRango ? 'Usando el rango de fechas' : undefined}
              disallowEmptySelection
              isDisabled={hayRango}
              label="Período"
              selectedKeys={[periodo]}
              onSelectionChange={(k) => setPeriodo((Array.from(k)[0] as Period) || 'todo')}
            >
              {PERIOD_OPTIONS.map((p) => (
                <SelectItem key={p.key}>{p.label}</SelectItem>
              ))}
            </Select>
            <DateRangeFilter
              resetKey={rangeKey}
              onChange={(d, h) => {
                setDesde(d);
                setHasta(h);
              }}
            />
          </>
        }
        filtersCols={3}
        search={search}
        searchPlaceholder="Buscar por número, proveedor o producto..."
        title="Historial de compras"
        onAction={() => router.push('/Dashboard/Purchase/New')}
        onClearFilters={() => {
          setSearch('');
          setProveedor('todos');
          setPeriodo('todo');
          setDesde('');
          setHasta('');
          setRangeKey((k) => k + 1);
        }}
        onSearchChange={setSearch}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon="heroicons:shopping-cart" label="Compras" tone="primary" value={filtered.length} />
        <StatCard
          icon="heroicons:banknotes"
          label="Monto comprado"
          tone="success"
          value={`Bs. ${filtered.reduce((s, p) => s + p.total, 0).toFixed(2)}`}
        />
        <StatCard
          icon="heroicons:tag"
          label="Descuentos obtenidos"
          tone="secondary"
          value={`Bs. ${filtered.reduce((s, p) => s + p.descuento, 0).toFixed(2)}`}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner label="Cargando compras..." size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border border-default-200 shadow-sm">
          <CardBody className="p-10 text-center">
            <Icon className="mx-auto text-gray-300 mb-3" height="56" icon="heroicons:shopping-cart" width="56" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No se encontraron compras</h3>
            <p className="text-gray-500 text-sm">
              {purchases.length === 0 ? 'Aún no hay compras registradas.' : 'Prueba con otra búsqueda o limpia los filtros.'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {pageItems.map((purchase) => (
            <div
              key={purchase.id}
              className="rounded-2xl border border-default-200 bg-white shadow-sm hover:shadow-md hover:border-primary-200 transition-all p-4 sm:p-5"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3 md:w-64 shrink-0">
                  <div className="w-11 h-11 rounded-xl bg-secondary-50 text-secondary-600 flex items-center justify-center shrink-0">
                    <Icon height="22" icon="heroicons:shopping-cart" width="22" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{purchase.numeroCompra}</p>
                    <p className="text-xs text-gray-500">{formatShortDate(purchase.fecha)}</p>
                  </div>
                </div>

                <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Proveedor</p>
                    <p className="font-medium truncate">{purchase.proveedor.nombre}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Productos</p>
                    <Chip size="sm" variant="flat">
                      {purchase.detalles.length} · {getTotalItems(purchase)} unid.
                    </Chip>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Descuento</p>
                    {purchase.descuento > 0 ? (
                      <span className="text-red-600 font-medium">- Bs. {purchase.descuento.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Total</p>
                    <p className="font-bold text-primary-700">Bs. {purchase.total.toFixed(2)}</p>
                  </div>
                </div>

                <Button
                  className="md:w-auto w-full shrink-0"
                  color="primary"
                  size="sm"
                  startContent={<Icon height="18" icon="mdi:eye-outline" width="18" />}
                  variant="flat"
                  onPress={() => handleViewDetails(purchase)}
                >
                  Ver detalle
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length > ROWS_PER_PAGE && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <Pagination isCompact showControls showShadow color="secondary" page={page} total={pages} onChange={setPage} />
          <p className="text-xs text-gray-500">
            Mostrando {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, filtered.length)} de {filtered.length} compras
          </p>
        </div>
      )}

      <PurchaseDetailModal isOpen={isOpen} purchase={selectedPurchase} onClose={onClose} />
    </div>
  );
}
