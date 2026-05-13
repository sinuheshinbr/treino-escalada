"use server";

import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { isValidDayKey } from "@/lib/dates";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

export interface Measurement {
  _id: string;
  userEmail: string;
  criterionId: string;
  date: string;
  value: number;
  notes: string;
  createdAt: string;
}

async function requireUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user.email.toLowerCase();
}

function mapMeasurement(doc: Record<string, unknown>): Measurement {
  return {
    _id: (doc._id as ObjectId).toString(),
    userEmail: doc.userEmail as string,
    criterionId: doc.criterionId as string,
    date: doc.date as string,
    value: doc.value as number,
    notes: (doc.notes as string) ?? "",
    createdAt: (doc.createdAt as Date).toISOString(),
  };
}

export async function listMeasurements(): Promise<Measurement[]> {
  const email = await requireUser();
  if (!email) return [];
  const db = getDb();
  const docs = await db
    .collection("measurements")
    .find({ userEmail: email })
    .sort({ date: -1, createdAt: -1 })
    .toArray();
  return docs.map(mapMeasurement);
}

export async function addMeasurement(input: {
  criterionId: string;
  date: string;
  value: number;
  notes: string;
}) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  if (!input.criterionId) return { error: "Critério obrigatório" };
  if (!isValidDayKey(input.date)) return { error: "Data inválida" };
  if (typeof input.value !== "number" || isNaN(input.value))
    return { error: "Valor inválido" };

  const db = getDb();
  await db.collection("measurements").insertOne({
    userEmail: email,
    criterionId: input.criterionId,
    date: input.date,
    value: input.value,
    notes: input.notes.trim(),
    createdAt: new Date(),
  });
  revalidatePath("/avaliacoes");
  return { success: true };
}

export async function deleteMeasurement(id: string) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  const db = getDb();
  const r = await db
    .collection("measurements")
    .deleteOne({ _id: new ObjectId(id), userEmail: email });
  if (r.deletedCount === 0) return { error: "Medição não encontrada" };
  revalidatePath("/avaliacoes");
  return { success: true };
}
