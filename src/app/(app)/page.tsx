import { getActiveCycle, listSessions } from "@/app/actions-fingerboard";
import HojeBoard from "@/components/HojeBoard";

export default async function HojePage() {
  const [cycle, sessions] = await Promise.all([getActiveCycle(), listSessions()]);
  return <HojeBoard cycle={cycle} sessions={sessions} />;
}
