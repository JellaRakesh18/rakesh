import { z } from 'zod';

export const webSearchInputSchema = z.object({
  query: z.string().trim().min(2, 'Search query too short').max(300, 'Search query too long'),
  maxResults: z.number().int().min(1).max(8).optional().default(5),
});

export const webSearchOutputSchema = z.object({
  query: z.string(),
  results: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      snippet: z.string(),
      publishedDate: z.string().optional().default(''),
    })
  ),
});

export const documentReaderInputSchema = z.object({
  documentId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'documentId must be a valid 24-char ObjectId'),
  query: z.string().trim().max(300).optional(),
  maxChars: z.number().int().min(500).max(18000).optional().default(9000),
});

export const knowledgeBaseSearchInputSchema = z.object({
  query: z.string().trim().min(2, 'Knowledge base query too short').max(300),
  limit: z.number().int().min(1).max(10).optional().default(5),
});

export const calculatorInputSchema = z.object({
  expression: z
    .string()
    .trim()
    .min(1, 'Expression is required')
    .max(200, 'Expression too long')
    .regex(/^[0-9+\-*/%^().,\s_a-zA-Z]+$/, 'Expression contains disallowed characters'),
});

export const reportSchema = z.object({
  title: z.string().min(3),
  executiveSummary: z.string().min(10),
  methodology: z.string().min(10),
  keyFindings: z.array(
    z.object({
      finding: z.string(),
      confidence: z.enum(['high', 'medium', 'low', 'uncertain']),
      citations: z.array(z.string()).default([]),
    })
  ),
  detailedExplanations: z.array(
    z.object({
      sectionTitle: z.string(),
      content: z.string(),
      citations: z.array(z.string()).default([]),
    })
  ),
  evidenceAndCitations: z.array(
    z.object({
      claim: z.string(),
      sourceIds: z.array(z.string()),
      supportLevel: z.enum(['supported', 'partially_supported', 'unsupported']),
    })
  ),
  conflictingInformation: z.array(
    z.object({
      topic: z.string(),
      claimA: z.string(),
      sourceA: z.string(),
      claimB: z.string(),
      sourceB: z.string(),
      explanation: z.string(),
    })
  ),
  limitations: z.array(z.string()),
  openResearchQuestions: z.array(z.string()),
  conclusion: z.string().min(10),
  references: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      url: z.string().default(''),
      sourceType: z.enum(['web', 'document', 'knowledge_base', 'calculation']),
      publishedDate: z.string().default(''),
    })
  ),
});
