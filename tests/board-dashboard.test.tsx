import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardDashboard } from '@/features/board/components/board-dashboard';
import * as boardApi from '@/features/board/api';
import * as authProvider from '@/providers/auth-provider';

vi.mock('@/features/board/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/board/api')>();
  return {
    ...actual,
    fetchBoardPosts: vi.fn(),
    fetchBoardComments: vi.fn(),
    createBoardPost: vi.fn(),
    createBoardComment: vi.fn(),
  };
});

vi.mock('@/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

const MOCK_POSTS = [
  {
    id: 'post-notice-1',
    organizationId: 'org-1',
    isNotice: true,
    kind: 'suggestion' as const,
    category: 'general' as const,
    subject: 'Townhall Meeting This Thursday',
    body: 'Please join the company-wide Q4 townhall in the main hall at 4 PM.',
    status: 'open' as const,
    resolutionNote: null,
    commentCount: 1,
    submitter: { id: 'u-admin', displayName: 'BisTech Admin', email: 'admin@bistech.io' },
    handler: null,
    handledAt: null,
    createdAt: '2026-11-25T08:00:00Z',
    updatedAt: '2026-11-25T08:00:00Z',
  },
  {
    id: 'post-opinion-1',
    organizationId: 'org-1',
    isNotice: false,
    kind: 'suggestion' as const,
    category: 'workplace' as const,
    subject: 'More standing desks on Floor 2',
    body: 'Adjustable standing desks would really help during long coding sprints.',
    status: 'open' as const,
    resolutionNote: null,
    commentCount: 0,
    submitter: { id: 'u-emp', displayName: 'Saad Ferozee', email: 'saad@bistech.io' },
    handler: null,
    handledAt: null,
    createdAt: '2026-11-25T07:00:00Z',
    updatedAt: '2026-11-25T07:00:00Z',
  },
];

describe('BoardDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(boardApi.fetchBoardPosts).mockResolvedValue(MOCK_POSTS);
    vi.mocked(boardApi.fetchBoardComments).mockImplementation(async (postId) => {
      if (postId === 'post-notice-1') {
        return [
          {
            id: 'c-1',
            feedbackId: 'post-notice-1',
            body: 'Will remote teammates get a Meet link?',
            author: { id: 'u-emp', displayName: 'Saad Ferozee', email: 'saad@bistech.io' },
            createdAt: '2026-11-25T08:30:00Z',
            updatedAt: '2026-11-25T08:30:00Z',
          },
        ];
      }
      return [];
    });
  });

  it('hides Pin a Notice button for regular employees while displaying notices, opinions, and attached mini sticky-note comments', async () => {
    vi.mocked(authProvider.useAuth).mockReturnValue({
      user: {
        userId: 'u-emp',
        name: 'Saad Ferozee',
        email: 'saad@bistech.io',
        roles: ['employee'],
        permissions: { 'feedback.read': 'own', 'feedback.submit': 'own' },
      },
      activeRole: 'employee',
    } as unknown as ReturnType<typeof authProvider.useAuth>);

    render(<BoardDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Townhall Meeting This Thursday')).toBeInTheDocument();
    });

    expect(screen.getByText('More standing desks on Floor 2')).toBeInTheDocument();
    expect(screen.getByText('Will remote teammates get a Meet link?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stick an Opinion/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pin a Notice/i })).not.toBeInTheDocument();
  });

  it('allows Department Head / HR / Super Admin to pin a new Notice and stick comments', async () => {
    const user = userEvent.setup();
    vi.mocked(authProvider.useAuth).mockReturnValue({
      user: {
        userId: 'u-head',
        name: 'Farhan Ahmed',
        email: 'farhan@bistech.io',
        roles: ['dept_head'],
        permissions: { 'feedback.read': 'own', 'feedback.submit': 'own' },
      },
      activeRole: 'dept_head',
    } as unknown as ReturnType<typeof authProvider.useAuth>);

    vi.mocked(boardApi.createBoardPost).mockResolvedValue({
      id: 'post-notice-2',
      organizationId: 'org-1',
      isNotice: true,
      kind: 'suggestion',
      category: 'general',
      subject: 'Deploy Freeze on Friday',
      body: 'Please complete all production releases before Thursday 5 PM.',
      status: 'open',
      resolutionNote: null,
      commentCount: 0,
      submitter: { id: 'u-head', displayName: 'Farhan Ahmed', email: 'farhan@bistech.io' },
      handler: null,
      handledAt: null,
      createdAt: '2026-11-25T10:00:00Z',
      updatedAt: '2026-11-25T10:00:00Z',
    });

    render(<BoardDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Pin a Notice/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Pin a Notice/i }));
    const dialog = await screen.findByRole('dialog', {
      name: /Pin a notice to the board/i,
    });

    await user.type(within(dialog).getByLabelText(/Notice Headline/i), 'Deploy Freeze on Friday');
    await user.type(
      within(dialog).getByLabelText(/Notice Details/i),
      'Please complete all production releases before Thursday 5 PM.',
    );

    await user.click(within(dialog).getByRole('button', { name: /^Pin Notice$/i }));

    await waitFor(() => {
      expect(boardApi.createBoardPost).toHaveBeenCalledWith({
        isNotice: true,
        kind: 'suggestion',
        category: 'general',
        subject: 'Deploy Freeze on Friday',
        body: 'Please complete all production releases before Thursday 5 PM.',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Deploy Freeze on Friday')).toBeInTheDocument();
    });
  });
});
