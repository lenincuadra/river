import Link from "next/link";
import { Play, Moon, Archive } from "lucide-react";
import { resolveTriggerAction } from "@/app/actions";
import { TriggerFields } from "@/components/trigger-fields";
import { FormDialog } from "@/components/form-dialog";
import { SubmitButton } from "@/components/submit-button";
import { fmtDate } from "@/components/feed";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { Trigger } from "@/lib/triggers";

// Las tres salidas de Reentry (vocabulario oficial): reactivar, re-dormir
// (nuevo disparador) o archivar (motivo obligatorio). El trigger resuelto
// pasa a `fired` sea cual sea la salida elegida (db/mutations.ts).
export function ResolveControls({ trigger }: { trigger: Trigger }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={resolveTriggerAction}>
        <input type="hidden" name="trigger_id" value={trigger.id} />
        <input type="hidden" name="action" value="reactivate" />
        <SubmitButton size="sm">
          <Play /> Reactivar
        </SubmitButton>
      </form>

      <FormDialog
        trigger={<Button variant="outline" size="sm" />}
        triggerLabel={
          <>
            <Moon /> Volver a dormir
          </>
        }
        title="Volver a dormir"
        description="Sigue teniendo sentido, pero todavía no es ahora. Elegí el nuevo disparador."
        submitLabel="Re-dormir"
        action={resolveTriggerAction}
      >
        <input type="hidden" name="trigger_id" value={trigger.id} />
        <input type="hidden" name="action" value="resnooze" />
        <TriggerFields />
      </FormDialog>

      <FormDialog
        trigger={
          <Button variant="outline" size="sm" className="text-muted-foreground" />
        }
        triggerLabel={
          <>
            <Archive /> Archivar
          </>
        }
        title="Archivar con motivo"
        description="Dejó de tener sentido. El motivo es obligatorio y queda en el historial."
        submitLabel="Archivar con motivo"
        action={resolveTriggerAction}
      >
        <input type="hidden" name="trigger_id" value={trigger.id} />
        <input type="hidden" name="action" value="archive" />
        <Textarea
          name="reason"
          required
          autoFocus
          placeholder="Motivo (obligatorio): dejé de creer en esto porque…"
          className="min-h-20 text-sm"
        />
      </FormDialog>
    </div>
  );
}

// El momento de Reentry: un disparador se cumple y la app no dice "hacelo",
// pregunta "¿esto sigue teniendo sentido hoy?". Usado en /reentry y /triggers.
export function ReentryItem({
  trigger,
  href,
  title,
  breadcrumb,
}: {
  trigger: Trigger;
  href: string;
  title: string;
  breadcrumb?: string;
}) {
  return (
    <Card>
      <CardContent>
        <div className="text-xs text-muted-foreground">
          {breadcrumb}
          <span className="float-right">
            {fmtDate(trigger.fire_date ?? trigger.created_at)}
          </span>
        </div>
        <Link href={href} className="mt-0.5 block text-sm font-bold hover:underline">
          {title}
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">
          ¿Esto sigue teniendo sentido hoy?
        </p>
        <div className="mt-3 border-t border-border pt-3">
          <ResolveControls trigger={trigger} />
        </div>
      </CardContent>
    </Card>
  );
}
