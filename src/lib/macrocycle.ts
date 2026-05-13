import { shiftDay, diffDays, isValidDayKey } from "@/lib/dates";
import type { Trip } from "@/app/actions-viagens";

export type PhaseType = "max_strength" | "power" | "specificity" | "taper";

export type DayRole =
  | "rest"
  | "force_max"
  | "power"
  | "power_endurance"
  | "specificity"
  | "technique"
  | "mobility"
  | "aerobic"
  | "rock"
  | "taper_light";

export type NutritionMode =
  | "deficit_forte"
  | "deficit_moderado"
  | "manutencao"
  | "indefinido";

export interface Microcycle {
  monday: DayRole;
  tuesday: DayRole;
  wednesday: DayRole;
  thursday: DayRole;
  friday: DayRole;
  saturday: DayRole;
  sunday: DayRole;
}

export interface Phase {
  type: PhaseType;
  name: string;
  startDate: string;
  endDate: string;
  microcycle: Microcycle;
  nutritionMode: NutritionMode;
  focusDescription: string;
}

export interface Macrocycle {
  _id: string;
  userEmail: string;
  name: string;
  targetTripId: string | null;
  phases: Phase[];
  createdAt: string;
}

export const PHASE_TYPES: PhaseType[] = [
  "max_strength",
  "power",
  "specificity",
  "taper",
];

export const PHASE_TYPE_LABEL: Record<PhaseType, string> = {
  max_strength: "Max Strength & Recruitment",
  power: "Power & Power Endurance",
  specificity: "Specificity & Simulation",
  taper: "Taper & Perform",
};

export const DAY_ROLES: DayRole[] = [
  "rest",
  "force_max",
  "power",
  "power_endurance",
  "specificity",
  "technique",
  "mobility",
  "aerobic",
  "rock",
  "taper_light",
];

export const DAY_ROLE_LABEL: Record<DayRole, string> = {
  rest: "Descanso",
  force_max: "Força máxima",
  power: "Power",
  power_endurance: "Power endurance",
  specificity: "Simulação",
  technique: "Técnica",
  mobility: "Mobilidade",
  aerobic: "Aeróbico",
  rock: "Rocha",
  taper_light: "Ativação leve",
};

export const DAY_ROLE_COLOR: Record<DayRole, string> = {
  rest: "bg-slate-700/50 text-slate-300",
  force_max: "bg-rose-500/20 text-rose-300",
  power: "bg-lime-500/20 text-lime-300",
  power_endurance: "bg-fuchsia-500/20 text-fuchsia-300",
  specificity: "bg-violet-500/20 text-violet-300",
  technique: "bg-indigo-500/20 text-indigo-300",
  mobility: "bg-sky-500/20 text-sky-300",
  aerobic: "bg-cyan-500/20 text-cyan-300",
  rock: "bg-emerald-500/30 text-emerald-200",
  taper_light: "bg-teal-500/20 text-teal-300",
};

export const NUTRITION_MODES: NutritionMode[] = [
  "deficit_forte",
  "deficit_moderado",
  "manutencao",
  "indefinido",
];

export const NUTRITION_MODE_LABEL: Record<NutritionMode, string> = {
  deficit_forte: "Déficit forte",
  deficit_moderado: "Déficit moderado",
  manutencao: "Manutenção",
  indefinido: "Indefinido",
};

const DEFAULT_MICROCYCLES: Record<PhaseType, Microcycle> = {
  max_strength: {
    monday: "rest",
    tuesday: "force_max",
    wednesday: "mobility",
    thursday: "force_max",
    friday: "rest",
    saturday: "rock",
    sunday: "rock",
  },
  power: {
    monday: "rest",
    tuesday: "power",
    wednesday: "aerobic",
    thursday: "power_endurance",
    friday: "rest",
    saturday: "rock",
    sunday: "rock",
  },
  specificity: {
    monday: "rest",
    tuesday: "specificity",
    wednesday: "technique",
    thursday: "specificity",
    friday: "rest",
    saturday: "rock",
    sunday: "rock",
  },
  taper: {
    monday: "rest",
    tuesday: "force_max",
    wednesday: "mobility",
    thursday: "taper_light",
    friday: "rest",
    saturday: "rock",
    sunday: "rock",
  },
};

const DEFAULT_FOCUS: Record<PhaseType, string> = {
  max_strength:
    "Hangboard pesado, weighted pulls 80-95% 1RM, limit boulder 3-6 movimentos. Volume baixo, descanso longo.",
  power:
    "Campus, boulders longos (6-12 movimentos), linkups. 1×/sem manter força máxima.",
  specificity:
    "Replicar estilo dos boulders-alvo. Crimps específicos, ângulos, comprimentos. Tentativas redpoint-style.",
  taper:
    "Menos sessões, alta intenção. Pele e recuperação prioritárias.",
};

const DEFAULT_NUTRITION: Record<PhaseType, NutritionMode> = {
  max_strength: "indefinido",
  power: "indefinido",
  specificity: "manutencao",
  taper: "manutencao",
};

