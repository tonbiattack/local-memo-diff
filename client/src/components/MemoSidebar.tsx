import {
  Download,
  FilePlus2,
  PencilLine,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { type ChangeEvent, type RefObject } from "react";
import { formatDateTime, getNoteLabel, type MemoNote } from "@/lib/memo";

type MemoSidebarProps = {
  notes: MemoNote[];
  activeId: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  onCreateNote: () => void;
  onSelectNote: (id: string) => void;
  onExport: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  importInputRef: RefObject<HTMLInputElement | null>;
  onDeleteAll: () => void;
};

export default function MemoSidebar({
  notes,
  activeId,
  query,
  onQueryChange,
  onCreateNote,
  onSelectNote,
  onExport,
  onImport,
  importInputRef,
  onDeleteAll,
}: MemoSidebarProps) {
  const filteredNotes = notes.filter(note => {
    const keyword = query.trim().toLowerCase();
    return (
      !keyword || `${note.title}\n${note.body}`.toLowerCase().includes(keyword)
    );
  });

  return (
    <aside className="sidebar" aria-label="メモ一覧">
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true">
          <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 6.5H28L36 14.5V39.5H12V6.5Z"
              fill="#EAF5FA"
              stroke="#64B0E0"
              strokeWidth="2"
            />
            <path d="M28 6.5V14.5H36" stroke="#64B0E0" strokeWidth="2" />
            <path
              d="M18 22H30M18 28H30"
              stroke="#1769AA"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M16.5 35.5L21 31L24 34L31.5 26.5"
              stroke="#78C39B"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <p className="brand-name">
            memo <span>/</span> diff
          </p>
          <p className="brand-caption">LOCAL WORKSPACE</p>
        </div>
      </div>
      <button className="new-note-button" type="button" onClick={onCreateNote}>
        <FilePlus2 aria-hidden="true" />
        <span>新しいメモ</span>
        <kbd>{/mac/i.test(navigator.platform) ? "⌥ N" : "Alt N"}</kbd>
      </button>
      <label className="search-field">
        <Search aria-hidden="true" size={16} />
        <input
          value={query}
          onChange={event => onQueryChange(event.target.value)}
          placeholder="メモを検索"
          aria-label="メモを検索"
        />
      </label>
      <div className="list-heading">
        <span>MEMOS</span>
        <span>{notes.length.toString().padStart(2, "0")}</span>
      </div>
      <nav className="note-list" aria-label="保存されたメモ">
        {filteredNotes.map(note => (
          <button
            className={`note-row ${note.id === activeId ? "is-active" : ""}`}
            type="button"
            onClick={() => onSelectNote(note.id)}
            key={note.id}
          >
            <span className="note-row-title">{getNoteLabel(note)}</span>
            <span className="note-row-meta">
              {formatDateTime(note.updatedAt)}
            </span>
          </button>
        ))}
        {!filteredNotes.length && (
          <div className="sidebar-empty">
            <PencilLine aria-hidden="true" size={18} />
            <p>
              {query
                ? "該当するメモはありません"
                : "最初のメモを書き始めましょう"}
            </p>
          </div>
        )}
      </nav>
      <div className="backup-actions">
        <button type="button" onClick={onExport} disabled={!notes.length}>
          <Download size={15} aria-hidden="true" />
          <span>バックアップ</span>
        </button>
        <button type="button" onClick={() => importInputRef.current?.click()}>
          <Upload size={15} aria-hidden="true" />
          <span>読み込む</span>
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          onChange={onImport}
          tabIndex={-1}
        />
      </div>
      {notes.length > 0 && (
        <button
          className="delete-all-button"
          type="button"
          onClick={onDeleteAll}
        >
          <Trash2 size={15} aria-hidden="true" />
          <span>全メモを削除</span>
        </button>
      )}
      <div className="local-only-note">
        <span className="local-pulse" aria-hidden="true" />
        <p>
          <b>この端末だけに保存中</b>
          <br />
          サーバーやDBへ送信しません
        </p>
      </div>
    </aside>
  );
}
