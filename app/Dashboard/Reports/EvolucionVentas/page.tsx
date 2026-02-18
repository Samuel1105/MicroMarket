"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardBody, DateRangePicker, Button, Spinner, Chip } from '@heroui/react'
import { Icon } from '@iconify/react'
import { parseDate } from '@internationalized/date'

import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/dashboard/BaseChart'

// ============================================
// TYPES
// ============================================
type SalesEvolutionData = {
  ventasDiarias: Array<{
    fecha: string
    total: number
    cantidad: number
  }>
  ventasPorSemana: Array<{
    dia: string
    total: number
    cantidad: number
    promedio: number
  }>
  topProductos: Array<{
    producto: string
    categoria: string
    cantidadVendida: number
    totalVentas: number
    numeroVentas: number
  }>
  categorias: Array<{
    categoria: string
    total: number
  }>
  estadisticas: {
    totalVentas: number
    numeroVentas: number
    promedioVenta: number
    totalVentasAnterior: number
    numeroVentasAnterior: number
    promedioVentaAnterior: number
    crecimientoTotal: number
    crecimientoNumero: number
    crecimientoPromedio: number
    tendencia: 'subiendo' | 'bajando' | 'estable'
    mejorDia: { fecha: string; total: number; cantidad: number } | null
    peorDia: { fecha: string; total: number; cantidad: number } | null
  }
  periodo: {
    inicio: string
    fin: string
    dias: number
  }
}

