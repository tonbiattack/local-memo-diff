/**
 * Style context: 編集机のブループリント。データは小さく、境界は明快に保つ。
 */

export type MemoSnapshot = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

export type MemoNote = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  snapshots?: MemoSnapshot[];
};

export const STORAGE_KEY = "local-memo-diff:notes:v1";

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export const getBodyTitle = (body: string) => {
  const firstMeaningfulLine = body
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, " ").trim())
    .find(Boolean);

  if (!firstMeaningfulLine) return "";
  return firstMeaningfulLine.length > 48
    ? `${firstMeaningfulLine.slice(0, 48)}…`
    : firstMeaningfulLine;
};

export const getNoteLabel = (note: Pick<MemoNote, "title" | "body">) =>
  note.title.trim() || getBodyTitle(note.body) || "無題のメモ";

export const makeNote = (): MemoNote => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "",
    body: "",
    createdAt: now,
    updatedAt: now,
    snapshots: [],
  };
};

export const makeSnapshot = (note: MemoNote): MemoSnapshot => ({
  id: crypto.randomUUID(),
  title: getNoteLabel(note),
  body: note.body,
  createdAt: new Date().toISOString(),
});
