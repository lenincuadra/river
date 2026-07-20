"use client";

import Link from "next/link";
import { Check, ChevronDown, Plus } from "lucide-react";
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
};

const GROUPS: Array<[TopicItem["state"], string]> = [
  ["active", "Active"],
  ["snoozed", "Snoozed"],
  ["archived", "Archived"],
];

const DOT: Record<TopicItem["state"], string> = {
  active: "bg-add",
  snoozed: "border border-foreground",
  archived: "bg-muted-foreground",
};

// Switcher a la derecha (wireframe): el topic actual visible; al desplegarse,
// la lista completa agrupada por estado, con el último movimiento y el
// disparador de cada topic a la vista.
export function TopicSwitcher({
  topics,
  currentId,
}: {
  topics: TopicItem[];
  currentId?: string;
}) {
  const current = topics.find((t) => t.id === currentId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex max-w-56 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
        {current && (
          <span className={`size-1.5 shrink-0 rounded-full ${DOT[current.state]}`} />
        )}
        <span className="truncate">{current?.title ?? "Topics"}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-72">
        {GROUPS.map(([state, label]) => {
          const group = topics.filter((t) => t.state === state);
          if (group.length === 0) return null;
          return (
            <DropdownMenuGroup key={state}>
              <DropdownMenuLabel>{label}</DropdownMenuLabel>
              {group.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  render={<Link href={`/topics/${t.id}`} />}
                >
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
                  {t.id === currentId && (
                    <Check className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/topics/new" />}>
          <Plus className="size-3.5" /> Nuevo topic
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
