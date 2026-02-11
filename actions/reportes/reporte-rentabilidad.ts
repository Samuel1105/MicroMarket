"use server"

import { prisma } from "@/src/lib/prisma"

type ProductProfitabilityParams = {
  startDate: string
  endDate: string
}

export async function getProductProfitability(params: ProductProfitabilityParams) {
  try {
    const { startDate, endDate } = params

    // 1. Obtener todas las ventas del período con sus detalles
    const ventas = await prisma.detalleVenta.findMany({
      where: {
        Venta: {
          fechaVenta: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          },
          estado: 1
        }
      },
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
    })

    // 2. Obtener todas las compras del período (para calcular costos)
    const compras = await prisma.detalleCompra.findMany({
      where: {
        Compra: {
          fechaRegistro: {
            lte: new Date(endDate) // Todas las compras hasta la fecha final
          },
          estado: 1
        },
        estado: 1
      },
      include: {
        Producto: {
          include: {
            Categoria: true
          }
        },
        UnidadMedida: true
      }
    })

    // 3. Obtener conversiones de unidades para calcular unidades base
    const conversiones = await prisma.conversionUnidad.findMany({
      where: {
        estado: 1
      }
    })

    // 4. Calcular costo promedio ponderado por unidad base para cada producto
    const costoPorProducto = new Map<number, {
      costoPromedioUnidadBase: number
      totalUnidadesCompradas: number
    }>()

    // Agrupar compras por producto
    const comprasPorProducto = compras.reduce((acc, compra) => {
      if (!acc[compra.productoID]) {
        acc[compra.productoID] = []
      }
      acc[compra.productoID].push(compra)
      return acc
    }, {} as Record<number, typeof compras>)

    // Calcular costo promedio ponderado para cada producto
    for (const [productoID, comprasProducto] of Object.entries(comprasPorProducto)) {
      let totalCostoEnUnidadesBase = 0
      let totalUnidadesBase = 0

      for (const compra of comprasProducto) {
        // Encontrar el factor de conversión para esta unidad de medida
        const conversion = conversiones.find(
          c => c.productoID === compra.productoID && 
               c.unidadOrigenID === compra.unidadMedidaID
        )

        const factorConversion = conversion?.factorConversion.toNumber() || 1

        // Cantidad en unidades base = cantidad comprada × factor de conversión
        const cantidadUnidadesBase = compra.cantidadComprada.toNumber() * factorConversion

        // Costo por unidad base = precio unitario / factor de conversión
        const costoUnidadBase = compra.precioUnitario.toNumber() / factorConversion

        // Costo total de esta compra en unidades base
        const costoTotalCompra = cantidadUnidadesBase * costoUnidadBase

        totalCostoEnUnidadesBase += costoTotalCompra
        totalUnidadesBase += cantidadUnidadesBase
      }

      // Costo promedio ponderado por unidad base
      const costoPromedioUnidadBase = totalUnidadesBase > 0 
        ? totalCostoEnUnidadesBase / totalUnidadesBase 
        : 0

      costoPorProducto.set(Number(productoID), {
        costoPromedioUnidadBase,
        totalUnidadesCompradas: totalUnidadesBase
      })
    }

    // 5. Agrupar ventas por producto y calcular métricas
    const ventasPorProducto = ventas.reduce((acc, venta) => {
      const productoID = venta.StockVenta.productoID
      
      if (!acc[productoID]) {
        acc[productoID] = {
          id: productoID,
          nombre: venta.StockVenta.Producto.nombre,
          categoria: venta.StockVenta.Producto.Categoria.nombre,
          cantidadVendida: 0,
          cantidadUnidadesBase: 0,
          ingresosVentas: 0,
          costoCompras: 0,
          utilidadBruta: 0,
          margenUtilidad: 0,
          precioVentaPromedio: 0,
          costoPromedio: 0,
          rotacion: 0
        }
      }

      const cantidadUnidadesBase = venta.cantidadUnidadesBase.toNumber()
      const ingresoVenta = venta.total.toNumber()

      // Obtener el costo promedio por unidad base de este producto
      const costoInfo = costoPorProducto.get(productoID)
      const costoUnidadBase = costoInfo?.costoPromedioUnidadBase || 0

      // Costo total de estas unidades vendidas
      const costoTotalVenta = cantidadUnidadesBase * costoUnidadBase

      acc[productoID].cantidadVendida += venta.cantidadVendida.toNumber()
      acc[productoID].cantidadUnidadesBase += cantidadUnidadesBase
      acc[productoID].ingresosVentas += ingresoVenta
      acc[productoID].costoCompras += costoTotalVenta

      return acc
    }, {} as Record<number, any>)

    // 6. Calcular utilidad y márgenes
    const productos = Object.values(ventasPorProducto).map((p: any) => {
      const utilidadBruta = p.ingresosVentas - p.costoCompras
      const margenUtilidad = p.ingresosVentas > 0 
        ? (utilidadBruta / p.ingresosVentas) * 100 
        : 0
      
      const precioVentaPromedio = p.cantidadUnidadesBase > 0
        ? p.ingresosVentas / p.cantidadUnidadesBase
        : 0
      
      const costoPromedio = p.cantidadUnidadesBase > 0
        ? p.costoCompras / p.cantidadUnidadesBase
        : 0

      const costoInfo = costoPorProducto.get(p.id)
      const rotacion = costoInfo && costoInfo.totalUnidadesCompradas > 0
        ? (p.cantidadUnidadesBase / costoInfo.totalUnidadesCompradas) * 100
        : 0

      return {
        ...p,
        utilidadBruta,
        margenUtilidad,
        precioVentaPromedio,
        costoPromedio,
        rotacion
      }
    })

    // Ordenar por utilidad bruta descendente
    productos.sort((a, b) => b.utilidadBruta - a.utilidadBruta)

    // 7. Extraer los más y menos rentables
    const topRentables = productos.slice(0, 10)
    const menosRentables = productos.slice(-10).reverse()

    // 8. Calcular estadísticas generales
    const totalProductos = productos.length
    const productosRentables = productos.filter(p => p.utilidadBruta > 0).length
    const productosNoRentables = productos.filter(p => p.utilidadBruta <= 0).length
    const utilidadTotalProductos = productos.reduce((sum, p) => sum + p.utilidadBruta, 0)
    const margenPromedioGeneral = productos.length > 0
      ? productos.reduce((sum, p) => sum + p.margenUtilidad, 0) / productos.length
      : 0

    // 9. Agrupar por categoría
    const ventasPorCategoria = productos.reduce((acc, p) => {
      if (!acc[p.categoria]) {
        acc[p.categoria] = {
          categoria: p.categoria,
          utilidad: 0,
          ingresos: 0,
          cantidadProductos: 0
        }
      }
      
      acc[p.categoria].utilidad += p.utilidadBruta
      acc[p.categoria].ingresos += p.ingresosVentas
      acc[p.categoria].cantidadProductos += 1
      
      return acc
    }, {} as Record<string, any>)

    const ventasPorCategoriaArray = Object.values(ventasPorCategoria).map((c: any) => ({
      ...c,
      margen: c.ingresos > 0 ? (c.utilidad / c.ingresos) * 100 : 0
    }))

    // 10. Comparación costo vs precio de venta (Top 15)
    const comparacionCostoVenta = productos.slice(0, 15).map(p => ({
      producto: p.nombre,
      costoUnitario: p.costoPromedio,
      precioVenta: p.precioVentaPromedio,
      margen: p.margenUtilidad
    }))

    return {
      success: true,
      data: {
        productos,
        topRentables,
        menosRentables,
        estadisticas: {
          totalProductos,
          productosRentables,
          productosNoRentables,
          utilidadTotalProductos,
          margenPromedioGeneral
        },
        ventasPorCategoria: ventasPorCategoriaArray,
        comparacionCostoVenta
      }
    }

  } catch (error) {
    console.error("Error en getProductProfitability:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al calcular rentabilidad"
    }
  }
}