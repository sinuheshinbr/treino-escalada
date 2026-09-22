"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  logSession,
  type Cycle,
  type Session,
  type Test,
} from "@/app/actions-fingerboard";
import {
  BASELINE_WINDOW_DAYS,
  CYCLE_LENGTH_WEEKS,
  GRIP_LABEL,
  MAW_EDGE_MM,
  PHASE_COLOR,
  PHASE_LABEL,
  PHASE_SHORT,
  READINESS_COLOR,
  READINESS_SCALE,
  REST_SECONDS,
  TEST_ATTEMPTS,
  TEST_PULL_SECONDS,
  TEST_REST_MIN,
  TEST_WARMUP,
  cycleWeek,
  preSessionCheck,
  suggestNext,
  weekPlan,
  workingEdge,
  workingLoad,
  type Readiness,
  type SetLog,
} from "@/lib/fingerboard";
import {
  diffDays,
  formatDayBR,
  formatDayShortBR,
  getDayOfWeek,
  getTodayKey,
  shiftDay,
} from "@/lib/dates";

const DOW = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

interface Props {
  cycle: Cycle | null;
  sessions: Session[];
  tests: Test[];
}

interface DraftSet extends SetLog {
  key: number;
}

export default function HojeBoard({ cycle, sessions, tests }: Props) {
  const today = getTodayKey();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [todayLoadStr, setTodayLoadStr] = useState("");
  const [todayEdgeStr, setTodayEdgeStr] = useState("");
  const [draft, setDraft] = useState<DraftSet[] | null>(null);
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState(false);
  const [skipBaseline, setSkipBaseline] = useState(false);

  const week = cycle ? cycleWeek(diffDays(cycle.startDate, today)) : null;
  const plan = week ? weekPlan(week) : null;
  const cycleSessions = cycle ? sessions.filter((s) => s.cycleId === cycle._id) : [];
  const alreadyLogged = cycleSessions.find((s) => s.date === today) ?? null;

  /* Linha de base: um teste recente o bastante para calibrar este ciclo.
     Sem ela não há carga calibrada nem contra o que medir a evolução. */
  const baseline = cycle
    ? (tests
        .filter(
          (t) =>
            t.date <= today &&
            diffDays(t.date, cycle.startDate) <= BASELINE_WINDOW_DAYS
        )
        .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null)
    : null;

  /* Última sessão válida da mesma fase — é a referência do protocolo. */
  const lastSamePhase = plan
    ? (cycleSessions
        .filter((s) => s.phase === plan.phase && !s.aborted && s.sets.length > 0)
        .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null)
    : null;

  const lastLoad = lastSamePhase ? workingLoad(lastSamePhase.sets) : null;
  const lastEdge = lastSamePhase ? workingEdge(lastSamePhase.sets) : null;

  const prevPlan = lastSamePhase ? weekPlan(lastSamePhase.week) : null;
  const suggestion =
    plan && lastSamePhase
      ? suggestNext(
          plan.phase,
          prevPlan?.targetMargin ?? plan.targetMargin,
          lastSamePhase.sets
        )
      : null;

  /* Prescrição do dia: a fase define se a alavanca é carga ou reglete. */
  function computePrescribedEdge(): number {
    if (!cycle || !plan || plan.phase !== "med") return MAW_EDGE_MM;
    const base = lastEdge ?? cycle.startEdgeMedMm;
    return Math.max(1, base + (suggestion?.edgeDeltaMm ?? 0));
  }
  function computePrescribedLoad(): number {
    if (!plan || plan.phase === "med" || lastLoad === null) return 0;
    return Math.max(0, Math.round((lastLoad + (suggestion?.loadDeltaKg ?? 0)) * 10) / 10);
  }
  const prescribedEdge = computePrescribedEdge();
  const prescribedLoad = computePrescribedLoad();

  const isTrainingDay = cycle ? cycle.days.includes(getDayOfWeek(today)) : false;

  function findNextTrainingDay(): string | null {
    if (!cycle) return null;
    for (let i = 1; i <= 7; i++) {
      const d = shiftDay(today, i);
      if (
        cycle.days.includes(getDayOfWeek(d)) &&
        cycleWeek(diffDays(cycle.startDate, d)) !== null
      )
        return d;
    }
    return null;
  }
  const nextTrainingDay = findNextTrainingDay();

  const effectiveLoad = todayLoadStr
    ? parseFloat(todayLoadStr.replace(",", ".")) || 0
    : prescribedLoad;
  const effectiveEdge = todayEdgeStr
    ? parseFloat(todayEdgeStr.replace(",", ".")) || prescribedEdge
    : prescribedEdge;

  const check =
    plan && readiness
      ? preSessionCheck({
          readiness,
          phase: plan.phase,
          todayEdgeMm: effectiveEdge,
          todayLoadKg: effectiveLoad,
          lastEdgeMm: lastEdge,
          lastLoadKg: lastLoad,
        })
      : null;

  function buildDraft() {
    if (!plan) return;
    setDraft(
      Array.from({ length: plan.sets }, (_, i) => ({
        key: i,
        edgeMm: effectiveEdge,
        loadKg: effectiveLoad,
        hangSeconds: plan.hangSeconds,
        marginSeconds: NaN,
      }))
    );
  }

  function updateSet(key: number, field: keyof SetLog, raw: string) {
    const v = parseFloat(raw.replace(",", "."));
    setDraft((prev) =>
      prev
        ? prev.map((s) => (s.key === key ? { ...s, [field]: isNaN(v) ? NaN : v } : s))
        : prev
    );
  }

  function handleSave(aborted: boolean) {
    if (!cycle || !plan || !week || !readiness) return;
    setError("");
    const sets: SetLog[] = aborted
      ? []
      : (draft ?? []).map((s) => ({
          edgeMm: s.edgeMm,
          loadKg: s.loadKg,
          hangSeconds: s.hangSeconds,
          marginSeconds: s.marginSeconds,
        }));
    if (!aborted) {
      if (sets.length === 0) return setError("Registre pelo menos uma série");
      if (sets.some((s) => isNaN(s.marginSeconds)))
        return setError("Preencha a margem de cada série");
    }
    startTransition(async () => {
      const r = await logSession({
        cycleId: cycle._id,
        date: today,
        week,
        phase: plan.phase,
        readiness,
        aborted,
        sets,
        notes,
      });
      if (r.error) setError(r.error);
      else {
        setEditing(false);
        setDraft(null);
        setNotes("");
      }
    });
  }

  /* ------------------------- estados sem treino ------------------------- */

  if (!cycle) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <h2 className="font-semibold text-foreground mb-1">Nenhum ciclo aberto</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Abre um ciclo de 10 semanas para o app passar a prescrever a sessão do dia.
        </p>
        <Link
          href="/ciclo"
          className="inline-block bg-primary text-primary-foreground font-medium rounded-lg px-4 py-2 text-sm hover:bg-primary-hover"
        >
          Configurar ciclo
        </Link>
      </div>
    );
  }

  if (week === null) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <h2 className="font-semibold text-foreground mb-1">Ciclo concluído</h2>
        <p className="text-muted-foreground text-sm mb-4">
          As {CYCLE_LENGTH_WEEKS} semanas terminaram. Testa a força máxima e abre o
          próximo ciclo com os novos números.
        </p>
        <div className="flex gap-2 justify-center">
          <Link
            href="/forca"
            className="bg-primary text-primary-foreground font-medium rounded-lg px-4 py-2 text-sm hover:bg-primary-hover"
          >
            Registrar teste
          </Link>
          <Link
            href="/ciclo"
            className="border border-border-strong text-foreground rounded-lg px-4 py-2 text-sm hover:bg-muted"
          >
            Novo ciclo
          </Link>
        </div>
      </div>
    );
  }

  if (!isTrainingDay) {
    const nextWeek = nextTrainingDay ? cycleWeek(diffDays(cycle.startDate, nextTrainingDay)) : null;
    const nextPlan = nextWeek ? weekPlan(nextWeek) : null;
    return (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-subtle text-sm capitalize">{formatDayBR(today)}</p>
          <h2 className="font-semibold text-foreground text-lg mt-1 mb-1">Dia de descanso</h2>
          <p className="text-muted-foreground text-sm">
            Semana {week} de {CYCLE_LENGTH_WEEKS}. O protocolo pede 48–72h entre sessões —
            o descanso é onde a adaptação acontece.
          </p>
        </div>
        {nextTrainingDay && nextPlan && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-subtle text-xs mb-2">Próxima sessão</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-foreground font-medium capitalize">
                {DOW[getDayOfWeek(nextTrainingDay)]}, {formatDayShortBR(nextTrainingDay)}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${PHASE_COLOR[nextPlan.phase]}`}>
                {PHASE_SHORT[nextPlan.phase]}
              </span>
              <span className="text-muted-foreground text-sm tabular-nums">
                {nextPlan.sets} × {nextPlan.hangSeconds}s
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!plan) return null;

  /* Teste de linha de base vem antes da primeira sessão do ciclo. */
  if (!baseline && !alreadyLogged && !skipBaseline) {
    return <BaselineCard today={today} onSkip={() => setSkipBaseline(true)} />;
  }

  /* --------------------------- dia de treino --------------------------- */

  if (alreadyLogged && !editing) {
    return (
      <LoggedCard
        session={alreadyLogged}
        today={today}
        onReopen={() => {
          setReadiness(alreadyLogged.readiness);
          setNotes(alreadyLogged.notes);
          setDraft(
            alreadyLogged.sets.length > 0
              ? alreadyLogged.sets.map((s, i) => ({ ...s, key: i }))
              : null
          );
          setEditing(true);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* prescrição */}
      <section className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-subtle text-sm capitalize">{formatDayBR(today)}</p>
            <h2 className="font-semibold text-foreground text-lg mt-0.5">
              Semana {week} · {PHASE_LABEL[plan.phase]}
            </h2>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full border shrink-0 ${PHASE_COLOR[plan.phase]}`}>
            {PHASE_SHORT[plan.phase]}
          </span>
        </div>

        <p className="text-2xl font-bold text-foreground">
          {plan.sets} × {plan.hangSeconds}s
          <span className="text-muted-foreground text-base font-normal">
            {" "}no {prescribedEdge}mm
            {prescribedLoad > 0 && ` com +${prescribedLoad}kg`}
          </span>
        </p>
        <p className="text-muted-foreground text-sm mt-1">
          Margem de {plan.targetMargin}s · {REST_SECONDS / 60} min entre séries ·{" "}
          {GRIP_LABEL[cycle.grip]}
        </p>
        <p className="text-subtle text-sm mt-2">{plan.focus}</p>

        {suggestion && suggestion.text && (
          <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border">
            <span className="text-subtle">Da última sessão: </span>
            {suggestion.text}
          </p>
        )}
        {!lastSamePhase && plan.phase !== "deload" && (
          <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border">
            Primeira sessão desta fase. Use o aquecimento para achar a carga que te
            deixa com {plan.targetMargin}s de reserva e registre abaixo.
          </p>
        )}
      </section>

      {/* checagem pré-sessão */}
      <section className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold text-foreground mb-1">Antes de começar</h3>
        <p className="text-muted-foreground text-sm mb-3">Como você chegou hoje?</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {READINESS_SCALE.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setReadiness(r.id)}
              aria-pressed={readiness === r.id}
              className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                readiness === r.id
                  ? READINESS_COLOR[r.id]
                  : "border-border-strong text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="block text-sm font-medium">{r.label}</span>
              <span className="block text-xs opacity-80 mt-0.5">{r.hint}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {plan.phase === "med" ? (
            <div>
              <label className="block text-sm text-muted-foreground mb-1" htmlFor="edge-today">
                Reglete de hoje (mm)
              </label>
              <input
                id="edge-today"
                inputMode="decimal"
                value={todayEdgeStr}
                onChange={(e) => setTodayEdgeStr(e.target.value)}
                placeholder={String(prescribedEdge)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm text-muted-foreground mb-1" htmlFor="load-today">
                Carga de hoje (kg)
              </label>
              <input
                id="load-today"
                inputMode="decimal"
                value={todayLoadStr}
                onChange={(e) => setTodayLoadStr(e.target.value)}
                placeholder={String(prescribedLoad)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />
            </div>
          )}
          <p className="text-xs text-subtle self-end pb-2">
            O que o aquecimento indicou. Deixe vazio para usar o prescrito.
          </p>
        </div>

        {check && (
          <div
            className={`mt-4 rounded-lg border px-3 py-2.5 ${
              check.status === "abort"
                ? "border-destructive/40 bg-destructive/10"
                : check.status === "caution"
                  ? "border-warning/40 bg-warning/10"
                  : "border-success/40 bg-success/10"
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                check.status === "abort"
                  ? "text-destructive"
                  : check.status === "caution"
                    ? "text-warning"
                    : "text-success"
              }`}
            >
              {check.status === "abort"
                ? "Não treine hoje"
                : check.status === "caution"
                  ? "Atenção"
                  : "Pode ir"}
            </p>
            {check.reasons.map((r) => (
              <p key={r} className="text-sm text-muted-foreground mt-1">
                {r}
              </p>
            ))}
          </div>
        )}
      </section>

      {/* séries */}
      {readiness && (
        <section className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-foreground mb-3">As séries</h3>
          {!draft ? (
            <button
              type="button"
              onClick={buildDraft}
              className="bg-primary text-primary-foreground font-medium rounded-lg px-4 py-2 text-sm hover:bg-primary-hover w-full"
            >
              Abrir {plan.sets} séries
            </button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-[1.5rem_1fr_1fr_1fr] gap-2 text-xs text-subtle px-1">
                <span></span>
                <span>Reglete</span>
                <span>Carga</span>
                <span>Margem</span>
              </div>
              {draft.map((s, i) => (
                <div key={s.key} className="grid grid-cols-[1.5rem_1fr_1fr_1fr] gap-2 items-center">
                  <span className="text-subtle text-sm tabular-nums">{i + 1}</span>
                  <input
                    inputMode="decimal"
                    defaultValue={s.edgeMm}
                    onChange={(e) => updateSet(s.key, "edgeMm", e.target.value)}
                    aria-label={`Série ${i + 1}: reglete em mm`}
                    className="border rounded-lg px-2 py-1.5 text-sm w-full tabular-nums"
                  />
                  <input
                    inputMode="decimal"
                    defaultValue={s.loadKg}
                    onChange={(e) => updateSet(s.key, "loadKg", e.target.value)}
                    aria-label={`Série ${i + 1}: carga em kg`}
                    className="border rounded-lg px-2 py-1.5 text-sm w-full tabular-nums"
                  />
                  <input
                    inputMode="decimal"
                    placeholder={`${plan.targetMargin}s`}
                    onChange={(e) => updateSet(s.key, "marginSeconds", e.target.value)}
                    aria-label={`Série ${i + 1}: margem em segundos`}
                    className="border rounded-lg px-2 py-1.5 text-sm w-full tabular-nums"
                  />
                </div>
              ))}
              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  onClick={() =>
                    setDraft((p) =>
                      p
                        ? [
                            ...p,
                            {
                              key: Math.max(...p.map((x) => x.key)) + 1,
                              edgeMm: effectiveEdge,
                              loadKg: effectiveLoad,
                              hangSeconds: plan.hangSeconds,
                              marginSeconds: NaN,
                            },
                          ]
                        : p
                    )
                  }
                  className="text-primary hover:text-primary-hover"
                >
                  + série
                </button>
                {draft.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setDraft((p) => (p ? p.slice(0, -1) : p))}
                    className="text-subtle hover:text-foreground"
                  >
                    − série
                  </button>
                )}
              </div>

              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações da sessão…"
                aria-label="Observações da sessão"
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />

              {error && <p className="text-destructive text-sm">{error}</p>}

              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isPending}
                className="bg-primary text-primary-foreground font-medium rounded-lg px-4 py-2 text-sm hover:bg-primary-hover disabled:opacity-50 w-full"
              >
                {isPending ? "Salvando…" : "Salvar sessão"}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isPending}
            className="text-subtle hover:text-destructive text-sm mt-3 disabled:opacity-50"
          >
            Registrar como abortada
          </button>
        </section>
      )}
    </div>
  );
}

