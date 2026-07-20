import { Archive, Play, Moon } from "lucide-react";
import { archiveAction, reactivateAction, snoozeAction } from "@/app/actions";
import { TriggerFields } from "@/components/trigger-fields";
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
  if (state === "archived") {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-sm">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Archive className="size-3.5" /> Archivado{archivedReason && <> · motivo: <b className="text-foreground">{archivedReason}</b></>}
        </span>
        <form action={reactivateAction} className="ml-auto">
          <input type="hidden" name="target_type" value={targetType} />
          <input type="hidden" name="target_id" value={targetId} />
          <Button type="submit" size="sm" variant="outline">
            <Play /> Reactivar
          </Button>
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
            <input type="hidden" name="target_type" value={targetType} />
            <input type="hidden" name="target_id" value={targetId} />
            <Button type="submit" size="sm" variant="outline">
              <Play /> Reactivar
            </Button>
          </form>
        </div>
      )}

      <div className="flex flex-wrap items-start gap-3">
        {state === "active" && (
          <details className="min-w-0">
            <summary className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <Moon className="size-3.5" /> Snooze…
            </summary>
            <form
              action={snoozeAction}
              className="mt-2 flex w-full max-w-md flex-col gap-2"
            >
              <input type="hidden" name="target_type" value={targetType} />
              <input type="hidden" name="target_id" value={targetId} />
              <TriggerFields />
              <div className="flex justify-end">
                <Button type="submit" size="sm" variant="outline">
                  Snooze
                </Button>
              </div>
            </form>
          </details>
        )}

        <details className="min-w-0">
          <summary className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
            <Archive className="size-3.5" /> Archivar…
          </summary>
          <form
            action={archiveAction}
            className="mt-2 flex w-full max-w-md flex-col gap-2"
          >
            <input type="hidden" name="target_type" value={targetType} />
            <input type="hidden" name="target_id" value={targetId} />
            <Textarea
              name="reason"
              required
              placeholder="Motivo (obligatorio): dejé de creer en esto porque…"
              className="min-h-16 text-sm"
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" variant="outline">
                Archivar con motivo
              </Button>
            </div>
          </form>
        </details>
      </div>
    </div>
  );
}
