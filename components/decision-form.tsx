"use client";

import { useState } from "react";
import { Check, GitBranch, Pencil } from "lucide-react";
import { createDecisionAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/submit-button";

// Registrar una decisión desde la UI: qué se decidió + las fuentes que la
// alimentaron (1..N threads/subthreads y/o entries del main). Los names
// ("title", "text", "topic_id", "source") son los que lee createDecisionAction.
// Las fuentes elegidas viajan como inputs hidden; el backend valida que haya
// al menos una.
export function DecisionForm({
  topicId,
  threads,
  entries,
  open: controlledOpen,
  onOpenChange,
}: {
  topicId: string;
  threads: { id: string; title: string; sub: boolean }[];
  entries: { id: string; label: string }[];
  // Controlado desde afuera (ej: CTA del composer) o con trigger propio.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (value: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(value);
      else next.delete(value);
      return next;
    });

  const reset = () => setSelected(new Set());
  const noSources = threads.length === 0 && entries.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      {controlledOpen === undefined && (
        <DialogTrigger render={<Button size="sm" />}>
          <Check /> Registrar decisión
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar una decisión</DialogTitle>
          <DialogDescription>
            Qué se resolvió y en qué se apoyó. La decisión es el pensamiento, no
            la ejecución: no cambia el estado ni implica shippear. Citá las
            fuentes para responder mañana «¿cómo llegamos a esto?».
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createDecisionAction(formData);
            setOpen(false);
            reset();
          }}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="topic_id" value={topicId} />
          {[...selected].map((v) => (
            <input key={v} type="hidden" name="source" value={v} />
          ))}

          <Field>
            <FieldLabel htmlFor="decision-title">¿Qué se decidió?</FieldLabel>
            <Input
              id="decision-title"
              name="title"
              required
              autoFocus
              placeholder="ej: Sistema de temas adaptativo"
              className="text-sm"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="decision-text">Detalle (opcional)</FieldLabel>
            <Textarea
              id="decision-text"
              name="text"
              placeholder="Con qué fundamentos, qué se descarta…"
              className="min-h-16 text-sm"
            />
          </Field>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fuentes ({selected.size})
            </div>
            {noSources ? (
              <FieldDescription className="mt-2">
                Todavía no hay threads ni entries para citar en este topic.
              </FieldDescription>
            ) : (
              <div className="mt-2 flex max-h-56 flex-col gap-2.5 overflow-y-auto pr-1">
                {threads.map((t) => {
                  const value = `thread:${t.id}`;
                  return (
                    <Label
                      key={value}
                      className={`font-normal ${t.sub ? "pl-5" : ""}`}
                    >
                      <Checkbox
                        checked={selected.has(value)}
                        onCheckedChange={(checked) => toggle(value, !!checked)}
                      />
                      <GitBranch
                        className={`text-merge ${t.sub ? "size-3" : "size-3.5"}`}
                      />
                      {t.title}
                    </Label>
                  );
                })}
                {entries.map((e) => {
                  const value = `entry:${e.id}`;
                  return (
                    <Label key={value} className="font-normal">
                      <Checkbox
                        checked={selected.has(value)}
                        onCheckedChange={(checked) => toggle(value, !!checked)}
                      />
                      <Pencil className="size-3.5 shrink-0 text-add" />
                      <span className="min-w-0 truncate text-muted-foreground">
                        {e.label}
                      </span>
                    </Label>
                  );
                })}
              </div>
            )}
            {selected.size === 0 && !noSources && (
              <FieldDescription className="mt-2">
                Citá al menos una fuente.
              </FieldDescription>
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>
              Cancelar
            </DialogClose>
            <SubmitButton disabled={selected.size === 0}>
              Registrar decisión
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
