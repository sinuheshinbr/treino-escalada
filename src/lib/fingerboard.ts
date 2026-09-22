/**
 * Protocolo de força máxima de dedos com célula de carga.
 *
 * Baseado nas "isolated active recruitment pulls" de Tyler Nelson (Camp4 Human
 * Performance): isometria de SOBREPOSIÇÃO — a força é produzida contra uma borda
 * portátil fixa e medida, em vez de suspensa com lastro.
 *
 * Por que aqui e não MaxHangs (Eva López): a montagem disponível é uma prancha
 * portátil + célula de carga, sem como pendurar com lastro nem regletes abaixo
 * de 20mm. Isso inviabiliza tanto MAW quanto MED. O protocolo de puxadas resolve
 * os dois: a intensidade se controla por força, não por lastro nem profundidade.
 *
 * Periodização em 10 semanas, geral → específico:
 *   1–4   RECRUIT — puxadas máximas na célula, mão a mão
 *   5     deload
 *   6–9   BOARD   — recrutamento ativo na parede, movimentos curtos e controlados
 *   10    deload + reteste
 *
 * Fontes:
 *  - camp4humanperformance.com/blog/2018/9/20/program-auto-regulation-...
 *  - strengthclimbing.com/dr-tyler-nelsons-new-active-finger-strength-training-protocols
 */

export type Phase = "recruit" | "board" | "deload";
export type Grip = "half-crimp" | "open";
export type Readiness = "verde" | "amarelo" | "laranja" | "vermelho";

export const TEST_EDGE_MM = 20;
export const CYCLE_LENGTH_WEEKS = 10;
export const SESSIONS_PER_WEEK = 2;

/**
 * Corte de prontidão: depois do aquecimento, uma puxada de teste precisa atingir
 * esta fração do MVC de referência. Abaixo disso, não se treina dedo no dia.
 * Nelson usa 85% para a maioria das pegadas e 90% para as de maior risco
 * (crimp fechado). Meia-crimp fica em 85%.
 */
export const READINESS_CUTOFF_PCT = 85;

/** Descanso entre puxadas máximas dentro da série. */
export const PULL_REST_SECONDS = 5;

/* ------------------------- teste de força máxima ------------------------- */

/** Duração da puxada de teste. O pico chega nos primeiros 2–3s; 7s garante capturá-lo. */
export const TEST_PULL_SECONDS = 7;
export const TEST_REST_MIN = 3;
export const TEST_ATTEMPTS = 3;
export const BASELINE_WINDOW_DAYS = 14;
export const TEST_REST_HOURS = 48;

export interface WarmupStep {
  pct: number;
  seconds: number;
  restMin: number;
}

/** Aquecimento progressivo antes do teste. Testar frio é como se lesiona. */
export const TEST_WARMUP: WarmupStep[] = [
  { pct: 50, seconds: 5, restMin: 1 },
  { pct: 70, seconds: 5, restMin: 2 },
  { pct: 85, seconds: 5, restMin: 2 },
  { pct: 90, seconds: 3, restMin: 3 },
];

export const TEST_INVALIDATORS = [
  "Posição do braço ou do corpo diferente da do teste anterior",
  "Meia-crimp desmanchando para pegada aberta no meio da puxada",
  "Dedos não descansados — some com o efeito do bloco inteiro",
  "Horário do dia muito diferente",
];

/* ------------------------------ o ciclo ------------------------------ */

interface BaseWeek {
  week: number;
  sets: number;
  restMin: number;
  focus: string;
}

export interface RecruitWeek extends BaseWeek {
  phase: "recruit" | "deload";
  pullsPerSet: number;
  pullSeconds: number;
  /** Alvo de intensidade. Máximo no bloco, submáximo no deload. */
  maxIntent: boolean;
}

export interface BoardWeek extends BaseWeek {
  phase: "board";
  setSeconds: number;
  movesPerSet: number;
  holdSeconds: number;
}

export type WeekPlan = RecruitWeek | BoardWeek;

