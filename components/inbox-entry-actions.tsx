"use client";

import { useState } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import {
  assignEntryAction,
  createTopicFromEntryAction,
  deleteInboxEntryAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SubmitButton } from "@/components/submit-button";

// Procesar una captura del inbox: moverla a un topic existente, crear un topic
// nuevo desde ella, o borrarla (solo acá se puede borrar — regla 2 — y por eso
// pide confirmación: al borrar no queda registro).
export function InboxEntryActions({
  entryId,
  topics,
}: {
  entryId: string;
  topics: { id: string; title: string }[];
}) {
  const [topicId, setTopicId] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={assignEntryAction} className="flex items-center gap-2">
        <input type="hidden" name="entry_id" value={entryId} />
        <input type="hidden" name="topic_id" value={topicId} />
        <Select
          value={topicId || null}
          onValueChange={(value) => setTopicId(String(value ?? ""))}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Elegir topic…" />
          </SelectTrigger>
          <SelectContent>
            {topics.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SubmitButton size="sm" variant="outline" disabled={!topicId}>
          <ArrowRight /> Mover
        </SubmitButton>
      </form>

      <form
        action={createTopicFromEntryAction}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="entry_id" value={entryId} />
        <Input
          name="title"
          required
          placeholder="Título del topic nuevo…"
          className="w-48 text-sm"
        />
        <SubmitButton size="sm" variant="outline">
          <Plus /> Crear topic
        </SubmitButton>
      </form>

      <div className="flex-1" />

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button size="sm" variant="ghost" className="text-del hover:text-del" />
          }
        >
          <Trash2 /> Borrar
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar esta captura?</AlertDialogTitle>
            <AlertDialogDescription>
              El inbox es el único lugar donde se puede borrar: la entry todavía
              no pertenece a ningún topic. Al borrarla no queda registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <form action={deleteInboxEntryAction}>
              <input type="hidden" name="entry_id" value={entryId} />
              <AlertDialogAction type="submit" variant="destructive">
                <Trash2 /> Borrar
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
