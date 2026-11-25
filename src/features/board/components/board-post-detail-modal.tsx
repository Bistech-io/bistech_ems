'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Loader2,
  Pencil,
  Pin,
  Send,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import { useRegisterRightDrawer } from '@/lib/ui/right-drawer';
import {
  createBoardComment,
  deleteBoardComment,
  deleteBoardPost,
  updateBoardComment,
} from '../api';
import {
  BOARD_CATEGORY_LABELS,
  MINI_STICKY_COLORS,
  OPINION_STICKY_PALETTES,
  PUSHPIN_COLORS,
  hashString,
  type BoardCommentItem,
  type BoardPostItem,
} from '../types';

const EASE = [0.22, 1, 0.36, 1] as const;

interface BoardPostDetailModalProps {
  post: BoardPostItem | null;
  comments: BoardCommentItem[];
  currentUserId?: string;
  canModerateAll: boolean;
  canDeleteCommentsAny: boolean;
  onClose: () => void;
  onCommentAdded: (postId: string, comment: BoardCommentItem) => void;
  onCommentUpdated: (postId: string, comment: BoardCommentItem) => void;
  onCommentDeleted: (postId: string, commentId: string) => void;
  onPostDeleted: (postId: string) => void;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function BoardPostDetailModal({
  post,
  comments,
  currentUserId,
  canModerateAll,
  canDeleteCommentsAny,
  onClose,
  onCommentAdded,
  onCommentUpdated,
  onCommentDeleted,
  onPostDeleted,
}: BoardPostDetailModalProps) {
  useRegisterRightDrawer(Boolean(post), 576);

  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!post) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [post, onClose]);

  async function handleAddComment(e: FormEvent) {
    e.preventDefault();
    if (!post || !newComment.trim()) return;
    setActionError(null);
    setIsPostingComment(true);
    try {
      const created = await createBoardComment(post.id, newComment.trim());
      onCommentAdded(post.id, created);
      setNewComment('');
    } catch {
      setActionError('Could not attach sticky note comment.');
    } finally {
      setIsPostingComment(false);
    }
  }

  async function handleSaveEdit(commentId: string) {
    if (!post || !editBody.trim()) return;
    setActionError(null);
    setIsSavingEdit(true);
    try {
      const updated = await updateBoardComment(post.id, commentId, editBody.trim());
      onCommentUpdated(post.id, updated);
      setEditingCommentId(null);
      setEditBody('');
    } catch {
      setActionError('Could not update comment.');
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!post) return;
    setActionError(null);
    try {
      await deleteBoardComment(post.id, commentId);
      onCommentDeleted(post.id, commentId);
    } catch {
      setActionError('Could not remove comment.');
    }
  }

  async function handleDeletePost() {
    if (!post || isDeletingPost) return;
    setActionError(null);
    setIsDeletingPost(true);
    try {
      await deleteBoardPost(post.id);
      onPostDeleted(post.id);
      onClose();
    } catch {
      setActionError('Could not remove this post from the board.');
    } finally {
      setIsDeletingPost(false);
    }
  }

  const hash = post ? hashString(post.id) : 0;
  const stickyPalette = OPINION_STICKY_PALETTES[hash % OPINION_STICKY_PALETTES.length];
  const pinColor = PUSHPIN_COLORS[hash % PUSHPIN_COLORS.length];
  const canDeleteCurrentPost = Boolean(
    post && (post.submitter.id === currentUserId || canDeleteCommentsAny),
  );

  return (
    <AnimatePresence>
      {post && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label={`${post.isNotice ? 'Notice' : 'Opinion'} details: ${post.subject}`}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.26, ease: EASE }}
            className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-[#23302B] bg-[#131A17] shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between gap-3 border-b border-[#23302B] px-6 py-4">
              <div className="flex items-center gap-2.5">
                {post.isNotice ? (
                  <Pin className="h-4 w-4 text-[#F87171]" />
                ) : (
                  <StickyNote className="h-4 w-4 text-[#FBBF24]" />
                )}
                <span className="font-heading text-sm font-bold text-[#F0F5F2]">
                  {post.isNotice ? 'Pinned Notice' : 'Opinion Sticky Note'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {canDeleteCurrentPost && (
                  <button
                    type="button"
                    onClick={handleDeletePost}
                    disabled={isDeletingPost}
                    title="Remove from board"
                    aria-label="Remove post from board"
                    className="inline-flex items-center gap-1 rounded-xl border border-[#EF4444]/35 bg-[#EF4444]/10 px-2.5 py-1.5 text-[11px] font-medium text-[#EF4444] hover:bg-[#EF4444]/20 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close note details"
                  className="rounded-xl p-1.5 text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {actionError && (
                <div className="rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-3.5 py-2.5 text-xs text-[#EF4444]">
                  {actionError}
                </div>
              )}

              {/* Mother Notice Paper or Opinion Sticky Note */}
              {post.isNotice ? (
                <div className="board-notice-paper relative rounded-md border border-[#E5DEC9] px-6 pb-6 pt-8">
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-2.5 h-4 w-4 -translate-x-1/2 rounded-full shadow-md"
                    style={{
                      background: `radial-gradient(circle at 35% 30%, ${pinColor.highlight}, ${pinColor.cap} 65%, ${pinColor.ring})`,
                    }}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5DEC9] pb-2.5">
                    <span className="rounded bg-[#DC2626]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#B91C1C]">
                      Official Notice
                    </span>
                    <span className="paper-ink-muted text-[11px] font-medium">
                      {BOARD_CATEGORY_LABELS[post.category]} · {formatDate(post.createdAt)}
                    </span>
                  </div>
                  <h3 className="paper-ink mt-3 font-heading text-lg font-bold leading-snug">
                    {post.subject}
                  </h3>
                  <p className="paper-ink mt-2.5 whitespace-pre-wrap text-sm leading-relaxed">
                    {post.body}
                  </p>
                  <div className="paper-ink-muted mt-5 flex items-center justify-between border-t border-dashed border-[#D6CEB8] pt-3 text-xs">
                    <span>
                      Pinned by <strong className="paper-ink">{post.submitter.displayName}</strong>
                    </span>
                    <span>{comments.length} attached notes</span>
                  </div>
                </div>
              ) : (
                <div
                  className="board-sticky-note relative rounded-sm border px-6 pb-6 pt-7"
                  style={{
                    backgroundColor: stickyPalette.bg,
                    borderColor: stickyPalette.border,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 rounded-[2px] backdrop-blur-[1px]"
                    style={{ backgroundColor: stickyPalette.tape }}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: stickyPalette.badgeBg,
                        color: stickyPalette.badgeText,
                      }}
                    >
                      {post.kind === 'issue' ? 'Issue' : 'Opinion'} ·{' '}
                      {BOARD_CATEGORY_LABELS[post.category]}
                    </span>
                    <span className="sticky-ink-muted text-[11px] font-medium">
                      {formatDate(post.createdAt)}
                    </span>
                  </div>
                  <h3 className="sticky-ink mt-3 font-heading text-lg font-bold leading-snug">
                    {post.subject}
                  </h3>
                  <p className="sticky-ink mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                    {post.body}
                  </p>
                  <div className="sticky-ink-muted mt-5 flex items-center justify-between border-t border-black/10 pt-3 text-xs">
                    <span>
                      — <strong className="sticky-ink">{post.submitter.displayName}</strong>
                    </span>
                    <span>{comments.length} attached notes</span>
                  </div>
                </div>
              )}

              {/* Attached Small Sticky Note Comments */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A3B3AC]">
                    Attached Sticky Notes ({comments.length})
                  </h4>
                </div>

                {comments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#23302B] bg-[#0B0F0E]/60 px-4 py-8 text-center text-xs text-[#6E8078]">
                    No small sticky notes attached yet. Stick the first reply below!
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {comments.map((comment, idx) => {
                      const miniColor =
                        MINI_STICKY_COLORS[(hash + idx) % MINI_STICKY_COLORS.length];
                      const tilt = idx % 2 === 0 ? '-1deg' : '1deg';
                      const isAuthor = comment.author.id === currentUserId;
                      const canEdit = isAuthor || canModerateAll;
                      const canDelete = isAuthor || canDeleteCommentsAny;
                      const isEditing = editingCommentId === comment.id;

                      return (
                        <div
                          key={comment.id}
                          style={{
                            backgroundColor: miniColor.bg,
                            borderColor: miniColor.border,
                            transform: `rotate(${tilt})`,
                          }}
                          className="board-mini-sticky relative rounded-sm border p-3.5 transition-transform duration-200 hover:rotate-0"
                        >
                          <span
                            aria-hidden="true"
                            className="absolute -top-2 left-1/2 h-3.5 w-10 -translate-x-1/2 rounded-[1px] bg-black/12"
                          />

                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                rows={2}
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value)}
                                className="w-full rounded border border-black/20 bg-white/80 p-1.5 text-xs text-[#1F2421] focus:outline-none"
                              />
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingCommentId(null)}
                                  className="rounded px-2 py-0.5 text-[10px] font-medium text-[#534d42] hover:bg-black/10"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingEdit}
                                  onClick={() => handleSaveEdit(comment.id)}
                                  className="inline-flex items-center gap-1 rounded bg-[#2E8B57] px-2 py-0.5 text-[10px] font-semibold text-white"
                                >
                                  <Check className="h-3 w-3" />
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#23201b]">
                                {comment.body}
                              </p>
                              <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/10 pt-2">
                                <div className="min-w-0">
                                  <p className="truncate text-[11px] font-semibold text-[#23201b]">
                                    {comment.author.displayName}
                                  </p>
                                  <p className="text-[10px] text-[#534d42]">
                                    {formatDate(comment.createdAt)}
                                  </p>
                                </div>
                                {(canEdit || canDelete) && (
                                  <div className="flex items-center gap-1">
                                    {canEdit && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingCommentId(comment.id);
                                          setEditBody(comment.body);
                                        }}
                                        aria-label="Edit sticky note comment"
                                        className="rounded p-1 text-[#534d42] hover:bg-black/10"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                    )}
                                    {canDelete && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteComment(comment.id)}
                                        aria-label="Delete sticky note comment"
                                        className="rounded p-1 text-[#991B1B] hover:bg-[#DC2626]/15"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Attach New Mini Sticky Note Form */}
            <form
              onSubmit={handleAddComment}
              className="border-t border-[#23302B] bg-[#0B0F0E]/90 p-4"
            >
              <label htmlFor="detail-sticky-comment" className="sr-only">
                Attach a small sticky note comment
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="detail-sticky-comment"
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  maxLength={2000}
                  placeholder="Write a small sticky note to attach..."
                  className="h-10 flex-1 rounded-xl border border-[#23302B] bg-[#131A17] px-3.5 text-xs text-[#F0F5F2] placeholder-[#6E8078] focus:border-[#4CAF7D] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isPostingComment || !newComment.trim()}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#2E8B57] px-4 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#349960] disabled:opacity-50"
                >
                  {isPostingComment ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Stick
                </button>
              </div>
            </form>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
