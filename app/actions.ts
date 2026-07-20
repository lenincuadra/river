"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  captureEntry,
  createTopic,
  createTopicFromEntry,
  assignEntryToTopic,
  deleteInboxEntry,
} from "@/db/mutations";

const refresh = () => revalidatePath("/", "layout");

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

export async function deleteInboxEntryAction(formData: FormData) {
  await deleteInboxEntry(String(formData.get("entry_id")));
  refresh();
}
