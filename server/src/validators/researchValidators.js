import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

export const planStepInputSchema = z.object({
  stepId: z.string().trim().min(1).max(64),
  order: z.number().int().min(1).max(30),
  title: z.string().trim().min(2, 'Step title is too short').max(200),
  description: z.string().trim().max(600).default(''),
  toolHint: z
    .enum(['webSearch', 'documentReader', 'knowledgeBaseSearch', 'calculator', 'synthesis'])
    .default('webSearch'),
});

export const createPlanSchema = z.object({
  question: z
    .string()
    .trim()
    .min(5, 'Research question must be at least 5 characters')
    .max(2000, 'Research question must not exceed 2000 characters'),
  depth: z.enum(['quick', 'standard', 'deep']).default('standard'),
  documentIds: z.array(objectIdSchema).max(20).default([]),
});

export const executeResearchSchema = z.object({
  sessionId: objectIdSchema.optional(),
  question: z
    .string()
    .trim()
    .min(5, 'Research question must be at least 5 characters')
    .max(2000)
    .optional(),
  depth: z.enum(['quick', 'standard', 'deep']).optional(),
  documentIds: z.array(objectIdSchema).max(20).optional(),
  plan: z.array(planStepInputSchema).min(1, 'At least one plan step is required').max(15),
  requireApprovalForExternalTools: z.boolean().default(false),
});

export const followUpSchema = z.object({
  question: z
    .string()
    .trim()
    .min(2, 'Follow-up question must be at least 2 characters')
    .max(1500, 'Follow-up question must not exceed 1500 characters'),
});

export const approvalDecisionSchema = z.object({
  approved: z.boolean(),
});
