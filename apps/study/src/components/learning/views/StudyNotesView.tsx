'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CheckSquare,
  Clock,
  Code2,
  Eye,
  Heading2,
  HelpCircle,
  Layers,
  Lightbulb,
  Pencil,
  Pin,
  Plus,
  Save,
  Search,
  Sparkles,
  SplitSquareHorizontal,
  Timer,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Button,
  Input,
  MOCK_AUTHENTICATED_USER,
  cn,
  useSlidingIndicator,
  type MockUserProfile,
} from '@ants/ui';
import {
  createBlankStudyNote,
  deleteStudyNoteInState,
  extractNoteHeadings,
  filterStudyNotes,
  loadStudyLearningState,
  saveStudyLearningState,
  toggleChecklistItemInMarkdown,
  toggleNotePinnedInState,
  upsertStudyNoteInState,
  type LearningBoardFilter,
  type StudyLearningPersistedState,
  type StudyNoteItem,
} from '../../../lib/study/learning';
import type { StudyBoardPresetId } from '../../../lib/study/dashboard';
import { createDefaultStudyLearningState } from '../../../mocks/study-learning.mock';
import { StudyShellView } from '../../layout/views/StudyShellView';
import { MarkdownPreviewView } from './MarkdownPreviewView';

export type NotesWorkspaceMode = 'read' | 'split' | 'edit';

export interface StudyNotesViewProps {
  user?: MockUserProfile | null;
  initialState?: StudyLearningPersistedState;
  initialNoteId?: string;
  flowUrl?: string;
  orgUrl?: string;
  /** Controlled callbacks for `[THAW-4.6]` D1 persistence */
  onSaveNote?: (note: StudyNoteItem) => void;
  onDeleteNote?: (noteId: string) => void;
  onTogglePin?: (noteId: string) => void;
}

const BOARD_FILTERS: { id: LearningBoardFilter; label: string }[] = [
  { id: 'all', label: 'All Boards' },
  { id: 'edexcel-ial', label: 'Edexcel IAL' },
  { id: 'cambridge-igcse', label: 'Cambridge IGCSE' },
];

