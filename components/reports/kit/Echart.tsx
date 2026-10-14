"use client";
import React, { useEffect, useRef } from "react";

type Props = {
  option: any;
  height: number;
  onClick?: (p: any) => void;
  onReady?: (chart: any) => void;
  label?: string;
};

/**
 * Envoltorio de Apache ECharts que **mantiene el gráfico vivo**: cuando cambian los filtros solo se actualiza
 * la opción (el gráfico se anima en vez de recrearse), se redimensiona solo y se limpia al salir.
 */
export default function Echart({ option, height, onClick, onReady, label }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<any>(null);
  const click = useRef(onClick);
  const latest = useRef(option);

  click.current = onClick;
  latest.current = option;

  useEffect(() => {
    let disposed = false;
    let ro: ResizeObserver | undefined;

    import("echarts").then((echarts) => {
      if (disposed || !el.current) return;
      chart.current = echarts.init(el.current, undefined, { renderer: "canvas" });
      chart.current.setOption(latest.current, true);
      chart.current.on("click", (p: any) => click.current?.(p));
      onReady?.(chart.current);
      ro = new ResizeObserver(() => chart.current?.resize());
      ro.observe(el.current);
    });

    return () => {
      disposed = true;
      ro?.disconnect();
      chart.current?.dispose();
      chart.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chart.current?.setOption(option, true);
  }, [option]);

  useEffect(() => {
    chart.current?.resize();
  }, [height]);

  return <div ref={el} aria-label={label} role="img" style={{ width: "100%", height }} />;
}
