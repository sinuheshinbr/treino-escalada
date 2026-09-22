"use client";

import { useState, useTransition } from "react";
import {
  startCycle,
  endCycle,
  deleteSession,
  type Cycle,
  type Session,
} from "@/app/actions-fingerboard";
import {
  CYCLE,
  CYCLE_LENGTH_WEEKS,
  GRIP_LABEL,
  PHASE_COLOR,
  PHASE_SHORT,
  TEST_EDGE_MM,
  cycleWeek,
  isRecruitWeek,
  sessionMoves,
  sessionPeak,
  type Grip,
} from "@/lib/fingerboard";
import {
  diffDays,
  formatDayShortBR,
  getTodayKey,
  shiftDay,
} from "@/lib/dates";

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface Props {
  cycle: Cycle | null;
  sessions: Session[];
}

export default function CicloBoard({ cycle, sessions }: Props) {
  const today = getTodayKey();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [startDate, setStartDate] = useState(today);
  const [days, setDays] = useState<number[]>([2, 5]);
  const [grip, setGrip] = useState<Grip>("half-crimp");
  const [bodyweight, setBodyweight] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);

  function toggleDay(d: number) {
    setDays((prev) => {
      if (prev.includes(d)) return prev.filter((x) => x !== d);
      if (prev.length >= 2) return [prev[1], d];
      return [...prev, d];
    });
  }

  function handleStart() {
    setError("");
    const bw = parseFloat(bodyweight.replace(",", "."));
    if (isNaN(bw) || bw <= 0) return setError("Informe seu peso corporal");
    if (days.length !== 2) return setError("Escolha exatamente 2 dias de treino");
    startTransition(async () => {
      const r = await startCycle({
        startDate,
        days,
        grip,
        bodyweightKg: bw,
      });
      if (r.error) setError(r.error);
    });
  }

  function handleEnd() {
    setError("");
    startTransition(async () => {
      const r = await endCycle();
      if (r.error) setError(r.error);
      else setConfirmEnd(false);
    });
  }

  function handleDeleteSession(id: string) {
    setError("");
    startTransition(async () => {
      const r = await deleteSession(id);
      if (r.error) setError(r.error);
    });
  }

  /* ---------------------- sem ciclo: abrir um ---------------------- */

  if (!cycle) {
    return (
      <div className="space-y-4">
        <section className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-foreground mb-1">Começar um ciclo</h2>
          <p className="text-muted-foreground text-sm mb-4">
            10 semanas: 4 de puxadas máximas na célula de carga, 1 de deload, 4 de
            recrutamento no board da parede, 1 de deload. Duas sessões por semana.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1" htmlFor="start">
                Primeira semana começa em
              </label>
              <input
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Dias de treino <span className="text-subtle">(2 por semana, 48–72h de intervalo)</span>
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {DOW.map((label, d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      days.includes(d)
                        ? "bg-primary/20 text-primary border-primary/40"
                        : "border-border-strong text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-1" htmlFor="bw">
                Peso corporal (kg)
              </label>
              <input
                id="bw"
                inputMode="decimal"
                value={bodyweight}
                onChange={(e) => setBodyweight(e.target.value)}
                placeholder="72,5"
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />
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

            {error && <p className="text-destructive text-sm">{error}</p>}

            <button
              type="button"
              onClick={handleStart}
              disabled={isPending}
              className="bg-primary text-primary-foreground font-medium rounded-lg px-4 py-2 text-sm hover:bg-primary-hover disabled:opacity-50 w-full"
            >
              {isPending ? "Abrindo…" : "Abrir ciclo"}
            </button>
          </div>
        </section>

        <PlanTable currentWeek={null} startDate={null} />
      </div>
    );
  }

  /* ---------------------- com ciclo ativo ---------------------- */

  const elapsed = diffDays(cycle.startDate, today);
  const week = cycleWeek(elapsed);
  const endDate = shiftDay(cycle.startDate, CYCLE_LENGTH_WEEKS * 7 - 1);
  const cycleSessions = sessions.filter((s) => s.cycleId === cycle._id);
  const done = cycleSessions.filter((s) => !s.aborted).length;
  const planned = CYCLE.length * 2;

  return (
    <div className="space-y-4">
      <section className="bg-card border border-border rounded-xl p-4">
        <div className="flex justify-between items-start gap-3 mb-3">
          <div>
            <h2 className="font-semibold text-foreground">
              {week ? `Semana ${week} de ${CYCLE_LENGTH_WEEKS}` : "Ciclo encerrado"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {formatDayShortBR(cycle.startDate)} – {formatDayShortBR(endDate)} ·{" "}
              {cycle.days.map((d) => DOW[d]).join(" e ")} · {GRIP_LABEL[cycle.grip]}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-foreground">
              {done}
              <span className="text-subtle text-base font-normal">/{planned}</span>
            </p>
            <p className="text-subtle text-xs">sessões</p>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-sm border-t border-border pt-3">
          <div>
            <dt className="text-subtle text-xs">Peso corporal</dt>
            <dd className="text-foreground tabular-nums">{cycle.bodyweightKg} kg</dd>
          </div>
          <div>
            <dt className="text-subtle text-xs">Reglete da célula</dt>
            <dd className="text-foreground tabular-nums">{TEST_EDGE_MM} mm</dd>
          </div>
          <div>
            <dt className="text-subtle text-xs">Pegada</dt>
            <dd className="text-foreground">{GRIP_LABEL[cycle.grip]}</dd>
          </div>
        </dl>
      </section>

      <PlanTable currentWeek={week} startDate={cycle.startDate} />

      <section className="bg-card border border-border rounded-xl p-4">
        <h2 className="font-semibold text-foreground mb-3">
          Sessões registradas{" "}
          <span className="text-subtle font-normal text-sm">({cycleSessions.length})</span>
        </h2>
        {cycleSessions.length === 0 ? (
          <p className="text-subtle text-sm">Nada registrado neste ciclo ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {cycleSessions.map((s) => {
              const peak = sessionPeak(s.sets);
              const moves = sessionMoves(s.sets);
              return (
                <li key={s._id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">
                      {formatDayShortBR(s.date)}
                      <span className="text-subtle"> · sem {s.week} · </span>
                      <span className="text-muted-foreground">{PHASE_SHORT[s.phase]}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.aborted ? (
                        <span className="text-destructive">Abortada</span>
                      ) : (
                        <>
                          {s.sets.length} séries
                          {peak !== null && <> · pico {peak}kg</>}
                          {moves > 0 && <> · {moves} movimentos</>}
                        </>
                      )}
                    </p>
                    {s.notes && <p className="text-xs text-subtle mt-0.5">{s.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSession(s._id)}
                    disabled={isPending}
                    className="text-subtle hover:text-destructive text-xs shrink-0 disabled:opacity-50"
                    aria-label={`Apagar sessão de ${formatDayShortBR(s.date)}`}
                  >
                    Apagar
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <section className="bg-card border border-border rounded-xl p-4">
        {confirmEnd ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Encerrar o ciclo? As sessões registradas ficam no histórico.
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmEnd(false)}
                className="text-muted-foreground hover:text-foreground text-sm px-3 py-1.5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEnd}
                disabled={isPending}
                className="bg-destructive text-destructive-foreground rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                Encerrar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmEnd(true)}
            className="text-subtle hover:text-destructive text-sm"
          >
            Encerrar ciclo
          </button>
        )}
      </section>
    </div>
  );
}

function PlanTable({
  currentWeek,
  startDate,
}: {
  currentWeek: number | null;
  startDate: string | null;
}) {
  return (
    <section className="bg-card border border-border rounded-xl p-4">
      <h2 className="font-semibold text-foreground mb-3">O plano</h2>
      <ul className="space-y-1.5">
        {CYCLE.map((w) => {
          const isNow = w.week === currentWeek;
          return (
            <li
              key={w.week}
              className={`rounded-lg px-3 py-2 border ${
                isNow ? "border-primary/40 bg-primary/5" : "border-transparent"
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs tabular-nums w-14 shrink-0 ${
                    isNow ? "text-primary font-semibold" : "text-subtle"
                  }`}
                >
                  Sem {w.week}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${PHASE_COLOR[w.phase]}`}
                >
                  {PHASE_SHORT[w.phase]}
                </span>
                <span className="text-sm text-foreground tabular-nums">
                  {isRecruitWeek(w) ? (
                    <>
                      {w.sets} × {w.pullsPerSet} puxadas de {w.pullSeconds}s
                      {!w.maxIntent && <span className="text-subtle"> (~70%)</span>}
                    </>
                  ) : (
                    <>
                      {w.sets} × {w.setSeconds}s
                      <span className="text-subtle"> ({w.movesPerSet} movs)</span>
                    </>
                  )}
                </span>
                {startDate && (
                  <span className="text-xs text-subtle ml-auto tabular-nums">
                    {formatDayShortBR(shiftDay(startDate, (w.week - 1) * 7))}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 pl-16">{w.focus}</p>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-subtle mt-3 pt-3 border-t border-border">
        Puxadas de recrutamento isolado (Tyler Nelson, Camp4). Sempre no início da
        sessão, depois de aquecer. Antes de começar, uma puxada de teste precisa
        atingir 85% do seu MVC — abaixo disso os dedos não estão recuperados e a
        sessão não acontece.
      </p>
    </section>
  );
}
