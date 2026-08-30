/**
 * Style context: 編集机のブループリント。
 * 紙面の余白と製図ネイビーのレールで、書く作業に焦点を戻す。
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type SetStateAction,
} from "react";
import {
  Check,
  ChevronDown,
  BookmarkPlus,
  Copy,
  ChevronUp,
  Clock3,
  Download,
  FilePlus2,
  Files,
  Upload,
  GitCompareArrows,
  GripVertical,
  PanelRightOpen,
  PencilLine,
  Moon,
  Search,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import DiffWorkbench from "@/components/DiffWorkbench";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getBodyTitle,
  getNoteLabel,
  formatDateTime,
  createMemoBackup,
  DEFAULT_WORKSPACE_SETTINGS,
  makeNote,
  makeSnapshot,
  MemoNote,
  normalizeWorkspaceSettings,
  parseMemoBackup,
  STORAGE_KEY,
  WORKSPACE_SETTINGS_KEY,
  WorkspaceSettings,
} from "@/lib/memo";
import { useTheme } from "@/contexts/ThemeContext";

const MIN_COMPARE_WIDTH = 280;
const MAX_COMPARE_WIDTH = 640;

const clampCompareWidth = (width: number) =>
  Math.min(MAX_COMPARE_WIDTH, Math.max(MIN_COMPARE_WIDTH, width));

function loadNotes(): MemoNote[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is MemoNote =>
          item &&
          typeof item.id === "string" &&
          typeof item.title === "string" &&
          typeof item.body === "string" &&
          typeof item.createdAt === "string" &&
          typeof item.updatedAt === "string"
      )
      .map(note =>
        note.title === "無題のメモ" && note.body.trim()
          ? { ...note, title: "", snapshots: note.snapshots ?? [] }
          : { ...note, snapshots: note.snapshots ?? [] }
      );
  } catch {
    return [];
  }
}

function loadWorkspaceSettings(): WorkspaceSettings {
  try {
    return normalizeWorkspaceSettings(
      JSON.parse(window.localStorage.getItem(WORKSPACE_SETTINGS_KEY) ?? "null")
    );
  } catch {
    return DEFAULT_WORKSPACE_SETTINGS;
  }
}

export default function Home() {
  const { theme, toggleTheme, setTheme } = useTheme();
  const [notes, setNotes] = useState<MemoNote[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isBodySearchOpen, setIsBodySearchOpen] = useState(false);
  const [bodySearch, setBodySearch] = useState("");
  const [activeMatch, setActiveMatch] = useState(0);
  const [deletionTarget, setDeletionTarget] = useState<"active" | "all" | null>(
    null
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [workspaceSettings, setWorkspaceSettings] =
    useState<WorkspaceSettings>(DEFAULT_WORKSPACE_SETTINGS);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const bodySearchRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = loadNotes().sort(
      (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
    );
    if (saved.length) {
      setNotes(saved);
      setActiveId(saved[0].id);
    }
    setWorkspaceSettings(loadWorkspaceSettings());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (notes.length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setSavedAt(new Date().toISOString());
  }, [notes, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(
      WORKSPACE_SETTINGS_KEY,
      JSON.stringify(workspaceSettings)
    );
  }, [workspaceSettings, isHydrated]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isMac = /mac/i.test(navigator.platform);
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;

      if (modifierKey && event.shiftKey && key === "s" && activeNote) {
        event.preventDefault();
        saveSnapshot();
      } else if (modifierKey && key === "s") {
        event.preventDefault();
        toast.success("この端末に保存しました");
      }
      // Ctrl+N/⌘N are reserved by browsers for opening a new window.
      // Use Alt+N on Windows/Linux so the browser cannot consume the shortcut.
      const isNewNoteShortcut = isMac
        ? event.altKey && !event.metaKey
        : event.altKey && !event.ctrlKey;
      if (isNewNoteShortcut && key === "n") {
        event.preventDefault();
        event.stopPropagation();
        createNote();
      }
      if (modifierKey && key === "f" && activeNote) {
        event.preventDefault();
        openBodySearch();
      }
      if (event.key === "Escape" && isBodySearchOpen) {
        closeBodySearch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const activeNote = notes.find(note => note.id === activeId) ?? null;
  const compareWidth = workspaceSettings.compareWidth;
  const setCompareWidth = (value: SetStateAction<number>) => {
    setWorkspaceSettings(current => ({
      ...current,
      compareWidth: clampCompareWidth(
        typeof value === "function" ? value(current.compareWidth) : value
      ),
    }));
  };
  const activeBodyTitle = activeNote ? getBodyTitle(activeNote.body) : "";
  const isUsingBodyTitle = Boolean(
    activeNote && !activeNote.title.trim() && activeBodyTitle
  );
  const filteredNotes = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return notes;
    return notes.filter(note =>
      `${note.title}\n${note.body}`.toLowerCase().includes(keyword)
    );
  }, [notes, query]);

  const bodyMatches = useMemo(() => {
    if (!activeNote || !bodySearch.trim()) return [];
    const source = activeNote.body.toLocaleLowerCase();
    const target = bodySearch.toLocaleLowerCase();
    const positions: number[] = [];
    let index = source.indexOf(target);
    while (index !== -1) {
      positions.push(index);
      index = source.indexOf(target, index + target.length);
    }
    return positions;
  }, [activeNote, bodySearch]);

  useEffect(() => {
    setActiveMatch(0);
  }, [activeNote?.id, bodySearch]);

  useEffect(() => {
    if (activeMatch >= bodyMatches.length && bodyMatches.length)
      setActiveMatch(0);
  }, [activeMatch, bodyMatches.length]);

  const createNote = () => {
    const note = makeNote();
    setNotes(current => [note, ...current]);
    setActiveId(note.id);
    setQuery("");
    window.setTimeout(() => titleRef.current?.select(), 0);
  };

  const duplicateNote = () => {
    if (!activeNote) return;
    const now = new Date().toISOString();
    const copy: MemoNote = {
      ...activeNote,
      id: crypto.randomUUID(),
      title: activeNote.title.trim() ? `${activeNote.title} のコピー` : "",
      createdAt: now,
      updatedAt: now,
      snapshots: [],
    };
    setNotes(current => [copy, ...current]);
    setActiveId(copy.id);
    setQuery("");
    toast.success("メモを複製しました");
    window.setTimeout(() => titleRef.current?.select(), 0);
  };

  const saveSnapshot = () => {
    if (!activeNote) return;
    const snapshot = makeSnapshot(activeNote);
    setNotes(current =>
      current.map(note =>
        note.id === activeNote.id
          ? {
              ...note,
              snapshots: [snapshot, ...(note.snapshots ?? [])].slice(0, 20),
            }
          : note
      )
    );
    toast.success("スナップショットを保存しました");
  };

  const exportNotes = () => {
    const blob = new Blob([JSON.stringify(createMemoBackup(notes, {
      ...workspaceSettings,
      theme,
    }), null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `memo-diff-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(`${notes.length} 件のメモをバックアップしました`);
  };

  const importNotes = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const backup = parseMemoBackup(JSON.parse(await file.text()));
      const imported = backup.notes;
      let firstImportedId: string | null = null;
      setNotes(current => {
        const knownIds = new Set(current.map(note => note.id));
        const incoming = imported.map(note => {
          const id = knownIds.has(note.id) ? crypto.randomUUID() : note.id;
          knownIds.add(id);
          firstImportedId ??= id;
          return { ...note, id };
        });
        return [...incoming, ...current].sort(
          (left, right) => +new Date(right.updatedAt) - +new Date(left.updatedAt)
        );
      });
      if (firstImportedId) setActiveId(firstImportedId);
      if (backup.settings) {
        setWorkspaceSettings(normalizeWorkspaceSettings(backup.settings));
        setTheme?.(backup.settings.theme);
      }
      toast.success(`${imported.length} 件のメモを追加しました`);
    } catch {
      toast.error("バックアップを読み込めませんでした。JSONファイルを確認してください。");
    }
  };

  const openBodySearch = () => {
    setIsBodySearchOpen(true);
    window.setTimeout(() => bodySearchRef.current?.focus(), 0);
  };

  const closeBodySearch = () => {
    setIsBodySearchOpen(false);
    setBodySearch("");
    setActiveMatch(0);
    bodyRef.current?.setSelectionRange(0, 0);
  };

  const moveBodyMatch = (offset: number) => {
    if (!bodyMatches.length) {
      toast.message("本文に一致する文字列はありません");
      return;
    }
    const next =
      (activeMatch + offset + bodyMatches.length) % bodyMatches.length;
    setActiveMatch(next);
    window.requestAnimationFrame(() => {
      const textarea = bodyRef.current;
      const start = bodyMatches[next];
      if (!textarea || start === undefined) return;
      textarea.focus();
      textarea.setSelectionRange(start, start + bodySearch.length);
    });
  };

  const updateNote = (patch: Partial<Pick<MemoNote, "title" | "body">>) => {
    if (!activeId) return;
    setNotes(current =>
      current
        .map(note =>
          note.id === activeId
            ? { ...note, ...patch, updatedAt: new Date().toISOString() }
            : note
        )
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    );
  };

  const completeDeletion = () => {
    if (deletionTarget === "active" && activeNote) {
      const remainingNotes = notes.filter(note => note.id !== activeNote.id);
      setNotes(remainingNotes);
      setActiveId(remainingNotes[0]?.id ?? null);
      closeBodySearch();
      toast.success("メモを削除しました");
    }

    if (deletionTarget === "all") {
      setNotes([]);
      setActiveId(null);
      closeBodySearch();
      toast.success("すべてのメモを削除しました");
    }

    setDeletionTarget(null);
  };

  const startCompareResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const handle = event.currentTarget;
    const startX = event.clientX;
    const startWidth = compareWidth;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const stopResize = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", moveResize);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };
    const moveResize = (moveEvent: PointerEvent) => {
      setCompareWidth(clampCompareWidth(startWidth - (moveEvent.clientX - startX)));
    };

    handle.setPointerCapture(event.pointerId);
    window.addEventListener("pointermove", moveResize);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  };

  const onCompareResizeKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setCompareWidth(current => clampCompareWidth(current + 24));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setCompareWidth(current => clampCompareWidth(current - 24));
    } else if (event.key === "Home") {
      event.preventDefault();
      setCompareWidth(MIN_COMPARE_WIDTH);
    } else if (event.key === "End") {
      event.preventDefault();
      setCompareWidth(MAX_COMPARE_WIDTH);
    }
  };

  const deletionDialogTitle =
    deletionTarget === "all"
      ? "すべてのメモを削除しますか？"
      : "このメモを削除しますか？";
  const deletionDialogDescription =
    deletionTarget === "all"
      ? `この端末に保存されている ${notes.length} 件のメモをすべて削除します。この操作は取り消せません。`
      : `「${activeNote ? getNoteLabel(activeNote) : "このメモ"}」をこの端末から削除します。この操作は取り消せません。`;

  return (
    <div
      className="app-shell"
      style={{ "--compare-panel-width": `${compareWidth}px` } as CSSProperties}
    >
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

        <button className="new-note-button" type="button" onClick={createNote}>
          <FilePlus2 aria-hidden="true" />
          <span>新しいメモ</span>
          <kbd>{/mac/i.test(navigator.platform) ? "⌥ N" : "Alt N"}</kbd>
        </button>

        <label className="search-field">
          <Search aria-hidden="true" size={16} />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
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
              onClick={() => setActiveId(note.id)}
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
          <button type="button" onClick={exportNotes} disabled={!notes.length}>
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
            onChange={importNotes}
            tabIndex={-1}
          />
        </div>

        {notes.length > 0 && (
          <button
            className="delete-all-button"
            type="button"
            onClick={() => setDeletionTarget("all")}
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

      <main className="editor-stage">
        <header className="editor-header">
          <div className="breadcrumb">
            <Files size={15} aria-hidden="true" /> <span>MY NOTES</span>{" "}
            <i>/</i> <b>{activeNote ? getNoteLabel(activeNote) : "新規文書"}</b>
          </div>
          <div className="editor-actions">
            <button
              className="theme-toggle"
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
              aria-label={theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {activeNote && (
              <button
                className="body-search-trigger"
                type="button"
                onClick={openBodySearch}
                title="本文内を検索（Ctrl または Cmd + F）"
              >
                <Search size={15} aria-hidden="true" />
                <span>本文内を検索</span>
                <kbd>⌘ F</kbd>
              </button>
            )}
            {activeNote && (
              <button
                className="note-action-button"
                type="button"
                onClick={duplicateNote}
                title="現在のメモを複製"
              >
                <Copy size={15} aria-hidden="true" />
                <span>複製</span>
              </button>
            )}
            {activeNote && (
              <button
                className="note-action-button"
                type="button"
                onClick={saveSnapshot}
                title="現在の内容をスナップショットとして保存（Ctrl または Cmd + Shift + S）"
              >
                <BookmarkPlus size={15} aria-hidden="true" />
                <span>保存</span>
                <kbd>{/mac/i.test(navigator.platform) ? "⌘ ⇧ S" : "Ctrl ⇧ S"}</kbd>
              </button>
            )}
            {activeNote && (
              <button
                className="delete-note-button"
                type="button"
                onClick={() => setDeletionTarget("active")}
                title="現在のメモを削除"
              >
                <Trash2 size={15} aria-hidden="true" />
                <span>現在のメモを削除</span>
              </button>
            )}
            <div className="save-indicator" aria-live="polite">
              <Check size={15} aria-hidden="true" />
              <span>{savedAt ? "ローカルに保存済み" : "準備中"}</span>
              <span className="save-time">
                {savedAt ? formatDateTime(savedAt) : ""}
              </span>
            </div>
          </div>
        </header>

        {activeNote ? (
          <section className="memo-paper" aria-label="メモエディタ">
            <div className="memo-paper-topline">
              <span>NOTE / {activeNote.id.slice(0, 8).toUpperCase()}</span>
              <span>
                <Clock3 size={14} aria-hidden="true" /> 更新{" "}
                {formatDateTime(activeNote.updatedAt)}
              </span>
            </div>
            {isBodySearchOpen && (
              <div
                className="in-note-search"
                role="search"
                aria-label="本文内を検索"
              >
                <label className="in-note-search-input">
                  <Search size={15} aria-hidden="true" />
                  <input
                    ref={bodySearchRef}
                    value={bodySearch}
                    onChange={event => setBodySearch(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        moveBodyMatch(event.shiftKey ? -1 : 1);
                      }
                    }}
                    placeholder="本文内を検索"
                    aria-label="検索する文字列"
                  />
                </label>
                <span
                  className={`match-counter ${bodySearch && !bodyMatches.length ? "is-empty" : ""}`}
                  aria-live="polite"
                >
                  {bodySearch
                    ? `${bodyMatches.length ? activeMatch + 1 : 0} / ${bodyMatches.length}`
                    : "検索語を入力"}
                </span>
                <div className="match-move-buttons">
                  <button
                    type="button"
                    disabled={!bodyMatches.length}
                    onClick={() => moveBodyMatch(-1)}
                    aria-label="前の一致箇所へ"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={!bodyMatches.length}
                    onClick={() => moveBodyMatch(1)}
                    aria-label="次の一致箇所へ"
                  >
                    <ChevronDown size={15} />
                  </button>
                </div>
                <button
                  className="close-search-button"
                  type="button"
                  onClick={closeBodySearch}
                  aria-label="本文内検索を閉じる"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <input
              ref={titleRef}
              className="memo-title"
              value={activeNote.title}
              onChange={event => updateNote({ title: event.target.value })}
              aria-label="メモのタイトル"
              placeholder={activeBodyTitle || "タイトルなし"}
            />
            {isUsingBodyTitle && (
              <p className="auto-title-notice">
                本文の1行目をタイトルとして表示中
              </p>
            )}
            <div className="editor-rule" />
            <div className="body-composer">
              <div className="line-count" aria-hidden="true">
                {Array.from(
                  {
                    length: Math.max(
                      10,
                      activeNote.body.split("\n").length + 4
                    ),
                  },
                  (_, index) => (
                    <span key={index}>{index + 1}</span>
                  )
                )}
              </div>
              <textarea
                ref={bodyRef}
                className="memo-body"
                value={activeNote.body}
                onChange={event => updateNote({ body: event.target.value })}
                aria-label="メモ本文"
                placeholder="ここにメモを書きます。&#10;&#10;変更した文章は、別のメモと行単位で比較できます。"
                spellCheck="false"
              />
            </div>
            <footer className="memo-footer">
              <span>{activeNote.body.length.toLocaleString()} 文字</span>
              <span>
                {activeNote.body
                  ? activeNote.body
                      .split(/\s+/)
                      .filter(Boolean)
                      .length.toLocaleString()
                  : 0}{" "}
                語
              </span>
              <span>作成 {formatDateTime(activeNote.createdAt)}</span>
            </footer>
          </section>
        ) : (
          <section className="empty-editor">
            <div className="empty-paper-anatomy" aria-hidden="true">
              <span>01</span>
              <i />
              <span>02</span>
              <i />
              <span>03</span>
              <i />
              <span>04</span>
              <i />
              <span>05</span>
              <i />
              <span>06</span>
              <i />
            </div>
            <div className="empty-icon">
              <PencilLine size={24} />
            </div>
            <p className="eyebrow">BLANK PAGE</p>
            <h1>余白から、はじめる。</h1>
            <p>
              メモはこのブラウザの localStorage に保存されます。
              <br />
              アカウントもデータベースも必要ありません。
            </p>
            <button
              className="primary-ink-button"
              type="button"
              onClick={createNote}
            >
              <FilePlus2 size={17} /> 最初のメモを作る
            </button>
          </section>
        )}
      </main>

      <button
        className="compare-resize-handle"
        type="button"
        role="separator"
        aria-label="差分比較パネルの幅を変更"
        aria-orientation="vertical"
        aria-valuemin={MIN_COMPARE_WIDTH}
        aria-valuemax={MAX_COMPARE_WIDTH}
        aria-valuenow={compareWidth}
        title="ドラッグして差分比較パネルの幅を変更"
        onPointerDown={startCompareResize}
        onKeyDown={onCompareResizeKeyDown}
      >
        <GripVertical size={16} aria-hidden="true" />
      </button>

      <aside className="compare-stage" aria-label="差分比較">
        <div className="compare-topline">
          <div>
            <span className="panel-overline">COMPARE</span>
            <h2>差分を比較</h2>
          </div>
          <GitCompareArrows size={22} aria-hidden="true" />
        </div>
        <DiffWorkbench
          notes={notes}
          activeId={activeId}
          viewMode={workspaceSettings.diffViewMode}
          onViewModeChange={diffViewMode =>
            setWorkspaceSettings(current => ({ ...current, diffViewMode }))
          }
        />
        <div className="compare-footnote">
          <GripVertical size={16} />
          <span>変更の全文を含む差分をエクスポートできます</span>
        </div>
      </aside>

      <AlertDialog
        open={deletionTarget !== null}
        onOpenChange={open => !open && setDeletionTarget(null)}
      >
        <AlertDialogContent className="deletion-dialog">
          <AlertDialogHeader>
            <span className="deletion-dialog-icon">
              <Trash2 size={19} aria-hidden="true" />
            </span>
            <AlertDialogTitle>{deletionDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletionDialogDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="confirm-delete-button"
              onClick={completeDeletion}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
