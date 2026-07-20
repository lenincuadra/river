"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { captureAction } from "@/app/actions";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";

type TopicRef = { id: string; title: string } | null;

// La captura es la acción fundamental: input siempre listo, atajo ⌘K.
// Con un topic abierto muestra el chip de destino; quitarlo manda al inbox.
// El toast confirma sin interrumpir: capturar nunca navega a otra pantalla.
export function CaptureInput({ topic }: { topic: TopicRef }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [withTopic, setWithTopic] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toTopic = topic && withTopic;

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        const body = String(formData.get("body") ?? "").trim();
        await captureAction(formData);
        formRef.current?.reset();
        if (body) {
          toast.success(
            toTopic ? `Capturada en «${topic.title}»` : "Capturada al inbox"
          );
        }
      }}
      className="min-w-0 max-w-xl flex-1"
    >
      <InputGroup className="bg-card">
        <InputGroupAddon>
          <Plus />
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          name="body"
          placeholder="Capturar rápido…"
          autoComplete="off"
        />
        <InputGroupAddon align="inline-end">
          {toTopic && (
            <>
              <span className="flex max-w-40 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground">
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
          )}
          <Kbd className="max-sm:hidden">⌘K</Kbd>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
