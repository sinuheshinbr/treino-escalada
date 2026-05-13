import { signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const redirectTo =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-card rounded-lg shadow-lg p-8 max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Escalada</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Faça login com sua conta Google
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo });
          }}
        >
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground rounded-lg px-4 py-3 font-medium hover:bg-primary-hover transition-colors"
          >
            Entrar com Google
          </button>
        </form>
      </div>
    </div>
  );
}
