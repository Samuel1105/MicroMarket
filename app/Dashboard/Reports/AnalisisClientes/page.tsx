"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardBody, DateRangePicker, Button, Spinner, Chip, Progress } from '@heroui/react'
import { Icon } from '@iconify/react'
import { parseDate } from '@internationalized/date'

import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/dashboard/BaseChart'

// ============================================
// TYPES
// ============================================
type CustomerData = {
  clientes: Array<{
    clienteID: number
    nombre: string
    carnet: string
    numeroCompras: number
    totalGastado: number
    ticketPromedio: number
    ultimaCompra: Date
    primeraCompra: Date
    segmento: 'vip' | 'frecuente' | 'ocasional' | 'nuevo'
    valor: 'alto' | 'medio' | 'bajo'
  }>
  topFrecuentes: Array<{
    nombre: string
    numeroCompras: number
    totalGastado: number
    ticketPromedio: number
  }>
  topGastadores: Array<{
    nombre: string
    numeroCompras: number
    totalGastado: number
    ticketPromedio: number
  }>
  topTicketPromedio: Array<{
    nombre: string
    numeroCompras: number
    totalGastado: number
    ticketPromedio: number
  }>
  topProductosPorSegmento: {
    vip: Array<{ producto: string; cantidad: number; totalGastado: number }>
    frecuente: Array<{ producto: string; cantidad: number; totalGastado: number }>
    ocasional: Array<{ producto: string; cantidad: number; totalGastado: number }>
    nuevo: Array<{ producto: string; cantidad: number; totalGastado: number }>
  }
  estadisticas: {
    totalClientes: number
    clientesVIP: number
    clientesFrecuentes: number
    clientesOcasionales: number
    clientesNuevos: number
    clientesRecurrentes: number
    tasaRetencion: number
    clientesAltoValor: number
    clientesMedioValor: number
    clientesBajoValor: number
    totalVentas: number
    totalIngresos: number
    ticketPromedioGeneral: number
    comprasPorCliente: number
    promedioCompras: number
    promedioGasto: number
  }
  periodo: {
    inicio: string
    fin: string
  }
}

