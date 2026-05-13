"use client";

import { useState, useTransition } from "react";
import { setDayOverride } from "@/app/actions-overrides";
import {
  WORKOUT_CATEGORY_COLOR,
  WORKOUT_CATEGORY_LABEL,
} from "@/lib/workout-categories";
import type { RecommendationOption } from "@/lib/recommendation";

const INTENSITY_BADGE: Record<string, string> = {
  descanso: "bg-muted text-muted-foreground",
  leve: "bg-sky-500/20 text-sky-300",
  moderado: "bg-amber-500/20 text-amber-300",
  alto: "bg-rose-500/20 text-rose-300",
};

export default function RecommendationOptions({
  options,
  today,
}: {
  options: RecommendationOption[];
  today: string;
}) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleApply(opt: RecommendationOption) {
    setError("");
    if (!opt.apply) return;
    const role = opt.apply.role;
    startTransition(async () => {
      try {
        const r = await setDayOverride(today, role);
        if (r.error) setError(r.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao aplicar");
      }
    });
  }

  if (options.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {error && (
        <div className="bg-destructive/10 text-destructive text-xs p-2 rounded">
          {error}
        </div>
      )}
      {options.map((o) => (
        <div
          key={o.id}
          className={`bg-background rounded p-2 border-l-4 ${
            o.recommended ? "border-primary" : "border-border-strong"
          }`}
        >
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-medium text-foreground">
                  {o.label}
                </p>
                {o.recommended && (
                  <span className="text-[10px] text-primary font-medium uppercase tracking-wide">
                    sugerido
                  </span>
                )}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${WORKOUT_CATEGORY_COLOR[o.category]}`}
                >
                  {WORKOUT_CATEGORY_LABEL[o.category]}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${INTENSITY_BADGE[o.intensity]}`}
                >
                  {o.intensity}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{o.description}</p>
              <p className="text-xs text-muted-foreground mt-1 italic">
                Trade-off: {o.tradeoff}
              </p>
            </div>
            {o.apply && (
              <button
                onClick={() => handleApply(o)}
                disabled={isPending}
                className="text-xs bg-primary text-primary-foreground rounded px-2 py-1 font-medium hover:bg-primary-hover disabled:opacity-50 shrink-0"
              >
                Aplicar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
