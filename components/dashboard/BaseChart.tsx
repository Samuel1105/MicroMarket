'use client'

import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

interface BaseChartProps {
  option: echarts.EChartsOption
  height?: string
  className?: string
  loading?: boolean
}

export default function BaseChart({ 
  option, 
  height = '400px', 
  className = '',
  loading = false 
}: BaseChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    // Inicializar o obtener instancia de chart
    const chart = echarts.init(chartRef.current)
    chartInstanceRef.current = chart

    // Mostrar loading si es necesario
    if (loading) {
      chart.showLoading()
    } else {
      chart.hideLoading()
      chart.setOption(option, true)
    }

    // Responsive
    const handleResize = () => {
      chart.resize()
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.dispose()
    }
  }, [option, loading])

  return (
    <div 
      ref={chartRef} 
      style={{ height, width: '100%' }}
      className={className}
    />
  )
}