import {
  Pencil,
  CircleDot,
  Star,
  Moon,
  Sun,
  Play,
  Archive,
  Check,
  GitBranch,
  Merge,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import type { events as eventsTable } from "@/db/schema";

type EventType = (typeof eventsTable.$inferSelect)["type"];
type IconType = ComponentType<{ className?: string }>;

// En River las ramas nacen del riel/main a la izquierda y crecen hacia la
// derecha; el glifo de thread y el de convergencia se espejan para apuntar en
// esa dirección (UI.md). Son la única fuente de verdad del ícono de thread y
// del de convergencia en toda la app: importar estos, no GitBranch/Merge.
export function ThreadIcon({ className }: { className?: string }) {
  return <GitBranch className={cn("-scale-x-100", className)} />;
}
export function ConvergeIcon({ className }: { className?: string }) {
  return <Merge className={cn("-scale-x-100", className)} />;
}

// Íconos Lucide por tipo de evento: un solo lugar para que el feed vertical y
// la vista Multiverso usen el mismo glifo. El color lo pone cada vista (mapa
// semántico: thread/merge=morado, disparadores=rosa, entry=verde). El ícono de
// entry va aparte porque una entry no es un evento.
export const EVENT_ICON: Record<EventType, IconType> = {
  created: CircleDot,
  snoozed: Moon,
  awakened: Sun,
  reactivated: Play,
  archived: Archive,
  shipped: Star,
  decision: Check,
  converged_into: ConvergeIcon,
  converged_from: ConvergeIcon,
};

export const ENTRY_ICON: LucideIcon = Pencil;
