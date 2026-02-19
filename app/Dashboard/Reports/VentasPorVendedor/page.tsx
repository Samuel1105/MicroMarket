"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardBody, DateRangePicker, Button, Spinner, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Progress } from '@heroui/react'
import { Icon } from '@iconify/react'
import { parseDate } from '@internationalized/date'

import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/dashboard/BaseChart'

// ============================================
// TYPES
// ============================================
type EmpleadoData = {
  empleadoID: number
  nombre: string
  nombreCompleto: string
  rol: number
  rolNombre: string
  numeroVentas: number
  totalVentas: number
  ticketPromedio: number
  mejorVenta: number
  porcentajeDelTotal: number
  diferenciaConPromedio: number
  rendimiento: 'alto' | 'medio' | 'bajo'
}

type EmployeeSalesData = {
  empleados: EmpleadoData[]
  topVentas: EmpleadoData[]
  topNumeroVentas: EmpleadoData[]
  topTicketPromedio: EmpleadoData[]
  turnos: Array<{
    turno: string
    numeroVentas: number
    totalVentas: number
    ticketPromedio: number
  }>
  ventasDiarias: Array<{
    fecha: string
    total: number
  }>
  necesitanCapacitacion: EmpleadoData[]
  estadisticas: {
    totalEmpleados: number
    totalVentas: number
    totalIngresos: number
    ticketPromedioGlobal: number
    ventasPorEmpleado: number
    promedioVentasPorEmpleado: number
    empleadosAltoRendimiento: number
    empleadosMedioRendimiento: number
    empleadosBajoRendimiento: number
  }
  periodo: {
    inicio: string
    fin: string
  }
}