export default function SalesEvolutionReport() {
  const [dateRange, setDateRange] = useState({
    start: parseDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
    end: parseDate(new Date().toISOString().split('T')[0])
  })
  
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SalesEvolutionData | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const startDate = `${dateRange.start.year}-${String(dateRange.start.month).padStart(2, '0')}-${String(dateRange.start.day).padStart(2, '0')}`
      const endDate = `${dateRange.end.year}-${String(dateRange.end.month).padStart(2, '0')}-${String(dateRange.end.day).padStart(2, '0')}`
      
      const { getSalesEvolution } = await import('@/actions/reportes/reporte-evolucion-ventas')
      const response = await getSalesEvolution({ startDate, endDate })
      
      if (response.success && response.data) {
        setData(response.data)
      }
      
    } catch (error) {
      console.error('Error cargando evolución de ventas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // ============================================
  // HELPERS
  // ============================================
  const formatFecha = (fechaStr: string) => {
    const fecha = new Date(fechaStr + 'T00:00:00')
    return fecha.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })
  }

  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'subiendo': return '📈'
      case 'bajando': return '📉'
      default: return '➡️'
    }
  }

  const getTendenciaColor = (tendencia: string) => {
    switch (tendencia) {
      case 'subiendo': return 'success'
      case 'bajando': return 'danger'
      default: return 'default'
    }
  }

  const getCrecimientoColor = (valor: number) => {
    if (valor > 0) return 'text-green-600'
    if (valor < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  // ============================================
  // GRÁFICOS
  // ============================================

  const getVentasDiariasChartOptions = (): EChartsOption => {
    if (!data) return {}
    
    return {
      title: {
        text: '💰 Ventas Día por Día',
        left: 'center',
        textStyle: { fontSize: 18, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const item = params[0]
          const dia = data.ventasDiarias[item.dataIndex]
          return `<strong>${formatFecha(dia.fecha)}</strong><br/>
                  Ventas: <strong>Bs. ${dia.total.toFixed(2)}</strong><br/>
                  Cantidad: <strong>${dia.cantidad} ventas</strong><br/>
                  Promedio: <strong>Bs. ${(dia.total / dia.cantidad).toFixed(2)}</strong>`
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.ventasDiarias.map(d => formatFecha(d.fecha)),
        axisLabel: {
          rotate: 45,
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => `Bs. ${value.toFixed(0)}`
        }
      },
      series: [
        {
          name: 'Ventas',
          type: 'line',
          data: data.ventasDiarias.map(d => d.total.toFixed(2)),
          smooth: true,
          itemStyle: {
            color: '#3b82f6'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
              ]
            }
          },
          lineStyle: {
            width: 3
          },
          label: {
            show: false
          }
        }
      ]
    }
  }

  const getVentasPorSemanaChartOptions = (): EChartsOption => {
    if (!data) return {}
    
    return {
      title: {
        text: '📅 ¿Qué Día Vendemos Más?',
        left: 'center',
        textStyle: { fontSize: 18, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = data.ventasPorSemana[params[0].dataIndex]
          return `<strong>${item.dia}</strong><br/>
                  Total: <strong>Bs. ${item.total.toFixed(2)}</strong><br/>
                  Ventas: <strong>${item.cantidad}</strong><br/>
                  Promedio: <strong>Bs. ${item.promedio.toFixed(2)}</strong>`
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.ventasPorSemana.map(d => d.dia),
        axisLabel: {
          fontSize: 11
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => `Bs. ${value.toFixed(0)}`
        }
      },
      series: [
        {
          name: 'Ventas',
          type: 'bar',
          data: data.ventasPorSemana.map(d => d.total.toFixed(2)),
          itemStyle: {
            color: (params: any) => {
              const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
              return colors[params.dataIndex % colors.length]
            },
            borderRadius: [5, 5, 0, 0]
          },
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => `Bs. ${Number(params.value).toFixed(0)}`,
            fontSize: 10
          }
        }
      ]
    }
  }

  const getTopProductosChartOptions = (): EChartsOption => {
    if (!data) return {}
    
    return {
      title: {
        text: '🏆 Productos Más Vendidos',
        left: 'center',
        textStyle: { fontSize: 18, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = data.topProductos[params[0].dataIndex]
          return `<strong>${item.producto}</strong><br/>
                  Total: <strong>Bs. ${item.totalVentas.toFixed(2)}</strong><br/>
                  Cantidad: <strong>${item.cantidadVendida.toFixed(0)} unidades</strong><br/>
                  Ventas: <strong>${item.numeroVentas}</strong>`
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => `Bs. ${value.toFixed(0)}`
        }
      },
      yAxis: {
        type: 'category',
        data: data.topProductos.map(p => p.producto.length > 20 ? p.producto.substring(0, 20) + '...' : p.producto),
        axisLabel: {
          interval: 0,
          fontSize: 10
        }
      },
      series: [
        {
          name: 'Ventas',
          type: 'bar',
          data: data.topProductos.map(p => p.totalVentas.toFixed(2)),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: '#10b981' },
                { offset: 1, color: '#059669' }
              ]
            },
            borderRadius: [0, 5, 5, 0]
          },
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => `Bs. ${Number(params.value).toFixed(0)}`,
            fontSize: 10
          }
        }
      ]
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" label="Cargando evolución de ventas..." />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">📊 Evolución de Ventas</h1>
        <p className="text-gray-600">Vea cómo cambian sus ventas día a día y encuentre sus mejores momentos</p>
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
              onPress={loadData}
              isLoading={loading}
              startContent={!loading && <Icon icon="material-symbols:search" />}
            >
              Analizar Ventas
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Card de Tendencia General */}
      <Card className={`mb-6 shadow-lg ${
        data.estadisticas.tendencia === 'subiendo' ? 'bg-gradient-to-br from-green-50 to-green-100' :
        data.estadisticas.tendencia === 'bajando' ? 'bg-gradient-to-br from-red-50 to-red-100' :
        'bg-gradient-to-br from-blue-50 to-blue-100'
      }`}>
        <CardBody className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tendencia General</p>
              <h2 className="text-3xl font-bold">
                {getTendenciaIcon(data.estadisticas.tendencia)}
                {' '}
                {data.estadisticas.tendencia === 'subiendo' ? 'Tus ventas están subiendo' :
                 data.estadisticas.tendencia === 'bajando' ? 'Tus ventas están bajando' :
                 'Tus ventas están estables'}
              </h2>
            </div>
            <Chip
              size="lg"
              color={getTendenciaColor(data.estadisticas.tendencia)}
              variant="flat"
            >
              {data.estadisticas.crecimientoTotal >= 0 ? '+' : ''}
              {data.estadisticas.crecimientoTotal.toFixed(1)}%
            </Chip>
          </div>
        </CardBody>
      </Card>

      {/* Cards de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Ventas */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500 shadow-md">
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <div className="bg-blue-500 p-2 rounded-full">
                <Icon icon="mdi:cash-multiple" className="text-2xl text-white" />
              </div>
              <Chip
                size="sm"
                color={data.estadisticas.crecimientoTotal >= 0 ? 'success' : 'danger'}
                variant="flat"
                startContent={<Icon icon={data.estadisticas.crecimientoTotal >= 0 ? 'mdi:arrow-up' : 'mdi:arrow-down'} />}
              >
                {Math.abs(data.estadisticas.crecimientoTotal).toFixed(1)}%
              </Chip>
            </div>
            <p className="text-xs text-gray-600 font-medium mb-1">Total Vendido</p>
            <p className="text-2xl font-bold text-blue-700">
              Bs. {data.estadisticas.totalVentas.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Antes: Bs. {data.estadisticas.totalVentasAnterior.toFixed(2)}
            </p>
          </CardBody>
        </Card>

        {/* Número de Ventas */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500 shadow-md">
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <div className="bg-green-500 p-2 rounded-full">
                <Icon icon="mdi:cart" className="text-2xl text-white" />
              </div>
              <Chip
                size="sm"
                color={data.estadisticas.crecimientoNumero >= 0 ? 'success' : 'danger'}
                variant="flat"
                startContent={<Icon icon={data.estadisticas.crecimientoNumero >= 0 ? 'mdi:arrow-up' : 'mdi:arrow-down'} />}
              >
                {Math.abs(data.estadisticas.crecimientoNumero).toFixed(1)}%
              </Chip>
            </div>
            <p className="text-xs text-gray-600 font-medium mb-1">Cantidad de Ventas</p>
            <p className="text-2xl font-bold text-green-700">
              {data.estadisticas.numeroVentas}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Antes: {data.estadisticas.numeroVentasAnterior}
            </p>
          </CardBody>
        </Card>

        {/* Promedio por Venta */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500 shadow-md">
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <div className="bg-purple-500 p-2 rounded-full">
                <Icon icon="mdi:chart-line" className="text-2xl text-white" />
              </div>
              <Chip
                size="sm"
                color={data.estadisticas.crecimientoPromedio >= 0 ? 'success' : 'danger'}
                variant="flat"
                startContent={<Icon icon={data.estadisticas.crecimientoPromedio >= 0 ? 'mdi:arrow-up' : 'mdi:arrow-down'} />}
              >
                {Math.abs(data.estadisticas.crecimientoPromedio).toFixed(1)}%
              </Chip>
            </div>
            <p className="text-xs text-gray-600 font-medium mb-1">Promedio por Venta</p>
            <p className="text-2xl font-bold text-purple-700">
              Bs. {data.estadisticas.promedioVenta.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Antes: Bs. {data.estadisticas.promedioVentaAnterior.toFixed(2)}
            </p>
          </CardBody>
        </Card>

        {/* Días analizados */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500 shadow-md">
          <CardBody>
            <div className="flex items-center justify-between mb-2">
              <div className="bg-orange-500 p-2 rounded-full">
                <Icon icon="mdi:calendar" className="text-2xl text-white" />
              </div>
            </div>
            <p className="text-xs text-gray-600 font-medium mb-1">Días Analizados</p>
            <p className="text-2xl font-bold text-orange-700">
              {data.periodo.dias} días
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatFecha(data.periodo.inicio)} - {formatFecha(data.periodo.fin)}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Mejor y Peor Día */}
      {data.estadisticas.mejorDia && data.estadisticas.peorDia && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 shadow-md">
            <CardBody>
              <div className="flex items-center gap-3">
                <div className="bg-green-500 p-3 rounded-full">
                  <Icon icon="mdi:trophy" className="text-3xl text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">🏆 Mejor Día</p>
                  <p className="text-xl font-bold text-green-700">
                    {formatFecha(data.estadisticas.mejorDia.fecha)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Bs. {data.estadisticas.mejorDia.total.toFixed(2)} en {data.estadisticas.mejorDia.cantidad} ventas
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 shadow-md">
            <CardBody>
              <div className="flex items-center gap-3">
                <div className="bg-gray-500 p-3 rounded-full">
                  <Icon icon="mdi:alert-circle" className="text-3xl text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">📉 Día Más Bajo</p>
                  <p className="text-xl font-bold text-gray-700">
                    {formatFecha(data.estadisticas.peorDia.fecha)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Bs. {data.estadisticas.peorDia.total.toFixed(2)} en {data.estadisticas.peorDia.cantidad} ventas
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Gráfico de ventas diarias */}
      <Card className="shadow-md mb-6">
        <CardBody className="p-4">
          <BaseChart 
            option={getVentasDiariasChartOptions()} 
            height="400px"
            loading={loading}
          />
        </CardBody>
      </Card>

      {/* Gráficos de análisis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="shadow-md">
          <CardBody className="p-4">
            <BaseChart 
              option={getVentasPorSemanaChartOptions()} 
              height="400px"
              loading={loading}
            />
          </CardBody>
        </Card>

        <Card className="shadow-md">
          <CardBody className="p-4">
            <BaseChart 
              option={getTopProductosChartOptions()} 
              height="400px"
              loading={loading}
            />
          </CardBody>
        </Card>
      </div>

      {/* Consejos */}
      <Card className="shadow-md bg-blue-50">
        <CardBody>
          <h3 className="text-lg font-bold mb-3 text-blue-900 flex items-center gap-2">
            <Icon icon="mdi:lightbulb-on" className="text-blue-600" />
            💡 Consejos para Aumentar tus Ventas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <p className="text-sm font-semibold text-gray-700 mb-2">📅 Aprovecha tus mejores días</p>
              <p className="text-xs text-gray-600">
                Los días que más vendes son buenos para lanzar promociones o tener más stock disponible
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-sm font-semibold text-gray-700 mb-2">🏆 Promociona lo que funciona</p>
              <p className="text-xs text-gray-600">
                Tus productos top ya tienen demanda. Considera tener siempre buen stock de ellos
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-sm font-semibold text-gray-700 mb-2">📈 Mejora los días flojos</p>
              <p className="text-xs text-gray-600">
                En los días que menos vendes, prueba ofertas especiales para atraer más clientes
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}