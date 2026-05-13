"use client";

import { useState, useTransition } from "react";
import {
  applyOverrides,
  clearDayOverride,
  setDayOverride,
} from "@/app/actions-overrides";
import { acceptLoss } from "@/app/actions-reflow-acks";
import {
  DAY_ROLE_COLOR,
  DAY_ROLE_LABEL,
  DAY_ROLES,
  type DayRole,
  type DayRoleSource,
} from "@/lib/macrocycle";
import type { ReflowSuggestion, WeekAnalysis, WeekDayCell } from "@/lib/reflow";
import { formatRangeBR } from "@/lib/dates";

export default function WeekView({ analysis }: { analysis: WeekAnalysis }) {
  const [error, setError] = useState("");
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApply(s: ReflowSuggestion) {
    setError("");
    if (s.ack) {
      const ack = s.ack;
      startTransition(async () => {
        try {
          const r = await acceptLoss(
            analysis.weekStart,
            ack.role,
            ack.gap
          );
          if (r.error) setError(r.error);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Erro ao salvar");
        }
      });
      return;
    }
    if (s.apply.length === 0) return;
    startTransition(async () => {
      try {
        const r = await applyOverrides(s.apply);
        if (r.error) setError(r.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao aplicar");
      }
    });
  }

  function handleClearOverride(date: string) {
    setError("");
    startTransition(async () => {
      const r = await clearDayOverride(date);
      if (r.error) setError(r.error);
      else setEditingDate(null);
    });
  }

  function handleSetRole(date: string, role: DayRole) {
    setError("");
    startTransition(async () => {
      const r = await setDayOverride(date, role);
      if (r.error) setError(r.error);
      else setEditingDate(null);
    });
  }

  const editingDay = editingDate
    ? analysis.days.find((d) => d.date === editingDate) ?? null
    : null;

  const phaseLabel = analysis.phase ? analysis.phase.name : null;

  return (
    <div className="bg-card rounded-lg shadow p-4">
      <div className="flex justify-between items-baseline">
        <div>
          <p className="text-xs text-subtle uppercase tracking-wide">
            Esta semana
          </p>
          <h3 className="text-base font-semibold text-foreground">
            {formatRangeBR(analysis.weekStart, analysis.weekEnd)}
          </h3>
          {phaseLabel && (
            <p className="text-xs text-primary font-medium mt-0.5">
              {phaseLabel} · semana {analysis.phaseWeekNumber} de{" "}
              {analysis.phaseTotalWeeks}
            </p>
          )}
          {!phaseLabel && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Sem macrociclo ativo. Crie um em /macrociclos para ativar o
              planejamento por fase.
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-xs p-2 rounded mt-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 mt-3">
        {analysis.days.map((d) => (
          <DayCellView
            key={d.date}
            day={d}
            isEditing={d.date === editingDate}
            onClick={() =>
              setEditingDate(d.date === editingDate ? null : d.date)
            }
          />
        ))}
      </div>

      {editingDay && (
        <DayEditor
          day={editingDay}
          isPending={isPending}
          onSetRole={(role) => handleSetRole(editingDay.date, role)}
          onClear={() => handleClearOverride(editingDay.date)}
          onCancel={() => setEditingDate(null)}
        />
      )}

      {analysis.deltas.length > 0 && (
        <DeltaSummary
          deltas={analysis.deltas}
          primaryRole={analysis.primaryRole}
          primaryGap={analysis.primaryGap}
          consecClimb={analysis.consecutiveClimbRun}
        />
      )}

      {analysis.suggestions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <h4 className="text-xs text-subtle uppercase tracking-wide mb-2">
            Reflow sugerido
          </h4>
          <div className="space-y-2">
            {analysis.suggestions.map((s) => (
              <SuggestionRow
                key={s.id}
                suggestion={s}
                onApply={() => handleApply(s)}
                pending={isPending}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DayCellView({
  day,
  isEditing,
  onClick,
}: {
  day: WeekDayCell;
  isEditing: boolean;
  onClick: () => void;
}) {
  const sourceTag =
    day.source === "manual"
      ? "manual"
      : day.source === "trip"
        ? day.trip?.name ?? "viagem"
        : null;
  const baseBorder = isEditing
    ? "ring-2 ring-manual"
    : day.isToday
      ? "ring-1 ring-primary"
      : day.source === "manual"
        ? "ring-1 ring-manual"
        : "";
  const dim = day.isPast ? "opacity-60" : "";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-center text-[10px] ${dim} rounded p-0.5 hover:bg-background transition-colors cursor-pointer`}
      title={
        day.planned && day.changed
          ? `Plano: ${DAY_ROLE_LABEL[day.planned]}`
          : undefined
      }
    >
      <div className="text-muted-foreground mb-0.5">
        {day.weekdayLabel} {dayNum(day.date)}
      </div>
      <div
        className={`rounded p-1 leading-none min-h-[2rem] flex items-center justify-center ${DAY_ROLE_COLOR[day.actual]} ${baseBorder}`}
      >
        {DAY_ROLE_LABEL[day.actual]}
      </div>
      <div
        className={`text-[9px] mt-0.5 line-through ${
          day.changed && day.planned ? "text-subtle" : "invisible"
        }`}
      >
        {day.planned ? DAY_ROLE_LABEL[day.planned] : " "}
      </div>
      <div
        className={`text-[9px] mt-0.5 ${
          sourceTag ? "text-subtle" : "invisible"
        }`}
      >
        {sourceTag ?? " "}
      </div>
    </button>
  );
}

function DayEditor({
  day,
  isPending,
  onSetRole,
  onClear,
  onCancel,
}: {
  day: WeekDayCell;
  isPending: boolean;
  onSetRole: (role: DayRole) => void;
  onClear: () => void;
  onCancel: () => void;
}) {
  const [yy, mm, dd] = day.date.split("-");
  const dateLabel = `${dd}/${mm}/${yy}`;
  return (
    <div className="mt-3 bg-background rounded p-3 border border-border">
      <div className="flex justify-between items-start mb-2">
        <div className="text-xs text-muted-foreground">
          <p className="font-medium">
            {day.weekdayLabel} · {dateLabel}
          </p>
          <p className="text-muted-foreground mt-0.5">
            Atual:{" "}
            <span
              className={`inline-block rounded px-1 ${DAY_ROLE_COLOR[day.actual]}`}
            >
              {DAY_ROLE_LABEL[day.actual]}
            </span>{" "}
            <span className="text-subtle">
              ({sourceLabel(day.source, day.trip?.name)})
            </span>
          </p>
          {day.planned && day.planned !== day.actual && (
            <p className="text-subtle mt-0.5">
              Plano da fase:{" "}
              <span className="line-through">
                {DAY_ROLE_LABEL[day.planned]}
              </span>
            </p>
          )}
        </div>
        <button
          onClick={onCancel}
          disabled={isPending}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          fechar
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-1.5 mt-2">
        {day.isPast
          ? "O que rolou nesse dia?"
          : "Marcar como (override manual):"}
      </p>
      <div className="flex flex-wrap gap-1">
        {DAY_ROLES.map((role) => {
          const isCurrent = day.actual === role;
          return (
            <button
              key={role}
              onClick={() => onSetRole(role)}
              disabled={isPending}
              className={`text-xs rounded px-2 py-1 ${DAY_ROLE_COLOR[role]} ${
                isCurrent
                  ? "ring-2 ring-manual"
                  : "opacity-70 hover:opacity-100"
              } disabled:opacity-30`}
            >
              {DAY_ROLE_LABEL[role]}
            </button>
          );
        })}
      </div>
      {day.source === "manual" && (
        <button
          onClick={onClear}
          disabled={isPending}
          className="text-xs text-manual hover:text-manual mt-2 block"
        >
          ↺ Limpar override (voltar ao plano)
        </button>
      )}
    </div>
  );
}

function sourceLabel(source: DayRoleSource, tripName?: string): string {
  if (source === "manual") return "manual";
  if (source === "trip") return tripName ?? "viagem";
  if (source === "phase") return "plano da fase";
  return "sem plano";
}

function DeltaSummary({
  deltas,
  primaryRole,
  primaryGap,
  consecClimb,
}: {
  deltas: { role: DayRole; delta: number }[];
  primaryRole: DayRole | null;
  primaryGap: number;
  consecClimb: number;
}) {
  return (
    <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
      <div>
        <span className="text-subtle">Diferenças vs. plano:</span>{" "}
        {deltas.map((d, i) => (
          <span key={d.role}>
            {i > 0 && ", "}
            <span
              className={
                d.delta < 0 ? "text-destructive" : "text-success"
              }
            >
              {d.delta > 0 ? "+" : ""}
              {d.delta} {DAY_ROLE_LABEL[d.role].toLowerCase()}
            </span>
          </span>
        ))}
      </div>
      {primaryRole && primaryGap > 0 && (
        <div className="text-destructive">
          Estímulo principal da fase ({DAY_ROLE_LABEL[primaryRole].toLowerCase()
          }): faltam {primaryGap} sessão{primaryGap !== 1 ? "ões" : ""}.
        </div>
      )}
      {consecClimb >= 3 && (
        <div className="text-warning">
          ⚠ {consecClimb} dias seguidos de escalada esta semana.
        </div>
      )}
    </div>
  );
}

function SuggestionRow({
  suggestion,
  onApply,
  pending,
}: {
  suggestion: ReflowSuggestion;
  onApply: () => void;
  pending: boolean;
}) {
  const priorityColor =
    suggestion.priority === "high"
      ? "border-l-4 border-primary"
      : suggestion.priority === "med"
        ? "border-l-4 border-warning"
        : "border-l-4 border-border-strong";
  const label = suggestion.ack ? "Aceitar" : "Aplicar";
  return (
    <div className={`bg-background rounded-r p-2 ${priorityColor}`}>
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {suggestion.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {suggestion.description}
          </p>
        </div>
        <button
          onClick={onApply}
          disabled={pending}
          className="text-xs bg-primary text-primary-foreground rounded px-2 py-1 font-medium hover:bg-primary-hover disabled:opacity-50 shrink-0"
        >
          {label}
        </button>
      </div>
    </div>
  );
}

function dayNum(dateKey: string): string {
  return dateKey.split("-")[2];
}
