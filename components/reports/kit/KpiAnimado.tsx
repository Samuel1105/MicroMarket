"use client";
import React, { useEffect, useRef, useState } from "react";

import Kpi from "@/components/reports/Kpi";

/** Número que "sube" suavemente hasta su valor nuevo cuando cambian los filtros */
export function useCountUp(valor: number, ms = 450) {
  const [v, setV] = useState(valor);
  const desde = useRef(valor);

  useEffect(() => {
    const inicio = performance.now();
    const a = desde.current;
    let raf = 0;

    const paso = (t: number) => {
      const k = Math.min((t - inicio) / ms, 1);
      const e = 1 - Math.pow(1 - k, 3);

      desde.current = a + (valor - a) * e;
      setV(desde.current);
      if (k < 1) raf = requestAnimationFrame(paso);
    };

    raf = requestAnimationFrame(paso);

    return () => cancelAnimationFrame(raf);
  }, [valor, ms]);

  return v;
}

type KpiProps = React.ComponentProps<typeof Kpi>;

/** Tarjeta de cifra cuyo valor se anima al cambiar. `formato` convierte el número animado en texto. */
export default function KpiAnimado({
  valor,
  formato,
  ...props
}: { valor: number; formato: (n: number) => string } & Omit<KpiProps, "value">) {
  const v = useCountUp(valor);

  return <Kpi {...props} value={formato(v)} />;
}
