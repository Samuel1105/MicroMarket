'use server'

import { prisma } from '@/src/lib/prisma'
import { startOfMonth, endOfMonth, subMonths, format, differenceInDays } from 'date-fns'

// ============= 1. VENTAS DEL MES =============
export async function getVentasMensuales() {
  try {
    const hoy = new Date()
    const inicioMesActual = startOfMonth(hoy)
    const finMesActual = endOfMonth(hoy)
    const inicioMesAnterior = startOfMonth(subMonths(hoy, 1))
    const finMesAnterior = endOfMonth(subMonths(hoy, 1))

    // Ventas del mes actual agrupadas por día
    const ventasMesActual = await prisma.venta.groupBy({
      by: ['fechaVenta'],
      where: {
        fechaVenta: {
          gte: inicioMesActual,
          lte: finMesActual
        },
        estado: 1
      },
      _sum: {
        total: true
      },
      orderBy: {
        fechaVenta: 'asc'
      }
    })

    // Ventas del mes anterior
    const ventasMesAnterior = await prisma.venta.groupBy({
      by: ['fechaVenta'],
      where: {
        fechaVenta: {
          gte: inicioMesAnterior,
          lte: finMesAnterior
        },
        estado: 1
      },
      _sum: {
        total: true
      }
    })

    // Formatear datos para el gráfico
    const diasMesActual = ventasMesActual.map(v => ({
      fecha: format(v.fechaVenta!, 'dd/MM'),
      total: Number(v._sum.total || 0)
    }))

    const totalMesActual = diasMesActual.reduce((acc, curr) => acc + curr.total, 0)
    const totalMesAnterior = ventasMesAnterior.reduce((acc, curr) => acc + Number(curr._sum.total || 0), 0)
    const variacion = totalMesAnterior > 0 
      ? ((totalMesActual - totalMesAnterior) / totalMesAnterior) * 100 
      : 0

    return {
      ventas: diasMesActual,
      totalMesActual,
      totalMesAnterior,
      variacion: Number(variacion.toFixed(2))
    }
  } catch (error) {
    console.error('Error al obtener ventas mensuales:', error)
    return { ventas: [], totalMesActual: 0, totalMesAnterior: 0, variacion: 0 }
  }
}

// ============= 2. TOP 10 PRODUCTOS MÁS VENDIDOS =============
// MEJORADO: Ahora agrupa por producto, no por stockVenta (evita duplicados)
export async function getTop10ProductosVendidos() {
  try {
    const inicioMes = startOfMonth(new Date())
    
    // Obtener ventas agrupadas por producto
    const ventasPorProducto = await prisma.$queryRaw<Array<{
      productoID: number
      totalVendido: number
    }>>`
      SELECT 
        p.id as productoID,
        SUM(CAST(dv.cantidadUnidadesBase AS DECIMAL(18,2))) as totalVendido
      FROM DetalleVenta dv
      INNER JOIN StockVenta sv ON dv.stockVentaID = sv.id
      INNER JOIN Producto p ON sv.productoID = p.id
      INNER JOIN Venta v ON dv.ventaID = v.id
      WHERE v.fechaVenta >= ${inicioMes}
        AND v.estado = 1
      GROUP BY p.id
      ORDER BY totalVendido DESC
      OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
    `

    // Obtener información de los productos
    const productoIds = ventasPorProducto.map(p => p.productoID)
    const productos = await prisma.producto.findMany({
      where: {
        id: { in: productoIds }
      },
      include: {
        UnidadMedida: true
      }
    })

    const resultado = ventasPorProducto.map(vp => {
      const producto = productos.find(p => p.id === vp.productoID)
      return {
        nombre: producto?.nombre || 'Desconocido',
        cantidad: Number(vp.totalVendido),
        unidad: producto?.UnidadMedida.abreviatura || ''
      }
    })

    return resultado
  } catch (error) {
    console.error('Error al obtener top productos:', error)
    return []
  }
}

