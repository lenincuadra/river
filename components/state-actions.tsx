import { archiveAction, reactivateAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Acciones de estado (Fase 3). La UI no permite archivar sin motivo (regla 3):
// el campo es required, y el backend lo valida de nuevo por las dudas.
export function StateActions({
  targetType,
  targetId,
  state,
  archivedReason,
}: {
  targetType: "topic" | "thread";
  targetId: string;
  state: "active" | "snoozed" | "archived";
  archivedReason?: string;
}) {
  if (state === "archived") {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-sm">
        <span className="text-muted-foreground">
          ▣ Archivado{archivedReason && <> · motivo: <b className="text-foreground">{archivedReason}</b></>}
        </span>
        <form action={reactivateAction} className="ml-auto">
          <input type="hidden" name="target_type" value={targetType} />
          <input type="hidden" name="target_id" value={targetId} />
          <Button type="submit" size="sm" variant="outline">
            ▶ Reactivar
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-start gap-3">
      {state === "snoozed" && (
        <form action={reactivateAction}>
          <input type="hidden" name="target_type" value={targetType} />
          <input type="hidden" name="target_id" value={targetId} />
          <Button type="submit" size="sm" variant="outline">
            ▶ Reactivar
          </Button>
        </form>
      )}
      <details className="min-w-0">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
          ▣ Archivar…
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
  );
}