export const CYCLE: WeekPlan[] = [
  { week: 1, phase: "recruit", sets: 3, pullsPerSet: 3, pullSeconds: 3, maxIntent: true, restMin: 3, focus: "Entrada: aprende a construir força nos 3s e a achar a posição repetível." },
  { week: 2, phase: "recruit", sets: 4, pullsPerSet: 3, pullSeconds: 3, maxIntent: true, restMin: 3, focus: "Uma série a mais, mesma intenção máxima." },
  { week: 3, phase: "recruit", sets: 4, pullsPerSet: 4, pullSeconds: 3, maxIntent: true, restMin: 4, focus: "Sobe a densidade de puxadas por série." },
  { week: 4, phase: "recruit", sets: 5, pullsPerSet: 4, pullSeconds: 3, maxIntent: true, restMin: 4, focus: "Pico do bloco. 40 puxadas máximas, ~45s sob tensão." },
  { week: 5, phase: "deload", sets: 2, pullsPerSet: 3, pullSeconds: 3, maxIntent: false, restMin: 3, focus: "Deload. Puxadas a ~70%, só para manter o padrão. Decidir o board do bloco 2." },
  { week: 6, phase: "board", sets: 5, setSeconds: 45, movesPerSet: 6, holdSeconds: 5, restMin: 3, focus: "Vira a chave: sai a célula, entra a parede. Movimentos curtos e controlados." },
  { week: 7, phase: "board", sets: 6, setSeconds: 45, movesPerSet: 8, holdSeconds: 5, restMin: 3, focus: "Mais movimentos por série." },
  { week: 8, phase: "board", sets: 8, setSeconds: 50, movesPerSet: 8, holdSeconds: 6, restMin: 4, focus: "Sobe o volume e o tempo por posição." },
  { week: 9, phase: "board", sets: 10, setSeconds: 50, movesPerSet: 12, holdSeconds: 6, restMin: 4, focus: "Pico do bloco. Agarras menores se a qualidade do movimento aguentar." },
  { week: 10, phase: "deload", sets: 2, pullsPerSet: 3, pullSeconds: 3, maxIntent: false, restMin: 3, focus: "Deload e reteste de MVC. Fecha o ciclo com número comparável ao do início." },
];

export const PHASE_LABEL: Record<Phase, string> = {
  recruit: "Puxadas de recrutamento",
  board: "Recrutamento no board",
  deload: "Deload",
};

export const PHASE_SHORT: Record<Phase, string> = {
  recruit: "Célula",
  board: "Board",
  deload: "Deload",
};

