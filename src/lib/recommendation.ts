import type { Disposicao } from "@/app/actions-disposicao";
import type { Trip } from "@/app/actions-viagens";
import type { WorkoutCategory } from "@/app/actions-treinos";
import {
  DAY_ROLE_LABEL,
  type DayRole,
  type DayRoleSource,
} from "@/lib/macrocycle";
import { diffDays, getTodayKey } from "@/lib/dates";

export type Intensity = "descanso" | "leve" | "moderado" | "alto";

export interface RecommendationOption {
  id: string;
  label: string;
  description: string;
  category: WorkoutCategory;
  intensity: Intensity;
  tradeoff: string;
  apply?: { role: DayRole };
  recommended?: boolean;
}

export interface Recommendation {
  headline: string;
  rationale: string;
  category: WorkoutCategory;
  intensity: Intensity;
  trip: Trip | null;
  daysToTrip: number | null;
  inTrip: boolean;
  phaseName: string | null;
  phaseWeekNumber: number | null;
  plannedRole: DayRole | null;
  plannedRoleSource: DayRoleSource;
  options: RecommendationOption[];
}

export interface RecommendContext {
  phaseName: string | null;
  phaseWeekNumber: number | null;
  plannedRole: DayRole | null;
  plannedRoleSource: DayRoleSource;
}

const EMPTY_CTX: RecommendContext = {
  phaseName: null,
  phaseWeekNumber: null,
  plannedRole: null,
  plannedRoleSource: "none",
};

const ROLE_DEFAULTS: Record<
  DayRole,
  { category: WorkoutCategory; intensity: Intensity; description: string }
> = {
  rest: {
    category: "descanso",
    intensity: "descanso",
    description: "Descanso completo. Sono, hidratação, comida.",
  },
  force_max: {
    category: "forca",
    intensity: "alto",
    description:
      "Hangboard 7-12s pesado, weighted pulls 80-95% 1RM, limit boulder 3-6 movimentos. Descanso longo entre sets.",
  },
  power: {
    category: "forca",
    intensity: "alto",
    description: "Campus, boulders 6-12 movimentos, linkups potentes.",
  },
  power_endurance: {
    category: "forca",
    intensity: "alto",
    description: "4×4s, linkups longos. Bombeio com intenção.",
  },
  specificity: {
    category: "rocha",
    intensity: "alto",
    description:
      "Replicar estilo dos projetos. Crimps específicos, ângulos, tentativas redpoint.",
  },
  technique: {
    category: "tecnica",
    intensity: "moderado",
    description: "Movimentos sub-máximos, foco em qualidade e variedade.",
  },
  mobility: {
    category: "mobilidade",
    intensity: "leve",
    description: "Mobilidade ativa, alongamento, ombros/quadril.",
  },
  aerobic: {
    category: "fisio",
    intensity: "moderado",
    description: "ARC, escalada fácil contínua. Recuperação ativa.",
  },
  rock: {
    category: "rocha",
    intensity: "alto",
    description: "Escalada na rocha. Foco no objetivo do dia.",
  },
  taper_light: {
    category: "tecnica",
    intensity: "leve",
    description: "Ativação leve, intenção alta, volume baixo. Pele preservada.",
  },
};

const HARD_ROLES: DayRole[] = [
  "force_max",
  "power",
  "power_endurance",
  "specificity",
  "rock",
];

