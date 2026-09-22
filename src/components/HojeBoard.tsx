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
  PHASE_COLOR,
  PHASE_LABEL,
  PHASE_SHORT,
  PULL_REST_SECONDS,
  READINESS_COLOR,
  READINESS_CUTOFF_PCT,
  READINESS_SCALE,
  TEST_ATTEMPTS,
  TEST_EDGE_MM,
  TEST_PULL_SECONDS,
  TEST_REST_MIN,
  TEST_WARMUP,
  cycleWeek,
  isRecruitWeek,
  peakTrend,
  preSessionCheck,
  readinessThreshold,
  sessionMoves,
  sessionPeak,
  weekPlan,
  type Readiness,
  type SessionSet,
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

type Draft = { key: number } & SessionSet;

export default function HojeBoard({ cycle, sessions, tests }: Props) {
  const today = getTodayKey();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [pullStr, setPullStr] = useState("");
  const [draft, setDraft] = useState<Draft[] | null>(null);
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState(false);
  const [skipBaseline, setSkipBaseline] = useState(false);

  const elapsed = cycle ? diffDays(cycle.startDate, today) : null;
  const week = elapsed !== null ? cycleWeek(elapsed) : null;
  /** Antes do início do ciclo — estado distinto de "acabou". */
  const notStarted = elapsed !== null && elapsed < 0;
  const plan = week ? weekPlan(week) : null;
  const cycleSessions = cycle ? sessions.filter((s) => s.cycleId === cycle._id) : [];
  const alreadyLogged = cycleSessions.find((s) => s.date === today) ?? null;

  /* Linha de base: o teste que ancora o corte de prontidão do ciclo. */
  const baseline = cycle
    ? (tests
        .filter(
          (t) =>
            t.date <= today &&
            diffDays(t.date, cycle.startDate) <= BASELINE_WINDOW_DAYS
        )
        .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null)
    : null;

  const mvcKg = baseline ? Math.max(baseline.leftKg, baseline.rightKg) : null;
  const strongHand = baseline
    ? baseline.leftKg >= baseline.rightKg
      ? "esquerda"
      : "direita"
    : null;

  /* Histórico de picos das sessões de puxada, para leitura de tendência. */
  const peaks = cycleSessions
    .filter((s) => !s.aborted)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => sessionPeak(s.sets))
    .filter((v): v is number => v !== null);
  const trend = peaks.length ? peakTrend(peaks) : null;

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

  const pullKg = pullStr ? parseFloat(pullStr.replace(",", ".")) || 0 : null;

  const check =
    plan && readiness
      ? preSessionCheck({ readiness, mvcKg, readinessPullKg: pullKg })
      : null;

  function buildDraft() {
    if (!plan) return;
    setDraft(
      Array.from({ length: plan.sets }, (_, i) =>
        isRecruitWeek(plan)
          ? { key: i, kind: "recruit" as const, leftKg: NaN, rightKg: NaN, pulls: plan.pullsPerSet }
          : { key: i, kind: "board" as const, seconds: plan.setSeconds, moves: plan.movesPerSet }
      )
    );
  }

  function updateSet(key: number, field: string, raw: string) {
    const v = parseFloat(raw.replace(",", "."));
    setDraft((prev) =>
      prev ? prev.map((s) => (s.key === key ? { ...s, [field]: isNaN(v) ? NaN : v } : s)) : prev
    );
  }

  function handleSave(aborted: boolean) {
    if (!cycle || !plan || !week || !readiness) return;
    setError("");
    const sets: SessionSet[] = aborted
      ? []
      : (draft ?? []).map((d) =>
          d.kind === "recruit"
            ? { kind: "recruit", leftKg: d.leftKg, rightKg: d.rightKg, pulls: d.pulls }
            : { kind: "board", seconds: d.seconds, moves: d.moves }
        );
    if (!aborted) {
      if (sets.length === 0) return setError("Registre pelo menos uma série");
      const incomplete = sets.some((s) =>
        s.kind === "recruit"
          ? isNaN(s.leftKg) || isNaN(s.rightKg)
          : isNaN(s.seconds) || isNaN(s.moves)
      );
      if (incomplete) return setError("Preencha todos os campos das séries");
    }
    startTransition(async () => {
      const r = await logSession({
        cycleId: cycle._id,
        date: today,
        week,
        phase: plan.phase,
        readiness,
        readinessPullKg: pullKg,
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
      <Empty
        title="Nenhum ciclo aberto"
        body="Abre um ciclo de 10 semanas para o app passar a prescrever a sessão do dia."
        href="/ciclo"
        cta="Configurar ciclo"
      />
    );
  }

  if (notStarted) {
    const faltam = Math.abs(elapsed!);
    return (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-subtle text-sm capitalize">{formatDayBR(today)}</p>
          <h2 className="font-semibold text-foreground text-lg mt-1 mb-1">
            Ciclo começa em {faltam} {faltam === 1 ? "dia" : "dias"}
          </h2>
          <p className="text-muted-foreground text-sm">
            Primeira semana abre {DOW[getDayOfWeek(cycle.startDate)]},{" "}
            {formatDayShortBR(cycle.startDate)}. Até lá, treina normal.
          </p>
        </div>
        {!baseline ? (
          <BaselineCard today={today} onSkip={() => {}} hideSkip />
        ) : (
          <div className="bg-card border border-success/30 rounded-xl p-4">
            <p className="text-sm text-foreground">
              Linha de base registrada em {formatDayShortBR(baseline.date)}: MVC de{" "}
              <strong>{mvcKg}kg</strong> na mão {strongHand}.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              O corte de prontidão do ciclo será {readinessThreshold(mvcKg!)}kg.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (week === null) {
    return (
      <Empty
        title="Ciclo concluído"
        body={`As ${CYCLE_LENGTH_WEEKS} semanas terminaram. Refaz o teste de MVC e abre o próximo ciclo com os novos números.`}
        href="/forca"
        cta="Registrar teste"
      />
    );
  }

  if (!isTrainingDay) {
    const nw = nextTrainingDay ? cycleWeek(diffDays(cycle.startDate, nextTrainingDay)) : null;
    const np = nw ? weekPlan(nw) : null;
    return (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-subtle text-sm capitalize">{formatDayBR(today)}</p>
          <h2 className="font-semibold text-foreground text-lg mt-1 mb-1">Dia de descanso</h2>
          <p className="text-muted-foreground text-sm">
            Semana {week} de {CYCLE_LENGTH_WEEKS}. O descanso é onde a adaptação
            acontece — os dedos precisam dele para a próxima sessão render.
          </p>
        </div>
        {nextTrainingDay && np && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-subtle text-xs mb-2">Próxima sessão</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-foreground font-medium capitalize">
                {DOW[getDayOfWeek(nextTrainingDay)]}, {formatDayShortBR(nextTrainingDay)}
              </span>
              <Badge phase={np.phase} />
              <span className="text-muted-foreground text-sm tabular-nums">
                {prescriptionText(np)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!plan) return null;

  if (!baseline && !alreadyLogged && !skipBaseline) {
    return <BaselineCard today={today} onSkip={() => setSkipBaseline(true)} />;
  }

  if (alreadyLogged && !editing) {
    return (
      <LoggedCard
        session={alreadyLogged}
        today={today}
        trend={trend}
        onReopen={() => {
          setReadiness(alreadyLogged.readiness);
          setPullStr(alreadyLogged.readinessPullKg?.toString() ?? "");
          setNotes(alreadyLogged.notes);
          setDraft(
            alreadyLogged.sets.length
              ? alreadyLogged.sets.map((s, i) => ({ ...s, key: i }) as Draft)
              : null
          );
          setEditing(true);
        }}
      />
    );
  }

  /* --------------------------- dia de treino --------------------------- */

  return (
    <div className="space-y-4">
      <section className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-subtle text-sm capitalize">{formatDayBR(today)}</p>
            <h2 className="font-semibold text-foreground text-lg mt-0.5">
              Semana {week} · {PHASE_LABEL[plan.phase]}
            </h2>
          </div>
          <Badge phase={plan.phase} />
        </div>

        <p className="text-2xl font-bold text-foreground">{prescriptionText(plan)}</p>
        <p className="text-muted-foreground text-sm mt-1">
          {isRecruitWeek(plan) ? (
            <>
              {TEST_EDGE_MM}mm · {GRIP_LABEL[cycle.grip]} · {PULL_REST_SECONDS}s entre
              puxadas, alternando as mãos · {plan.restMin} min entre séries
            </>
          ) : (
            <>
              {plan.holdSeconds}s por posição · {plan.restMin} min entre séries
            </>
          )}
        </p>
        <p className="text-subtle text-sm mt-2">{plan.focus}</p>

        {isRecruitWeek(plan) && plan.maxIntent && (
          <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border">
            Construção progressiva de força ao longo dos {plan.pullSeconds}s, braço
            estendido, só os flexores de dedo. Não tem carga-alvo:{" "}
            <strong className="text-foreground">puxa o mais forte que conseguires</strong>.
          </p>
        )}
        {trend && (
          <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border">
            <span className="text-subtle">Tendência: </span>
            {trend.text}
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

        {mvcKg && (
          <div className="border-t border-border pt-3">
            <label className="block text-sm text-muted-foreground mb-1" htmlFor="pull">
              Puxada de teste, mão {strongHand} (kg)
            </label>
            <input
              id="pull"
              inputMode="decimal"
              value={pullStr}
              onChange={(e) => setPullStr(e.target.value)}
              placeholder={String(readinessThreshold(mvcKg))}
              className="border rounded-lg px-3 py-2 text-sm w-full"
            />
            <p className="text-xs text-subtle mt-1.5">
              Depois do aquecimento, uma puxada máxima. Precisa bater{" "}
              <strong className="text-muted-foreground">
                {readinessThreshold(mvcKg)}kg
              </strong>{" "}
              ({READINESS_CUTOFF_PCT}% do teu MVC de {mvcKg}kg). Abaixo disso, os
              dedos não estão recuperados.
            </p>
          </div>
        )}

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
              <div className="grid grid-cols-[1.5rem_1fr_1fr] gap-2 text-xs text-subtle px-1">
                <span></span>
                <span>{draft[0]?.kind === "recruit" ? "Pico esquerda (kg)" : "Duração (s)"}</span>
                <span>{draft[0]?.kind === "recruit" ? "Pico direita (kg)" : "Movimentos"}</span>
              </div>
              {draft.map((s, i) => (
                <div key={s.key} className="grid grid-cols-[1.5rem_1fr_1fr] gap-2 items-center">
                  <span className="text-subtle text-sm tabular-nums">{i + 1}</span>
                  {s.kind === "recruit" ? (
                    <>
                      <input
                        inputMode="decimal"
                        onChange={(e) => updateSet(s.key, "leftKg", e.target.value)}
                        defaultValue={isNaN(s.leftKg) ? "" : s.leftKg}
                        aria-label={`Série ${i + 1}: pico da mão esquerda em kg`}
                        className="border rounded-lg px-2 py-1.5 text-sm w-full tabular-nums"
                      />
                      <input
                        inputMode="decimal"
                        onChange={(e) => updateSet(s.key, "rightKg", e.target.value)}
                        defaultValue={isNaN(s.rightKg) ? "" : s.rightKg}
                        aria-label={`Série ${i + 1}: pico da mão direita em kg`}
                        className="border rounded-lg px-2 py-1.5 text-sm w-full tabular-nums"
                      />
                    </>
                  ) : (
                    <>
                      <input
                        inputMode="decimal"
                        defaultValue={s.seconds}
                        onChange={(e) => updateSet(s.key, "seconds", e.target.value)}
                        aria-label={`Série ${i + 1}: duração em segundos`}
                        className="border rounded-lg px-2 py-1.5 text-sm w-full tabular-nums"
                      />
                      <input
                        inputMode="decimal"
                        defaultValue={s.moves}
                        onChange={(e) => updateSet(s.key, "moves", e.target.value)}
                        aria-label={`Série ${i + 1}: número de movimentos`}
                        className="border rounded-lg px-2 py-1.5 text-sm w-full tabular-nums"
                      />
                    </>
                  )}
                </div>
              ))}

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

/* ------------------------------ auxiliares ------------------------------ */

function prescriptionText(p: ReturnType<typeof weekPlan>): string {
  if (!p) return "";
  return isRecruitWeek(p)
    ? `${p.sets} × ${p.pullsPerSet} puxadas de ${p.pullSeconds}s`
    : `${p.sets} × ${p.setSeconds}s, ${p.movesPerSet} movimentos`;
}

function Badge({ phase }: { phase: "recruit" | "board" | "deload" }) {
  return (
    <span className={`text-xs px-2 py-1 rounded-full border shrink-0 ${PHASE_COLOR[phase]}`}>
      {PHASE_SHORT[phase]}
    </span>
  );
}

function Empty({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 text-center">
      <h2 className="font-semibold text-foreground mb-1">{title}</h2>
      <p className="text-muted-foreground text-sm mb-4">{body}</p>
      <Link
        href={href}
        className="inline-block bg-primary text-primary-foreground font-medium rounded-lg px-4 py-2 text-sm hover:bg-primary-hover"
      >
        {cta}
      </Link>
    </div>
  );
}

function LoggedCard({
  session,
  today,
  trend,
  onReopen,
}: {
  session: Session;
  today: string;
  trend: { text: string } | null;
  onReopen: () => void;
}) {
  const peak = sessionPeak(session.sets);
  const moves = sessionMoves(session.sets);
  return (
    <section className="bg-card border border-border rounded-xl p-4">
      <p className="text-subtle text-sm capitalize">{formatDayBR(today)}</p>
      <h2 className="font-semibold text-foreground text-lg mt-0.5 mb-3">
        {session.aborted ? "Sessão abortada" : "Sessão registrada"}
      </h2>
      {session.aborted ? (
        <p className="text-muted-foreground text-sm">
          Adiada, como manda o protocolo. Voltar antes dos dedos recuperarem é o
          caminho mais curto para a lesão.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border">
            {session.sets.map((s, i) => (
              <li key={i} className="py-1.5 flex justify-between text-sm tabular-nums">
                <span className="text-subtle">Série {i + 1}</span>
                <span className="text-foreground">
                  {s.kind === "recruit"
                    ? `E ${s.leftKg}kg · D ${s.rightKg}kg · ${s.pulls} puxadas`
                    : `${s.seconds}s · ${s.moves} movimentos`}
                </span>
              </li>
            ))}
          </ul>
          <dl className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border text-sm">
            {peak !== null && (
              <div>
                <dt className="text-subtle text-xs">Pico da sessão</dt>
                <dd className="text-foreground">{peak} kg</dd>
              </div>
            )}
            {moves > 0 && (
              <div>
                <dt className="text-subtle text-xs">Movimentos</dt>
                <dd className="text-foreground">{moves}</dd>
              </div>
            )}
          </dl>
          {trend && <p className="text-sm text-muted-foreground mt-3">{trend.text}</p>}
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
  );
}

function BaselineCard({
  today,
  onSkip,
  hideSkip = false,
}: {
  today: string;
  onSkip: () => void;
  hideSkip?: boolean;
}) {
  return (
    <div className="space-y-4">
      <section className="bg-card border border-primary/30 rounded-xl p-4">
        <p className="text-subtle text-sm capitalize">{formatDayBR(today)}</p>
        <h2 className="font-semibold text-foreground text-lg mt-0.5 mb-2">
          Teste de linha de base primeiro
        </h2>
        <p className="text-muted-foreground text-sm">
          O ciclo ainda não tem um MVC de referência. Sem ele o app não tem como
          aplicar o corte de prontidão de {READINESS_CUTOFF_PCT}% nem medir a
          evolução. É uma sessão de 20 minutos — faz hoje, treina na próxima.
        </p>
      </section>

      <section className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold text-foreground mb-1">Antes de subir no reglete</h3>
        <ul className="text-sm text-muted-foreground space-y-1.5 mb-4 list-disc pl-4">
          <li>Dedos descansados: 48h sem escalada dura nem suspensão.</li>
          <li>
            Célula ancorada firme embaixo, reglete de {TEST_EDGE_MM}mm, meia-crimp,
            puxada para cima.
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
              <span className="text-muted-foreground">~{w.pct}% do máximo estimado</span>
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
            <strong className="text-foreground">{TEST_PULL_SECONDS} segundos</strong> no
            máximo esforço.
          </li>
          <li>
            O comando mental é{" "}
            <strong className="text-foreground">puxar o mais forte possível</strong> —
            não &ldquo;aguentar&rdquo;. O pico chega nos primeiros 2–3s.
          </li>
          <li>
            Até {TEST_ATTEMPTS} tentativas por mão, {TEST_REST_MIN} min entre elas.
            Fica com a melhor.
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
        {!hideSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="text-subtle hover:text-foreground text-sm px-4"
          >
            Treinar mesmo assim
          </button>
        )}
      </div>
    </div>
  );
}
