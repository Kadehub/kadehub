import * as Minio from 'minio';
import * as path from 'path';

const BUCKET = 'kadehub';
const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);

const minioClient = new Minio.Client({
  endPoint: 'mo-db.zenova.services',
  port: 443,
  useSSL: true,
  accessKey: 'yaodVODDkdfXWxvoCE99',
  secretKey: 'GLAn4TM2MQogyckvW7ZeLEfG0vIaTVE2xo4TwEso',
});

export async function uploadToCloudinary(buffer: Buffer, folder: string, filename?: string): Promise<string> {
  const rawExt = filename ? path.extname(filename).toLowerCase() : '.jpg';
  const ext = ALLOWED_EXTS.has(rawExt) ? rawExt : '.jpg';
  const objectName = `${folder}/${Date.now()}${ext}`;

  await minioClient.putObject(BUCKET, objectName, buffer, buffer.length, { 'Content-Type': `image/${ext.slice(1)}` });

  return `https://mo-db.zenova.services/${BUCKET}/${objectName}`;
}
