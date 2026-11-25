import mongoose from 'mongoose';

const citationRefSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    url: { type: String, default: '' },
    sourceType: { type: String, default: 'web' },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    citations: [citationRefSchema],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const researchConversationSchema = new mongoose.Schema(
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
    messages: [messageSchema],
  },
  {
    timestamps: true,
  }
);

researchConversationSchema.index({ userId: 1, researchSessionId: 1 }, { unique: true });

export const ResearchConversation = mongoose.model('ResearchConversation', researchConversationSchema);
