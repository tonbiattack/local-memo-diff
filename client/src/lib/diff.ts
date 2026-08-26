/**
 * Style context: 編集机のブループリント。
 * 差分はすべての変更行を保持し、Git風の正確なプレーンテキストへ変換できる。
 */

export type DiffKind = "context" | "removed" | "added";

export type DiffLine = {
  kind: DiffKind;
  text: string;
  fromLine?: number;
  toLine?: number;
};

export const splitLines = (value: string) => value.replace(/\r\n/g, "\n").split("\n");

export function createLineDiff(before: string, after: string): DiffLine[] {
  const left = splitLines(before);
  const right = splitLines(after);
  const matrix = Array.from({ length: left.length + 1 }, () => new Uint32Array(right.length + 1));

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      matrix[i][j] = left[i] === right[j] ? matrix[i + 1][j + 1] + 1 : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    }
  }

  const output: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let fromLine = 1;
  let toLine = 1;

  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      output.push({ kind: "context", text: left[i], fromLine, toLine });
      i += 1; j += 1; fromLine += 1; toLine += 1;
    } else if (i < left.length && (j === right.length || matrix[i + 1][j] >= matrix[i][j + 1])) {
      output.push({ kind: "removed", text: left[i], fromLine });
      i += 1; fromLine += 1;
    } else if (j < right.length) {
      output.push({ kind: "added", text: right[j], toLine });
      j += 1; toLine += 1;
    }
  }
  return output;
}

export const prefixFor = (kind: DiffKind) => kind === "added" ? "+" : kind === "removed" ? "-" : " ";

export const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
})[character] ?? character);
