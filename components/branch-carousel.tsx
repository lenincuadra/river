import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { createThreadAction } from "@/app/actions";
import { CardLink } from "@/components/card-link";
import { StateBadge } from "@/components/state-badge";
import { FormDialog } from "@/components/form-dialog";
import { ThreadIcon } from "@/lib/event-icons";
import { TIMELINE_ICON, fmtDate } from "@/components/feed";

export type Branch = {
  id: string;
  title: string;
  state: "active" | "snoozed" | "archived";
  createdAt: string;
  href: string;
  // "desde una entry de Martina" (threads con entry de origen)
  origin?: string;
  entryCount: number;
  // Las entries se ven acá mismo (UI.md §5); abrir la rama es para aislarla.
  entries: { id: string; author: string; body: string }[];
  // Solo threads: sus subthreads (regla 5: los subthreads no se ramifican).
  children?: {
    id: string;
    title: string;
    href: string;
    state: "active" | "snoozed" | "archived";
    entryCount: number;
  }[];
};

// La sección de ramificaciones — threads de un topic o subthreads de un
// thread — con una sola lógica de diseño (UI.md §5, 5b, 5c): la línea del
// feed baja hasta el riel, el riel une los íconos, las columnas van siempre
// al lado (carrusel a cualquier tamaño) y el CTA de crear cierra la fila con
// el mismo tamaño que una card.
export function BranchCarousel({
  heading,
  label,
  branches,
  ctaLabel,
  ctaHint,
  dialogTitle,
  dialogDescription,
  submitLabel,
  dialogChildren,
}: {
  heading: string;
  label: string; // "Thread" | "Subthread"
  branches: Branch[];
  ctaLabel: string;
  ctaHint: string;
  dialogTitle: string;
  dialogDescription: string;
  submitLabel: string;
  // hidden inputs + campo de título (los names que lee createThreadAction)
  dialogChildren: ReactNode;
}) {
  return (
    <div className="relative mt-10">
      {/* La línea del feed sigue hacia abajo y entra al riel (UI.md §5). Es
          alta a propósito: sobra hacia abajo y el chip opaco (z-[1]) la tapa,
          así llega sin cortes y queda por debajo de los íconos. */}
      <span
        aria-hidden
        className="absolute -top-10 left-[11.5px] h-28 w-px bg-border"
      />
      <h2 className="pl-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {heading}
      </h2>
      {/* Bleed a todos los viewports (UI.md): el carrusel corta contra el borde
          del contenedor, sin gutter. El -mx-5 anula el px-5 del main y el px-5
          interno alinea la primera card con el feed. */}
      <div className="mt-4 -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-5 px-5 pb-3">
        {branches.map((b) => (
          <div
            key={b.id}
            className="relative flex w-[85%] shrink-0 snap-center flex-col sm:w-80 sm:snap-start"
          >
            {/* Riel: une este ícono con el del vecino (o el CTA final) y
                baja del ícono a la card. */}
            <span
              aria-hidden
              className="absolute -right-8 left-3 top-3 h-px bg-border"
            />
            <span
              aria-hidden
              className="absolute left-3 top-3 h-5 w-px bg-border"
            />
            <span
              className={`${TIMELINE_ICON} relative border-border bg-muted text-merge`}
            >
              <ThreadIcon className="size-3.5" />
            </span>

            {/* Card entera clickeable; adentro va todo: qué es, de dónde
                viene, fecha, y sus entries a la vista. El ícono de thread ya
                está en el chip de arriba (UI.md), no se repite en el título. */}
            <div className="relative mt-2 flex-1 rounded-lg border border-border bg-card p-3.5">
              <CardLink href={b.href} label={b.title} />
              <div className="text-xs text-muted-foreground">
                <b className="text-foreground">{label}</b>
                {b.origin && <> {b.origin}</>}
                <span className="float-right">{fmtDate(b.createdAt)}</span>
              </div>
              <div className="mt-1.5 text-sm font-bold">{b.title}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  <span className="font-semibold text-add">
                    +{b.entryCount}
                  </span>{" "}
                  entries
                </span>
                <StateBadge state={b.state} />
              </div>
              {b.entries.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {b.entries.map((en) => (
                    <div key={en.id} className="line-clamp-3 text-xs">
                      <b>{en.author}</b>{" "}
                      <span className="text-muted-foreground">{en.body}</span>
                    </div>
                  ))}
                </div>
              )}
              {b.children && b.children.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {b.children.map((s) => (
                    <div
                      key={s.id}
                      className="relative z-[1] rounded-md border border-border bg-card px-2.5 py-2 text-xs"
                    >
                      <CardLink href={s.href} label={s.title} />
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <ThreadIcon className="size-3" /> {s.title}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        {s.entryCount} {s.entryCount === 1 ? "entry" : "entries"}
                      </span>
                      <span className="float-right">
                        <StateBadge state={s.state} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Cierre del carrusel: empty state para ramificar, del mismo tamaño
            que una card (UI.md §5c). */}
        <div className="relative flex w-[85%] shrink-0 snap-center flex-col sm:w-80 sm:snap-start">
          <span aria-hidden className="absolute left-3 top-3 h-5 w-px bg-border" />
          {/* Chip del template con el mismo dash que la card que acompaña (UI.md). */}
          <span
            className={`${TIMELINE_ICON} relative border-dashed border-border bg-muted text-muted-foreground`}
          >
            <Plus className="size-3.5" />
          </span>
          <div className="mt-2 flex flex-1">
            <FormDialog
              trigger={
                <button
                  type="button"
                  className="flex min-h-40 flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/50 p-4 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                />
              }
              triggerLabel={
                <>
                  <ThreadIcon className="size-5 text-merge" />
                  <span className="text-sm font-semibold">{ctaLabel}</span>
                  <span className="text-xs">{ctaHint}</span>
                </>
              }
              title={dialogTitle}
              description={dialogDescription}
              submitLabel={submitLabel}
              action={createThreadAction}
            >
              {dialogChildren}
            </FormDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