export default function CustomerAnalysisReport() {
  const [dateRange, setDateRange] = useState({
    start: parseDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
    end: parseDate(new Date().toISOString().split('T')[0])
  })
  
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<CustomerData | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const startDate = `${dateRange.start.year}-${String(dateRange.start.month).padStart(2, '0')}-${String(dateRange.start.day).padStart(2, '0')}`
      const endDate = `${dateRange.end.year}-${String(dateRange.end.month).padStart(2, '0')}-${String(dateRange.end.day).padStart(2, '0')}`
      
      const { getCustomerAnalysis } = await import('@/actions/reportes/reporte-analisis-clientes')
      const response = await getCustomerAnalysis({ startDate, endDate })
      
      if (response.success && response.data) {
        setData(response.data)
      }
      
    } catch (error) {
      console.error('Error cargando análisis de clientes:', error)
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
  const getSegmentoConfig = (segmento: string) => {
    switch (segmento) {
      case 'vip':
        return {
          label: 'VIP',
          icon: 'mdi:star-circle',
          color: 'warning',
          bgColor: 'from-yellow-50 to-yellow-100',
          iconBg: 'bg-yellow-500'
        }
      case 'frecuente':
        return {
          label: 'Frecuente',
          icon: 'mdi:account-multiple',
          color: 'success',
          bgColor: 'from-green-50 to-green-100',
          iconBg: 'bg-green-500'
        }
      case 'ocasional':
        return {
          label: 'Ocasional',
          icon: 'mdi:account-clock-outline',
          color: 'primary',
          bgColor: 'from-blue-50 to-blue-100',
          iconBg: 'bg-blue-500'
        }
      case 'nuevo':
        return {
          label: 'Nuevo',
          icon: 'mdi:account-plus-outline',
          color: 'secondary',
          bgColor: 'from-purple-50 to-purple-100',
          iconBg: 'bg-purple-500'
        }
      default:
        return {
          label: 'Cliente',
          icon: 'mdi:account',
          color: 'default',
          bgColor: 'from-gray-50 to-gray-100',
          iconBg: 'bg-gray-500'
        }
    }
  }

  const getValorColor = (valor: string) => {
    switch (valor) {
      case 'alto': return 'success'
      case 'medio': return 'primary'
      case 'bajo': return 'warning'
      default: return 'default'
    }
  }

  // ============================================
  // GRÁFICOS
  // ============================================

  const getSegmentacionChartOptions = (): EChartsOption => {
    if (!data) return {}
    
    return {
      title: {
        text: 'Distribución de Clientes por Segmento',
        left: 'center',
        textStyle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          return `<strong>${params.name}</strong><br/>
                  Clientes: <strong>${params.value}</strong><br/>
                  Porcentaje: <strong>${params.percent.toFixed(1)}%</strong>`
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
          data: [
            { value: data.estadisticas.clientesVIP, name: 'VIP', itemStyle: { color: '#f59e0b' } },
            { value: data.estadisticas.clientesFrecuentes, name: 'Frecuentes', itemStyle: { color: '#10b981' } },
            { value: data.estadisticas.clientesOcasionales, name: 'Ocasionales', itemStyle: { color: '#3b82f6' } },
            { value: data.estadisticas.clientesNuevos, name: 'Nuevos', itemStyle: { color: '#8b5cf6' } }
          ],
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

  const getTopGastadoresChartOptions = (): EChartsOption => {
    if (!data) return {}
    
    return {
      title: {
        text: 'Top 10 Clientes por Gasto Total',
        left: 'center',
        textStyle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = data.topGastadores[params[0].dataIndex]
          return `<strong>${item.nombre}</strong><br/>
                  Total gastado: <strong>Bs. ${item.totalGastado.toFixed(2)}</strong><br/>
                  Compras: <strong>${item.numeroCompras}</strong><br/>
                  Ticket promedio: <strong>Bs. ${item.ticketPromedio.toFixed(2)}</strong>`
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
        data: data.topGastadores.map(c => c.nombre.length > 20 ? c.nombre.substring(0, 20) + '...' : c.nombre),
        axisLabel: {
          interval: 0,
          fontSize: 10
        }
      },
      series: [
        {
          name: 'Gasto Total',
          type: 'bar',
          data: data.topGastadores.map(c => c.totalGastado.toFixed(2)),
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

  const getTopFrecuentesChartOptions = (): EChartsOption => {
    if (!data) return {}
    
    return {
      title: {
        text: 'Top 10 Clientes por Frecuencia',
        left: 'center',
        textStyle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = data.topFrecuentes[params[0].dataIndex]
          return `<strong>${item.nombre}</strong><br/>
                  Compras: <strong>${item.numeroCompras}</strong><br/>
                  Total gastado: <strong>Bs. ${item.totalGastado.toFixed(2)}</strong><br/>
                  Ticket promedio: <strong>Bs. ${item.ticketPromedio.toFixed(2)}</strong>`
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
          formatter: (value: number) => `${value} compras`
        }
      },
      yAxis: {
        type: 'category',
        data: data.topFrecuentes.map(c => c.nombre.length > 20 ? c.nombre.substring(0, 20) + '...' : c.nombre),
        axisLabel: {
          interval: 0,
          fontSize: 10
        }
      },
      series: [
        {
          name: 'Número de Compras',
          type: 'bar',
          data: data.topFrecuentes.map(c => c.numeroCompras),
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
            formatter: (params: any) => `${params.value} compras`,
            fontSize: 10
          }
        }
      ]
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" label="Analizando clientes..." />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
          <Icon icon="mdi:account-group" className="text-blue-600" />
          Análisis de Clientes
        </h1>
        <p className="text-gray-600">Conozca a sus clientes y diseñe estrategias para fidelizarlos</p>
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
              Analizar Clientes
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Cards de estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500 shadow-md">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Total Clientes</p>
                <p className="text-3xl font-bold text-blue-700">
                  {data.estadisticas.totalClientes}
                </p>
              </div>
              <div className="bg-blue-500 p-3 rounded-full">
                <Icon icon="mdi:account-group" className="text-2xl text-white" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500 shadow-md">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Tasa de Retención</p>
                <p className="text-3xl font-bold text-green-700">
                  {data.estadisticas.tasaRetencion.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.estadisticas.clientesRecurrentes} regresan
                </p>
              </div>
              <div className="bg-green-500 p-3 rounded-full">
                <Icon icon="mdi:account-check" className="text-2xl text-white" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500 shadow-md">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Ticket Promedio</p>
                <p className="text-2xl font-bold text-purple-700">
                  Bs. {data.estadisticas.ticketPromedioGeneral.toFixed(2)}
                </p>
              </div>
              <div className="bg-purple-500 p-3 rounded-full">
                <Icon icon="mdi:receipt-text" className="text-2xl text-white" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500 shadow-md">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium mb-1">Compras por Cliente</p>
                <p className="text-3xl font-bold text-orange-700">
                  {data.estadisticas.comprasPorCliente.toFixed(1)}
                </p>
              </div>
              <div className="bg-orange-500 p-3 rounded-full">
                <Icon icon="mdi:cart" className="text-2xl text-white" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Cards de segmentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* VIP */}
        <Card className={`bg-gradient-to-br ${getSegmentoConfig('vip').bgColor} shadow-md`}>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className={`${getSegmentoConfig('vip').iconBg} p-3 rounded-full`}>
                <Icon icon={getSegmentoConfig('vip').icon} className="text-2xl text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Clientes VIP</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {data.estadisticas.clientesVIP}
                </p>
                <p className="text-xs text-gray-500">Compran más del doble</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Frecuentes */}
        <Card className={`bg-gradient-to-br ${getSegmentoConfig('frecuente').bgColor} shadow-md`}>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className={`${getSegmentoConfig('frecuente').iconBg} p-3 rounded-full`}>
                <Icon icon={getSegmentoConfig('frecuente').icon} className="text-2xl text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Frecuentes</p>
                <p className="text-2xl font-bold text-green-700">
                  {data.estadisticas.clientesFrecuentes}
                </p>
                <p className="text-xs text-gray-500">Compran seguido</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Ocasionales */}
        <Card className={`bg-gradient-to-br ${getSegmentoConfig('ocasional').bgColor} shadow-md`}>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className={`${getSegmentoConfig('ocasional').iconBg} p-3 rounded-full`}>
                <Icon icon={getSegmentoConfig('ocasional').icon} className="text-2xl text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Ocasionales</p>
                <p className="text-2xl font-bold text-blue-700">
                  {data.estadisticas.clientesOcasionales}
                </p>
                <p className="text-xs text-gray-500">Compran a veces</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Nuevos */}
        <Card className={`bg-gradient-to-br ${getSegmentoConfig('nuevo').bgColor} shadow-md`}>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className={`${getSegmentoConfig('nuevo').iconBg} p-3 rounded-full`}>
                <Icon icon={getSegmentoConfig('nuevo').icon} className="text-2xl text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Nuevos</p>
                <p className="text-2xl font-bold text-purple-700">
                  {data.estadisticas.clientesNuevos}
                </p>
                <p className="text-xs text-gray-500">Primera compra</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Gráfico de segmentación */}
      <Card className="shadow-md mb-6">
        <CardBody className="p-4">
          <BaseChart 
            option={getSegmentacionChartOptions()} 
            height="400px"
            loading={loading}
          />
        </CardBody>
      </Card>

      {/* Gráficos de top clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="shadow-md">
          <CardBody className="p-4">
            <BaseChart 
              option={getTopGastadoresChartOptions()} 
              height="450px"
              loading={loading}
            />
          </CardBody>
        </Card>

        <Card className="shadow-md">
          <CardBody className="p-4">
            <BaseChart 
              option={getTopFrecuentesChartOptions()} 
              height="450px"
              loading={loading}
            />
          </CardBody>
        </Card>
      </div>

      {/* Productos preferidos por segmento */}
      <Card className="shadow-md mb-6">
        <CardBody>
          <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
            <Icon icon="mdi:star-box" className="text-yellow-500" />
            Productos Preferidos por Tipo de Cliente
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* VIP */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Icon icon="mdi:star-circle" className="text-xl text-yellow-600" />
                <h4 className="font-semibold text-yellow-800">Clientes VIP</h4>
              </div>
              <div className="space-y-2">
                {data.topProductosPorSegmento.vip.slice(0, 5).map((prod, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">{prod.producto.substring(0, 15)}...</span>
                    <span className="font-semibold text-yellow-700">
                      Bs. {prod.totalGastado.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Frecuentes */}
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Icon icon="mdi:account-multiple" className="text-xl text-green-600" />
                <h4 className="font-semibold text-green-800">Frecuentes</h4>
              </div>
              <div className="space-y-2">
                {data.topProductosPorSegmento.frecuente.slice(0, 5).map((prod, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">{prod.producto.substring(0, 15)}...</span>
                    <span className="font-semibold text-green-700">
                      Bs. {prod.totalGastado.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ocasionales */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Icon icon="mdi:account-clock-outline" className="text-xl text-blue-600" />
                <h4 className="font-semibold text-blue-800">Ocasionales</h4>
              </div>
              <div className="space-y-2">
                {data.topProductosPorSegmento.ocasional.slice(0, 5).map((prod, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">{prod.producto.substring(0, 15)}...</span>
                    <span className="font-semibold text-blue-700">
                      Bs. {prod.totalGastado.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nuevos */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Icon icon="mdi:account-plus-outline" className="text-xl text-purple-600" />
                <h4 className="font-semibold text-purple-800">Nuevos</h4>
              </div>
              <div className="space-y-2">
                {data.topProductosPorSegmento.nuevo.slice(0, 5).map((prod, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">{prod.producto.substring(0, 15)}...</span>
                    <span className="font-semibold text-purple-700">
                      Bs. {prod.totalGastado.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Estrategias de fidelización */}
      <Card className="shadow-md bg-blue-50">
        <CardBody>
          <h3 className="text-lg font-bold mb-3 text-blue-900 flex items-center gap-2">
            <Icon icon="mdi:lightbulb-on-outline" className="text-2xl text-blue-600" />
            Estrategias de Fidelización
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Icon icon="mdi:star-circle" className="text-xl text-yellow-600" />
                <p className="text-sm font-semibold text-gray-700">Para VIPs</p>
              </div>
              <p className="text-xs text-gray-600">
                Programa de puntos exclusivo, descuentos especiales y atención prioritaria
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Icon icon="mdi:account-multiple" className="text-xl text-green-600" />
                <p className="text-sm font-semibold text-gray-700">Para Frecuentes</p>
              </div>
              <p className="text-xs text-gray-600">
                Ofertas semanales en sus productos favoritos y combos especiales
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Icon icon="mdi:account-clock-outline" className="text-xl text-blue-600" />
                <p className="text-sm font-semibold text-gray-700">Para Ocasionales</p>
              </div>
              <p className="text-xs text-gray-600">
                Promociones para incentivar visitas más frecuentes y recordatorios
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Icon icon="mdi:account-plus-outline" className="text-xl text-purple-600" />
                <p className="text-sm font-semibold text-gray-700">Para Nuevos</p>
              </div>
              <p className="text-xs text-gray-600">
                Descuento de bienvenida y cupones para segunda compra
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}