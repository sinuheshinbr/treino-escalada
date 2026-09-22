import {
  getActiveCycle,
  listSessions,
  listTests,
} from "@/app/actions-fingerboard";
import HojeBoard from "@/components/HojeBoard";

export default async function HojePage() {
  const [cycle, sessions, tests] = await Promise.all([
    getActiveCycle(),
    listSessions(),
    listTests(),
  ]);
  return <HojeBoard cycle={cycle} sessions={sessions} tests={tests} />;
}
