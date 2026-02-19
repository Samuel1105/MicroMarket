"use server"

import { prisma } from "@/src/lib/prisma"

type ProductSalesParams = {
  startDate?: string
  endDate?: string
}

export async function getProductSales(params: ProductSalesParams = {}) {
  try {
    const startDate = params.startDate ? new Date(params.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = params.endDate ? new Date(params.endDate) : new Date()

    // Obtener ventas del período
    const ventas = await prisma.venta.findMany({
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
                    Categoria: true,
                    UnidadMedida: true
                  }
                }
              }
            }
          }
        }
      }
    })

    // Obtener stock actual de productos
    const stockActual = await prisma.stockVenta.groupBy({
      by: ['productoID'],
      where: {
        estado: 1
      },
      _sum: {
        cantidadUnidadesBase: true
      }
    })

    const stockMap = new Map(
      stockActual.map(s => [s.productoID, s._sum.cantidadUnidadesBase?.toNumber() || 0])
    )

    // Análisis por producto
    const productoData: Record<string, {
      productoID: number
      producto: string
      categoria: string
      unidadBase: string
      unidadesVendidas: number
      numeroVentas: number
      totalIngresos: number
      precioPromedio: number
      stockActual: number
      rotacion: number
    }> = {}

    ventas.forEach(venta => {
      venta.DetalleVenta.forEach(detalle => {
        const producto = detalle.StockVenta.Producto
        const key = producto.nombre

        if (!productoData[key]) {
          productoData[key] = {
            productoID: producto.id,
            producto: producto.nombre,
            categoria: producto.Categoria.nombre,
            unidadBase: producto.UnidadMedida.nombre,
            unidadesVendidas: 0,
            numeroVentas: 0,
            totalIngresos: 0,
            precioPromedio: 0,
            stockActual: stockMap.get(producto.id) || 0,
            rotacion: 0
          }
        }

        productoData[key].unidadesVendidas += detalle.cantidadUnidadesBase.toNumber()
        productoData[key].numeroVentas += 1
        productoData[key].totalIngresos += detalle.total.toNumber()
      })
    })

    // Calcular precio promedio y rotación
    const productosArray = Object.values(productoData).map(p => {
      p.precioPromedio = p.numeroVentas > 0 ? p.totalIngresos / p.unidadesVendidas : 0
      
      // Rotación = unidades vendidas / stock promedio
      // Si no hay stock actual, asumimos que todo se vendió
      if (p.stockActual > 0) {
        p.rotacion = p.unidadesVendidas / p.stockActual
      } else {
        p.rotacion = p.unidadesVendidas > 0 ? 999 : 0 // 999 = se vendió todo
      }
      
      return p
    })

    // Clasificar productos
    const productos = productosArray.sort((a, b) => b.unidadesVendidas - a.unidadesVendidas)
    
    // Top productos
    const topProductos = productos.slice(0, 20)
    
    // Productos lentos (menos de 5 unidades vendidas)
    const productosLentos = productos
      .filter(p => p.unidadesVendidas < 5 && p.unidadesVendidas > 0)
      .sort((a, b) => a.unidadesVendidas - b.unidadesVendidas)
      .slice(0, 20)

    // Productos sin ventas
    const productosSinVentas = productos
      .filter(p => p.unidadesVendidas === 0)
      .slice(0, 20)

    // Productos estrella (alta rotación y ventas)
    const productosEstrella = productos
      .filter(p => p.rotacion > 2 && p.unidadesVendidas > 10)
      .sort((a, b) => b.rotacion - a.rotacion)
      .slice(0, 20)

    // Análisis por categoría
    const categoriaData: Record<string, {
      categoria: string
      unidadesVendidas: number
      totalIngresos: number
      numeroProductos: number
    }> = {}

    productosArray.forEach(p => {
      if (!categoriaData[p.categoria]) {
        categoriaData[p.categoria] = {
          categoria: p.categoria,
          unidadesVendidas: 0,
          totalIngresos: 0,
          numeroProductos: 0
        }
      }
      
      categoriaData[p.categoria].unidadesVendidas += p.unidadesVendidas
      categoriaData[p.categoria].totalIngresos += p.totalIngresos
      categoriaData[p.categoria].numeroProductos += 1
    })

    const categorias = Object.values(categoriaData)
      .sort((a, b) => b.unidadesVendidas - a.unidadesVendidas)

    // Estadísticas generales
    const totalProductos = productosArray.length
    const totalUnidadesVendidas = productosArray.reduce((sum, p) => sum + p.unidadesVendidas, 0)
    const totalIngresos = productosArray.reduce((sum, p) => sum + p.totalIngresos, 0)
    const productosActivos = productosArray.filter(p => p.unidadesVendidas > 0).length
    const productosInactivos = productosArray.filter(p => p.unidadesVendidas === 0).length
    const promedioVentasPorProducto = totalProductos > 0 ? totalUnidadesVendidas / totalProductos : 0

    return {
      success: true,
      data: {
        productos,
        topProductos,
        productosLentos,
        productosSinVentas,
        productosEstrella,
        categorias,
        estadisticas: {
          totalProductos,
          totalUnidadesVendidas,
          totalIngresos,
          productosActivos,
          productosInactivos,
          promedioVentasPorProducto
        },
        periodo: {
          inicio: startDate.toISOString().split('T')[0],
          fin: endDate.toISOString().split('T')[0]
        }
      }
    }

  } catch (error) {
    console.error("Error en getProductSales:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al analizar ventas por producto"
    }
  }
}