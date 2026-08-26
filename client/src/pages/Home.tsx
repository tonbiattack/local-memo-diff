/**
 * Style context: 編集机のブループリント。
 * 紙面の余白と製図ネイビーのレールで、書く作業に焦点を戻す。
 */

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Clock3,
  FilePlus2,
  Files,
  GitCompareArrows,
  GripVertical,
  PanelRightOpen,
  PencilLine,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import DiffWorkbench from "@/components/DiffWorkbench";
import { getNoteLabel, formatDateTime, makeNote, MemoNote, STORAGE_KEY } from "@/lib/memo";

const logoUrl = "/manus-storage/memo-diff-logo_504365f0.png";
const paperTextureUrl = "/manus-storage/blueprint-paper-texture_f8b09c83.png";
const workspaceImageUrl = "/manus-storage/diff-workspace-abstract_c230f8a8.png";

function loadNotes(): MemoNote[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is MemoNote =>
        item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.body === "string" &&
        typeof item.createdAt === "string" &&
        typeof item.updatedAt === "string",
    );
  } catch {
    return [];
  }
}

export default function Home() {
  const [notes, setNotes] = useState<MemoNote[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = loadNotes().sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    if (saved.length) {
      setNotes(saved);
      setActiveId(saved[0].id);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    setSavedAt(new Date().toISOString());
  }, [notes, isHydrated]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        toast.success("この端末に保存しました");
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        createNote();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const activeNote = notes.find((note) => note.id === activeId) ?? null;
  const filteredNotes = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return notes;
    return notes.filter((note) => `${note.title}\n${note.body}`.toLowerCase().includes(keyword));
  }, [notes, query]);

  const createNote = () => {
    const note = makeNote();
    setNotes((current) => [note, ...current]);
    setActiveId(note.id);
    setQuery("");
    window.setTimeout(() => titleRef.current?.select(), 0);
  };

  const updateNote = (patch: Partial<Pick<MemoNote, "title" | "body">>) => {
    if (!activeId) return;
    setNotes((current) =>
      current
        .map((note) =>
          note.id === activeId ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note,
        )
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    );
  };

  const deleteNote = () => {
    if (!activeNote) return;
    if (!window.confirm(`「${getNoteLabel(activeNote)}」を削除しますか？`)) return;
    setNotes((current) => current.filter((note) => note.id !== activeNote.id));
    setActiveId((current) => (current === activeNote.id ? null : current));
    toast.success("メモを削除しました");
  };

  return (
    <div className="app-shell" style={{ "--paper-texture": `url(${paperTextureUrl})`, "--workspace-image": `url(${workspaceImageUrl})` } as CSSProperties}>
      <aside className="sidebar" aria-label="メモ一覧">
        <div className="brand-lockup">
          <img className="brand-mark" src={logoUrl} alt="memo diff" />
          <div>
            <p className="brand-name">memo <span>/</span> diff</p>
            <p className="brand-caption">LOCAL WORKSPACE</p>
          </div>
        </div>

        <button className="new-note-button" type="button" onClick={createNote}>
          <FilePlus2 aria-hidden="true" />
          <span>新しいメモ</span>
          <kbd>⌘ N</kbd>
        </button>

        <label className="search-field">
          <Search aria-hidden="true" size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="メモを検索"
            aria-label="メモを検索"
          />
        </label>

        <div className="list-heading">
          <span>MEMOS</span>
          <span>{notes.length.toString().padStart(2, "0")}</span>
        </div>
        <nav className="note-list" aria-label="保存されたメモ">
          {filteredNotes.map((note) => (
            <button
              className={`note-row ${note.id === activeId ? "is-active" : ""}`}
              type="button"
              onClick={() => setActiveId(note.id)}
              key={note.id}
            >
              <span className="note-row-title">{getNoteLabel(note)}</span>
              <span className="note-row-meta">{formatDateTime(note.updatedAt)}</span>
            </button>
          ))}
          {!filteredNotes.length && (
            <div className="sidebar-empty">
              <PencilLine aria-hidden="true" size={18} />
              <p>{query ? "該当するメモはありません" : "最初のメモを書き始めましょう"}</p>
            </div>
          )}
        </nav>

        <div className="local-only-note">
          <span className="local-pulse" aria-hidden="true" />
          <p><b>この端末だけに保存中</b><br />サーバーやDBへ送信しません</p>
        </div>
      </aside>

      <main className="editor-stage">
        <header className="editor-header">
          <div className="breadcrumb"><Files size={15} aria-hidden="true" /> <span>MY NOTES</span> <i>/</i> <b>{activeNote ? getNoteLabel(activeNote) : "新規文書"}</b></div>
          <div className="save-indicator" aria-live="polite">
            <Check size={15} aria-hidden="true" />
            <span>{savedAt ? "ローカルに保存済み" : "準備中"}</span>
            <span className="save-time">{savedAt ? formatDateTime(savedAt) : ""}</span>
          </div>
        </header>

        {activeNote ? (
          <section className="memo-paper" aria-label="メモエディタ">
            <div className="memo-paper-topline">
              <span>NOTE / {activeNote.id.slice(0, 8).toUpperCase()}</span>
              <span><Clock3 size={14} aria-hidden="true" /> 更新 {formatDateTime(activeNote.updatedAt)}</span>
            </div>
            <input
              ref={titleRef}
              className="memo-title"
              value={activeNote.title}
              onChange={(event) => updateNote({ title: event.target.value })}
              aria-label="メモのタイトル"
              placeholder="タイトルなし"
            />
            <div className="editor-rule" />
            <div className="body-composer">
              <div className="line-count" aria-hidden="true">
                {Array.from({ length: Math.max(10, activeNote.body.split("\n").length + 4) }, (_, index) => <span key={index}>{index + 1}</span>)}
              </div>
              <textarea
                className="memo-body"
                value={activeNote.body}
                onChange={(event) => updateNote({ body: event.target.value })}
                aria-label="メモ本文"
                placeholder="ここにメモを書きます。&#10;&#10;変更した文章は、別のメモと行単位で比較できます。"
                spellCheck="false"
              />
            </div>
            <footer className="memo-footer">
              <span>{activeNote.body.length.toLocaleString()} 文字</span>
              <span>{activeNote.body ? activeNote.body.split(/\s+/).filter(Boolean).length.toLocaleString() : 0} 語</span>
              <span>作成 {formatDateTime(activeNote.createdAt)}</span>
            </footer>
          </section>
        ) : (
          <section className="empty-editor">
            <div className="empty-paper-anatomy" aria-hidden="true">
              <span>01</span><i /><span>02</span><i /><span>03</span><i /><span>04</span><i /><span>05</span><i /><span>06</span><i />
            </div>
            <div className="empty-icon"><PencilLine size={24} /></div>
            <p className="eyebrow">BLANK PAGE</p>
            <h1>余白から、はじめる。</h1>
            <p>メモはこのブラウザの localStorage に保存されます。<br />アカウントもデータベースも必要ありません。</p>
            <button className="primary-ink-button" type="button" onClick={createNote}><FilePlus2 size={17} /> 最初のメモを作る</button>
          </section>
        )}
      </main>

      <aside className="compare-stage" aria-label="差分比較">
        <div className="compare-topline">
          <div><span className="panel-overline">COMPARE</span><h2>差分を比較</h2></div>
          <GitCompareArrows size={22} aria-hidden="true" />
        </div>
        <DiffWorkbench notes={notes} activeId={activeId} />
        <div className="compare-footnote"><GripVertical size={16} /><span>変更の全文を含む差分をエクスポートできます</span></div>
      </aside>
    </div>
  );
}
