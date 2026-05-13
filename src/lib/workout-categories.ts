import type { WorkoutCategory } from "@/app/actions-treinos";

export const WORKOUT_CATEGORY_LABEL: Record<WorkoutCategory, string> = {
  forca: "Força",
  mobilidade: "Mobilidade",
  tecnica: "Técnica",
  fisio: "Preparação física",
  rocha: "Rocha",
  descanso: "Descanso",
};

export const WORKOUT_CATEGORY_COLOR: Record<WorkoutCategory, string> = {
  forca: "bg-rose-500/20 text-rose-300",
  mobilidade: "bg-sky-500/20 text-sky-300",
  tecnica: "bg-indigo-500/20 text-indigo-300",
  fisio: "bg-teal-500/20 text-teal-300",
  rocha: "bg-emerald-500/30 text-emerald-200",
  descanso: "bg-slate-700/50 text-slate-300",
};

export const WORKOUT_CATEGORIES: WorkoutCategory[] = [
  "tecnica",
  "mobilidade",
  "forca",
  "fisio",
  "rocha",
  "descanso",
];
