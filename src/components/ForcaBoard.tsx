"use client";

import { useState, useTransition } from "react";
import { addTest, deleteTest, type Test } from "@/app/actions-fingerboard";
import ForceChart, { type ChartSeries } from "@/components/ForceChart";
import {
  GRIP_LABEL,
  MAW_EDGE_MM,
  TEST_PULL_SECONDS,
  TEST_REST_HOURS,
  TEST_REST_MIN,
  asymmetryPct,
  pctBodyweight,
  type Grip,
} from "@/lib/fingerboard";
import { diffDays, formatDayShortBR, getTodayKey } from "@/lib/dates";

/* Validadas com o validador da skill de dataviz contra o fundo #0f172a:
   banda de luminosidade, piso de croma, separação CVD e contraste — tudo PASS. */
const LEFT_COLOR = "#0284c7";
const RIGHT_COLOR = "#65a30d";

type Unit = "pct" | "kg";

interface Props {
  tests: Test[];
  defaultBodyweight: number;
}

export default function ForcaBoard({ tests, defaultBodyweight }: Props) {
  const today = getTodayKey();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [unit, setUnit] = useState<Unit>("pct");
  const [open, setOpen] = useState(false);

  const [date, setDate] = useState(today);
  const [edge, setEdge] = useState(String(MAW_EDGE_MM));
  const [grip, setGrip] = useState<Grip>("half-crimp");
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [bw, setBw] = useState(defaultBodyweight ? String(defaultBodyweight) : "");
  const [device, setDevice] = useState("");
  const [notes, setNotes] = useState("");

  function handleAdd() {
    setError("");
    const parse = (v: string) => parseFloat(v.replace(",", "."));
    const l = parse(left);
    const r = parse(right);
    const w = parse(bw);
    const e = parse(edge);
    if (isNaN(l) || isNaN(r) || l <= 0 || r <= 0)
      return setError("Informe o pico das duas mãos");
    if (isNaN(w) || w <= 0) return setError("Informe o peso corporal do dia");
    if (isNaN(e) || e <= 0) return setError("Reglete inválido");

    startTransition(async () => {
      const res = await addTest({
        date,
        edgeMm: e,
        grip,
        leftKg: l,
        rightKg: r,
        bodyweightKg: w,
        device,
        notes,
      });
      if (res.error) setError(res.error);
      else {
        setLeft("");
        setRight("");
        setNotes("");
        setOpen(false);
      }
    });
  }

  function handleDelete(id: string) {
    setError("");
    startTransition(async () => {
      const r = await deleteTest(id);
      if (r.error) setError(r.error);
    });
  }

  const sorted = [...tests].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;

  const valueOf = (t: Test, side: "leftKg" | "rightKg") =>
    unit === "kg" ? t[side] : (pctBodyweight(t[side], t.bodyweightKg) ?? 0);

  const series: ChartSeries[] = [
    {
      name: "Esquerda",
      color: LEFT_COLOR,
      points: sorted.map((t) => ({
        date: t.date,
        offset: first ? diffDays(first.date, t.date) : 0,
        value: valueOf(t, "leftKg"),
      })),
    },
    {
      name: "Direita",
      color: RIGHT_COLOR,
      points: sorted.map((t) => ({
        date: t.date,
        offset: first ? diffDays(first.date, t.date) : 0,
        value: valueOf(t, "rightKg"),
      })),
    },
  ];

  const bestNow = latest ? Math.max(latest.leftKg, latest.rightKg) : null;
  const bestNowPct = latest && bestNow ? pctBodyweight(bestNow, latest.bodyweightKg) : null;
  const bestPrev = previous ? Math.max(previous.leftKg, previous.rightKg) : null;
  const deltaKg = bestNow !== null && bestPrev !== null ? Math.round((bestNow - bestPrev) * 10) / 10 : null;
  const asym = latest ? asymmetryPct(latest.leftKg, latest.rightKg) : null;

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-3 gap-3">
        <Tile
          label="Melhor mão"
          value={bestNowPct !== null ? `${bestNowPct}%` : "—"}
          hint={bestNow !== null ? `${bestNow} kg do PC` : "sem teste"}
        />
        <Tile
          label="Desde o anterior"
          value={deltaKg !== null ? `${deltaKg > 0 ? "+" : ""}${deltaKg} kg` : "—"}
          hint={previous ? formatDayShortBR(previous.date) : "1º teste"}
          tone={deltaKg === null ? "neutral" : deltaKg > 0 ? "good" : deltaKg < 0 ? "bad" : "neutral"}
        />
        <Tile
          label="Assimetria"
          value={asym !== null ? `${asym}%` : "—"}
          hint={asym !== null && asym > 10 ? "acima de 10%" : "E vs D"}
          tone={asym !== null && asym > 10 ? "bad" : "neutral"}
        />
      </section>

      <section className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold text-foreground">Evolução</h2>
          <div className="flex gap-1 bg-muted rounded-lg p-0.5" role="group" aria-label="Unidade">
            {(["pct", "kg"] as Unit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                aria-pressed={unit === u}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  unit === u
                    ? "bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {u === "pct" ? "% do PC" : "kg"}
              </button>
            ))}
          </div>
        </div>
        <ForceChart
          series={series}
          unit={unit === "pct" ? "%" : " kg"}
          caption={`Pico de força por mão ao longo do tempo, em ${
            unit === "pct" ? "porcentagem do peso corporal" : "quilos"
          }.`}
        />
      </section>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <section className="bg-card border border-border rounded-xl p-4">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="bg-primary text-primary-foreground font-medium rounded-lg px-4 py-2 text-sm hover:bg-primary-hover w-full"
          >
            Registrar teste de força máxima
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-foreground">Novo teste</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Puxada máxima de <strong>{TEST_PULL_SECONDS} segundos</strong> na
                célula de carga, uma mão por vez, no reglete de {MAW_EDGE_MM}mm em
                meia-crimp. Registra o <strong>pico</strong>, não a média.{" "}
                {TEST_REST_MIN} min entre as mãos.
              </p>
              <p className="text-subtle text-sm mt-2">
                Para o número ser comparável com o próximo teste: dedos descansados
                há {TEST_REST_HOURS}h, mesma posição de braço e ombro, mesmo horário
                do dia.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Data" htmlFor="t-date">
                <input
                  id="t-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                />
              </Field>
              <Field label="Reglete (mm)" htmlFor="t-edge">
                <input
                  id="t-edge"
                  inputMode="decimal"
                  value={edge}
                  onChange={(e) => setEdge(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                />
              </Field>
              <Field label="Pico esquerda (kg)" htmlFor="t-left">
                <input
                  id="t-left"
                  inputMode="decimal"
                  value={left}
                  onChange={(e) => setLeft(e.target.value)}
                  placeholder="38,4"
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                />
              </Field>
              <Field label="Pico direita (kg)" htmlFor="t-right">
                <input
                  id="t-right"
                  inputMode="decimal"
                  value={right}
                  onChange={(e) => setRight(e.target.value)}
                  placeholder="39,1"
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                />
              </Field>
              <Field label="Peso corporal (kg)" htmlFor="t-bw">
                <input
                  id="t-bw"
                  inputMode="decimal"
                  value={bw}
                  onChange={(e) => setBw(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                />
              </Field>
              <Field label="Aparelho" htmlFor="t-device">
                <input
                  id="t-device"
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                  placeholder="Tindeq, WH-C06…"
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                />
              </Field>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Pegada</p>
              <div className="flex gap-1.5">
                {(Object.keys(GRIP_LABEL) as Grip[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrip(g)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      grip === g
                        ? "bg-primary/20 text-primary border-primary/40"
                        : "border-border-strong text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {GRIP_LABEL[g]}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Observações" htmlFor="t-notes">
              <input
                id="t-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Como estava, o que sentiu…"
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />
            </Field>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAdd}
                disabled={isPending}
                className="bg-primary text-primary-foreground font-medium rounded-lg px-4 py-2 text-sm hover:bg-primary-hover disabled:opacity-50 flex-1"
              >
                {isPending ? "Salvando…" : "Salvar teste"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm px-4"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="bg-card border border-border rounded-xl p-4">
        <h2 className="font-semibold text-foreground mb-3">
          Histórico <span className="text-subtle font-normal text-sm">({tests.length})</span>
        </h2>
        {tests.length === 0 ? (
          <p className="text-subtle text-sm">
            Nenhum teste ainda. Testa no início do ciclo, entre os blocos e no fim —
            três pontos já mostram tendência.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {[...sorted].reverse().map((t) => {
              const lp = pctBodyweight(t.leftKg, t.bodyweightKg);
              const rp = pctBodyweight(t.rightKg, t.bodyweightKg);
              return (
                <li key={t._id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground tabular-nums">
                      {formatDayShortBR(t.date)}
                      <span className="text-subtle"> · {t.edgeMm}mm · </span>
                      <span className="text-muted-foreground">{GRIP_LABEL[t.grip]}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                      <span
                        className="inline-block w-2 h-2 rounded-sm mr-1 align-middle"
                        style={{ backgroundColor: LEFT_COLOR }}
                        aria-hidden
                      />
                      E {t.leftKg}kg{lp !== null && ` (${lp}%)`}
                      {"  "}
                      <span
                        className="inline-block w-2 h-2 rounded-sm mr-1 ml-2 align-middle"
                        style={{ backgroundColor: RIGHT_COLOR }}
                        aria-hidden
                      />
                      D {t.rightKg}kg{rp !== null && ` (${rp}%)`}
                      <span className="text-subtle"> · PC {t.bodyweightKg}kg</span>
                    </p>
                    {t.notes && <p className="text-xs text-subtle mt-0.5">{t.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(t._id)}
                    disabled={isPending}
                    className="text-subtle hover:text-destructive text-xs shrink-0 disabled:opacity-50"
                    aria-label={`Apagar teste de ${formatDayShortBR(t.date)}`}
                  >
                    Apagar
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const toneClass =
    tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-subtle text-xs">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${toneClass}`}>{value}</p>
      <p className="text-subtle text-xs mt-0.5">{hint}</p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm text-muted-foreground mb-1" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
