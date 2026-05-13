import { listTemplates, listWorkouts } from "@/app/actions-treinos";
import TreinosBoard from "@/components/TreinosBoard";

export const dynamic = "force-dynamic";

export default async function TreinosPage() {
  const [templates, workouts] = await Promise.all([
    listTemplates(),
    listWorkouts(50),
  ]);
  return <TreinosBoard templates={templates} workouts={workouts} />;
}
