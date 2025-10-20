'use client'

import React, { useEffect, useState } from 'react'
import BaseChart from './BaseChart'
import { getTop10ProductosVendidos } from '@/actions/dashboard/dashboard-action'

interface ProductoVendido {
  nombre: string
  cantidad: number
  unidad: string
}

export default function TopProductosChart() {
  const [data, setData] = useState<ProductoVendido[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const result = await getTop10ProductosVendidos()
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
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const option: echarts.EChartsOption = {
    title: {
      text: 'Top 10 Productos Más Vendidos',
      left: 'left',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: any) => {
        const value = params[0].value
        const name = params[0].name
        return `${name}<br/>Vendidos: ${value.toLocaleString('es-BO')}`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => value.toLocaleString('es-BO')
      }
    },
    yAxis: {
      type: 'category',
      data: data.map(p => p.nombre).reverse(),
      axisLabel: {
        fontSize: 12,
        formatter: (value: string) => {
          // Truncar nombres largos
          return value.length > 25 ? value.substring(0, 25) + '...' : value
        }
      }
    },
    series: [
      {
        name: 'Cantidad',
        type: 'bar',
        data: data.map(p => p.cantidad).reverse(),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#8b5cf6' },
              { offset: 1, color: '#6366f1' }
            ]
          },
          borderRadius: [0, 4, 4, 0]
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}',
          fontSize: 11
        }
      }
    ]
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <BaseChart option={option} height="450px" loading={loading} />
      {data.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-8">
          No hay datos de ventas para mostrar
        </div>
      )}
    </div>
  )
}