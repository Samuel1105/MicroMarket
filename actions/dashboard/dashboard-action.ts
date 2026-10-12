'use server'

import { prisma } from '@/src/lib/prisma'
import { fechaCorta, finMesBolivia, getBoliviaTime, hoyBolivia, inicioMesBolivia } from '@/src/utils/date'

// ============= 1. VENTAS DEL MES =============
export async function getVentasMensuales() {
  try {
    const hoy = getBoliviaTime()
    const inicioMesActual = inicioMesBolivia(hoy)
    const finMesActual = finMesBolivia(hoy)
    const inicioMesAnterior = inicioMesBolivia(hoy, -1)
    const finMesAnterior = finMesBolivia(hoy, -1)

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
      fecha: fechaCorta(v.fechaVenta!),
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
    const inicioMes = inicioMesBolivia()
    
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
    const inicioMes = inicioMesBolivia()

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
// actions/dashboard/dashboard-action.ts
// ============= INVENTARIO COMPLETO CON ALERTAS =============
export async function getInventarioCompleto() {
  try {
    const hoy = getBoliviaTime()
    const inicioMesActual = inicioMesBolivia(hoy)
    const inicioMesAnterior = inicioMesBolivia(hoy, -1)

    const inventario = await prisma.$queryRaw<Array<{
      productoID: number
      productoNombre: string
      unidadAbrev: string
      stockEnAlmacen: number      // Lo que hay en Lote (comprado)
      stockExtraido: number        // Lo que se sacó inicialmente (StockVenta.cantidadUnidadesBase)
      stockDisponibleVenta: number // Lo que queda para vender (StockVenta.cantidadDisponible)
      stockVendidoMesActual: number // Vendido en el mes actual
      ventasUltimoMes: number      // Vendido el mes pasado
    }>>`
      WITH StockAlmacen AS (
        -- Total comprado y en almacén (Lotes activos)
        SELECT 
          productoID,
          SUM(CAST(cantidadInicialUnidadesBase AS DECIMAL(18,2))) as totalAlmacen
        FROM Lote
        WHERE estado = 1
        GROUP BY productoID
      ),
      StockExtraido AS (
        -- Total extraído del almacén (cantidad inicial en StockVenta)
        SELECT 
          productoID,
          SUM(CAST(cantidadUnidadesBase AS DECIMAL(18,2))) as totalExtraido
        FROM StockVenta
        WHERE estado = 1
        GROUP BY productoID
      ),
      StockDisponibleVenta AS (
        -- Stock disponible en punto de venta
        SELECT 
          productoID,
          SUM(CAST(cantidadDisponible AS DECIMAL(18,2))) as disponibleVenta
        FROM StockVenta
        WHERE estado = 1
        GROUP BY productoID
      ),
      VentasMesActual AS (
        -- Ventas del mes actual
        SELECT 
          p.id as productoID,
          SUM(CAST(dv.cantidadUnidadesBase AS DECIMAL(18,2))) as vendidoMesActual
        FROM DetalleVenta dv
        INNER JOIN StockVenta sv ON dv.stockVentaID = sv.id
        INNER JOIN Producto p ON sv.productoID = p.id
        INNER JOIN Venta v ON dv.ventaID = v.id
        WHERE v.fechaVenta >= ${inicioMesActual}
          AND v.estado = 1
        GROUP BY p.id
      ),
      VentasUltimoMes AS (
        -- Ventas del mes anterior
        SELECT 
          p.id as productoID,
          SUM(CAST(dv.cantidadUnidadesBase AS DECIMAL(18,2))) as ventasUltimoMes
        FROM DetalleVenta dv
        INNER JOIN StockVenta sv ON dv.stockVentaID = sv.id
        INNER JOIN Producto p ON sv.productoID = p.id
        INNER JOIN Venta v ON dv.ventaID = v.id
        WHERE v.fechaVenta >= ${inicioMesAnterior}
          AND v.fechaVenta < ${inicioMesActual}
          AND v.estado = 1
        GROUP BY p.id
      )
      SELECT 
        p.id as productoID,
        p.nombre as productoNombre,
        um.abreviatura as unidadAbrev,
        ISNULL(sa.totalAlmacen, 0) as stockEnAlmacen,
        ISNULL(se.totalExtraido, 0) as stockExtraido,
        ISNULL(sdv.disponibleVenta, 0) as stockDisponibleVenta,
        ISNULL(vma.vendidoMesActual, 0) as stockVendidoMesActual,
        ISNULL(vum.ventasUltimoMes, 0) as ventasUltimoMes
      FROM Producto p
      INNER JOIN UnidadMedida um ON p.unidadBaseID = um.id
      LEFT JOIN StockAlmacen sa ON p.id = sa.productoID
      LEFT JOIN StockExtraido se ON p.id = se.productoID
      LEFT JOIN StockDisponibleVenta sdv ON p.id = sdv.productoID
      LEFT JOIN VentasMesActual vma ON p.id = vma.productoID
      LEFT JOIN VentasUltimoMes vum ON p.id = vum.productoID
      WHERE p.estado = 1
      ORDER BY p.nombre
    `

    // Procesar y calcular alertas
    const resultado = inventario.map(item => {
      // Stock real en almacén = Comprado - Extraído
      const stockRealAlmacen = Number(item.stockEnAlmacen) - Number(item.stockExtraido)
      const stockEnVenta = Number(item.stockDisponibleVenta)
      const ventasMes = Number(item.ventasUltimoMes)
      
      // Determinar si tiene movimiento
      const tieneMovimiento = Number(item.stockExtraido) > 0 || ventasMes > 0

      // Stock óptimo basado en ventas (2x para seguridad)
      const stockOptimoAlmacen = tieneMovimiento ? Math.max(ventasMes * 2, 20) : 50
      const stockOptimoVenta = tieneMovimiento ? Math.max(ventasMes * 1.5, 15) : 30

      // Calcular niveles
      const porcentajeAlmacen = (stockRealAlmacen / stockOptimoAlmacen) * 100
      const porcentajeVenta = (stockEnVenta / stockOptimoVenta) * 100

      let nivelAlmacen: 'critico' | 'precaucion' | 'normal' = 'normal'
      let nivelVenta: 'critico' | 'precaucion' | 'normal' = 'normal'

      // Solo productos con movimiento
      if (tieneMovimiento) {
        if (porcentajeAlmacen < 25) nivelAlmacen = 'critico'
        else if (porcentajeAlmacen < 50) nivelAlmacen = 'precaucion'

        if (porcentajeVenta < 25) nivelVenta = 'critico'
        else if (porcentajeVenta < 50) nivelVenta = 'precaucion'
      }

      return {
        productoID: item.productoID,
        nombre: item.productoNombre,
        unidad: item.unidadAbrev || '',
        stockEnAlmacen: stockRealAlmacen,
        stockExtraido: Number(item.stockExtraido),
        stockDisponibleVenta: stockEnVenta,
        stockVendido: Number(item.stockVendidoMesActual),
        ventasUltimoMes: ventasMes,
        nivelAlmacen,
        nivelVenta,
        debeExtraer: tieneMovimiento && nivelVenta !== 'normal', // Stock bajo en venta
        debeComprar: tieneMovimiento && (nivelAlmacen === 'critico' || (nivelAlmacen === 'precaucion' && nivelVenta !== 'normal'))
      }
    })

    return resultado
  } catch (error) {
    console.error('Error al obtener inventario completo:', error)
    return []
  }
}

// ============= NOTIFICAR EXTRACCIÓN =============
export async function notificarExtraccion(productos: any[]) {
  try {
    // Obtener usuarios con rol Almacén (3) y Admin (1)
    const usuarios = await prisma.persona.findMany({
      where: {
        rol: { in: [1, 3] },
        estado: 1
      },
      select: {
        correo: true,
        primerNombre: true,
        apellidoPaterno: true
      }
    })

    let mensaje = '📦 ALERTA DE EXTRACCIÓN NECESARIA\n\n'
    mensaje += `${productos.length} productos necesitan ser extraídos del almacén al punto de venta:\n\n`
    
    productos.forEach(p => {
      mensaje += `• ${p.nombre}: ${p.stockDisponibleVenta.toFixed(2)} ${p.unidad} disponible\n`
      mensaje += `  Stock en almacén: ${p.stockEnAlmacen.toFixed(2)} ${p.unidad}\n\n`
    })

    console.log('Notificación de extracción enviada a:', usuarios.length, 'usuarios')
    console.log(mensaje)

    // Aquí implementarías el envío real (email, push, etc.)
    // await enviarEmail(usuarios, mensaje)

    return {
      success: true,
      mensaje: `Notificación enviada a ${usuarios.length} usuarios de Almacén/Admin`
    }
  } catch (error) {
    console.error('Error al notificar extracción:', error)
    return {
      success: false,
      error: 'Error al enviar notificación'
    }
  }
}

// ============= NOTIFICAR COMPRA =============
export async function notificarCompra(productos: any[]) {
  try {
    // Obtener usuarios con rol Compras (5) y Admin (1)
    const usuarios = await prisma.persona.findMany({
      where: {
        rol: { in: [1, 5] },
        estado: 1
      },
      select: {
        correo: true,
        primerNombre: true,
        apellidoPaterno: true
      }
    })

    let mensaje = '🛒 ALERTA DE COMPRA NECESARIA\n\n'
    mensaje += `${productos.length} productos necesitan ser reabastecidos:\n\n`
    
    productos.forEach(p => {
      const stockTotal = p.stockEnAlmacen + p.stockDisponibleVenta
      const faltante = (p.ventasUltimoMes * 2) - stockTotal
      
      mensaje += `• ${p.nombre}\n`
      mensaje += `  Stock total: ${stockTotal.toFixed(2)} ${p.unidad}\n`
      mensaje += `  Sugerido comprar: ${Math.max(faltante, 0).toFixed(2)} ${p.unidad}\n\n`
    })

    console.log('Notificación de compra enviada a:', usuarios.length, 'usuarios')
    console.log(mensaje)

    // Aquí implementarías el envío real (email, push, etc.)
    // await enviarEmail(usuarios, mensaje)

    return {
      success: true,
      mensaje: `Notificación enviada a ${usuarios.length} usuarios de Compras/Admin`
    }
  } catch (error) {
    console.error('Error al notificar compra:', error)
    return {
      success: false,
      error: 'Error al enviar notificación'
    }
  }
}

// ============= 5. PRODUCTOS PRÓXIMOS A VENCER =============
// MEJORADO: Agrupa por lote y considera TODOS los lotes (no solo StockVenta)
export async function getProductosProximosVencer() {
  try {
    const hoy = new Date(`${hoyBolivia()}T00:00:00.000Z`)
    const en30Dias = new Date(hoy.getTime() + 30 * 86400000)

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
          diasRestantes: Math.round((lote.fechaVencimiento.getTime() - hoy.getTime()) / 86400000)
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
    const inicioMes = inicioMesBolivia()
    const finMes = finMesBolivia()

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
        const fecha = fechaCorta(mov.fechaRegistro)
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