"use client";

import { useState, useTransition } from "react";
import {
  createMacrocycleFromTrip,
  deleteMacrocycle,
  updateMacrocycleName,
  updatePhase,
  type PhasePatch,
} from "@/app/actions-macrociclos";
import {
  DAY_ROLES,
  DAY_ROLE_COLOR,
  DAY_ROLE_LABEL,
  NUTRITION_MODES,
  NUTRITION_MODE_LABEL,
  PHASE_TYPE_LABEL,
  defaultFocus,
  defaultMicrocycle,
  defaultNutrition,
  getPhaseTotalWeeks,
  getPhaseWeekNumber,
  type DayRole,
  type Macrocycle,
  type Microcycle,
  type NutritionMode,
  type Phase,
} from "@/lib/macrocycle";
import type { Trip } from "@/app/actions-viagens";
import { formatRangeBR, getTodayKey } from "@/lib/dates";

interface Props {
  macrocycles: Macrocycle[];
  alvoTrips: Trip[];
  initialFromTrip?: string;
}

const WEEKDAYS: { key: keyof Microcycle; label: string }[] = [
  { key: "monday", label: "Seg" },
  { key: "tuesday", label: "Ter" },
  { key: "wednesday", label: "Qua" },
  { key: "thursday", label: "Qui" },
  { key: "friday", label: "Sex" },
  { key: "saturday", label: "Sáb" },
  { key: "sunday", label: "Dom" },
];

