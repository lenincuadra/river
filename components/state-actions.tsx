import { Archive, Play, Moon } from "lucide-react";
import { archiveAction, reactivateAction, snoozeAction } from "@/app/actions";
import { TriggerFields } from "@/components/trigger-fields";
import { FormDialog } from "@/components/form-dialog";
import { SubmitButton } from "@/components/submit-button";
import { fmtDate } from "@/components/feed";
import { triggerSummary, type Trigger } from "@/lib/triggers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Acciones de estado (Fases 3 y 4). Archivar sin motivo es imposible
// (regla 3); snooze siempre pasa por un disparador (fecha/condición/backlog).
export function StateActions({
  targetType,
  targetId,
  state,
  archivedReason,
  pendingTrigger,
}: {
  targetType: "topic" | "thread";
  targetId: string;
  state: "active" | "snoozed" | "archived";
  archivedReason?: string;
  pendingTrigger?: Trigger;
}) {
  const targetInputs = (
    <>
      <input type="hidden" name="target_type" value={targetType} />
      <input type="hidden" name="target_id" value={targetId} />
    </>
  );

  if (state === "archived") {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-sm">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Archive className="size-3.5" /> Archivado{archivedReason && <> · motivo: <b className="text-foreground">{archivedReason}</b></>}
        </span>
        <form action={reactivateAction} className="ml-auto">
          {targetInputs}
          <SubmitButton size="sm" variant="outline">
            <Play /> Reactivar
          </SubmitButton>
        </form>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      {state === "snoozed" && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Moon className="size-3.5" /> Snoozed
            {pendingTrigger && <> · {triggerSummary(pendingTrigger, fmtDate)}</>}
          </span>
          <form action={reactivateAction} className="ml-auto">
            {targetInputs}
            <SubmitButton size="sm" variant="outline">
              <Play /> Reactivar
            </SubmitButton>
          </form>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {state === "active" && (
          <FormDialog
            trigger={<Button variant="outline" size="sm" />}
            triggerLabel={
              <>
                <Moon /> Snooze…
              </>
            }
            title="Snoozear"
            description="«Todavía creo en esto, pero no es ahora.» Elegí el disparador que lo va a despertar; va a golpear la puerta solo."
            submitLabel="Snooze"
            action={snoozeAction}
          >
            {targetInputs}
            <TriggerFields />
          </FormDialog>
        )}

        <FormDialog
          trigger={
            <Button variant="outline" size="sm" className="text-muted-foreground" />
          }
          triggerLabel={
            <>
              <Archive /> Archivar…
            </>
          }
          title="Archivar con motivo"
          description="«Dejé de creer en esto, y este es el motivo.» El motivo es obligatorio y queda en el historial. Es reversible: se puede reactivar."
          submitLabel="Archivar con motivo"
          action={archiveAction}
        >
          {targetInputs}
          <Textarea
            name="reason"
            required
            autoFocus
            placeholder="Motivo (obligatorio): dejé de creer en esto porque…"
            className="min-h-20 text-sm"
          />
        </FormDialog>
      </div>
    </div>
  );
}
