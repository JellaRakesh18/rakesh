import mongoose from 'mongoose';

const planStepSchema = new mongoose.Schema(
  {
    stepId: { type: String, required: true },
    order: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    toolHint: {
      type: String,
      enum: ['webSearch', 'documentReader', 'knowledgeBaseSearch', 'calculator', 'synthesis'],
      default: 'webSearch',
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
      default: 'pending',
    },
    resultSummary: { type: String, default: '' },
    error: { type: String, default: '' },
  },
  { _id: false }
);

const executionStepSchema = new mongoose.Schema(
  {
    stepNumber: { type: Number, required: true },
    title: { type: String, required: true },
    actionSummary: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    durationMs: { type: Number, default: 0 },
    error: { type: String, default: '' },
  },
  { _id: false }
);

const sourceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    url: { type: String, default: '' },
    snippet: { type: String, default: '' },
    publishedDate: { type: String, default: '' },
    sourceType: {
      type: String,
      enum: ['web', 'document', 'knowledge_base', 'calculation'],
      required: true,
    },
  },
  { _id: false }
);

const conflictSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    claimA: { type: String, required: true },
    sourceA: { type: String, required: true },
    claimB: { type: String, required: true },
    sourceB: { type: String, required: true },
    explanation: { type: String, required: true },
  },
  { _id: false }
);

const researchSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 220,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    depth: {
      type: String,
      enum: ['quick', 'standard', 'deep'],
      default: 'standard',
    },
    subQuestions: [{ type: String }],
    plan: [planStepSchema],
    steps: [executionStepSchema],
    status: {
      type: String,
      enum: ['planned', 'running', 'paused', 'awaiting_approval', 'completed', 'failed', 'cancelled'],
      default: 'planned',
      index: true,
    },
    attachedDocumentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
    ],
    requireApprovalForExternalTools: {
      type: Boolean,
      default: false,
    },
    pendingApproval: {
      requested: { type: Boolean, default: false },
      actionType: { type: String, default: '' },
      toolName: { type: String, default: '' },
      reason: { type: String, default: '' },
      inputSummary: { type: String, default: '' },
      decision: {
        type: String,
        enum: ['pending', 'approved', 'rejected', null],
        default: null,
      },
    },
    report: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    sources: [sourceSchema],
    conflicts: [conflictSchema],
    metrics: {
      totalIterations: { type: Number, default: 0 },
      totalToolCalls: { type: Number, default: 0 },
      failedToolCalls: { type: Number, default: 0 },
      durationMs: { type: Number, default: 0 },
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

researchSessionSchema.index({ userId: 1, createdAt: -1 });

export const ResearchSession = mongoose.model('ResearchSession', researchSessionSchema);