// ============= 3. DISTRIBUCIÓN POR CATEGORÍA =============
export async function getVentasPorCategoria() {
  try {
    const inicioMes = startOfMonth(new Date())

    const ventasPorCategoria = await prisma.$queryRaw<Array<{
      categoria: string
      total: number
    }>>`
      SELECT 
        c.nombre as categoria,
        SUM(CAST(dv.total AS DECIMAL(18,2))) as total
      FROM DetalleVenta dv
      INNER JOIN StockVenta sv ON dv.stockVentaID = sv.id
      INNER JOIN Producto p ON sv.productoID = p.id
      INNER JOIN Categoria c ON p.categoriaID = c.id
      INNER JOIN Venta v ON dv.ventaID = v.id
      WHERE v.fechaVenta >= ${inicioMes}
        AND v.estado = 1
      GROUP BY c.nombre
      ORDER BY total DESC
    `

    return ventasPorCategoria.map(vc => ({
      nombre: vc.categoria,
      valor: Number(vc.total)
    }))
  } catch (error) {
    console.error('Error al obtener ventas por categoría:', error)
    return []
  }
}

// ============= 4. ALERTAS DE STOCK CRÍTICO =============
// MEJORADO: Considera TODOS los productos, incluso los que nunca se sacaron a StockVenta
export async function getStockCritico() {
  try {
    // 1. Obtener TODOS los productos activos
    const todosProductos = await prisma.producto.findMany({
      where: { estado: 1 },
      include: { UnidadMedida: true }
    })

    // 2. Calcular stock disponible en almacén (Lotes) para cada producto
    const stockPorProducto = await prisma.$queryRaw<Array<{
      productoID: number
      stockAlmacen: number
    }>>`
      SELECT 
        productoID,
        SUM(CAST(cantidadInicialUnidadesBase AS DECIMAL(18,2))) as stockAlmacen
      FROM Lote
      WHERE estado = 1
      GROUP BY productoID
    `

    // 3. Calcular lo que ya se sacó a StockVenta
    const stockEnVenta = await prisma.stockVenta.groupBy({
      by: ['productoID'],
      where: { estado: 1 },
      _sum: {
        cantidadUnidadesBase: true
      }
    })

    // 4. Obtener ventas del último mes
    const inicioMes = startOfMonth(subMonths(new Date(), 1))
    const ventasUltimoMes = await prisma.$queryRaw<Array<{
      productoID: number
      totalVendido: number
    }>>`
      SELECT 
        p.id as productoID,
        SUM(CAST(dv.cantidadUnidadesBase AS DECIMAL(18,2))) as totalVendido
      FROM DetalleVenta dv
      INNER JOIN StockVenta sv ON dv.stockVentaID = sv.id
      INNER JOIN Producto p ON sv.productoID = p.id
      INNER JOIN Venta v ON dv.ventaID = v.id
      WHERE v.fechaVenta >= ${inicioMes}
        AND v.estado = 1
      GROUP BY p.id
    `

    // 5. Calcular alertas
    const alertas = []
    for (const producto of todosProductos) {
      // Stock total en almacén (lotes)
      const stockAlm = stockPorProducto.find(s => s.productoID === producto.id)
      const totalAlmacen = Number(stockAlm?.stockAlmacen || 0)

      // Stock en venta
      const stockVta = stockEnVenta.find(s => s.productoID === producto.id)
      const totalEnVenta = Number(stockVta?._sum.cantidadUnidadesBase || 0)

      // Stock disponible real = Almacén - Ya sacado a venta
      const stockDisponible = totalAlmacen - totalEnVenta

      // Ventas mensuales
      const ventas = ventasUltimoMes.find(v => v.productoID === producto.id)
      const ventaMensual = Number(ventas?.totalVendido || 0)

      // Stock óptimo = 1.5x ventas mensuales (o 10 unidades mínimo si no hay ventas)
      const stockOptimo = ventaMensual > 0 ? ventaMensual * 1.5 : 10

      const porcentaje = stockOptimo > 0 ? (stockDisponible / stockOptimo) * 100 : 100
      let nivel: 'critico' | 'precaucion' | 'normal' = 'normal'
      
      if (porcentaje < 25) nivel = 'critico'
      else if (porcentaje < 50) nivel = 'precaucion'

      if (nivel !== 'normal') {
        alertas.push({
          nombre: producto.nombre,
          cantidadActual: stockDisponible,
          stockOptimo,
          porcentaje: Number(porcentaje.toFixed(2)),
          nivel,
          unidad: producto.UnidadMedida.abreviatura || ''
        })
      }
    }

    return alertas
      .sort((a, b) => a.porcentaje - b.porcentaje)
      .slice(0, 15)
  } catch (error) {
    console.error('Error al obtener stock crítico:', error)
    return []
  }
}

