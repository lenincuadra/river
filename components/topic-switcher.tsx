"use client";

import Link from "next/link";
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
};

const GROUPS: Array<[TopicItem["state"], string]> = [
  ["active", "Active"],
  ["snoozed", "Snoozed"],
  ["archived", "Archived"],
];

// Switcher a la derecha (wireframe): el topic actual visible; al desplegarse,
// la lista completa agrupada por estado.
export function TopicSwitcher({
  topics,
  currentTitle,
}: {
  topics: TopicItem[];
  currentTitle?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold">
        {currentTitle && <span className="size-1.5 rounded-full bg-add" />}
        {currentTitle ?? "Topics"}
        <span className="text-[10px] text-muted-foreground">▾</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
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
                  {t.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/topics/new" />}>
          ＋ Nuevo topic
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
