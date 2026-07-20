"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Los tres tipos de disparador del vocabulario oficial: fecha, condición o
// backlog (sin disparador, solo revisión manual). Vive dentro de un <form>
// propio en cada uso (snooze, re-dormir en Reentry): los names "kind",
// "fire_date" y "condition_text" son los que leen las server actions.
export function TriggerFields({
  defaultKind = "date",
}: {
  defaultKind?: "date" | "condition" | "backlog";
}) {
  const [kind, setKind] = useState(defaultKind);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-4 text-xs text-muted-foreground">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="kind"
            value="date"
            checked={kind === "date"}
            onChange={() => setKind("date")}
          />
          Fecha
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="kind"
            value="condition"
            checked={kind === "condition"}
            onChange={() => setKind("condition")}
          />
          Condición
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="kind"
            value="backlog"
            checked={kind === "backlog"}
            onChange={() => setKind("backlog")}
          />
          Backlog
        </label>
      </div>
      {kind === "date" && (
        <Input type="date" name="fire_date" required className="h-8 text-sm" />
      )}
      {kind === "condition" && (
        <Textarea
          name="condition_text"
          required
          placeholder='¿Qué lo despierta? (ej: "si llegamos a 10k usuarios")'
          className="min-h-14 text-sm"
        />
      )}
      {kind === "backlog" && (
        <p className="text-xs text-muted-foreground">
          Sin disparador: queda en el radar, a la espera de una revisión manual.
        </p>
      )}
    </div>
  );
}
