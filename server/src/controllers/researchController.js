import { ResearchSession } from '../models/ResearchSession.js';
import { Document } from '../models/Document.js';
import { ToolLog } from '../models/ToolLog.js';
import { ResearchConversation } from '../models/ResearchConversation.js';
import { AppError } from '../middleware/errorMiddleware.js';
import {
  createPlanSchema,
  executeResearchSchema,
  followUpSchema,
  objectIdSchema,
  approvalDecisionSchema,
} from '../validators/researchValidators.js';
import { createAutonomousResearchPlan } from '../agent/researchPlanner.js';
import {
  startResearchRun,
  pauseResearchRun,
  resumeResearchRun,
  cancelResearchRun,
  resolveApprovalRun,
  subscribeToSessionStream,
} from '../agent/sessionRunner.js';
import { generateFollowUpResponse } from '../services/geminiService.js';

export async function generatePlan(req, res, next) {
  try {
    const data = createPlanSchema.parse(req.body);

    let documents = [];
    if (data.documentIds.length > 0) {
      documents = await Document.find({
        _id: { $in: data.documentIds },
        userId: req.user._id,
      })
        .select('_id filename fileMetadata')
        .lean();

      if (documents.length !== data.documentIds.length) {
        throw new AppError(
          'One or more selected documents were not found or do not belong to you.',
          404,
          'DOCUMENT_NOT_FOUND'
        );
      }
    }

    const generated = await createAutonomousResearchPlan({
      question: data.question,
      depth: data.depth,
      documents,
    });

    const session = await ResearchSession.create({
      userId: req.user._id,
      title: generated.title,
      question: data.question,
      depth: data.depth,
      subQuestions: generated.subQuestions,
      plan: generated.plan,
      steps: [],
      status: 'planned',
      attachedDocumentIds: documents.map((d) => d._id),
    });

    return res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
}

export async function executeResearch(req, res, next) {
  try {
    const data = executeResearchSchema.parse(req.body);
    let session;

    const normalizedPlan = data.plan.map((step, idx) => ({
      stepId: step.stepId,
      order: idx + 1,
      title: step.title,
      description: step.description || '',
      toolHint: step.toolHint || 'webSearch',
      status: 'pending',
      resultSummary: '',
      error: '',
    }));

    if (data.sessionId) {
      session = await ResearchSession.findOne({
        _id: data.sessionId,
        userId: req.user._id,
      });
      if (!session) {
        throw new AppError('Research session not found.', 404, 'SESSION_NOT_FOUND');
      }
      if (session.status === 'running') {
        throw new AppError('This research session is already running.', 409, 'ALREADY_RUNNING');
      }

      if (data.question) session.question = data.question;
      if (data.depth) session.depth = data.depth;
      if (data.documentIds) session.attachedDocumentIds = data.documentIds;
      session.plan = normalizedPlan;
      session.steps = [];
      session.report = null;
      session.sources = [];
      session.conflicts = [];
      session.errorMessage = '';
      session.requireApprovalForExternalTools = data.requireApprovalForExternalTools;
      session.status = 'running';
      await session.save();
    } else {
      if (!data.question) {
        throw new AppError('question is required when creating a new research execution.', 400);
      }
      session = await ResearchSession.create({
        userId: req.user._id,
        title: data.question.slice(0, 120),
        question: data.question,
        depth: data.depth || 'standard',
        subQuestions: [],
        plan: normalizedPlan,
        steps: [],
        status: 'running',
        attachedDocumentIds: data.documentIds || [],
        requireApprovalForExternalTools: data.requireApprovalForExternalTools,
      });
    }

    startResearchRun({ sessionId: session._id, userId: req.user._id });

    return res.status(202).json({
      message: 'Autonomous research execution started.',
      session,
    });
  } catch (err) {
    next(err);
  }
}

export async function getResearchHistory(req, res, next) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';

    const filter = { userId: req.user._id };
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { question: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [sessions, totalToolCalls, totalDocuments] = await Promise.all([
      ResearchSession.find(filter)
        .select('-report.detailedExplanations -sources.snippet')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      ToolLog.countDocuments({ userId: req.user._id }),
      Document.countDocuments({ userId: req.user._id }),
    ]);

    const stats = {
      totalSessions: sessions.length,
      completed: sessions.filter((s) => s.status === 'completed').length,
      running: sessions.filter((s) => ['running', 'paused', 'awaiting_approval'].includes(s.status)).length,
      failed: sessions.filter((s) => s.status === 'failed').length,
      totalToolCalls,
      totalDocuments,
    };

    return res.json({ sessions, stats });
  } catch (err) {
    next(err);
  }
}

