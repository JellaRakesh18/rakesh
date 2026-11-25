import { ZodError } from 'zod';
import multer from 'multer';

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
  });
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'Uploaded file exceeds the maximum allowed size.',
        code: 'FILE_TOO_LARGE',
      });
    }
    return res.status(400).json({
      error: `Upload error: ${err.message}`,
      code: 'UPLOAD_ERROR',
    });
  }

  if (err?.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid resource identifier.',
      code: 'INVALID_ID',
    });
  }

  if (err?.code === 11000) {
    return res.status(409).json({
      error: 'A record with this unique value already exists.',
      code: 'DUPLICATE_KEY',
    });
  }

  const status = err.statusCode || 500;
  const message =
    status >= 500 && process.env.NODE_ENV === 'production' && !err.exposeInProd
      ? 'An unexpected server error occurred.'
      : err.message || 'An unexpected server error occurred.';

  if (status >= 500) {
    console.error('[error]', err.message);
  }

  return res.status(status).json({
    error: message,
    code: err.code || 'SERVER_ERROR',
  });
}
