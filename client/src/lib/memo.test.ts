import { describe, expect, it } from "vitest";
import { createMemoBackup, parseMemoBackup, type MemoNote } from "./memo";

const note: MemoNote = {
  id: "note-1",
  title: "バックアップ対象",
  body: "本文",
  createdAt: "2026-08-30T00:00:00.000Z",
  updatedAt: "2026-08-30T00:01:00.000Z",
  snapshots: [],
};

describe("memo backups", () => {
  it("round-trips notes in the versioned backup format", () => {
    const backup = createMemoBackup([note]);

    expect(backup.version).toBe(1);
    expect(parseMemoBackup(backup)).toEqual([note]);
  });

  it("rejects malformed backups", () => {
    expect(() => parseMemoBackup({ version: 1, notes: [{ id: "missing-fields" }] })).toThrow();
    expect(() => parseMemoBackup({ version: 2, notes: [] })).toThrow();
  });
});
