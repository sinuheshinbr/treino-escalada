/**
 * Protocolo MaxHangs — periodização MAW → MED (Eva López).
 *
 * MAW (Maximum Added Weight): reglete fixo e confortável (20mm), carga no cinto.
 * MED (Minimum Edge Depth): peso corporal, reglete progressivamente menor.
 *
 * Princípios que o app faz questão de respeitar:
 *  - Nunca até a falha: cada suspensão para com 3–5s de margem.
 *  - A progressão dentro do bloco é por NÚMERO DE SÉRIES (3-4-4-5), não por carga.
 *  - Deload obrigatório ao fim de cada bloco de 4 semanas.
 *  - Autorregulação: queda >25% na carga (MAW) ou >2mm no reglete (MED) aborta a sessão.
 *
 * Fontes: en-eva-lopez.blogspot.com, Fingerboard Training Guide II e III.
 */

export type Phase = "maw" | "med" | "deload";
export type Grip = "half-crimp" | "open";
export type Readiness = "verde" | "amarelo" | "laranja" | "vermelho";

export const MAW_EDGE_MM = 20;
export const HANG_SECONDS = 10;
export const REST_SECONDS = 180;
export const SESSIONS_PER_WEEK = 2;
export const CYCLE_LENGTH_WEEKS = 10;

/** Queda de carga que dispara abortar a sessão (MAW). */
export const ABORT_LOAD_DROP_PCT = 25;
/** Aumento de profundidade do reglete que dispara abortar a sessão (MED). */
export const ABORT_EDGE_GAIN_MM = 2;

export interface WeekPlan {
  week: number;
  phase: Phase;
  sets: number;
  hangSeconds: number;
  /** Segundos de reserva até a falha. Abaixo de 3s a adaptação neural piora. */
  targetMargin: number;
  focus: string;
}

export const CYCLE: WeekPlan[] = [
  { week: 1, phase: "maw", sets: 3, hangSeconds: 10, targetMargin: 5, focus: "Entrada no bloco: carga conservadora, aprende a calibrar a margem." },
  { week: 2, phase: "maw", sets: 4, hangSeconds: 10, targetMargin: 5, focus: "Mesma carga, uma série a mais." },
  { week: 3, phase: "maw", sets: 4, hangSeconds: 10, targetMargin: 5, focus: "Consolida o volume antes do pico." },
  { week: 4, phase: "maw", sets: 5, hangSeconds: 10, targetMargin: 5, focus: "Pico de volume do bloco MAW." },
  { week: 5, phase: "deload", sets: 2, hangSeconds: 10, targetMargin: 7, focus: "Deload obrigatório. Carga leve, só para manter o padrão motor." },
  { week: 6, phase: "med", sets: 3, hangSeconds: 10, targetMargin: 3, focus: "Vira a chave: sai o lastro, entra o reglete menor." },
  { week: 7, phase: "med", sets: 4, hangSeconds: 10, targetMargin: 3, focus: "Mesmo reglete, uma série a mais." },
  { week: 8, phase: "med", sets: 4, hangSeconds: 10, targetMargin: 3, focus: "Consolida antes do pico." },
  { week: 9, phase: "med", sets: 5, hangSeconds: 10, targetMargin: 3, focus: "Pico de volume do bloco MED." },
  { week: 10, phase: "deload", sets: 2, hangSeconds: 10, targetMargin: 7, focus: "Deload. Fecha o ciclo e testa a força máxima no fim da semana." },
];

export const PHASE_LABEL: Record<Phase, string> = {
  maw: "MAW — carga no 20mm",
  med: "MED — reglete mínimo",
  deload: "Deload",
};

export const PHASE_SHORT: Record<Phase, string> = {
  maw: "MAW",
  med: "MED",
  deload: "Deload",
};

