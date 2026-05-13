import { auth } from "@/auth";
import { getUser } from "@/lib/users";
import ProfileForm from "@/components/ProfileForm";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const user = await getUser(session.user.email);

  return (
    <div className="bg-card rounded-lg shadow p-4 space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Perfil</h2>
      <div className="text-sm text-muted-foreground">
        <p>{session.user.email}</p>
        {user?.isAdmin && (
          <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
            admin
          </span>
        )}
      </div>
      <ProfileForm initialName={user?.name ?? session.user.name ?? ""} />
    </div>
  );
}
