"use server";

import { prisma } from "@/src/lib/prisma";

type FinancialReportParams = {
  startDate: string;
  endDate: string;
};

type FinancialReportResponse = {
  success: boolean;
  data?: {
    totalIngresos: number;
    totalGastos: number;
    utilidadNeta: number;
    margenUtilidad: number;
    ingresosPorDia: Array<{ fecha: string; monto: number }>;
    gastosPorDia: Array<{ fecha: string; monto: number }>;
    ventasPorCategoria: Array<{ categoria: string; total: number; cantidad: number }>;
    topProductosVendidos: Array<{ producto: string; cantidad: number; ingresos: number }>;
    gastosPorProveedor: Array<{ proveedor: string; total: number; porcentaje: number }>;
    detalleGastos: {
      comprasProveedor: number;
      otrosGastos: number;
    };
  };
  error?: string;
};

export async function getFinancialReport({
  startDate,
  endDate,
}: FinancialReportParams): Promise<FinancialReportResponse> {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Incluir todo el día final

    // 1. CALCULAR INGRESOS (Ventas)
    const ventas = await prisma.venta.findMany({
      where: {
        fechaVenta: {
          gte: start,
          lte: end,
        },
        estado: 1, // Solo ventas activas
      },
      include: {
        DetalleVenta: {
          include: {
            StockVenta: {
              include: {
                Producto: {
                  include: {
                    Categoria: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const totalIngresos = ventas.reduce(
      (sum, venta) => sum + Number(venta.total),
      0
    );

    // 2. CALCULAR GASTOS (Compras)
    const compras = await prisma.compra.findMany({
      where: {
        fechaRegistro: {
          gte: start,
          lte: end,
        },
        estado: 1, // Solo compras activas
      },
      include: {
        Proveedor: true,
      },
    });

    const totalGastos = compras.reduce(
      (sum, compra) => sum + Number(compra.total),
      0
    );

    // 3. INGRESOS POR DÍA
    const ingresosPorDiaMap = new Map<string, number>();
    ventas.forEach((venta) => {
      const fecha = venta.fechaVenta?.toISOString().split("T")[0] || "";
      const current = ingresosPorDiaMap.get(fecha) || 0;
      ingresosPorDiaMap.set(fecha, current + Number(venta.total));
    });

    // Llenar días sin ventas con 0
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const fecha = currentDate.toISOString().split("T")[0];
      if (!ingresosPorDiaMap.has(fecha)) {
        ingresosPorDiaMap.set(fecha, 0);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const ingresosPorDia = Array.from(ingresosPorDiaMap.entries())
      .map(([fecha, monto]) => ({ fecha, monto }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    // 4. GASTOS POR DÍA
    const gastosPorDiaMap = new Map<string, number>();
    compras.forEach((compra) => {
      const fecha = compra.fechaRegistro?.toISOString().split("T")[0] || "";
      const current = gastosPorDiaMap.get(fecha) || 0;
      gastosPorDiaMap.set(fecha, current + Number(compra.total));
    });

    // Llenar días sin gastos con 0
    const currentDateGastos = new Date(start);
    while (currentDateGastos <= end) {
      const fecha = currentDateGastos.toISOString().split("T")[0];
      if (!gastosPorDiaMap.has(fecha)) {
        gastosPorDiaMap.set(fecha, 0);
      }
      currentDateGastos.setDate(currentDateGastos.getDate() + 1);
    }

    const gastosPorDia = Array.from(gastosPorDiaMap.entries())
      .map(([fecha, monto]) => ({ fecha, monto }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    // 5. VENTAS POR CATEGORÍA
    const ventasPorCategoriaMap = new Map<
      string,
      { total: number; cantidad: number }
    >();

    ventas.forEach((venta) => {
      venta.DetalleVenta.forEach((detalle) => {
        const categoria = detalle.StockVenta.Producto.Categoria.nombre;
        const current = ventasPorCategoriaMap.get(categoria) || {
          total: 0,
          cantidad: 0,
        };
        ventasPorCategoriaMap.set(categoria, {
          total: current.total + Number(detalle.total),
          cantidad: current.cantidad + Number(detalle.cantidadVendida),
        });
      });
    });

    const ventasPorCategoria = Array.from(ventasPorCategoriaMap.entries())
      .map(([categoria, data]) => ({
        categoria,
        total: data.total,
        cantidad: data.cantidad,
      }))
      .sort((a, b) => b.total - a.total);

    // 6. TOP 5 PRODUCTOS MÁS VENDIDOS
    const productoVentasMap = new Map<
      string,
      { cantidad: number; ingresos: number }
    >();

    ventas.forEach((venta) => {
      venta.DetalleVenta.forEach((detalle) => {
        const producto = detalle.StockVenta.Producto.nombre;
        const current = productoVentasMap.get(producto) || {
          cantidad: 0,
          ingresos: 0,
        };
        productoVentasMap.set(producto, {
          cantidad: current.cantidad + Number(detalle.cantidadVendida),
          ingresos: current.ingresos + Number(detalle.total),
        });
      });
    });

    const topProductosVendidos = Array.from(productoVentasMap.entries())
      .map(([producto, data]) => ({
        producto,
        cantidad: data.cantidad,
        ingresos: data.ingresos,
      }))
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 5);

    // 7. GASTOS POR PROVEEDOR
    const gastosPorProveedorMap = new Map<string, number>();

    compras.forEach((compra) => {
      const proveedor = compra.Proveedor.nombre;
      const current = gastosPorProveedorMap.get(proveedor) || 0;
      gastosPorProveedorMap.set(proveedor, current + Number(compra.total));
    });

    const gastosPorProveedor = Array.from(gastosPorProveedorMap.entries())
      .map(([proveedor, total]) => ({
        proveedor,
        total,
        porcentaje: totalGastos > 0 ? (total / totalGastos) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // 8. CALCULAR MÉTRICAS
    const utilidadNeta = totalIngresos - totalGastos;
    const margenUtilidad =
      totalIngresos > 0 ? (utilidadNeta / totalIngresos) * 100 : 0;

    return {
      success: true,
      data: {
        totalIngresos,
        totalGastos,
        utilidadNeta,
        margenUtilidad,
        ingresosPorDia,
        gastosPorDia,
        ventasPorCategoria,
        topProductosVendidos,
        gastosPorProveedor,
        detalleGastos: {
          comprasProveedor: totalGastos,
          otrosGastos: 0, // Puedes agregar otros gastos aquí en el futuro
        },
      },
    };
  } catch (error) {
    console.error("Error al generar reporte financiero:", error);
    return {
      success: false,
      error: "Error al generar el reporte financiero",
    };
  }
}