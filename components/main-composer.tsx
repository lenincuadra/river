"use client";

import { useState } from "react";
import { Check, GitBranch, Pencil } from "lucide-react";
import { addEntryAction, createThreadAction } from "@/app/actions";
import { DecisionForm } from "@/components/decision-form";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Field, FieldLabel } from "@/components/ui/field";

type Mode = "entry" | "decision" | "thread";

// El único empty state al final del timeline del main: lo próximo que le pasa
// a la historia es UNA cosa — escribir una entry, registrar una decisión o
// abrir un thread. Un selector, un contenido a la vez (UI.md).
export function MainComposer({
  topicId,
  threads,
  entries,
}: {
  topicId: string;
  threads: { id: string; title: string; sub: boolean }[];
  entries: { id: string; label: string }[];
}) {
  const [mode, setMode] = useState<Mode>("entry");

  const tab = (m: Mode, icon: React.ReactNode, label: string) => (
    <Button
      type="button"
      size="xs"
      variant={mode === m ? "secondary" : "ghost"}
      className={mode === m ? "" : "text-muted-foreground"}
      onClick={() => setMode(m)}
    >
      {icon} {label}
    </Button>
  );

  return (
    <div className="rounded-lg border border-dashed border-border bg-card/50 p-4">
      <div className="flex flex-wrap items-center gap-1">
        {tab("entry", <Pencil />, "Entry")}
        {tab("decision", <Check />, "Decisión")}
        {tab("thread", <GitBranch />, "Thread")}
      </div>

      {mode === "entry" && (
        <form action={addEntryAction} className="mt-3">
          <input type="hidden" name="topic_id" value={topicId} />
          <div className="flex items-center gap-2">
            <Label htmlFor="author_label" className="text-xs text-muted-foreground">
              Autor
            </Label>
            <Input
              id="author_label"
              name="author_label"
              defaultValue="Yo"
              className="h-7 w-32 text-sm"
            />
            <span className="text-xs text-muted-foreground">
              (editalo para citar a alguien: &quot;Martina&quot;)
            </span>
          </div>
          <Textarea
            name="body"
            required
            placeholder="Escribir una entry en el main…"
            className="mt-3 min-h-20 text-sm"
          />
          <div className="mt-3 flex justify-end">
            <SubmitButton size="sm">
              <Pencil /> Agregar entry
            </SubmitButton>
          </div>
        </form>
      )}

      {mode === "decision" && (
        <div className="mt-3">
          <p className="text-sm text-muted-foreground">
            La decisión es el pensamiento (qué se resolvió y con qué
            fundamentos), no la ejecución. Queda acá en el main y linkea sus
            fuentes.
          </p>
          <div className="mt-3">
            <DecisionForm topicId={topicId} threads={threads} entries={entries} />
          </div>
        </div>
      )}

      {mode === "thread" && (
        <form action={createThreadAction} className="mt-3">
          <input type="hidden" name="topic_id" value={topicId} />
          <p className="text-sm text-muted-foreground">
            Un debate propio del topic, sin entry que lo origine. Tendrá estado
            y disparador propios. (Para ramificar desde una entry puntual, usá
            &quot;Crear thread&quot; en esa entry.)
          </p>
          <Field className="mt-3">
            <FieldLabel htmlFor="composer-thread-title">
              Título del thread
            </FieldLabel>
            <Input
              id="composer-thread-title"
              name="title"
              required
              placeholder="El debate que se abre…"
              className="text-sm"
            />
          </Field>
          <div className="mt-3 flex justify-end">
            <SubmitButton size="sm">
              <GitBranch /> Crear thread
            </SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
