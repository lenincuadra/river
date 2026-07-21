"use client";

import { useState, type MouseEvent } from "react";
import { Pencil } from "lucide-react";
import { createThreadAction, editEntryAction } from "@/app/actions";
import { ThreadIcon } from "@/lib/event-icons";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import type { entries as entriesTable } from "@/db/schema";

type Entry = typeof entriesTable.$inferSelect;

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

// La card de una entry: header (autor · editado · fecha) + cuerpo + acciones,
// todo adentro (design.md). Editar es la acción por defecto — clic en cualquier
// parte de la card abre el editor, salvo que se clickee un botón o se esté
// seleccionando texto. "Crear thread" (solo en el main) es la acción explícita.
export function EntryCard({
  entry,
  topicId,
}: {
  entry: Entry;
  topicId?: string;
}) {
  const [dialog, setDialog] = useState<null | "edit" | "thread">(null);
  const close = (open: boolean) => !open && setDialog(null);
  const canBranch = !!topicId;

  const onCardClick = (e: MouseEvent<HTMLDivElement>) => {
    if (window.getSelection()?.toString()) return; // no robar una selección
    if ((e.target as HTMLElement).closest("button, a")) return; // acción explícita
    setDialog("edit");
  };

  return (
    <div
      id={`entry-${entry.id}`}
      onClick={onCardClick}
      className="scroll-mt-24 cursor-pointer rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm transition-colors hover:border-border/80 hover:bg-muted/30"
    >
      <div>
        <b>{entry.author_label}</b> escribió
        {entry.edited_at && (
          <span className="text-xs text-muted-foreground"> · editado</span>
        )}
        <span className="float-right text-xs text-muted-foreground">
          {fmtDate(entry.created_at)}
        </span>
      </div>
      <p className="mt-1.5">{entry.body}</p>

      <div className="mt-2 flex items-center justify-end gap-1">
        {canBranch && (
          <Button
            variant="ghost"
            size="xs"
            className="text-merge hover:text-merge"
            onClick={() => setDialog("thread")}
          >
            <ThreadIcon /> Crear thread
          </Button>
        )}
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setDialog("edit")}
        >
          <Pencil /> Editar
        </Button>
      </div>

      <FormDialog
        open={dialog === "edit"}
        onOpenChange={close}
        title="Editar entry"
        description="El texto se actualiza y la entry queda marcada como editada. Si una decisión la cita como fuente, el texto anterior se preserva."
        submitLabel="Guardar"
        action={editEntryAction}
      >
        <input type="hidden" name="entry_id" value={entry.id} />
        <Textarea
          name="body"
          required
          autoFocus
          defaultValue={entry.body}
          className="min-h-24 text-sm"
        />
      </FormDialog>

      {canBranch && (
        <FormDialog
          open={dialog === "thread"}
          onOpenChange={close}
          title="Nuevo thread"
          description={`Un debate que se ramifica desde la entry de ${entry.author_label}. Tendrá estado y disparador propios, independientes del topic.`}
          submitLabel="Crear thread"
          action={createThreadAction}
        >
          <input type="hidden" name="topic_id" value={topicId} />
          <input type="hidden" name="origin_entry_id" value={entry.id} />
          <Field>
            <FieldLabel htmlFor={`thread-title-${entry.id}`}>
              Título del thread
            </FieldLabel>
            <Input
              id={`thread-title-${entry.id}`}
              name="title"
              required
              autoFocus
              placeholder="El debate que se abre acá…"
              className="text-sm"
            />
          </Field>
        </FormDialog>
      )}
    </div>
  );
}
