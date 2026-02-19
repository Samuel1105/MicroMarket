"use server"

import { prisma } from "@/src/lib/prisma"

type WarehouseMovementParams = {
  startDate?: string
  endDate?: string
  tipoMovimiento?: number // 1=Ingreso, 2=Salida, 3=Ajuste
}

export async function getWarehouseMovements(params: WarehouseMovementParams = {}) {
  try {
    const startDate = params.startDate ? new Date(params.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = params.endDate ? new Date(params.endDate) : new Date()

    // Construir filtros
    const whereClause: any = {
      fechaRegistro: {
        gte: startDate,
        lte: endDate
      }
    }

    if (params.tipoMovimiento) {
      whereClause.tipoMovimiento = params.tipoMovimiento
    }

    // Obtener movimientos
    const movimientos = await prisma.movimientoAlmacen.findMany({
      where: whereClause,
      include: {
        Producto: {
          include: {
            Categoria: true
          }
        },
        UnidadMedida: true,
        Lote: true
      },
      orderBy: {
        fechaRegistro: 'desc'
      }
    })

    // Análisis por tipo de movimiento
    const ingresos = movimientos.filter(m => m.tipoMovimiento === 1)
    const salidas = movimientos.filter(m => m.tipoMovimiento === 2)
    const ajustes = movimientos.filter(m => m.tipoMovimiento === 3)

    // Totales por tipo
    const totalIngresosUnidades = ingresos.reduce((sum, m) => sum + m.cantidadUnidadesBase.toNumber(), 0)
    const totalSalidasUnidades = salidas.reduce((sum, m) => sum + m.cantidadUnidadesBase.toNumber(), 0)
    const totalAjustesUnidades = ajustes.reduce((sum, m) => sum + Math.abs(m.cantidadUnidadesBase.toNumber()), 0)

    // Movimientos por día
    const movimientosPorDia: Record<string, {
      fecha: string
      ingresos: number
      salidas: number
      ajustes: number
    }> = {}

    movimientos.forEach(m => {
      if (!m.fechaRegistro) return
      
      const fecha = m.fechaRegistro.toISOString().split('T')[0]
      
      if (!movimientosPorDia[fecha]) {
        movimientosPorDia[fecha] = {
          fecha,
          ingresos: 0,
          salidas: 0,
          ajustes: 0
        }
      }

      const unidades = m.cantidadUnidadesBase.toNumber()
      
      if (m.tipoMovimiento === 1) {
        movimientosPorDia[fecha].ingresos += unidades
      } else if (m.tipoMovimiento === 2) {
        movimientosPorDia[fecha].salidas += unidades
      } else if (m.tipoMovimiento === 3) {
        movimientosPorDia[fecha].ajustes += Math.abs(unidades)
      }
    })

    const movimientosDiarios = Object.values(movimientosPorDia)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

    // Movimientos por producto
    const productoMovimientos: Record<string, {
      producto: string
      categoria: string
      ingresos: number
      salidas: number
      ajustes: number
      neto: number
    }> = {}

    movimientos.forEach(m => {
      const producto = m.Producto.nombre
      
      if (!productoMovimientos[producto]) {
        productoMovimientos[producto] = {
          producto,
          categoria: m.Producto.Categoria.nombre,
          ingresos: 0,
          salidas: 0,
          ajustes: 0,
          neto: 0
        }
      }

      const unidades = m.cantidadUnidadesBase.toNumber()
      
      if (m.tipoMovimiento === 1) {
        productoMovimientos[producto].ingresos += unidades
        productoMovimientos[producto].neto += unidades
      } else if (m.tipoMovimiento === 2) {
        productoMovimientos[producto].salidas += unidades
        productoMovimientos[producto].neto -= unidades
      } else if (m.tipoMovimiento === 3) {
        productoMovimientos[producto].ajustes += unidades
        productoMovimientos[producto].neto += unidades
      }
    })

    const productoMovimientosArray = Object.values(productoMovimientos)
      .sort((a, b) => Math.abs(b.neto) - Math.abs(a.neto))

    // Productos con mayor movimiento
    const topMovimientos = productoMovimientosArray.slice(0, 15)

    // Detectar posibles irregularidades
    const irregularidades: Array<{
      tipo: 'ajuste_alto' | 'salida_sin_referencia' | 'entrada_sin_lote'
      producto: string
      cantidad: number
      fecha: string
      observaciones: string
    }> = []

    movimientos.forEach(m => {
      // Ajustes muy altos (más de 50 unidades)
      if (m.tipoMovimiento === 3 && Math.abs(m.cantidadUnidadesBase.toNumber()) > 50) {
        irregularidades.push({
          tipo: 'ajuste_alto',
          producto: m.Producto.nombre,
          cantidad: m.cantidadUnidadesBase.toNumber(),
          fecha: m.fechaRegistro?.toISOString().split('T')[0] || '',
          observaciones: m.observaciones || 'Sin observaciones'
        })
      }

      // Salidas sin referencia
      if (m.tipoMovimiento === 2 && !m.referenciaID) {
        irregularidades.push({
          tipo: 'salida_sin_referencia',
          producto: m.Producto.nombre,
          cantidad: m.cantidadUnidadesBase.toNumber(),
          fecha: m.fechaRegistro?.toISOString().split('T')[0] || '',
          observaciones: 'Salida sin referencia de venta'
        })
      }

      // Entradas sin lote
      if (m.tipoMovimiento === 1 && !m.loteID) {
        irregularidades.push({
          tipo: 'entrada_sin_lote',
          producto: m.Producto.nombre,
          cantidad: m.cantidadUnidadesBase.toNumber(),
          fecha: m.fechaRegistro?.toISOString().split('T')[0] || '',
          observaciones: 'Entrada sin número de lote'
        })
      }
    })

    // Mapear movimientos con información completa
    const movimientosDetallados = movimientos.map(m => ({
      id: m.id,
      fecha: m.fechaRegistro?.toISOString().split('T')[0] || '',
      hora: m.fechaRegistro?.toTimeString().split(' ')[0] || '',
      tipoMovimiento: m.tipoMovimiento,
      tipoMovimientoLabel: m.tipoMovimiento === 1 ? 'Ingreso' : m.tipoMovimiento === 2 ? 'Salida' : 'Ajuste',
      producto: m.Producto.nombre,
      categoria: m.Producto.Categoria.nombre,
      cantidad: m.cantidad.toNumber(),
      cantidadUnidadesBase: m.cantidadUnidadesBase.toNumber(),
      unidadMedida: m.UnidadMedida.nombre,
      lote: m.Lote?.numeroLote || null,
      referenciaID: m.referenciaID,
      tipoReferencia: m.tipoReferencia,
      observaciones: m.observaciones,
      usuarioID: m.usuarioIdRegistro
    }))

    // Estadísticas generales
    const saldoNeto = totalIngresosUnidades - totalSalidasUnidades + ajustes.reduce((sum, m) => sum + m.cantidadUnidadesBase.toNumber(), 0)
    
    const promedioIngresosDiario = movimientosDiarios.length > 0
      ? movimientosDiarios.reduce((sum, d) => sum + d.ingresos, 0) / movimientosDiarios.length
      : 0

    const promedioSalidasDiario = movimientosDiarios.length > 0
      ? movimientosDiarios.reduce((sum, d) => sum + d.salidas, 0) / movimientosDiarios.length
      : 0

    return {
      success: true,
      data: {
        movimientos: movimientosDetallados,
        movimientosDiarios,
        productoMovimientos: productoMovimientosArray,
        topMovimientos,
        irregularidades,
        estadisticas: {
          totalMovimientos: movimientos.length,
          totalIngresos: ingresos.length,
          totalSalidas: salidas.length,
          totalAjustes: ajustes.length,
          totalIngresosUnidades,
          totalSalidasUnidades,
          totalAjustesUnidades,
          saldoNeto,
          promedioIngresosDiario,
          promedioSalidasDiario,
          irregularidadesDetectadas: irregularidades.length
        },
        periodo: {
          inicio: startDate.toISOString().split('T')[0],
          fin: endDate.toISOString().split('T')[0]
        }
      }
    }

  } catch (error) {
    console.error("Error en getWarehouseMovements:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al analizar movimientos de almacén"
    }
  }
}