function LoggedCard({
  session,
  today,
  onReopen,
}: {
  session: Session;
  today: string;
  onReopen: () => void;
}) {
  const plan = weekPlan(session.week);
  const suggestion = plan ? suggestNext(session.phase, plan.targetMargin, session.sets) : null;
  return (
    <div className="space-y-4">
      <section className="bg-card border border-border rounded-xl p-4">
        <p className="text-subtle text-sm capitalize">{formatDayBR(today)}</p>
        <h2 className="font-semibold text-foreground text-lg mt-0.5 mb-3">
          {session.aborted ? "Sessão abortada" : "Sessão registrada"}
        </h2>
        {session.aborted ? (
          <p className="text-muted-foreground text-sm">
            Adiada por 1–2 dias, como manda o protocolo. Voltar cedo demais é o caminho
            mais curto para a lesão.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {session.sets.map((s, i) => (
                <li key={i} className="py-1.5 flex justify-between text-sm tabular-nums">
                  <span className="text-subtle">Série {i + 1}</span>
                  <span className="text-foreground">
                    {s.edgeMm}mm{s.loadKg > 0 && ` +${s.loadKg}kg`} · {s.hangSeconds}s ·
                    margem {s.marginSeconds}s
                  </span>
                </li>
              ))}
            </ul>
            {suggestion && (
              <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border">
                <span className="text-subtle">Próxima sessão: </span>
                {suggestion.text}
              </p>
            )}
          </>
        )}
        {session.notes && <p className="text-sm text-subtle mt-3">{session.notes}</p>}
        <button
          type="button"
          onClick={onReopen}
          className="text-subtle hover:text-foreground text-sm mt-4"
        >
          Editar
        </button>
      </section>
    </div>
  );
}

