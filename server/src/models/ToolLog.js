import mongoose from 'mongoose';

const toolLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    researchSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResearchSession',
      required: true,
      index: true,
    },
    stepNumber: {
      type: Number,
      required: true,
    },
    agentAction: {
      type: String,
      required: true,
    },
    toolName: {
      type: String,
      required: true,
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    outputSummary: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['running', 'success', 'failed', 'retried', 'rejected'],
      default: 'running',
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    error: {
      type: String,
      default: '',
    },
    duration: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

toolLogSchema.index({ researchSessionId: 1, timestamp: 1 });

export const ToolLog = mongoose.model('ToolLog', toolLogSchema);
