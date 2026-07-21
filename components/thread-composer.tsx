"use client";

import { useState } from "react";
import { ChevronLeft, Pencil, Waves } from "lucide-react";
import { ThreadIcon } from "@/lib/event-icons";
import { addThreadEntryAction, createThreadAction } from "@/app/actions";
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

type Mode = "entry" | "subthread";

// El único empty state al final del timeline de un thread (design.md): la misma
// lógica que el compositor del main, con lo que puede pasar acá — una entry,
// o un subthread si el thread todavía puede ramificarse (regla 5).
export function ThreadComposer({
  topicId,
  threadId,
  threadTitle,
  canBranch,
}: {
  topicId: string;
  threadId: string;
  threadTitle: string;
  // false en subthreads: nivel máximo de profundidad (regla 5)
  canBranch: boolean;
}) {
  const [mode, setMode] = useState<Mode | null>(null);

  return (
    <div className="rounded-lg border border-dashed border-border bg-card/50 p-4">
      {mode === null ? (
        <Empty className="p-2">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Waves className="text-river" />
            </EmptyMedia>
            <EmptyTitle>¿Cómo sigue este debate?</EmptyTitle>
            <EmptyDescription>
              {canBranch
                ? "Una entry acá, o un subthread cuando dos posturas ya no puedan convivir."
                : "Una entry más. Este es un subthread: nivel máximo de profundidad, acá no se ramifica."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setMode("entry")}>
                <Pencil className="text-add" /> Entry
              </Button>
              {canBranch && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode("subthread")}
                >
                  <ThreadIcon className="text-merge" /> Subthread
                </Button>
              )}
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
                await addThreadEntryAction(formData);
                setMode(null);
              }}
              className="mt-3"
            >
              <input type="hidden" name="thread_id" value={threadId} />
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
                placeholder={`Escribir una entry en ${threadTitle}…`}
                className="mt-3 min-h-20 text-sm"
              />
              <div className="mt-3 flex justify-end">
                <SubmitButton size="sm">
                  <Pencil /> Agregar entry
                </SubmitButton>
              </div>
            </form>
          )}

          {mode === "subthread" && (
            <form action={createThreadAction} className="mt-3">
              <input type="hidden" name="topic_id" value={topicId} />
              <input type="hidden" name="parent_thread_id" value={threadId} />
              <p className="text-sm text-muted-foreground">
                Nivel máximo de profundidad (regla 5): topic → thread →
                subthread. Acá se separa una postura que ya no convive en el
                thread.
              </p>
              <Field className="mt-3">
                <FieldLabel htmlFor="composer-subthread-title">
                  Título del subthread
                </FieldLabel>
                <Input
                  id="composer-subthread-title"
                  name="title"
                  required
                  autoFocus
                  placeholder="La postura que se separa…"
                  className="text-sm"
                />
              </Field>
              <div className="mt-3 flex justify-end">
                <SubmitButton size="sm">
                  <ThreadIcon /> Crear subthread
                </SubmitButton>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
