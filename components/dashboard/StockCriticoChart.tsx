"use client"
import React, { useEffect, useState } from 'react'
import { getInventarioCompleto, notificarExtraccion, notificarCompra } from '@/actions/dashboard/dashboard-action'

interface InventarioProducto {
  productoID: number
  nombre: string
  unidad: string
  stockEnAlmacen: number
  stockExtraido: number
  stockDisponibleVenta: number
  stockVendido: number
  ventasUltimoMes: number
  nivelAlmacen: 'critico' | 'precaucion' | 'normal'
  nivelVenta: 'critico' | 'precaucion' | 'normal'
  debeExtraer: boolean
  debeComprar: boolean
}

export default function InventarioCompletoTable() {
  const [data, setData] = useState<InventarioProducto[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'todos' | 'extraer' | 'comprar'>('todos')
  const [notificando, setNotificando] = useState<'extraer' | 'comprar' | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const result = await getInventarioCompleto()
    setData(result)
    setLoading(false)
  }

  const filteredData = data.filter(item => {
    if (filter === 'extraer') return item.debeExtraer
    if (filter === 'comprar') return item.debeComprar
    return true
  })

  const countExtraer = data.filter(d => d.debeExtraer).length
  const countComprar = data.filter(d => d.debeComprar).length

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'critico': return 'bg-red-500'
      case 'precaucion': return 'bg-amber-500'
      default: return 'bg-green-500'
    }
  }

  const getNivelTexto = (nivel: string) => {
    switch (nivel) {
      case 'critico': return 'CRÍTICO'
      case 'precaucion': return 'BAJO'
      default: return 'OK'
    }
  }

  const handleNotificarExtraccion = async () => {
    setNotificando('extraer')
    const productosExtraer = data.filter(d => d.debeExtraer)
    await notificarExtraccion(productosExtraer)
    setTimeout(() => setNotificando(null), 2000)
  }

  const handleNotificarCompra = async () => {
    setNotificando('comprar')
    const productosComprar = data.filter(d => d.debeComprar)
    await notificarCompra(productosComprar)
    setTimeout(() => setNotificando(null), 2000)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Inventario Completo y Alertas
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Monitoreo de stock en almacén y punto de venta
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Botones de Notificación */}
            <button
              onClick={handleNotificarExtraccion}
              disabled={countExtraer === 0 || notificando === 'extraer'}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                notificando === 'extraer'
                  ? 'bg-green-100 text-green-700'
                  : countExtraer > 0
                  ? 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {notificando === 'extraer' ? (
                <>
                  <span>✓</span>
                  <span>Notificado</span>
                </>
              ) : (
                <>
                  <span>📦</span>
                  <span>Notificar Extracción ({countExtraer})</span>
                </>
              )}
            </button>

            <button
              onClick={handleNotificarCompra}
              disabled={countComprar === 0 || notificando === 'comprar'}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                notificando === 'comprar'
                  ? 'bg-green-100 text-green-700'
                  : countComprar > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {notificando === 'comprar' ? (
                <>
                  <span>✓</span>
                  <span>Notificado</span>
                </>
              ) : (
                <>
                  <span>🛒</span>
                  <span>Notificar Compra ({countComprar})</span>
                </>
              )}
            </button>

            {/* Filtros */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('todos')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'todos'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos ({data.length})
              </button>
              <button
                onClick={() => setFilter('extraer')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'extraer'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                📦 Extraer ({countExtraer})
              </button>
              <button
                onClick={() => setFilter('comprar')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'comprar'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                🛒 Comprar ({countComprar})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-lg font-semibold text-gray-700 mb-2">
              {filter === 'todos' ? 'No hay productos' : 
               filter === 'extraer' ? '¡Stock en almacén OK!' :
               '¡Inventario completo OK!'}
            </p>
            <p className="text-gray-500">
              {filter === 'todos' ? 'No hay productos registrados' :
               filter === 'extraer' ? 'No es necesario extraer stock del almacén' :
               'No es necesario comprar productos'}
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Producto
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  En Almacén
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Extraído
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  En Venta
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Vendido
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Ventas/Mes
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Estado Almacén
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Estado Venta
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr
                  key={item.productoID}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {item.debeExtraer && (
                          <div className="w-1.5 h-12 rounded-full bg-purple-500" title="Necesita extracción"></div>
                        )}
                        {item.debeComprar && (
                          <div className="w-1.5 h-12 rounded-full bg-blue-500" title="Necesita compra"></div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.nombre}</p>
                        <p className="text-xs text-gray-500">Unidad: {item.unidad}</p>
                      </div>
                    </div>
                  </td>

                  {/* Stock en Almacén */}
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-lg font-bold ${
                        item.nivelAlmacen === 'critico' ? 'text-red-600' :
                        item.nivelAlmacen === 'precaucion' ? 'text-amber-600' :
                        'text-green-600'
                      }`}>
                        {item.stockEnAlmacen.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">{item.unidad}</span>
                    </div>
                  </td>

                  {/* Extraído */}
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm text-gray-700 font-medium">
                      {item.stockExtraido.toFixed(2)}
                    </span>
                  </td>

                  {/* Disponible en Venta */}
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-lg font-bold ${
                        item.nivelVenta === 'critico' ? 'text-red-600' :
                        item.nivelVenta === 'precaucion' ? 'text-amber-600' :
                        'text-green-600'
                      }`}>
                        {item.stockDisponibleVenta.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">{item.unidad}</span>
                    </div>
                  </td>

                  {/* Vendido (mes actual) */}
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm text-purple-700 font-medium">
                      {item.stockVendido.toFixed(2)}
                    </span>
                  </td>

                  {/* Ventas último mes */}
                  <td className="px-4 py-4 text-center">
                    <span className="text-sm text-blue-700 font-medium">
                      {item.ventasUltimoMes.toFixed(2)}
                    </span>
                  </td>

                  {/* Estado Almacén */}
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-20 h-2 rounded-full ${getNivelColor(item.nivelAlmacen)}`}></div>
                      <span className={`text-xs font-semibold ${
                        item.nivelAlmacen === 'critico' ? 'text-red-700' :
                        item.nivelAlmacen === 'precaucion' ? 'text-amber-700' :
                        'text-green-700'
                      }`}>
                        {getNivelTexto(item.nivelAlmacen)}
                      </span>
                    </div>
                  </td>

                  {/* Estado Venta */}
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-20 h-2 rounded-full ${getNivelColor(item.nivelVenta)}`}></div>
                      <span className={`text-xs font-semibold ${
                        item.nivelVenta === 'critico' ? 'text-red-700' :
                        item.nivelVenta === 'precaucion' ? 'text-amber-700' :
                        'text-green-700'
                      }`}>
                        {getNivelTexto(item.nivelVenta)}
                      </span>
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col gap-2">
                      {item.debeExtraer && (
                        <button className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700">
                          <span>📦</span>
                          <span>Extraer</span>
                        </button>
                      )}
                      {item.debeComprar && (
                        <button className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700">
                          <span>🛒</span>
                          <span>Comprar</span>
                        </button>
                      )}
                      {!item.debeExtraer && !item.debeComprar && (
                        <span className="text-xs text-green-600 font-medium">✓ OK</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {filteredData.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Mostrando <strong>{filteredData.length}</strong> de <strong>{data.length}</strong> productos
            </p>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-gray-600">
                  Necesitan extracción: <strong className="text-purple-700">{countExtraer}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-600">
                  Necesitan compra: <strong className="text-blue-700">{countComprar}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}