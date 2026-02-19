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
type ProductData = {
  productoID: number
  producto: string
  categoria: string
  unidadBase: string
  unidadesVendidas: number
  numeroVentas: number
  totalIngresos: number
  precioPromedio: number
  stockActual: number
  rotacion: number
}

type ProductSalesData = {
  productos: ProductData[]
  topProductos: ProductData[]
  productosLentos: ProductData[]
  productosSinVentas: ProductData[]
  productosEstrella: ProductData[]
  categorias: Array<{
    categoria: string
    unidadesVendidas: number
    totalIngresos: number
    numeroProductos: number
  }>
  estadisticas: {
    totalProductos: number
    totalUnidadesVendidas: number
    totalIngresos: number
    productosActivos: number
    productosInactivos: number
    promedioVentasPorProducto: number
  }
  periodo: {
    inicio: string
    fin: string
  }
}

export default function ProductSalesReport() {
  const [dateRange, setDateRange] = useState({
    start: parseDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
    end: parseDate(new Date().toISOString().split('T')[0])
  })
  
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ProductSalesData | null>(null)
  const [selectedTab, setSelectedTab] = useState<'top' | 'lentos' | 'sin-ventas' | 'estrella'>('top')

  const loadData = async () => {
    setLoading(true)
    try {
      const startDate = `${dateRange.start.year}-${String(dateRange.start.month).padStart(2, '0')}-${String(dateRange.start.day).padStart(2, '0')}`
      const endDate = `${dateRange.end.year}-${String(dateRange.end.month).padStart(2, '0')}-${String(dateRange.end.day).padStart(2, '0')}`
      
      const { getProductSales } = await import('@/actions/reportes/reporte-ventas-por-producto')
      const response = await getProductSales({ startDate, endDate })
      
      if (response.success && response.data) {
        setData(response.data)
      }
      
    } catch (error) {
      console.error('Error cargando ventas por producto:', error)
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
  const getRotacionColor = (rotacion: number) => {
    if (rotacion >= 5) return 'success'
    if (rotacion >= 2) return 'primary'
    if (rotacion >= 1) return 'warning'
    return 'danger'
  }

  const getRotacionLabel = (rotacion: number) => {
    if (rotacion >= 5) return 'Muy Alta'
    if (rotacion >= 2) return 'Alta'
    if (rotacion >= 1) return 'Media'
    if (rotacion > 0) return 'Baja'
    return 'Sin ventas'
  }

  // ============================================
  // GRÁFICOS
  // ============================================

  const getTopProductosChartOptions = (): EChartsOption => {
    if (!data) return {}
    
    return {
      title: {
        text: 'Top 20 Productos Más Vendidos',
        left: 'center',
        textStyle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = data.topProductos[params[0].dataIndex]
          return `<strong>${item.producto}</strong><br/>
                  Unidades vendidas: <strong>${item.unidadesVendidas.toFixed(0)}</strong><br/>
                  Ingresos: <strong>Bs. ${item.totalIngresos.toFixed(2)}</strong><br/>
                  Stock actual: <strong>${item.stockActual.toFixed(0)}</strong>`
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
          formatter: (value: number) => `${value.toFixed(0)}`
        }
      },
      yAxis: {
        type: 'category',
        data: data.topProductos.map(p => p.producto.length > 25 ? p.producto.substring(0, 25) + '...' : p.producto),
        axisLabel: {
          interval: 0,
          fontSize: 10
        }
      },
      series: [
        {
          name: 'Unidades Vendidas',
          type: 'bar',
          data: data.topProductos.map(p => p.unidadesVendidas.toFixed(0)),
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
            formatter: (params: any) => `${Number(params.value).toFixed(0)}`,
            fontSize: 10
          }
        }
      ]
    }
  }

  const getCategoriasChartOptions = (): EChartsOption => {
    if (!data) return {}
    
    return {
      title: {
        text: 'Ventas por Categoría',
        left: 'center',
        textStyle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const item = data.categorias[params.dataIndex]
          return `<strong>${item.categoria}</strong><br/>
                  Unidades: <strong>${item.unidadesVendidas.toFixed(0)}</strong><br/>
                  Ingresos: <strong>Bs. ${item.totalIngresos.toFixed(2)}</strong><br/>
                  Productos: <strong>${item.numeroProductos}</strong>`
        }
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 50
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['60%', '50%'],
          data: data.categorias.map((c, idx) => ({
            value: c.unidadesVendidas,
            name: c.categoria,
            itemStyle: {
              color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][idx % 6]
            }
          })),
          label: {
            formatter: '{b}: {c}',
            fontSize: 12
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    }
  }

  const getRotacionChartOptions = (): EChartsOption => {
    if (!data) return {}
    
    const topRotacion = [...data.productos]
      .filter(p => p.rotacion > 0 && p.rotacion < 999)
      .sort((a, b) => b.rotacion - a.rotacion)
      .slice(0, 15)
    
    return {
      title: {
        text: 'Productos con Mayor Rotación',
        left: 'center',
        textStyle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = topRotacion[params[0].dataIndex]
          return `<strong>${item.producto}</strong><br/>
                  Rotación: <strong>${item.rotacion.toFixed(2)}x</strong><br/>
                  Vendidas: <strong>${item.unidadesVendidas.toFixed(0)}</strong><br/>
                  Stock: <strong>${item.stockActual.toFixed(0)}</strong>`
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
          formatter: (value: number) => `${value.toFixed(1)}x`
        }
      },
      yAxis: {
        type: 'category',
        data: topRotacion.map(p => p.producto.length > 25 ? p.producto.substring(0, 25) + '...' : p.producto),
        axisLabel: {
          interval: 0,
          fontSize: 10
        }
      },
      series: [
        {
          name: 'Rotación',
          type: 'bar',
          data: topRotacion.map(p => p.rotacion.toFixed(2)),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: '#3b82f6' },
                { offset: 1, color: '#2563eb' }
              ]
            },
            borderRadius: [0, 5, 5, 0]
          },
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => `${Number(params.value).toFixed(1)}x`,
            fontSize: 10
          }
        }
      ]
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" label="Analizando ventas por producto..." />
      </div>
    )
  }

  if (!data) return null

  const getCurrentTabData = () => {
    switch (selectedTab) {
      case 'top': return data.topProductos
      case 'lentos': return data.productosLentos
      case 'sin-ventas': return data.productosSinVentas
      case 'estrella': return data.productosEstrella
      default: return data.topProductos
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
          <Icon icon="mdi:package-variant" className="text-blue-600" />
          Ventas por Producto
        </h1>
        <p className="text-gray-600">Identifique productos estrella y productos lentos para optimizar su inventario</p>
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

      {/* Cards de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500 shadow-md">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Total Productos</p>
                <p className="text-3xl font-bold text-blue-700">
                  {data.estadisticas.totalProductos}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.estadisticas.productosActivos} activos
                </p>
              </div>
              <div className="bg-blue-500 p-3 rounded-full">
                <Icon icon="mdi:package-variant" className="text-2xl text-white" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500 shadow-md">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Unidades Vendidas</p>
                <p className="text-3xl font-bold text-green-700">
                  {data.estadisticas.totalUnidadesVendidas.toFixed(0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Promedio: {data.estadisticas.promedioVentasPorProducto.toFixed(1)}/producto
                </p>
              </div>
              <div className="bg-green-500 p-3 rounded-full">
                <Icon icon="mdi:chart-line" className="text-2xl text-white" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500 shadow-md">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Ingresos Totales</p>
                <p className="text-2xl font-bold text-purple-700">
                  Bs. {data.estadisticas.totalIngresos.toFixed(2)}
                </p>
              </div>
              <div className="bg-purple-500 p-3 rounded-full">
                <Icon icon="mdi:cash-multiple" className="text-2xl text-white" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500 shadow-md">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Productos Inactivos</p>
                <p className="text-3xl font-bold text-orange-700">
                  {data.estadisticas.productosInactivos}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Sin ventas en período
                </p>
              </div>
              <div className="bg-orange-500 p-3 rounded-full">
                <Icon icon="mdi:alert-circle-outline" className="text-2xl text-white" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="shadow-md">
          <CardBody className="p-4">
            <BaseChart 
              option={getTopProductosChartOptions()} 
              height="500px"
              loading={loading}
            />
          </CardBody>
        </Card>

        <Card className="shadow-md">
          <CardBody className="p-4">
            <BaseChart 
              option={getCategoriasChartOptions()} 
              height="500px"
              loading={loading}
            />
          </CardBody>
        </Card>
      </div>

      {/* Gráfico de rotación */}
      <Card className="shadow-md mb-6">
        <CardBody className="p-4">
          <BaseChart 
            option={getRotacionChartOptions()} 
            height="450px"
            loading={loading}
          />
        </CardBody>
      </Card>

      {/* Tabs y tabla */}
      <Card className="shadow-md mb-6">
        <CardBody>
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              color={selectedTab === 'top' ? 'primary' : 'default'}
              variant={selectedTab === 'top' ? 'solid' : 'flat'}
              onPress={() => setSelectedTab('top')}
              startContent={<Icon icon="mdi:trophy-variant" />}
            >
              Top Productos ({data.topProductos.length})
            </Button>
            <Button
              color={selectedTab === 'estrella' ? 'success' : 'default'}
              variant={selectedTab === 'estrella' ? 'solid' : 'flat'}
              onPress={() => setSelectedTab('estrella')}
              startContent={<Icon icon="mdi:star" />}
            >
              Estrella ({data.productosEstrella.length})
            </Button>
            <Button
              color={selectedTab === 'lentos' ? 'warning' : 'default'}
              variant={selectedTab === 'lentos' ? 'solid' : 'flat'}
              onPress={() => setSelectedTab('lentos')}
              startContent={<Icon icon="mdi:speedometer-slow" />}
            >
              Lentos ({data.productosLentos.length})
            </Button>
            <Button
              color={selectedTab === 'sin-ventas' ? 'danger' : 'default'}
              variant={selectedTab === 'sin-ventas' ? 'solid' : 'flat'}
              onPress={() => setSelectedTab('sin-ventas')}
              startContent={<Icon icon="mdi:alert-circle" />}
            >
              Sin Ventas ({data.productosSinVentas.length})
            </Button>
          </div>

          <Table aria-label="Tabla de productos">
            <TableHeader>
              <TableColumn>PRODUCTO</TableColumn>
              <TableColumn>CATEGORÍA</TableColumn>
              <TableColumn align="center">UNIDADES VENDIDAS</TableColumn>
              <TableColumn align="center">INGRESOS</TableColumn>
              <TableColumn align="center">STOCK ACTUAL</TableColumn>
              <TableColumn align="center">ROTACIÓN</TableColumn>
            </TableHeader>
            <TableBody>
              {getCurrentTabData().map((producto) => (
                <TableRow key={producto.productoID}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold">{producto.producto}</span>
                      <span className="text-xs text-gray-500">{producto.unidadBase}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat" color="primary">
                      {producto.categoria}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="text-center font-semibold">
                      {producto.unidadesVendidas.toFixed(0)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-center font-semibold text-green-600">
                      Bs. {producto.totalIngresos.toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-center">
                      {producto.stockActual.toFixed(0)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <Chip
                        size="sm"
                        color={getRotacionColor(producto.rotacion)}
                        variant="flat"
                      >
                        {producto.rotacion >= 999 ? 'Agotado' : `${producto.rotacion.toFixed(1)}x`}
                      </Chip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      {/* Recomendaciones */}
      <Card className="shadow-md bg-blue-50">
        <CardBody>
          <h3 className="text-lg font-bold mb-3 text-blue-900 flex items-center gap-2">
            <Icon icon="mdi:lightbulb-on-outline" className="text-2xl text-blue-600" />
            Recomendaciones de Inventario
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Icon icon="mdi:star" className="text-xl text-green-600" />
                <p className="text-sm font-semibold text-gray-700">Productos Estrella</p>
              </div>
              <p className="text-xs text-gray-600">
                Siempre mantenga stock alto de estos productos. Son su fuente principal de ingresos.
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Icon icon="mdi:speedometer-slow" className="text-xl text-orange-600" />
                <p className="text-sm font-semibold text-gray-700">Productos Lentos</p>
              </div>
              <p className="text-xs text-gray-600">
                Considere hacer promociones o combos para acelerar la rotación de estos productos.
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Icon icon="mdi:alert-circle" className="text-xl text-red-600" />
                <p className="text-sm font-semibold text-gray-700">Sin Ventas</p>
              </div>
              <p className="text-xs text-gray-600">
                Evalúe si vale la pena mantener estos productos o reemplazarlos por otros más demandados.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}