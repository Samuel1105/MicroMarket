import { prisma } from "@/src/lib/prisma";

export type DatosAnulacion = { motivo: string; usuario: string; fecha: string };

/**
 * Quién, cuándo y por qué se anuló cada venta/compra (tabla Anulacion). Si la tabla todavía no existe en esa base de
 * datos, no se rompe el historial: simplemente no se muestran esos datos.
 */
export async function cargarAnulaciones(tipo: number, ids: number[]): Promise<Map<number, DatosAnulacion>> {
  const mapa = new Map<number, DatosAnulacion>();

  if (ids.length === 0) return mapa;
  try {
    const filas = await prisma.anulacion.findMany({
      where: { tipo, referenciaID: { in: ids } },
      orderBy: { id: "asc" },
    });
    const personas = await prisma.persona.findMany({
      where: { id: { in: Array.from(new Set(filas.map((f) => f.usuarioID))) } },
      select: { id: true, primerNombre: true, apellidoPaterno: true },
    });
    const nombres = new Map(personas.map((p) => [p.id, `${p.primerNombre} ${p.apellidoPaterno}`]));

    for (const f of filas) {
      mapa.set(f.referenciaID, {
        motivo: f.motivo,
        usuario: nombres.get(f.usuarioID) ?? `Usuario ${f.usuarioID}`,
        fecha: f.fecha.toISOString(),
      });
    }
  } catch (error) {
    console.error("No se pudieron leer las anulaciones (¿falta crear la tabla Anulacion?):", error);
  }

  return mapa;
}
