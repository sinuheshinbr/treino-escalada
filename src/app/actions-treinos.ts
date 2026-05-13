"use server";

import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { isValidDayKey } from "@/lib/dates";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import type { CriterionCategory } from "@/lib/criteria";
import type { DayRole } from "@/lib/macrocycle";

export type WorkoutCategory = CriterionCategory | "rocha" | "descanso";

export interface Exercise {
  name: string;
  prescription: string;
}

export interface Template {
  _id: string;
  userEmail: string;
  name: string;
  category: WorkoutCategory;
  roleType: DayRole | null;
  description: string;
  exercises: Exercise[];
  createdAt: string;
}

export interface Workout {
  _id: string;
  userEmail: string;
  date: string;
  category: WorkoutCategory;
  templateId: string | null;
  name: string;
  exercises: Exercise[];
  rpe: number | null;
  durationMin: number | null;
  notes: string;
  createdAt: string;
}

async function requireUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user.email.toLowerCase();
}

function mapTemplate(doc: Record<string, unknown>): Template {
  return {
    _id: (doc._id as ObjectId).toString(),
    userEmail: doc.userEmail as string,
    name: doc.name as string,
    category: doc.category as WorkoutCategory,
    roleType: (doc.roleType as DayRole | null) ?? null,
    description: (doc.description as string) ?? "",
    exercises: ((doc.exercises as Exercise[]) ?? []).map((e) => ({
      name: e.name,
      prescription: e.prescription,
    })),
    createdAt: (doc.createdAt as Date).toISOString(),
  };
}

function mapWorkout(doc: Record<string, unknown>): Workout {
  return {
    _id: (doc._id as ObjectId).toString(),
    userEmail: doc.userEmail as string,
    date: doc.date as string,
    category: doc.category as WorkoutCategory,
    templateId: (doc.templateId as string | null) ?? null,
    name: doc.name as string,
    exercises: ((doc.exercises as Exercise[]) ?? []).map((e) => ({
      name: e.name,
      prescription: e.prescription,
    })),
    rpe: (doc.rpe as number | null) ?? null,
    durationMin: (doc.durationMin as number | null) ?? null,
    notes: (doc.notes as string) ?? "",
    createdAt: (doc.createdAt as Date).toISOString(),
  };
}

// Templates

export async function listTemplates(): Promise<Template[]> {
  const email = await requireUser();
  if (!email) return [];
  const db = getDb();
  const docs = await db
    .collection("templates")
    .find({ userEmail: email })
    .sort({ category: 1, name: 1 })
    .toArray();
  return docs.map(mapTemplate);
}

export async function createTemplate(input: {
  name: string;
  category: WorkoutCategory;
  roleType?: DayRole | null;
  description: string;
  exercises: Exercise[];
}) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  if (!input.name.trim()) return { error: "Nome obrigatório" };
  const exercises = input.exercises
    .map((e) => ({ name: e.name.trim(), prescription: e.prescription.trim() }))
    .filter((e) => e.name);
  const db = getDb();
  await db.collection("templates").insertOne({
    userEmail: email,
    name: input.name.trim(),
    category: input.category,
    roleType: input.roleType ?? null,
    description: input.description.trim(),
    exercises,
    createdAt: new Date(),
  });
  revalidatePath("/treinos");
  return { success: true };
}

export async function deleteTemplate(id: string) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  const db = getDb();
  const r = await db
    .collection("templates")
    .deleteOne({ _id: new ObjectId(id), userEmail: email });
  if (r.deletedCount === 0) return { error: "Template não encontrado" };
  revalidatePath("/treinos");
  return { success: true };
}

// Workouts (logged sessions)

export async function listWorkouts(limit = 30): Promise<Workout[]> {
  const email = await requireUser();
  if (!email) return [];
  const db = getDb();
  const docs = await db
    .collection("workouts")
    .find({ userEmail: email })
    .sort({ date: -1, createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(mapWorkout);
}

export async function logWorkout(input: {
  date: string;
  category: WorkoutCategory;
  templateId: string | null;
  name: string;
  exercises: Exercise[];
  rpe: number | null;
  durationMin: number | null;
  notes: string;
}) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  if (!isValidDayKey(input.date)) return { error: "Data inválida" };
  if (!input.name.trim()) return { error: "Nome obrigatório" };
  const exercises = input.exercises
    .map((e) => ({ name: e.name.trim(), prescription: e.prescription.trim() }))
    .filter((e) => e.name);
  const db = getDb();
  await db.collection("workouts").insertOne({
    userEmail: email,
    date: input.date,
    category: input.category,
    templateId: input.templateId,
    name: input.name.trim(),
    exercises,
    rpe: input.rpe,
    durationMin: input.durationMin,
    notes: input.notes.trim(),
    createdAt: new Date(),
  });
  revalidatePath("/treinos");
  revalidatePath("/");
  return { success: true };
}

export async function deleteWorkout(id: string) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  const db = getDb();
  const r = await db
    .collection("workouts")
    .deleteOne({ _id: new ObjectId(id), userEmail: email });
  if (r.deletedCount === 0) return { error: "Treino não encontrado" };
  revalidatePath("/treinos");
  revalidatePath("/");
  return { success: true };
}
