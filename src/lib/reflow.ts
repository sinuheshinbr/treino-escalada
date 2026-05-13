import { diffDays, shiftDay } from "@/lib/dates";
import {
  DAY_ROLE_LABEL,
  getDayRole,
  resolveDayRole,
  type DayRole,
  type DayRoleSource,
  type Macrocycle,
  type Phase,
  type PhaseType,
} from "@/lib/macrocycle";
import type { Trip } from "@/app/actions-viagens";
import type { ReflowAck } from "@/app/actions-reflow-acks";

export type WeekDayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface WeekDayCell {
  date: string;
  weekdayKey: WeekDayKey;
  weekdayLabel: string;
  planned: DayRole | null;
  actual: DayRole;
  source: DayRoleSource;
  trip: Trip | null;
  changed: boolean;
  isToday: boolean;
  isPast: boolean;
}

export interface RoleDelta {
  role: DayRole;
  planned: number;
  actual: number;
  delta: number;
}

export type ReflowPriority = "high" | "med" | "low";

export interface ReflowSuggestion {
  id: string;
  title: string;
  description: string;
  apply: Array<{ date: string; role: DayRole }>;
  priority: ReflowPriority;
  ack?: { kind: "accept_loss"; role: DayRole; gap: number };
}

export interface WeekAnalysis {
  weekStart: string;
  weekEnd: string;
  phase: Phase | null;
  macrocycleName: string | null;
  phaseWeekNumber: number | null;
  phaseTotalWeeks: number | null;
  days: WeekDayCell[];
  deltas: RoleDelta[];
  primaryRole: DayRole | null;
  primaryGap: number;
  consecutiveClimbRun: number;
  suggestions: ReflowSuggestion[];
}

const DOW_TO_KEY: Record<number, WeekDayKey> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

const WEEKDAY_LABEL: Record<WeekDayKey, string> = {
  monday: "Seg",
  tuesday: "Ter",
  wednesday: "Qua",
  thursday: "Qui",
  friday: "Sex",
  saturday: "Sáb",
  sunday: "Dom",
};

const PRIMARY_ROLE_BY_PHASE: Record<PhaseType, DayRole | null> = {
  max_strength: "force_max",
  power: "power",
  specificity: "specificity",
  taper: null,
};

export function weekStartFor(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  const back = (dow - 1 + 7) % 7;
  return shiftDay(dayKey, -back);
}

