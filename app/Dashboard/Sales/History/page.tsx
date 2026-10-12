"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { Button, Card, CardBody, Chip, Pagination, Select, SelectItem, Spinner } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';

import { getSalesHistory } from '@/actions/sales/sales-history-action';
import { useAuth } from '@/app/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import SaleDetailModal, { getMetodoPago, Venta } from '@/components/sales/SaleDetailModal';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import ListHeaderCard from '@/components/ui/ListHeaderCard';
import StatCard from '@/components/ui/StatCard';
import DateRangeFilter from '@/components/ui/DateRangeFilter';
import { formatShortDate, formatTime, inDateRange, inPeriod, Period, PERIOD_OPTIONS } from '@/src/utils/period';

const ROWS_PER_PAGE = 10;

export default function SalesHistoryView() {
  const router = useRouter();
  const { hasRole } = useAuth();

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [pago, setPago] = useState('todos');
  const [periodo, setPeriodo] = useState<Period>('todo');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [rangeKey, setRangeKey] = useState(0);
  const hayRango = Boolean(desde || hasta);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const result = await getSalesHistory();

        if (result.success && result.data) setVentas(result.data);
      } catch (error) {
        console.error('Error al cargar ventas:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, pago, periodo, desde, hasta]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return ventas.filter((v) => {
      if (
        q &&
        !v.numeroVenta.toLowerCase().includes(q) &&
        !v.cliente.nombre.toLowerCase().includes(q) &&
        !v.cliente.carnet.toLowerCase().includes(q)
      )
        return false;
      if (pago !== 'todos' && String(v.metodoPago) !== pago) return false;
      if (hayRango ? !inDateRange(v.fecha, desde, hasta) : !inPeriod(v.fecha, periodo)) return false;

      return true;
    });
  }, [ventas, search, pago, periodo, desde, hasta, hayRango]);

  const pages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageItems = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);
  const activeFilters = (pago !== 'todos' ? 1 : 0) + (hayRango ? 1 : periodo !== 'todo' ? 1 : 0);

  const openDetails = (venta: Venta) => {
    setSelectedVenta(venta);
    setIsOpen(true);
  };

  return (
    <ProtectedRoute allowedRoles={[1, 2, 3]}>
      <div className="p-4 md:p-8 space-y-5">
        <Breadcrumbs items={[{ label: 'Ventas' }, { label: 'Historial' }]} />

        <ListHeaderCard
          actionLabel={hasRole([1, 2]) ? 'Nueva venta' : undefined}
          activeFilters={activeFilters}
          description="Consulta las ventas registradas"
          filters={
            <>
              <Select
                disallowEmptySelection
                label="Forma de pago"
                selectedKeys={[pago]}
                onSelectionChange={(k) => setPago((Array.from(k)[0] as string) || 'todos')}
              >
                <SelectItem key="todos">Todas</SelectItem>
                <SelectItem key="1">Efectivo</SelectItem>
                <SelectItem key="2">Tarjeta</SelectItem>
                <SelectItem key="3">Transferencia</SelectItem>
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
          searchPlaceholder="Buscar por número de venta, cliente o carnet..."
          title="Historial de ventas"
          onAction={() => router.push('/Dashboard/Sales/New')}
          onClearFilters={() => {
            setSearch('');
            setPago('todos');
            setPeriodo('todo');
            setDesde('');
            setHasta('');
            setRangeKey((k) => k + 1);
          }}
          onSearchChange={setSearch}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon="mdi:receipt-text-outline" label="Ventas" tone="primary" value={filtered.length} />
          <StatCard
            icon="heroicons:banknotes"
            label="Monto vendido"
            tone="success"
            value={`Bs. ${filtered.reduce((s, v) => s + v.total, 0).toFixed(2)}`}
          />
          <StatCard
            icon="heroicons:tag"
            label="Descuentos otorgados"
            tone="danger"
            value={`Bs. ${filtered.reduce((s, v) => s + v.descuento, 0).toFixed(2)}`}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner label="Cargando ventas..." size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border border-default-200 shadow-sm">
            <CardBody className="p-10 text-center">
              <Icon className="mx-auto text-gray-300 mb-3" height="56" icon="mdi:receipt-text-outline" width="56" />
              <h3 className="text-lg font-semibold text-gray-700 mb-1">No se encontraron ventas</h3>
              <p className="text-gray-500 text-sm">Prueba con otra búsqueda o limpia los filtros.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {pageItems.map((venta) => {
              const metodo = getMetodoPago(venta.metodoPago);

              return (
                <div
                  key={venta.id}
                  className="rounded-2xl border border-default-200 bg-white shadow-sm hover:shadow-md hover:border-primary-200 transition-all p-4 sm:p-5"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-3 md:w-64 shrink-0">
                      <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                        <Icon height="22" icon="mdi:receipt-text-outline" width="22" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{venta.numeroVenta}</p>
                        <p className="text-xs text-gray-500">
                          {formatShortDate(venta.fecha)} · {formatTime(venta.fecha)}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Cliente</p>
                        <p className="font-medium truncate">{venta.cliente.nombre}</p>
                        <p className="text-xs text-gray-400">{venta.cliente.carnet}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Productos</p>
                        <Chip size="sm" variant="flat">
                          {venta.detalles.length}
                        </Chip>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Pago</p>
                        <Chip color={metodo.color} size="sm" variant="flat">
                          {metodo.label}
                        </Chip>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">Total</p>
                        <p className="font-bold text-primary-700">Bs. {venta.total.toFixed(2)}</p>
                      </div>
                    </div>

                    <Button
                      className="md:w-auto w-full shrink-0"
                      color="primary"
                      size="sm"
                      startContent={<Icon height="18" icon="mdi:eye-outline" width="18" />}
                      variant="flat"
                      onPress={() => openDetails(venta)}
                    >
                      Ver detalle
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filtered.length > ROWS_PER_PAGE && (
          <div className="flex flex-col items-center gap-2 pt-2">
            <Pagination isCompact showControls showShadow color="secondary" page={page} total={pages} onChange={setPage} />
            <p className="text-xs text-gray-500">
              Mostrando {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, filtered.length)} de {filtered.length} ventas
            </p>
          </div>
        )}
      </div>

      <SaleDetailModal isOpen={isOpen} venta={selectedVenta} onClose={() => setIsOpen(false)} />
    </ProtectedRoute>
  );
}
