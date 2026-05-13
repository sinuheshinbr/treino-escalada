import Link from "next/link";
import { getDisposicao } from "@/app/actions-disposicao";
import { getNextTrip, listTrips } from "@/app/actions-viagens";
import { listWorkouts } from "@/app/actions-treinos";
import { getActiveMacrocycle } from "@/app/actions-macrociclos";
import { listOverridesInRange } from "@/app/actions-overrides";
import { listReflowAcks } from "@/app/actions-reflow-acks";
import { recommend } from "@/lib/recommendation";
import { analyzeWeek, weekStartFor } from "@/lib/reflow";
import {
  WORKOUT_CATEGORY_COLOR,
  WORKOUT_CATEGORY_LABEL,
} from "@/lib/workout-categories";
import {
  formatDayBR,
  formatDayShortBR,
  formatRangeBR,
  getTodayKey,
  shiftDay,
} from "@/lib/dates";
import WeekView from "@/components/WeekView";
import RecommendationOptions from "@/components/RecommendationOptions";
import type { DayRole } from "@/lib/macrocycle";

export const dynamic = "force-dynamic";

const INTENSITY_BADGE: Record<string, string> = {
  descanso: "bg-muted text-muted-foreground",
  leve: "bg-sky-500/20 text-sky-300",
  moderado: "bg-amber-500/20 text-amber-300",
  alto: "bg-rose-500/20 text-rose-300",
};

export default async function HomePage() {
  const today = getTodayKey();
  const weekStart = weekStartFor(today);
  const weekEnd = shiftDay(weekStart, 6);

  const [
    disposicao,
    nextTrip,
    recentWorkouts,
    macrocycle,
    allTrips,
    overrides,
    acks,
  ] = await Promise.all([
    getDisposicao(today),
    getNextTrip(),
    listWorkouts(5),
    getActiveMacrocycle(),
    listTrips(),
    listOverridesInRange(weekStart, weekEnd),
    listReflowAcks(weekStart),
  ]);

  const tripsThisWeek = allTrips.filter(
    (t) => t.startDate <= weekEnd && t.endDate >= weekStart
  );
  const overridesMap = new Map<string, DayRole>(
    overrides.map((o) => [o.date, o.role])
  );
  const analysis = analyzeWeek(
    weekStart,
    today,
    macrocycle,
    tripsThisWeek,
    overridesMap,
    acks
  );

  const todayCell = analysis.days.find((d) => d.isToday) ?? null;
  const rec = recommend(disposicao, nextTrip, {
    phaseName: analysis.phase?.name ?? null,
    phaseWeekNumber: analysis.phaseWeekNumber,
    plannedRole: todayCell?.actual ?? null,
    plannedRoleSource: todayCell?.source ?? "none",
  });

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg shadow p-4">
        <p className="text-xs text-subtle uppercase tracking-wide">Hoje</p>
        <h2 className="text-lg font-semibold text-foreground capitalize mt-0.5">
          {formatDayBR(today)}
        </h2>
      </div>

      <WeekView analysis={analysis} />

      <div className="bg-card rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-xs text-subtle uppercase tracking-wide">
            Recomendação
          </p>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${WORKOUT_CATEGORY_COLOR[rec.category]}`}
          >
            {WORKOUT_CATEGORY_LABEL[rec.category]}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${INTENSITY_BADGE[rec.intensity]}`}
          >
            {rec.intensity}
          </span>
        </div>
        <h3 className="text-base font-semibold text-foreground">
          {rec.headline}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{rec.rationale}</p>
        <RecommendationOptions options={rec.options} today={today} />
        <div className="flex gap-3 mt-3">
          <Link
            href="/treinos"
            className="text-sm text-primary hover:text-primary-hover font-medium"
          >
            → Treinos
          </Link>
          {!disposicao && (
            <Link
              href="/disposicao"
              className="text-sm text-primary hover:text-primary-hover font-medium"
            >
              → Registrar disposição
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/disposicao"
          className="bg-card rounded-lg shadow p-4 hover:shadow-md transition-shadow"
        >
          <p className="text-xs text-subtle uppercase tracking-wide">
            Disposição
          </p>
          {disposicao ? (
            <>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {disposicao.energy}
                <span className="text-sm text-subtle">/10</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {disposicao.sleepHours != null
                  ? `${disposicao.sleepHours}h sono`
                  : "—"}
                {disposicao.soreness > 0
                  ? ` · dor ${disposicao.soreness}`
                  : " · sem dor"}
              </p>
            </>
          ) : (
            <p className="text-sm text-primary mt-2 font-medium">
              Registrar →
            </p>
          )}
        </Link>

        <Link
          href="/viagens"
          className="bg-card rounded-lg shadow p-4 hover:shadow-md transition-shadow"
        >
          <p className="text-xs text-subtle uppercase tracking-wide">
            Próxima viagem
          </p>
          {nextTrip ? (
            <>
              <p className="text-sm font-semibold text-foreground mt-1 truncate">
                {nextTrip.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatRangeBR(nextTrip.startDate, nextTrip.endDate)}
              </p>
              {rec.daysToTrip != null && !rec.inTrip && (
                <p className="text-xs text-primary font-medium mt-0.5">
                  em {rec.daysToTrip} dia{rec.daysToTrip !== 1 ? "s" : ""}
                </p>
              )}
              {rec.inTrip && (
                <p className="text-xs text-success font-medium mt-0.5">
                  em andamento
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-primary mt-2 font-medium">
              Agendar →
            </p>
          )}
        </Link>
      </div>

      <div className="bg-card rounded-lg shadow p-4">
        <div className="flex justify-between items-baseline mb-3">
          <h3 className="font-semibold text-foreground">Treinos recentes</h3>
          <Link
            href="/treinos"
            className="text-xs text-primary hover:underline"
          >
            ver tudo
          </Link>
        </div>
        {recentWorkouts.length === 0 ? (
          <p className="text-sm text-subtle">
            Nenhum treino registrado ainda.
          </p>
        ) : (
          <div className="space-y-1.5">
            {recentWorkouts.map((w) => (
              <div
                key={w._id}
                className="flex items-center gap-2 text-sm border-b border-border pb-1.5 last:border-0 last:pb-0"
              >
                <span className="text-xs text-subtle w-12 shrink-0">
                  {formatDayShortBR(w.date)}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${WORKOUT_CATEGORY_COLOR[w.category]}`}
                >
                  {WORKOUT_CATEGORY_LABEL[w.category]}
                </span>
                <span className="text-foreground truncate flex-1">{w.name}</span>
                {w.rpe != null && (
                  <span className="text-xs text-subtle shrink-0">
                    RPE {w.rpe}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
