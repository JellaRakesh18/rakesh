import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from './errorMiddleware.js';

const storage = multer.memoryStorage();

export const uploadPdfMiddleware = multer({
  storage,
  limits: {
    fileSize: env.maxUploadSizeMb * 1024 * 1024,
    files: 1,
  },
  fileFilter(_req, file, cb) {
    const isPdfMime = file.mimetype === 'application/pdf';
    const isPdfExt = file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdfMime && !isPdfExt) {
      return cb(new AppError('Only valid PDF files (.pdf) are allowed.', 400, 'INVALID_FILE_TYPE'));
    }
    cb(null, true);
  },
}).single('file');