export function recommend(
  disposicao: Disposicao | null,
  nextTrip: Trip | null,
  ctx: RecommendContext = EMPTY_CTX
): Recommendation {
  const today = getTodayKey();
  const inTrip = !!(
    nextTrip && nextTrip.startDate <= today && today <= nextTrip.endDate
  );
  const daysToTrip = nextTrip ? diffDays(today, nextTrip.startDate) : null;

  if (inTrip && nextTrip) {
    return {
      headline: "Você está em viagem — vá escalar.",
      rationale: `${nextTrip.name} em andamento. Foco no objetivo da viagem.`,
      category: "rocha",
      intensity: "alto",
      trip: nextTrip,
      daysToTrip,
      inTrip: true,
      phaseName: ctx.phaseName,
      phaseWeekNumber: ctx.phaseWeekNumber,
      plannedRole: ctx.plannedRole,
      plannedRoleSource: ctx.plannedRoleSource,
      options: [],
    };
  }

  if (!ctx.plannedRole) {
    return legacyEnergyRecommend(disposicao, nextTrip, daysToTrip, ctx);
  }

  const plannedRole = ctx.plannedRole;
  const def = ROLE_DEFAULTS[plannedRole];
  const phaseContext =
    ctx.phaseName && ctx.phaseWeekNumber
      ? `${ctx.phaseName} · semana ${ctx.phaseWeekNumber}`
      : "Macrociclo ativo";
  const sourceTag = sourceShortLabel(ctx.plannedRoleSource);
  const energy = disposicao?.energy ?? null;
  const soreness = disposicao?.soreness ?? 0;

  if (energy == null) {
    return {
      headline: `Hoje: ${DAY_ROLE_LABEL[plannedRole]}${sourceTag}`,
      rationale: `${phaseContext}. ${def.description} Registre disposição para refinar.`,
      category: def.category,
      intensity: def.intensity,
      trip: nextTrip,
      daysToTrip,
      inTrip: false,
      phaseName: ctx.phaseName,
      phaseWeekNumber: ctx.phaseWeekNumber,
      plannedRole,
      plannedRoleSource: ctx.plannedRoleSource,
      options: [],
    };
  }

  const isHard = HARD_ROLES.includes(plannedRole);
  const lowCapacity = energy <= 4 || soreness >= 3;

  if (isHard && lowCapacity) {
    const reasonBits: string[] = [];
    if (energy <= 4) reasonBits.push(`energia ${energy}/10`);
    if (soreness >= 3) reasonBits.push(`dor ${soreness}/5`);
    return {
      headline: `Planejado: ${DAY_ROLE_LABEL[plannedRole]} — ${reasonBits.join(" + ")}`,
      rationale: `${phaseContext}. Capacidade reduzida — três caminhos com trade-offs:`,
      category: def.category,
      intensity: "moderado",
      trip: nextTrip,
      daysToTrip,
      inTrip: false,
      phaseName: ctx.phaseName,
      phaseWeekNumber: ctx.phaseWeekNumber,
      plannedRole,
      plannedRoleSource: ctx.plannedRoleSource,
      options: [
        {
          id: "manter-reduzido",
          label: `Manter ${DAY_ROLE_LABEL[plannedRole].toLowerCase()}, cargas em 70-80%`,
          description:
            "Mesmos exercícios, intensidade reduzida. Foco em qualidade técnica.",
          category: def.category,
          intensity: "moderado",
          tradeoff:
            "Estímulo parcial; mantém o microciclo. OK se a queda é leve.",
        },
        {
          id: "trocar-mobilidade",
          label: "Trocar por mobilidade",
          description:
            "Mobilidade ativa + alongamento. Tentar repor o estímulo num dia flex da semana.",
          category: "mobilidade",
          intensity: "leve",
          tradeoff:
            "Recupera melhor, mas abre gap no estímulo principal. Pode comprometer o fds.",
          apply: { role: "mobility" },
          recommended: true,
        },
        {
          id: "descansar",
          label: "Descanso total",
          description: "Zero treino. Sono, hidratação, comida.",
          category: "descanso",
          intensity: "descanso",
          tradeoff:
            "Reset máximo. Se virar 2+ dias seguidos esta semana, a fase atrasa.",
          apply: { role: "rest" },
        },
      ],
    };
  }

  let intensity: Intensity = def.intensity;
  let modulationNote = "";
  if (lowCapacity && intensity === "alto") {
    intensity = "moderado";
    modulationNote = ` Energia/dor baixas — reduza cargas em 20%.`;
  } else if (energy >= 8 && soreness <= 1 && isHard) {
    modulationNote = ` Energia ${energy}/10 — janela boa para empurrar.`;
  }

  return {
    headline: `Hoje: ${DAY_ROLE_LABEL[plannedRole]}${sourceTag}`,
    rationale: `${phaseContext}. ${def.description}${modulationNote}`,
    category: def.category,
    intensity,
    trip: nextTrip,
    daysToTrip,
    inTrip: false,
    phaseName: ctx.phaseName,
    phaseWeekNumber: ctx.phaseWeekNumber,
    plannedRole,
    plannedRoleSource: ctx.plannedRoleSource,
    options: [],
  };
}

