"use server";

import { prisma } from "@/src/lib/prisma";
import { getBoliviaTime } from "@/src/utils/date";
import { diaBD, diasEnRango, rangoAnterior, rangoReporte } from "@/src/utils/report-dates";

type Params = { startDate: string; endDate: string };

/** Carnet reservado para las ventas rápidas sin datos: no es un cliente real y no se analiza */
const CARNET_GENERAL = "0";
/** Un cliente que no compra hace más de estos días se considera "en riesgo" */
const DIAS_RIESGO = 30;

export type SegmentoCliente = "vip" | "frecuente" | "ocasional" | "nuevo";

export type ClienteAnalisis = {
  id: number;
  nombre: string;
  carnet: string;
  compras: number;
  gasto: number;
  ticket: number;
  ultimaCompra: string; // YYYY-MM-DD
  segmento: SegmentoCliente;
  esNuevo: boolean; // su primera compra fue dentro del período
};

export type ClienteEnRiesgo = {
  id: number;
  nombre: string;
  carnet: string;
  correo: string;
  ultimaCompra: string;
  diasSinComprar: number;
  comprasHistoricas: number;
  gastoHistorico: number;
};

export type AnalisisClientesData = {
  rango: { start: string; end: string; dias: number };
  activos: number;
  activosAnterior: number;
  nuevos: number; // primera compra dentro del período
  recurrentes: number; // ya habían comprado antes del período
  ventasIdentificadas: number; // Bs. de clientes con datos
  ventasGenerales: number; // Bs. del cliente general
  ticketPromedio: number;
  ticketPromedioAnterior: number;
  clientes: ClienteAnalisis[]; // de mayor a menor gasto
  segmentos: Array<{ segmento: SegmentoCliente; clientes: number; gasto: number }>;
  enRiesgo: ClienteEnRiesgo[];
  registrados: number; // clientes dados de alta en el período
};

function segmentar(compras: number, gasto: number): SegmentoCliente {
  if (compras >= 5 && gasto >= 500) return "vip";
  if (compras >= 3) return "frecuente";
  if (compras === 2) return "ocasional";

  return "nuevo";
}

