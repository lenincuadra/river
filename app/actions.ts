"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  captureEntry,
  createTopic,
  createTopicFromEntry,
  createThread,
  assignEntryToTopic,
  deleteInboxEntry,
  editEntry,
  archiveTarget,
  reactivateTarget,
  snoozeTarget,
  resolveTrigger,
  shipTopic,
  convergeTopics,
  createDecision,
  type TriggerInput,
} from "@/db/mutations";

const refresh = () => revalidatePath("/", "layout");

// Fecha del <input type="date"> a ISO; el resto de los campos del disparador
// comparten estos mismos nombres en cualquier form que use <TriggerFields>.
function triggerFromForm(formData: FormData): TriggerInput | null {
  const kind = String(formData.get("kind") ?? "");
  if (kind === "date") {
    const raw = String(formData.get("fire_date") ?? "");
    if (!raw) return null;
    return { kind: "date", fireDate: new Date(raw).toISOString() };
  }
  if (kind === "condition") {
    const text = String(formData.get("condition_text") ?? "").trim();
    if (!text) return null;
    return { kind: "condition", conditionText: text };
  }
  if (kind === "backlog") return { kind: "backlog" };
  return null;
}

export async function captureAction(formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  const topicId = formData.get("topic_id");
  await captureEntry({ body, topicId: topicId ? String(topicId) : null });
  refresh();
}

export async function addEntryAction(formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await captureEntry({
    body,
    topicId: String(formData.get("topic_id")),
    authorLabel: String(formData.get("author_label") ?? "Yo"),
  });
  refresh();
}

export async function createTopicAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const topicId = await createTopic({
    title,
    description: String(formData.get("description") ?? ""),
  });
  refresh();
  redirect(`/topics/${topicId}`);
}

export async function addThreadEntryAction(formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await captureEntry({
    body,
    threadId: String(formData.get("thread_id")),
    authorLabel: String(formData.get("author_label") ?? "Yo"),
  });
  refresh();
}

export async function createThreadAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const topicId = String(formData.get("topic_id"));
  const originEntryId = formData.get("origin_entry_id");
  const parentThreadId = formData.get("parent_thread_id");
  const threadId = await createThread({
    topicId,
    title,
    originEntryId: originEntryId ? String(originEntryId) : undefined,
    parentThreadId: parentThreadId ? String(parentThreadId) : undefined,
  });
  refresh();
  redirect(`/topics/${topicId}/threads/${threadId}`);
}

export async function assignEntryAction(formData: FormData) {
  await assignEntryToTopic(
    String(formData.get("entry_id")),
    String(formData.get("topic_id"))
  );
  refresh();
}

export async function createTopicFromEntryAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const topicId = await createTopicFromEntry(
    String(formData.get("entry_id")),
    title
  );
  refresh();
  redirect(`/topics/${topicId}`);
}

export async function editEntryAction(formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await editEntry({ entryId: String(formData.get("entry_id")), body });
  refresh();
}

export async function deleteInboxEntryAction(formData: FormData) {
  await deleteInboxEntry(String(formData.get("entry_id")));
  refresh();
}

export async function archiveAction(formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return; // la UI ya lo exige; el backend valida igual
  await archiveTarget({
    targetType: formData.get("target_type") === "thread" ? "thread" : "topic",
    id: String(formData.get("target_id")),
    reason,
  });
  refresh();
}

export async function reactivateAction(formData: FormData) {
  await reactivateTarget({
    targetType: formData.get("target_type") === "thread" ? "thread" : "topic",
    id: String(formData.get("target_id")),
  });
  refresh();
}

export async function snoozeAction(formData: FormData) {
  const trigger = triggerFromForm(formData);
  if (!trigger) return; // la UI ya exige el campo del disparador elegido
  await snoozeTarget({
    targetType: formData.get("target_type") === "thread" ? "thread" : "topic",
    id: String(formData.get("target_id")),
    trigger,
  });
  refresh();
}

// Shipped (Fase 5): estampa la versión del producto. Es un evento, no cambia
// el estado del topic.
export async function shipAction(formData: FormData) {
  const version = String(formData.get("version") ?? "").trim();
  if (!version) return; // la UI ya lo exige; el backend valida igual
  await shipTopic({ topicId: String(formData.get("topic_id")), version });
  refresh();
}

// Decisión: crea el evento con sus fuentes. Las fuentes vienen como checkboxes
// name="source" con valor "thread:<id>" o "entry:<id>".
export async function createDecisionAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const sources = formData
    .getAll("source")
    .map(String)
    .map((v) => {
      const [type, id] = v.split(":");
      return { type: type === "entry" ? "entry" : "thread", id } as {
        type: "thread" | "entry";
        id: string;
      };
    })
    .filter((s) => s.id);
  if (sources.length === 0) return; // la UI ya exige al menos una fuente
  await createDecision({
    topicId: String(formData.get("topic_id")),
    title,
    text: String(formData.get("text") ?? ""),
    sources,
  });
  refresh();
}

// Convergence (Fase 5): une 2+ topics en uno (nuevo o existente). Redirige al
// destino para ver el resultado (y desde ahí navegar a los orígenes).
export async function convergeAction(formData: FormData) {
  const sourceTopicIds = formData
    .getAll("source_topic_id")
    .map(String)
    .filter(Boolean);
  if (sourceTopicIds.length < 2) return;

  const destKind = String(formData.get("dest_kind") ?? "");
  let destId: string;
  if (destKind === "new") {
    const title = String(formData.get("dest_title") ?? "").trim();
    if (!title) return;
    destId = await convergeTopics({
      sourceTopicIds,
      destination: { kind: "new", title },
    });
  } else {
    const topicId = String(formData.get("dest_topic_id") ?? "");
    if (!topicId) return;
    destId = await convergeTopics({
      sourceTopicIds,
      destination: { kind: "existing", topicId },
    });
  }
  refresh();
  redirect(`/topics/${destId}`);
}

// Resolución de Reentry: reactivar, re-dormir o archivar (con motivo).
// Usada tanto desde /reentry (vencidos hoy) como desde /triggers (radar).
export async function resolveTriggerAction(formData: FormData) {
  const triggerId = String(formData.get("trigger_id"));
  const action = String(formData.get("action"));
  if (action === "reactivate") {
    await resolveTrigger({ triggerId, action: "reactivate" });
  } else if (action === "archive") {
    const reason = String(formData.get("reason") ?? "").trim();
    if (!reason) return;
    await resolveTrigger({ triggerId, action: "archive", reason });
  } else if (action === "resnooze") {
    const trigger = triggerFromForm(formData);
    if (!trigger) return;
    await resolveTrigger({ triggerId, action: "resnooze", trigger });
  }
  refresh();
}