export const PHASE_COLOR: Record<Phase, string> = {
  maw: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  med: "bg-lime-500/15 text-lime-300 border-lime-500/30",
  deload: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

export const GRIP_LABEL: Record<Grip, string> = {
  "half-crimp": "Meia-crimp",
  open: "Aberta",
};

/** Escala Green Day (Charlie Schreiber) para a checagem pré-sessão. */
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

/** Em que semana do ciclo (1–10) cai um dia, dado o nº de dias desde o início. */
export function cycleWeek(daysSinceStart: number): number | null {
  if (daysSinceStart < 0) return null;
  const week = Math.floor(daysSinceStart / 7) + 1;
  return week <= CYCLE_LENGTH_WEEKS ? week : null;
}

export interface SetLog {
  edgeMm: number;
  loadKg: number;
  hangSeconds: number;
  /** Segundos que o usuário sente que ainda aguentaria. */
  marginSeconds: number;
}

export function avgMargin(sets: SetLog[]): number | null {
  if (sets.length === 0) return null;
  const sum = sets.reduce((acc, s) => acc + s.marginSeconds, 0);
  return Math.round((sum / sets.length) * 10) / 10;
}

/** Carga de trabalho da sessão: a maior usada (MAW) / o menor reglete (MED). */
export function workingLoad(sets: SetLog[]): number | null {
  if (sets.length === 0) return null;
  return Math.max(...sets.map((s) => s.loadKg));
}

export function workingEdge(sets: SetLog[]): number | null {
  if (sets.length === 0) return null;
  return Math.min(...sets.map((s) => s.edgeMm));
}

export interface Verdict {
  status: "go" | "caution" | "abort";
  reasons: string[];
}

/**
 * Checagem pré-sessão: cruza a disposição declarada com a carga que o
 * aquecimento revelou hoje contra a última sessão da mesma fase.
 */
export function preSessionCheck(input: {
  readiness: Readiness;
  phase: Phase;
  todayEdgeMm: number;
  todayLoadKg: number;
  lastEdgeMm: number | null;
  lastLoadKg: number | null;
}): Verdict {
  const reasons: string[] = [];
  let status: Verdict["status"] = "go";

  const scale = READINESS_SCALE.find((r) => r.id === input.readiness);
  if (scale && scale.verdict !== "go") {
    status = scale.verdict;
    reasons.push(`Disposição ${scale.label.toLowerCase()}: ${scale.hint}`);
  }

  if (input.phase === "maw" && input.lastLoadKg && input.lastLoadKg > 0) {
    const dropPct = ((input.lastLoadKg - input.todayLoadKg) / input.lastLoadKg) * 100;
    if (dropPct > ABORT_LOAD_DROP_PCT) {
      status = "abort";
      reasons.push(
        `Carga ${Math.round(dropPct)}% abaixo da última sessão (${input.lastLoadKg}kg → ${input.todayLoadKg}kg). ` +
          `O gatilho do protocolo é ${ABORT_LOAD_DROP_PCT}%.`
      );
    }
  }

  if (input.phase === "med" && input.lastEdgeMm) {
    const gain = input.todayEdgeMm - input.lastEdgeMm;
    if (gain > ABORT_EDGE_GAIN_MM) {
      status = "abort";
      reasons.push(
        `Reglete ${gain}mm mais fundo que a última sessão (${input.lastEdgeMm}mm → ${input.todayEdgeMm}mm). ` +
          `O gatilho do protocolo é ${ABORT_EDGE_GAIN_MM}mm.`
      );
    }
  }

  if (status === "go" && reasons.length === 0) {
    reasons.push("Dentro dos parâmetros. Bom treino.");
  }
  return { status, reasons };
}

/**
 * Sugestão para a próxima sessão, comparando a margem média registrada
 * com a margem-alvo da semana. Ordem de alavancas da Eva López:
 * margem → profundidade do reglete → duração da suspensão.
 */
export function suggestNext(
  phase: Phase,
  targetMargin: number,
  sets: SetLog[]
): { loadDeltaKg: number; edgeDeltaMm: number; text: string } {
  const avg = avgMargin(sets);
  if (avg === null) {
    return { loadDeltaKg: 0, edgeDeltaMm: 0, text: "Sem séries registradas." };
  }
  const diff = avg - targetMargin;

  if (phase === "deload") {
    return { loadDeltaKg: 0, edgeDeltaMm: 0, text: "Semana de deload: mantém leve, sem progredir." };
  }

  if (phase === "maw") {
    if (diff >= 2) return { loadDeltaKg: 2, edgeDeltaMm: 0, text: `Margem média ${avg}s contra alvo de ${targetMargin}s. Sobrou bastante: sobe 2kg.` };
    if (diff >= 1) return { loadDeltaKg: 1, edgeDeltaMm: 0, text: `Margem média ${avg}s contra alvo de ${targetMargin}s. Sobe 1kg.` };
    if (diff <= -1) return { loadDeltaKg: -2, edgeDeltaMm: 0, text: `Margem média ${avg}s contra alvo de ${targetMargin}s. Passou do ponto: desce 2kg.` };
    return { loadDeltaKg: 0, edgeDeltaMm: 0, text: `Margem média ${avg}s, em cima do alvo de ${targetMargin}s. Mantém a carga.` };
  }

  if (diff >= 2) return { loadDeltaKg: 0, edgeDeltaMm: -1, text: `Margem média ${avg}s contra alvo de ${targetMargin}s. Sobrou: tira 1mm do reglete.` };
  if (diff <= -1) return { loadDeltaKg: 0, edgeDeltaMm: 1, text: `Margem média ${avg}s contra alvo de ${targetMargin}s. Volta 1mm no reglete.` };
  return { loadDeltaKg: 0, edgeDeltaMm: 0, text: `Margem média ${avg}s, em cima do alvo de ${targetMargin}s. Mantém o reglete.` };
}

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
