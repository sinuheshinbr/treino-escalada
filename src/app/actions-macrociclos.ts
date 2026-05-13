"use server";

import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { getTodayKey, isValidDayKey } from "@/lib/dates";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import {
  scaffoldPhases,
  type Macrocycle,
  type Phase,
  type PhaseType,
  type Microcycle,
  type NutritionMode,
  type DayRole,
} from "@/lib/macrocycle";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user.email.toLowerCase();
}

function mapMacrocycle(doc: Record<string, unknown>): Macrocycle {
  return {
    _id: (doc._id as ObjectId).toString(),
    userEmail: doc.userEmail as string,
    name: doc.name as string,
    targetTripId: (doc.targetTripId as string | null) ?? null,
    phases: ((doc.phases as Phase[]) ?? []).map((p) => ({
      type: p.type,
      name: p.name,
      startDate: p.startDate,
      endDate: p.endDate,
      microcycle: p.microcycle,
      nutritionMode: p.nutritionMode,
      focusDescription: p.focusDescription ?? "",
    })),
    createdAt: (doc.createdAt as Date).toISOString(),
  };
}

export async function listMacrocycles(): Promise<Macrocycle[]> {
  const email = await requireUser();
  if (!email) return [];
  const db = getDb();
  const docs = await db
    .collection("macrocycles")
    .find({ userEmail: email })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(mapMacrocycle);
}

export async function getActiveMacrocycle(): Promise<Macrocycle | null> {
  const email = await requireUser();
  if (!email) return null;
  const today = getTodayKey();
  const db = getDb();
  const docs = await db
    .collection("macrocycles")
    .find({ userEmail: email })
    .toArray();
  for (const doc of docs) {
    const m = mapMacrocycle(doc);
    if (m.phases.length === 0) continue;
    const first = m.phases[0];
    const last = m.phases[m.phases.length - 1];
    if (first.startDate <= today && today <= last.endDate) return m;
  }
  return null;
}

export async function getMacrocycleById(id: string): Promise<Macrocycle | null> {
  const email = await requireUser();
  if (!email) return null;
  if (!ObjectId.isValid(id)) return null;
  const db = getDb();
  const doc = await db
    .collection("macrocycles")
    .findOne({ _id: new ObjectId(id), userEmail: email });
  return doc ? mapMacrocycle(doc) : null;
}

export async function createMacrocycleFromTrip(input: {
  tripId: string;
  startDate?: string;
  name?: string;
}) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  if (!ObjectId.isValid(input.tripId)) return { error: "Viagem inválida" };

  const db = getDb();
  const trip = await db
    .collection("trips")
    .findOne({ _id: new ObjectId(input.tripId), userEmail: email });
  if (!trip) return { error: "Viagem não encontrada" };
  if (trip.tier !== "alvo")
    return { error: "Viagem precisa ser do tier 'alvo'" };

  const startDate = input.startDate ?? getTodayKey();
  if (!isValidDayKey(startDate)) return { error: "Data de início inválida" };

  const targetDate = trip.startDate as string;
  const result = scaffoldPhases(startDate, targetDate);
  if ("error" in result) return { error: result.error };

  const name = (input.name ?? `Macrociclo — ${trip.name}`).trim();

  const insertResult = await db.collection("macrocycles").insertOne({
    userEmail: email,
    name,
    targetTripId: input.tripId,
    phases: result,
    createdAt: new Date(),
  });

  revalidatePath("/macrociclos");
  revalidatePath("/");
  return { success: true, id: insertResult.insertedId.toString() };
}

export async function updateMacrocycleName(id: string, name: string) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  if (!ObjectId.isValid(id)) return { error: "ID inválido" };
  if (!name.trim()) return { error: "Nome obrigatório" };
  const db = getDb();
  const r = await db
    .collection("macrocycles")
    .updateOne(
      { _id: new ObjectId(id), userEmail: email },
      { $set: { name: name.trim() } }
    );
  if (r.matchedCount === 0) return { error: "Macrociclo não encontrado" };
  revalidatePath("/macrociclos");
  revalidatePath("/");
  return { success: true };
}

export interface PhasePatch {
  name?: string;
  startDate?: string;
  endDate?: string;
  microcycle?: Microcycle;
  nutritionMode?: NutritionMode;
  focusDescription?: string;
}

export async function updatePhase(
  macroId: string,
  phaseType: PhaseType,
  patch: PhasePatch
) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  if (!ObjectId.isValid(macroId)) return { error: "ID inválido" };

  const db = getDb();
  const macro = await db
    .collection("macrocycles")
    .findOne({ _id: new ObjectId(macroId), userEmail: email });
  if (!macro) return { error: "Macrociclo não encontrado" };

  const phases = (macro.phases as Phase[]) ?? [];
  const idx = phases.findIndex((p) => p.type === phaseType);
  if (idx === -1) return { error: "Fase não encontrada" };

  const phase = phases[idx];
  const next: Phase = {
    type: phase.type,
    name: patch.name?.trim() || phase.name,
    startDate: patch.startDate ?? phase.startDate,
    endDate: patch.endDate ?? phase.endDate,
    microcycle: patch.microcycle ?? phase.microcycle,
    nutritionMode: patch.nutritionMode ?? phase.nutritionMode,
    focusDescription:
      patch.focusDescription != null
        ? patch.focusDescription.trim()
        : phase.focusDescription,
  };

  if (!isValidDayKey(next.startDate) || !isValidDayKey(next.endDate)) {
    return { error: "Datas inválidas" };
  }
  if (next.startDate > next.endDate) {
    return { error: "Início deve ser antes do fim" };
  }

  // Validate microcycle day roles if changed
  if (patch.microcycle) {
    const validRoles: DayRole[] = [
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
    for (const day of [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ] as const) {
      if (!validRoles.includes(patch.microcycle[day])) {
        return { error: `Papel inválido em ${day}` };
      }
    }
  }

  phases[idx] = next;

  await db
    .collection("macrocycles")
    .updateOne(
      { _id: new ObjectId(macroId), userEmail: email },
      { $set: { phases } }
    );

  revalidatePath("/macrociclos");
  revalidatePath("/");
  return { success: true };
}

export async function deleteMacrocycle(id: string) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  if (!ObjectId.isValid(id)) return { error: "ID inválido" };
  const db = getDb();
  const r = await db
    .collection("macrocycles")
    .deleteOne({ _id: new ObjectId(id), userEmail: email });
  if (r.deletedCount === 0) return { error: "Macrociclo não encontrado" };
  revalidatePath("/macrociclos");
  revalidatePath("/");
  return { success: true };
}
