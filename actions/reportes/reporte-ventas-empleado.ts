"use server";

import { prisma } from "@/src/lib/prisma";
import { getRoleName } from "@/src/utils/rolesName";
import { addDays, diaBD, diasEnRango, rangoAnterior, rangoReporte } from "@/src/utils/report-dates";

type Params = { startDate: string; endDate: string };

export type EmpleadoVentas = {
  id: number;
  nombre: string;
  rol: string;
  ventas: number; // Bs.
  numero: number; // cantidad de ventas
  ticket: number;
  descuentos: number; // Bs. dados en descuentos
  descuentoPct: number; // % de descuento sobre lo que se habría vendido sin descuento
  participacion: number; // % de las ventas totales
  ventasAnterior: number;
  cambio: number | null; // % vs período anterior
  diasConVentas: number;
  mejorDia: { fecha: string; ventas: number } | null;
  porDia: number[]; // Bs. por cada día del rango
};

export type VentasEmpleadoData = {
  rango: { start: string; end: string; dias: number };
  total: number;
  totalAnterior: number;
  numero: number;
  descuentoPctGeneral: number;
  dias: string[]; // cada día del rango (YYYY-MM-DD)
  empleados: EmpleadoVentas[]; // de más a menos ventas; incluye quienes no vendieron
};

async function cargar(start: Date, end: Date) {
  return prisma.venta.findMany({
    where: { estado: 1, fechaVenta: { gte: start, lte: end } },
    select: { usuarioRegistro: true, total: true, descuento: true, fechaVenta: true },
  });
}

export async function getEmployeeSales({
  startDate,
  endDate,
}: Params): Promise<{ success: boolean; data?: VentasEmpleadoData; error?: string }> {
  try {
    const actual = rangoReporte(startDate, endDate);
    const prev = rangoAnterior(startDate, endDate);
    const previo = rangoReporte(prev.start, prev.end);

    const [ventas, ventasPrev, personas] = await Promise.all([
      cargar(actual.startDate, actual.endDate),
      cargar(previo.startDate, previo.endDate),
      // Todas las personas activas; los que no venden y no son cajeros ni administradores se ocultan
      prisma.persona.findMany({
        where: { estado: 1 },
        select: { id: true, primerNombre: true, apellidoPaterno: true, rol: true },
      }),
    ]);

    const nDias = diasEnRango(startDate, endDate);
    const dias = Array.from({ length: nDias }, (_, i) => addDays(startDate, i));
    const indice = new Map(dias.map((d, i) => [d, i]));
    const mapa = new Map<number, EmpleadoVentas>();

    const nuevo = (id: number, nombre: string, rol: string): EmpleadoVentas => ({
      id,
      nombre,
      rol,
      ventas: 0,
      numero: 0,
      ticket: 0,
      descuentos: 0,
      descuentoPct: 0,
      participacion: 0,
      ventasAnterior: 0,
      cambio: null,
      diasConVentas: 0,
      mejorDia: null,
      porDia: dias.map(() => 0),
    });

    for (const p of personas) mapa.set(p.id, nuevo(p.id, `${p.primerNombre} ${p.apellidoPaterno}`, getRoleName(p.rol)));

    for (const v of ventas) {
      const e = mapa.get(v.usuarioRegistro) ?? nuevo(v.usuarioRegistro, `Usuario ${v.usuarioRegistro}`, "");
      const i = v.fechaVenta ? indice.get(diaBD(v.fechaVenta)) : undefined;

      e.ventas += Number(v.total);
      e.numero += 1;
      e.descuentos += Number(v.descuento ?? 0);
      if (i !== undefined) e.porDia[i] += Number(v.total);
      mapa.set(v.usuarioRegistro, e);
    }

    for (const v of ventasPrev) {
      const e = mapa.get(v.usuarioRegistro);

      if (e) e.ventasAnterior += Number(v.total);
    }

    const total = Array.from(mapa.values()).reduce((s, e) => s + e.ventas, 0);
    const descuentoTotal = Array.from(mapa.values()).reduce((s, e) => s + e.descuentos, 0);

    const empleados = Array.from(mapa.values())
      // Quien no vendió ni ahora ni antes y no es vendedor/administrador no aporta información
      .filter((e) => e.numero > 0 || e.ventasAnterior > 0 || e.rol === "Administrador" || e.rol === "Cajero")
      .map((e) => {
        const conVentas = e.porDia.map((v, i) => ({ fecha: dias[i], ventas: v })).filter((x) => x.ventas > 0);
        const mejor = [...conVentas].sort((a, b) => b.ventas - a.ventas)[0];

        return {
          ...e,
          ticket: e.numero ? e.ventas / e.numero : 0,
          descuentoPct: e.ventas + e.descuentos > 0 ? (e.descuentos / (e.ventas + e.descuentos)) * 100 : 0,
          participacion: total ? (e.ventas / total) * 100 : 0,
          cambio: e.ventasAnterior > 0 ? ((e.ventas - e.ventasAnterior) / e.ventasAnterior) * 100 : null,
          diasConVentas: conVentas.length,
          mejorDia: mejor ?? null,
        };
      })
      .sort((a, b) => b.ventas - a.ventas);

    return {
      success: true,
      data: {
        rango: { start: startDate, end: endDate, dias: nDias },
        total,
        totalAnterior: ventasPrev.reduce((s, v) => s + Number(v.total), 0),
        numero: ventas.length,
        descuentoPctGeneral: total + descuentoTotal > 0 ? (descuentoTotal / (total + descuentoTotal)) * 100 : 0,
        dias,
        empleados,
      },
    };
  } catch (error) {
    console.error("Error en getEmployeeSales:", error);

    return { success: false, error: "Error al calcular las ventas por empleado" };
  }
}
