"use server";

import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { isValidDayKey } from "@/lib/dates";
import { revalidatePath } from "next/cache";

export interface Disposicao {
  _id: string;
  date: string;
  userEmail: string;
  energy: number;
  sleepHours: number | null;
  soreness: number;
  notes: string;
  createdAt: string;
}

async function requireUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user.email.toLowerCase();
}

export async function getDisposicao(
  dayKey: string
): Promise<Disposicao | null> {
  const email = await requireUser();
  if (!email) return null;
  if (!isValidDayKey(dayKey)) return null;

  const db = getDb();
  const doc = await db
    .collection("dispositions")
    .findOne({ date: dayKey, userEmail: email });
  if (!doc) return null;
  return {
    _id: doc._id.toString(),
    date: doc.date as string,
    userEmail: doc.userEmail as string,
    energy: doc.energy as number,
    sleepHours: (doc.sleepHours as number | null) ?? null,
    soreness: (doc.soreness as number) ?? 0,
    notes: (doc.notes as string) ?? "",
    createdAt: (doc.createdAt as Date).toISOString(),
  };
}

export async function listRecentDispositions(
  limit = 14
): Promise<Disposicao[]> {
  const email = await requireUser();
  if (!email) return [];
  const db = getDb();
  const docs = await db
    .collection("dispositions")
    .find({ userEmail: email })
    .sort({ date: -1 })
    .limit(limit)
    .toArray();
  return docs.map((doc) => ({
    _id: doc._id.toString(),
    date: doc.date as string,
    userEmail: doc.userEmail as string,
    energy: doc.energy as number,
    sleepHours: (doc.sleepHours as number | null) ?? null,
    soreness: (doc.soreness as number) ?? 0,
    notes: (doc.notes as string) ?? "",
    createdAt: (doc.createdAt as Date).toISOString(),
  }));
}

export async function saveDisposicao(input: {
  date: string;
  energy: number;
  sleepHours: number | null;
  soreness: number;
  notes: string;
}) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  if (!isValidDayKey(input.date)) return { error: "Data inválida" };
  if (input.energy < 1 || input.energy > 10)
    return { error: "Energia deve estar entre 1 e 10" };
  if (input.soreness < 0 || input.soreness > 5)
    return { error: "Dor muscular deve estar entre 0 e 5" };

  const db = getDb();
  await db.collection("dispositions").updateOne(
    { date: input.date, userEmail: email },
    {
      $set: {
        energy: input.energy,
        sleepHours: input.sleepHours,
        soreness: input.soreness,
        notes: input.notes.trim(),
      },
      $setOnInsert: {
        date: input.date,
        userEmail: email,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  revalidatePath("/");
  revalidatePath("/disposicao");
  return { success: true };
}
