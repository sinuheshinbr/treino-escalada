import { listTrips } from "@/app/actions-viagens";
import ViagensBoard from "@/components/ViagensBoard";

export const dynamic = "force-dynamic";

export default async function ViagensPage() {
  const trips = await listTrips();
  return <ViagensBoard trips={trips} />;
}
