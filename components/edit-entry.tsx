"use client";

import { Pencil } from "lucide-react";
import { editEntryAction } from "@/app/actions";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Editar una entry (regla 2): siempre permitido, queda marcada "editado" con
// fecha. Si una decisión la cita como fuente, el backend preserva el texto
// anterior en entry_revisions.
export function EditEntryDialog({
  entry,
}: {
  entry: { id: string; body: string };
}) {
  return (
    <FormDialog
      trigger={
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground hover:text-foreground"
        />
      }
      triggerLabel={
        <>
          <Pencil /> Editar
        </>
      }
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
  );
}
