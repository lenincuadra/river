import {
  Pencil,
  CircleDot,
  Star,
  Moon,
  Sun,
  Play,
  Archive,
  Check,
  Merge,
  type LucideIcon,
} from "lucide-react";
import type { events as eventsTable } from "@/db/schema";

type EventType = (typeof eventsTable.$inferSelect)["type"];

// Íconos Lucide por tipo de evento: un solo lugar para que el feed vertical y
// la vista Multiverso usen el mismo glifo. El color lo pone cada vista (mapa
// semántico: thread/merge=morado, disparadores=rosa, entry=verde). El ícono de
// entry va aparte porque una entry no es un evento.
export const EVENT_ICON: Record<EventType, LucideIcon> = {
  created: CircleDot,
  snoozed: Moon,
  awakened: Sun,
  reactivated: Play,
  archived: Archive,
  shipped: Star,
  decision: Check,
  converged_into: Merge,
  converged_from: Merge,
};

export const ENTRY_ICON: LucideIcon = Pencil;
