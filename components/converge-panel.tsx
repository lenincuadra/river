"use client";

import { useState } from "react";
import { ConvergeIcon } from "@/lib/event-icons";
import { convergeAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FieldDescription } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type Item = { id: string; title: string };

// Convergence (Fase 5): elegir 2+ topics de origen y un destino (nuevo o
// existente). Los names de los campos ("source_topic_id", "dest_kind",
// "dest_title", "dest_topic_id") son los que lee convergeAction. El estado
// local solo sirve para la UX (contar, alternar destino, habilitar el botón);
// la validación real vive en el backend.
export function ConvergePanel({ topics }: { topics: Item[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [destKind, setDestKind] = useState<"new" | "existing">("new");
  const [destTopicId, setDestTopicId] = useState("");

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const reset = () => {
    setSelected(new Set());
    setDestKind("new");
    setDestTopicId("");
  };

  // El destino existente no puede ser también uno de los orígenes.
  const destCandidates = topics.filter((t) => !selected.has(t.id));
  const enoughSources = selected.size >= 2;
  const destOk =
    destKind === "new" ? true : !!destTopicId && !selected.has(destTopicId);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger
        render={<Button variant="ghost" size="sm" className="text-merge" />}
      >
        <ConvergeIcon /> Convergir
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convergir dos o más topics</DialogTitle>
          <DialogDescription>
            Cuando dos temas resultan ser el mismo, se unen en uno. Los orígenes
            se archivan con un motivo automático y queda un link de ida y
            vuelta: desde cada origen se llega al destino, y desde el destino a
            sus orígenes.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await convergeAction(formData);
            setOpen(false);
            reset();
          }}
          className="flex flex-col gap-5"
        >
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="source_topic_id" value={id} />
          ))}
          <input type="hidden" name="dest_kind" value={destKind} />
          {destKind === "existing" && (
            <input type="hidden" name="dest_topic_id" value={destTopicId} />
          )}

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Orígenes ({selected.size})
            </div>
            <div className="mt-2 flex max-h-48 flex-col gap-2.5 overflow-y-auto pr-1">
              {topics.map((t) => (
                <Label key={t.id} className="font-normal">
                  <Checkbox
                    checked={selected.has(t.id)}
                    onCheckedChange={(checked) => toggle(t.id, !!checked)}
                  />
                  {t.title}
                </Label>
              ))}
            </div>
            {!enoughSources && (
              <FieldDescription className="mt-2">
                Elegí al menos dos orígenes.
              </FieldDescription>
            )}
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Destino
            </div>
            <RadioGroup
              value={destKind}
              onValueChange={(value) =>
                setDestKind(value === "existing" ? "existing" : "new")
              }
              className="mt-2 flex flex-col gap-2.5"
            >
              <Label className="font-normal">
                <RadioGroupItem value="new" /> Crear un topic nuevo
              </Label>
              {destKind === "new" && (
                <Input
                  name="dest_title"
                  required
                  placeholder="Título del topic destino…"
                  className="text-sm"
                />
              )}
              <Label className="font-normal">
                <RadioGroupItem value="existing" /> Usar un topic existente
              </Label>
              {destKind === "existing" && (
                <Select
                  value={destTopicId || null}
                  onValueChange={(value) => setDestTopicId(String(value ?? ""))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elegir topic…" />
                  </SelectTrigger>
                  <SelectContent>
                    {destCandidates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </RadioGroup>
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>
              Cancelar
            </DialogClose>
            <SubmitButton disabled={!enoughSources || !destOk}>
              <ConvergeIcon /> Convergir
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
