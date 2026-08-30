import { describe, expect, it } from "vitest";
import { createLineDiff, createSideBySideRows } from "./diff";

describe("createSideBySideRows", () => {
  it("pairs replaced lines without shifting the right-hand side", () => {
    const rows = createSideBySideRows(
      createLineDiff("title\nold one\nold two\nkeep", "title\nnew one\nnew two\nkeep")
    );

    expect(rows).toEqual([
      { kind: "context", left: { text: "title", fromLine: 1 }, right: { text: "title", toLine: 1 } },
      { kind: "changed", left: { text: "old one", fromLine: 2 }, right: { text: "new one", toLine: 2 } },
      { kind: "changed", left: { text: "old two", fromLine: 3 }, right: { text: "new two", toLine: 3 } },
      { kind: "context", left: { text: "keep", fromLine: 4 }, right: { text: "keep", toLine: 4 } },
    ]);
  });

  it("keeps unmatched inserted and deleted lines blank on the opposite side", () => {
    const rows = createSideBySideRows(createLineDiff("before\nkeep", "after\nadded\nkeep"));

    expect(rows).toMatchObject([
      { kind: "changed", left: { text: "before", fromLine: 1 }, right: { text: "after", toLine: 1 } },
      { kind: "added", right: { text: "added", toLine: 2 } },
      { kind: "context", left: { text: "keep", fromLine: 2 }, right: { text: "keep", toLine: 3 } },
    ]);
    expect(rows[1].left).toBeUndefined();
  });
});
