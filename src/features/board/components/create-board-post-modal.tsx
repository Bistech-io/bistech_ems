'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  FileText,
  Loader2,
  Pin,
  StickyNote,
  X,
} from 'lucide-react';
import { ApiError } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import { createBoardPost } from '../api';
import {
  BOARD_CATEGORY_LABELS,
  type BoardCategory,
  type BoardKind,
  type BoardPostItem,
} from '../types';

const EASE = [0.22, 1, 0.36, 1] as const;

interface CreateBoardPostModalProps {
  open: boolean;
  initialMode: 'notice' | 'opinion';
  canPostNotice: boolean;
  onClose: () => void;
  onPostCreated: (post: BoardPostItem) => void;
}

const CATEGORIES: BoardCategory[] = [
  'general',
  'workplace',
  'tasks',
  'attendance',
  'system',
  'other',
];

export function CreateBoardPostModal({
  open,
  initialMode,
  canPostNotice,
  onClose,
  onPostCreated,
}: CreateBoardPostModalProps) {
  const [modeOverride, setModeOverride] = useState<'notice' | 'opinion' | null>(null);
  const [kind, setKind] = useState<BoardKind>('suggestion');
  const [category, setCategory] = useState<BoardCategory>('general');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        setModeOverride(null);
        setErrorMessage(null);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, isSubmitting, onClose]);

  const activeMode = modeOverride ?? initialMode;
  const isNotice = activeMode === 'notice' && canPostNotice;

  function resetAndClose() {
    setModeOverride(null);
    setSubject('');
    setBody('');
    setCategory('general');
    setKind('suggestion');
    setErrorMessage(null);
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();

    if (trimmedSubject.length < 5) {
      setErrorMessage('Title must be at least 5 characters.');
      return;
    }

    if (trimmedBody.length < 10) {
      setErrorMessage('Message must be at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createBoardPost({
        isNotice,
        kind: isNotice ? 'suggestion' : kind,
        category,
        subject: trimmedSubject,
        body: trimmedBody,
      });
      onPostCreated(created);
      resetAndClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || 'Could not post to the board.');
      } else {
        setErrorMessage('Could not post to the board. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={isNotice ? 'Pin a notice to the board' : 'Stick an opinion on the board'}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !isSubmitting && resetAndClose()}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-[#23302B] bg-[#131A17] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#23302B] px-6 py-5">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
                    isNotice
                      ? 'border-[#DC2626]/40 bg-[#DC2626]/15 text-[#F87171]'
                      : 'border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#FBBF24]',
                  )}
                >
                  {isNotice ? <Pin className="h-5 w-5" /> : <StickyNote className="h-5 w-5" />}
                </span>
                <div>
                  <h2 className="font-heading text-lg font-bold text-[#F0F5F2]">
                    {isNotice ? 'Pin Official Notice' : 'Stick an Opinion Note'}
                  </h2>
                  <p className="text-xs text-[#A3B3AC]">
                    {isNotice
                      ? 'Appears as a pinned ivory paper memo visible to everyone.'
                      : 'Appears as a colorful sticky note on the company board.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isSubmitting && resetAndClose()}
                aria-label="Close board composer"
                className="rounded-xl p-1.5 text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {/* Role-gated Template Switcher */}
              {canPostNotice && (
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#23302B] bg-[#0B0F0E] p-1">
                  <button
                    type="button"
                    onClick={() => setModeOverride('notice')}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors',
                      isNotice
                        ? 'bg-[#2E8B57] text-[#F0F5F2] shadow-sm'
                        : 'text-[#A3B3AC] hover:text-[#F0F5F2]',
                    )}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Pinned Notice
                  </button>
                  <button
                    type="button"
                    onClick={() => setModeOverride('opinion')}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors',
                      !isNotice
                        ? 'bg-[#2E8B57] text-[#F0F5F2] shadow-sm'
                        : 'text-[#A3B3AC] hover:text-[#F0F5F2]',
                    )}
                  >
                    <StickyNote className="h-3.5 w-3.5" />
                    Opinion Sticky Note
                  </button>
                </div>
              )}

              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-2xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-3 text-xs text-[#EF4444]"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Category + Opinion Kind */}
              <div className={cn('grid gap-3', isNotice ? 'grid-cols-1' : 'sm:grid-cols-2')}>
                <div>
                  <label
                    htmlFor="board-post-category"
                    className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                  >
                    Category
                  </label>
                  <select
                    id="board-post-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as BoardCategory)}
                    className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-xs text-[#F0F5F2] focus:border-[#4CAF7D] focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {BOARD_CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>

                {!isNotice && (
                  <div>
                    <label
                      htmlFor="board-post-kind"
                      className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                    >
                      Note Type
                    </label>
                    <select
                      id="board-post-kind"
                      value={kind}
                      onChange={(e) => setKind(e.target.value as BoardKind)}
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-xs text-[#F0F5F2] focus:border-[#4CAF7D] focus:outline-none"
                    >
                      <option value="suggestion">Opinion / Suggestion</option>
                      <option value="issue">Issue / Concern</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label
                  htmlFor="board-post-subject"
                  className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                >
                  {isNotice ? 'Notice Headline' : 'Opinion Title'}{' '}
                  <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  id="board-post-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={150}
                  placeholder={
                    isNotice
                      ? 'e.g. Quarterly All-Hands Meeting This Thursday'
                      : 'e.g. Add a quiet focus corner on Floor 3'
                  }
                  className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3.5 text-sm text-[#F0F5F2] placeholder-[#6E8078] focus:border-[#4CAF7D] focus:outline-none"
                />
              </div>

              {/* Body */}
              <div>
                <label
                  htmlFor="board-post-body"
                  className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                >
                  {isNotice ? 'Notice Details' : 'Your Thoughts'}{' '}
                  <span className="text-[#EF4444]">*</span>
                </label>
                <textarea
                  id="board-post-body"
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={4000}
                  placeholder={
                    isNotice
                      ? 'Write the announcement details, date, time, or action items...'
                      : 'Share your opinion, suggestion, or workplace feedback with the team...'
                  }
                  className="w-full resize-none rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3.5 py-2.5 text-sm text-[#F0F5F2] placeholder-[#6E8078] focus:border-[#4CAF7D] focus:outline-none"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={resetAndClose}
                  disabled={isSubmitting}
                  className="h-10 rounded-xl border border-[#23302B] bg-[#0B0F0E] px-4 text-xs font-medium text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2E8B57] px-4 text-xs font-semibold text-[#F0F5F2] shadow-sm transition-colors hover:bg-[#349960] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Posting...
                    </>
                  ) : isNotice ? (
                    <>
                      <Pin className="h-3.5 w-3.5" />
                      Pin Notice
                    </>
                  ) : (
                    <>
                      <StickyNote className="h-3.5 w-3.5" />
                      Stick Opinion
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
