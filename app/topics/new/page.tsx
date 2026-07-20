import Link from "next/link";
import { Plus } from "lucide-react";
import { createTopicAction } from "@/app/actions";
import { Topbar } from "@/components/topbar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
            <form action={createTopicAction} className="flex flex-col gap-3">
              <Input name="title" required placeholder="Título (ej: dark-mode)" />
              <Textarea
                name="description"
                placeholder="Descripción (opcional): de qué trata esta línea de vida"
                className="min-h-20"
              />
              <div className="flex justify-end gap-2">
                <Link
                  href="/"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Cancelar
                </Link>
                <Button type="submit" size="sm">
                  Crear topic
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
