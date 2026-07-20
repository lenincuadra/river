import { shipAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Shipped (Fase 5): estampa la versión del PRODUCTO en un topic (regla 6).
// Es un evento, no un estado: no cambia si el topic está active/snoozed. Se
// puede shippear más de una vez (v2.0, luego v3.0): cada uno deja su evento.
export function ShipAction({ topicId }: { topicId: string }) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
        ★ Marcar como Shipped…
      </summary>
      <form action={shipAction} className="mt-2 flex max-w-xs items-center gap-2">
        <input type="hidden" name="topic_id" value={topicId} />
        <Input
          name="version"
          required
          placeholder="Versión del producto (ej: v2.0)"
          className="h-8 text-sm"
        />
        <Button type="submit" size="sm" variant="outline">
          Shipped
        </Button>
      </form>
      <p className="mt-1.5 max-w-md text-xs text-muted-foreground">
        Estampa la versión del producto y no cambia el estado: un topic puede
        seguir activo o dormido después de shippear.
      </p>
    </details>
  );
}
