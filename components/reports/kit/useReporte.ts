"use client";
import { useEffect, useState } from "react";

type Rango = { start: string; end: string };
type Resp<T> = { success: boolean; data?: T; error?: string };

/**
 * Carga los datos de un reporte cada vez que cambia el rango de fechas.
 * Mientras recarga, `data` conserva lo anterior (el reporte no parpadea) y `loading` queda en true.
 */
export function useReporte<T>(cargar: (r: { startDate: string; endDate: string }) => Promise<Resp<T>>, range: Rango) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    setLoading(true);
    setError(null);
    cargar({ startDate: range.start, endDate: range.end })
      .then((res) => {
        if (cancelado) return;
        if (res.success && res.data) setData(res.data);
        else setError(res.error || "No se pudo cargar el reporte");
      })
      .catch(() => !cancelado && setError("No se pudo conectar con el servidor"))
      .finally(() => !cancelado && setLoading(false));

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end]);

  return { data, loading, error };
}