function BaselineCard({ today, onSkip }: { today: string; onSkip: () => void }) {
  return (
    <div className="space-y-4">
      <section className="bg-card border border-primary/30 rounded-xl p-4">
        <p className="text-subtle text-sm capitalize">{formatDayBR(today)}</p>
        <h2 className="font-semibold text-foreground text-lg mt-0.5 mb-2">
          Teste de linha de base primeiro
        </h2>
        <p className="text-muted-foreground text-sm">
          O ciclo ainda não tem um teste de força máxima. Sem ele não há carga
          calibrada para o MAW nem contra o que medir a evolução daqui a 10
          semanas. É uma sessão curta — faz hoje, treina na próxima.
        </p>
      </section>

      <section className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold text-foreground mb-1">Antes de subir no reglete</h3>
        <ul className="text-sm text-muted-foreground space-y-1.5 mb-4 list-disc pl-4">
          <li>Dedos descansados: 48h sem escalada dura nem suspensão.</li>
          <li>
            Célula de carga ancorada firme, reglete de {MAW_EDGE_MM}mm, pegada em
            meia-crimp.
          </li>
          <li>
            <strong className="text-foreground">Anote a posição do braço.</strong>{" "}
            Ombro engajado, cotovelo quase estendido. Posição diferente no próximo
            teste = número incomparável.
          </li>
          <li>5 a 10 min de aquecimento geral antes de tocar no reglete.</li>
        </ul>

        <h3 className="font-semibold text-foreground mb-2">Aquecimento nos dedos</h3>
        <ul className="divide-y divide-border mb-4">
          {TEST_WARMUP.map((w) => (
            <li key={w.pct} className="py-1.5 flex justify-between text-sm">
              <span className="text-muted-foreground">
                ~{w.pct}% do máximo estimado
              </span>
              <span className="text-foreground tabular-nums">
                {w.seconds}s · descansa {w.restMin} min
              </span>
            </li>
          ))}
        </ul>

        <h3 className="font-semibold text-foreground mb-2">O teste</h3>
        <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal pl-4">
          <li>
            Uma mão por vez. Puxada de{" "}
            <strong className="text-foreground">{TEST_PULL_SECONDS} segundos</strong>{" "}
            no máximo esforço.
          </li>
          <li>
            O comando mental é <strong className="text-foreground">puxar o mais
            forte possível</strong> — não &ldquo;aguentar&rdquo;. O pico chega nos
            primeiros 2–3s.
          </li>
          <li>
            Até {TEST_ATTEMPTS} tentativas por mão, {TEST_REST_MIN} min de descanso
            entre elas. Fica com a melhor.
          </li>
          <li>
            Parou de subir em duas tentativas seguidas? É fadiga. Encerra e usa o
            melhor número.
          </li>
          <li>Pesa-te no mesmo dia — o % do peso corporal depende disso.</li>
        </ol>
      </section>

      <div className="flex gap-2">
        <Link
          href="/forca"
          className="bg-primary text-primary-foreground font-medium rounded-lg px-4 py-2 text-sm hover:bg-primary-hover flex-1 text-center"
        >
          Registrar o teste
        </Link>
        <button
          type="button"
          onClick={onSkip}
          className="text-subtle hover:text-foreground text-sm px-4"
        >
          Treinar mesmo assim
        </button>
      </div>
    </div>
  );
}
