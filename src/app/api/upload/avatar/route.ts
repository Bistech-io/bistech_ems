import { NextResponse, type NextRequest } from 'next/server';
import {
  deleteFromCloudinary,
  getCloudinaryAsset,
  listCloudinaryAssets,
  uploadToCloudinary,
} from '@/lib/cloudinary';

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId')?.trim();

    if (userId) {
      const cleanId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const targetPublicId = `bistech_ems/avatars/avatar_${cleanId}`;

      // 1. Try deterministic user-specific public ID
      const directAsset = await getCloudinaryAsset(targetPublicId);
      if (directAsset) {
        return NextResponse.json({
          success: true,
          url: directAsset.url,
          publicId: directAsset.publicId,
        });
      }

      // 2. Graceful fallback for avatars uploaded prior to deterministic ID naming
      const assets = await listCloudinaryAssets('bistech_ems/avatars', 10);
      const matched =
        assets.find((a) => a.publicId === targetPublicId) ??
        assets.find((a) => !a.publicId.includes('avatar_')) ??
        assets[0];

      if (matched) {
        return NextResponse.json({
          success: true,
          url: matched.url,
          publicId: matched.publicId,
        });
      }

      return NextResponse.json({
        success: true,
        url: null,
        publicId: null,
      });
    }

    // No userId provided; attempt to return the latest avatar in folder if one exists
    const assets = await listCloudinaryAssets('bistech_ems/avatars', 1);
    if (assets.length > 0) {
      return NextResponse.json({
        success: true,
        url: assets[0].url,
        publicId: assets[0].publicId,
      });
    }

    return NextResponse.json({
      success: true,
      url: null,
      publicId: null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch avatar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const rawUserId = formData.get('userId');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Please upload a JPG, PNG, or WebP image' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: 'Image size must be 2 MB or smaller' },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let publicId: string | undefined;
    if (typeof rawUserId === 'string' && rawUserId.trim()) {
      const cleanId = rawUserId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      publicId = `avatar_${cleanId}`;
    }

    const result = await uploadToCloudinary(buffer, file.type, {
      folder: 'bistech_ems/avatars',
      publicId,
      overwrite: true,
      invalidate: true,
    });

    return NextResponse.json({
      success: true,
      url: result.url,
      publicId: result.publicId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to upload photo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const publicId = body?.publicId;

    if (!publicId || typeof publicId !== 'string') {
      return NextResponse.json(
        { error: 'publicId is required' },
        { status: 400 },
      );
    }

    // Safety check: only allow deleting assets from bistech_ems folder
    if (!publicId.startsWith('bistech_ems/')) {
      return NextResponse.json(
        { error: 'Invalid publicId' },
        { status: 400 },
      );
    }

    await deleteFromCloudinary(publicId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete photo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

