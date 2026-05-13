export type CriterionCategory = "forca" | "mobilidade" | "tecnica" | "fisio";
export type CriterionDirection = "higher" | "lower";

export interface Criterion {
  id: string;
  category: CriterionCategory;
  name: string;
  unit: string;
  direction: CriterionDirection;
  hint?: string;
}

export const CATEGORY_LABEL: Record<CriterionCategory, string> = {
  forca: "Força",
  mobilidade: "Mobilidade",
  tecnica: "Técnica",
  fisio: "Físico",
};

export const CATEGORY_COLOR: Record<CriterionCategory, string> = {
  forca: "bg-rose-100 text-rose-700",
  mobilidade: "bg-sky-100 text-sky-700",
  tecnica: "bg-violet-100 text-violet-700",
  fisio: "bg-emerald-100 text-emerald-700",
};

export const DEFAULT_CRITERIA: Criterion[] = [
  // Força
  {
    id: "max-boulder",
    category: "forca",
    name: "Boulder máximo (flash/projeto)",
    unit: "grau (V)",
    direction: "higher",
    hint: "Use V-scale, ex.: 6, 7, 8",
  },
  {
    id: "max-rota",
    category: "forca",
    name: "Rota máxima esportiva",
    unit: "grau",
    direction: "higher",
    hint: "Use a escala que você prefere (Fr ou Br)",
  },
  {
    id: "deadhang-20mm",
    category: "forca",
    name: "Suspensão estática 20mm (peso adicional)",
    unit: "kg",
    direction: "higher",
    hint: "Suspensão 10s no edge 20mm + lastro",
  },
  {
    id: "pull-ups-max",
    category: "forca",
    name: "Barras máximas seguidas",
    unit: "reps",
    direction: "higher",
  },
  {
    id: "front-lever",
    category: "forca",
    name: "Front lever (segurar)",
    unit: "segundos",
    direction: "higher",
  },
  // Mobilidade
  {
    id: "high-step",
    category: "mobilidade",
    name: "High step ativo (altura do pé)",
    unit: "cm acima do quadril",
    direction: "higher",
  },
  {
    id: "rotacao-quadril",
    category: "mobilidade",
    name: "Abertura de quadril (frog)",
    unit: "graus",
    direction: "higher",
  },
  {
    id: "ombro-flexao",
    category: "mobilidade",
    name: "Flexão de ombro acima da cabeça",
    unit: "graus",
    direction: "higher",
  },
  // Técnica
  {
    id: "footwork-precisao",
    category: "tecnica",
    name: "Precisão de pé (auto-avaliação)",
    unit: "1-10",
    direction: "higher",
  },
  {
    id: "leitura-via",
    category: "tecnica",
    name: "Leitura de via (auto-avaliação)",
    unit: "1-10",
    direction: "higher",
  },
  {
    id: "respiracao-crux",
    category: "tecnica",
    name: "Respiração no crux (auto-avaliação)",
    unit: "1-10",
    direction: "higher",
  },
  // Físico
  {
    id: "peso",
    category: "fisio",
    name: "Peso corporal",
    unit: "kg",
    direction: "lower",
  },
  {
    id: "vo2-proxy",
    category: "fisio",
    name: "Cardio (km em 20min running fácil)",
    unit: "km",
    direction: "higher",
  },
];

export function getCriterion(id: string): Criterion | undefined {
  return DEFAULT_CRITERIA.find((c) => c.id === id);
}
