'use client'

import React, { useEffect, useState } from 'react'
import BaseChart from './BaseChart'
import { getMovimientosAlmacen } from '@/actions/dashboard/dashboard-action'


interface MovimientoData {
  fecha: string
  entradas: number
  salidas: number
}

export default function MovimientosAlmacenChart() {
  const [data, setData] = useState<MovimientoData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const result = await getMovimientosAlmacen()
      setData(result)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const totalEntradas = data.reduce((sum, d) => sum + d.entradas, 0)
  const totalSalidas = data.reduce((sum, d) => sum + d.salidas, 0)
  const balance = totalEntradas - totalSalidas

  const option: echarts.EChartsOption = {
    title: {
      text: 'Movimientos de Almacén',
      left: 'left',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      },
      formatter: (params: any) => {
        let result = `${params[0].axisValue}<br/>`
        params.forEach((param: any) => {
          result += `${param.marker} ${param.seriesName}: ${param.value.toLocaleString('es-BO')} unidades<br/>`
        })
        return result
      }
    },
    legend: {
      data: ['Entradas', 'Salidas'],
      top: 40,
      icon: 'circle'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map(d => d.fecha)
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => value.toLocaleString('es-BO')
      }
    },
    series: [
      {
        name: 'Entradas',
        type: 'line',
        stack: 'Total',
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.6)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.1)' }
            ]
          }
        },
        emphasis: {
          focus: 'series'
        },
        data: data.map(d => d.entradas),
        itemStyle: {
          color: '#10b981'
        },
        lineStyle: {
          width: 2
        }
      },
      {
        name: 'Salidas',
        type: 'line',
        stack: 'Total',
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(239, 68, 68, 0.6)' },
              { offset: 1, color: 'rgba(239, 68, 68, 0.1)' }
            ]
          }
        },
        emphasis: {
          focus: 'series'
        },
        data: data.map(d => d.salidas),
        itemStyle: {
          color: '#ef4444'
        },
        lineStyle: {
          width: 2
        }
      }
    ]
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            {/* <TrendingUp className="text-green-600" size={20} /> */}
            <span className="text-sm font-medium text-green-800">Entradas</span>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {totalEntradas.toLocaleString('es-BO')}
          </p>
          <p className="text-xs text-green-600 mt-1">unidades</p>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            {/* <TrendingDown className="text-red-600" size={20} /> */}
            <span className="text-sm font-medium text-red-800">Salidas</span>
          </div>
          <p className="text-2xl font-bold text-red-900">
            {totalSalidas.toLocaleString('es-BO')}
          </p>
          <p className="text-xs text-red-600 mt-1">unidades</p>
        </div>

        <div className={`rounded-lg p-4 ${balance >= 0 ? 'bg-blue-50' : 'bg-amber-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-medium ${balance >= 0 ? 'text-blue-800' : 'text-amber-800'}`}>
              Balance
            </span>
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-900' : 'text-amber-900'}`}>
            {balance >= 0 ? '+' : ''}{balance.toLocaleString('es-BO')}
          </p>
          <p className={`text-xs mt-1 ${balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
            {balance >= 0 ? 'Superávit' : 'Déficit'}
          </p>
        </div>
      </div>

      <BaseChart option={option} height="350px" loading={loading} />
      
      {data.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-8">
          No hay movimientos registrados este mes
        </div>
      )}
    </div>
  )
}