import type { Disposicao } from "@/app/actions-disposicao";
import { formatDayShortBR } from "@/lib/dates";

function energyColor(n: number): string {
  if (n <= 3) return "bg-destructive";
  if (n <= 5) return "bg-warning";
  if (n <= 7) return "bg-secondary";
  return "bg-success";
}

export default function DisposicaoHistory({
  items,
}: {
  items: Disposicao[];
}) {
  if (items.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow p-4 text-sm text-subtle">
        Nenhum registro ainda. Comece pela disposição de hoje.
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow p-4">
      <h3 className="font-semibold text-foreground mb-3">Últimos dias</h3>
      <div className="space-y-2">
        {items.map((d) => (
          <div
            key={d._id}
            className="flex items-center gap-3 border-b border-border pb-2 last:border-0 last:pb-0"
          >
            <div className="text-xs text-muted-foreground w-12 shrink-0">
              {formatDayShortBR(d.date)}
            </div>
            <div className="flex items-center gap-1.5 w-20 shrink-0">
              <span
                className={`w-2 h-2 rounded-full ${energyColor(d.energy)}`}
              />
              <span className="text-sm text-foreground">{d.energy}/10</span>
            </div>
            <div className="text-xs text-muted-foreground w-16 shrink-0">
              {d.sleepHours != null ? `${d.sleepHours}h sono` : "—"}
            </div>
            <div className="text-xs text-muted-foreground w-16 shrink-0">
              {d.soreness > 0 ? `dor ${d.soreness}` : "sem dor"}
            </div>
            <div className="text-xs text-subtle truncate flex-1">
              {d.notes}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
