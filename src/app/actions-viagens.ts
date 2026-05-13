"use server";

import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { isValidDayKey, getTodayKey, shiftDay, diffDays } from "@/lib/dates";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

export type TripFocus = "projeto" | "onsight" | "viagem-curta" | "casual";
export type TripTier = "alvo" | "rotina";
export type TripDayActivity = "climb" | "rest";

export interface TripDay {
  date: string;
  activity: TripDayActivity;
}

export interface Trip {
  _id: string;
  userEmail: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  focus: TripFocus;
  tier: TripTier;
  days: TripDay[];
  notes: string;
  createdAt: string;
}

function buildDefaultDays(
  startDate: string,
  endDate: string,
  defaultActivity: TripDayActivity = "climb"
): TripDay[] {
  if (!isValidDayKey(startDate) || !isValidDayKey(endDate)) return [];
  if (startDate > endDate) return [];
  const total = diffDays(startDate, endDate) + 1;
  const out: TripDay[] = [];
  for (let i = 0; i < total; i++) {
    out.push({ date: shiftDay(startDate, i), activity: defaultActivity });
  }
  return out;
}

function reconcileDays(
  startDate: string,
  endDate: string,
  stored: TripDay[]
): TripDay[] {
  const byDate = new Map(stored.map((d) => [d.date, d.activity]));
  const fresh = buildDefaultDays(startDate, endDate);
  return fresh.map((d) => ({
    date: d.date,
    activity: byDate.get(d.date) ?? d.activity,
  }));
}

async function requireUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user.email.toLowerCase();
}

function mapTrip(doc: Record<string, unknown>): Trip {
  const startDate = doc.startDate as string;
  const endDate = doc.endDate as string;
  const storedDays = (doc.days as TripDay[] | undefined) ?? [];
  return {
    _id: (doc._id as ObjectId).toString(),
    userEmail: doc.userEmail as string,
    name: doc.name as string,
    location: doc.location as string,
    startDate,
    endDate,
    focus: (doc.focus as TripFocus) ?? "casual",
    tier: (doc.tier as TripTier) ?? "rotina",
    days: reconcileDays(startDate, endDate, storedDays),
    notes: (doc.notes as string) ?? "",
    createdAt: (doc.createdAt as Date).toISOString(),
  };
}

export async function listTrips(): Promise<Trip[]> {
  const email = await requireUser();
  if (!email) return [];
  const db = getDb();
  const docs = await db
    .collection("trips")
    .find({ userEmail: email })
    .sort({ startDate: -1 })
    .toArray();
  return docs.map(mapTrip);
}

export async function getNextTrip(): Promise<Trip | null> {
  const email = await requireUser();
  if (!email) return null;
  const today = getTodayKey();
  const db = getDb();
  const doc = await db
    .collection("trips")
    .find({ userEmail: email, endDate: { $gte: today } })
    .sort({ startDate: 1 })
    .limit(1)
    .next();
  return doc ? mapTrip(doc) : null;
}

export async function createTrip(input: {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  focus: TripFocus;
  tier?: TripTier;
  days?: TripDay[];
  notes: string;
}) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  if (!input.name.trim()) return { error: "Nome obrigatório" };
  if (!isValidDayKey(input.startDate) || !isValidDayKey(input.endDate))
    return { error: "Datas inválidas" };
  if (input.startDate > input.endDate)
    return { error: "Início deve ser antes do fim" };

  const days = input.days
    ? reconcileDays(input.startDate, input.endDate, input.days)
    : buildDefaultDays(input.startDate, input.endDate);

  const db = getDb();
  await db.collection("trips").insertOne({
    userEmail: email,
    name: input.name.trim(),
    location: input.location.trim(),
    startDate: input.startDate,
    endDate: input.endDate,
    focus: input.focus,
    tier: input.tier ?? "rotina",
    days,
    notes: input.notes.trim(),
    createdAt: new Date(),
  });
  revalidatePath("/viagens");
  revalidatePath("/");
  return { success: true };
}

export async function updateTripDays(id: string, days: TripDay[]) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  if (!ObjectId.isValid(id)) return { error: "ID inválido" };
  const db = getDb();
  const existing = await db
    .collection("trips")
    .findOne({ _id: new ObjectId(id), userEmail: email });
  if (!existing) return { error: "Viagem não encontrada" };
  const reconciled = reconcileDays(
    existing.startDate as string,
    existing.endDate as string,
    days
  );
  await db
    .collection("trips")
    .updateOne(
      { _id: new ObjectId(id), userEmail: email },
      { $set: { days: reconciled } }
    );
  revalidatePath("/viagens");
  revalidatePath("/");
  return { success: true };
}

export async function updateTripTier(id: string, tier: TripTier) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  const db = getDb();
  const r = await db
    .collection("trips")
    .updateOne(
      { _id: new ObjectId(id), userEmail: email },
      { $set: { tier } }
    );
  if (r.matchedCount === 0) return { error: "Viagem não encontrada" };
  revalidatePath("/viagens");
  revalidatePath("/");
  return { success: true };
}

export async function deleteTrip(id: string) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  const db = getDb();
  const r = await db
    .collection("trips")
    .deleteOne({ _id: new ObjectId(id), userEmail: email });
  if (r.deletedCount === 0) return { error: "Viagem não encontrada" };
  revalidatePath("/viagens");
  revalidatePath("/");
  return { success: true };
}
