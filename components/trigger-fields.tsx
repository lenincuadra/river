"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FieldDescription } from "@/components/ui/field";

type Kind = "date" | "condition" | "backlog";

// Los tres tipos de disparador del vocabulario oficial: fecha, condición o
// backlog (sin disparador, solo revisión manual). Vive dentro de un <form>
// propio en cada uso (snooze, re-dormir en Reentry): los names "kind",
// "fire_date" y "condition_text" son los que leen las server actions.
export function TriggerFields({ defaultKind = "date" }: { defaultKind?: Kind }) {
  const [kind, setKind] = useState<Kind>(defaultKind);

  return (
    <div className="flex flex-col gap-3">
      {/* El valor elegido viaja en este hidden: el RadioGroup es solo la UI. */}
      <input type="hidden" name="kind" value={kind} />
      <RadioGroup
        value={kind}
        onValueChange={(value) => setKind(value as Kind)}
        className="flex flex-wrap gap-x-5 gap-y-2"
      >
        <Label className="font-normal">
          <RadioGroupItem value="date" /> Fecha
        </Label>
        <Label className="font-normal">
          <RadioGroupItem value="condition" /> Condición
        </Label>
        <Label className="font-normal">
          <RadioGroupItem value="backlog" /> Backlog
        </Label>
      </RadioGroup>
      {kind === "date" && (
        <Input type="date" name="fire_date" required className="text-sm" />
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
        <FieldDescription>
          Sin disparador: queda en el radar, a la espera de una revisión manual.
        </FieldDescription>
      )}
    </div>
  );
}
