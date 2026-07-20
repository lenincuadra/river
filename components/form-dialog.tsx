"use client";

import { useState, type ReactElement, type ReactNode } from "react";
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
import { SubmitButton } from "@/components/submit-button";

// Diálogo genérico con un <form> adentro: los campos van como children (con
// sus inputs hidden), ejecuta la server action recibida y se cierra al
// terminar. Si la action redirige, la navegación reemplaza al cierre.
// Sin `open`/`onOpenChange` maneja su estado solo (con `trigger` que lo abre);
// con ellos queda controlado desde afuera (ej: abierto desde un menú ⋯).
export function FormDialog({
  trigger,
  triggerLabel,
  title,
  description,
  submitLabel,
  submitDisabled,
  action,
  children,
  contentClassName,
  open: controlledOpen,
  onOpenChange,
}: {
  // Elemento que abre el diálogo (sin children: van en triggerLabel).
  trigger?: ReactElement;
  triggerLabel?: ReactNode;
  title: string;
  description?: ReactNode;
  submitLabel: ReactNode;
  submitDisabled?: boolean;
  action: (formData: FormData) => Promise<void>;
  children?: ReactNode;
  contentClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger}>{triggerLabel}</DialogTrigger>}
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
          }}
          className="flex flex-col gap-4"
        >
          {children}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>
              Cancelar
            </DialogClose>
            <SubmitButton disabled={submitDisabled}>{submitLabel}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
