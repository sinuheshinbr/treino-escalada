import { auth, signOut } from "@/auth";
import Link from "next/link";
import NavTabs from "@/components/NavTabs";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const email = session.user.email;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Escalada
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Treino, disposição e agenda
              </p>
            </div>
            <div className="text-right">
              <Link
                href="/perfil"
                className="text-foreground hover:text-primary text-sm"
              >
                {session.user.name}
              </Link>
              <p className="text-muted-foreground text-xs mt-0.5">{email}</p>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className="text-subtle hover:text-foreground text-xs underline"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>
          <NavTabs />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
