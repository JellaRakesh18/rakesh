import { Document } from '../models/Document.js';
import { ResearchSession } from '../models/ResearchSession.js';
import { knowledgeBaseSearchInputSchema } from '../validators/toolValidators.js';
import { sanitizeUntrustedText } from '../services/pdfService.js';

export const knowledgeBaseSearchDeclaration = {
  name: 'knowledgeBaseSearch',
  description:
    'Search the user’s personal knowledge base across previously completed research reports and uploaded PDF documents.',
  parameters: {
    type: 'OBJECT',
    properties: {
      query: {
        type: 'STRING',
        description: 'Topic or keywords to search in prior research and uploaded documents.',
      },
      limit: {
        type: 'INTEGER',
        description: 'Maximum results to return (1-10, default 5).',
      },
    },
    required: ['query'],
  },
};

function scoreTextMatch(text, terms) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    const matches = lower.split(term).length - 1;
    score += Math.min(matches, 5);
  }
  return score;
}

export async function runKnowledgeBaseSearch(rawArgs, context) {
  const args = knowledgeBaseSearchInputSchema.parse(rawArgs);
  const terms = args.query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const [docs, sessions] = await Promise.all([
    Document.find({ userId: context.userId })
      .select('filename summary extractedText createdAt')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(),
    ResearchSession.find({
      userId: context.userId,
      status: 'completed',
      _id: { $ne: context.researchSessionId },
    })
      .select('title question report.executiveSummary report.conclusion createdAt')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(),
  ]);

  const matches = [];

  for (const doc of docs) {
    const combined = `${doc.filename}\n${doc.extractedText || ''}`;
    const score = terms.length > 0 ? scoreTextMatch(combined, terms) : 1;
    if (score > 0) {
      matches.push({
        type: 'uploaded_document',
        id: doc._id.toString(),
        title: doc.filename,
        score,
        snippet: sanitizeUntrustedText(doc.summary || doc.extractedText || '').slice(0, 600),
        createdAt: doc.createdAt,
      });
    }
  }

  for (const session of sessions) {
    const summaryText = `${session.title}\n${session.question}\n${
      session.report?.executiveSummary || ''
    }\n${session.report?.conclusion || ''}`;
    const score = terms.length > 0 ? scoreTextMatch(summaryText, terms) : 1;
    if (score > 0) {
      matches.push({
        type: 'prior_research',
        id: session._id.toString(),
        title: session.title,
        score,
        snippet: sanitizeUntrustedText(
          session.report?.executiveSummary || session.question
        ).slice(0, 600),
        createdAt: session.createdAt,
      });
    }
  }

  const topMatches = matches.sort((a, b) => b.score - a.score).slice(0, args.limit);

  const sources = topMatches.map((m) => ({
    id: `kb-${m.id}`,
    title: `Knowledge Base (${m.type === 'uploaded_document' ? 'PDF' : 'Past Research'}): ${m.title}`,
    url: m.type === 'prior_research' ? `/reports/${m.id}` : '',
    snippet: m.snippet,
    publishedDate: m.createdAt ? new Date(m.createdAt).toISOString().slice(0, 10) : '',
    sourceType: 'knowledge_base',
  }));

  return {
    query: args.query,
    matchCount: topMatches.length,
    matches: topMatches,
    message:
      topMatches.length === 0
        ? 'No relevant records found in your personal knowledge base.'
        : undefined,
    sources,
  };
}
