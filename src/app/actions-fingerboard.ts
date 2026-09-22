"use server";

import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { isValidDayKey } from "@/lib/dates";
import type { Grip, Phase, Readiness, SessionSet } from "@/lib/fingerboard";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

export interface Cycle {
  _id: string;
  userEmail: string;
  startDate: string;
  /** Dias da semana de treino, 0 = domingo. Sempre 2 por semana. */
  days: number[];
  grip: Grip;
  bodyweightKg: number;
  active: boolean;
  createdAt: string;
}

export interface Session {
  _id: string;
  userEmail: string;
  cycleId: string;
  date: string;
  week: number;
  phase: Phase;
  readiness: Readiness;
  /** Puxada de teste pós-aquecimento, em kg. Comparada ao corte de 85% do MVC. */
  readinessPullKg: number | null;
  aborted: boolean;
  sets: SessionSet[];
  notes: string;
  createdAt: string;
}

export interface Test {
  _id: string;
  userEmail: string;
  date: string;
  edgeMm: number;
  grip: Grip;
  leftKg: number;
  rightKg: number;
  bodyweightKg: number;
  device: string;
  notes: string;
  createdAt: string;
}

async function requireUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user.email.toLowerCase();
}

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback = 0) => (typeof v === "number" && !isNaN(v) ? v : fallback);

function mapCycle(doc: Record<string, unknown>): Cycle {
  return {
    _id: (doc._id as ObjectId).toString(),
    userEmail: str(doc.userEmail),
    startDate: str(doc.startDate),
    days: Array.isArray(doc.days) ? (doc.days as number[]) : [2, 5],
    grip: (doc.grip as Grip) ?? "half-crimp",
    bodyweightKg: num(doc.bodyweightKg),
    active: !!doc.active,
    createdAt: (doc.createdAt as Date).toISOString(),
  };
}

function mapSession(doc: Record<string, unknown>): Session {
  return {
    _id: (doc._id as ObjectId).toString(),
    userEmail: str(doc.userEmail),
    cycleId: str(doc.cycleId),
    date: str(doc.date),
    week: num(doc.week),
    phase: (doc.phase as Phase) ?? "maw",
    readiness: (doc.readiness as Readiness) ?? "verde",
    readinessPullKg:
      typeof doc.readinessPullKg === "number" ? doc.readinessPullKg : null,
    aborted: !!doc.aborted,
    sets: Array.isArray(doc.sets) ? (doc.sets as SessionSet[]) : [],
    notes: str(doc.notes),
    createdAt: (doc.createdAt as Date).toISOString(),
  };
}

function mapTest(doc: Record<string, unknown>): Test {
  return {
    _id: (doc._id as ObjectId).toString(),
    userEmail: str(doc.userEmail),
    date: str(doc.date),
    edgeMm: num(doc.edgeMm, 20),
    grip: (doc.grip as Grip) ?? "half-crimp",
    leftKg: num(doc.leftKg),
    rightKg: num(doc.rightKg),
    bodyweightKg: num(doc.bodyweightKg),
    device: str(doc.device),
    notes: str(doc.notes),
    createdAt: (doc.createdAt as Date).toISOString(),
  };
}

/* ------------------------------ ciclo ------------------------------ */

export async function getActiveCycle(): Promise<Cycle | null> {
  const email = await requireUser();
  if (!email) return null;
  const doc = await getDb()
    .collection("fb_cycles")
    .findOne({ userEmail: email, active: true }, { sort: { createdAt: -1 } });
  return doc ? mapCycle(doc) : null;
}

export async function startCycle(input: {
  startDate: string;
  days: number[];
  grip: Grip;
  bodyweightKg: number;
}) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  if (!isValidDayKey(input.startDate)) return { error: "Data de início inválida" };
  if (input.days.length !== 2) return { error: "Escolha exatamente 2 dias de treino por semana" };
  if (input.days[0] === input.days[1]) return { error: "Os dois dias precisam ser diferentes" };
  if (!(input.bodyweightKg > 0)) return { error: "Peso corporal inválido" };

  const db = getDb();
  await db
    .collection("fb_cycles")
    .updateMany({ userEmail: email, active: true }, { $set: { active: false } });
  await db.collection("fb_cycles").insertOne({
    userEmail: email,
    startDate: input.startDate,
    days: [...input.days].sort((a, b) => a - b),
    grip: input.grip,
    bodyweightKg: input.bodyweightKg,
    active: true,
    createdAt: new Date(),
  });
  revalidatePath("/", "layout");
  return { success: true };
}

