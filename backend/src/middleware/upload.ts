import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { sendError } from '../utils/response';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PROOF_SIZE = 10 * 1024 * 1024; // 10MB

const imageFileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_TYPE'));
  }
};

const proofFileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (ALLOWED_PROOF_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_TYPE'));
  }
};

// Use memory storage - we'll upload to Cloudinary from buffer
const storage = multer.memoryStorage();

export const uploadImages = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE, files: 10 },
  fileFilter: imageFileFilter,
});

export const uploadProof = multer({
  storage,
  limits: { fileSize: MAX_PROOF_SIZE, files: 1 },
  fileFilter: proofFileFilter,
});