export default function MacrociclosBoard({
  macrocycles,
  alvoTrips,
  initialFromTrip,
}: Props) {
  const today = getTodayKey();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const initialMatch =
    !!initialFromTrip &&
    alvoTrips.some((t) => t._id === initialFromTrip);

  // creation form
  const [creating, setCreating] = useState(initialMatch);
  const [createTripId, setCreateTripId] = useState(
    initialMatch ? (initialFromTrip as string) : ""
  );
  const [createStart, setCreateStart] = useState(today);
  const [createName, setCreateName] = useState("");

  function resetCreate() {
    setCreateTripId("");
    setCreateStart(today);
    setCreateName("");
  }

  function handleCreate() {
    setError("");
    if (!createTripId) {
      setError("Escolha uma viagem-alvo");
      return;
    }
    startTransition(async () => {
      const r = await createMacrocycleFromTrip({
        tripId: createTripId,
        startDate: createStart,
        name: createName.trim() || undefined,
      });
      if (r.error) setError(r.error);
      else {
        resetCreate();
        setCreating(false);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Excluir este macrociclo?")) return;
    setError("");
    startTransition(async () => {
      const r = await deleteMacrocycle(id);
      if (r.error) setError(r.error);
    });
  }

  function handleRename(id: string, name: string) {
    setError("");
    startTransition(async () => {
      const r = await updateMacrocycleName(id, name);
      if (r.error) setError(r.error);
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
          {error}
        </div>
      )}

      <div className="bg-card rounded-lg shadow p-4">
        <div className="flex justify-between items-baseline mb-3">
          <h3 className="font-semibold text-foreground">Macrociclos</h3>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              disabled={alvoTrips.length === 0}
              className="text-sm text-primary hover:text-primary-hover font-medium disabled:text-subtle disabled:cursor-not-allowed"
            >
              + Novo
            </button>
          )}
        </div>

        {alvoTrips.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Você ainda não tem viagens marcadas como{" "}
            <span className="font-medium text-secondary">alvo</span>. Vá em
            Viagens, abra uma viagem e clique &quot;Promover para alvo&quot;.
          </p>
        )}

        {creating && (
          <div className="border border-border rounded-lg p-3 mb-4 space-y-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-0.5">
                Viagem-alvo
              </label>
              <select
                value={createTripId}
                onChange={(e) => setCreateTripId(e.target.value)}
                className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm bg-card"
              >
                <option value="">— escolher —</option>
                {alvoTrips.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({formatRangeBR(t.startDate, t.endDate)})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-0.5">
                  Início do macrociclo
                </label>
                <input
                  type="date"
                  value={createStart}
                  onChange={(e) => setCreateStart(e.target.value)}
                  className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-0.5">
                  Nome (opcional)
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Auto-gera do nome da viagem"
                  className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              As 4 fases serão pré-preenchidas trabalhando para trás a partir da
              viagem. Você pode editar cada uma depois.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={isPending || !createTripId}
                className="bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
              >
                Criar
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  resetCreate();
                  setError("");
                }}
                className="text-subtle hover:text-muted-foreground text-sm px-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {macrocycles.length === 0 ? (
          !creating && (
            <p className="text-sm text-subtle">
              Nenhum macrociclo ainda.
            </p>
          )
        ) : (
          <div className="space-y-3">
            {macrocycles.map((m) => (
              <MacrocycleCard
                key={m._id}
                macrocycle={m}
                today={today}
                trip={alvoTrips.find((t) => t._id === m.targetTripId) ?? null}
                onDelete={() => handleDelete(m._id)}
                onRename={(name) => handleRename(m._id, name)}
                setError={setError}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MacrocycleCard({
  macrocycle,
  today,
  trip,
  onDelete,
  onRename,
  setError,
}: {
  macrocycle: Macrocycle;
  today: string;
  trip: Trip | null;
  onDelete: () => void;
  onRename: (name: string) => void;
  setError: (msg: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(macrocycle.name);

  const firstPhase = macrocycle.phases[0];
  const lastPhase = macrocycle.phases[macrocycle.phases.length - 1];
  const isActive =
    firstPhase &&
    lastPhase &&
    firstPhase.startDate <= today &&
    today <= lastPhase.endDate;
  const currentPhase = isActive
    ? macrocycle.phases.find(
        (p) => p.startDate <= today && today <= p.endDate
      )
    : null;

  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="flex-1 border border-border-strong rounded-lg px-2 py-1 text-sm"
              />
              <button
                onClick={() => {
                  onRename(nameDraft);
                  setEditingName(false);
                }}
                className="text-xs text-primary font-medium"
              >
                Salvar
              </button>
              <button
                onClick={() => {
                  setNameDraft(macrocycle.name);
                  setEditingName(false);
                }}
                className="text-xs text-muted-foreground"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-foreground">{macrocycle.name}</h4>
              <button
                onClick={() => {
                  setNameDraft(macrocycle.name);
                  setEditingName(true);
                }}
                className="text-xs text-subtle hover:text-foreground"
              >
                editar
              </button>
              {isActive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/20 text-success">
                  Ativo
                </span>
              )}
            </div>
          )}
          {trip && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Alvo: {trip.name} ({formatRangeBR(trip.startDate, trip.endDate)})
            </p>
          )}
          {firstPhase && lastPhase && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatRangeBR(firstPhase.startDate, lastPhase.endDate)}
            </p>
          )}
          {currentPhase && (
            <p className="text-xs text-primary mt-1 font-medium">
              {PHASE_TYPE_LABEL[currentPhase.type]} · semana{" "}
              {getPhaseWeekNumber(currentPhase, today)} de{" "}
              {getPhaseTotalWeeks(currentPhase)}
            </p>
          )}
        </div>
        <button
          onClick={onDelete}
          className="text-subtle hover:text-destructive text-lg font-bold px-1"
          title="Excluir macrociclo"
        >
          &times;
        </button>
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 text-xs text-primary hover:text-primary-hover font-medium"
      >
        {expanded ? "Recolher fases" : "Ver fases"}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {macrocycle.phases.map((p) => (
            <PhaseCard
              key={p.type}
              macroId={macrocycle._id}
              phase={p}
              today={today}
              setError={setError}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PhaseCard({
  macroId,
  phase,
  today,
  setError,
}: {
  macroId: string;
  phase: Phase;
  today: string;
  setError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Phase>(phase);

  function startEdit() {
    setDraft(phase);
    setEditing(true);
  }

  function restoreDefaults() {
    setDraft({
      ...draft,
      microcycle: defaultMicrocycle(phase.type),
      focusDescription: defaultFocus(phase.type),
      nutritionMode: defaultNutrition(phase.type),
    });
  }

  const isActive = phase.startDate <= today && today <= phase.endDate;

  function save() {
    setError("");
    const patch: PhasePatch = {
      name: draft.name,
      startDate: draft.startDate,
      endDate: draft.endDate,
      microcycle: draft.microcycle,
      nutritionMode: draft.nutritionMode,
      focusDescription: draft.focusDescription,
    };
    startTransition(async () => {
      const r = await updatePhase(macroId, phase.type, patch);
      if (r.error) setError(r.error);
      else setEditing(false);
    });
  }

  function updateMicrocycleDay(day: keyof Microcycle, role: DayRole) {
    setDraft({ ...draft, microcycle: { ...draft.microcycle, [day]: role } });
  }

  return (
    <div
      className={`border rounded-lg p-3 ${
        isActive ? "border-primary bg-primary/10" : "border-border"
      }`}
    >
      <div className="flex justify-between items-baseline gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h5 className="text-sm font-semibold text-foreground">
              {PHASE_TYPE_LABEL[phase.type]}
            </h5>
            {isActive && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                agora
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatRangeBR(phase.startDate, phase.endDate)} ·{" "}
            {getPhaseTotalWeeks(phase)} sem ·{" "}
            {NUTRITION_MODE_LABEL[phase.nutritionMode]}
          </p>
        </div>
        {!editing && (
          <button
            onClick={startEdit}
            className="text-xs text-primary hover:text-primary-hover font-medium"
          >
            Editar
          </button>
        )}
      </div>

      {!editing && (
        <>
          {phase.focusDescription && (
            <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
              {phase.focusDescription}
            </p>
          )}
          <div className="mt-2 grid grid-cols-7 gap-1">
            {WEEKDAYS.map(({ key, label }) => {
              const role = phase.microcycle[key];
              return (
                <div key={key} className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-0.5">
                    {label}
                  </div>
                  <div
                    className={`text-[10px] px-1 py-1 rounded leading-none min-h-[2rem] flex items-center justify-center text-center ${DAY_ROLE_COLOR[role]}`}
                  >
                    {DAY_ROLE_LABEL[role]}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {editing && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-0.5">
                Início
              </label>
              <input
                type="date"
                value={draft.startDate}
                onChange={(e) =>
                  setDraft({ ...draft, startDate: e.target.value })
                }
                className="w-full border border-border-strong rounded-lg px-2 py-1 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-0.5">
                Fim
              </label>
              <input
                type="date"
                value={draft.endDate}
                onChange={(e) =>
                  setDraft({ ...draft, endDate: e.target.value })
                }
                className="w-full border border-border-strong rounded-lg px-2 py-1 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-0.5">
              Nutrição
            </label>
            <select
              value={draft.nutritionMode}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  nutritionMode: e.target.value as NutritionMode,
                })
              }
              className="w-full border border-border-strong rounded-lg px-2 py-1 text-sm bg-card"
            >
              {NUTRITION_MODES.map((n) => (
                <option key={n} value={n}>
                  {NUTRITION_MODE_LABEL[n]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-0.5">
              Foco / instruções
            </label>
            <textarea
              value={draft.focusDescription}
              onChange={(e) =>
                setDraft({ ...draft, focusDescription: e.target.value })
              }
              rows={3}
              className="w-full border border-border-strong rounded-lg px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Microciclo (papel de cada dia)
            </label>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map(({ key, label }) => (
                <div key={key} className="text-center">
                  <div className="text-[10px] text-muted-foreground mb-0.5">
                    {label}
                  </div>
                  <select
                    value={draft.microcycle[key]}
                    onChange={(e) =>
                      updateMicrocycleDay(key, e.target.value as DayRole)
                    }
                    className="w-full border border-border-strong rounded text-[10px] px-0.5 py-0.5 bg-card"
                  >
                    {DAY_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {DAY_ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={save}
              disabled={isPending}
              className="bg-primary text-primary-foreground rounded-lg px-3 py-1 text-xs font-medium hover:bg-primary-hover disabled:opacity-50"
            >
              Salvar
            </button>
            <button
              onClick={() => {
                setDraft(phase);
                setEditing(false);
              }}
              className="text-subtle hover:text-muted-foreground text-xs px-2"
            >
              Cancelar
            </button>
            <button
              onClick={restoreDefaults}
              className="text-xs text-muted-foreground hover:text-primary underline ml-auto"
              title="Recarrega microciclo, nutrição e foco do template do ebook (não salva sozinho)"
            >
              Restaurar padrão
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
