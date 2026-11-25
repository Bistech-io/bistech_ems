export type BoardKind = 'issue' | 'suggestion';

export type BoardCategory =
  | 'general'
  | 'attendance'
  | 'tasks'
  | 'system'
  | 'workplace'
  | 'other';

export type BoardStatus = 'open' | 'in_review' | 'resolved' | 'closed';

export interface BoardAuthor {
  id: string;
  displayName: string;
  email: string;
}

export interface BoardPostItem {
  id: string;
  organizationId: string;
  isNotice: boolean;
  kind: BoardKind;
  category: BoardCategory;
  subject: string;
  body: string;
  status: BoardStatus;
  resolutionNote: string | null;
  commentCount: number;
  submitter: BoardAuthor;
  handler: { id: string; displayName: string } | null;
  handledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoardCommentItem {
  id: string;
  feedbackId: string;
  body: string;
  author: BoardAuthor;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBoardPostPayload {
  isNotice: boolean;
  kind: BoardKind;
  category: BoardCategory;
  subject: string;
  body: string;
}

export const BOARD_CATEGORY_LABELS: Record<BoardCategory, string> = {
  general: 'General',
  workplace: 'Workplace',
  tasks: 'Tasks',
  attendance: 'Attendance',
  system: 'System',
  other: 'Other',
};

export interface StickyPalette {
  bg: string;
  border: string;
  tape: string;
  badgeBg: string;
  badgeText: string;
}

export const OPINION_STICKY_PALETTES: StickyPalette[] = [
  {
    bg: '#FEF3A8',
    border: '#E9D66B',
    tape: 'rgba(217, 119, 6, 0.25)',
    badgeBg: 'rgba(180, 83, 9, 0.14)',
    badgeText: '#92400E',
  },
  {
    bg: '#CFFAE0',
    border: '#98E8B9',
    tape: 'rgba(21, 128, 61, 0.22)',
    badgeBg: 'rgba(21, 128, 61, 0.14)',
    badgeText: '#166534',
  },
  {
    bg: '#D6EEFF',
    border: '#9AD2FA',
    tape: 'rgba(3, 105, 161, 0.22)',
    badgeBg: 'rgba(3, 105, 161, 0.14)',
    badgeText: '#075985',
  },
  {
    bg: '#FFE0E9',
    border: '#F7B5C8',
    tape: 'rgba(190, 24, 93, 0.2)',
    badgeBg: 'rgba(190, 24, 93, 0.13)',
    badgeText: '#9D174D',
  },
  {
    bg: '#EAE3FF',
    border: '#C8B8FA',
    tape: 'rgba(109, 40, 217, 0.2)',
    badgeBg: 'rgba(109, 40, 217, 0.13)',
    badgeText: '#5B21B6',
  },
];

export const MINI_STICKY_COLORS = [
  { bg: '#FFF0A6', border: '#E8D26A' },
  { bg: '#FFDCE7', border: '#F5B0C5' },
  { bg: '#D4F8E3', border: '#9AE4BA' },
  { bg: '#D8EEFF', border: '#9ECFF5' },
  { bg: '#ECE4FF', border: '#C9B7F7' },
];

export const PUSHPIN_COLORS = [
  { cap: '#DC2626', highlight: '#FCA5A5', ring: '#991B1B' }, // Classic Crimson
  { cap: '#2E8B57', highlight: '#86EFAC', ring: '#14532D' }, // BisTech Sea Green
  { cap: '#D97706', highlight: '#FDE68A', ring: '#92400E' }, // Warm Amber
  { cap: '#2563EB', highlight: '#93C5FD', ring: '#1E3A8A' }, // Cobalt Blue
];

export function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
