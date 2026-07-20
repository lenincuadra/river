import { Star } from "lucide-react";
import { shipAction } from "@/app/actions";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";

// Shipped (Fase 5): estampa la versión del PRODUCTO en un topic (regla 6).
// Es un evento, no un estado: no cambia si el topic está active/snoozed. Se
// puede shippear más de una vez (v2.0, luego v3.0): cada uno deja su evento.
export function ShipAction({ topicId }: { topicId: string }) {
  return (
    <div className="mt-2">
      <FormDialog
        trigger={<Button variant="ghost" size="sm" className="text-muted-foreground" />}
        triggerLabel={
          <>
            <Star /> Marcar como Shipped…
          </>
        }
        title="Marcar como Shipped"
        description="«Esto se concretó.» Estampa la versión del producto y no cambia el estado: el topic puede seguir activo o dormido después."
        submitLabel={
          <>
            <Star /> Shipped
          </>
        }
        action={shipAction}
      >
        <input type="hidden" name="topic_id" value={topicId} />
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
    </div>
  );
}
