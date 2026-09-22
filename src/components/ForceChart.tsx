"use client";

import { useRef, useState } from "react";
import { formatDayShortBR } from "@/lib/dates";

export interface ChartPoint {
  /** Dia no formato YYYY-MM-DD. */
  date: string;
  /** Distância em dias desde o primeiro ponto — dá a escala temporal real. */
  offset: number;
  value: number;
}

export interface ChartSeries {
  name: string;
  color: string;
  points: ChartPoint[];
}

interface Props {
  series: ChartSeries[];
  unit: string;
  caption: string;
}

const W = 680;
const H = 260;
// `right` precisa caber o rótulo direto mais longo ("Esquerda") sem cortar.
const PAD = { top: 18, right: 78, bottom: 30, left: 46 };

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

export default function ForceChart({ series, unit, caption }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ idx: number; px: number } | null>(null);

  const all = series.flatMap((s) => s.points);
  if (all.length === 0) {
    return (
      <p className="text-subtle text-sm py-8 text-center">
        Sem testes registrados ainda. O gráfico aparece a partir do primeiro.
      </p>
    );
  }

  const maxOffset = Math.max(...all.map((p) => p.offset), 1);
  const rawMin = Math.min(...all.map((p) => p.value));
  const rawMax = Math.max(...all.map((p) => p.value));
  const span = rawMax - rawMin || Math.max(rawMax * 0.1, 1);
  const yMin = Math.max(0, rawMin - span * 0.25);
  const yMax = rawMax + span * 0.25;
  const ticks = niceTicks(yMin, yMax);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const sx = (offset: number) => PAD.left + (offset / maxOffset) * plotW;
  const sy = (v: number) => PAD.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  // Eixo x: as datas distintas, em ordem. Elas ancoram o crosshair.
  const dates = Array.from(new Set(all.map((p) => p.date))).sort();
  const offsetOf = new Map(all.map((p) => [p.date, p.offset]));

  function onMove(e: React.MouseEvent) {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const xInView = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    dates.forEach((d, i) => {
      const dist = Math.abs(sx(offsetOf.get(d) ?? 0) - xInView);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setHover({ idx: best, px: ((e.clientX - rect.left) / rect.width) * 100 });
  }

  const hoverDate = hover ? dates[hover.idx] : null;

  return (
    <figure className="m-0">
      <div
        ref={wrapRef}
        className="relative"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block touch-none"
          role="img"
          aria-label={caption}
        >
          {/* grade recessiva */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={sy(t)}
                y2={sy(t)}
                stroke="var(--color-border)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={sy(t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-subtle"
                fontSize="11"
              >
                {t}
              </text>
            </g>
          ))}

          {/* datas no eixo x */}
          {dates.map((d) => (
            <text
              key={d}
              x={sx(offsetOf.get(d) ?? 0)}
              y={H - 10}
              textAnchor="middle"
              className="fill-subtle"
              fontSize="11"
            >
              {formatDayShortBR(d)}
            </text>
          ))}

          {/* crosshair */}
          {hoverDate && (
            <line
              x1={sx(offsetOf.get(hoverDate) ?? 0)}
              x2={sx(offsetOf.get(hoverDate) ?? 0)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--color-border-strong)"
              strokeWidth="1"
            />
          )}

          {series.map((s) => {
            const pts = [...s.points].sort((a, b) => a.offset - b.offset);
            const d = pts
              .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.offset)},${sy(p.value)}`)
              .join(" ");
            const last = pts[pts.length - 1];
            return (
              <g key={s.name}>
                {pts.length > 1 && (
                  <path
                    d={d}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {pts.map((p) => (
                  <circle
                    key={p.date}
                    cx={sx(p.offset)}
                    cy={sy(p.value)}
                    r={hoverDate === p.date ? 6 : 4.5}
                    fill={s.color}
                    stroke="var(--color-card)"
                    strokeWidth="2"
                  />
                ))}
                {/* rótulo direto: identidade sem depender só da cor */}
                {last && (
                  <text
                    x={sx(last.offset) + 10}
                    y={sy(last.value)}
                    dominantBaseline="middle"
                    className="fill-muted-foreground"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {s.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {hoverDate && (
          <div
            className="absolute top-0 pointer-events-none bg-muted border border-border-strong rounded-lg px-3 py-2 text-xs shadow-lg whitespace-nowrap z-10"
            style={{
              left: `${hover!.px}%`,
              transform: `translateX(${hover!.px > 60 ? "-110%" : "10%"})`,
            }}
          >
            <p className="text-muted-foreground mb-1">{formatDayShortBR(hoverDate)}</p>
            {series.map((s) => {
              const p = s.points.find((pt) => pt.date === hoverDate);
              if (!p) return null;
              return (
                <p key={s.name} className="flex items-center gap-2 text-foreground">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: s.color }}
                    aria-hidden
                  />
                  {s.name}: <strong>{p.value}{unit}</strong>
                </p>
              );
            })}
          </div>
        )}
      </div>

      {/* legenda — sempre presente com 2+ séries */}
      <div className="flex gap-4 justify-center mt-2">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            {s.name}
          </span>
        ))}
      </div>

      <figcaption className="sr-only">{caption}</figcaption>

      <details className="mt-3">
        <summary className="text-xs text-subtle cursor-pointer hover:text-muted-foreground">
          Ver como tabela
        </summary>
        <table className="w-full text-xs mt-2 border-collapse">
          <thead>
            <tr className="text-muted-foreground text-left">
              <th className="py-1 pr-3 font-medium">Data</th>
              {series.map((s) => (
                <th key={s.name} className="py-1 pr-3 font-medium">
                  {s.name} ({unit.trim() || "valor"})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dates.map((d) => (
              <tr key={d} className="border-t border-border">
                <td className="py-1 pr-3 text-muted-foreground">{formatDayShortBR(d)}</td>
                {series.map((s) => (
                  <td key={s.name} className="py-1 pr-3 text-foreground">
                    {s.points.find((p) => p.date === d)?.value ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
