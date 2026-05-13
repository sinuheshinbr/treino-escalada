import { getDb } from "@/lib/mongodb";

export interface AppUser {
  email: string;
  name: string;
  image?: string;
  isAdmin: boolean;
  createdAt: Date;
}

function adminEmailsFromEnv(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isBootstrapAdmin(email: string): boolean {
  return adminEmailsFromEnv().includes(email.toLowerCase());
}

export async function getUser(email: string): Promise<AppUser | null> {
  const db = getDb();
  const doc = await db
    .collection("users")
    .findOne({ email: email.toLowerCase() });
  if (!doc) return null;
  return {
    email: doc.email as string,
    name: doc.name as string,
    image: doc.image as string | undefined,
    isAdmin: !!doc.isAdmin,
    createdAt: doc.createdAt as Date,
  };
}

export async function isUserAdmin(
  email: string | null | undefined
): Promise<boolean> {
  if (!email) return false;
  const user = await getUser(email);
  return !!user?.isAdmin;
}
