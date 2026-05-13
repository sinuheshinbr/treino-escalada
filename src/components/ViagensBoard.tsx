"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  createTrip,
  deleteTrip,
  updateTripDays,
  updateTripTier,
  type Trip,
  type TripDay,
  type TripDayActivity,
  type TripFocus,
  type TripTier,
} from "@/app/actions-viagens";
import {
  diffDays,
  formatRangeBR,
  getTodayKey,
  shiftDay,
} from "@/lib/dates";

const FOCUS_OPTIONS: { value: TripFocus; label: string }[] = [
  { value: "projeto", label: "Projeto (max)" },
  { value: "onsight", label: "Onsight / Flash" },
  { value: "viagem-curta", label: "Viagem curta" },
  { value: "casual", label: "Casual" },
];

const FOCUS_BADGE: Record<TripFocus, string> = {
  projeto: "bg-rose-500/20 text-rose-300",
  onsight: "bg-violet-500/20 text-violet-300",
  "viagem-curta": "bg-sky-500/20 text-sky-300",
  casual: "bg-muted text-muted-foreground",
};

const TIER_BADGE: Record<TripTier, string> = {
  alvo: "bg-secondary/20 text-secondary border border-secondary/40",
  rotina: "bg-muted text-muted-foreground",
};

const TIER_LABEL: Record<TripTier, string> = {
  alvo: "Alvo",
  rotina: "Rotina",
};

const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function weekdayShort(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return WEEKDAY_SHORT[dow];
}

function dayLabel(dayKey: string): string {
  const [, m, d] = dayKey.split("-");
  return `${d}/${m}`;
}

function maxConsecutiveClimb(days: TripDay[]): number {
  let max = 0;
  let run = 0;
  for (const d of days) {
    if (d.activity === "climb") {
      run += 1;
      if (run > max) max = run;
    } else {
      run = 0;
    }
  }
  return max;
}

function countClimbs(days: TripDay[]): number {
  return days.filter((d) => d.activity === "climb").length;
}

