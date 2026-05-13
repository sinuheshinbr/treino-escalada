import { listMacrocycles } from "@/app/actions-macrociclos";
import { listTrips } from "@/app/actions-viagens";
import MacrociclosBoard from "@/components/MacrociclosBoard";

export const dynamic = "force-dynamic";

export default async function MacrociclosPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const fromTrip = typeof sp.fromTrip === "string" ? sp.fromTrip : undefined;

  const [macrocycles, allTrips] = await Promise.all([
    listMacrocycles(),
    listTrips(),
  ]);
  const alvoTrips = allTrips.filter((t) => t.tier === "alvo");

  return (
    <MacrociclosBoard
      macrocycles={macrocycles}
      alvoTrips={alvoTrips}
      initialFromTrip={fromTrip}
    />
  );
}