// ============= 5. PRODUCTOS PRÓXIMOS A VENCER =============
// MEJORADO: Agrupa por lote y considera TODOS los lotes (no solo StockVenta)
export async function getProductosProximosVencer() {
  try {
    const hoy = new Date()
    const en30Dias = new Date()
    en30Dias.setDate(hoy.getDate() + 30)

    // Obtener lotes próximos a vencer con cantidad disponible
    const lotesProximosVencer = await prisma.$queryRaw<Array<{
      numeroLote: string
      productoID: number
      productoNombre: string
      unidadAbrev: string
      fechaVencimiento: Date
      cantidadInicialLote: number
      cantidadEnStockVenta: number
    }>>`
      SELECT 
        l.numeroLote,
        l.productoID,
        p.nombre as productoNombre,
        um.abreviatura as unidadAbrev,
        l.fechaVencimiento,
        l.cantidadInicialUnidadesBase as cantidadInicialLote,
        ISNULL(SUM(sv.cantidadUnidadesBase), 0) as cantidadEnStockVenta
      FROM Lote l
      INNER JOIN Producto p ON l.productoID = p.id
      INNER JOIN UnidadMedida um ON p.unidadBaseID = um.id
      LEFT JOIN StockVenta sv ON l.id = sv.loteID AND sv.estado = 1
      WHERE l.fechaVencimiento >= ${hoy}
        AND l.fechaVencimiento <= ${en30Dias}
        AND l.estado = 1
      GROUP BY l.numeroLote, l.productoID, p.nombre, um.abreviatura, l.fechaVencimiento, l.cantidadInicialUnidadesBase
      ORDER BY l.fechaVencimiento ASC
    `

    // Calcular cantidad disponible real (inicial - lo que ya se sacó a venta)
    return lotesProximosVencer
      .map(lote => {
        const cantidadDisponible = Number(lote.cantidadInicialLote) - Number(lote.cantidadEnStockVenta)
        
        // Solo incluir si tiene cantidad disponible
        if (cantidadDisponible <= 0) return null

        return {
          producto: lote.productoNombre,
          lote: lote.numeroLote,
          cantidad: cantidadDisponible,
          unidad: lote.unidadAbrev || '',
          fechaVencimiento: lote.fechaVencimiento,
          diasRestantes: differenceInDays(lote.fechaVencimiento, hoy)
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 20)
  } catch (error) {
    console.error('Error al obtener productos próximos a vencer:', error)
    return []
  }
}

// ============= 6. MOVIMIENTOS DE ALMACÉN =============
export async function getMovimientosAlmacen() {
  try {
    const inicioMes = startOfMonth(new Date())
    const finMes = endOfMonth(new Date())

    const movimientos = await prisma.movimientoAlmacen.groupBy({
      by: ['fechaRegistro', 'tipoMovimiento'],
      where: {
        fechaRegistro: {
          gte: inicioMes,
          lte: finMes
        }
      },
      _sum: {
        cantidadUnidadesBase: true
      },
      orderBy: {
        fechaRegistro: 'asc'
      }
    })

    // Agrupar por fecha
    const movimientosPorFecha = new Map<string, { entradas: number, salidas: number }>()
    
    movimientos.forEach(mov => {
      if (mov.fechaRegistro) {
        const fecha = format(mov.fechaRegistro, 'dd/MM')
        const actual = movimientosPorFecha.get(fecha) || { entradas: 0, salidas: 0 }
        const cantidad = Number(mov._sum.cantidadUnidadesBase || 0)
        
        // tipoMovimiento: 1=Entrada, 2=Salida (ajusta según tu lógica)
        if (mov.tipoMovimiento === 1) {
          actual.entradas += cantidad
        } else {
          actual.salidas += cantidad
        }
        
        movimientosPorFecha.set(fecha, actual)
      }
    })

    return Array.from(movimientosPorFecha.entries()).map(([fecha, datos]) => ({
      fecha,
      entradas: datos.entradas,
      salidas: datos.salidas
    }))
  } catch (error) {
    console.error('Error al obtener movimientos de almacén:', error)
    return []
  }
}