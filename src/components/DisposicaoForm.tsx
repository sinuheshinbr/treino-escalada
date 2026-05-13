"use client";

import { useState, useTransition } from "react";
import { saveDisposicao, type Disposicao } from "@/app/actions-disposicao";

interface Props {
  dayKey: string;
  initial: Disposicao | null;
}

const ENERGY_LABELS: Record<number, string> = {
  1: "morto",
  2: "muito baixo",
  3: "baixo",
  4: "abaixo do normal",
  5: "ok",
  6: "bom",
  7: "muito bom",
  8: "forte",
  9: "ótimo",
  10: "pico",
};

const SORENESS_LABELS = [
  "nada",
  "leve",
  "moderada",
  "forte",
  "muito forte",
  "incapacitante",
];

export default function DisposicaoForm({ dayKey, initial }: Props) {
  const [energy, setEnergy] = useState(initial?.energy ?? 5);
  const [sleep, setSleep] = useState(
    initial?.sleepHours != null ? String(initial.sleepHours).replace(".", ",") : ""
  );
  const [soreness, setSoreness] = useState(initial?.soreness ?? 0);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError("");
    setSaved(false);
    const sleepVal = sleep.trim()
      ? parseFloat(sleep.replace(",", "."))
      : null;
    if (sleepVal != null && (isNaN(sleepVal) || sleepVal < 0 || sleepVal > 24)) {
      setError("Horas de sono inválidas");
      return;
    }
    startTransition(async () => {
      const r = await saveDisposicao({
        date: dayKey,
        energy,
        sleepHours: sleepVal,
        soreness,
        notes,
      });
      if (r.error) setError(r.error);
      else setSaved(true);
    });
  }

  return (
    <div className="bg-card rounded-lg shadow p-4 space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-green-50 text-green-700 text-sm p-2 rounded">
          Disposição salva.
        </div>
      )}

      <div>
        <div className="flex justify-between items-baseline mb-1">
          <label className="text-sm font-medium text-foreground">
            Energia
          </label>
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{energy}</span> ·{" "}
            {ENERGY_LABELS[energy]}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={energy}
          onChange={(e) => setEnergy(Number(e.target.value))}
          className="w-full accent-orange-700"
        />
        <div className="flex justify-between text-[10px] text-subtle mt-0.5">
          <span>1</span>
          <span>10</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-1">
          <label className="text-sm font-medium text-foreground">
            Dor muscular
          </label>
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{soreness}</span> ·{" "}
            {SORENESS_LABELS[soreness]}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={soreness}
          onChange={(e) => setSoreness(Number(e.target.value))}
          className="w-full accent-orange-700"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground block mb-1">
          Sono (horas)
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={sleep}
          onChange={(e) => setSleep(e.target.value)}
          placeholder="ex.: 7,5"
          className="w-32 border border-border-strong rounded-lg px-2 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground block mb-1">
          Observações
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="dor específica, humor, café, etc."
          rows={3}
          className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={isPending}
        className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
      >
        {isPending ? "Salvando..." : initial ? "Atualizar" : "Salvar"}
      </button>
    </div>
  );
}