const WORKSPACE_MODES: { id: NotesWorkspaceMode; label: string; icon: React.ReactNode }[] = [
  { id: 'read', label: 'Read', icon: <Eye className="h-3.5 w-3.5" aria-hidden="true" /> },
  {
    id: 'split',
    label: 'Split',
    icon: <SplitSquareHorizontal className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  { id: 'edit', label: 'Edit', icon: <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> },
];

export function StudyNotesView({
  user = MOCK_AUTHENTICATED_USER,
  initialState,
  initialNoteId,
  flowUrl = 'http://localhost:3002/timetable',
  orgUrl = 'http://localhost:3000',
  onSaveNote,
  onDeleteNote,
  onTogglePin,
}: StudyNotesViewProps) {
  const defaultState = useMemo(
    () => initialState ?? createDefaultStudyLearningState(),
    [initialState]
  );

  const [learningState, setLearningState] = useState<StudyLearningPersistedState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [boardFilter, setBoardFilter] = useState<LearningBoardFilter>('all');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState<string>(
    initialNoteId ?? defaultState.notes[0]?.id ?? ''
  );
  const [mode, setMode] = useState<NotesWorkspaceMode>('read');
  const [draftNote, setDraftNote] = useState<StudyNoteItem | null>(
    () => defaultState.notes.find((n) => n.id === initialNoteId) ?? defaultState.notes[0] ?? null
  );
  const [dirty, setDirty] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const boardTabsRef = useRef<HTMLDivElement>(null);
  const modeTabsRef = useRef<HTMLDivElement>(null);

  const {
    rect: boardRect,
    ready: boardReady,
    animate: boardAnimate,
  } = useSlidingIndicator(boardTabsRef, boardFilter, {
    activeSelector: '[role="tab"][aria-selected="true"]',
  });

  const {
    rect: modeRect,
    ready: modeReady,
    animate: modeAnimate,
  } = useSlidingIndicator(modeTabsRef, mode, {
    activeSelector: '[role="tab"][aria-selected="true"]',
  });

  useEffect(() => {
    const loaded = loadStudyLearningState(defaultState);
    setLearningState(loaded);
    const urlParamId =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('note')
        : null;
    const requestedId = initialNoteId ?? urlParamId;
    const chosen =
      loaded.notes.find((n) => n.id === requestedId) ?? loaded.notes[0] ?? null;
    if (chosen) {
      setSelectedNoteId(chosen.id);
      setDraftNote(chosen);
    }
    setHydrated(true);
  }, [defaultState, initialNoteId]);

  useEffect(() => {
    if (!hydrated) return;
    saveStudyLearningState(learningState);
  }, [hydrated, learningState]);

  const filteredNotes = useMemo(
    () =>
      filterStudyNotes(learningState.notes, {
        boardFilter,
        search: searchQuery,
        pinnedOnly,
      }),
    [learningState.notes, boardFilter, searchQuery, pinnedOnly]
  );

  const activeNote = useMemo(() => {
    return (
      learningState.notes.find((n) => n.id === selectedNoteId) ??
      filteredNotes[0] ??
      learningState.notes[0] ??
      null
    );
  }, [learningState.notes, selectedNoteId, filteredNotes]);

  const displayNote = draftNote && activeNote && draftNote.id === activeNote.id ? draftNote : activeNote;
  const headings = useMemo(
    () => (displayNote ? extractNoteHeadings(displayNote.contentMarkdown) : []),
    [displayNote]
  );

  const handleSelectNote = (note: StudyNoteItem) => {
    setSelectedNoteId(note.id);
    setDraftNote(note);
    setDirty(false);
    setConfirmDeleteId(null);
    setStatusMessage(null);
  };

  const handleCreateNote = () => {
    const targetBoard: StudyBoardPresetId =
      boardFilter === 'cambridge-igcse' ? 'cambridge-igcse' : 'edexcel-ial';
    const created = createBlankStudyNote(targetBoard);
    const { nextState, xpAwarded } = upsertStudyNoteInState(learningState, created);
    setLearningState(nextState);
    setSelectedNoteId(created.id);
    setDraftNote(created);
    setMode('split');
    setDirty(false);
    setStatusMessage(
      xpAwarded > 0
        ? `Created new note (+${xpAwarded} XP). Edit Markdown cleanly in Split mode.`
        : 'Created new study note.'
    );
    onSaveNote?.(created);
  };

  const handleUpdateDraft = (patch: Partial<StudyNoteItem>) => {
    if (!displayNote) return;
    setDraftNote({ ...displayNote, ...patch });
    setDirty(true);
  };

  const handleSaveDraft = () => {
    if (!displayNote) return;
    const { nextState, xpAwarded } = upsertStudyNoteInState(learningState, displayNote);
    setLearningState(nextState);
    const updated = nextState.notes.find((n) => n.id === displayNote.id) ?? displayNote;
    setDraftNote(updated);
    setDirty(false);
    setStatusMessage(
      xpAwarded > 0 ? `Saved note (+${xpAwarded} XP earned!).` : 'Saved note changes.'
    );
    onSaveNote?.(updated);
  };

  const handleTogglePin = (noteId: string) => {
    const next = toggleNotePinnedInState(learningState, noteId);
    setLearningState(next);
    if (draftNote && draftNote.id === noteId) {
      setDraftNote({ ...draftNote, isPinned: !draftNote.isPinned });
    }
    onTogglePin?.(noteId);
  };

  const handleToggleChecklist = (itemText: string) => {
    if (!displayNote) return;
    const nextMarkdown = toggleChecklistItemInMarkdown(displayNote.contentMarkdown, itemText);
    const updatedNote = { ...displayNote, contentMarkdown: nextMarkdown };
    const { nextState } = upsertStudyNoteInState(learningState, updatedNote);
    setLearningState(nextState);
    setDraftNote(updatedNote);
    onSaveNote?.(updatedNote);
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirmDeleteId !== noteId) {
      setConfirmDeleteId(noteId);
      return;
    }
    const next = deleteStudyNoteInState(learningState, noteId);
    setLearningState(next);
    setConfirmDeleteId(null);
    setDirty(false);
    const nextSelection = next.notes[0] ?? null;
    setSelectedNoteId(nextSelection?.id ?? '');
    setDraftNote(nextSelection);
    setStatusMessage('Deleted study note.');
    onDeleteNote?.(noteId);
  };

  const insertMarkdownSnippet = (snippet: string) => {
    if (!displayNote) return;
    const prefix = displayNote.contentMarkdown.endsWith('\n') ? '\n' : '\n\n';
    handleUpdateDraft({
      contentMarkdown: `${displayNote.contentMarkdown}${prefix}${snippet}`,
    });
  };

  const flowPomodoroUrl = (() => {
    const base = flowUrl.replace(/\/timetable$/, '/pomodoro');
    const title = displayNote ? `${displayNote.subjectCode} · ${displayNote.title}` : 'Study Notes';
    return `${base}?task=${encodeURIComponent(title)}&pomodoros=1`;
  })();

  const pinnedCount = learningState.notes.filter((n) => n.isPinned).length;

  return (
    <StudyShellView activeRoute="notes" user={user} flowUrl={flowUrl} orgUrl={orgUrl}>
      <div className="space-y-6">
        {/* Top Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="editorial">Study Library</Badge>
              <span className="font-mono text-xs tabular-nums text-foreground-subtle">
                {learningState.notes.length} notes · {pinnedCount} pinned · +
                {learningState.earnedLearningXp} XP
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Syllabus Markdown Notes
            </h1>
            <p className="max-w-2xl text-sm text-foreground-muted">
              Curated Edexcel IAL and Cambridge IGCSE revision summaries with formula blocks,
              examiner callouts, and interactive checklists synced locally.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm" onClick={handleCreateNote}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>New Note</span>
            </Button>
          </div>
        </header>

        {/* Board Filter + Search Controls */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-card p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div
              ref={boardTabsRef}
              role="tablist"
              aria-label="Filter notes by exam board"
              data-gliding-ready={boardReady && boardRect.visible ? 'true' : 'false'}
              className="ants-glide-host relative inline-flex rounded-lg border border-border bg-surface-inset p-1"
            >
              <span
                aria-hidden="true"
                data-animate={boardAnimate ? 'true' : 'false'}
                className="ants-glide-indicator z-0 rounded-md bg-primary shadow-xs"
                style={{
                  transform: `translate3d(${boardRect.x}px, ${boardRect.y}px, 0)`,
                  width: `${boardRect.width}px`,
                  height: `${boardRect.height}px`,
                  opacity: boardReady && boardRect.visible ? 1 : 0,
                }}
              />
              {BOARD_FILTERS.map((item) => {
                const active = boardFilter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setBoardFilter(item.id)}
                    className={cn(
                      'ants-glide-item relative z-10 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                      active ? 'bg-primary text-on-primary' : 'text-foreground-muted hover:text-foreground'
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setPinnedOnly((p) => !p)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                pinnedOnly
                  ? 'border-primary bg-primary-tint text-on-primary-tint'
                  : 'border-border bg-surface-inset/50 text-foreground-muted hover:text-foreground'
              )}
            >
              <Pin className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Pinned Only</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-subtle"
              aria-hidden="true"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topic, code, or tag…"
              aria-label="Search study notes"
              className="h-9 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Workspace Split */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[310px_minmax(0,1fr)] lg:items-start">
          {/* Left Library List */}
          <aside
            aria-label="Notes library"
            className="space-y-2 rounded-xl border border-border bg-surface-card p-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
          >
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-foreground-subtle">
                Saved Notes ({filteredNotes.length})
              </span>
            </div>

            {filteredNotes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-foreground-muted">
                No notes match the active search. Create a new note or clear filters.
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredNotes.map((note) => {
                  const selected = displayNote?.id === note.id;
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => handleSelectNote(note)}
                      className={cn(
                        'w-full rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected
                          ? 'border-primary bg-primary-tint/55 text-foreground'
                          : 'border-border-subtle bg-surface-inset/35 text-foreground hover:border-border-hover hover:bg-surface-inset/70'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-semibold text-primary">
                          {note.subjectCode} · {note.topicCode}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-foreground-subtle tabular-nums">
                          {note.isPinned && (
                            <Pin className="h-3 w-3 text-primary" aria-label="Pinned" />
                          )}
                          <span>{note.readMinutes}m</span>
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                        {note.title}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-foreground-subtle">
                        <span>{note.authorName}</span>
                        <span>{note.updatedLabel}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {/* Right Reader / Split / Edit Surface */}
          {displayNote ? (
            <section
              aria-label="Note workspace"
              className="min-w-0 space-y-4 rounded-xl border border-border bg-surface-card p-4 sm:p-6"
            >
              {/* Note Toolbar */}
              <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="subject">{displayNote.subjectCode}</Badge>
                    <span className="font-mono text-xs text-foreground-muted">
                      {displayNote.topicCode}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-foreground-subtle">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {displayNote.readMinutes} min read
                    </span>
                    {displayNote.isOfficial && (
                      <Badge variant="editorial">Curated Playbook</Badge>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    {displayNote.title}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div
                    ref={modeTabsRef}
                    role="tablist"
                    aria-label="Note workspace mode"
                    data-gliding-ready={modeReady && modeRect.visible ? 'true' : 'false'}
                    className="ants-glide-host relative inline-flex rounded-lg border border-border bg-surface-inset p-1"
                  >
                    <span
                      aria-hidden="true"
                      data-animate={modeAnimate ? 'true' : 'false'}
                      className="ants-glide-indicator z-0 rounded-md bg-primary shadow-xs"
                      style={{
                        transform: `translate3d(${modeRect.x}px, ${modeRect.y}px, 0)`,
                        width: `${modeRect.width}px`,
                        height: `${modeRect.height}px`,
                        opacity: modeReady && modeRect.visible ? 1 : 0,
                      }}
                    />
                    {WORKSPACE_MODES.map((m) => {
                      const active = mode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => setMode(m.id)}
                          className={cn(
                            'ants-glide-item relative z-10 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                            active
                              ? 'bg-primary text-on-primary'
                              : 'text-foreground-muted hover:text-foreground'
                          )}
                        >
                          {m.icon}
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleTogglePin(displayNote.id)}
                    aria-label={displayNote.isPinned ? 'Unpin note' : 'Pin note'}
                  >
                    <Pin
                      className={cn('h-3.5 w-3.5', displayNote.isPinned && 'text-primary')}
                      aria-hidden="true"
                    />
                    <span>{displayNote.isPinned ? 'Pinned' : 'Pin'}</span>
                  </Button>

                  {(mode === 'edit' || mode === 'split' || dirty) && (
                    <Button variant="primary" size="sm" onClick={handleSaveDraft}>
                      <Save className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{dirty ? 'Save Note' : 'Saved'}</span>
                    </Button>
                  )}

                  <Button
                    variant={confirmDeleteId === displayNote.id ? 'destructive' : 'ghost'}
                    size="sm"
                    onClick={() => handleDeleteNote(displayNote.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{confirmDeleteId === displayNote.id ? 'Confirm Delete' : 'Delete'}</span>
                  </Button>
                </div>
              </div>

              {statusMessage && (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-lg border border-primary-tint-border bg-primary-tint/45 px-3 py-2 text-xs font-medium text-on-primary-tint"
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* Cross-Resource & Flow Action Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle bg-surface-inset/45 px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {headings.slice(0, 4).map((h) => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      className="rounded px-2 py-0.5 text-foreground-muted transition-colors hover:bg-surface-card hover:text-foreground"
                    >
                      # {h.text}
                    </a>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={
                      displayNote.linkedDeckId
                        ? `/flashcards?deck=${encodeURIComponent(displayNote.linkedDeckId)}`
                        : '/flashcards'
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-card px-2.5 py-1 font-semibold text-foreground-muted transition-colors hover:border-primary hover:text-primary"
                  >
                    <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Practice Flashcards</span>
                  </Link>
                  <Link
                    href={
                      displayNote.linkedQuizId
                        ? `/quizzes?quiz=${encodeURIComponent(displayNote.linkedQuizId)}`
                        : '/quizzes'
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-card px-2.5 py-1 font-semibold text-foreground-muted transition-colors hover:border-primary hover:text-primary"
                  >
                    <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Topic Quiz</span>
                  </Link>
                  <a
                    href={flowPomodoroUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-card px-2.5 py-1 font-semibold text-foreground-muted transition-colors hover:border-primary hover:text-primary"
                  >
                    <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Flow Pomodoro</span>
                  </a>
                </div>
              </div>

              {/* Editor Metadata & Markdown Snippet Bar when Editing */}
              {(mode === 'edit' || mode === 'split') && (
                <div className="space-y-3 rounded-xl border border-border bg-surface-inset/35 p-3.5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.05em] text-foreground-subtle">
                        Note Title
                      </label>
                      <Input
                        value={displayNote.title}
                        onChange={(e) => handleUpdateDraft({ title: e.target.value })}
                        placeholder="Note title"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.05em] text-foreground-subtle">
                        Subject Code
                      </label>
                      <Input
                        value={displayNote.subjectCode}
                        onChange={(e) => handleUpdateDraft({ subjectCode: e.target.value })}
                        placeholder="WMA12"
                        className="h-9 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.05em] text-foreground-subtle">
                        Topic Code
                      </label>
                      <Input
                        value={displayNote.topicCode}
                        onChange={(e) => handleUpdateDraft({ topicCode: e.target.value })}
                        placeholder="WMA12.4"
                        className="h-9 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 border-t border-border-subtle pt-2.5">
                    <span className="mr-1 text-[11px] font-semibold text-foreground-subtle">
                      Insert:
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertMarkdownSnippet('## Section Heading')}
                    >
                      <Heading2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Heading</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        insertMarkdownSnippet('```formula\ny = m*x + c\n```')
                      }
                    >
                      <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Formula Block</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        insertMarkdownSnippet(
                          '> Examiner Tip: State units clearly before final answer.'
                        )
                      }
                    >
                      <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Examiner Tip</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        insertMarkdownSnippet('- [ ] Check past paper mark scheme keywords')
                      }
                    >
                      <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Checklist</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Content Canvas */}
              <div
                className={cn(
                  'grid gap-5',
                  mode === 'split' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'
                )}
              >
                {(mode === 'edit' || mode === 'split') && (
                  <div className="flex flex-col space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-foreground-subtle">
                      Markdown Source
                    </span>
                    <textarea
                      value={displayNote.contentMarkdown}
                      onChange={(e) => handleUpdateDraft({ contentMarkdown: e.target.value })}
                      aria-label="Note Markdown editor"
                      rows={18}
                      className="min-h-[380px] w-full rounded-xl border border-border bg-surface-inset/50 p-4 font-mono text-xs sm:text-[13px] leading-relaxed text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                )}

                {(mode === 'read' || mode === 'split') && (
                  <div className="min-w-0 space-y-2">
                    {mode === 'split' && (
                      <span className="block text-[11px] font-bold uppercase tracking-[0.06em] text-foreground-subtle">
                        Formatted Preview
                      </span>
                    )}
                    <div
                      className={cn(
                        mode === 'split' &&
                          'rounded-xl border border-border-subtle bg-background/50 p-4 sm:p-5'
                      )}
                    >
                      <MarkdownPreviewView
                        markdown={displayNote.contentMarkdown}
                        onToggleChecklist={handleToggleChecklist}
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-card p-10 text-center">
              <BookOpen className="h-8 w-8 text-foreground-subtle" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-foreground">No note selected</p>
              <p className="mt-1 text-xs text-foreground-muted">
                Create a Markdown note to organise equations, checklists, and examiner tips.
              </p>
              <Button className="mt-4" size="sm" onClick={handleCreateNote}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Create First Note</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </StudyShellView>
  );
}
