"use client";

import { useEffect, useRef, useState } from "react";
import { captureAction } from "@/app/actions";

type TopicRef = { id: string; title: string } | null;

// La captura es la acción fundamental: input siempre listo, atajo ⌘K.
// Con un topic abierto muestra el chip de destino; quitarlo manda al inbox.
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

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await captureAction(formData);
        formRef.current?.reset();
      }}
      className="flex min-w-0 max-w-xl flex-1 items-center gap-2 rounded-lg border-2 border-input bg-card px-3 py-1.5 transition-colors focus-within:border-ring"
    >
      <span className="text-muted-foreground">＋</span>
      <input
        ref={inputRef}
        name="body"
        placeholder="Capturar rápido…"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      {topic && withTopic && (
        <>
          <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
            → {topic.title}
            <button
              type="button"
              aria-label="Quitar destino: capturar al inbox"
              title="Quitar destino: capturar al inbox"
              onClick={() => setWithTopic(false)}
              className="hover:text-foreground"
            >
              ✕
            </button>
          </span>
          <input type="hidden" name="topic_id" value={topic.id} />
        </>
      )}
      <kbd className="rounded border border-border px-1.5 text-[10px] text-muted-foreground">
        ⌘K
      </kbd>
    </form>
  );
}
