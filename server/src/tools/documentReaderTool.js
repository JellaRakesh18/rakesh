import { Document } from '../models/Document.js';
import { documentReaderInputSchema } from '../validators/toolValidators.js';
import { sanitizeUntrustedText } from '../services/pdfService.js';

export const documentReaderDeclaration = {
  name: 'documentReader',
  description:
    'Read extracted text from one of the user’s uploaded PDF documents by documentId. Optionally pass a focus query to extract the most relevant passages.',
  parameters: {
    type: 'OBJECT',
    properties: {
      documentId: {
        type: 'STRING',
        description: 'The 24-character MongoDB ObjectId of the uploaded PDF document.',
      },
      query: {
        type: 'STRING',
        description: 'Optional focus query to locate relevant sections inside long PDFs.',
      },
      maxChars: {
        type: 'INTEGER',
        description: 'Maximum characters to return (500-18000, default 9000).',
      },
    },
    required: ['documentId'],
  },
};

function selectRelevantPassages(fullText, query, maxChars) {
  if (!query || fullText.length <= maxChars) {
    return {
      excerpt: fullText.slice(0, maxChars),
      truncated: fullText.length > maxChars,
    };
  }

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (terms.length === 0) {
    return {
      excerpt: fullText.slice(0, maxChars),
      truncated: fullText.length > maxChars,
    };
  }

  const paragraphs = fullText.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  const scored = paragraphs.map((p, index) => {
    const lower = p.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (lower.includes(term)) score += 1;
    }
    return { index, text: p, score };
  });

  // Always include intro paragraph + highest scoring passages in document order
  const selected = new Set([0]);
  scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 14)
    .forEach((item) => {
      if (item.score > 0) selected.add(item.index);
    });

  const orderedText = paragraphs
    .filter((_, idx) => selected.has(idx))
    .join('\n\n')
    .slice(0, maxChars);

  return {
    excerpt: orderedText || fullText.slice(0, maxChars),
    truncated: fullText.length > orderedText.length,
  };
}

export async function runDocumentReader(rawArgs, context) {
  const args = documentReaderInputSchema.parse(rawArgs);
  const doc = await Document.findOne({
    _id: args.documentId,
    userId: context.userId,
  }).lean();

  if (!doc) {
    const err = new Error(`Document ${args.documentId} was not found or access is denied.`);
    err.nonRetryable = true;
    throw err;
  }

  const cleanText = sanitizeUntrustedText(doc.extractedText);
  const { excerpt, truncated } = selectRelevantPassages(cleanText, args.query, args.maxChars);

  return {
    documentId: doc._id.toString(),
    filename: doc.filename,
    pageCount: doc.fileMetadata?.pageCount || 1,
    wordCount: doc.fileMetadata?.wordCount || 0,
    truncated,
    excerpt,
    sources: [
      {
        id: `doc-${doc._id.toString()}`,
        title: `PDF: ${doc.filename}`,
        url: '',
        snippet: excerpt.slice(0, 400),
        publishedDate: doc.createdAt ? new Date(doc.createdAt).toISOString().slice(0, 10) : '',
        sourceType: 'document',
      },
    ],
  };
}