export default function EmployeeSalesReport() {
  const [dateRange, setDateRange] = useState({
    start: parseDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
    end: parseDate(new Date().toISOString().split('T')[0])
  })
  
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<EmployeeSalesData | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const startDate = `${dateRange.start.year}-${String(dateRange.start.month).padStart(2, '0')}-${String(dateRange.start.day).padStart(2, '0')}`
      const endDate = `${dateRange.end.year}-${String(dateRange.end.month).padStart(2, '0')}-${String(dateRange.end.day).padStart(2, '0')}`
      
      const { getEmployeeSales } = await import('@/actions/reportes/reporte-ventas-empleado')
      const response = await getEmployeeSales({ startDate, endDate })
      
      if (response.success && response.data) {
        setData(response.data)
      }
      
    } catch (error) {
      console.error('Error cargando ventas por empleado:', error)
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
  const getRendimientoConfig = (rendimiento: string) => {
    switch (rendimiento) {
      case 'alto':
        return {
          label: 'Alto',
          icon: 'mdi:trophy-variant',
          color: 'success',
          bgColor: 'from-green-50 to-green-100',
          textColor: 'text-green-700'
        }
      case 'medio':
        return {
          label: 'Medio',
          icon: 'mdi:account-check',
          color: 'primary',
          bgColor: 'from-blue-50 to-blue-100',
          textColor: 'text-blue-700'
        }
      case 'bajo':
        return {
          label: 'Bajo',
          icon: 'mdi:alert-circle-outline',
          color: 'warning',
          bgColor: 'from-orange-50 to-orange-100',
          textColor: 'text-orange-700'
        }
      default:
        return {
          label: 'N/A',
          icon: 'mdi:help-circle',
          color: 'default',
          bgColor: 'from-gray-50 to-gray-100',
          textColor: 'text-gray-700'
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

  const getTopVentasChartOptions = (): EChartsOption => {
    if (!data) return {}
    
    return {
      title: {
        text: 'Top 10 Empleados por Ventas Totales',
        left: 'center',
        textStyle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = data.topVentas[params[0].dataIndex]
          return `<strong>${item.nombre}</strong><br/>
                  Total ventas: <strong>Bs. ${item.totalVentas.toFixed(2)}</strong><br/>
                  Número de ventas: <strong>${item.numeroVentas}</strong><br/>
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
        data: data.topVentas.map(e => e.nombre.length > 20 ? e.nombre.substring(0, 20) + '...' : e.nombre),
        axisLabel: {
          interval: 0,
          fontSize: 10
        }
      },
      series: [
        {
          name: 'Ventas',
          type: 'bar',
          data: data.topVentas.map(e => e.totalVentas.toFixed(2)),
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

  const getTopNumeroVentasChartOptions = (): EChartsOption => {
    if (!data) return {}
    
    return {
      title: {
        text: 'Top 10 Empleados por Número de Ventas',
        left: 'center',
        textStyle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const item = data.topNumeroVentas[params[0].dataIndex]
          return `<strong>${item.nombre}</strong><br/>
                  Número de ventas: <strong>${item.numeroVentas}</strong><br/>
                  Total: <strong>Bs. ${item.totalVentas.toFixed(2)}</strong><br/>
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
          formatter: (value: number) => `${value.toFixed(0)}`
        }
      },
      yAxis: {
        type: 'category',
        data: data.topNumeroVentas.map(e => e.nombre.length > 20 ? e.nombre.substring(0, 20) + '...' : e.nombre),
        axisLabel: {
          interval: 0,
          fontSize: 10
        }
      },
      series: [
        {
          name: 'Ventas',
          type: 'bar',
          data: data.topNumeroVentas.map(e => e.numeroVentas),
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
            formatter: (params: any) => `${params.value} ventas`,
            fontSize: 10
          }
        }
      ]
    }
  }

  const getTurnosChartOptions = (): EChartsOption => {
    if (!data) return {}
    
    return {
      title: {
        text: 'Ventas por Turno',
        left: 'center',
        textStyle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const item = data.turnos[params.dataIndex]
          return `<strong>${item.turno}</strong><br/>
                  Ventas: <strong>Bs. ${item.totalVentas.toFixed(2)}</strong><br/>
                  Número: <strong>${item.numeroVentas}</strong><br/>
                  Ticket promedio: <strong>Bs. ${item.ticketPromedio.toFixed(2)}</strong>`
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
          data: data.turnos.map((t, idx) => ({
            value: t.totalVentas,
            name: t.turno,
            itemStyle: {
              color: ['#f59e0b', '#3b82f6', '#8b5cf6'][idx % 3]
            }
          })),
          label: {
            formatter: '{b}: Bs. {c}',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" label="Analizando ventas por empleado..." />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
          <Icon icon="mdi:account-group" className="text-blue-600" />
          Ventas por Empleado
        </h1>
        <p className="text-gray-600">Evalúe el desempeño comercial y productividad de su equipo</p>
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
              Analizar Desempeño
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
                <p className="text-xs text-gray-600 font-medium mb-1">Total Empleados</p>
                <p className="text-3xl font-bold text-blue-700">
                  {data.estadisticas.totalEmpleados}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Activos en el período
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
                <p className="text-xs text-gray-600 font-medium mb-1">Total Ventas</p>
                <p className="text-3xl font-bold text-green-700">
                  {data.estadisticas.totalVentas}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Bs. {data.estadisticas.totalIngresos.toFixed(2)}
                </p>
              </div>
              <div className="bg-green-500 p-3 rounded-full">
                <Icon icon="mdi:cash-multiple" className="text-2xl text-white" />
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
                  Bs. {data.estadisticas.ticketPromedioGlobal.toFixed(2)}
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
                <p className="text-xs text-gray-600 font-medium mb-1">Ventas/Empleado</p>
                <p className="text-3xl font-bold text-orange-700">
                  {data.estadisticas.ventasPorEmpleado.toFixed(1)}
                </p>
              </div>
              <div className="bg-orange-500 p-3 rounded-full">
                <Icon icon="mdi:account-arrow-right" className="text-2xl text-white" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Cards de rendimiento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 shadow-md">
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="bg-green-500 p-3 rounded-full">
                <Icon icon="mdi:trophy-variant" className="text-2xl text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Alto Rendimiento</p>
                <p className="text-2xl font-bold text-green-700">
                  {data.estadisticas.empleadosAltoRendimiento}
                </p>
                <p className="text-xs text-gray-500">Superan el promedio en 20%+</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 shadow-md">
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-3 rounded-full">
                <Icon icon="mdi:account-check" className="text-2xl text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Rendimiento Medio</p>
                <p className="text-2xl font-bold text-blue-700">
                  {data.estadisticas.empleadosMedioRendimiento}
                </p>
                <p className="text-xs text-gray-500">Dentro del promedio</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 shadow-md">
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 p-3 rounded-full">
                <Icon icon="mdi:alert-circle-outline" className="text-2xl text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Bajo Rendimiento</p>
                <p className="text-2xl font-bold text-orange-700">
                  {data.estadisticas.empleadosBajoRendimiento}
                </p>
                <p className="text-xs text-gray-500">Necesitan apoyo</p>
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
              option={getTopVentasChartOptions()} 
              height="500px"
              loading={loading}
            />
          </CardBody>
        </Card>

        <Card className="shadow-md">
          <CardBody className="p-4">
            <BaseChart 
              option={getTopNumeroVentasChartOptions()} 
              height="500px"
              loading={loading}
            />
          </CardBody>
        </Card>
      </div>

      {/* Gráfico de turnos */}
      <Card className="shadow-md mb-6">
        <CardBody className="p-4">
          <BaseChart 
            option={getTurnosChartOptions()} 
            height="400px"
            loading={loading}
          />
        </CardBody>
      </Card>

      {/* Empleados que necesitan capacitación */}
      {data.necesitanCapacitacion.length > 0 && (
        <Card className="shadow-md mb-6 bg-orange-50 border-l-4 border-orange-500">
          <CardBody>
            <h3 className="text-lg font-bold mb-4 text-orange-800 flex items-center gap-2">
              <Icon icon="mdi:school-outline" className="text-orange-600" />
              Empleados que Necesitan Capacitación
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.necesitanCapacitacion.map((emp, idx) => (
                <div key={idx} className="bg-white p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800">{emp.nombre}</span>
                    <Chip size="sm" color="warning" variant="flat">
                      {emp.rolNombre}
                    </Chip>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Ventas:</span>
                      <span className="font-semibold">Bs. {emp.totalVentas.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Número:</span>
                      <span className="font-semibold">{emp.numeroVentas}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>vs Promedio:</span>
                      <span className="font-semibold text-red-600">
                        {emp.diferenciaConPromedio.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tabla de todos los empleados */}
      <Card className="shadow-md mb-6">
        <CardBody>
          <h3 className="text-lg font-bold mb-4 text-gray-800">Desempeño Detallado por Empleado</h3>
          
          <Table aria-label="Tabla de empleados">
            <TableHeader>
              <TableColumn>EMPLEADO</TableColumn>
              <TableColumn>ROL</TableColumn>
              <TableColumn align="center">N° VENTAS</TableColumn>
              <TableColumn align="center">TOTAL VENTAS</TableColumn>
              <TableColumn align="center">TICKET PROM.</TableColumn>
              <TableColumn align="center">% DEL TOTAL</TableColumn>
              <TableColumn align="center">RENDIMIENTO</TableColumn>
            </TableHeader>
            <TableBody>
              {data.empleados.map((emp) => {
                const config = getRendimientoConfig(emp.rendimiento)
                return (
                  <TableRow key={emp.empleadoID}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{emp.nombre}</span>
                        <span className="text-xs text-gray-500">ID: {emp.empleadoID}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" color="default">
                        {emp.rolNombre}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="text-center font-semibold">
                        {emp.numeroVentas}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center font-semibold text-green-600">
                        Bs. {emp.totalVentas.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        Bs. {emp.ticketPromedio.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center">
                        <Progress 
                          value={emp.porcentajeDelTotal} 
                          className="max-w-md"
                          color="primary"
                          size="sm"
                        />
                        <span className="text-xs text-gray-600 mt-1">
                          {emp.porcentajeDelTotal.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <Chip
                          size="sm"
                          color={config.color as any}
                          variant="flat"
                          startContent={<Icon icon={config.icon} />}
                        >
                          {config.label}
                        </Chip>
                      </div>
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
            Recomendaciones para Mejorar el Desempeño
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Icon icon="mdi:trophy-variant" className="text-xl text-green-600" />
                <p className="text-sm font-semibold text-gray-700">Alto Rendimiento</p>
              </div>
              <p className="text-xs text-gray-600">
                Reconozca públicamente y ofrezca incentivos. Son su ejemplo a seguir.
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Icon icon="mdi:school-outline" className="text-xl text-blue-600" />
                <p className="text-sm font-semibold text-gray-700">Capacitación</p>
              </div>
              <p className="text-xs text-gray-600">
                Empleados con bajo rendimiento necesitan capacitación en técnicas de venta.
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Icon icon="mdi:target" className="text-xl text-orange-600" />
                <p className="text-sm font-semibold text-gray-700">Metas Claras</p>
              </div>
              <p className="text-xs text-gray-600">
                Establezca objetivos mensuales y seguimiento semanal de avances.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}