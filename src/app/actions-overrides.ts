"use server";

import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { isValidDayKey } from "@/lib/dates";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import type { DayRole } from "@/lib/macrocycle";

export interface DayOverride {
  _id: string;
  userEmail: string;
  date: string;
  role: DayRole;
  createdAt: string;
}

const VALID_ROLES: DayRole[] = [
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

async function requireUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user.email.toLowerCase();
}

function mapOverride(doc: Record<string, unknown>): DayOverride {
  return {
    _id: (doc._id as ObjectId).toString(),
    userEmail: doc.userEmail as string,
    date: doc.date as string,
    role: doc.role as DayRole,
    createdAt: (doc.createdAt as Date).toISOString(),
  };
}

export async function listOverridesInRange(
  startDate: string,
  endDate: string
): Promise<DayOverride[]> {
  const email = await requireUser();
  if (!email) return [];
  if (!isValidDayKey(startDate) || !isValidDayKey(endDate)) return [];
  const db = getDb();
  const docs = await db
    .collection("dayOverrides")
    .find({
      userEmail: email,
      date: { $gte: startDate, $lte: endDate },
    })
    .toArray();
  return docs.map(mapOverride);
}

export async function setDayOverride(date: string, role: DayRole) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  if (!isValidDayKey(date)) return { error: "Data inválida" };
  if (!VALID_ROLES.includes(role)) return { error: "Papel inválido" };
  const db = getDb();
  await db.collection("dayOverrides").updateOne(
    { userEmail: email, date },
    {
      $set: { role },
      $setOnInsert: { userEmail: email, date, createdAt: new Date() },
    },
    { upsert: true }
  );
  revalidatePath("/");
  return { success: true };
}

export async function clearDayOverride(date: string) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  if (!isValidDayKey(date)) return { error: "Data inválida" };
  const db = getDb();
  await db.collection("dayOverrides").deleteOne({ userEmail: email, date });
  revalidatePath("/");
  return { success: true };
}

export async function applyOverrides(
  entries: Array<{ date: string; role: DayRole }>
) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  if (entries.length === 0) return { success: true };

  for (const e of entries) {
    if (!isValidDayKey(e.date)) return { error: `Data inválida: ${e.date}` };
    if (!VALID_ROLES.includes(e.role))
      return { error: `Papel inválido: ${e.role}` };
  }

  const db = getDb();
  const ops = entries.map((e) => ({
    updateOne: {
      filter: { userEmail: email, date: e.date },
      update: {
        $set: { role: e.role },
        $setOnInsert: {
          userEmail: email,
          date: e.date,
          createdAt: new Date(),
        },
      },
      upsert: true,
    },
  }));
  await db.collection("dayOverrides").bulkWrite(ops);
  revalidatePath("/");
  return { success: true };
}
