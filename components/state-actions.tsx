"use client";

import { useState } from "react";
import { Archive, Moon, Play, Star } from "lucide-react";
import { archiveAction, reactivateAction, snoozeAction, shipAction } from "@/app/actions";
import { TriggerFields } from "@/components/trigger-fields";
import { FormDialog } from "@/components/form-dialog";
import { SubmitButton } from "@/components/submit-button";
import { fmtDate } from "@/components/feed";
import { triggerSummary, type Trigger } from "@/lib/triggers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";

// Todas las acciones del topic/thread en un solo lugar (design.md): inline en
// pantallas anchas; en angostas colapsan a un menú ⋯. Los diálogos viven
// fuera del menú (controlados) para sobrevivir a su cierre. Archivar sin
// motivo es imposible (regla 3); snooze siempre pasa por un disparador;
// Shipped estampa la versión del producto sin cambiar el estado (regla 6).
export function StateActions({
  targetType,
  targetId,
  state,
  archivedReason,
  pendingTrigger,
  canShip = false,
}: {
  targetType: "topic" | "thread";
  targetId: string;
  state: "active" | "snoozed" | "archived";
  archivedReason?: string;
  pendingTrigger?: Trigger;
  canShip?: boolean;
}) {
  const [dialog, setDialog] = useState<null | "snooze" | "archive" | "ship">(null);
  const close = (open: boolean) => !open && setDialog(null);

  const targetInputs = (
    <>
      <input type="hidden" name="target_type" value={targetType} />
      <input type="hidden" name="target_id" value={targetId} />
    </>
  );

  const actions = [
    ...(state === "active"
      ? [{ key: "snooze" as const, icon: <Moon />, label: "Snooze…" }]
      : []),
    ...(state !== "archived"
      ? [{ key: "archive" as const, icon: <Archive />, label: "Archivar…" }]
      : []),
    ...(canShip
      ? [{ key: "ship" as const, icon: <Star />, label: "Marcar como Shipped…" }]
      : []),
  ];

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
      {state === "archived" && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-sm">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Archive className="size-3.5" /> Archivado
            {archivedReason && (
              <>
                {" "}
                · motivo: <b className="text-foreground">{archivedReason}</b>
              </>
            )}
          </span>
          <form action={reactivateAction} className="ml-auto">
            {targetInputs}
            <SubmitButton size="sm" variant="outline">
              <Play /> Reactivar
            </SubmitButton>
          </form>
        </div>
      )}

      {actions.length > 0 && (
        // Botones directos: son pocos y entran (en angosto envuelven). Sin ⋯.
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((a) => (
            <Button
              key={a.key}
              variant="outline"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setDialog(a.key)}
            >
              {a.icon} {a.label}
            </Button>
          ))}
        </div>
      )}

      <FormDialog
        open={dialog === "snooze"}
        onOpenChange={close}
        title="Snoozear"
        description="«Todavía creo en esto, pero no es ahora.» Elegí el disparador que lo va a despertar; va a golpear la puerta solo."
        submitLabel="Snooze"
        action={snoozeAction}
      >
        {targetInputs}
        <TriggerFields />
      </FormDialog>

      <FormDialog
        open={dialog === "archive"}
        onOpenChange={close}
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

      {canShip && (
        <FormDialog
          open={dialog === "ship"}
          onOpenChange={close}
          title="Marcar como Shipped"
          description="«Esto se concretó.» Estampa la versión del producto y no cambia el estado: el topic puede seguir activo o dormido después."
          submitLabel={
            <>
              <Star /> Shipped
            </>
          }
          action={shipAction}
        >
          <input type="hidden" name="topic_id" value={targetId} />
          <Field>
            <FieldLabel htmlFor="ship-version">Versión del producto</FieldLabel>
            <Input
              id="ship-version"
              name="version"
              required
              autoFocus
              placeholder="ej: v2.0"
              className="text-sm"
            />
            <FieldDescription>
              La versión es del producto, no del topic (regla 6).
            </FieldDescription>
          </Field>
        </FormDialog>
      )}
    </div>
  );
}
