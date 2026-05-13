import { listMeasurements } from "@/app/actions-avaliacoes";
import AvaliacoesBoard from "@/components/AvaliacoesBoard";

export const dynamic = "force-dynamic";

export default async function AvaliacoesPage() {
  const measurements = await listMeasurements();
  return <AvaliacoesBoard measurements={measurements} />;
}
