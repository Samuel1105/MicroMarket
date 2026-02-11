"use server"

import { prisma } from "@/src/lib/prisma"

type InvestmentRecoveryParams = {
  startDate?: string
  endDate?: string
}

export async function getInvestmentRecovery(params: InvestmentRecoveryParams = {}) {
  try {
    // Construir el filtro de fechas si se proporcionan
    const dateFilter = params.startDate && params.endDate ? {
      DetalleCompra: {
        Compra: {
          fechaRegistro: {
            gte: new Date(params.startDate),
            lte: new Date(params.endDate)
          }
        }
      }
    } : {}

    // Obtener todos los lotes cuya COMPRA esté en el rango de fechas
    const lotes = await prisma.lote.findMany({
      where: {
        estado: 1,
        ...dateFilter
      },
      include: {
        Producto: {
          include: {
            Categoria: true,
            Proveedor: true
          }
        },
        DetalleCompra: {
          include: {
            Compra: true,
            UnidadMedida: true
          }
        },
        StockVenta: {
          where: {
            estado: 1
          },
          include: {
            DetalleVenta: {
              where: {
                Venta: {
                  estado: 1,
                  ...(params.startDate && params.endDate ? {
                    fechaVenta: {
                      gte: new Date(params.startDate),
                      lte: new Date(params.endDate)
                    }
                  } : {})
                }
              },
              include: {
                Venta: true
              }
            }
          }
        }
      }
    })

    // Obtener conversiones de unidades
    const conversiones = await prisma.conversionUnidad.findMany({
      where: {
        estado: 1
      }
    })

    // Analizar cada lote
    const analisisLotes = lotes.map(lote => {
      const detalleCompra = lote.DetalleCompra

      // Calcular inversión total del lote
      const inversionTotal = detalleCompra.total.toNumber()
      
      // Calcular costo por unidad base
      const conversion = conversiones.find(
        c => c.productoID === lote.productoID && 
             c.unidadOrigenID === detalleCompra.unidadMedidaID
      )
      const factorConversion = conversion?.factorConversion.toNumber() || 1
      const cantidadUnidadesBaseCompradas = detalleCompra.cantidadComprada.toNumber() * factorConversion
      const costoUnitarioBase = inversionTotal / cantidadUnidadesBaseCompradas

      // Calcular ventas de este lote
      let unidadesVendidasDelLote = 0
      let ingresosDelLote = 0

      lote.StockVenta.forEach(stock => {
        stock.DetalleVenta.forEach(detalleVenta => {
          // El filtro ya está aplicado en el query de Prisma, así que solo sumamos
          unidadesVendidasDelLote += detalleVenta.cantidadUnidadesBase.toNumber()
          ingresosDelLote += detalleVenta.total.toNumber()
        })
      })

      // Calcular métricas
      const costoVendido = unidadesVendidasDelLote * costoUnitarioBase
      const utilidadAcumulada = ingresosDelLote - costoVendido
      const porcentajeVendido = cantidadUnidadesBaseCompradas > 0
        ? (unidadesVendidasDelLote / cantidadUnidadesBaseCompradas) * 100
        : 0
      const porcentajeRecuperacion = inversionTotal > 0
        ? (ingresosDelLote / inversionTotal) * 100
        : 0
      const unidadesRestantes = cantidadUnidadesBaseCompradas - unidadesVendidasDelLote
      const valorInventarioRestante = unidadesRestantes * costoUnitarioBase

      // Estado del lote
      let estadoRecuperacion: 'critico' | 'bajo' | 'medio' | 'bueno' | 'recuperado'
      if (porcentajeRecuperacion >= 100) {
        estadoRecuperacion = 'recuperado'
      } else if (porcentajeVendido >= 50) {
        estadoRecuperacion = 'bueno'
      } else if (porcentajeVendido >= 25) {
        estadoRecuperacion = 'medio'
      } else if (porcentajeVendido >= 10) {
        estadoRecuperacion = 'bajo'
      } else {
        estadoRecuperacion = 'critico'
      }

      return {
        loteID: lote.id,
        numeroLote: lote.numeroLote,
        producto: lote.Producto.nombre,
        categoria: lote.Producto.Categoria.nombre,
        proveedor: lote.Producto.Proveedor.nombre,
        fechaCompra: lote.DetalleCompra.Compra.fechaRegistro,
        fechaVencimiento: lote.fechaVencimiento,
        
        // Inversión
        inversionTotal,
        cantidadComprada: cantidadUnidadesBaseCompradas,
        costoUnitario: costoUnitarioBase,
        
        // Ventas
        unidadesVendidas: unidadesVendidasDelLote,
        ingresosObtenidos: ingresosDelLote,
        costoVendido,
        utilidadAcumulada,
        
        // Inventario restante
        unidadesRestantes,
        valorInventarioRestante,
        
        // Métricas de recuperación
        porcentajeVendido,
        porcentajeRecuperacion,
        estadoRecuperacion,
        
        // Proyección
        faltaVender: inversionTotal - ingresosDelLote,
        unidadesNecesariasParaRecuperar: Math.ceil((inversionTotal - ingresosDelLote) / costoUnitarioBase)
      }
    })

    // Ordenar por estado de recuperación (críticos primero)
    const ordenEstado = {
      'critico': 0,
      'bajo': 1,
      'medio': 2,
      'bueno': 3,
      'recuperado': 4
    }
    analisisLotes.sort((a, b) => ordenEstado[a.estadoRecuperacion] - ordenEstado[b.estadoRecuperacion])

    // Calcular estadísticas globales
    const totalInvertido = analisisLotes.reduce((sum, l) => sum + l.inversionTotal, 0)
    const totalRecuperado = analisisLotes.reduce((sum, l) => sum + l.ingresosObtenidos, 0)
    const totalUtilidad = analisisLotes.reduce((sum, l) => sum + l.utilidadAcumulada, 0)
    const totalInventarioRestante = analisisLotes.reduce((sum, l) => sum + l.valorInventarioRestante, 0)
    const porcentajeRecuperacionGlobal = totalInvertido > 0 ? (totalRecuperado / totalInvertido) * 100 : 0

    const lotesCriticos = analisisLotes.filter(l => l.estadoRecuperacion === 'critico').length
    const lotesBajos = analisisLotes.filter(l => l.estadoRecuperacion === 'bajo').length
    const lotesMedios = analisisLotes.filter(l => l.estadoRecuperacion === 'medio').length
    const lotesBuenos = analisisLotes.filter(l => l.estadoRecuperacion === 'bueno').length
    const lotesRecuperados = analisisLotes.filter(l => l.estadoRecuperacion === 'recuperado').length

    // Agrupar por producto
    const inversionPorProducto = analisisLotes.reduce((acc, lote) => {
      if (!acc[lote.producto]) {
        acc[lote.producto] = {
          producto: lote.producto,
          categoria: lote.categoria,
          totalInvertido: 0,
          totalRecuperado: 0,
          totalUtilidad: 0,
          unidadesPendientes: 0,
          valorInventarioRestante: 0,
          numeroLotes: 0,
          // Nuevas métricas para el análisis del período
          unidadesCompradas: 0,
          unidadesVendidas: 0,
          costoTotal: 0,
          ingresosTotal: 0
        }
      }
      
      acc[lote.producto].totalInvertido += lote.inversionTotal
      acc[lote.producto].totalRecuperado += lote.ingresosObtenidos
      acc[lote.producto].totalUtilidad += lote.utilidadAcumulada
      acc[lote.producto].unidadesPendientes += lote.unidadesRestantes
      acc[lote.producto].valorInventarioRestante += lote.valorInventarioRestante
      acc[lote.producto].numeroLotes += 1
      
      // Acumular para análisis del período
      acc[lote.producto].unidadesCompradas += lote.cantidadComprada
      acc[lote.producto].unidadesVendidas += lote.unidadesVendidas
      acc[lote.producto].costoTotal += lote.inversionTotal
      acc[lote.producto].ingresosTotal += lote.ingresosObtenidos
      
      return acc
    }, {} as Record<string, any>)

    const productosMayorInversion = Object.values(inversionPorProducto)
      .map((p: any) => ({
        ...p,
        porcentajeRecuperacion: p.totalInvertido > 0 ? (p.totalRecuperado / p.totalInvertido) * 100 : 0
      }))
      .sort((a, b) => b.valorInventarioRestante - a.valorInventarioRestante)
      .slice(0, 10)

    // Crear análisis por producto para el período
    const analisisPorProducto = Object.values(inversionPorProducto)
      .map((p: any) => ({
        producto: p.producto,
        categoria: p.categoria,
        unidadesCompradas: p.unidadesCompradas,
        unidadesVendidas: p.unidadesVendidas,
        costoTotal: p.costoTotal,
        ingresosTotal: p.ingresosTotal,
        utilidadTotal: p.ingresosTotal - p.costoTotal,
        margenUtilidad: p.ingresosTotal > 0 ? ((p.ingresosTotal - p.costoTotal) / p.ingresosTotal) * 100 : 0,
        porcentajeVendido: p.unidadesCompradas > 0 ? (p.unidadesVendidas / p.unidadesCompradas) * 100 : 0
      }))
      .sort((a, b) => b.utilidadTotal - a.utilidadTotal)

    return {
      success: true,
      data: {
        lotes: analisisLotes,
        estadisticas: {
          totalInvertido,
          totalRecuperado,
          totalUtilidad,
          totalInventarioRestante,
          porcentajeRecuperacionGlobal,
          dineroEnRiesgo: totalInventarioRestante,
          
          lotesCriticos,
          lotesBajos,
          lotesMedios,
          lotesBuenos,
          lotesRecuperados,
          totalLotes: analisisLotes.length
        },
        productosMayorInversion,
        analisisPorProducto
      }
    }

  } catch (error) {
    console.error("Error en getInvestmentRecovery:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al calcular recuperación de inversión"
    }
  }
}