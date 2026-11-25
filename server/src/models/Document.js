import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    extractedText: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      default: '',
    },
    fileMetadata: {
      mimeType: { type: String, default: 'application/pdf' },
      sizeBytes: { type: Number, required: true },
      pageCount: { type: Number, default: 1 },
      wordCount: { type: Number, default: 0 },
      sha256: { type: String, default: '' },
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

documentSchema.index({ userId: 1, createdAt: -1 });

export const Document = mongoose.model('Document', documentSchema);
