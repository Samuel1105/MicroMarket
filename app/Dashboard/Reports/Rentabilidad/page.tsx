"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardBody, DateRangePicker, Button, Spinner, Chip, Tabs, Tab, Progress } from '@heroui/react'
import { Icon } from '@iconify/react'
import { parseDate } from '@internationalized/date'

import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/dashboard/BaseChart'

// ============================================
// TYPES - Análisis de Margen
// ============================================
type ProductData = {
  id: number
  nombre: string
  categoria: string
  cantidadVendida: number
  ingresosVentas: number
  costoCompras: number
  utilidadBruta: number
  margenUtilidad: number
  precioVentaPromedio: number
  costoPromedio: number
  rotacion: number
}

type ProfitabilityData = {
  productos: ProductData[]
  topRentables: ProductData[]
  menosRentables: ProductData[]
  estadisticas: {
    totalProductos: number
    productosRentables: number
    productosNoRentables: number
    utilidadTotalProductos: number
    margenPromedioGeneral: number
  }
  ventasPorCategoria: Array<{
    categoria: string
    utilidad: number
    margen: number
    cantidadProductos: number
  }>
  comparacionCostoVenta: Array<{
    producto: string
    costoUnitario: number
    precioVenta: number
    margen: number
  }>
}

// ============================================
// TYPES - Análisis de Recuperación
// ============================================
type LoteAnalysis = {
  loteID: number
  numeroLote: string
  producto: string
  categoria: string
  proveedor: string
  fechaCompra: Date
  fechaVencimiento: Date | null
  inversionTotal: number
  cantidadComprada: number
  costoUnitario: number
  unidadesVendidas: number
  ingresosObtenidos: number
  costoVendido: number
  utilidadAcumulada: number
  unidadesRestantes: number
  valorInventarioRestante: number
  porcentajeVendido: number
  porcentajeRecuperacion: number
  estadoRecuperacion: 'critico' | 'bajo' | 'medio' | 'bueno' | 'recuperado'
  faltaVender: number
  unidadesNecesariasParaRecuperar: number
}

type InvestmentRecoveryData = {
  lotes: LoteAnalysis[]
  estadisticas: {
    totalInvertido: number
    totalRecuperado: number
    totalUtilidad: number
    totalInventarioRestante: number
    porcentajeRecuperacionGlobal: number
    dineroEnRiesgo: number
    lotesCriticos: number
    lotesBajos: number
    lotesMedios: number
    lotesBuenos: number
    lotesRecuperados: number
    totalLotes: number
  }
  productosMayorInversion: Array<{
    producto: string
    categoria: string
    totalInvertido: number
    totalRecuperado: number
    totalUtilidad: number
    unidadesPendientes: number
    valorInventarioRestante: number
    numeroLotes: number
    porcentajeRecuperacion: number
  }>
  analisisPorProducto: Array<{
    producto: string
    categoria: string
    unidadesCompradas: number
    unidadesVendidas: number
    costoTotal: number
    ingresosTotal: number
    utilidadTotal: number
    margenUtilidad: number
    porcentajeVendido: number
  }>
}

