"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardBody, DateRangePicker, Button, Spinner, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react'
import { Icon } from '@iconify/react'
import { parseDate } from '@internationalized/date'

import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/dashboard/BaseChart'

// ============================================
// TYPES
// ============================================
type MovimientoDetallado = {
  id: number
  fecha: string
  hora: string
  tipoMovimiento: number
  tipoMovimientoLabel: string
  producto: string
  categoria: string
  cantidad: number
  cantidadUnidadesBase: number
  unidadMedida: string
  lote: string | null
  referenciaID: number | null
  tipoReferencia: number | null
  observaciones: string | null
  usuarioID: number
}

type WarehouseMovementData = {
  movimientos: MovimientoDetallado[]
  movimientosDiarios: Array<{
    fecha: string
    ingresos: number
    salidas: number
    ajustes: number
  }>
  productoMovimientos: Array<{
    producto: string
    categoria: string
    ingresos: number
    salidas: number
    ajustes: number
    neto: number
  }>
  topMovimientos: Array<{
    producto: string
    categoria: string
    ingresos: number
    salidas: number
    ajustes: number
    neto: number
  }>
  irregularidades: Array<{
    tipo: 'ajuste_alto' | 'salida_sin_referencia' | 'entrada_sin_lote'
    producto: string
    cantidad: number
    fecha: string
    observaciones: string
  }>
  estadisticas: {
    totalMovimientos: number
    totalIngresos: number
    totalSalidas: number
    totalAjustes: number
    totalIngresosUnidades: number
    totalSalidasUnidades: number
    totalAjustesUnidades: number
    saldoNeto: number
    promedioIngresosDiario: number
    promedioSalidasDiario: number
    irregularidadesDetectadas: number
  }
  periodo: {
    inicio: string
    fin: string
  }
}

