import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

interface UploadOptions {
  public_id?: string;
  folder?: string;
}

export const uploadToCloudinary = (
  file: Express.Multer.File,
  options: UploadOptions = {},
): Promise<{ secure_url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result as { secure_url: string; public_id: string });
      },
    );
    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};