export default function ProductProfitabilityAnalysis() {
  const [dateRange, setDateRange] = useState({
    start: parseDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
    end: parseDate(new Date().toISOString().split('T')[0])
  })
  
  const [loading, setLoading] = useState(false)
  const [profitabilityData, setProfitabilityData] = useState<ProfitabilityData | null>(null)
  const [investmentData, setInvestmentData] = useState<InvestmentRecoveryData | null>(null)
  const [selectedTab, setSelectedTab] = useState<string>("margen")

  const loadAllData = async () => {
    setLoading(true)
    try {
      const startDate = `${dateRange.start.year}-${String(dateRange.start.month).padStart(2, '0')}-${String(dateRange.start.day).padStart(2, '0')}`
      const endDate = `${dateRange.end.year}-${String(dateRange.end.month).padStart(2, '0')}-${String(dateRange.end.day).padStart(2, '0')}`
      
      // Cargar análisis de margen
      const { getProductProfitability } = await import('@/actions/reportes/reporte-rentabilidad')
      const profitResponse = await getProductProfitability({ startDate, endDate })
      
      if (profitResponse.success && profitResponse.data) {
        setProfitabilityData(profitResponse.data)
      }

      // Cargar análisis de recuperación
      const { getInvestmentRecovery } = await import('@/actions/reportes/reporte-recuperacion-inversion')
      const investResponse = await getInvestmentRecovery({ startDate, endDate })
      
      if (investResponse.success && investResponse.data) {
        setInvestmentData(investResponse.data)
      }
      
    } catch (error) {
      console.error('Error cargando análisis:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  // ============================================
  // HELPERS
  // ============================================
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'critico': return 'danger'
      case 'bajo': return 'warning'
      case 'medio': return 'primary'
      case 'bueno': return 'success'
      case 'recuperado': return 'success'
      default: return 'default'
    }
  }

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'critico': return '🔴 Crítico (<10%)'
      case 'bajo': return '🟡 Bajo (10-25%)'
      case 'medio': return '🔵 Medio (25-50%)'
      case 'bueno': return '🟢 Bueno (>50%)'
      case 'recuperado': return '✅ Recuperado'
      default: return estado
    }
  }

  // ============================================
  // GRÁFICOS - TAB 1: ANÁLISIS DE MARGEN
  // ============================================
  
  const getTopRentablesChartOptions = (): EChartsOption => {
    if (!profitabilityData) return {}
    
    return {
      title: {
        text: 'Top 10 Productos Más Rentables',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = profitabilityData.topRentables[params[0].dataIndex]
          return `<strong>${item.nombre}</strong><br/>
                  Utilidad: <strong>Bs. ${item.utilidadBruta.toFixed(2)}</strong><br/>
                  Margen: <strong>${item.margenUtilidad.toFixed(2)}%</strong><br/>
                  Vendidos: <strong>${item.cantidadVendida.toFixed(0)} unidades</strong><br/>
                  Costo promedio: <strong>Bs. ${item.costoPromedio.toFixed(2)}</strong><br/>
                  Precio venta: <strong>Bs. ${item.precioVentaPromedio.toFixed(2)}</strong>`
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
        data: profitabilityData.topRentables.map(p => p.nombre.length > 20 ? p.nombre.substring(0, 20) + '...' : p.nombre),
        axisLabel: {
          interval: 0,
          fontSize: 10
        }
      },
      series: [
        {
          name: 'Utilidad Bruta',
          type: 'bar',
          data: profitabilityData.topRentables.map(p => Number(p.utilidadBruta.toFixed(2))),
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

  const getMargenUtilidadChartOptions = (): EChartsOption => {
    if (!profitabilityData) return {}
    
    const top10 = profitabilityData.productos.slice(0, 10)
    
    return {
      title: {
        text: 'Margen de Utilidad - Top 10 Productos',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = top10[params[0].dataIndex]
          return `<strong>${item.nombre}</strong><br/>
                  Margen: <strong>${item.margenUtilidad.toFixed(2)}%</strong><br/>
                  Utilidad: <strong>Bs. ${item.utilidadBruta.toFixed(2)}</strong><br/>
                  Costo unitario: <strong>Bs. ${item.costoPromedio.toFixed(2)}</strong><br/>
                  Precio venta: <strong>Bs. ${item.precioVentaPromedio.toFixed(2)}</strong>`
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
        data: top10.map(p => p.nombre.length > 15 ? p.nombre.substring(0, 15) + '...' : p.nombre),
        axisLabel: {
          rotate: 45,
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => `${value.toFixed(0)}%`
        }
      },
      series: [
        {
          name: 'Margen %',
          type: 'bar',
          data: top10.map(p => Number(p.margenUtilidad.toFixed(2))),
          itemStyle: {
            color: (params: any) => {
              const value = params.value
              if (value >= 30) return '#10b981'
              if (value >= 15) return '#3b82f6'
              if (value >= 5) return '#f59e0b'
              return '#ef4444'
            },
            borderRadius: [5, 5, 0, 0]
          },
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => `${Number(params.value).toFixed(2)}%`,
            fontSize: 10
          }
        }
      ]
    }
  }

  const getRentabilidadCategoriaChartOptions = (): EChartsOption => {
    if (!profitabilityData) return {}
    
    const categoryColors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
      '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
    ]
    
    return {
      title: {
        text: 'Utilidad por Categoría',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const item = profitabilityData.ventasPorCategoria[params.dataIndex]
          return `<strong>${params.name}</strong><br/>
                  Utilidad: <strong>Bs. ${item.utilidad.toFixed(2)}</strong><br/>
                  Margen promedio: <strong>${item.margen.toFixed(2)}%</strong><br/>
                  Productos: <strong>${item.cantidadProductos}</strong>`
        }
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 50
      },
      color: categoryColors,
      series: [
        {
          name: 'Categoría',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['60%', '50%'],
          data: profitabilityData.ventasPorCategoria.map((c, index) => ({
            value: Number(c.utilidad.toFixed(2)),
            name: c.categoria,
            itemStyle: {
              color: categoryColors[index % categoryColors.length]
            }
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          label: {
            formatter: '{b}: {d}%',
            fontSize: 11
          }
        }
      ]
    }
  }

  const getCostoVsPrecioChartOptions = (): EChartsOption => {
    if (!profitabilityData) return {}
    
    return {
      title: {
        text: 'Costo vs Precio de Venta (Top 15)',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = profitabilityData.comparacionCostoVenta[params[0].dataIndex]
          const ganancia = item.precioVenta - item.costoUnitario
          return `<strong>${item.producto}</strong><br/>
                  Costo: <strong>Bs. ${item.costoUnitario.toFixed(2)}</strong><br/>
                  Precio Venta: <strong>Bs. ${item.precioVenta.toFixed(2)}</strong><br/>
                  Ganancia: <strong>Bs. ${ganancia.toFixed(2)}</strong><br/>
                  Margen: <strong>${item.margen.toFixed(2)}%</strong>`
        }
      },
      legend: {
        data: ['Costo Unitario', 'Precio Venta'],
        top: 35
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: profitabilityData.comparacionCostoVenta.map(p => p.producto.length > 15 ? p.producto.substring(0, 15) + '...' : p.producto),
        axisLabel: {
          rotate: 45,
          fontSize: 9
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
          name: 'Costo Unitario',
          type: 'bar',
          data: profitabilityData.comparacionCostoVenta.map(p => Number(p.costoUnitario.toFixed(2))),
          itemStyle: {
            color: '#ef4444'
          }
        },
        {
          name: 'Precio Venta',
          type: 'bar',
          data: profitabilityData.comparacionCostoVenta.map(p => Number(p.precioVenta.toFixed(2))),
          itemStyle: {
            color: '#10b981'
          }
        }
      ]
    }
  }

  // ============================================
  // GRÁFICOS - TAB 2: ANÁLISIS DE RECUPERACIÓN
  // ============================================

  const getDistribucionLotesOptions = (): EChartsOption => {
    if (!investmentData) return {}

    return {
      title: {
        text: 'Distribución de Lotes por Estado de Recuperación',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => `${params.name}: <strong>${params.value} lotes</strong> (${params.percent.toFixed(2)}%)`
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 50
      },
      color: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#22c55e'],
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['60%', '50%'],
          data: [
            { value: investmentData.estadisticas.lotesCriticos, name: 'Crítico (<10%)', itemStyle: { color: '#ef4444' } },
            { value: investmentData.estadisticas.lotesBajos, name: 'Bajo (10-25%)', itemStyle: { color: '#f59e0b' } },
            { value: investmentData.estadisticas.lotesMedios, name: 'Medio (25-50%)', itemStyle: { color: '#3b82f6' } },
            { value: investmentData.estadisticas.lotesBuenos, name: 'Bueno (>50%)', itemStyle: { color: '#10b981' } },
            { value: investmentData.estadisticas.lotesRecuperados, name: 'Recuperado (100%)', itemStyle: { color: '#22c55e' } }
          ],
          label: {
            formatter: '{b}: {c}',
            fontSize: 11
          }
        }
      ]
    }
  }

  const getProductosMayorInversionOptions = (): EChartsOption => {
    if (!investmentData) return {}

    return {
      title: {
        text: 'Productos con Mayor Dinero en Inventario',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = investmentData.productosMayorInversion[params[0].dataIndex]
          return `<strong>${item.producto}</strong><br/>
                  Invertido: <strong>Bs. ${item.totalInvertido.toFixed(2)}</strong><br/>
                  Recuperado: <strong>Bs. ${item.totalRecuperado.toFixed(2)}</strong><br/>
                  En inventario: <strong>Bs. ${item.valorInventarioRestante.toFixed(2)}</strong><br/>
                  Recuperación: <strong>${item.porcentajeRecuperacion.toFixed(2)}%</strong>`
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
        data: investmentData.productosMayorInversion.map(p => p.producto.length > 20 ? p.producto.substring(0, 20) + '...' : p.producto),
        axisLabel: {
          interval: 0,
          fontSize: 10
        }
      },
      series: [
        {
          name: 'Valor en Inventario',
          type: 'bar',
          data: investmentData.productosMayorInversion.map(p => Number(p.valorInventarioRestante.toFixed(2))),
          itemStyle: {
            color: (params: any) => {
              const producto = investmentData.productosMayorInversion[params.dataIndex]
              if (producto.porcentajeRecuperacion >= 75) return '#10b981'
              if (producto.porcentajeRecuperacion >= 50) return '#3b82f6'
              if (producto.porcentajeRecuperacion >= 25) return '#f59e0b'
              return '#ef4444'
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
        <Spinner size="lg" label="Cargando análisis de rentabilidad..." />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Análisis de Rentabilidad por Producto</h1>
        <p className="text-gray-600">Análisis completo de margen de utilidad y recuperación de capital invertido</p>
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
              onPress={loadAllData}
              isLoading={loading}
              startContent={!loading && <Icon icon="material-symbols:search" />}
            >
              Generar Análisis
            </Button>
            <Button 
              color="default" 
              variant="flat"
              startContent={<Icon icon="material-symbols:download" />}
              isDisabled={!profitabilityData && !investmentData}
            >
              Exportar PDF
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      <Tabs 
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(key as string)}
        aria-label="Análisis de rentabilidad"
        color="primary"
        variant="underlined"
        classNames={{
          tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
          cursor: "w-full bg-primary",
          tab: "max-w-fit px-4 h-12",
          tabContent: "group-data-[selected=true]:text-primary"
        }}
      >
        {/* TAB 1: Análisis de Margen y Rentabilidad */}
        <Tab
          key="margen"
          title={
            <div className="flex items-center gap-2">
              <Icon icon="mdi:cash-multiple" className="text-lg" />
              <span>Análisis de Margen y Rentabilidad</span>
            </div>
          }
        >
          {profitabilityData && (
            <>
              {/* Cards de estadísticas - Margen */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 mt-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500 shadow-md">
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600 font-medium mb-1">Total Productos</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {profitabilityData.estadisticas.totalProductos}
                        </p>
                      </div>
                      <div className="bg-blue-500 p-2 rounded-full">
                        <Icon icon="mdi:package-variant" className="text-xl text-white" />
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500 shadow-md">
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600 font-medium mb-1">Rentables</p>
                        <p className="text-2xl font-bold text-green-700">
                          {profitabilityData.estadisticas.productosRentables}
                        </p>
                      </div>
                      <div className="bg-green-500 p-2 rounded-full">
                        <Icon icon="mdi:trending-up" className="text-xl text-white" />
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500 shadow-md">
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600 font-medium mb-1">No Rentables</p>
                        <p className="text-2xl font-bold text-red-700">
                          {profitabilityData.estadisticas.productosNoRentables}
                        </p>
                      </div>
                      <div className="bg-red-500 p-2 rounded-full">
                        <Icon icon="mdi:trending-down" className="text-xl text-white" />
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500 shadow-md">
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600 font-medium mb-1">Utilidad Total</p>
                        <p className="text-xl font-bold text-purple-700">
                          Bs. {profitabilityData.estadisticas.utilidadTotalProductos.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-purple-500 p-2 rounded-full">
                        <Icon icon="mdi:cash-multiple" className="text-xl text-white" />
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500 shadow-md">
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600 font-medium mb-1">Margen Promedio</p>
                        <p className="text-2xl font-bold text-orange-700">
                          {profitabilityData.estadisticas.margenPromedioGeneral.toFixed(2)}%
                        </p>
                      </div>
                      <div className="bg-orange-500 p-2 rounded-full">
                        <Icon icon="mdi:percent" className="text-xl text-white" />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Gráficos principales - Margen */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card className="shadow-md">
                  <CardBody className="p-4">
                    <BaseChart 
                      option={getTopRentablesChartOptions()} 
                      height="450px"
                      loading={loading}
                    />
                  </CardBody>
                </Card>

                <Card className="shadow-md">
                  <CardBody className="p-4">
                    <BaseChart 
                      option={getMargenUtilidadChartOptions()} 
                      height="450px"
                      loading={loading}
                    />
                  </CardBody>
                </Card>
              </div>

              {/* Gráficos secundarios - Margen */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card className="shadow-md">
                  <CardBody className="p-4">
                    <BaseChart 
                      option={getRentabilidadCategoriaChartOptions()} 
                      height="400px"
                      loading={loading}
                    />
                  </CardBody>
                </Card>

                <Card className="shadow-md">
                  <CardBody className="p-4">
                    <BaseChart 
                      option={getCostoVsPrecioChartOptions()} 
                      height="400px"
                      loading={loading}
                    />
                  </CardBody>
                </Card>
              </div>

              {/* Tabla de productos menos rentables */}
              <Card className="shadow-md mb-6">
                <CardBody>
                  <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                    <Icon icon="mdi:alert-circle" className="text-red-500" />
                    Productos Menos Rentables - Requieren Atención
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vendidos</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Unit.</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Venta</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ganancia Unit.</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Utilidad Total</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {profitabilityData.menosRentables.map((producto) => {
                          const gananciaUnitaria = producto.precioVentaPromedio - producto.costoPromedio
                          return (
                            <tr key={producto.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{producto.nombre}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{producto.categoria}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-600">{producto.cantidadVendida.toFixed(0)}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-600">Bs. {producto.costoPromedio.toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-600">Bs. {producto.precioVentaPromedio.toFixed(2)}</td>
                              <td className={`px-4 py-3 text-sm text-right font-semibold ${gananciaUnitaria >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                Bs. {gananciaUnitaria.toFixed(2)}
                              </td>
                              <td className={`px-4 py-3 text-sm text-right font-semibold ${producto.utilidadBruta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                Bs. {producto.utilidadBruta.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right">
                                <Chip 
                                  size="sm"
                                  color={producto.margenUtilidad >= 20 ? 'success' : producto.margenUtilidad >= 10 ? 'primary' : producto.margenUtilidad >= 5 ? 'warning' : 'danger'}
                                  variant="flat"
                                >
                                  {producto.margenUtilidad.toFixed(2)}%
                                </Chip>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>

              {/* Recomendaciones - Margen */}
              <Card className="shadow-md bg-blue-50">
                <CardBody>
                  <h3 className="text-lg font-bold mb-3 text-blue-900 flex items-center gap-2">
                    <Icon icon="mdi:lightbulb-on" className="text-blue-600" />
                    Recomendaciones para Mejorar Márgenes
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700 mb-2">🎯 Productos para Impulsar</p>
                      <p className="text-xs text-gray-600">Enfoca promociones en productos con margen &gt; 20% para maximizar ganancias</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700 mb-2">💰 Negociar con Proveedores</p>
                      <p className="text-xs text-gray-600">Productos con margen &lt; 10% necesitan mejor precio de compra o ajuste de precio de venta</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700 mb-2">📊 Revisar Precios</p>
                      <p className="text-xs text-gray-600">Considera ajustar precios en productos con baja ganancia unitaria o eliminarlos del inventario</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </>
          )}
        </Tab>

        {/* TAB 2: Análisis de Recuperación de Capital */}
        <Tab
          key="recuperacion"
          title={
            <div className="flex items-center gap-2">
              <Icon icon="mdi:chart-timeline-variant" className="text-lg" />
              <span>Recuperación de Capital Invertido</span>
            </div>
          }
        >
          {investmentData && (
            <>
              {/* Cards de estadísticas - Recuperación */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 mt-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500 shadow-md">
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600 font-medium mb-1">Total Invertido</p>
                        <p className="text-2xl font-bold text-blue-700">
                          Bs. {investmentData.estadisticas.totalInvertido.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-blue-500 p-2 rounded-full">
                        <Icon icon="mdi:cash-minus" className="text-xl text-white" />
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500 shadow-md">
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600 font-medium mb-1">Total Recuperado</p>
                        <p className="text-2xl font-bold text-green-700">
                          Bs. {investmentData.estadisticas.totalRecuperado.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-green-500 p-2 rounded-full">
                        <Icon icon="mdi:cash-plus" className="text-xl text-white" />
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500 shadow-md">
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600 font-medium mb-1">En Inventario</p>
                        <p className="text-xl font-bold text-orange-700">
                          Bs. {investmentData.estadisticas.totalInventarioRestante.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-orange-500 p-2 rounded-full">
                        <Icon icon="mdi:warehouse" className="text-xl text-white" />
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500 shadow-md">
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600 font-medium mb-1">% Recuperación</p>
                        <p className="text-2xl font-bold text-purple-700">
                          {investmentData.estadisticas.porcentajeRecuperacionGlobal.toFixed(2)}%
                        </p>
                      </div>
                      <div className="bg-purple-500 p-2 rounded-full">
                        <Icon icon="mdi:chart-line" className="text-xl text-white" />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Barra de progreso global */}
              <Card className="mb-6 shadow-md">
                <CardBody>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Progreso de Recuperación Global</h3>
                  <Progress 
                    value={investmentData.estadisticas.porcentajeRecuperacionGlobal}
                    color={
                      investmentData.estadisticas.porcentajeRecuperacionGlobal >= 75 ? 'success' :
                      investmentData.estadisticas.porcentajeRecuperacionGlobal >= 50 ? 'primary' :
                      investmentData.estadisticas.porcentajeRecuperacionGlobal >= 25 ? 'warning' : 'danger'
                    }
                    className="max-w-full"
                    showValueLabel
                    size="lg"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Recuperado: Bs. {investmentData.estadisticas.totalRecuperado.toFixed(2)} de Bs. {investmentData.estadisticas.totalInvertido.toFixed(2)}
                  </p>
                </CardBody>
              </Card>

              {/* Gráficos - Recuperación */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card className="shadow-md">
                  <CardBody className="p-4">
                    <BaseChart 
                      option={getDistribucionLotesOptions()} 
                      height="400px"
                      loading={loading}
                    />
                  </CardBody>
                </Card>

                <Card className="shadow-md">
                  <CardBody className="p-4">
                    <BaseChart 
                      option={getProductosMayorInversionOptions()} 
                      height="400px"
                      loading={loading}
                    />
                  </CardBody>
                </Card>
              </div>

              {/* Tabla de Análisis por Producto - NUEVO */}
              <Card className="shadow-md mb-6">
                <CardBody>
                  <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                    <Icon icon="mdi:chart-box-outline" className="text-blue-500" />
                    Resumen por Producto - Período Seleccionado
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unidades Compradas</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo Total</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unidades Vendidas</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ingresos</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Utilidad</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margen</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Vendido</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {investmentData.analisisPorProducto.map((producto, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{producto.producto}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{producto.categoria}</td>
                            <td className="px-4 py-3 text-sm text-right text-blue-600 font-semibold">
                              {producto.unidadesCompradas.toFixed(0)} un.
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-red-600 font-semibold">
                              Bs. {producto.costoTotal.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-green-600 font-semibold">
                              {producto.unidadesVendidas.toFixed(0)} un.
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-green-600 font-semibold">
                              Bs. {producto.ingresosTotal.toFixed(2)}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right font-bold ${producto.utilidadTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Bs. {producto.utilidadTotal.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <Chip 
                                size="sm"
                                color={
                                  producto.margenUtilidad >= 20 ? 'success' : 
                                  producto.margenUtilidad >= 10 ? 'primary' : 
                                  producto.margenUtilidad >= 5 ? 'warning' : 'danger'
                                }
                                variant="flat"
                              >
                                {producto.margenUtilidad.toFixed(2)}%
                              </Chip>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className={`font-semibold ${
                                  producto.porcentajeVendido >= 75 ? 'text-green-600' :
                                  producto.porcentajeVendido >= 50 ? 'text-blue-600' :
                                  producto.porcentajeVendido >= 25 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {producto.porcentajeVendido.toFixed(1)}%
                                </span>
                                <Progress 
                                  value={producto.porcentajeVendido} 
                                  color={
                                    producto.porcentajeVendido >= 75 ? 'success' :
                                    producto.porcentajeVendido >= 50 ? 'primary' :
                                    producto.porcentajeVendido >= 25 ? 'warning' : 'danger'
                                  }
                                  className="max-w-[100px]"
                                  size="sm"
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Resumen de totales */}
                  <div className="mt-4 pt-4 border-t border-gray-200 bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Total Comprado</p>
                        <p className="text-lg font-bold text-blue-700">
                          Bs. {investmentData.estadisticas.totalInvertido.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Total Vendido</p>
                        <p className="text-lg font-bold text-green-700">
                          Bs. {investmentData.estadisticas.totalRecuperado.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Utilidad del Período</p>
                        <p className={`text-lg font-bold ${investmentData.estadisticas.totalUtilidad >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          Bs. {investmentData.estadisticas.totalUtilidad.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">En Inventario</p>
                        <p className="text-lg font-bold text-orange-700">
                          Bs. {investmentData.estadisticas.totalInventarioRestante.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Tabla de lotes críticos */}
              {investmentData.lotes.filter(l => l.estadoRecuperacion === 'critico' || l.estadoRecuperacion === 'bajo').length > 0 && (
                <Card className="shadow-md mb-6">
                  <CardBody>
                    <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                      <Icon icon="mdi:alert" className="text-red-500" />
                      Lotes que Requieren Atención (Críticos y Bajos)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lote</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Invertido</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Recuperado</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">En Inventario</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vendido</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {investmentData.lotes
                            .filter(lote => lote.estadoRecuperacion === 'critico' || lote.estadoRecuperacion === 'bajo')
                            .map((lote) => (
                              <tr key={lote.loteID} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-600">{lote.numeroLote}</td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{lote.producto}</td>
                                <td className="px-4 py-3 text-sm text-right text-gray-600">Bs. {lote.inversionTotal.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right text-green-600">Bs. {lote.ingresosObtenidos.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right text-orange-600">Bs. {lote.valorInventarioRestante.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <div className="flex flex-col items-end">
                                    <span className="text-gray-600">{lote.unidadesVendidas.toFixed(0)} / {lote.cantidadComprada.toFixed(0)}</span>
                                    <Progress 
                                      value={lote.porcentajeVendido} 
                                      color={getEstadoColor(lote.estadoRecuperacion)}
                                      className="max-w-[80px]"
                                      size="sm"
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <Chip 
                                    size="sm"
                                    color={getEstadoColor(lote.estadoRecuperacion)}
                                    variant="flat"
                                  >
                                    {getEstadoLabel(lote.estadoRecuperacion)}
                                  </Chip>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Recomendaciones - Recuperación */}
              <Card className="shadow-md bg-blue-50">
                <CardBody>
                  <h3 className="text-lg font-bold mb-3 text-blue-900 flex items-center gap-2">
                    <Icon icon="mdi:lightbulb-on" className="text-blue-600" />
                    Recomendaciones para Recuperar Capital
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700 mb-2">🔴 Lotes Críticos</p>
                      <p className="text-xs text-gray-600">
                        {investmentData.estadisticas.lotesCriticos} lotes con menos del 10% vendido. 
                        Considera promociones agresivas o ajustar estrategia de compra.
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700 mb-2">💰 Dinero en Inventario</p>
                      <p className="text-xs text-gray-600">
                        Tienes Bs. {investmentData.estadisticas.dineroEnRiesgo.toFixed(2)} inmovilizados en inventario. 
                        Acelera la rotación para mejorar el flujo de efectivo.
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700 mb-2">📊 Optimiza Compras</p>
                      <p className="text-xs text-gray-600">
                        Revisa los productos con mayor inversión en inventario y ajusta las cantidades de compra futuras.
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </>
          )}
        </Tab>
      </Tabs>
    </div>
  )
}