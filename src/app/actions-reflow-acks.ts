"use server";

import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { isValidDayKey } from "@/lib/dates";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import type { DayRole } from "@/lib/macrocycle";

export type ReflowAckKind = "accept_loss";

export interface ReflowAck {
  _id: string;
  userEmail: string;
  weekStart: string;
  kind: ReflowAckKind;
  role: DayRole;
  acceptedGap: number;
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

function mapAck(doc: Record<string, unknown>): ReflowAck {
  return {
    _id: (doc._id as ObjectId).toString(),
    userEmail: doc.userEmail as string,
    weekStart: doc.weekStart as string,
    kind: doc.kind as ReflowAckKind,
    role: doc.role as DayRole,
    acceptedGap: doc.acceptedGap as number,
    createdAt: (doc.createdAt as Date).toISOString(),
  };
}

export async function listReflowAcks(weekStart: string): Promise<ReflowAck[]> {
  const email = await requireUser();
  if (!email) return [];
  if (!isValidDayKey(weekStart)) return [];
  const db = getDb();
  const docs = await db
    .collection("reflowAcks")
    .find({ userEmail: email, weekStart })
    .toArray();
  return docs.map(mapAck);
}

export async function acceptLoss(
  weekStart: string,
  role: DayRole,
  acceptedGap: number
) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  if (!isValidDayKey(weekStart)) return { error: "Semana inválida" };
  if (!VALID_ROLES.includes(role)) return { error: "Papel inválido" };
  if (!Number.isInteger(acceptedGap) || acceptedGap < 1) {
    return { error: "Gap inválido" };
  }
  const db = getDb();
  await db.collection("reflowAcks").updateOne(
    { userEmail: email, weekStart, kind: "accept_loss", role },
    {
      $set: { acceptedGap },
      $setOnInsert: {
        userEmail: email,
        weekStart,
        kind: "accept_loss",
        role,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
  revalidatePath("/");
  return { success: true };
}

export async function revokeAcceptedLoss(
  weekStart: string,
  role: DayRole
) {
  const email = await requireUser();
  if (!email) return { error: "Não autenticado" };
  if (!isValidDayKey(weekStart)) return { error: "Semana inválida" };
  const db = getDb();
  await db.collection("reflowAcks").deleteOne({
    userEmail: email,
    weekStart,
    kind: "accept_loss",
    role,
  });
  revalidatePath("/");
  return { success: true };
}