export const PHASE_COLOR: Record<Phase, string> = {
  recruit: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  board: "bg-lime-500/15 text-lime-300 border-lime-500/30",
  deload: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

export const GRIP_LABEL: Record<Grip, string> = {
  "half-crimp": "Meia-crimp",
  open: "Aberta",
};

/** Escala Green Day (Charlie Schreiber) — complementa o corte objetivo, não o substitui. */
export const READINESS_SCALE: {
  id: Readiness;
  label: string;
  hint: string;
  verdict: "go" | "caution" | "abort";
}[] = [
  { id: "verde", label: "Verde", hint: "Recuperado. Treina.", verdict: "go" },
  { id: "amarelo", label: "Amarelo", hint: "Ok, mas não sobra. Treina com atenção.", verdict: "go" },
  { id: "laranja", label: "Laranja", hint: "Fatigado. Reduz volume ou adia.", verdict: "caution" },
  { id: "vermelho", label: "Vermelho", hint: "Dedos ou corpo pedindo trégua. Não treina.", verdict: "abort" },
];

export const READINESS_COLOR: Record<Readiness, string> = {
  verde: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  amarelo: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  laranja: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  vermelho: "bg-rose-500/15 text-rose-300 border-rose-500/40",
};

export function weekPlan(week: number): WeekPlan | null {
  return CYCLE.find((w) => w.week === week) ?? null;
}

export function isRecruitWeek(p: WeekPlan): p is RecruitWeek {
  return p.phase !== "board";
}

/** Em que semana do ciclo (1–10) cai um dia, dado o nº de dias desde o início. */
export function cycleWeek(daysSinceStart: number): number | null {
  if (daysSinceStart < 0) return null;
  const week = Math.floor(daysSinceStart / 7) + 1;
  return week <= CYCLE_LENGTH_WEEKS ? week : null;
}

/* ------------------------------ sessões ------------------------------ */

export type SessionSet =
  | { kind: "recruit"; leftKg: number; rightKg: number; pulls: number }
  | { kind: "board"; seconds: number; moves: number };

export function isRecruitSet(
  s: SessionSet
): s is { kind: "recruit"; leftKg: number; rightKg: number; pulls: number } {
  return s.kind === "recruit";
}

/** Maior pico da sessão, em kg. É a métrica que o bloco RECRUIT persegue. */
export function sessionPeak(sets: SessionSet[]): number | null {
  const vals = sets.filter(isRecruitSet).flatMap((s) => [s.leftKg, s.rightKg]);
  return vals.length ? Math.max(...vals) : null;
}

export function sessionPeakByHand(
  sets: SessionSet[]
): { left: number; right: number } | null {
  const r = sets.filter(isRecruitSet);
  if (!r.length) return null;
  return {
    left: Math.max(...r.map((s) => s.leftKg)),
    right: Math.max(...r.map((s) => s.rightKg)),
  };
}

/** Volume do bloco BOARD: total de movimentos na sessão. */
export function sessionMoves(sets: SessionSet[]): number {
  return sets.reduce((acc, s) => (s.kind === "board" ? acc + s.moves : acc), 0);
}

/* --------------------------- autorregulação --------------------------- */

export interface Verdict {
  status: "go" | "caution" | "abort";
  reasons: string[];
}

export function readinessThreshold(mvcKg: number): number {
  return Math.round(mvcKg * (READINESS_CUTOFF_PCT / 100) * 10) / 10;
}

/**
 * Checagem pré-sessão. O corte é objetivo: uma puxada de teste depois do
 * aquecimento precisa atingir 85% do MVC de referência. Abaixo disso os dedos
 * não estão recuperados, independente de como a pessoa se sente.
 */
export function preSessionCheck(input: {
  readiness: Readiness;
  mvcKg: number | null;
  readinessPullKg: number | null;
}): Verdict {
  const reasons: string[] = [];
  let status: Verdict["status"] = "go";

  const scale = READINESS_SCALE.find((r) => r.id === input.readiness);
  if (scale && scale.verdict !== "go") {
    status = scale.verdict;
    reasons.push(`Disposição ${scale.label.toLowerCase()}: ${scale.hint}`);
  }

  if (input.mvcKg && input.readinessPullKg !== null) {
    const cutoff = readinessThreshold(input.mvcKg);
    const pct = Math.round((input.readinessPullKg / input.mvcKg) * 100);
    if (input.readinessPullKg < cutoff) {
      status = "abort";
      reasons.push(
        `Puxada de teste em ${input.readinessPullKg}kg = ${pct}% do MVC (${input.mvcKg}kg). ` +
          `O corte é ${READINESS_CUTOFF_PCT}%, ou seja ${cutoff}kg. Dedos não recuperados.`
      );
    } else {
      reasons.push(
        `Puxada de teste em ${pct}% do MVC — acima do corte de ${READINESS_CUTOFF_PCT}%.`
      );
    }
  }

  if (status === "go" && reasons.length === 0) {
    reasons.push("Dentro dos parâmetros. Bom treino.");
  }
  return { status, reasons };
}

/**
 * Leitura de tendência do bloco RECRUIT. Nelson encerra o ciclo quando a força
 * de pico para de subir — duas sessões sem progresso é o sinal.
 */
export function peakTrend(
  peaks: number[]
): { delta: number | null; stalled: boolean; text: string } {
  if (peaks.length < 2) {
    return { delta: null, stalled: false, text: "Ainda sem sessão anterior para comparar." };
  }
  const [last, prev] = [peaks[peaks.length - 1], peaks[peaks.length - 2]];
  const delta = Math.round((last - prev) * 10) / 10;

  if (peaks.length >= 3) {
    const before = peaks[peaks.length - 3];
    if (last <= prev && prev <= before) {
      return {
        delta,
        stalled: true,
        text: `Pico parado há duas sessões (${before} → ${prev} → ${last}kg). Se repetir, é hora de deload ou de mudar o estímulo.`,
      };
    }
  }

  if (delta > 0) return { delta, stalled: false, text: `Pico subiu ${delta}kg desde a última sessão.` };
  if (delta < 0) return { delta, stalled: false, text: `Pico caiu ${Math.abs(delta)}kg. Uma sessão não faz tendência — observa a próxima.` };
  return { delta, stalled: false, text: "Pico estável desde a última sessão." };
}

/* --------------------------- métricas derivadas --------------------------- */

export function pctBodyweight(kg: number, bodyweightKg: number): number | null {
  if (!bodyweightKg || bodyweightKg <= 0) return null;
  return Math.round((kg / bodyweightKg) * 1000) / 10;
}

/** Assimetria entre as mãos, em % da mão mais forte. Acima de 10% merece atenção. */
export function asymmetryPct(leftKg: number, rightKg: number): number | null {
  const strong = Math.max(leftKg, rightKg);
  if (!strong) return null;
  return Math.round((Math.abs(leftKg - rightKg) / strong) * 1000) / 10;
}
