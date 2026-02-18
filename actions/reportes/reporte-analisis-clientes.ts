"use server"

import { prisma } from "@/src/lib/prisma"

type CustomerAnalysisParams = {
  startDate?: string
  endDate?: string
}

export async function getCustomerAnalysis(params: CustomerAnalysisParams = {}) {
  try {
    const startDate = params.startDate ? new Date(params.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = params.endDate ? new Date(params.endDate) : new Date()

    // Obtener todas las ventas del período con clientes y detalles
    const ventas = await prisma.venta.findMany({
      where: {
        estado: 1,
        fechaVenta: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        Cliente: true,
        DetalleVenta: {
          include: {
            StockVenta: {
              include: {
                Producto: {
                  include: {
                    Categoria: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        fechaVenta: 'asc'
      }
    })

    // ============================================
    // ANÁLISIS 1: DATOS POR CLIENTE
    // ============================================
    const clientesData: Record<number, {
      clienteID: number
      nombre: string
      carnet: string
      numeroCompras: number
      totalGastado: number
      ticketPromedio: number
      ultimaCompra: Date
      primeraCompra: Date
      productosComprados: Record<string, {
        producto: string
        categoria: string
        cantidad: number
        totalGastado: number
      }>
    }> = {}

    ventas.forEach(venta => {
      const clienteID = venta.Cliente.id
      
      if (!clientesData[clienteID]) {
        clientesData[clienteID] = {
          clienteID,
          nombre: venta.Cliente.nombre,
          carnet: venta.Cliente.carnet,
          numeroCompras: 0,
          totalGastado: 0,
          ticketPromedio: 0,
          ultimaCompra: venta.fechaVenta || new Date(),
          primeraCompra: venta.fechaVenta || new Date(),
          productosComprados: {}
        }
      }

      const cliente = clientesData[clienteID]
      cliente.numeroCompras += 1
      cliente.totalGastado += venta.total.toNumber()
      
      if (venta.fechaVenta) {
        if (venta.fechaVenta > cliente.ultimaCompra) {
          cliente.ultimaCompra = venta.fechaVenta
        }
        if (venta.fechaVenta < cliente.primeraCompra) {
          cliente.primeraCompra = venta.fechaVenta
        }
      }

      // Productos comprados por el cliente
      venta.DetalleVenta.forEach(detalle => {
        const productoNombre = detalle.StockVenta.Producto.nombre
        const categoriaNombre = detalle.StockVenta.Producto.Categoria.nombre
        
        if (!cliente.productosComprados[productoNombre]) {
          cliente.productosComprados[productoNombre] = {
            producto: productoNombre,
            categoria: categoriaNombre,
            cantidad: 0,
            totalGastado: 0
          }
        }
        
        cliente.productosComprados[productoNombre].cantidad += detalle.cantidadUnidadesBase.toNumber()
        cliente.productosComprados[productoNombre].totalGastado += detalle.total.toNumber()
      })
    })

    // Calcular ticket promedio
    Object.values(clientesData).forEach(cliente => {
      cliente.ticketPromedio = cliente.numeroCompras > 0 
        ? cliente.totalGastado / cliente.numeroCompras 
        : 0
    })

    const clientesArray = Object.values(clientesData)

    // ============================================
    // ANÁLISIS 2: SEGMENTACIÓN DE CLIENTES
    // ============================================
    
    // Calcular promedios para segmentación
    const promedioCompras = clientesArray.reduce((sum, c) => sum + c.numeroCompras, 0) / clientesArray.length
    const promedioGasto = clientesArray.reduce((sum, c) => sum + c.totalGastado, 0) / clientesArray.length

    const clientesSegmentados = clientesArray.map(cliente => {
      let segmento: 'vip' | 'frecuente' | 'ocasional' | 'nuevo'
      let valor: 'alto' | 'medio' | 'bajo'

      // Segmentar por frecuencia
      if (cliente.numeroCompras >= promedioCompras * 2) {
        segmento = 'vip'
      } else if (cliente.numeroCompras >= promedioCompras) {
        segmento = 'frecuente'
      } else if (cliente.numeroCompras >= 2) {
        segmento = 'ocasional'
      } else {
        segmento = 'nuevo'
      }

      // Segmentar por valor
      if (cliente.totalGastado >= promedioGasto * 1.5) {
        valor = 'alto'
      } else if (cliente.totalGastado >= promedioGasto * 0.7) {
        valor = 'medio'
      } else {
        valor = 'bajo'
      }

      return {
        ...cliente,
        segmento,
        valor
      }
    })

    // ============================================
    // ANÁLISIS 3: TOP CLIENTES
    // ============================================
    
    // Por frecuencia
    const topFrecuentes = [...clientesSegmentados]
      .sort((a, b) => b.numeroCompras - a.numeroCompras)
      .slice(0, 10)

    // Por gasto total
    const topGastadores = [...clientesSegmentados]
      .sort((a, b) => b.totalGastado - a.totalGastado)
      .slice(0, 10)

    // Por ticket promedio
    const topTicketPromedio = [...clientesSegmentados]
      .filter(c => c.numeroCompras >= 3) // Mínimo 3 compras
      .sort((a, b) => b.ticketPromedio - a.ticketPromedio)
      .slice(0, 10)

    // ============================================
    // ANÁLISIS 4: PRODUCTOS PREFERIDOS POR SEGMENTO
    // ============================================
    
    const productosPorSegmento: Record<string, Record<string, {
      producto: string
      cantidad: number
      totalGastado: number
    }>> = {
      vip: {},
      frecuente: {},
      ocasional: {},
      nuevo: {}
    }

    clientesSegmentados.forEach(cliente => {
      Object.values(cliente.productosComprados).forEach(prod => {
        if (!productosPorSegmento[cliente.segmento][prod.producto]) {
          productosPorSegmento[cliente.segmento][prod.producto] = {
            producto: prod.producto,
            cantidad: 0,
            totalGastado: 0
          }
        }
        productosPorSegmento[cliente.segmento][prod.producto].cantidad += prod.cantidad
        productosPorSegmento[cliente.segmento][prod.producto].totalGastado += prod.totalGastado
      })
    })

    const topProductosPorSegmento = {
      vip: Object.values(productosPorSegmento.vip).sort((a, b) => b.totalGastado - a.totalGastado).slice(0, 5),
      frecuente: Object.values(productosPorSegmento.frecuente).sort((a, b) => b.totalGastado - a.totalGastado).slice(0, 5),
      ocasional: Object.values(productosPorSegmento.ocasional).sort((a, b) => b.totalGastado - a.totalGastado).slice(0, 5),
      nuevo: Object.values(productosPorSegmento.nuevo).sort((a, b) => b.totalGastado - a.totalGastado).slice(0, 5)
    }

    // ============================================
    // ANÁLISIS 5: ESTADÍSTICAS GENERALES
    // ============================================
    
    const totalClientes = clientesSegmentados.length
    const clientesVIP = clientesSegmentados.filter(c => c.segmento === 'vip').length
    const clientesFrecuentes = clientesSegmentados.filter(c => c.segmento === 'frecuente').length
    const clientesOcasionales = clientesSegmentados.filter(c => c.segmento === 'ocasional').length
    const clientesNuevos = clientesSegmentados.filter(c => c.segmento === 'nuevo').length

    const totalVentas = ventas.length
    const totalIngresos = ventas.reduce((sum, v) => sum + v.total.toNumber(), 0)
    const ticketPromedioGeneral = totalVentas > 0 ? totalIngresos / totalVentas : 0
    const comprasPorCliente = totalClientes > 0 ? totalVentas / totalClientes : 0

    // Análisis de retención
    const clientesRecurrentes = clientesSegmentados.filter(c => c.numeroCompras > 1).length
    const tasaRetencion = totalClientes > 0 ? (clientesRecurrentes / totalClientes) * 100 : 0

    // Distribución de valor
    const clientesAltoValor = clientesSegmentados.filter(c => c.valor === 'alto').length
    const clientesMedioValor = clientesSegmentados.filter(c => c.valor === 'medio').length
    const clientesBajoValor = clientesSegmentados.filter(c => c.valor === 'bajo').length

    return {
      success: true,
      data: {
        clientes: clientesSegmentados,
        topFrecuentes,
        topGastadores,
        topTicketPromedio,
        topProductosPorSegmento,
        estadisticas: {
          totalClientes,
          clientesVIP,
          clientesFrecuentes,
          clientesOcasionales,
          clientesNuevos,
          clientesRecurrentes,
          tasaRetencion,
          clientesAltoValor,
          clientesMedioValor,
          clientesBajoValor,
          totalVentas,
          totalIngresos,
          ticketPromedioGeneral,
          comprasPorCliente,
          promedioCompras,
          promedioGasto
        },
        periodo: {
          inicio: startDate.toISOString().split('T')[0],
          fin: endDate.toISOString().split('T')[0]
        }
      }
    }

  } catch (error) {
    console.error("Error en getCustomerAnalysis:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al analizar clientes"
    }
  }
}