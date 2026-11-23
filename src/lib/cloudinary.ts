import crypto from 'node:crypto';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface UploadResult {
  url: string;
  publicId: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
}

/**
 * Parses and validates the CLOUDINARY_URL string:
 * cloudinary://<api_key>:<api_secret>@<cloud_name>
 */
export function parseCloudinaryUrl(url?: string): CloudinaryConfig {
  const envUrl = url ?? process.env.CLOUDINARY_URL;
  if (!envUrl) {
    throw new Error('CLOUDINARY_URL environment variable is not set');
  }

  try {
    const parsed = new URL(envUrl);
    const cloudName = parsed.hostname;
    const apiKey = parsed.username;
    const apiSecret = parsed.password;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Invalid CLOUDINARY_URL format. Expected cloudinary://<api_key>:<api_secret>@<cloud_name>',
      );
    }

    return { cloudName, apiKey, apiSecret };
  } catch (err) {
    throw new Error(`Failed to parse CLOUDINARY_URL: ${(err as Error).message}`);
  }
}

/**
 * Uploads an image buffer directly to Cloudinary using signed upload API.
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer | Uint8Array,
  mimeType: string,
  options: {
    folder?: string;
    publicId?: string;
  } = {},
): Promise<UploadResult> {
  const config = parseCloudinaryUrl();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = options.folder ?? 'bistech_ems/avatars';

  // Build sorted parameters for Cloudinary SHA-1 signature
  const paramsToSign: Record<string, string> = {
    folder,
    timestamp: timestamp.toString(),
  };

  if (options.publicId) {
    paramsToSign.public_id = options.publicId;
  }

  const sortedKeys = Object.keys(paramsToSign).sort();
  const toSign =
    sortedKeys.map((k) => `${k}=${paramsToSign[k]}`).join('&') + config.apiSecret;
  const signature = crypto.createHash('sha1').update(toSign).digest('hex');

  const formData = new FormData();
  const base64Data = `data:${mimeType};base64,${Buffer.from(fileBuffer).toString('base64')}`;
  formData.append('file', base64Data);
  formData.append('api_key', config.apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('folder', folder);
  if (options.publicId) {
    formData.append('public_id', options.publicId);
  }
  formData.append('signature', signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`;
  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    const message =
      data.error?.message || `Cloudinary upload failed with status ${res.status}`;
    throw new Error(message);
  }

  return {
    url: data.secure_url,
    publicId: data.public_id,
    format: data.format,
    bytes: data.bytes,
    width: data.width,
    height: data.height,
  };
}

/**
 * Deletes an uploaded asset from Cloudinary by its public ID.
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  const config = parseCloudinaryUrl();
  const timestamp = Math.floor(Date.now() / 1000);

  const toSign = `public_id=${publicId}&timestamp=${timestamp}${config.apiSecret}`;
  const signature = crypto.createHash('sha1').update(toSign).digest('hex');

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('api_key', config.apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`;
  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  return data.result === 'ok';
}

