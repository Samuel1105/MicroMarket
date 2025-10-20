'use client'

import React, { useEffect, useState } from 'react'
import BaseChart from './BaseChart'
import { getVentasPorCategoria } from '@/actions/dashboard/dashboard-action'

interface CategoriaVenta {
  nombre: string
  valor: number
}

export default function VentasCategoriaChart() {
  const [data, setData] = useState<CategoriaVenta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const result = await getVentasPorCategoria()
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

  const total = data.reduce((sum, cat) => sum + cat.valor, 0)

  const option: echarts.EChartsOption = {
    title: {
      text: 'Distribución de Ventas por Categoría',
      left: 'left',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const percent = params.percent.toFixed(1)
        const value = params.value.toLocaleString('es-BO', { minimumFractionDigits: 2 })
        return `${params.name}<br/>Bs. ${value} (${percent}%)`
      }
    },
    legend: {
      orient: 'vertical',
      right: '10',
      top: 'middle',
      icon: 'circle',
      itemGap: 15
    },
    series: [
      {
        name: 'Ventas',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
            formatter: (params: any) => {
              return `${params.percent.toFixed(1)}%`
            }
          }
        },
        labelLine: {
          show: false
        },
        data: data.map((cat, index) => ({
          value: cat.valor,
          name: cat.nombre,
          itemStyle: {
            color: [
              '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', 
              '#10b981', '#06b6d4', '#f43f5e', '#84cc16'
            ][index % 8]
          }
        }))
      }
    ]
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <BaseChart option={option} height="350px" loading={loading} />
      {data.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-8">
          No hay datos de categorías para mostrar
        </div>
      )}
      {total > 0 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">Total del mes</p>
          <p className="text-2xl font-bold text-gray-900">
            Bs. {total.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}
    </div>
  )
}