/**
 * Style context: 編集机のブループリント。
 * 行番号、等幅書体、増減色を用い、比較に必要な情報だけを端正に見せる。
 */

import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  Download,
  FileCode2,
  GitCompareArrows,
  Plus,
  Minus,
  Equal,
} from "lucide-react";
import { toast } from "sonner";
import { createLineDiff, escapeHtml, prefixFor, splitLines } from "@/lib/diff";
import { formatDateTime, getNoteLabel, MemoNote } from "@/lib/memo";

type DiffWorkbenchProps = { notes: MemoNote[]; activeId: string | null };
type CompareItem = {
  id: string;
  label: string;
  body: string;
  isSnapshot?: boolean;
};

const toDocument = (item: CompareItem) => `# ${item.label}\n\n${item.body}`;

const getSafeFileName = (item: CompareItem) =>
  item.label
    .replace(/[\\/:*?"<>|]/g, "-")
    .trim()
    .slice(0, 40) || "untitled";

const downloadText = (
  content: string,
  fileName: string,
  contentType: string
) => {
  const url = URL.createObjectURL(
    new Blob([content], { type: `${contentType};charset=utf-8` })
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const renderHtmlDocument = (
  from: CompareItem,
  to: CompareItem,
  diff: ReturnType<typeof createLineDiff>
) => {
  const rows = diff
    .map(line => {
      const kind = line.kind;
      const left = line.fromLine ?? "";
      const right = line.toLine ?? "";
      return `<tr class="${kind}"><td>${left}</td><td>${right}</td><td>${prefixFor(kind)}</td><td><pre>${escapeHtml(line.text) || " "}</pre></td></tr>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>diff — ${escapeHtml(from.label)} → ${escapeHtml(to.label)}</title>
<style>body{margin:0;background:#f4f1e9;color:#17212f;font-family:ui-sans-serif,system-ui,"Noto Sans JP",sans-serif}.sheet{max-width:1200px;margin:36px auto;padding:0 22px}header{padding:22px 26px;background:#142635;color:#fff;border-left:5px solid #1769aa}h1{margin:0;font-size:20px}p{margin:7px 0 0;color:#c7d9e2;font:12px ui-monospace,SFMono-Regular,monospace}table{width:100%;border-collapse:collapse;background:#fffdf8;font:13px ui-monospace,SFMono-Regular,Menlo,monospace}td{border-bottom:1px solid #e6e2d8;padding:6px 8px;vertical-align:top}td:nth-child(1),td:nth-child(2){width:42px;color:#899492;text-align:right;user-select:none}td:nth-child(3){width:16px;text-align:center;font-weight:700}pre{margin:0;white-space:pre-wrap;word-break:break-word;font:inherit}.added{background:#e7f4e9}.added td:nth-child(3){color:#1d7a45}.removed{background:#fbe8e7}.removed td:nth-child(3){color:#b23732}.context{background:#fffdf8}@media print{.sheet{max-width:none;margin:0;padding:0}header{print-color-adjust:exact;-webkit-print-color-adjust:exact}tr{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head>
<body><main class="sheet"><header><h1>memo / diff</h1><p>--- a/${escapeHtml(getSafeFileName(from))}.txt &nbsp; +++ b/${escapeHtml(getSafeFileName(to))}.txt</p></header><table aria-label="全文差分"><tbody>${rows}</tbody></table></main></body></html>`;
};

export default function DiffWorkbench({ notes, activeId }: DiffWorkbenchProps) {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [viewMode, setViewMode] = useState<"unified" | "side">("unified");

  const compareItems = useMemo<CompareItem[]>(
    () =>
      notes.flatMap(note => [
        { id: note.id, label: getNoteLabel(note), body: note.body },
        ...(note.snapshots ?? []).map(snapshot => ({
          id: `${note.id}:snapshot:${snapshot.id}`,
          label: `${getNoteLabel(note)} / 保存 ${formatDateTime(snapshot.createdAt)}`,
          body: snapshot.body,
          isSnapshot: true,
        })),
      ]),
    [notes]
  );

  useEffect(() => {
    if (!compareItems.length) {
      setFromId("");
      setToId("");
      return;
    }
    const active =
      activeId && compareItems.some(item => item.id === activeId)
        ? activeId
        : compareItems[0].id;
    setToId(current =>
      current && compareItems.some(item => item.id === current)
        ? current
        : active
    );
    setFromId(current =>
      current && compareItems.some(item => item.id === current)
        ? current
        : compareItems.find(item => item.id !== active)?.id || active
    );
  }, [compareItems, activeId]);

  const from = compareItems.find(item => item.id === fromId) ?? compareItems[0];
  const to = compareItems.find(item => item.id === toId) ?? compareItems[0];
  const diff = useMemo(
    () => (from && to ? createLineDiff(toDocument(from), toDocument(to)) : []),
    [from, to]
  );
  const added = diff.filter(line => line.kind === "added").length;
  const removed = diff.filter(line => line.kind === "removed").length;
  const changed = added + removed;

  const renderSideBySide = () =>
    diff.map((line, index) => {
      const left =
        line.kind === "added"
          ? null
          : { number: line.fromLine, text: line.text };
      const right =
        line.kind === "removed"
          ? null
          : { number: line.toLine, text: line.text };
      return (
        <div
          className={`side-diff-row ${line.kind}`}
          key={`${line.kind}-${index}`}
        >
          <div className="side-diff-cell">
            <span>{left?.number ?? ""}</span>
            <code>{left?.text || " "}</code>
          </div>
          <div className="side-diff-cell">
            <span>{right?.number ?? ""}</span>
            <code>{right?.text || " "}</code>
          </div>
        </div>
      );
    });

  const exportText = () => {
    if (!from || !to) return;
    const header = `--- a/${getSafeFileName(from)}.txt\n+++ b/${getSafeFileName(to)}.txt\n@@ -1,${splitLines(toDocument(from)).length} +1,${splitLines(toDocument(to)).length} @@\n`;
    downloadText(
      `${header}${diff.map(line => `${prefixFor(line.kind)}${line.text}`).join("\n")}\n`,
      `diff-${getSafeFileName(from)}-to-${getSafeFileName(to)}.txt`,
      "text/plain"
    );
    toast.success("Git風テキスト差分を出力しました");
  };

  const exportHtml = () => {
    if (!from || !to) return;
    downloadText(
      renderHtmlDocument(from, to, diff),
      `diff-${getSafeFileName(from)}-to-${getSafeFileName(to)}.html`,
      "text/html"
    );
    toast.success("HTML差分を出力しました");
  };

  const copyDiff = async () => {
    if (!from || !to) return;
    const value = `--- a/${getSafeFileName(from)}.txt\n+++ b/${getSafeFileName(to)}.txt\n${diff.map(line => `${prefixFor(line.kind)}${line.text}`).join("\n")}`;
    try {
      await navigator.clipboard.writeText(value);
      toast.success("差分をクリップボードへコピーしました");
    } catch {
      toast.error("コピーできませんでした。ブラウザの権限を確認してください。");
    }
  };

  if (!notes.length || !from || !to) {
    return (
      <div className="comparison-placeholder">
        <div className="diff-empty-grid" aria-hidden="true">
          <div className="removed">
            <span>01</span>
            <b>−</b>
            <i />
          </div>
          <div className="added">
            <span>01</span>
            <b>+</b>
            <i />
          </div>
          <div className="context">
            <span>02</span>
            <b>·</b>
            <i />
          </div>
          <div className="added">
            <span>03</span>
            <b>+</b>
            <i />
          </div>
        </div>
        <h3>比較するメモがありません。</h3>
        <p>
          まずメモを2つ作成してください。差分はサーバーへ送信せず、この画面だけで算出します。
        </p>
      </div>
    );
  }

  return (
    <div className="diff-workbench">
      <div className="compare-selects">
        <label>
          <span>BEFORE</span>
          <select
            value={from.id}
            onChange={event => setFromId(event.target.value)}
          >
            {compareItems.map(item => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="swap-sign" aria-hidden="true">
          <GitCompareArrows size={16} />
        </div>
        <label>
          <span>AFTER</span>
          <select value={to.id} onChange={event => setToId(event.target.value)}>
            {compareItems.map(item => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="diff-summary" aria-live="polite">
        <span>
          <Plus size={12} /> {added} additions
        </span>
        <span>
          <Minus size={12} /> {removed} deletions
        </span>
        <span>
          <Equal size={12} /> {changed ? `${changed} changes` : "変更なし"}
        </span>
      </div>
      <div className="view-switcher" role="group" aria-label="差分表示モード">
        <button
          type="button"
          className={viewMode === "unified" ? "is-selected" : ""}
          onClick={() => setViewMode("unified")}
        >
          Unified
        </button>
        <button
          type="button"
          className={viewMode === "side" ? "is-selected" : ""}
          onClick={() => setViewMode("side")}
        >
          Side-by-Side
        </button>
      </div>
      <div
        className={`diff-output ${viewMode === "side" ? "is-side-by-side" : ""}`}
        role="region"
        aria-label={viewMode === "side" ? "左右比較" : "全文差分"}
        tabIndex={0}
      >
        {viewMode === "side"
          ? renderSideBySide()
          : diff.map((line, index) => (
              <div
                className={`diff-line ${line.kind}`}
                key={`${line.kind}-${index}`}
              >
                <span className="diff-line-number">{line.fromLine ?? ""}</span>
                <span className="diff-line-number">{line.toLine ?? ""}</span>
                <span className="diff-prefix">{prefixFor(line.kind)}</span>
                <code>{line.text || " "}</code>
              </div>
            ))}
      </div>
      <div className="export-actions">
        <button type="button" onClick={copyDiff} title="差分をコピー">
          <Copy size={15} />
          <span>コピー</span>
        </button>
        <button type="button" onClick={exportText}>
          <Download size={15} />
          <span>.txt</span>
        </button>
        <button type="button" className="export-html" onClick={exportHtml}>
          <FileCode2 size={15} />
          <span>HTMLを出力</span>
        </button>
      </div>
    </div>
  );
}
