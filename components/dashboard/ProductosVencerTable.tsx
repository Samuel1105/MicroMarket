'use client'

import React, { useEffect, useState } from 'react'
import { getProductosProximosVencer } from '@/actions/dashboard/dashboard-action'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ProductoVencer {
  producto: string
  lote: string
  cantidad: number
  unidad: string
  fechaVencimiento: Date | null
  diasRestantes: number | null
}

export default function ProductosVencerTable() {
  const [data, setData] = useState<ProductoVencer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const result = await getProductosProximosVencer()
      setData(result)
      setLoading(false)
    }
    fetchData()
  }, [])

  const getUrgenciaColor = (dias: number | null) => {
    if (!dias) return 'bg-gray-100 text-gray-700'
    if (dias <= 7) return 'bg-red-100 text-red-700 border-red-300'
    if (dias <= 15) return 'bg-amber-100 text-amber-700 border-amber-300'
    return 'bg-yellow-100 text-yellow-700 border-yellow-300'
  }

  const getUrgenciaTexto = (dias: number | null) => {
    if (!dias) return 'Desconocido'
    if (dias === 0) return '¡HOY!'
    if (dias <= 7) return 'Urgente'
    if (dias <= 15) return 'Pronto'
    return 'Próximo'
  }

  const getUrgenciaIcon = (dias: number | null) => {
    if (!dias || dias > 15) return '⚠️'
    if (dias <= 7) return '🚨'
    return '⏰'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Estadísticas rápidas
  const urgentesCount = data.filter(d => d.diasRestantes !== null && d.diasRestantes <= 7).length
  const prontosCount = data.filter(d => d.diasRestantes !== null && d.diasRestantes > 7 && d.diasRestantes <= 15).length
  const cantidadTotal = data.reduce((sum, item) => sum + item.cantidad, 0)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {/* <Calendar className="text-amber-500" size={24} /> */}
          <h3 className="text-lg font-semibold text-gray-900">
            Productos Próximos a Vencer
          </h3>
        </div>
        
        {data.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600">
                Urgente: <span className="font-semibold">{urgentesCount}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-gray-600">
                Pronto: <span className="font-semibold">{prontosCount}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {data.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          {/* <AlertCircle className="mx-auto mb-2 text-green-500" size={48} /> */}
          <p className="font-semibold">Todo en orden</p>
          <p>No hay productos próximos a vencer en los próximos 30 días</p>
        </div>
      ) : (
        <>
          {/* Resumen */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* <Package className="text-amber-600" size={20} /> */}
                <div>
                  <p className="text-sm text-amber-800 font-medium">
                    Total de productos por vencer
                  </p>
                  <p className="text-xs text-amber-600">
                    En los próximos 30 días
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-900">
                  {data.length}
                </p>
                <p className="text-xs text-amber-600">
                  {cantidadTotal.toFixed(2)} unidades totales
                </p>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lote
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad Disponible
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimiento
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Días Restantes
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Urgencia
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item, index) => (
                  <tr 
                    key={index} 
                    className={`hover:bg-gray-50 transition-colors ${
                      item.diasRestantes !== null && item.diasRestantes <= 7 
                        ? 'bg-red-50/30' 
                        : item.diasRestantes !== null && item.diasRestantes <= 15
                        ? 'bg-amber-50/30'
                        : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {item.producto}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {item.lote}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">
                        {item.cantidad.toFixed(2)}
                      </span>
                      {' '}{item.unidad}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.fechaVencimiento 
                        ? format(new Date(item.fechaVencimiento), 'dd MMM yyyy')
                        : 'N/A'
                      }
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`inline-flex items-center justify-center w-12 h-8 rounded-lg font-bold ${
                        item.diasRestantes !== null && item.diasRestantes <= 7
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.diasRestantes ?? 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getUrgenciaColor(item.diasRestantes)}`}>
                        <span>{getUrgenciaIcon(item.diasRestantes)}</span>
                        {getUrgenciaTexto(item.diasRestantes)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}