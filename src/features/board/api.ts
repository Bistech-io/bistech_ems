import { z } from 'zod';
import { successEnvelopeSchema } from '@ems/contracts';
import { apiRequest } from '@/lib/api/client';
import type {
  BoardCategory,
  BoardCommentItem,
  BoardPostItem,
  CreateBoardPostPayload,
} from './types';

const boardAuthorSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string(),
});

const boardPostSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  isNotice: z.boolean().default(false),
  kind: z.enum(['issue', 'suggestion']),
  category: z.enum(['general', 'attendance', 'tasks', 'system', 'workplace', 'other']),
  subject: z.string(),
  body: z.string(),
  status: z.enum(['open', 'in_review', 'resolved', 'closed']),
  resolutionNote: z.string().nullable().optional().default(null),
  commentCount: z.number().optional().default(0),
  submitter: boardAuthorSchema,
  handler: z
    .object({
      id: z.string(),
      displayName: z.string(),
    })
    .nullable()
    .optional()
    .default(null),
  handledAt: z.string().nullable().optional().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const boardCommentSchema = z.object({
  id: z.string(),
  feedbackId: z.string(),
  body: z.string(),
  author: boardAuthorSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

const listBoardPostsResponseSchema = successEnvelopeSchema(z.array(boardPostSchema));
const singleBoardPostResponseSchema = successEnvelopeSchema(boardPostSchema);
const deleteIdResponseSchema = successEnvelopeSchema(z.object({ id: z.string() }));
const listBoardCommentsResponseSchema = successEnvelopeSchema(z.array(boardCommentSchema));
const singleBoardCommentResponseSchema = successEnvelopeSchema(boardCommentSchema);

export async function fetchBoardPosts(params?: {
  isNotice?: boolean;
  category?: BoardCategory;
  page?: number;
  limit?: number;
}): Promise<BoardPostItem[]> {
  const search = new URLSearchParams();
  if (params?.isNotice !== undefined) search.set('isNotice', String(params.isNotice));
  if (params?.category) search.set('category', params.category);
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(params?.limit ?? 50));

  const qs = search.toString();
  const res = await apiRequest(`/feedback?${qs}`, {
    method: 'GET',
    schema: listBoardPostsResponseSchema,
  });
  return res.data;
}

export async function createBoardPost(
  payload: CreateBoardPostPayload,
): Promise<BoardPostItem> {
  const res = await apiRequest('/feedback', {
    method: 'POST',
    body: {
      isNotice: payload.isNotice,
      kind: payload.kind,
      category: payload.category,
      subject: payload.subject,
      body: payload.body,
    },
    schema: singleBoardPostResponseSchema,
  });
  return res.data;
}

export async function deleteBoardPost(id: string): Promise<{ id: string }> {
  const res = await apiRequest(`/feedback/${id}`, {
    method: 'DELETE',
    schema: deleteIdResponseSchema,
  });
  return res.data;
}

export async function fetchBoardComments(
  postId: string,
  params?: { page?: number; limit?: number },
): Promise<BoardCommentItem[]> {
  const search = new URLSearchParams();
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(params?.limit ?? 50));

  const res = await apiRequest(`/feedback/${postId}/comments?${search.toString()}`, {
    method: 'GET',
    schema: listBoardCommentsResponseSchema,
  });
  return res.data;
}

export async function createBoardComment(
  postId: string,
  body: string,
): Promise<BoardCommentItem> {
  const res = await apiRequest(`/feedback/${postId}/comments`, {
    method: 'POST',
    body: { body },
    schema: singleBoardCommentResponseSchema,
  });
  return res.data;
}

export async function updateBoardComment(
  postId: string,
  commentId: string,
  body: string,
): Promise<BoardCommentItem> {
  const res = await apiRequest(`/feedback/${postId}/comments/${commentId}`, {
    method: 'PATCH',
    body: { body },
    schema: singleBoardCommentResponseSchema,
  });
  return res.data;
}

export async function deleteBoardComment(
  postId: string,
  commentId: string,
): Promise<{ id: string }> {
  const res = await apiRequest(`/feedback/${postId}/comments/${commentId}`, {
    method: 'DELETE',
    schema: deleteIdResponseSchema,
  });
  return res.data;
}
