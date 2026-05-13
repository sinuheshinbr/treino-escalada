"use server";

import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { revalidatePath } from "next/cache";

export async function updateName(name: string) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Não autenticado" };
  const trimmed = name.trim();
  if (!trimmed) return { error: "Nome obrigatório" };
  if (trimmed.length > 80) return { error: "Nome muito longo" };

  const db = getDb();
  await db
    .collection("users")
    .updateOne(
      { email: session.user.email.toLowerCase() },
      { $set: { name: trimmed } }
    );
  revalidatePath("/");
  revalidatePath("/perfil");
  return { success: true };
}
