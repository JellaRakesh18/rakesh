import { Document } from '../models/Document.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { extractTextFromPdfBuffer } from '../services/pdfService.js';
import { objectIdSchema } from '../validators/researchValidators.js';

export async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError('Please attach a PDF file under the "file" field.', 400, 'FILE_REQUIRED');
    }

    const extracted = await extractTextFromPdfBuffer(req.file.buffer, req.file.originalname);

    const doc = await Document.create({
      userId: req.user._id,
      filename: req.file.originalname,
      extractedText: extracted.extractedText,
      summary: extracted.summary,
      fileMetadata: {
        mimeType: req.file.mimetype || 'application/pdf',
        sizeBytes: req.file.size,
        pageCount: extracted.pageCount,
        wordCount: extracted.wordCount,
        sha256: extracted.sha256,
      },
    });

    return res.status(201).json({
      document: {
        _id: doc._id,
        filename: doc.filename,
        summary: doc.summary,
        fileMetadata: doc.fileMetadata,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listDocuments(req, res, next) {
  try {
    const documents = await Document.find({ userId: req.user._id })
      .select('-extractedText')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ documents });
  } catch (err) {
    next(err);
  }
}

export async function getDocumentById(req, res, next) {
  try {
    const id = objectIdSchema.parse(req.params.id);
    const doc = await Document.findOne({ _id: id, userId: req.user._id }).lean();
    if (!doc) {
      throw new AppError('Document not found or access denied.', 404, 'DOCUMENT_NOT_FOUND');
    }
    return res.json({ document: doc });
  } catch (err) {
    next(err);
  }
}

export async function deleteDocument(req, res, next) {
  try {
    const id = objectIdSchema.parse(req.params.id);
    const deleted = await Document.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!deleted) {
      throw new AppError('Document not found or access denied.', 404, 'DOCUMENT_NOT_FOUND');
    }
    return res.json({ message: 'Document deleted successfully.', id });
  } catch (err) {
    next(err);
  }
}
