import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export async function uploadToCloudinary(buffer: Buffer, folder: string, filename?: string): Promise<string> {
  // Use Cloudinary when credentials are configured
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder, resource_type: 'image' }, (err, result) => {
          if (err || !result) return reject(err);
          resolve(result.secure_url);
        })
        .end(buffer);
    });
  }

  // Local fallback — save to uploads/ and return a relative URL
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const ext = filename ? path.extname(filename) : '.jpg';
  const name = `${folder.replace(/\//g, '-')}-${Date.now()}${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, name), buffer);
  return `/uploads/${name}`;
}
