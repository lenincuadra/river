"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Pencil,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type TopicItem = {
  id: string;
  title: string;
  state: "active" | "snoozed" | "archived";
  // Preview: "últ. mov. hace 3 días · despierta el 3 oct" (wireframe).
  meta?: string;
  // Metadata a la vista: cuántos threads tiene y cuántas entries en el main.
  threads: number;
  mainEntries: number;
};

const DOT: Record<TopicItem["state"], string> = {
  active: "bg-add",
  snoozed: "border border-foreground",
  archived: "bg-muted-foreground",
};

// Switcher a la derecha (wireframe): el topic actual visible; al desplegarse,
// "Nuevo topic" fijo arriba, la lista agrupada por estado con su metadata
// (último movimiento, disparador, threads y entries del main), y los
// archivados colapsados para no ocupar lugar.
export function TopicSwitcher({
  topics,
  currentId,
}: {
  topics: TopicItem[];
  currentId?: string;
}) {
  const current = topics.find((t) => t.id === currentId);
  const [showArchived, setShowArchived] = useState(false);
  const archived = topics.filter((t) => t.state === "archived");

  const itemFor = (t: TopicItem) => (
    <DropdownMenuItem key={t.id} render={<Link href={`/topics/${t.id}`} />}>
      <span
        className={`mt-1.5 size-1.5 shrink-0 self-start rounded-full ${DOT[t.state]}`}
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{t.title}</span>
        {t.meta && (
          <span className="truncate text-xs text-muted-foreground">
            {t.meta}
          </span>
        )}
      </span>
      <span className="ml-2 flex shrink-0 items-center gap-1 self-start pt-0.5 text-xs text-muted-foreground">
        <GitBranch className="size-3 text-merge" /> {t.threads}
        <Pencil className="ml-1.5 size-3 text-add" /> {t.mainEntries}
      </span>
      {t.id === currentId && (
        <Check className="size-3.5 shrink-0 text-muted-foreground" />
      )}
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex max-w-56 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
        {current && (
          <span className={`size-1.5 shrink-0 rounded-full ${DOT[current.state]}`} />
        )}
        <span className="truncate">{current?.title ?? "Topics"}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-80">
        <DropdownMenuItem render={<Link href="/topics/new" />}>
          <Plus className="size-3.5" /> Nuevo topic
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {(
          [
            ["active", "Active"],
            ["snoozed", "Snoozed"],
          ] as const
        ).map(([state, label]) => {
          const group = topics.filter((t) => t.state === state);
          if (group.length === 0) return null;
          return (
            <DropdownMenuGroup key={state}>
              <DropdownMenuLabel>{label}</DropdownMenuLabel>
              {group.map(itemFor)}
            </DropdownMenuGroup>
          );
        })}
        {archived.length > 0 && (
          <DropdownMenuGroup>
            {/* Colapsado por defecto: lo archivado no compite por atención. */}
            <DropdownMenuItem
              closeOnClick={false}
              onClick={() => setShowArchived((v) => !v)}
              className="text-xs font-medium text-muted-foreground"
            >
              <ChevronRight
                className={`size-3.5 transition-transform ${showArchived ? "rotate-90" : ""}`}
              />
              Archived ({archived.length})
            </DropdownMenuItem>
            {showArchived && archived.map(itemFor)}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
