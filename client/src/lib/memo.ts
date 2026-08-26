/**
 * Style context: 編集机のブループリント。データは小さく、境界は明快に保つ。
 */

export type MemoNote = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export const STORAGE_KEY = "local-memo-diff:notes:v1";

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export const getNoteLabel = (note: Pick<MemoNote, "title" | "body">) =>
  note.title.trim() || note.body.trim().split("\n")[0] || "無題のメモ";

export const makeNote = (): MemoNote => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "無題のメモ",
    body: "",
    createdAt: now,
    updatedAt: now,
  };
};
