import * as Minio from 'minio';
import * as path from 'path';

const ENDPOINT = process.env.MINIO_ENDPOINT ?? 'mo-db.zenova.services';
const BUCKET = process.env.MINIO_BUCKET ?? 'kadehub';
const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.pdf']);

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png',  '.webp': 'image/webp',
  '.gif': 'image/gif',  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

const minioClient = new Minio.Client({
  endPoint: ENDPOINT,
  port: 443,
  useSSL: true,
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

// Ensure bucket exists and is publicly readable — called once on app start
export async function ensurePublicBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET);
    if (!exists) await minioClient.makeBucket(BUCKET, 'us-east-1');

    const policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${BUCKET}/*`],
      }],
    });
    await minioClient.setBucketPolicy(BUCKET, policy);
  } catch (e) {
    console.warn('[MinIO] Could not set bucket policy:', (e as Error).message);
  }
}

export async function uploadToCloudinary(buffer: Buffer, folder: string, filename?: string): Promise<string> {
  const rawExt = filename ? path.extname(filename).toLowerCase() : '.jpg';
  const ext = ALLOWED_EXTS.has(rawExt) ? rawExt : '.jpg';

  // Strip bucket name prefix from folder if accidentally included
  const cleanFolder = folder.replace(new RegExp(`^${BUCKET}/?`), '').replace(/\/$/, '');
  const objectName = `${cleanFolder}/${Date.now()}${ext}`;

  await minioClient.putObject(BUCKET, objectName, buffer, buffer.length, {
    'Content-Type': MIME[ext] ?? 'image/jpeg',
  });

  return `https://${ENDPOINT}/${BUCKET}/${objectName}`;
}
