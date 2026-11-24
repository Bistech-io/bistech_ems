// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  deleteFromCloudinary,
  getCloudinaryAsset,
  listCloudinaryAssets,
  parseCloudinaryUrl,
  uploadToCloudinary,
} from '@/lib/cloudinary';
import { DELETE, GET, POST } from '@/app/api/upload/avatar/route';

describe('Cloudinary Utility & Avatar API', () => {
  const originalEnv = process.env.CLOUDINARY_URL;
  const mockUrl =
    'cloudinary://534931377751574:1FgxbdHEhZLpWgMk98kp_dhv3Gs@bwr0yh78';

  beforeEach(() => {
    process.env.CLOUDINARY_URL = mockUrl;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.CLOUDINARY_URL = originalEnv;
  });

  describe('parseCloudinaryUrl', () => {
    it('parses credentials from CLOUDINARY_URL correctly', () => {
      const config = parseCloudinaryUrl(mockUrl);
      expect(config.cloudName).toBe('bwr0yh78');
      expect(config.apiKey).toBe('534931377751574');
      expect(config.apiSecret).toBe('1FgxbdHEhZLpWgMk98kp_dhv3Gs');
    });

    it('throws when CLOUDINARY_URL is missing', () => {
      delete process.env.CLOUDINARY_URL;
      expect(() => parseCloudinaryUrl()).toThrow('CLOUDINARY_URL environment variable is not set');
    });

    it('throws when CLOUDINARY_URL is malformed', () => {
      expect(() => parseCloudinaryUrl('invalid-url')).toThrow(/Failed to parse CLOUDINARY_URL|Invalid CLOUDINARY_URL/);
    });
  });

  describe('uploadToCloudinary', () => {
    it('sends signed upload request and returns response', async () => {
      const mockResponse = {
        secure_url: 'https://res.cloudinary.com/bwr0yh78/image/upload/v123/avatar.png',
        public_id: 'bistech_ems/avatars/avatar123',
        format: 'png',
        width: 200,
        height: 200,
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const buffer = Buffer.from('fake-image-bytes');
      const result = await uploadToCloudinary(buffer, 'image/png');

      expect(result.url).toBe(mockResponse.secure_url);
      expect(result.publicId).toBe(mockResponse.public_id);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.cloudinary.com/v1_1/bwr0yh78/image/upload',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('throws error when Cloudinary returns failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid image format' } }),
      } as Response);

      const buffer = Buffer.from('fake-image-bytes');
      await expect(uploadToCloudinary(buffer, 'image/png')).rejects.toThrow(
        'Invalid image format',
      );
    });
  });

  describe('deleteFromCloudinary', () => {
    it('sends signed destroy request and returns ok status', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'ok' }),
      } as Response);

      const res = await deleteFromCloudinary('bistech_ems/avatars/avatar123');
      expect(res).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.cloudinary.com/v1_1/bwr0yh78/image/destroy',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('getCloudinaryAsset', () => {
    it('returns asset data when asset is found', async () => {
      const mockAsset = {
        secure_url: 'https://res.cloudinary.com/bwr0yh78/image/upload/v123/avatar.png',
        public_id: 'bistech_ems/avatars/avatar123',
        format: 'png',
        bytes: 1024,
        width: 200,
        height: 200,
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAsset,
      } as Response);

      const result = await getCloudinaryAsset('bistech_ems/avatars/avatar123');
      expect(result).not.toBeNull();
      expect(result?.url).toBe(mockAsset.secure_url);
      expect(result?.publicId).toBe(mockAsset.public_id);
    });

    it('returns null when asset is not found (404)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { message: 'Resource not found' } }),
      } as Response);

      const result = await getCloudinaryAsset('bistech_ems/avatars/non_existent');
      expect(result).toBeNull();
    });
  });

  describe('listCloudinaryAssets', () => {
    it('returns mapped array of assets under prefix', async () => {
      const mockResources = {
        resources: [
          {
            secure_url: 'https://res.cloudinary.com/bwr0yh78/image/upload/v123/avatar1.png',
            public_id: 'bistech_ems/avatars/avatar1',
          },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResources,
      } as Response);

      const list = await listCloudinaryAssets('bistech_ems/avatars');
      expect(list).toHaveLength(1);
      expect(list[0].publicId).toBe('bistech_ems/avatars/avatar1');
    });

    it('returns empty array when Cloudinary responds with error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      const list = await listCloudinaryAssets('bistech_ems/avatars');
      expect(list).toEqual([]);
    });
  });

  describe('GET /api/upload/avatar', () => {
    it('returns user-specific avatar when asset exists', async () => {
      const mockAsset = {
        secure_url: 'https://res.cloudinary.com/bwr0yh78/image/upload/v123/avatar_u1.png',
        public_id: 'bistech_ems/avatars/avatar_u1',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAsset,
      } as Response);

      const request = new NextRequest(
        'http://localhost:3000/api/upload/avatar?userId=u1',
      );
      const res = await GET(request);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.url).toBe(mockAsset.secure_url);
      expect(data.publicId).toBe(mockAsset.public_id);
    });

    it('returns null url when user has no avatar and folder is empty', async () => {
      // 1. Direct asset 404
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({ error: { message: 'Not found' } }),
        } as Response)
        // 2. list assets empty
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ resources: [] }),
        } as Response);

      const request = new NextRequest(
        'http://localhost:3000/api/upload/avatar?userId=no_avatar_user',
      );
      const res = await GET(request);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.url).toBeNull();
      expect(data.publicId).toBeNull();
    });

    it('returns fallback asset when direct avatar is 404 but existing unassigned avatar exists', async () => {
      const fallbackAsset = {
        secure_url: 'https://res.cloudinary.com/bwr0yh78/image/upload/v123/mrkkru3bekwf0njf3uu8.jpg',
        public_id: 'bistech_ems/avatars/mrkkru3bekwf0njf3uu8',
      };

      // 1. Direct asset 404
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({ error: { message: 'Not found' } }),
        } as Response)
        // 2. list assets returns fallback
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ resources: [fallbackAsset] }),
        } as Response);

      const request = new NextRequest(
        'http://localhost:3000/api/upload/avatar?userId=legacy_user',
      );
      const res = await GET(request);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.url).toBe(fallbackAsset.secure_url);
      expect(data.publicId).toBe(fallbackAsset.public_id);
    });
  });

  describe('POST /api/upload/avatar', () => {
    it('returns 400 when no file is uploaded', async () => {
      const formData = new FormData();
      const request = new NextRequest('http://localhost:3000/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });

      const res = await POST(request);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('No image file provided');
    });

    it('returns 400 for unsupported file MIME type', async () => {
      const formData = new FormData();
      const file = new File(['dummy content'], 'document.pdf', {
        type: 'application/pdf',
      });
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });

      const res = await POST(request);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Please upload a JPG, PNG, or WebP image');
    });

    it('returns 400 when file exceeds 2 MB', async () => {
      const largeContent = new Uint8Array(2 * 1024 * 1024 + 10);
      const formData = new FormData();
      const file = new File([largeContent], 'heavy.png', {
        type: 'image/png',
      });
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });

      const res = await POST(request);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Image size must be 2 MB or smaller');
    });

    it('successfully uploads valid image file and returns URL', async () => {
      const mockResponse = {
        secure_url: 'https://res.cloudinary.com/bwr0yh78/image/upload/v123/avatar.png',
        public_id: 'bistech_ems/avatars/avatar123',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const formData = new FormData();
      const file = new File(['valid-image-bytes'], 'avatar.png', {
        type: 'image/png',
      });
      formData.append('file', file);

      const request = new NextRequest('http://localhost:3000/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });

      const res = await POST(request);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.url).toBe(mockResponse.secure_url);
      expect(data.publicId).toBe(mockResponse.public_id);
    });
  });

  describe('DELETE /api/upload/avatar', () => {
    it('returns 400 when publicId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/upload/avatar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const res = await DELETE(request);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('publicId is required');
    });

    it('returns 400 when publicId does not belong to bistech_ems folder', async () => {
      const request = new NextRequest('http://localhost:3000/api/upload/avatar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: 'other_folder/hack' }),
      });

      const res = await DELETE(request);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid publicId');
    });

    it('successfully deletes asset with valid publicId', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'ok' }),
      } as Response);

      const request = new NextRequest('http://localhost:3000/api/upload/avatar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: 'bistech_ems/avatars/avatar123' }),
      });

      const res = await DELETE(request);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });
});
