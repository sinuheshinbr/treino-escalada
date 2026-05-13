"use client";

import { useState, useTransition } from "react";
import { updateName } from "@/app/actions-profile";

export default function ProfileForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError("");
    setSaved(false);
    startTransition(async () => {
      const r = await updateName(name);
      if (r.error) setError(r.error);
      else setSaved(true);
    });
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-green-50 text-green-700 text-sm p-2 rounded">
          Nome atualizado.
        </div>
      )}
      <label className="text-sm font-medium text-foreground block">Nome</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border border-border-strong rounded-lg px-2 py-1.5 text-sm"
      />
      <button
        onClick={handleSave}
        disabled={isPending || !name.trim() || name.trim() === initialName.trim()}
        className="bg-primary text-primary-foreground rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
      >
        {isPending ? "Salvando..." : "Salvar"}
      </button>
    </div>
  );
}
