import { NextResponse, type NextRequest } from 'next/server';
import { deleteFromCloudinary, uploadToCloudinary } from '@/lib/cloudinary';

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

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

    const result = await uploadToCloudinary(buffer, file.type, {
      folder: 'bistech_ems/avatars',
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