export function defaultMicrocycle(type: PhaseType): Microcycle {
  return { ...DEFAULT_MICROCYCLES[type] };
}

export function defaultFocus(type: PhaseType): string {
  return DEFAULT_FOCUS[type];
}

export function defaultNutrition(type: PhaseType): NutritionMode {
  return DEFAULT_NUTRITION[type];
}

export function getCurrentPhase(
  macrocycle: Macrocycle,
  dayKey: string
): Phase | null {
  for (const p of macrocycle.phases) {
    if (p.startDate <= dayKey && dayKey <= p.endDate) return p;
  }
  return null;
}

const WEEKDAY_KEYS: Array<keyof Microcycle> = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function getDayRole(microcycle: Microcycle, dayKey: string): DayRole {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return microcycle[WEEKDAY_KEYS[dow]];
}

export type DayRoleSource = "manual" | "trip" | "phase" | "none";

export interface ResolvedDay {
  role: DayRole;
  source: DayRoleSource;
  trip: Trip | null;
}

// Resolves the effective role of a date.
// Priority: manual override > trip > phase template > fallback "rest".
export function resolveDayRole(
  dayKey: string,
  phase: Phase | null,
  trips: Trip[],
  overrides?: Map<string, DayRole> | Record<string, DayRole>
): ResolvedDay {
  const manualRole =
    overrides instanceof Map ? overrides.get(dayKey) : overrides?.[dayKey];
  if (manualRole) {
    return { role: manualRole, source: "manual", trip: null };
  }
  for (const trip of trips) {
    if (trip.startDate <= dayKey && dayKey <= trip.endDate) {
      const tripDay = trip.days.find((d) => d.date === dayKey);
      if (tripDay) {
        return {
          role: tripDay.activity === "climb" ? "rock" : "rest",
          source: "trip",
          trip,
        };
      }
    }
  }
  if (phase) {
    return {
      role: getDayRole(phase.microcycle, dayKey),
      source: "phase",
      trip: null,
    };
  }
  return { role: "rest", source: "none", trip: null };
}

export function getPhaseWeekNumber(phase: Phase, dayKey: string): number {
  return Math.floor(diffDays(phase.startDate, dayKey) / 7) + 1;
}

export function getPhaseTotalWeeks(phase: Phase): number {
  return Math.ceil((diffDays(phase.startDate, phase.endDate) + 1) / 7);
}

export function isMacrocycleActive(
  macrocycle: Macrocycle,
  dayKey: string
): boolean {
  if (macrocycle.phases.length === 0) return false;
  const first = macrocycle.phases[0];
  const last = macrocycle.phases[macrocycle.phases.length - 1];
  return first.startDate <= dayKey && dayKey <= last.endDate;
}

// Builds a 4-phase scaffold backwards from a target performance date.
// Default widths: Taper 10d, Specificity 14d, Power 14d, Max Strength = rest (clamped ≥ 14d).
// If window < 28d, returns error. If window can't fit min widths, splits proportionally.
export function scaffoldPhases(
  startDate: string,
  targetDate: string
): Phase[] | { error: string } {
  if (!isValidDayKey(startDate) || !isValidDayKey(targetDate)) {
    return { error: "Datas inválidas" };
  }
  if (startDate >= targetDate) {
    return { error: "Data alvo deve ser após o início" };
  }

  const totalDays = diffDays(startDate, targetDate);
  if (totalDays < 28) {
    return { error: "Janela muito curta para 4 fases (mínimo ~4 semanas)" };
  }

  const taperDays = 10;
  const specificityDays = 14;
  const powerDays = 14;
  const maxStrengthDays = totalDays - (taperDays + specificityDays + powerDays);

  if (maxStrengthDays < 14) {
    const half = Math.floor(totalDays / 2);
    const remaining = totalDays - half;
    const each = Math.floor(remaining / 3);
    return [
      buildPhase("max_strength", startDate, half),
      buildPhase("power", shiftDay(startDate, half), each),
      buildPhase("specificity", shiftDay(startDate, half + each), each),
      buildPhase(
        "taper",
        shiftDay(startDate, half + 2 * each),
        remaining - 2 * each
      ),
    ];
  }

  return [
    buildPhase("max_strength", startDate, maxStrengthDays),
    buildPhase("power", shiftDay(startDate, maxStrengthDays), powerDays),
    buildPhase(
      "specificity",
      shiftDay(startDate, maxStrengthDays + powerDays),
      specificityDays
    ),
    buildPhase(
      "taper",
      shiftDay(startDate, maxStrengthDays + powerDays + specificityDays),
      taperDays
    ),
  ];
}

function buildPhase(
  type: PhaseType,
  startDate: string,
  durationDays: number
): Phase {
  return {
    type,
    name: PHASE_TYPE_LABEL[type],
    startDate,
    endDate: shiftDay(startDate, durationDays - 1),
    microcycle: defaultMicrocycle(type),
    nutritionMode: defaultNutrition(type),
    focusDescription: defaultFocus(type),
  };
}