export default function WarehouseMovementReport() {
  const [dateRange, setDateRange] = useState({
    start: parseDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
    end: parseDate(new Date().toISOString().split('T')[0])
  })
  
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<WarehouseMovementData | null>(null)
  const [selectedTipo, setSelectedTipo] = useState<number | null>(null)

  const loadData = async (tipoMovimiento?: number) => {
    setLoading(true)
    try {
      const startDate = `${dateRange.start.year}-${String(dateRange.start.month).padStart(2, '0')}-${String(dateRange.start.day).padStart(2, '0')}`
      const endDate = `${dateRange.end.year}-${String(dateRange.end.month).padStart(2, '0')}-${String(dateRange.end.day).padStart(2, '0')}`
      
      const { getWarehouseMovements } = await import('@/actions/reportes/reporte-movimiento-almacen')
      const response = await getWarehouseMovements({ 
        startDate, 
        endDate,
        tipoMovimiento 
      })
      
      if (response.success && response.data) {
        setData(response.data)
      }
      
    } catch (error) {
      console.error('Error cargando movimientos de almacén:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleFilterChange = (tipo: number | null) => {
    setSelectedTipo(tipo)
    loadData(tipo || undefined)
  }

  // ============================================
  // HELPERS
  // ============================================
  const getTipoMovimientoConfig = (tipo: number) => {
    switch (tipo) {
      case 1:
        return {
          label: 'Ingreso',
          icon: 'mdi:arrow-down-bold',
          color: 'success',
          bgColor: 'bg-green-100',
          textColor: 'text-green-700'
        }
      case 2:
        return {
          label: 'Salida',
          icon: 'mdi:arrow-up-bold',
          color: 'danger',
          bgColor: 'bg-red-100',
          textColor: 'text-red-700'
        }
      case 3:
        return {
          label: 'Ajuste',
          icon: 'mdi:wrench',
          color: 'warning',
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-700'
        }
      default:
        return {
          label: 'Desconocido',
          icon: 'mdi:help-circle',
          color: 'default',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700'
        }
    }
  }

  const getIrregularidadConfig = (tipo: string) => {
    switch (tipo) {
      case 'ajuste_alto':
        return {
          label: 'Ajuste Alto',
          icon: 'mdi:alert',
          color: 'danger'
        }
      case 'salida_sin_referencia':
        return {
          label: 'Salida Sin Ref.',
          icon: 'mdi:link-off',
          color: 'warning'
        }
      case 'entrada_sin_lote':
        return {
          label: 'Sin Lote',
          icon: 'mdi:package-variant-closed-remove',
          color: 'warning'
        }
      default:
        return {
          label: 'Irregular',
          icon: 'mdi:alert-circle',
          color: 'default'
        }
    }
  }

  const formatFecha = (fechaStr: string) => {
    const fecha = new Date(fechaStr + 'T00:00:00')
    return fecha.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })
  }

  // ============================================
  // GRÁFICOS
  // ============================================

  const getMovimientosDiariosChartOptions = (): EChartsOption => {
    if (!data) return {}
    
    return {
      title: {
        text: 'Movimientos por Día',
        left: 'center',
        textStyle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const dia = data.movimientosDiarios[params[0].dataIndex]
          return `<strong>${formatFecha(dia.fecha)}</strong><br/>
                  Ingresos: <strong>${dia.ingresos.toFixed(0)}</strong> unidades<br/>
                  Salidas: <strong>${dia.salidas.toFixed(0)}</strong> unidades<br/>
                  Ajustes: <strong>${dia.ajustes.toFixed(0)}</strong> unidades`
        }
      },
      legend: {
        data: ['Ingresos', 'Salidas', 'Ajustes'],
        top: 35
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.movimientosDiarios.map(d => formatFecha(d.fecha)),
        axisLabel: {
          rotate: 45,
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => `${value.toFixed(0)}`
        }
      },
      series: [
        {
          name: 'Ingresos',
          type: 'line',
          data: data.movimientosDiarios.map(d => d.ingresos.toFixed(0)),
          smooth: true,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }
              ]
            }
          }
        },
        {
          name: 'Salidas',
          type: 'line',
          data: data.movimientosDiarios.map(d => d.salidas.toFixed(0)),
          smooth: true,
          itemStyle: { color: '#ef4444' },
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(239, 68, 68, 0.3)' },
                { offset: 1, color: 'rgba(239, 68, 68, 0.05)' }
              ]
            }
          }
        },
        {
          name: 'Ajustes',
          type: 'line',
          data: data.movimientosDiarios.map(d => d.ajustes.toFixed(0)),
          smooth: true,
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 3 }
        }
      ]
    }
  }

  const getTopMovimientosChartOptions = (): EChartsOption => {
    if (!data) return {}
    
    return {
      title: {
        text: 'Productos con Mayor Movimiento',
        left: 'center',
        textStyle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = data.topMovimientos[params[0].dataIndex]
          return `<strong>${item.producto}</strong><br/>
                  Ingresos: <strong>${item.ingresos.toFixed(0)}</strong><br/>
                  Salidas: <strong>${item.salidas.toFixed(0)}</strong><br/>
                  Ajustes: <strong>${item.ajustes.toFixed(0)}</strong><br/>
                  Neto: <strong>${item.neto.toFixed(0)}</strong>`
        }
      },
      legend: {
        data: ['Ingresos', 'Salidas', 'Ajustes'],
        top: 35
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'value'
      },
      yAxis: {
        type: 'category',
        data: data.topMovimientos.map(p => p.producto.length > 20 ? p.producto.substring(0, 20) + '...' : p.producto),
        axisLabel: {
          interval: 0,
          fontSize: 10
        }
      },
      series: [
        {
          name: 'Ingresos',
          type: 'bar',
          stack: 'total',
          data: data.topMovimientos.map(p => p.ingresos.toFixed(0)),
          itemStyle: { color: '#10b981' }
        },
        {
          name: 'Salidas',
          type: 'bar',
          stack: 'total',
          data: data.topMovimientos.map(p => -p.salidas.toFixed(0)),
          itemStyle: { color: '#ef4444' }
        },
        {
          name: 'Ajustes',
          type: 'bar',
          stack: 'total',
          data: data.topMovimientos.map(p => p.ajustes.toFixed(0)),
          itemStyle: { color: '#f59e0b' }
        }
      ]
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" label="Cargando movimientos de almacén..." />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
          <Icon icon="mdi:warehouse" className="text-blue-600" />
          Movimiento de Almacén
        </h1>
        <p className="text-gray-600">Audite el flujo de inventario: entradas, salidas y ajustes</p>
      </div>

      {/* Filtro de fechas */}
      <Card className="mb-6 shadow-md">
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <DateRangePicker
                label="Rango de fechas"
                value={dateRange}
                onChange={setDateRange}
                className="max-w-md"
              />
            </div>
            <Button 
              color="primary" 
              onPress={() => loadData(selectedTipo || undefined)}
              isLoading={loading}
              startContent={!loading && <Icon icon="material-symbols:search" />}
            >
              Analizar Movimientos
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Alertas de irregularidades */}
      {data.estadisticas.irregularidadesDetectadas > 0 && (
        <Card className="mb-6 shadow-md bg-red-50 border-l-4 border-red-500">
          <CardBody>
            <div className="flex items-center gap-3">
              <Icon icon="mdi:alert-circle" className="text-3xl text-red-600" />
              <div>
                <h3 className="font-bold text-red-800">
                  {data.estadisticas.irregularidadesDetectadas} Irregularidades Detectadas
                </h3>
                <p className="text-sm text-red-700">
                  Se encontraron movimientos que requieren revisión
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Cards de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500 shadow-md">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Total Ingresos</p>
                <p className="text-3xl font-bold text-green-700">
                  {data.estadisticas.totalIngresos}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.estadisticas.totalIngresosUnidades.toFixed(0)} unidades
                </p>
              </div>
              <div className="bg-green-500 p-3 rounded-full">
                <Icon icon="mdi:arrow-down-bold" className="text-2xl text-white" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500 shadow-md">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Total Salidas</p>
                <p className="text-3xl font-bold text-red-700">
                  {data.estadisticas.totalSalidas}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.estadisticas.totalSalidasUnidades.toFixed(0)} unidades
                </p>
              </div>
              <div className="bg-red-500 p-3 rounded-full">
                <Icon icon="mdi:arrow-up-bold" className="text-2xl text-white" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500 shadow-md">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Total Ajustes</p>
                <p className="text-3xl font-bold text-orange-700">
                  {data.estadisticas.totalAjustes}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.estadisticas.totalAjustesUnidades.toFixed(0)} unidades
                </p>
              </div>
              <div className="bg-orange-500 p-3 rounded-full">
                <Icon icon="mdi:wrench" className="text-2xl text-white" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500 shadow-md">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Saldo Neto</p>
                <p className={`text-3xl font-bold ${data.estadisticas.saldoNeto >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {data.estadisticas.saldoNeto >= 0 ? '+' : ''}{data.estadisticas.saldoNeto.toFixed(0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  unidades
                </p>
              </div>
              <div className="bg-blue-500 p-3 rounded-full">
                <Icon icon="mdi:scale-balance" className="text-2xl text-white" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Gráficos */}
      <Card className="shadow-md mb-6">
        <CardBody className="p-4">
          <BaseChart 
            option={getMovimientosDiariosChartOptions()} 
            height="400px"
            loading={loading}
          />
        </CardBody>
      </Card>

      <Card className="shadow-md mb-6">
        <CardBody className="p-4">
          <BaseChart 
            option={getTopMovimientosChartOptions()} 
            height="500px"
            loading={loading}
          />
        </CardBody>
      </Card>

      {/* Irregularidades */}
      {data.irregularidades.length > 0 && (
        <Card className="shadow-md mb-6">
          <CardBody>
            <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
              <Icon icon="mdi:alert-octagon" className="text-red-600" />
              Irregularidades Detectadas
            </h3>
            
            <div className="space-y-3">
              {data.irregularidades.slice(0, 10).map((irr, idx) => {
                const config = getIrregularidadConfig(irr.tipo)
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                    <Icon icon={config.icon} className="text-2xl text-red-600" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Chip size="sm" color={config.color as any} variant="flat">
                          {config.label}
                        </Chip>
                        <span className="text-sm font-semibold">{irr.producto}</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {irr.observaciones} - {irr.cantidad.toFixed(0)} unidades el {formatFecha(irr.fecha)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Filtros de tipo */}
      <Card className="shadow-md mb-6">
        <CardBody>
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              color={selectedTipo === null ? 'primary' : 'default'}
              variant={selectedTipo === null ? 'solid' : 'flat'}
              onPress={() => handleFilterChange(null)}
              startContent={<Icon icon="mdi:view-list" />}
            >
              Todos ({data.estadisticas.totalMovimientos})
            </Button>
            <Button
              color={selectedTipo === 1 ? 'success' : 'default'}
              variant={selectedTipo === 1 ? 'solid' : 'flat'}
              onPress={() => handleFilterChange(1)}
              startContent={<Icon icon="mdi:arrow-down-bold" />}
            >
              Ingresos ({data.estadisticas.totalIngresos})
            </Button>
            <Button
              color={selectedTipo === 2 ? 'danger' : 'default'}
              variant={selectedTipo === 2 ? 'solid' : 'flat'}
              onPress={() => handleFilterChange(2)}
              startContent={<Icon icon="mdi:arrow-up-bold" />}
            >
              Salidas ({data.estadisticas.totalSalidas})
            </Button>
            <Button
              color={selectedTipo === 3 ? 'warning' : 'default'}
              variant={selectedTipo === 3 ? 'solid' : 'flat'}
              onPress={() => handleFilterChange(3)}
              startContent={<Icon icon="mdi:wrench" />}
            >
              Ajustes ({data.estadisticas.totalAjustes})
            </Button>
          </div>

          <Table aria-label="Tabla de movimientos">
            <TableHeader>
              <TableColumn>FECHA/HORA</TableColumn>
              <TableColumn>TIPO</TableColumn>
              <TableColumn>PRODUCTO</TableColumn>
              <TableColumn align="center">CANTIDAD</TableColumn>
              <TableColumn>LOTE</TableColumn>
              <TableColumn>OBSERVACIONES</TableColumn>
            </TableHeader>
            <TableBody>
              {data.movimientos.slice(0, 50).map((mov) => {
                const config = getTipoMovimientoConfig(mov.tipoMovimiento)
                return (
                  <TableRow key={mov.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{formatFecha(mov.fecha)}</span>
                        <span className="text-xs text-gray-500">{mov.hora}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={config.color as any}
                        variant="flat"
                        startContent={<Icon icon={config.icon} />}
                      >
                        {config.label}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{mov.producto}</span>
                        <span className="text-xs text-gray-500">{mov.categoria}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className={`font-bold ${mov.tipoMovimiento === 1 ? 'text-green-600' : mov.tipoMovimiento === 2 ? 'text-red-600' : 'text-orange-600'}`}>
                          {mov.tipoMovimiento === 2 ? '-' : '+'}{mov.cantidadUnidadesBase.toFixed(0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {mov.unidadMedida}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {mov.lote ? (
                        <Chip size="sm" variant="flat">
                          {mov.lote}
                        </Chip>
                      ) : (
                        <span className="text-xs text-gray-400">Sin lote</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-600">
                        {mov.observaciones || '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Recomendaciones */}
      <Card className="shadow-md bg-blue-50">
        <CardBody>
          <h3 className="text-lg font-bold mb-3 text-blue-900 flex items-center gap-2">
            <Icon icon="mdi:lightbulb-on-outline" className="text-2xl text-blue-600" />
            Recomendaciones de Control
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Icon icon="mdi:shield-check" className="text-xl text-green-600" />
                <p className="text-sm font-semibold text-gray-700">Auditoría Regular</p>
              </div>
              <p className="text-xs text-gray-600">
                Revise los movimientos diariamente para detectar irregularidades a tiempo
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Icon icon="mdi:file-document-check" className="text-xl text-blue-600" />
                <p className="text-sm font-semibold text-gray-700">Documentación</p>
              </div>
              <p className="text-xs text-gray-600">
                Todos los movimientos deben tener observaciones claras y referencias
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Icon icon="mdi:alert-circle" className="text-xl text-orange-600" />
                <p className="text-sm font-semibold text-gray-700">Ajustes Justificados</p>
              </div>
              <p className="text-xs text-gray-600">
                Los ajustes de inventario deben estar justificados y documentados
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}