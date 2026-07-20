"use client";

import { useState } from "react";
import { Merge } from "lucide-react";
import { convergeAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Item = { id: string; title: string };

// Convergence (Fase 5): elegir 2+ topics de origen y un destino (nuevo o
// existente). Los names de los campos ("source_topic_id", "dest_kind",
// "dest_title", "dest_topic_id") son los que lee convergeAction. El estado
// local solo sirve para la UX (contar, alternar destino, habilitar el botón);
// la validación real vive en el backend.
export function ConvergePanel({ topics }: { topics: Item[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [destKind, setDestKind] = useState<"new" | "existing">("new");
  const [destTopicId, setDestTopicId] = useState("");

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // El destino existente no puede ser también uno de los orígenes.
  const destCandidates = topics.filter((t) => !selected.has(t.id));
  const enoughSources = selected.size >= 2;
  const destOk =
    destKind === "new" ? true : !!destTopicId && !selected.has(destTopicId);

  return (
    <details className="mt-8 rounded-lg border border-border bg-card p-4">
      <summary className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-merge">
        <Merge className="size-4" /> Convergir dos o más topics
      </summary>
      <p className="mt-2 max-w-2xl text-xs text-muted-foreground">
        Cuando dos temas resultan ser el mismo, se unen en uno. Los orígenes se
        archivan con un motivo automático y queda un link de ida y vuelta: desde
        cada origen se llega al destino, y desde el destino a sus orígenes.
      </p>

      <form action={convergeAction} className="mt-4 flex flex-col gap-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Orígenes ({selected.size})
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {topics.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="source_topic_id"
                  value={t.id}
                  checked={selected.has(t.id)}
                  onChange={() => toggle(t.id)}
                />
                {t.title}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Destino
          </div>
          <div className="mt-2 flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="dest_kind"
                value="new"
                checked={destKind === "new"}
                onChange={() => setDestKind("new")}
              />
              Crear un topic nuevo
            </label>
            {destKind === "new" && (
              <Input
                name="dest_title"
                placeholder="Título del topic destino…"
                className="h-8 max-w-md text-sm"
              />
            )}
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="dest_kind"
                value="existing"
                checked={destKind === "existing"}
                onChange={() => setDestKind("existing")}
              />
              Usar un topic existente
            </label>
            {destKind === "existing" && (
              <select
                name="dest_topic_id"
                value={destTopicId}
                onChange={(e) => setDestTopicId(e.target.value)}
                className="h-8 max-w-md rounded-md border border-input bg-card px-2 text-sm"
              >
                <option value="">Elegir topic…</option>
                {destCandidates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" disabled={!enoughSources || !destOk}>
            Convergir
          </Button>
          {!enoughSources && (
            <span className="text-xs text-muted-foreground">
              Elegí al menos dos orígenes.
            </span>
          )}
        </div>
      </form>
    </details>
  );
}
