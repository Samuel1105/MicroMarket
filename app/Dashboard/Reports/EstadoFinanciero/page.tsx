"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardBody, DateRangePicker, Button, Spinner } from '@heroui/react'
import { Icon } from '@iconify/react'
import { parseDate } from '@internationalized/date'

import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/dashboard/BaseChart'

// Tipos para los datos financieros
type FinancialData = {
  totalIngresos: number
  totalGastos: number
  utilidadNeta: number
  margenUtilidad: number
  ingresosPorDia: Array<{ fecha: string; monto: number }>
  gastosPorDia: Array<{ fecha: string; monto: number }>
  ventasPorCategoria: Array<{ categoria: string; total: number; cantidad: number }>
  topProductosVendidos: Array<{ producto: string; cantidad: number; ingresos: number }>
  gastosPorProveedor: Array<{ proveedor: string; total: number; porcentaje: number }>
  detalleGastos: {
    comprasProveedor: number
    otrosGastos: number
  }
}

export default function FinancialReport() {
  const [dateRange, setDateRange] = useState({
    start: parseDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
    end: parseDate(new Date().toISOString().split('T')[0])
  })

  const handleDateRangeChange = (value: any) => {
    if (value && value.start && value.end) {
      setDateRange({ start: value.start, end: value.end })
    }
  }
  
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<FinancialData | null>(null)

  // Función para cargar datos financieros
  const loadFinancialData = async () => {
    setLoading(true)
    try {
      const startDate = `${dateRange.start.year}-${String(dateRange.start.month).padStart(2, '0')}-${String(dateRange.start.day).padStart(2, '0')}`
      const endDate = `${dateRange.end.year}-${String(dateRange.end.month).padStart(2, '0')}-${String(dateRange.end.day).padStart(2, '0')}`
      
      // Importar el action dinámicamente para evitar problemas de SSR
      const { getFinancialReport } = await import('@/actions/reportes/reporte-financiero')
      
      const response = await getFinancialReport({ startDate, endDate })
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Error al cargar los datos')
      }
      
      setData(response.data)
    } catch (error) {
      console.error('Error cargando datos financieros:', error)
      // TODO: Mostrar toast de error aquí
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFinancialData()
  }, [])

  // Configuración del gráfico de Ingresos vs Gastos (Líneas)
  const getIngresosGastosChartOptions = (): EChartsOption => {
    if (!data) return {}
    
    return {
      title: {
        text: 'Ingresos vs Gastos Diarios',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          let result = `<strong>${params[0].axisValue}</strong><br/>`
          params.forEach((item: any) => {
            result += `${item.marker} ${item.seriesName}: <strong>Bs. ${item.value.toFixed(2)}</strong><br/>`
          })
          return result
        }
      },
      legend: {
        data: ['Ingresos', 'Gastos'],
        top: 35
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.ingresosPorDia.map(d => d.fecha),
        axisLabel: {
          rotate: 45,
          formatter: (value: string) => {
            const date = new Date(value)
            return `${date.getDate()}/${date.getMonth() + 1}`
          }
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: 'Bs. {value}'
        }
      },
      series: [
        {
          name: 'Ingresos',
          type: 'line',
          data: data.ingresosPorDia.map(d => d.monto),
          smooth: true,
          itemStyle: { color: '#10b981' },
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.4)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }
              ]
            }
          }
        },
        {
          name: 'Gastos',
          type: 'line',
          data: data.gastosPorDia.map(d => d.monto),
          smooth: true,
          itemStyle: { color: '#ef4444' },
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(239, 68, 68, 0.4)' },
                { offset: 1, color: 'rgba(239, 68, 68, 0.05)' }
              ]
            }
          }
        }
      ]
    }
  }

  // Configuración del gráfico de Ventas por Categoría
  const getVentasCategoriaChartOptions = (): EChartsOption => {
    if (!data) return {}
    
    return {
      title: {
        text: 'Ventas por Categoría',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const item = data.ventasPorCategoria[params.dataIndex]
          return `<strong>${params.name}</strong><br/>
                  Monto: <strong>Bs. ${params.value.toFixed(2)}</strong><br/>
                  Cantidad: <strong>${item.cantidad} unidades</strong><br/>
                  Porcentaje: <strong>${params.percent}%</strong>`
        }
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 50
      },
      series: [
        {
          name: 'Categoría',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['60%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: '{b}: {d}%',
            fontSize: 12
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold'
            }
          },
          data: data.ventasPorCategoria.map(v => ({
            value: v.total,
            name: v.categoria
          }))
        }
      ]
    }
  }

  // Configuración del gráfico de Top Productos
  const getTopProductosChartOptions = (): EChartsOption => {
    if (!data) return {}
    
    return {
      title: {
        text: 'Top 5 Productos Más Vendidos',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = data.topProductosVendidos[params[0].dataIndex]
          return `<strong>${item.producto}</strong><br/>
                  Cantidad vendida: <strong>${item.cantidad} unidades</strong><br/>
                  Ingresos: <strong>Bs. ${item.ingresos.toFixed(2)}</strong>`
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
          formatter: 'Bs. {value}'
        }
      },
      yAxis: {
        type: 'category',
        data: data.topProductosVendidos.map(p => p.producto),
        axisLabel: {
          interval: 0,
          fontSize: 11
        }
      },
      series: [
        {
          name: 'Ingresos',
          type: 'bar',
          data: data.topProductosVendidos.map(p => p.ingresos),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: '#3b82f6' },
                { offset: 1, color: '#8b5cf6' }
              ]
            },
            borderRadius: [0, 5, 5, 0]
          },
          label: {
            show: true,
            position: 'right',
            formatter: 'Bs. {c}',
            fontSize: 11
          }
        }
      ]
    }
  }

  // Configuración del gráfico de Gastos por Proveedor
  const getGastosProveedorChartOptions = (): EChartsOption => {
    if (!data) return {}
    
    return {
      title: {
        text: 'Distribución de Gastos por Proveedor',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const item = data.gastosPorProveedor[params.dataIndex]
          return `<strong>${params.name}</strong><br/>
                  Monto: <strong>Bs. ${params.value.toFixed(2)}</strong><br/>
                  Porcentaje: <strong>${params.percent}%</strong>`
        }
      },
      legend: {
        orient: 'horizontal',
        bottom: 10,
        left: 'center'
      },
      series: [
        {
          name: 'Proveedor',
          type: 'pie',
          radius: '65%',
          center: ['50%', '45%'],
          data: data.gastosPorProveedor.map(g => ({
            value: g.total,
            name: g.proveedor
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          label: {
            fontSize: 12,
            formatter: '{b}: {d}%'
          }
        }
      ]
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" label="Cargando datos financieros..." />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Estado Financiero</h1>
        <p className="text-gray-600">Análisis de ingresos, gastos y utilidades del micromercado</p>
      </div>

      {/* Filtro de fechas */}
      <Card className="mb-6 shadow-md">
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <DateRangePicker
                label="Rango de fechas"
                value={dateRange}
                onChange={handleDateRangeChange}
                className="max-w-md"
              />
            </div>
            <Button 
              color="primary" 
              onPress={loadFinancialData}
              isLoading={loading}
              startContent={!loading && <Icon icon="material-symbols:search" />}
            >
              Generar Reporte
            </Button>
            <Button 
              color="default" 
              variant="flat"
              startContent={<Icon icon="material-symbols:download" />}
              isDisabled={!data}
            >
              Exportar PDF
            </Button>
          </div>
        </CardBody>
      </Card>

      {data && (
        <>
          {/* Cards de resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Ingresos */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500 shadow-md">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">Total Ingresos</p>
                    <p className="text-2xl font-bold text-green-700">
                      Bs. {data.totalIngresos.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Ventas realizadas</p>
                  </div>
                  <div className="bg-green-500 p-3 rounded-full">
                    <Icon icon="mdi:cash-plus" className="text-2xl text-white" />
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Total Gastos */}
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500 shadow-md">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">Total Gastos</p>
                    <p className="text-2xl font-bold text-red-700">
                      Bs. {data.totalGastos.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Compras a proveedores</p>
                  </div>
                  <div className="bg-red-500 p-3 rounded-full">
                    <Icon icon="mdi:cash-minus" className="text-2xl text-white" />
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Utilidad Neta */}
            <Card className={`bg-gradient-to-br ${data.utilidadNeta >= 0 ? 'from-blue-50 to-blue-100 border-blue-500' : 'from-orange-50 to-orange-100 border-orange-500'} border-l-4 shadow-md`}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">
                      {data.utilidadNeta >= 0 ? 'Utilidad Neta' : 'Pérdida Neta'}
                    </p>
                    <p className={`text-2xl font-bold ${data.utilidadNeta >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                      Bs. {Math.abs(data.utilidadNeta).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {data.utilidadNeta >= 0 ? 'Ganancia' : 'Pérdida'} del periodo
                    </p>
                  </div>
                  <div className={`${data.utilidadNeta >= 0 ? 'bg-blue-500' : 'bg-orange-500'} p-3 rounded-full`}>
                    <Icon 
                      icon={data.utilidadNeta >= 0 ? "mdi:trending-up" : "mdi:trending-down"} 
                      className="text-2xl text-white" 
                    />
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Margen de Utilidad */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500 shadow-md">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">Margen de Utilidad</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {data.margenUtilidad.toFixed(2)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {data.margenUtilidad >= 20 ? 'Excelente' : data.margenUtilidad >= 10 ? 'Bueno' : 'Mejorable'}
                    </p>
                  </div>
                  <div className="bg-purple-500 p-3 rounded-full">
                    <Icon icon="mdi:chart-line" className="text-2xl text-white" />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Gráficos principales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Ingresos vs Gastos */}
            <Card className="shadow-md">
              <CardBody className="p-4">
                <BaseChart 
                  option={getIngresosGastosChartOptions()} 
                  height="400px"
                  loading={loading}
                />
              </CardBody>
            </Card>

            {/* Ventas por Categoría */}
            <Card className="shadow-md">
              <CardBody className="p-4">
                <BaseChart 
                  option={getVentasCategoriaChartOptions()} 
                  height="400px"
                  loading={loading}
                />
              </CardBody>
            </Card>
          </div>

          {/* Gráficos secundarios */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Productos */}
            <Card className="shadow-md">
              <CardBody className="p-4">
                <BaseChart 
                  option={getTopProductosChartOptions()} 
                  height="350px"
                  loading={loading}
                />
              </CardBody>
            </Card>

            {/* Gastos por Proveedor */}
            <Card className="shadow-md">
              <CardBody className="p-4">
                <BaseChart 
                  option={getGastosProveedorChartOptions()} 
                  height="350px"
                  loading={loading}
                />
              </CardBody>
            </Card>
          </div>

          {/* Resumen detallado */}
          <Card className="mt-6 shadow-md">
            <CardBody>
              <h3 className="text-lg font-bold mb-4 text-gray-800">Resumen del Periodo</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Estado General</p>
                  <p className={`text-lg font-bold ${data.utilidadNeta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.utilidadNeta >= 0 ? '✓ En Ganancia' : '✗ En Pérdida'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Compras a Proveedores</p>
                  <p className="text-lg font-bold text-gray-800">
                    Bs. {data.detalleGastos.comprasProveedor.toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Productos Vendidos</p>
                  <p className="text-lg font-bold text-gray-800">
                    {data.ventasPorCategoria.reduce((sum, v) => sum + v.cantidad, 0)} unidades
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}