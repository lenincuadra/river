"use client";

import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { ArrowRight, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { captureAction } from "@/app/actions";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";

type TopicRef = { id: string; title: string } | null;

// La captura es la acción fundamental (regla 7): un modal siempre a un ⌘K de
// distancia, desde cualquier pantalla. Con un topic abierto muestra el chip
// de destino; quitarlo manda al inbox. El toast confirma sin navegar.
export function Capture({
  topic = null,
  trigger,
  triggerLabel,
  // Solo la instancia de la topbar escucha ⌘K (evita aperturas dobles).
  hotkey = false,
}: {
  topic?: TopicRef;
  trigger: ReactElement;
  triggerLabel: ReactNode;
  hotkey?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [withTopic, setWithTopic] = useState(true);

  useEffect(() => {
    if (!hotkey) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkey]);

  const toTopic = topic && withTopic;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setWithTopic(true); // cada captura arranca con el destino puesto
      }}
    >
      <DialogTrigger render={trigger}>{triggerLabel}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Capturar</DialogTitle>
          <DialogDescription>
            Escribí y listo: nunca exige decidir a dónde va. Sin destino, cae
            al inbox para procesar después.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            const body = String(formData.get("body") ?? "").trim();
            await captureAction(formData);
            setOpen(false);
            if (body) {
              toast.success(
                toTopic ? `Capturada en «${topic.title}»` : "Capturada al inbox"
              );
            }
          }}
          className="flex flex-col gap-4"
        >
          <Textarea
            name="body"
            required
            autoFocus
            placeholder="¿Qué apareció?"
            className="min-h-24 text-sm"
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Destino:
            {toTopic ? (
              <>
                <span className="flex max-w-48 items-center gap-1 rounded-full border border-border px-2 py-0.5 whitespace-nowrap">
                  <ArrowRight className="size-3 shrink-0" />
                  <span className="truncate">{topic.title}</span>
                  <button
                    type="button"
                    aria-label="Quitar destino: capturar al inbox"
                    title="Quitar destino: capturar al inbox"
                    onClick={() => setWithTopic(false)}
                    className="inline-flex shrink-0 hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </span>
                <input type="hidden" name="topic_id" value={topic.id} />
              </>
            ) : (
              <span className="rounded-full border border-border px-2 py-0.5">
                Inbox
              </span>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>
              Cancelar
            </DialogClose>
            <SubmitButton>
              <Plus /> Capturar
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
