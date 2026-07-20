"use client";

import { useState } from "react";
import { Ellipsis, Pencil } from "lucide-react";
import { ThreadIcon } from "@/lib/event-icons";
import { createThreadAction, editEntryAction } from "@/app/actions";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// Acciones de una entry, dentro de su card y sin líneas divisorias (UI.md).
// En pantallas anchas van inline; si hay más de una y el espacio se achica,
// colapsan a un menú ⋯. Los diálogos viven fuera del menú (controlados) para
// sobrevivir a su cierre.
export function EntryActions({
  entry,
  authorLabel,
  // Con topicId la entry vive en el main: habilita "Crear thread" desde ella.
  topicId,
}: {
  entry: { id: string; body: string };
  authorLabel: string;
  topicId?: string;
}) {
  const [dialog, setDialog] = useState<null | "edit" | "thread">(null);
  const close = (open: boolean) => !open && setDialog(null);
  const canBranch = !!topicId;

  return (
    <>
      <div className="mt-2 flex items-center justify-end gap-1">
        {canBranch && (
          <>
            <span className="max-sm:hidden">
              <Button
                variant="ghost"
                size="xs"
                className="text-merge hover:text-merge"
                onClick={() => setDialog("thread")}
              >
                <ThreadIcon /> Crear thread
              </Button>
            </span>
            <span className="max-sm:hidden">
              <Button
                variant="ghost"
                size="xs"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setDialog("edit")}
              >
                <Pencil /> Editar
              </Button>
            </span>
            <span className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground"
                      aria-label="Acciones de la entry"
                    />
                  }
                >
                  <Ellipsis />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setDialog("thread")}>
                    <ThreadIcon className="text-merge" /> Crear thread
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDialog("edit")}>
                    <Pencil /> Editar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          </>
        )}
        {!canBranch && (
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setDialog("edit")}
          >
            <Pencil /> Editar
          </Button>
        )}
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
          description={`Un debate que se ramifica desde la entry de ${authorLabel}. Tendrá estado y disparador propios, independientes del topic.`}
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
    </>
  );
}
