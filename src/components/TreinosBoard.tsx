"use client";

import { useState, useTransition } from "react";
import {
  createTemplate,
  deleteTemplate,
  logWorkout,
  deleteWorkout,
  type Exercise,
  type Template,
  type Workout,
  type WorkoutCategory,
} from "@/app/actions-treinos";
import {
  WORKOUT_CATEGORIES,
  WORKOUT_CATEGORY_COLOR,
  WORKOUT_CATEGORY_LABEL,
} from "@/lib/workout-categories";
import { formatDayShortBR, getTodayKey } from "@/lib/dates";

type Tab = "log" | "templates";

interface Props {
  templates: Template[];
  workouts: Workout[];
}

function emptyExercises(): Exercise[] {
  return [{ name: "", prescription: "" }];
}

export default function TreinosBoard({ templates, workouts }: Props) {
  const today = getTodayKey();
  const [tab, setTab] = useState<Tab>("log");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Log form
  const [logOpen, setLogOpen] = useState(false);
  const [logDate, setLogDate] = useState(today);
  const [logCat, setLogCat] = useState<WorkoutCategory>("forca");
  const [logTemplateId, setLogTemplateId] = useState<string>("");
  const [logName, setLogName] = useState("");
  const [logExercises, setLogExercises] = useState<Exercise[]>(emptyExercises());
  const [logRpe, setLogRpe] = useState<string>("");
  const [logDuration, setLogDuration] = useState<string>("");
  const [logNotes, setLogNotes] = useState("");

  // Template form
  const [tplOpen, setTplOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplCat, setTplCat] = useState<WorkoutCategory>("forca");
  const [tplDesc, setTplDesc] = useState("");
  const [tplExercises, setTplExercises] = useState<Exercise[]>(emptyExercises());

  function applyTemplate(id: string) {
    setLogTemplateId(id);
    const t = templates.find((x) => x._id === id);
    if (t) {
      setLogName(t.name);
      setLogCat(t.category);
      setLogExercises(
        t.exercises.length > 0
          ? t.exercises.map((e) => ({ ...e }))
          : emptyExercises()
      );
    }
  }

  function resetLog() {
    setLogDate(today);
    setLogCat("forca");
    setLogTemplateId("");
    setLogName("");
    setLogExercises(emptyExercises());
    setLogRpe("");
    setLogDuration("");
    setLogNotes("");
  }

  function resetTpl() {
    setTplName("");
    setTplCat("forca");
    setTplDesc("");
    setTplExercises(emptyExercises());
  }

  function handleLog() {
    setError("");
    const rpe = logRpe.trim() ? parseFloat(logRpe) : null;
    const dur = logDuration.trim() ? parseInt(logDuration, 10) : null;
    if (rpe != null && (isNaN(rpe) || rpe < 1 || rpe > 10)) {
      setError("RPE entre 1 e 10");
      return;
    }
    if (dur != null && (isNaN(dur) || dur < 0)) {
      setError("Duração inválida");
      return;
    }
    startTransition(async () => {
      const r = await logWorkout({
        date: logDate,
        category: logCat,
        templateId: logTemplateId || null,
        name: logName,
        exercises: logExercises,
        rpe,
        durationMin: dur,
        notes: logNotes,
      });
      if (r.error) setError(r.error);
      else {
        resetLog();
        setLogOpen(false);
      }
    });
  }

  function handleTpl() {
    setError("");
    startTransition(async () => {
      const r = await createTemplate({
        name: tplName,
        category: tplCat,
        description: tplDesc,
        exercises: tplExercises,
      });
      if (r.error) setError(r.error);
      else {
        resetTpl();
        setTplOpen(false);
      }
    });
  }

  function handleDeleteTemplate(id: string) {
    setError("");
    startTransition(async () => {
      const r = await deleteTemplate(id);
      if (r.error) setError(r.error);
    });
  }

  function handleDeleteWorkout(id: string) {
    setError("");
    startTransition(async () => {
      const r = await deleteWorkout(id);
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

      <div className="bg-card rounded-lg shadow p-1 flex gap-1">
        <button
          onClick={() => setTab("log")}
          className={`flex-1 py-2 rounded-md text-sm font-medium ${
            tab === "log"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-background"
          }`}
        >
          Diário
        </button>
        <button
          onClick={() => setTab("templates")}
          className={`flex-1 py-2 rounded-md text-sm font-medium ${
            tab === "templates"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-background"
          }`}
        >
          Templates
        </button>
      </div>

      {tab === "log" && (
        <div className="space-y-3">
          <div className="bg-card rounded-lg shadow p-4">
            <div className="flex justify-between items-baseline mb-3">
              <h3 className="font-semibold text-foreground">
                Registrar treino
              </h3>
              {!logOpen && (
                <button
                  onClick={() => setLogOpen(true)}
                  className="text-sm text-primary hover:text-primary-hover font-medium"
                >
                  + Novo
                </button>
              )}
            </div>

            {logOpen && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-0.5">
                      Data
                    </label>
                    <input
                      type="date"
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-0.5">
                      Categoria
                    </label>
                    <select
                      value={logCat}
                      onChange={(e) =>
                        setLogCat(e.target.value as WorkoutCategory)
                      }
                      className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm bg-card"
                    >
                      {WORKOUT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {WORKOUT_CATEGORY_LABEL[c]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {templates.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground block mb-0.5">
                      Usar template
                    </label>
                    <select
                      value={logTemplateId}
                      onChange={(e) => applyTemplate(e.target.value)}
                      className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm bg-card"
                    >
                      <option value="">— em branco —</option>
                      {templates.map((t) => (
                        <option key={t._id} value={t._id}>
                          {WORKOUT_CATEGORY_LABEL[t.category]} — {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <input
                  type="text"
                  value={logName}
                  onChange={(e) => setLogName(e.target.value)}
                  placeholder="Nome do treino"
                  className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm"
                />

                <ExerciseListEditor
                  exercises={logExercises}
                  setExercises={setLogExercises}
                />

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-0.5">
                      RPE (1-10)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={logRpe}
                      onChange={(e) => setLogRpe(e.target.value)}
                      className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-0.5">
                      Duração (min)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={logDuration}
                      onChange={(e) => setLogDuration(e.target.value)}
                      className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>

                <textarea
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="Observações"
                  rows={2}
                  className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm"
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleLog}
                    disabled={isPending || !logName}
                    className="bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => {
                      setLogOpen(false);
                      resetLog();
                      setError("");
                    }}
                    className="text-subtle hover:text-muted-foreground text-sm px-2"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-card rounded-lg shadow p-4">
            <h3 className="font-semibold text-foreground mb-3">Histórico</h3>
            {workouts.length === 0 ? (
              <p className="text-sm text-subtle">Nenhum treino registrado.</p>
            ) : (
              <div className="space-y-3">
                {workouts.map((w) => (
                  <div
                    key={w._id}
                    className="border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">
                            {w.name}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${WORKOUT_CATEGORY_COLOR[w.category]}`}
                          >
                            {WORKOUT_CATEGORY_LABEL[w.category]}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatDayShortBR(w.date)}
                          {w.rpe != null && ` · RPE ${w.rpe}`}
                          {w.durationMin != null && ` · ${w.durationMin}min`}
                        </div>
                        {w.exercises.length > 0 && (
                          <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                            {w.exercises.map((e, i) => (
                              <li key={i}>
                                <span className="font-medium">{e.name}</span>
                                {e.prescription && (
                                  <span className="text-subtle ml-1">
                                    — {e.prescription}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        {w.notes && (
                          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                            {w.notes}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteWorkout(w._id)}
                        disabled={isPending}
                        className="text-subtle hover:text-destructive text-lg font-bold px-1"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "templates" && (
        <div className="space-y-3">
          <div className="bg-card rounded-lg shadow p-4">
            <div className="flex justify-between items-baseline mb-3">
              <h3 className="font-semibold text-foreground">Templates</h3>
              {!tplOpen && (
                <button
                  onClick={() => setTplOpen(true)}
                  className="text-sm text-primary hover:text-primary-hover font-medium"
                >
                  + Novo
                </button>
              )}
            </div>

            {tplOpen && (
              <div className="space-y-2 border-b border-border pb-4 mb-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tplName}
                    onChange={(e) => setTplName(e.target.value)}
                    placeholder="Nome (ex.: Hangboard básico)"
                    className="flex-1 border border-border-strong rounded-lg px-2 py-1.5 text-sm"
                  />
                  <select
                    value={tplCat}
                    onChange={(e) =>
                      setTplCat(e.target.value as WorkoutCategory)
                    }
                    className="border border-border-strong rounded-lg px-2 py-1.5 text-sm bg-card"
                  >
                    {WORKOUT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {WORKOUT_CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={tplDesc}
                  onChange={(e) => setTplDesc(e.target.value)}
                  placeholder="Descrição / instruções gerais"
                  rows={2}
                  className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm"
                />
                <ExerciseListEditor
                  exercises={tplExercises}
                  setExercises={setTplExercises}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleTpl}
                    disabled={isPending || !tplName}
                    className="bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
                  >
                    Salvar template
                  </button>
                  <button
                    onClick={() => {
                      setTplOpen(false);
                      resetTpl();
                      setError("");
                    }}
                    className="text-subtle hover:text-muted-foreground text-sm px-2"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {templates.length === 0 ? (
              <p className="text-sm text-subtle">
                Nenhum template ainda. Crie planos reutilizáveis (técnica,
                mobilidade, força...).
              </p>
            ) : (
              <div className="space-y-2">
                {templates.map((t) => (
                  <div
                    key={t._id}
                    className="border border-border rounded-lg p-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">
                            {t.name}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${WORKOUT_CATEGORY_COLOR[t.category]}`}
                          >
                            {WORKOUT_CATEGORY_LABEL[t.category]}
                          </span>
                        </div>
                        {t.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
                            {t.description}
                          </p>
                        )}
                        {t.exercises.length > 0 && (
                          <ul className="text-xs text-muted-foreground mt-2 space-y-0.5">
                            {t.exercises.map((e, i) => (
                              <li key={i}>
                                <span className="font-medium">{e.name}</span>
                                {e.prescription && (
                                  <span className="text-subtle ml-1">
                                    — {e.prescription}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteTemplate(t._id)}
                        disabled={isPending}
                        className="text-subtle hover:text-destructive text-lg font-bold px-1"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseListEditor({
  exercises,
  setExercises,
}: {
  exercises: Exercise[];
  setExercises: (next: Exercise[]) => void;
}) {
  function update(i: number, patch: Partial<Exercise>) {
    setExercises(
      exercises.map((e, idx) => (idx === i ? { ...e, ...patch } : e))
    );
  }
  function add() {
    setExercises([...exercises, { name: "", prescription: "" }]);
  }
  function remove(i: number) {
    setExercises(
      exercises.length === 1
        ? [{ name: "", prescription: "" }]
        : exercises.filter((_, idx) => idx !== i)
    );
  }
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground block">Exercícios</label>
      {exercises.map((e, i) => (
        <div key={i} className="flex gap-1.5">
          <input
            type="text"
            value={e.name}
            onChange={(ev) => update(i, { name: ev.target.value })}
            placeholder="Exercício"
            className="w-1/3 border border-border-strong rounded-lg px-2 py-1.5 text-sm"
          />
          <input
            type="text"
            value={e.prescription}
            onChange={(ev) => update(i, { prescription: ev.target.value })}
            placeholder="3x5, 70%RM, 1min rest..."
            className="flex-1 border border-border-strong rounded-lg px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-subtle hover:text-destructive text-lg font-bold px-1"
          >
            &times;
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-xs text-primary hover:text-primary-hover font-medium"
      >
        + Adicionar exercício
      </button>
    </div>
  );
}
