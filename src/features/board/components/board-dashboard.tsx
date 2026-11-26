'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Loader2,
  MessageSquarePlus,
  Pin,
  Search,
  Send,
  StickyNote,
} from 'lucide-react';
import { can, hasAnyRole } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import {
  createBoardComment,
  fetchBoardComments,
  fetchBoardPosts,
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
import { BoardPostDetailModal } from './board-post-detail-modal';
import { CreateBoardPostModal } from './create-board-post-modal';

const EASE = [0.22, 1, 0.36, 1] as const;

function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function BoardDashboard() {
  const { user, activeRole } = useAuth();

  const canPostNotice = useMemo(() => {
    if (
      activeRole === 'super_admin' ||
      activeRole === 'hr_manager' ||
      activeRole === 'dept_head'
    ) {
      return true;
    }
    return (
      hasAnyRole(user, ['super_admin', 'hr_manager', 'dept_head']) ||
      can(user, 'feedback.manage', 'org')
    );
  }, [user, activeRole]);

  const canModerateAll = useMemo(
    () =>
      activeRole === 'super_admin' ||
      hasAnyRole(user, ['super_admin']) ||
      can(user, 'feedback.manage', 'org'),
    [user, activeRole],
  );

  const canDeleteCommentsAny = useMemo(
    () =>
      canModerateAll ||
      activeRole === 'hr_manager' ||
      hasAnyRole(user, ['hr_manager']),
    [canModerateAll, user, activeRole],
  );

  const [posts, setPosts] = useState<BoardPostItem[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, BoardCommentItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [filterTab, setFilterTab] = useState<'all' | 'notices' | 'opinions'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<'notice' | 'opinion'>('opinion');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Quick inline mini sticky-note composer per card
  const [quickReplyPostId, setQuickReplyPostId] = useState<string | null>(null);
  const [quickReplyText, setQuickReplyText] = useState('');
  const [isSubmittingQuickReply, setIsSubmittingQuickReply] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchBoardPosts({ limit: 50 })
      .then(async (items) => {
        if (cancelled) return;
        setPosts(items);

        // Fetch attached mini sticky-note comments for visible board items
        const commentEntries = await Promise.all(
          items.slice(0, 24).map(async (item) => {
            try {
              const list = await fetchBoardComments(item.id, { limit: 20 });
              return [item.id, list] as const;
            } catch {
              return [item.id, [] as BoardCommentItem[]] as const;
            }
          }),
        );

        if (!cancelled) {
          setCommentsByPost(Object.fromEntries(commentEntries));
        }
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return posts.filter((item) => {
      if (filterTab === 'notices' && !item.isNotice) return false;
      if (filterTab === 'opinions' && item.isNotice) return false;
      if (!q) return true;
      return (
        item.subject.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        item.submitter.displayName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [posts, filterTab, searchQuery]);

  const noticePosts = useMemo(
    () => filteredPosts.filter((p) => p.isNotice),
    [filteredPosts],
  );

  const opinionPosts = useMemo(
    () => filteredPosts.filter((p) => !p.isNotice),
    [filteredPosts],
  );

  const counts = useMemo(() => {
    const notices = posts.filter((p) => p.isNotice).length;
    const opinions = posts.length - notices;
    return { total: posts.length, notices, opinions };
  }, [posts]);

  const selectedPost = useMemo(
    () => (selectedPostId ? posts.find((p) => p.id === selectedPostId) ?? null : null),
    [posts, selectedPostId],
  );

  function openComposer(mode: 'notice' | 'opinion') {
    setComposerMode(mode);
    setComposerOpen(true);
  }

  function handlePostCreated(created: BoardPostItem) {
    setPosts((prev) => {
      const next = [created, ...prev];
      return next.sort((a, b) => {
        if (a.isNotice !== b.isNotice) return a.isNotice ? -1 : 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
    });
    setCommentsByPost((prev) => ({ ...prev, [created.id]: [] }));
  }

  function handleCommentAdded(postId: string, comment: BoardCommentItem) {
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] ?? []), comment],
    }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p,
      ),
    );
  }

  function handleCommentUpdated(postId: string, updated: BoardCommentItem) {
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: (prev[postId] ?? []).map((c) => (c.id === updated.id ? updated : c)),
    }));
  }

  function handleCommentDeleted(postId: string, commentId: string) {
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: (prev[postId] ?? []).filter((c) => c.id !== commentId),
    }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, commentCount: Math.max(0, p.commentCount - 1) }
          : p,
      ),
    );
  }

  function handlePostDeleted(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setSelectedPostId((prev) => (prev === postId ? null : prev));
  }

  async function handleQuickReplySubmit(e: FormEvent, postId: string) {
    e.preventDefault();
    const trimmed = quickReplyText.trim();
    if (!trimmed || isSubmittingQuickReply) return;

    setIsSubmittingQuickReply(true);
    try {
      const created = await createBoardComment(postId, trimmed);
      handleCommentAdded(postId, created);
      setQuickReplyText('');
      setQuickReplyPostId(null);
    } finally {
      setIsSubmittingQuickReply(false);
    }
  }

  function renderAttachedComments(post: BoardPostItem, hash: number, compact = false) {
    const attachedComments = commentsByPost[post.id] ?? [];
    const visibleMiniNotes = attachedComments.slice(compact ? -1 : -2);
    const hiddenCount = Math.max(
      0,
      Math.max(attachedComments.length, post.commentCount) - visibleMiniNotes.length,
    );
    const isQuickReplying = quickReplyPostId === post.id;

    if (visibleMiniNotes.length === 0 && hiddenCount === 0 && !isQuickReplying) {
      return null;
    }

    return (
      <div className="-mt-2 flex flex-col gap-2 px-2 pt-0.5">
        {visibleMiniNotes.length > 0 && (
          <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-2')}>
            {visibleMiniNotes.map((comment, idx) => {
              const miniColor =
                MINI_STICKY_COLORS[(hash + idx + 1) % MINI_STICKY_COLORS.length];
              const miniTilt = idx % 2 === 0 ? '-1.5deg' : '1.4deg';
              return (
                <button
                  key={comment.id}
                  type="button"
                  onClick={() => setSelectedPostId(post.id)}
                  style={{
                    backgroundColor: miniColor.bg,
                    borderColor: miniColor.border,
                    transform: `rotate(${miniTilt})`,
                  }}
                  className="board-mini-sticky relative rounded-[2px] border p-2.5 text-left transition-transform duration-150 hover:z-10 hover:scale-[1.03]"
                >
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 left-1/2 h-2.5 w-8 -translate-x-1/2 rounded-[1px] bg-black/15"
                  />
                  <p className="line-clamp-2 text-[11px] leading-snug text-[#23201b]">
                    {comment.body}
                  </p>
                  <p className="mt-1.5 truncate text-[9px] font-semibold text-[#534d42]">
                    — {comment.author.displayName}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setSelectedPostId(post.id)}
            className="self-end rounded-md border border-[#23302B] bg-[#131A17]/90 px-2.5 py-1 text-[10px] font-semibold text-[#A3B3AC] transition-colors hover:border-[#2E8B57]/60 hover:text-[#F0F5F2]"
          >
            +{hiddenCount} more attached {hiddenCount === 1 ? 'note' : 'notes'}
          </button>
        )}

        {isQuickReplying && (
          <form
            onSubmit={(e) => handleQuickReplySubmit(e, post.id)}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFF3B0',
              borderColor: '#E8D26A',
            }}
            className="board-mini-sticky relative rounded-[2px] border p-2.5"
          >
            <span
              aria-hidden="true"
              className="absolute -top-1.5 left-1/2 h-2.5 w-10 -translate-x-1/2 rounded-[1px] bg-black/15"
            />
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={quickReplyText}
                onChange={(e) => setQuickReplyText(e.target.value)}
                placeholder="Write a quick sticky note..."
                aria-label="Quick sticky note reply"
                className="h-7 flex-1 rounded bg-white/80 px-2 text-[11px] text-[#23201b] placeholder-[#6B6456] focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSubmittingQuickReply || !quickReplyText.trim()}
                aria-label="Post quick sticky note"
                className="inline-flex h-7 items-center gap-1 rounded bg-[#2E8B57] px-2.5 text-[10px] font-semibold text-white hover:bg-[#349960] disabled:opacity-50"
              >
                {isSubmittingQuickReply ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="space-y-5"
    >
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#23302B] pb-5">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2E8B57]/40 bg-[#1F5C3A]/35 text-[#4CAF7D]">
            <Pin className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-[#F0F5F2] md:text-3xl">
              Public Board
            </h1>
            <p className="mt-0.5 text-xs text-[#A3B3AC]">
              Public notices &amp; team opinion sticky notes — attach small notes to reply.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => openComposer('opinion')}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#23302B] bg-[#1A2420] px-4 text-xs font-semibold text-[#F0F5F2] transition-colors hover:border-[#2E8B57]/60 hover:bg-[#1F5C3A]/30"
          >
            <StickyNote className="h-4 w-4 text-[#FBBF24]" />
            Stick an Opinion
          </button>

          {canPostNotice && (
            <button
              type="button"
              onClick={() => openComposer('notice')}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2E8B57] px-4 text-xs font-semibold text-[#F0F5F2] shadow-sm transition-colors hover:bg-[#349960]"
            >
              <Pin className="h-4 w-4" />
              Pin a Notice
            </button>
          )}
        </div>
      </header>

      {/* Toolbar: Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-xl border border-[#23302B] bg-[#131A17] p-1">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              filterTab === 'all'
                ? 'bg-[#2E8B57] text-[#F0F5F2]'
                : 'text-[#A3B3AC] hover:text-[#F0F5F2]',
            )}
          >
            {isLoading ? 'All' : `All (${counts.total})`}
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('notices')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              filterTab === 'notices'
                ? 'bg-[#2E8B57] text-[#F0F5F2]'
                : 'text-[#A3B3AC] hover:text-[#F0F5F2]',
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            {isLoading ? 'Notices' : `Notices (${counts.notices})`}
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('opinions')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              filterTab === 'opinions'
                ? 'bg-[#2E8B57] text-[#F0F5F2]'
                : 'text-[#A3B3AC] hover:text-[#F0F5F2]',
            )}
          >
            <StickyNote className="h-3.5 w-3.5" />
            {isLoading ? 'Opinions' : `Opinions (${counts.opinions})`}
          </button>
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6E8078]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notices or sticky notes..."
            aria-label="Search board"
            className="h-9 w-full rounded-xl border border-[#23302B] bg-[#131A17] pl-9 pr-3 text-xs text-[#F0F5F2] placeholder-[#6E8078] focus:border-[#4CAF7D] focus:outline-none"
          />
        </div>
      </div>

      {/* Real-Life Framed Corkboard Canvas */}
      <section className="board-cork-frame">
        <div className="board-cork-surface min-h-[540px] p-5 sm:p-7 md:p-8">
          {isLoading ? (
            <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  className="h-56 animate-pulse rounded-lg bg-white/10"
                />
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <div className="board-notice-paper relative max-w-sm rotate-[-1deg] rounded-md border border-[#E5DEC9] px-7 py-8">
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-2.5 h-4 w-4 -translate-x-1/2 rounded-full bg-[#DC2626] shadow-md"
                />
                <h2 className="paper-ink mt-2 font-heading text-base font-bold">
                  The Board is Clear!
                </h2>
                <p className="paper-ink-muted mt-1.5 text-xs leading-relaxed">
                  {posts.length === 0
                    ? 'Be the first to pin a notice or stick an opinion note for everyone at BisTech.'
                    : 'No pinned notices or sticky notes match your current filter.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-10">
              {/* SECTION 1: BIG PINNED NOTICES */}
              {noticePosts.length > 0 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Pin className="h-4 w-4 text-[#4CAF7D]" />
                      <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-[#A3B3AC]">
                        Pinned Notices
                      </h2>
                      <span className="rounded-full border border-[#23302B] bg-[#131A17] px-2 py-0.5 text-[11px] font-semibold text-[#F0F5F2]">
                        {noticePosts.length}
                      </span>
                    </div>
                  </div>

                  <div className="grid items-start gap-8 lg:grid-cols-2">
                    {noticePosts.map((post) => {
                      const hash = hashString(post.id);
                      const tiltDeg = ((hash % 3) - 1) * 0.45;
                      const pinColor = PUSHPIN_COLORS[hash % PUSHPIN_COLORS.length];
                      const isQuickReplying = quickReplyPostId === post.id;

                      return (
                        <article
                          key={post.id}
                          className="group relative flex flex-col"
                          style={{ transform: `rotate(${tiltDeg}deg)` }}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedPostId(post.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedPostId(post.id);
                              }
                            }}
                            className="board-notice-paper relative min-h-[240px] cursor-pointer rounded-[6px] border border-[#E5DEC9] px-7 pb-6 pt-10 transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CAF7D]"
                          >
                            {/* 3D Pushpin */}
                            <span
                              aria-hidden="true"
                              className="absolute left-1/2 top-3 z-10 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full shadow-[0_5px_8px_rgba(0,0,0,0.42)]"
                              style={{
                                background: `radial-gradient(circle at 35% 30%, ${pinColor.highlight}, ${pinColor.cap} 65%, ${pinColor.ring})`,
                              }}
                            />

                            <div className="flex items-center justify-between gap-2 border-b border-[#E5DEC9] pb-2.5">
                              <span className="rounded bg-[#DC2626]/12 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#B91C1C]">
                                Official Notice
                              </span>
                              <span className="paper-ink-muted text-xs font-medium">
                                {BOARD_CATEGORY_LABELS[post.category]} · {formatShortDate(post.createdAt)}
                              </span>
                            </div>

                            <h3 className="paper-ink mt-4 font-heading text-lg font-bold leading-snug sm:text-xl">
                              {post.subject}
                            </h3>
                            <p className="paper-ink mt-3 line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed">
                              {post.body}
                            </p>

                            <div className="paper-ink-muted mt-6 flex items-center justify-between border-t border-dashed border-[#D6CEB8] pt-3 text-xs">
                              <span className="truncate font-medium">
                                Pinned by <strong className="paper-ink">{post.submitter.displayName}</strong>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuickReplyPostId(isQuickReplying ? null : post.id);
                                  setQuickReplyText('');
                                }}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-black/5 px-2.5 py-1.5 text-[11px] font-semibold text-[#1F5C3A] transition-colors hover:bg-black/10"
                              >
                                <MessageSquarePlus className="h-3.5 w-3.5" />
                                Stick reply
                              </button>
                            </div>
                          </div>

                          {renderAttachedComments(post, hash, false)}
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SEPARATOR BETWEEN NOTICES & STICKY NOTES */}
              {noticePosts.length > 0 && opinionPosts.length > 0 && (
                <div className="border-t border-dashed border-[#23302B]/90" />
              )}

              {/* SECTION 2: SMALL SQUARE-ISH OPINION STICKY NOTES */}
              {opinionPosts.length > 0 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StickyNote className="h-4 w-4 text-[#FBBF24]" />
                      <h2 className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-[#A3B3AC]">
                        Opinion Sticky Notes
                      </h2>
                      <span className="rounded-full border border-[#23302B] bg-[#131A17] px-2 py-0.5 text-[11px] font-semibold text-[#F0F5F2]">
                        {opinionPosts.length}
                      </span>
                    </div>
                  </div>

                  <div className="grid items-start gap-x-5 gap-y-8 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    {opinionPosts.map((post) => {
                      const hash = hashString(post.id);
                      const tiltDeg = ((hash % 5) - 2) * 0.75;
                      const stickyPalette =
                        OPINION_STICKY_PALETTES[hash % OPINION_STICKY_PALETTES.length];
                      const isQuickReplying = quickReplyPostId === post.id;

                      return (
                        <article
                          key={post.id}
                          className="group relative flex flex-col"
                          style={{ transform: `rotate(${tiltDeg}deg)` }}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedPostId(post.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedPostId(post.id);
                              }
                            }}
                            style={{
                              backgroundColor: stickyPalette.bg,
                              borderColor: stickyPalette.border,
                            }}
                            className="board-sticky-note relative flex aspect-[1/0.95] min-h-[210px] cursor-pointer flex-col justify-between rounded-[2px] border p-4 pt-6 transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CAF7D]"
                          >
                            {/* Translucent Adhesive Tape Strip */}
                            <span
                              aria-hidden="true"
                              className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rounded-[2px]"
                              style={{ backgroundColor: stickyPalette.tape }}
                            />

                            <div>
                              <div className="flex items-center justify-between gap-1.5">
                                <span
                                  className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                                  style={{
                                    backgroundColor: stickyPalette.badgeBg,
                                    color: stickyPalette.badgeText,
                                  }}
                                >
                                  {post.kind === 'issue' ? 'Issue' : 'Opinion'}
                                </span>
                                <span className="sticky-ink-muted text-[10px] font-medium">
                                  {formatShortDate(post.createdAt)}
                                </span>
                              </div>

                              <h3 className="sticky-ink mt-2.5 line-clamp-2 font-heading text-sm font-bold leading-snug">
                                {post.subject}
                              </h3>
                              <p className="sticky-ink mt-1.5 line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed">
                                {post.body}
                              </p>
                            </div>

                            <div className="sticky-ink-muted mt-3 flex items-center justify-between gap-1 border-t border-black/10 pt-2 text-[10px]">
                              <span className="truncate font-medium">
                                — <strong className="sticky-ink">{post.submitter.displayName}</strong>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuickReplyPostId(isQuickReplying ? null : post.id);
                                  setQuickReplyText('');
                                }}
                                className="inline-flex shrink-0 items-center gap-1 rounded bg-black/8 px-1.5 py-1 text-[10px] font-semibold text-[#23201b] transition-colors hover:bg-black/15"
                              >
                                <MessageSquarePlus className="h-3 w-3" />
                                Reply
                              </button>
                            </div>
                          </div>

                          {renderAttachedComments(post, hash, true)}
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Create Notice / Opinion Composer Modal */}
      <CreateBoardPostModal
        open={composerOpen}
        initialMode={composerMode}
        canPostNotice={canPostNotice}
        onClose={() => setComposerOpen(false)}
        onPostCreated={handlePostCreated}
      />

      {/* Focused Detail Drawer with All Attached Mini Sticky Notes */}
      <BoardPostDetailModal
        post={selectedPost}
        comments={selectedPost ? (commentsByPost[selectedPost.id] ?? []) : []}
        currentUserId={user?.userId}
        canModerateAll={canModerateAll}
        canDeleteCommentsAny={canDeleteCommentsAny}
        onClose={() => setSelectedPostId(null)}
        onCommentAdded={handleCommentAdded}
        onCommentUpdated={handleCommentUpdated}
        onCommentDeleted={handleCommentDeleted}
        onPostDeleted={handlePostDeleted}
      />
    </motion.div>
  );
}
