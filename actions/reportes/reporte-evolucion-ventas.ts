"use server"

import { prisma } from "@/src/lib/prisma"

type SalesEvolutionParams = {
  startDate?: string
  endDate?: string
}

export async function getSalesEvolution(params: SalesEvolutionParams = {}) {
  try {
    const startDate = params.startDate ? new Date(params.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = params.endDate ? new Date(params.endDate) : new Date()

    // Calcular período anterior para comparación
    const diasDiferencia = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const startDateAnterior = new Date(startDate.getTime() - diasDiferencia * 24 * 60 * 60 * 1000)
    const endDateAnterior = new Date(startDate.getTime() - 1)

    // Obtener ventas del período actual
    const ventasPeriodoActual = await prisma.venta.findMany({
      where: {
        estado: 1,
        fechaVenta: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
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

    // Obtener ventas del período anterior
    const ventasPeriodoAnterior = await prisma.venta.findMany({
      where: {
        estado: 1,
        fechaVenta: {
          gte: startDateAnterior,
          lte: endDateAnterior
        }
      },
      select: {
        total: true
      }
    })

    // ============================================
    // ANÁLISIS 1: VENTAS POR DÍA
    // ============================================
    const ventasPorDia: Record<string, { fecha: string; total: number; cantidad: number }> = {}
    
    ventasPeriodoActual.forEach(venta => {
      if (!venta.fechaVenta) return
      
      const fechaStr = venta.fechaVenta.toISOString().split('T')[0]
      
      if (!ventasPorDia[fechaStr]) {
        ventasPorDia[fechaStr] = {
          fecha: fechaStr,
          total: 0,
          cantidad: 0
        }
      }
      
      ventasPorDia[fechaStr].total += venta.total.toNumber()
      ventasPorDia[fechaStr].cantidad += 1
    })

    const ventasDiarias = Object.values(ventasPorDia).sort((a, b) => 
      new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    )

    // ============================================
    // ANÁLISIS 2: VENTAS POR DÍA DE LA SEMANA
    // ============================================
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const ventasPorDiaSemana: Record<string, { total: number; cantidad: number }> = {}
    
    diasSemana.forEach(dia => {
      ventasPorDiaSemana[dia] = { total: 0, cantidad: 0 }
    })

    ventasPeriodoActual.forEach(venta => {
      if (!venta.fechaVenta) return
      
      const diaSemana = diasSemana[venta.fechaVenta.getDay()]
      ventasPorDiaSemana[diaSemana].total += venta.total.toNumber()
      ventasPorDiaSemana[diaSemana].cantidad += 1
    })

    const ventasPorSemana = diasSemana.map(dia => ({
      dia,
      total: ventasPorDiaSemana[dia].total,
      cantidad: ventasPorDiaSemana[dia].cantidad,
      promedio: ventasPorDiaSemana[dia].cantidad > 0 
        ? ventasPorDiaSemana[dia].total / ventasPorDiaSemana[dia].cantidad 
        : 0
    }))

    // ============================================
    // ANÁLISIS 3: PRODUCTOS MÁS VENDIDOS
    // ============================================
    const productosTotales: Record<string, {
      producto: string
      categoria: string
      cantidadVendida: number
      totalVentas: number
      numeroVentas: number
    }> = {}

    ventasPeriodoActual.forEach(venta => {
      venta.DetalleVenta.forEach(detalle => {
        const producto = detalle.StockVenta.Producto.nombre
        const categoria = detalle.StockVenta.Producto.Categoria.nombre
        
        if (!productosTotales[producto]) {
          productosTotales[producto] = {
            producto,
            categoria,
            cantidadVendida: 0,
            totalVentas: 0,
            numeroVentas: 0
          }
        }
        
        productosTotales[producto].cantidadVendida += detalle.cantidadUnidadesBase.toNumber()
        productosTotales[producto].totalVentas += detalle.total.toNumber()
        productosTotales[producto].numeroVentas += 1
      })
    })

    const topProductos = Object.values(productosTotales)
      .sort((a, b) => b.totalVentas - a.totalVentas)
      .slice(0, 10)

    // ============================================
    // ANÁLISIS 4: VENTAS POR CATEGORÍA
    // ============================================
    const ventasPorCategoria: Record<string, number> = {}

    ventasPeriodoActual.forEach(venta => {
      venta.DetalleVenta.forEach(detalle => {
        const categoria = detalle.StockVenta.Producto.Categoria.nombre
        
        if (!ventasPorCategoria[categoria]) {
          ventasPorCategoria[categoria] = 0
        }
        
        ventasPorCategoria[categoria] += detalle.total.toNumber()
      })
    })

    const categorias = Object.entries(ventasPorCategoria)
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total)

    // ============================================
    // ANÁLISIS 5: MÉTRICAS GENERALES Y COMPARACIÓN
    // ============================================
    const totalVentasActual = ventasPeriodoActual.reduce((sum, v) => sum + v.total.toNumber(), 0)
    const totalVentasAnterior = ventasPeriodoAnterior.reduce((sum, v) => sum + v.total.toNumber(), 0)
    
    const numeroVentasActual = ventasPeriodoActual.length
    const numeroVentasAnterior = ventasPeriodoAnterior.length
    
    const promedioVentaActual = numeroVentasActual > 0 ? totalVentasActual / numeroVentasActual : 0
    const promedioVentaAnterior = numeroVentasAnterior > 0 ? totalVentasAnterior / numeroVentasAnterior : 0

    const crecimientoTotal = totalVentasAnterior > 0 
      ? ((totalVentasActual - totalVentasAnterior) / totalVentasAnterior) * 100 
      : 0

    const crecimientoNumero = numeroVentasAnterior > 0 
      ? ((numeroVentasActual - numeroVentasAnterior) / numeroVentasAnterior) * 100 
      : 0

    const crecimientoPromedio = promedioVentaAnterior > 0 
      ? ((promedioVentaActual - promedioVentaAnterior) / promedioVentaAnterior) * 100 
      : 0

    // ============================================
    // ANÁLISIS 6: TENDENCIA
    // ============================================
    let tendencia: 'subiendo' | 'bajando' | 'estable' = 'estable'
    
    if (ventasDiarias.length >= 2) {
      const primerasMitad = ventasDiarias.slice(0, Math.floor(ventasDiarias.length / 2))
      const segundaMitad = ventasDiarias.slice(Math.floor(ventasDiarias.length / 2))
      
      const promedioPrimera = primerasMitad.reduce((sum, d) => sum + d.total, 0) / primerasMitad.length
      const promedioSegunda = segundaMitad.reduce((sum, d) => sum + d.total, 0) / segundaMitad.length
      
      const diferencia = ((promedioSegunda - promedioPrimera) / promedioPrimera) * 100
      
      if (diferencia > 10) tendencia = 'subiendo'
      else if (diferencia < -10) tendencia = 'bajando'
    }

    // ============================================
    // ANÁLISIS 7: MEJOR Y PEOR DÍA
    // ============================================
    let mejorDia = ventasDiarias.length > 0 
      ? ventasDiarias.reduce((max, dia) => dia.total > max.total ? dia : max, ventasDiarias[0])
      : null

    let peorDia = ventasDiarias.length > 0 
      ? ventasDiarias.reduce((min, dia) => dia.total < min.total ? dia : min, ventasDiarias[0])
      : null

    return {
      success: true,
      data: {
        ventasDiarias,
        ventasPorSemana,
        topProductos,
        categorias,
        estadisticas: {
          totalVentas: totalVentasActual,
          numeroVentas: numeroVentasActual,
          promedioVenta: promedioVentaActual,
          
          // Período anterior
          totalVentasAnterior,
          numeroVentasAnterior,
          promedioVentaAnterior,
          
          // Crecimiento
          crecimientoTotal,
          crecimientoNumero,
          crecimientoPromedio,
          
          // Tendencia
          tendencia,
          
          // Mejores días
          mejorDia,
          peorDia
        },
        periodo: {
          inicio: startDate.toISOString().split('T')[0],
          fin: endDate.toISOString().split('T')[0],
          dias: diasDiferencia
        }
      }
    }

  } catch (error) {
    console.error("Error en getSalesEvolution:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al calcular evolución de ventas"
    }
  }
}