'use client'

import React, { useEffect, useState } from 'react'
import BaseChart from './BaseChart'
import { getStockCritico } from '@/actions/dashboard/dashboard-action'


interface StockAlerta {
  nombre: string
  cantidadActual: number
  stockOptimo: number
  porcentaje: number
  nivel: 'critico' | 'precaucion' | 'normal'
  unidad: string
}

export default function StockCriticoChart() {
  const [data, setData] = useState<StockAlerta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const result = await getStockCritico()
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

  const getColor = (nivel: string) => {
    switch (nivel) {
      case 'critico': return '#ef4444'
      case 'precaucion': return '#f59e0b'
      default: return '#10b981'
    }
  }

  const option: echarts.EChartsOption = {
    title: {
      text: 'Alertas de Stock Crítico',
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
        const item = data[data.length - 1 - params[0].dataIndex]
        return `
          <strong>${item.nombre}</strong><br/>
          Stock Actual: ${item.cantidadActual.toFixed(2)} ${item.unidad}<br/>
          Stock Óptimo: ${item.stockOptimo.toFixed(2)} ${item.unidad}<br/>
          Nivel: <strong>${item.porcentaje.toFixed(1)}%</strong><br/>
          Estado: <strong>${item.nivel === 'critico' ? 'CRÍTICO' : 'PRECAUCIÓN'}</strong>
        `
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
      max: 100,
      axisLabel: {
        formatter: '{value}%'
      }
    },
    yAxis: {
      type: 'category',
      data: data.map(p => p.nombre).reverse(),
      axisLabel: {
        fontSize: 11,
        formatter: (value: string) => {
          return value.length > 20 ? value.substring(0, 20) + '...' : value
        }
      }
    },
    series: [
      {
        name: 'Porcentaje de Stock',
        type: 'bar',
        data: data.map(p => ({
          value: p.porcentaje,
          itemStyle: {
            color: getColor(p.nivel),
            borderRadius: [0, 4, 4, 0]
          }
        })).reverse(),
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%',
          fontSize: 11
        }
      }
    ]
  }

  const criticosCount = data.filter(d => d.nivel === 'critico').length
  const precaucionCount = data.filter(d => d.nivel === 'precaucion').length

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {data.length > 0 && (
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-600">Crítico: {criticosCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-sm text-gray-600">Precaución: {precaucionCount}</span>
          </div>
        </div>
      )}
      <BaseChart option={option} height="450px" loading={loading} />
      {data.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-8">
          {/* <AlertTriangle className="mx-auto mb-2 text-green-500" size={48} /> */}
          <p className="font-semibold">¡Excelente!</p>
          <p>No hay productos con stock crítico</p>
        </div>
      )}
    </div>
  )
}