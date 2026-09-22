import { getActiveCycle, listSessions } from "@/app/actions-fingerboard";
import CicloBoard from "@/components/CicloBoard";

export default async function CicloPage() {
  const [cycle, sessions] = await Promise.all([getActiveCycle(), listSessions()]);
  return <CicloBoard cycle={cycle} sessions={sessions} />;
}