export async function getResearchSessionById(req, res, next) {
  try {
    const id = objectIdSchema.parse(req.params.id);
    const session = await ResearchSession.findOne({ _id: id, userId: req.user._id })
      .populate('attachedDocumentIds', 'filename fileMetadata createdAt')
      .lean();

    if (!session) {
      throw new AppError('Research session not found.', 404, 'SESSION_NOT_FOUND');
    }

    const [toolLogs, conversation] = await Promise.all([
      ToolLog.find({ researchSessionId: id, userId: req.user._id })
        .sort({ timestamp: 1 })
        .lean(),
      ResearchConversation.findOne({ researchSessionId: id, userId: req.user._id }).lean(),
    ]);

    return res.json({
      session,
      toolLogs,
      conversation: conversation || { messages: [] },
    });
  } catch (err) {
    next(err);
  }
}

export async function streamResearchSession(req, res, next) {
  try {
    const id = objectIdSchema.parse(req.params.id);
    const session = await ResearchSession.findOne({ _id: id, userId: req.user._id }).lean();
    if (!session) {
      throw new AppError('Research session not found.', 404, 'SESSION_NOT_FOUND');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const toolLogs = await ToolLog.find({ researchSessionId: id, userId: req.user._id })
      .sort({ timestamp: 1 })
      .lean();

    res.write(`event: snapshot\ndata: ${JSON.stringify({ session, toolLogs })}\n\n`);

    const unsubscribe = subscribeToSessionStream(id, res);
    const heartbeat = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  } catch (err) {
    next(err);
  }
}

export async function pauseResearch(req, res, next) {
  try {
    const id = objectIdSchema.parse(req.params.id);
    const session = await pauseResearchRun(id, req.user._id);
    if (!session) {
      throw new AppError('No running research session found to pause.', 404, 'CANNOT_PAUSE');
    }
    return res.json({ session });
  } catch (err) {
    next(err);
  }
}

export async function resumeResearch(req, res, next) {
  try {
    const id = objectIdSchema.parse(req.params.id);
    const session = await resumeResearchRun(id, req.user._id);
    if (!session) {
      throw new AppError('No paused research session found to resume.', 404, 'CANNOT_RESUME');
    }
    return res.json({ session });
  } catch (err) {
    next(err);
  }
}

export async function cancelResearch(req, res, next) {
  try {
    const id = objectIdSchema.parse(req.params.id);
    const session = await cancelResearchRun(id, req.user._id);
    if (!session) {
      throw new AppError('No active research session found to cancel.', 404, 'CANNOT_CANCEL');
    }
    return res.json({ session });
  } catch (err) {
    next(err);
  }
}

export async function approvePendingAction(req, res, next) {
  try {
    const id = objectIdSchema.parse(req.params.id);
    const { approved } = approvalDecisionSchema.parse(req.body);
    const session = await ResearchSession.findOne({ _id: id, userId: req.user._id });
    if (!session) {
      throw new AppError('Research session not found.', 404, 'SESSION_NOT_FOUND');
    }
    const resolved = resolveApprovalRun(id, approved);
    if (!resolved) {
      throw new AppError('No pending approval request for this session.', 409, 'NO_PENDING_APPROVAL');
    }
    return res.json({ message: approved ? 'Action approved' : 'Action rejected', approved });
  } catch (err) {
    next(err);
  }
}

export async function deleteResearchSession(req, res, next) {
  try {
    const id = objectIdSchema.parse(req.params.id);
    const session = await ResearchSession.findOne({ _id: id, userId: req.user._id });
    if (!session) {
      throw new AppError('Research session not found.', 404, 'SESSION_NOT_FOUND');
    }

    if (['running', 'paused', 'awaiting_approval'].includes(session.status)) {
      await cancelResearchRun(id, req.user._id);
    }

    await Promise.all([
      ResearchSession.deleteOne({ _id: id, userId: req.user._id }),
      ToolLog.deleteMany({ researchSessionId: id, userId: req.user._id }),
      ResearchConversation.deleteOne({ researchSessionId: id, userId: req.user._id }),
    ]);

    return res.json({ message: 'Research session deleted.', id });
  } catch (err) {
    next(err);
  }
}

export async function askFollowUp(req, res, next) {
  try {
    const id = objectIdSchema.parse(req.params.id);
    const { question } = followUpSchema.parse(req.body);

    const session = await ResearchSession.findOne({ _id: id, userId: req.user._id }).lean();
    if (!session) {
      throw new AppError('Research session not found.', 404, 'SESSION_NOT_FOUND');
    }
    if (!session.report) {
      throw new AppError(
        'Follow-up chat is available once the research report is generated.',
        400,
        'REPORT_NOT_READY'
      );
    }

    let conversation = await ResearchConversation.findOne({
      researchSessionId: id,
      userId: req.user._id,
    });
    if (!conversation) {
      conversation = await ResearchConversation.create({
        userId: req.user._id,
        researchSessionId: id,
        messages: [],
      });
    }

    const references = session.report.references || session.sources || [];
    const refText = references
      .map((r) => `[${r.id}] ${r.title}${r.url ? ` (${r.url})` : ''}`)
      .join('\n');

    const systemInstruction = `You are the Research Follow-Up Assistant for RESEARCHX AI.
Answer the user's follow-up question strictly grounded in the completed research report and verified references below.
Cite reference IDs like [S1], [S2] inline wherever appropriate.
If the report does not contain enough evidence to answer a point, say so explicitly instead of inventing facts.`;

    const reportContext = `Research Question: ${session.question}
Report Title: ${session.report.title}
Executive Summary: ${session.report.executiveSummary}
Key Findings: ${JSON.stringify(session.report.keyFindings)}
Detailed Explanations: ${JSON.stringify(session.report.detailedExplanations)}
Conflicting Information: ${JSON.stringify(session.report.conflictingInformation)}
Limitations: ${JSON.stringify(session.report.limitations)}
Conclusion: ${session.report.conclusion}

Verified References:
${refText}`;

    const historyContents = [
      { role: 'user', parts: [{ text: `Completed Research Context:\n${reportContext}` }] },
      {
        role: 'model',
        parts: [{ text: 'Understood. I will answer follow-up questions grounded strictly in this report and cite its references.' }],
      },
      ...conversation.messages.slice(-10).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: question }] },
    ];

    const answer = await generateFollowUpResponse({
      systemInstruction,
      contents: historyContents,
    });

    // Extract referenced source IDs [S1], [S2] from the answer
    const citedIds = new Set([...answer.matchAll(/\[(S\d+)\]/g)].map((m) => m[1]));
    const citations = references
      .filter((r) => citedIds.has(r.id))
      .map((r) => ({
        title: `[${r.id}] ${r.title}`,
        url: r.url || '',
        sourceType: r.sourceType || 'web',
      }));

    conversation.messages.push({ role: 'user', content: question, citations: [] });
    conversation.messages.push({ role: 'assistant', content: answer, citations });
    await conversation.save();

    return res.json({
      conversation,
      latestMessage: conversation.messages[conversation.messages.length - 1],
    });
  } catch (err) {
    next(err);
  }
}
