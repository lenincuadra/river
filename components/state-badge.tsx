import { Badge } from "@/components/ui/badge";

const LABEL = {
  active: "Active",
  snoozed: "Snoozed",
  archived: "Archived",
} as const;

export function StateBadge({ state }: { state: keyof typeof LABEL }) {
  return (
    <Badge variant="outline">
      <span
        className={
          state === "active"
            ? "size-1.5 rounded-full bg-add"
            : state === "snoozed"
              ? "size-1.5 rounded-full border border-foreground"
              : "size-1.5 rounded-full bg-muted-foreground"
        }
      />
      {LABEL[state]}
    </Badge>
  );
}
