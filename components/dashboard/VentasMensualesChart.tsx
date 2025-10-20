'use client'

import React, { useEffect, useState } from 'react'
import BaseChart from './BaseChart'
import { getVentasMensuales } from '@/actions/dashboard/dashboard-action'


interface VentasData {
  ventas: { fecha: string; total: number }[]
  totalMesActual: number
  totalMesAnterior: number
  variacion: number
}

export default function VentasMensualesChart() {
  const [data, setData] = useState<VentasData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const result = await getVentasMensuales()
      setData(result)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading || !data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const option: echarts.EChartsOption = {
    title: {
      text: 'Ventas del Mes',
      left: 'left',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const value = params[0].value
        return `${params[0].axisValue}<br/>Bs. ${value.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`
      }
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
      data: data.ventas.map(v => v.fecha)
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => `Bs. ${(value)}`
      }
    },
    series: [
      {
        name: 'Ventas',
        type: 'line',
        smooth: true,
        data: data.ventas.map(v => v.total),
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.5)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.1)' }
            ]
          }
        },
        itemStyle: {
          color: '#3b82f6'
        },
        lineStyle: {
          width: 3
        }
      }
    ]
  }

  const variacionPositiva = data.variacion >= 0

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Ventas del Mes</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            Bs. {data.totalMesActual.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
          variacionPositiva ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {/* {variacionPositiva ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />} */}
          <span className="text-sm font-semibold">{Math.abs(data.variacion).toFixed(1)}%</span>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        vs. mes anterior: Bs. {data.totalMesAnterior.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
      </p>
      <BaseChart option={option} height="300px" loading={loading} />
    </div>
  )
}