export async function endCycle() {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  await getDb()
    .collection("fb_cycles")
    .updateMany({ userEmail: email, active: true }, { $set: { active: false } });
  revalidatePath("/", "layout");
  return { success: true };
}

/* ----------------------------- sessões ----------------------------- */

export async function listSessions(): Promise<Session[]> {
  const email = await requireUser();
  if (!email) return [];
  const docs = await getDb()
    .collection("fb_sessions")
    .find({ userEmail: email })
    .sort({ date: -1, createdAt: -1 })
    .toArray();
  return docs.map(mapSession);
}

export async function logSession(input: {
  cycleId: string;
  date: string;
  week: number;
  phase: Phase;
  readiness: Readiness;
  readinessPullKg: number | null;
  aborted: boolean;
  sets: SessionSet[];
  notes: string;
}) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  if (!isValidDayKey(input.date)) return { error: "Data inválida" };
  if (!input.aborted && input.sets.length === 0)
    return { error: "Registre pelo menos uma série, ou marque a sessão como abortada" };
  for (const s of input.sets) {
    if (s.kind === "recruit") {
      if (!(s.leftKg > 0) || !(s.rightKg > 0))
        return { error: "Registre o pico das duas mãos em cada série" };
      if (!(s.pulls > 0)) return { error: "Número de puxadas inválido" };
    } else {
      if (!(s.seconds > 0)) return { error: "Duração inválida em uma das séries" };
      if (!(s.moves > 0)) return { error: "Número de movimentos inválido" };
    }
  }

  const db = getDb();
  await db.collection("fb_sessions").updateOne(
    { userEmail: email, cycleId: input.cycleId, date: input.date },
    {
      $set: {
        week: input.week,
        phase: input.phase,
        readiness: input.readiness,
        readinessPullKg: input.readinessPullKg,
        aborted: input.aborted,
        sets: input.sets,
        notes: input.notes.trim(),
      },
      $setOnInsert: {
        userEmail: email,
        cycleId: input.cycleId,
        date: input.date,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteSession(id: string) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  const r = await getDb()
    .collection("fb_sessions")
    .deleteOne({ _id: new ObjectId(id), userEmail: email });
  if (r.deletedCount === 0) return { error: "Sessão não encontrada" };
  revalidatePath("/", "layout");
  return { success: true };
}

/* ------------------------------ testes ----------------------------- */

export async function listTests(): Promise<Test[]> {
  const email = await requireUser();
  if (!email) return [];
  const docs = await getDb()
    .collection("fb_tests")
    .find({ userEmail: email })
    .sort({ date: 1, createdAt: 1 })
    .toArray();
  return docs.map(mapTest);
}

export async function addTest(input: {
  date: string;
  edgeMm: number;
  grip: Grip;
  leftKg: number;
  rightKg: number;
  bodyweightKg: number;
  device: string;
  notes: string;
}) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  if (!isValidDayKey(input.date)) return { error: "Data inválida" };
  if (!(input.edgeMm > 0)) return { error: "Reglete inválido" };
  if (!(input.leftKg > 0) || !(input.rightKg > 0))
    return { error: "Registre o pico das duas mãos" };
  if (!(input.bodyweightKg > 0)) return { error: "Peso corporal inválido" };

  await getDb().collection("fb_tests").insertOne({
    userEmail: email,
    date: input.date,
    edgeMm: input.edgeMm,
    grip: input.grip,
    leftKg: input.leftKg,
    rightKg: input.rightKg,
    bodyweightKg: input.bodyweightKg,
    device: input.device.trim(),
    notes: input.notes.trim(),
    createdAt: new Date(),
  });
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteTest(id: string) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  const r = await getDb()
    .collection("fb_tests")
    .deleteOne({ _id: new ObjectId(id), userEmail: email });
  if (r.deletedCount === 0) return { error: "Teste não encontrado" };
  revalidatePath("/", "layout");
  return { success: true };
}
