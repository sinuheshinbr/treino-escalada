import Link from "next/link";
import DisposicaoForm from "@/components/DisposicaoForm";
import DisposicaoHistory from "@/components/DisposicaoHistory";
import {
  getDisposicao,
  listRecentDispositions,
} from "@/app/actions-disposicao";
import {
  formatDayBR,
  getTodayKey,
  isValidDayKey,
  shiftDay,
} from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function DisposicaoPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  const today = getTodayKey();
  const dayKey = d && isValidDayKey(d) ? d : today;
  const isToday = dayKey === today;

  const [current, history] = await Promise.all([
    getDisposicao(dayKey),
    listRecentDispositions(14),
  ]);

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <Link
            href={`/disposicao?d=${shiftDay(dayKey, -1)}`}
            className="text-subtle hover:text-foreground p-1 text-xl font-bold"
            aria-label="Dia anterior"
          >
            &lsaquo;
          </Link>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground capitalize">
              {formatDayBR(dayKey)}
            </h2>
            {!isToday && (
              <Link
                href="/disposicao"
                className="text-xs text-primary hover:underline"
              >
                Voltar para hoje
              </Link>
            )}
          </div>
          <Link
            href={`/disposicao?d=${shiftDay(dayKey, 1)}`}
            className="text-subtle hover:text-foreground p-1 text-xl font-bold"
            aria-label="Próximo dia"
          >
            &rsaquo;
          </Link>
        </div>
      </div>

      <DisposicaoForm dayKey={dayKey} initial={current} />

      <DisposicaoHistory items={history} />
    </div>
  );
}
