"use client";

import { useState } from "react";
import { Check, GitBranch, Pencil } from "lucide-react";
import { createDecisionAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Registrar una decisión desde la UI: qué se decidió + las fuentes que la
// alimentaron (1..N threads/subthreads y/o entries del main). Los names
// ("title", "text", "topic_id", "source") son los que lee createDecisionAction.
// El estado local solo cuenta las fuentes para habilitar el botón; el backend
// valida que haya al menos una.
export function DecisionForm({
  topicId,
  threads,
  entries,
}: {
  topicId: string;
  threads: { id: string; title: string; sub: boolean }[];
  entries: { id: string; label: string }[];
}) {
  const [count, setCount] = useState(0);

  // Cuenta cuántos checkboxes name="source" están tildados en el form.
  const recount = (form: HTMLFormElement | null) => {
    if (!form) return;
    setCount(form.querySelectorAll('input[name="source"]:checked').length);
  };

  return (
    <details className="mt-4 rounded-lg border border-border bg-card p-4">
      <summary className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold">
        <Check className="size-4" /> Registrar una decisión
      </summary>
      <p className="mt-2 max-w-2xl text-xs text-muted-foreground">
        Qué se resolvió y en qué se apoyó. La decisión es el pensamiento, no la
        ejecución: no cambia el estado ni implica shippear. Citá las fuentes que
        la alimentaron para responder mañana &quot;¿cómo llegamos a esto?&quot;.
      </p>

      <form
        action={createDecisionAction}
        onChange={(e) => recount(e.currentTarget)}
        className="mt-3 flex flex-col gap-3"
      >
        <input type="hidden" name="topic_id" value={topicId} />
        <Input
          name="title"
          required
          placeholder="¿Qué se decidió? (ej: Sistema de temas adaptativo)"
          className="text-sm"
        />
        <Textarea
          name="text"
          placeholder="Detalle (opcional): con qué fundamentos, qué se descarta…"
          className="min-h-16 text-sm"
        />

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Fuentes ({count})
          </div>
          {threads.length === 0 && entries.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Todavía no hay threads ni entries para citar en este topic.
            </p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {threads.map((t) => (
                <label
                  key={`thread:${t.id}`}
                  className={`flex items-center gap-2 text-sm ${t.sub ? "pl-5" : ""}`}
                >
                  <input type="checkbox" name="source" value={`thread:${t.id}`} />
                  <GitBranch className={`text-merge ${t.sub ? "size-3" : "size-3.5"}`} />
                  {t.title}
                </label>
              ))}
              {entries.map((e) => (
                <label
                  key={`entry:${e.id}`}
                  className="flex items-center gap-2 text-sm"
                >
                  <input type="checkbox" name="source" value={`entry:${e.id}`} />
                  <Pencil className="size-3.5 shrink-0 text-add" />
                  <span className="min-w-0 truncate text-muted-foreground">
                    {e.label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={count === 0}>
            Registrar decisión
          </Button>
          {count === 0 && (
            <span className="text-xs text-muted-foreground">
              Citá al menos una fuente.
            </span>
          )}
        </div>
      </form>
    </details>
  );
}