export function analyzeWeek(
  weekStart: string,
  today: string,
  macrocycle: Macrocycle | null,
  trips: Trip[],
  overrides: Map<string, DayRole>,
  acks: ReflowAck[] = []
): WeekAnalysis {
  const weekEnd = shiftDay(weekStart, 6);

  let phase: Phase | null = null;
  if (macrocycle) {
    phase =
      macrocycle.phases.find(
        (p) => p.startDate <= weekStart && weekStart <= p.endDate
      ) ??
      macrocycle.phases.find(
        (p) => p.startDate <= weekEnd && weekEnd <= p.endDate
      ) ??
      null;
  }

  const days: WeekDayCell[] = [];
  for (let i = 0; i < 7; i++) {
    const date = shiftDay(weekStart, i);
    const [y, m, dd] = date.split("-").map(Number);
    const dow = new Date(y, m - 1, dd).getDay();
    const wkKey = DOW_TO_KEY[dow];
    const planned = phase ? getDayRole(phase.microcycle, date) : null;
    const resolved = resolveDayRole(date, phase, trips, overrides);
    days.push({
      date,
      weekdayKey: wkKey,
      weekdayLabel: WEEKDAY_LABEL[wkKey],
      planned,
      actual: resolved.role,
      source: resolved.source,
      trip: resolved.trip,
      changed: planned != null && resolved.role !== planned,
      isToday: date === today,
      isPast: date < today,
    });
  }

  const plannedCounts: Partial<Record<DayRole, number>> = {};
  const actualCounts: Partial<Record<DayRole, number>> = {};
  for (const d of days) {
    if (d.planned) {
      plannedCounts[d.planned] = (plannedCounts[d.planned] ?? 0) + 1;
    }
    actualCounts[d.actual] = (actualCounts[d.actual] ?? 0) + 1;
  }

  const allRoles = new Set<DayRole>([
    ...(Object.keys(plannedCounts) as DayRole[]),
    ...(Object.keys(actualCounts) as DayRole[]),
  ]);
  const deltas: RoleDelta[] = [];
  for (const role of allRoles) {
    const p = plannedCounts[role] ?? 0;
    const a = actualCounts[role] ?? 0;
    if (a !== p) deltas.push({ role, planned: p, actual: a, delta: a - p });
  }
  deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const primaryRole =
    phase != null ? PRIMARY_ROLE_BY_PHASE[phase.type] : null;
  const primaryGap =
    primaryRole != null
      ? (plannedCounts[primaryRole] ?? 0) - (actualCounts[primaryRole] ?? 0)
      : 0;

  let consecClimb = 0;
  let run = 0;
  for (const d of days) {
    if (d.actual === "rock") {
      run += 1;
      if (run > consecClimb) consecClimb = run;
    } else {
      run = 0;
    }
  }

  const suggestions: ReflowSuggestion[] = [];

  if (primaryRole && primaryGap > 0) {
    const ackCoversGap = acks.some(
      (a) =>
        a.kind === "accept_loss" &&
        a.role === primaryRole &&
        a.acceptedGap >= primaryGap
    );
    if (!ackCoversGap) {
      const flexibleRoles: DayRole[] = [
        "rest",
        "mobility",
        "aerobic",
        "technique",
      ];
      const candidates = days.filter(
        (d) =>
          !d.isPast &&
          d.source !== "trip" &&
          d.source !== "manual" &&
          d.actual !== primaryRole &&
          flexibleRoles.includes(d.actual)
      );
      const slots = candidates.slice(0, primaryGap);
      for (const c of slots) {
        const adj = adjacencyWarning(days, c.date, primaryRole);
        suggestions.push({
          id: `move-${primaryRole}-${c.date}`,
          title: `Mover ${lower(primaryRole)} para ${c.weekdayLabel} (${shortDate(c.date)})`,
          description: adj
            ? `${c.weekdayLabel} estava como ${lower(c.actual)}. ${adj}`
            : `${c.weekdayLabel} estava como ${lower(c.actual)}. Sem dia hard adjacente — janela boa.`,
          apply: [{ date: c.date, role: primaryRole }],
          priority: "high",
        });
      }
      suggestions.push({
        id: `accept-loss-${primaryRole}`,
        title: `Aceitar perda de ${primaryGap} sessão${primaryGap !== 1 ? "ões" : ""} de ${lower(primaryRole)}`,
        description:
          primaryGap >= 2
            ? "Vão faltar 2+ sessões do estímulo principal. A fase pode atrasar 1-2 semanas."
            : "1 sessão a menos não derruba a fase; mantém recuperação intacta.",
        apply: [],
        priority: primaryGap >= 2 ? "med" : "low",
        ack: { kind: "accept_loss", role: primaryRole, gap: primaryGap },
      });
    }
  }

  if (consecClimb >= 3) {
    const candidateAfter = findDayAfterRun(days);
    if (candidateAfter) {
      suggestions.push({
        id: `rest-after-${candidateAfter.date}`,
        title: `Marcar ${candidateAfter.weekdayLabel} (${shortDate(candidateAfter.date)}) como descanso extra`,
        description: `${consecClimb} dias seguidos de escalada cobram em tendão e recuperação. Rest extra logo depois fecha o buraco.`,
        apply: [{ date: candidateAfter.date, role: "rest" }],
        priority: "med",
      });
    }
  }

  let phaseWeekNumber: number | null = null;
  let phaseTotalWeeks: number | null = null;
  if (phase) {
    phaseWeekNumber =
      Math.floor(diffDays(phase.startDate, weekStart) / 7) + 1;
    phaseTotalWeeks = Math.ceil(
      (diffDays(phase.startDate, phase.endDate) + 1) / 7
    );
    if (phaseWeekNumber < 1) phaseWeekNumber = 1;
    if (phaseWeekNumber > phaseTotalWeeks) phaseWeekNumber = phaseTotalWeeks;
  }

  return {
    weekStart,
    weekEnd,
    phase,
    macrocycleName: macrocycle?.name ?? null,
    phaseWeekNumber,
    phaseTotalWeeks,
    days,
    deltas,
    primaryRole,
    primaryGap,
    consecutiveClimbRun: consecClimb,
    suggestions,
  };
}

function findDayAfterRun(days: WeekDayCell[]): WeekDayCell | null {
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    if (d.isPast || d.source === "trip" || d.source === "manual") continue;
    let r = 0;
    for (let j = i - 1; j >= 0; j--) {
      if (days[j].actual === "rock") r += 1;
      else break;
    }
    if (r >= 3) return d;
  }
  return null;
}

function adjacencyWarning(
  days: WeekDayCell[],
  date: string,
  proposedRole: DayRole
): string | null {
  const idx = days.findIndex((d) => d.date === date);
  if (idx === -1) return null;
  const hard = (r: DayRole) =>
    r === "force_max" ||
    r === "power" ||
    r === "power_endurance" ||
    r === "specificity" ||
    r === "rock";
  if (!hard(proposedRole)) return null;
  const prev = idx > 0 ? days[idx - 1].actual : null;
  const next = idx < days.length - 1 ? days[idx + 1].actual : null;
  if (prev && hard(prev)) {
    return `Anterior é ${lower(prev)} — 2 dias hard seguidos. Considere reduzir intensidade.`;
  }
  if (next && hard(next)) {
    return `Próximo dia é ${lower(next)} — vai stackar carga.`;
  }
  return null;
}

function lower(role: DayRole): string {
  return DAY_ROLE_LABEL[role].toLowerCase();
}

function shortDate(date: string): string {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}
