"use client";

import { useState, useTransition } from "react";
import {
  addMeasurement,
  deleteMeasurement,
  type Measurement,
} from "@/app/actions-avaliacoes";
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  DEFAULT_CRITERIA,
  type Criterion,
  type CriterionCategory,
} from "@/lib/criteria";
import { formatDayShortBR, getTodayKey } from "@/lib/dates";

interface Props {
  measurements: Measurement[];
}

function groupByCriterion(items: Measurement[]) {
  const map = new Map<string, Measurement[]>();
  for (const m of items) {
    const arr = map.get(m.criterionId) ?? [];
    arr.push(m);
    map.set(m.criterionId, arr);
  }
  return map;
}

function deltaSign(direction: "higher" | "lower", delta: number): string {
  if (delta === 0) return "→";
  const good = (direction === "higher" && delta > 0) || (direction === "lower" && delta < 0);
  return good ? "↑" : "↓";
}

function deltaColor(direction: "higher" | "lower", delta: number): string {
  if (delta === 0) return "text-subtle";
  const good = (direction === "higher" && delta > 0) || (direction === "lower" && delta < 0);
  return good ? "text-emerald-600" : "text-rose-600";
}

export default function AvaliacoesBoard({ measurements }: Props) {
  const today = getTodayKey();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [activeCat, setActiveCat] = useState<CriterionCategory>("forca");
  const [activeCriterion, setActiveCriterion] = useState<string | null>(null);
  const [valueStr, setValueStr] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");

  const grouped = groupByCriterion(measurements);

  function handleAdd(criterion: Criterion) {
    setError("");
    const num = parseFloat(valueStr.replace(",", "."));
    if (isNaN(num)) {
      setError("Valor inválido");
      return;
    }
    startTransition(async () => {
      const r = await addMeasurement({
        criterionId: criterion.id,
        date,
        value: num,
        notes,
      });
      if (r.error) setError(r.error);
      else {
        setValueStr("");
        setNotes("");
        setActiveCriterion(null);
      }
    });
  }

  function handleDelete(id: string) {
    setError("");
    startTransition(async () => {
      const r = await deleteMeasurement(id);
      if (r.error) setError(r.error);
    });
  }

  const criteriaInCat = DEFAULT_CRITERIA.filter((c) => c.category === activeCat);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
          {error}
        </div>
      )}

      <div className="bg-card rounded-lg shadow p-3">
        <div className="flex gap-1 overflow-x-auto">
          {(Object.keys(CATEGORY_LABEL) as CriterionCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCat(cat);
                setActiveCriterion(null);
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCat === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted"
              }`}
            >
              {CATEGORY_LABEL[cat]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {criteriaInCat.map((c) => {
          const items = grouped.get(c.id) ?? [];
          const latest = items[0];
          const previous = items[1];
          const delta = latest && previous ? latest.value - previous.value : 0;
          const isOpen = activeCriterion === c.id;

          return (
            <div key={c.id} className="bg-card rounded-lg shadow p-4">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-foreground">{c.name}</h4>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_COLOR[c.category]}`}
                    >
                      {CATEGORY_LABEL[c.category]}
                    </span>
                  </div>
                  <p className="text-xs text-subtle mt-0.5">
                    {c.unit}
                    {c.hint && ` · ${c.hint}`}
                  </p>
                  {latest ? (
                    <p className="text-sm text-foreground mt-2">
                      <span className="text-lg font-semibold text-foreground">
                        {latest.value}
                      </span>{" "}
                      <span className="text-xs text-muted-foreground">
                        em {formatDayShortBR(latest.date)}
                      </span>
                      {previous && (
                        <span
                          className={`text-xs ml-2 ${deltaColor(c.direction, delta)}`}
                        >
                          {deltaSign(c.direction, delta)}{" "}
                          {Math.abs(delta).toFixed(2).replace(/\.?0+$/, "")} vs{" "}
                          {formatDayShortBR(previous.date)}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-subtle mt-2">Sem medições.</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setActiveCriterion(isOpen ? null : c.id);
                    setValueStr("");
                    setNotes("");
                    setDate(today);
                  }}
                  className="text-sm text-primary hover:text-primary-hover font-medium shrink-0"
                >
                  {isOpen ? "Cancelar" : "+ Medir"}
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-border pt-3 mt-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-0.5">
                        Valor ({c.unit})
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={valueStr}
                        onChange={(e) => setValueStr(e.target.value)}
                        autoFocus
                        className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-0.5">
                        Data
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observação (opcional)"
                    className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => handleAdd(c)}
                    disabled={isPending || !valueStr}
                    className="bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
                  >
                    Salvar
                  </button>
                </div>
              )}

              {items.length > 1 && (
                <details className="mt-3">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Histórico ({items.length})
                  </summary>
                  <div className="mt-2 space-y-1">
                    {items.map((m) => (
                      <div
                        key={m._id}
                        className="flex justify-between items-baseline text-xs border-b border-border pb-1 last:border-0"
                      >
                        <span className="text-muted-foreground">
                          {formatDayShortBR(m.date)}
                        </span>
                        <span className="text-foreground font-medium">
                          {m.value}
                        </span>
                        <span className="text-subtle flex-1 ml-2 truncate">
                          {m.notes}
                        </span>
                        <button
                          onClick={() => handleDelete(m._id)}
                          disabled={isPending}
                          className="text-subtle hover:text-destructive ml-2"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