export async function getCustomerAnalysis({
  startDate,
  endDate,
}: Params): Promise<{ success: boolean; data?: AnalisisClientesData; error?: string }> {
  try {
    const actual = rangoReporte(startDate, endDate);
    const prev = rangoAnterior(startDate, endDate);
    const previo = rangoReporte(prev.start, prev.end);
    const hoy = getBoliviaTime().toISOString().slice(0, 10);

    const [ventas, ventasPrev, historial, registrados] = await Promise.all([
      prisma.venta.findMany({
        where: { estado: 1, fechaVenta: { gte: actual.startDate, lte: actual.endDate } },
        select: { total: true, fechaVenta: true, Cliente: { select: { id: true, nombre: true, carnet: true } } },
      }),
      prisma.venta.findMany({
        where: { estado: 1, fechaVenta: { gte: previo.startDate, lte: previo.endDate } },
        select: { total: true, clienteID: true, Cliente: { select: { carnet: true } } },
      }),
      // Todo el historial hasta el fin del rango: sirve para saber quién es nuevo y quién se fue
      prisma.venta.findMany({
        where: { estado: 1, fechaVenta: { lte: actual.endDate } },
        select: {
          total: true,
          fechaVenta: true,
          Cliente: { select: { id: true, nombre: true, carnet: true, correo: true } },
        },
      }),
      prisma.cliente.count({
        where: { carnet: { not: CARNET_GENERAL }, fechaRegistro: { gte: actual.startDate, lte: actual.endDate } },
      }),
    ]);

    // ── Período actual ──
    const porCliente = new Map<number, ClienteAnalisis>();
    let ventasGenerales = 0;
    let ventasIdentificadas = 0;

    for (const v of ventas) {
      const total = Number(v.total);

      if (v.Cliente.carnet === CARNET_GENERAL) {
        ventasGenerales += total;
        continue;
      }

      ventasIdentificadas += total;
      const c =
        porCliente.get(v.Cliente.id) ??
        {
          id: v.Cliente.id,
          nombre: v.Cliente.nombre,
          carnet: v.Cliente.carnet,
          compras: 0,
          gasto: 0,
          ticket: 0,
          ultimaCompra: "",
          segmento: "nuevo" as SegmentoCliente,
          esNuevo: false,
        };
      const dia = v.fechaVenta ? diaBD(v.fechaVenta) : "";

      c.compras += 1;
      c.gasto += total;
      if (dia > c.ultimaCompra) c.ultimaCompra = dia;
      porCliente.set(v.Cliente.id, c);
    }

    // Primera compra y última compra de cada cliente en todo el historial
    const primera = new Map<number, string>();
    const ultima = new Map<number, { dia: string; nombre: string; carnet: string; correo: string }>();
    const acumHist = new Map<number, { compras: number; gasto: number }>();

    for (const h of historial) {
      if (h.Cliente.carnet === CARNET_GENERAL || !h.fechaVenta) continue;
      const dia = diaBD(h.fechaVenta);
      const id = h.Cliente.id;

      if (!primera.get(id) || dia < primera.get(id)!) primera.set(id, dia);
      if (!ultima.get(id) || dia > ultima.get(id)!.dia) {
        ultima.set(id, { dia, nombre: h.Cliente.nombre, carnet: h.Cliente.carnet, correo: h.Cliente.correo });
      }
      const a = acumHist.get(id) ?? { compras: 0, gasto: 0 };

      a.compras += 1;
      a.gasto += Number(h.total);
      acumHist.set(id, a);
    }

    const clientes = Array.from(porCliente.values())
      .map((c) => ({
        ...c,
        ticket: c.gasto / c.compras,
        segmento: segmentar(c.compras, c.gasto),
        esNuevo: (primera.get(c.id) ?? "") >= startDate,
      }))
      .sort((a, b) => b.gasto - a.gasto);

    const segMap = new Map<SegmentoCliente, { clientes: number; gasto: number }>();

    for (const c of clientes) {
      const s = segMap.get(c.segmento) ?? { clientes: 0, gasto: 0 };

      s.clientes += 1;
      s.gasto += c.gasto;
      segMap.set(c.segmento, s);
    }

    // ── Período anterior ──
    const activosPrev = new Set<number>();
    let totalPrev = 0;
    let comprasPrev = 0;

    for (const v of ventasPrev) {
      if (v.Cliente.carnet === CARNET_GENERAL) continue;
      activosPrev.add(v.clienteID);
      totalPrev += Number(v.total);
      comprasPrev += 1;
    }

    // ── En riesgo: compraron 2 o más veces y llevan más de DIAS_RIESGO días sin volver ──
    const enRiesgo: ClienteEnRiesgo[] = [];

    ultima.forEach((u, id) => {
      const dias = Math.round((new Date(`${hoy}T00:00:00Z`).getTime() - new Date(`${u.dia}T00:00:00Z`).getTime()) / 86400000);
      const h = acumHist.get(id)!;

      if (dias > DIAS_RIESGO && h.compras >= 2) {
        enRiesgo.push({
          id,
          nombre: u.nombre,
          carnet: u.carnet,
          correo: u.correo,
          ultimaCompra: u.dia,
          diasSinComprar: dias,
          comprasHistoricas: h.compras,
          gastoHistorico: h.gasto,
        });
      }
    });

    const totalCompras = clientes.reduce((s, c) => s + c.compras, 0);

    return {
      success: true,
      data: {
        rango: { start: startDate, end: endDate, dias: diasEnRango(startDate, endDate) },
        activos: clientes.length,
        activosAnterior: activosPrev.size,
        nuevos: clientes.filter((c) => c.esNuevo).length,
        recurrentes: clientes.filter((c) => !c.esNuevo).length,
        ventasIdentificadas,
        ventasGenerales,
        ticketPromedio: totalCompras ? ventasIdentificadas / totalCompras : 0,
        ticketPromedioAnterior: comprasPrev ? totalPrev / comprasPrev : 0,
        clientes,
        segmentos: (["vip", "frecuente", "ocasional", "nuevo"] as SegmentoCliente[]).map((segmento) => ({
          segmento,
          clientes: segMap.get(segmento)?.clientes ?? 0,
          gasto: segMap.get(segmento)?.gasto ?? 0,
        })),
        enRiesgo: enRiesgo.sort((a, b) => b.gastoHistorico - a.gastoHistorico),
        registrados,
      },
    };
  } catch (error) {
    console.error("Error en getCustomerAnalysis:", error);

    return { success: false, error: "Error al analizar los clientes" };
  }
}