function sourceShortLabel(source: DayRoleSource): string {
  if (source === "manual") return " (manual)";
  if (source === "trip") return " (viagem)";
  return "";
}

function legacyEnergyRecommend(
  disposicao: Disposicao | null,
  nextTrip: Trip | null,
  daysToTrip: number | null,
  ctx: RecommendContext
): Recommendation {
  const energy = disposicao?.energy ?? null;
  const soreness = disposicao?.soreness ?? 0;
  const base = {
    trip: nextTrip,
    daysToTrip,
    inTrip: false,
    phaseName: ctx.phaseName,
    phaseWeekNumber: ctx.phaseWeekNumber,
    plannedRole: ctx.plannedRole,
    plannedRoleSource: ctx.plannedRoleSource,
    options: [] as RecommendationOption[],
  };

  if (nextTrip && daysToTrip != null) {
    if (daysToTrip <= 2) {
      return {
        headline: "Tapering — só leve.",
        rationale: `${nextTrip.name} em ${daysToTrip} dia(s). Mobilidade ativa, técnica curta, nada de força máxima.`,
        category: "mobilidade",
        intensity: "leve",
        ...base,
      };
    }
    if (daysToTrip <= 5) {
      const cat: WorkoutCategory =
        energy != null && energy <= 4 ? "mobilidade" : "tecnica";
      return {
        headline: "Pré-viagem — manter forma.",
        rationale: `${nextTrip.name} em ${daysToTrip} dias. Técnica leve a moderada, sem fadigar.`,
        category: cat,
        intensity: "moderado",
        ...base,
      };
    }
  }

  if (energy == null) {
    return {
      headline: "Registre a disposição de hoje.",
      rationale:
        "Sem energia e dor registradas, a recomendação fica genérica. Comece marcando como você está.",
      category: "tecnica",
      intensity: "moderado",
      ...base,
    };
  }

  if (soreness >= 4) {
    return {
      headline: "Descanso ou só mobilidade.",
      rationale: `Dor muscular ${soreness}/5. Vá de mobilidade ativa ou descanso total.`,
      category: "mobilidade",
      intensity: "descanso",
      ...base,
    };
  }

  if (energy <= 3) {
    return {
      headline: "Energia baixa — recupere.",
      rationale: `Energia ${energy}/10. Mobilidade, alongamento ou descanso. Não force.`,
      category: soreness > 0 ? "mobilidade" : "descanso",
      intensity: soreness > 0 ? "leve" : "descanso",
      ...base,
    };
  }

  if (energy <= 5) {
    return {
      headline: "Energia moderada — técnica.",
      rationale: `Energia ${energy}/10. Foco em técnica e movimentos sub-máximos. Evite RPE alto.`,
      category: "tecnica",
      intensity: "moderado",
      ...base,
    };
  }

  if (energy <= 7) {
    return {
      headline: "Boa janela — preparação física.",
      rationale: `Energia ${energy}/10. Bom dia para preparação física ou força sub-máxima.`,
      category: soreness >= 2 ? "fisio" : "forca",
      intensity: "moderado",
      ...base,
    };
  }

  return {
    headline: "Pico — vá de máximo.",
    rationale: `Energia ${energy}/10, dor ${soreness}/5. Boulder duro, projetos ou hangboard pesado.`,
    category: "forca",
    intensity: "alto",
    ...base,
  };
}
