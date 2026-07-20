import Link from "next/link";
import { Play, Moon, Archive } from "lucide-react";
import { resolveTriggerAction } from "@/app/actions";
import { TriggerFields } from "@/components/trigger-fields";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Trigger } from "@/lib/triggers";

// Las tres salidas de Reentry (vocabulario oficial): reactivar, re-dormir
// (nuevo disparador) o archivar (motivo obligatorio). El trigger resuelto
// pasa a `fired` sea cual sea la salida elegida (db/mutations.ts).
export function ResolveControls({ trigger }: { trigger: Trigger }) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <form action={resolveTriggerAction}>
        <input type="hidden" name="trigger_id" value={trigger.id} />
        <input type="hidden" name="action" value="reactivate" />
        <Button type="submit" size="sm">
          <Play /> Reactivar
        </Button>
      </form>

      <details className="min-w-0">
        <summary className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold">
          <Moon className="size-3.5" /> Volver a dormir
        </summary>
        <form
          action={resolveTriggerAction}
          className="mt-2 flex w-full max-w-sm flex-col gap-2"
        >
          <input type="hidden" name="trigger_id" value={trigger.id} />
          <input type="hidden" name="action" value="resnooze" />
          <TriggerFields />
          <div className="flex justify-end">
            <Button type="submit" size="sm" variant="outline">
              Re-dormir
            </Button>
          </div>
        </form>
      </details>

      <details className="min-w-0">
        <summary className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          <Archive className="size-3.5" /> Archivar
        </summary>
        <form
          action={resolveTriggerAction}
          className="mt-2 flex w-full max-w-sm flex-col gap-2"
        >
          <input type="hidden" name="trigger_id" value={trigger.id} />
          <input type="hidden" name="action" value="archive" />
          <Textarea
            name="reason"
            required
            placeholder="Motivo (obligatorio): dejé de creer en esto porque…"
            className="min-h-14 text-sm"
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
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{breadcrumb}</div>
      <Link href={href} className="mt-0.5 block text-sm font-bold hover:underline">
        {title}
      </Link>
      <p className="mt-2 text-sm text-muted-foreground">
        ¿Esto sigue teniendo sentido hoy?
      </p>
      <div className="mt-3">
        <ResolveControls trigger={trigger} />
      </div>
    </div>
  );
}
