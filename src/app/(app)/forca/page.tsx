import { getActiveCycle, listTests } from "@/app/actions-fingerboard";
import ForcaBoard from "@/components/ForcaBoard";

export default async function ForcaPage() {
  const [tests, cycle] = await Promise.all([listTests(), getActiveCycle()]);
  return <ForcaBoard tests={tests} defaultBodyweight={cycle?.bodyweightKg ?? 0} />;
}
