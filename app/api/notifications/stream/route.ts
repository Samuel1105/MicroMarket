import { notifBus } from "@/src/lib/notifications";
import { prisma } from "@/src/lib/prisma";

// Conexión abierta larga: nunca se cachea ni se pre-renderiza
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// En Vercel la conexión se corta al llegar a este límite; el navegador reconecta solo (retry 3 s) y recibe la lista al instante
export const maxDuration = 60;

// Mantiene viva la conexión y sirve de red de seguridad si un cambio no llegó por el bus
const LATIDO_MS = 20000;

async function pendientes(rol: number) {
  const filas = await prisma.notificacion.findMany({
    where: { estado: 0, ...(rol === 1 ? {} : { rolDestino: rol }) },
    orderBy: { fechaRegistro: "desc" },
    take: 50,
  });

  return filas.map((n) => ({
    id: n.id,
    tipo: n.tipo,
    rolDestino: n.rolDestino,
    productoID: n.productoID,
    titulo: n.titulo,
    mensaje: n.mensaje,
    enlace: n.enlace,
    fecha: n.fechaRegistro.toISOString(),
  }));
}

/**
 * Server-Sent Events: el navegador abre UNA conexión y el servidor le empuja la lista de tareas
 * pendientes cada vez que algo cambia (al instante, sin que el navegador pregunte).
 */
export async function GET(request: Request) {
  const rol = Number(new URL(request.url).searchParams.get("rol"));

  if (![1, 2, 3, 4, 5].includes(rol)) return new Response("Rol inválido", { status: 400 });

  const encoder = new TextEncoder();
  let limpiar = () => {};

  const stream = new ReadableStream({
    async start(controller) {
      let cerrado = false;
      let ultima = "";

      const enviarLista = async (forzar = false) => {
        if (cerrado) return;
        try {
          const json = JSON.stringify(await pendientes(rol));

          // Solo se manda si cambió (o es la primera vez), para no repetir lo mismo
          if (forzar || json !== ultima) {
            ultima = json;
            controller.enqueue(encoder.encode(`event: lista\ndata: ${json}\n\n`));
          }
        } catch {
          /* la siguiente vuelta lo reintenta */
        }
      };

      const alCambiar = () => void enviarLista();
      const latido = setInterval(() => {
        if (cerrado) return;
        controller.enqueue(encoder.encode(`: latido\n\n`));
        void enviarLista();
      }, LATIDO_MS);

      notifBus.on("cambio", alCambiar);

      limpiar = () => {
        if (cerrado) return;
        cerrado = true;
        clearInterval(latido);
        notifBus.off("cambio", alCambiar);
        try {
          controller.close();
        } catch {
          /* ya estaba cerrado */
        }
      };
      request.signal.addEventListener("abort", limpiar);

      controller.enqueue(encoder.encode(`retry: 3000\n\n`));
      await enviarLista(true);
    },
    cancel() {
      limpiar();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
