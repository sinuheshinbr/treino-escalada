import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getDb } from "@/lib/mongodb";
import { isBootstrapAdmin } from "@/lib/users";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.email) return false;
      const email = profile.email.toLowerCase();
      const db = getDb();

      const existing = await db.collection("users").findOne({ email });
      const shouldBeAdmin = existing?.isAdmin || isBootstrapAdmin(email);

      await db.collection("users").updateOne(
        { email },
        {
          $set: {
            image: profile.picture ?? null,
            isAdmin: !!shouldBeAdmin,
          },
          $setOnInsert: {
            email,
            name: profile.name ?? email,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const db = getDb();
        const user = await db
          .collection("users")
          .findOne({ email: session.user.email.toLowerCase() });
        if (user) {
          session.user.name = user.name as string;
        }
      }
      return session;
    },
  },
});
