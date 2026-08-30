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

export type DiffViewMode = "unified" | "side";

export type WorkspaceSettings = {
  compareWidth: number;
  diffViewMode: DiffViewMode;
};

export type BackupSettings = WorkspaceSettings & {
  theme: "light" | "dark";
};

export type MemoBackup = {
  version: 2;
  exportedAt: string;
  notes: MemoNote[];
  settings: BackupSettings;
};

export const STORAGE_KEY = "local-memo-diff:notes:v1";
export const WORKSPACE_SETTINGS_KEY = "local-memo-diff:workspace:v1";
export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  compareWidth: 352,
  diffViewMode: "unified",
};

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

const isSnapshot = (value: unknown): value is MemoSnapshot => {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Record<string, unknown>;
  return (
    typeof snapshot.id === "string" &&
    typeof snapshot.title === "string" &&
    typeof snapshot.body === "string" &&
    typeof snapshot.createdAt === "string"
  );
};

const isMemoNote = (value: unknown): value is MemoNote => {
  if (!value || typeof value !== "object") return false;
  const note = value as Record<string, unknown>;
  return (
    typeof note.id === "string" &&
    typeof note.title === "string" &&
    typeof note.body === "string" &&
    typeof note.createdAt === "string" &&
    typeof note.updatedAt === "string" &&
    (note.snapshots === undefined ||
      (Array.isArray(note.snapshots) && note.snapshots.every(isSnapshot)))
  );
};

const normalizeNotes = (notes: MemoNote[]) =>
  notes.map(note => ({
    ...note,
    snapshots: [...(note.snapshots ?? [])].slice(0, 20),
  }));

export const normalizeWorkspaceSettings = (value: unknown): WorkspaceSettings => {
  if (!value || typeof value !== "object") return DEFAULT_WORKSPACE_SETTINGS;
  const settings = value as Record<string, unknown>;
  const compareWidth = settings.compareWidth;
  return {
    compareWidth:
      typeof compareWidth === "number" && Number.isFinite(compareWidth)
        ? Math.min(640, Math.max(280, compareWidth))
        : DEFAULT_WORKSPACE_SETTINGS.compareWidth,
    diffViewMode:
      settings.diffViewMode === "side" ? "side" : DEFAULT_WORKSPACE_SETTINGS.diffViewMode,
  };
};

const isBackupSettings = (value: unknown): value is BackupSettings => {
  if (!value || typeof value !== "object") return false;
  const settings = value as Record<string, unknown>;
  return (
    typeof settings.compareWidth === "number" &&
    (settings.diffViewMode === "unified" || settings.diffViewMode === "side") &&
    (settings.theme === "light" || settings.theme === "dark")
  );
};

export const createMemoBackup = (
  notes: MemoNote[],
  settings: BackupSettings
): MemoBackup => ({
  version: 2,
  exportedAt: new Date().toISOString(),
  notes,
  settings,
});

export function parseMemoBackup(value: unknown): {
  notes: MemoNote[];
  settings?: BackupSettings;
} {
  if (!value || typeof value !== "object") {
    throw new Error("バックアップファイルの形式が正しくありません。");
  }
  const backup = value as Record<string, unknown>;
  if (!Array.isArray(backup.notes) || !backup.notes.every(isMemoNote)) {
    throw new Error("対応していないバックアップファイルです。");
  }
  if (backup.version === 1) return { notes: normalizeNotes(backup.notes) };
  if (backup.version === 2 && isBackupSettings(backup.settings)) {
    return { notes: normalizeNotes(backup.notes), settings: backup.settings };
  }
  throw new Error("対応していないバックアップファイルです。");
}