export default function ViagensBoard({ trips }: { trips: Trip[] }) {
  const today = getTodayKey();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [focus, setFocus] = useState<TripFocus>("projeto");
  const [tier, setTier] = useState<TripTier>("rotina");
  const [notes, setNotes] = useState("");
  const [dayActivities, setDayActivities] = useState<
    Record<string, TripDayActivity>
  >({});

  const formDays = useMemo<TripDay[]>(() => {
    if (!start) return [];
    const endEff = end && end >= start ? end : start;
    const total = diffDays(start, endEff) + 1;
    const out: TripDay[] = [];
    for (let i = 0; i < total; i++) {
      const date = shiftDay(start, i);
      out.push({ date, activity: dayActivities[date] ?? "climb" });
    }
    return out;
  }, [start, end, dayActivities]);

  const formWarning = formDays.length > 0 && maxConsecutiveClimb(formDays) >= 3;

  function reset() {
    setName("");
    setLocation("");
    setStart("");
    setEnd("");
    setFocus("projeto");
    setTier("rotina");
    setNotes("");
    setDayActivities({});
  }

  function toggleFormDay(date: string) {
    setDayActivities((prev) => {
      const current = prev[date] ?? "climb";
      return {
        ...prev,
        [date]: current === "climb" ? "rest" : "climb",
      };
    });
  }

  function handleCreate() {
    setError("");
    startTransition(async () => {
      const r = await createTrip({
        name,
        location,
        startDate: start,
        endDate: end || start,
        focus,
        tier,
        days: formDays,
        notes,
      });
      if (r.error) setError(r.error);
      else {
        reset();
        setShowForm(false);
      }
    });
  }

  function handleDelete(id: string) {
    setError("");
    startTransition(async () => {
      const r = await deleteTrip(id);
      if (r.error) setError(r.error);
    });
  }

  function handleToggleTier(t: Trip) {
    setError("");
    const next: TripTier = t.tier === "alvo" ? "rotina" : "alvo";
    startTransition(async () => {
      const r = await updateTripTier(t._id, next);
      if (r.error) setError(r.error);
    });
  }

  const upcoming = trips.filter((t) => t.endDate >= today);
  const past = trips.filter((t) => t.endDate < today);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
          {error}
        </div>
      )}

      <div className="bg-card rounded-lg shadow p-4">
        <div className="flex justify-between items-baseline mb-3">
          <h3 className="font-semibold text-foreground">Próximas</h3>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm text-primary hover:text-primary-hover font-medium"
            >
              + Nova viagem
            </button>
          )}
        </div>

        {showForm && (
          <div className="border border-border rounded-lg p-3 mb-4 space-y-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome (ex.: Milho Verde julho)"
              className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm"
            />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Local (ex.: Milho Verde, GO)"
              className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-0.5">
                  Início
                </label>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-0.5">
                  Fim
                </label>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-0.5">
                  Foco
                </label>
                <select
                  value={focus}
                  onChange={(e) => setFocus(e.target.value as TripFocus)}
                  className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm bg-card"
                >
                  {FOCUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-0.5">
                  Tier
                </label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as TripTier)}
                  className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm bg-card"
                >
                  <option value="rotina">Rotina (não ancora ciclo)</option>
                  <option value="alvo">Alvo (ancora macrociclo)</option>
                </select>
              </div>
            </div>

            {formDays.length > 0 && (
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label className="text-xs text-muted-foreground">
                    Dias da viagem
                  </label>
                  <span className="text-[10px] text-subtle">
                    {countClimbs(formDays)} escalando · {formDays.length} dias
                  </span>
                </div>
                <DayChipsEditor
                  days={formDays}
                  onToggle={toggleFormDay}
                  today={today}
                />
                {formWarning && (
                  <p className="text-[11px] text-warning mt-1">
                    ⚠ {maxConsecutiveClimb(formDays)} dias seguidos de escalada
                    — cobram em fadiga e recuperação no retorno.
                  </p>
                )}
              </div>
            )}

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações (rotas, parceiros, etc.)"
              rows={2}
              className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={isPending || !name || !start}
                className="bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
              >
                Adicionar
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  reset();
                  setError("");
                }}
                className="text-subtle hover:text-muted-foreground text-sm px-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {upcoming.length === 0 ? (
          <p className="text-sm text-subtle">Sem viagens agendadas.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((t) => (
              <TripCard
                key={t._id}
                trip={t}
                today={today}
                isPending={isPending}
                onDelete={() => handleDelete(t._id)}
                onToggleTier={() => handleToggleTier(t)}
                setError={setError}
              />
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div className="bg-card rounded-lg shadow p-4">
          <h3 className="font-semibold text-foreground mb-3">Passadas</h3>
          <div className="space-y-1.5">
            {past.map((t) => (
              <div
                key={t._id}
                className="flex justify-between items-baseline border-b border-border pb-1.5 last:border-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-foreground">{t.name}</span>
                  {t.location && (
                    <span className="text-xs text-subtle ml-2">
                      {t.location}
                    </span>
                  )}
                </div>
                <span className="text-xs text-subtle shrink-0">
                  {formatRangeBR(t.startDate, t.endDate)}
                </span>
                <button
                  onClick={() => handleDelete(t._id)}
                  disabled={isPending}
                  className="text-subtle hover:text-destructive text-sm ml-2"
                  title="Remover"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TripCard({
  trip,
  today,
  isPending,
  onDelete,
  onToggleTier,
  setError,
}: {
  trip: Trip;
  today: string;
  isPending: boolean;
  onDelete: () => void;
  onToggleTier: () => void;
  setError: (msg: string) => void;
}) {
  const [editingDays, setEditingDays] = useState(false);
  const [draftDays, setDraftDays] = useState<TripDay[]>(trip.days);
  const [savingDays, startDaysTransition] = useTransition();

  function openEdit() {
    setDraftDays(trip.days);
    setEditingDays(true);
  }

  function toggleDay(date: string) {
    setDraftDays((prev) =>
      prev.map((d) =>
        d.date === date
          ? { ...d, activity: d.activity === "climb" ? "rest" : "climb" }
          : d
      )
    );
  }

  function saveDays() {
    setError("");
    startDaysTransition(async () => {
      const r = await updateTripDays(trip._id, draftDays);
      if (r.error) setError(r.error);
      else setEditingDays(false);
    });
  }

  const daysAway = diffDays(today, trip.startDate);
  const inProgress = trip.startDate <= today && today <= trip.endDate;
  const climbing = countClimbs(trip.days);
  const consec = maxConsecutiveClimb(trip.days);
  const visibleDays = editingDays ? draftDays : trip.days;
  const warn = consec >= 3;

  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-foreground">{trip.name}</h4>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${TIER_BADGE[trip.tier]}`}
            >
              {TIER_LABEL[trip.tier]}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${FOCUS_BADGE[trip.focus]}`}
            >
              {FOCUS_OPTIONS.find((o) => o.value === trip.focus)?.label}
            </span>
          </div>
          {trip.location && (
            <p className="text-xs text-muted-foreground mt-0.5">{trip.location}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {formatRangeBR(trip.startDate, trip.endDate)}
            {inProgress ? (
              <span className="ml-2 text-success font-medium">
                em andamento
              </span>
            ) : (
              <span className="ml-2 text-primary font-medium">
                em {daysAway} dia{daysAway !== 1 ? "s" : ""}
              </span>
            )}
            <span className="ml-2 text-subtle">
              · {climbing}/{trip.days.length} dia(s) escalando
            </span>
          </p>
          {trip.notes && (
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
              {trip.notes}
            </p>
          )}

          <div className="mt-2">
            <DayChipsEditor
              days={visibleDays}
              onToggle={editingDays ? toggleDay : undefined}
              today={today}
            />
            {warn && (
              <p className="text-[11px] text-warning mt-1">
                ⚠ {consec} dias seguidos de escalada — cobram em fadiga e
                recuperação.
              </p>
            )}
          </div>

          <div className="flex gap-3 mt-2 text-xs items-center flex-wrap">
            {editingDays ? (
              <>
                <button
                  onClick={saveDays}
                  disabled={savingDays}
                  className="bg-primary text-primary-foreground rounded px-2 py-0.5 font-medium hover:bg-primary-hover disabled:opacity-50"
                >
                  Salvar dias
                </button>
                <button
                  onClick={() => {
                    setDraftDays(trip.days);
                    setEditingDays(false);
                  }}
                  className="text-subtle hover:text-muted-foreground"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                onClick={openEdit}
                className="text-muted-foreground hover:text-primary underline"
              >
                Editar dias
              </button>
            )}
            <button
              onClick={onToggleTier}
              disabled={isPending}
              className="text-muted-foreground hover:text-primary underline"
            >
              {trip.tier === "alvo"
                ? "Rebaixar para rotina"
                : "Promover para alvo"}
            </button>
            {trip.tier === "alvo" && (
              <Link
                href={`/macrociclos?fromTrip=${trip._id}`}
                className="text-primary hover:text-primary-hover font-medium"
              >
                Criar macrociclo →
              </Link>
            )}
          </div>
        </div>
        <button
          onClick={onDelete}
          disabled={isPending}
          className="text-subtle hover:text-destructive text-lg font-bold px-1"
          title="Remover"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

function DayChipsEditor({
  days,
  onToggle,
  today,
}: {
  days: TripDay[];
  onToggle?: (date: string) => void;
  today: string;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {days.map((d) => {
        const isToday = d.date === today;
        const isClimb = d.activity === "climb";
        const base = "text-[10px] px-1.5 py-1 rounded leading-none";
        const colors = isClimb
          ? "bg-emerald-500/30 text-emerald-200 border border-emerald-500/40"
          : "bg-muted text-muted-foreground border border-border";
        const ring = isToday ? "ring-1 ring-primary" : "";
        const inner = (
          <>
            <span className="block font-medium">
              {weekdayShort(d.date)} {dayLabel(d.date)}
            </span>
            <span className="block">{isClimb ? "🧗 escalar" : "💤 descansar"}</span>
          </>
        );
        if (onToggle) {
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => onToggle(d.date)}
              className={`${base} ${colors} ${ring} hover:brightness-95 text-center min-w-[60px]`}
            >
              {inner}
            </button>
          );
        }
        return (
          <span
            key={d.date}
            className={`${base} ${colors} ${ring} text-center min-w-[60px]`}
          >
            {inner}
          </span>
        );
      })}
    </div>
  );
}
