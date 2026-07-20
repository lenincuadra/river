import Link from "next/link";
import { Plus } from "lucide-react";
import { createTopicAction } from "@/app/actions";
import { Topbar } from "@/components/topbar";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";

export const dynamic = "force-dynamic";

export default function NewTopicPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Topbar />
      <main className="mx-auto w-full max-w-xl flex-1 px-5 py-10">
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Plus className="size-4" /> Nuevo topic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createTopicAction} className="flex flex-col gap-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="topic-title">Título</FieldLabel>
                  <Input
                    id="topic-title"
                    name="title"
                    required
                    autoFocus
                    placeholder="ej: dark-mode"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="topic-description">
                    Descripción (opcional)
                  </FieldLabel>
                  <Textarea
                    id="topic-description"
                    name="description"
                    placeholder="De qué trata esta línea de vida"
                    className="min-h-20"
                  />
                  <FieldDescription>
                    Un topic es una línea de vida: su historial solo crece,
                    nunca se reescribe.
                  </FieldDescription>
                </Field>
              </FieldGroup>
              <div className="flex justify-end gap-2">
                <Link
                  href="/"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Cancelar
                </Link>
                <SubmitButton size="sm">Crear topic</SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
