"use client";

import { useState } from "react";
import { Check, ChevronLeft, Pencil, Waves } from "lucide-react";
import { ThreadIcon } from "@/lib/event-icons";
import { addEntryAction, createThreadAction } from "@/app/actions";
import { DecisionForm } from "@/components/decision-form";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type Mode = "entry" | "thread" | "decision";

// El único empty state al final del timeline del main (design.md): un mensaje y
// tres CTAs — Entry, Thread o Decisión. Al elegir se muestra solo ese
// formulario ("Decisión" abre su diálogo directo); "Volver" regresa acá.
export function MainComposer({
  topicId,
  threads,
  entries,
}: {
  topicId: string;
  threads: { id: string; title: string; sub: boolean }[];
  entries: { id: string; label: string }[];
}) {
  const [mode, setMode] = useState<Mode | null>(null);

  return (
    <div className="rounded-lg border border-dashed border-border bg-card/50 p-4">
      {mode === null || mode === "decision" ? (
        <Empty className="p-2">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Waves className="text-river" />
            </EmptyMedia>
            <EmptyTitle>¿Cómo sigue esta historia?</EmptyTitle>
            <EmptyDescription>
              Todo queda en el timeline: una entry en el main, un thread para
              un debate aparte, o una decisión con sus fuentes.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setMode("entry")}>
                <Pencil className="text-add" /> Entry
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMode("thread")}>
                <ThreadIcon className="text-merge" /> Thread
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMode("decision")}>
                <Check /> Decisión
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      ) : (
        <div>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={() => setMode(null)}
          >
            <ChevronLeft /> Volver
          </Button>

          {mode === "entry" && (
            <form
              action={async (formData) => {
                await addEntryAction(formData);
                setMode(null);
              }}
              className="mt-3"
            >
              <input type="hidden" name="topic_id" value={topicId} />
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="author_label"
                  className="text-xs text-muted-foreground"
                >
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
                autoFocus
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

          {mode === "thread" && (
            <form action={createThreadAction} className="mt-3">
              <input type="hidden" name="topic_id" value={topicId} />
              <p className="text-sm text-muted-foreground">
                Un debate propio del topic, sin entry que lo origine. Tendrá
                estado y disparador propios. (Para ramificar desde una entry
                puntual, usá &quot;Crear thread&quot; en esa entry.)
              </p>
              <Field className="mt-3">
                <FieldLabel htmlFor="composer-thread-title">
                  Título del thread
                </FieldLabel>
                <Input
                  id="composer-thread-title"
                  name="title"
                  required
                  autoFocus
                  placeholder="El debate que se abre…"
                  className="text-sm"
                />
              </Field>
              <div className="mt-3 flex justify-end">
                <SubmitButton size="sm">
                  <ThreadIcon /> Crear thread
                </SubmitButton>
              </div>
            </form>
          )}
        </div>
      )}

      {/* El CTA de decisión abre el diálogo directo, sin pantalla intermedia */}
      <DecisionForm
        topicId={topicId}
        threads={threads}
        entries={entries}
        open={mode === "decision"}
        onOpenChange={(o) => !o && setMode(null)}
      />
    </div>
  );
}
