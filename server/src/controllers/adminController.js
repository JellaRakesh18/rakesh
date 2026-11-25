import { User } from '../models/User.js';
import { ResearchSession } from '../models/ResearchSession.js';
import { ToolLog } from '../models/ToolLog.js';
import { Document } from '../models/Document.js';

export async function getAdminOverview(_req, res, next) {
  try {
    const [
      totalUsers,
      activeUsers,
      totalSessions,
      completedSessions,
      failedSessions,
      totalToolCalls,
      failedToolCalls,
      totalDocuments,
      toolBreakdown,
      recentToolErrors,
    ] = await Promise.all([
      User.countDocuments(),
      ResearchSession.distinct('userId').then((ids) => ids.length),
      ResearchSession.countDocuments(),
      ResearchSession.countDocuments({ status: 'completed' }),
      ResearchSession.countDocuments({ status: 'failed' }),
      ToolLog.countDocuments(),
      ToolLog.countDocuments({ status: 'failed' }),
      Document.countDocuments(),
      ToolLog.aggregate([
        {
          $group: {
            _id: '$toolName',
            total: { $sum: 1 },
            failed: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
            avgDurationMs: { $avg: '$duration' },
          },
        },
        { $sort: { total: -1 } },
      ]),
      ToolLog.find({ status: 'failed' })
        .sort({ timestamp: -1 })
        .limit(10)
        .select('toolName agentAction error retryCount timestamp')
        .lean(),
    ]);

    return res.json({
      stats: {
        totalUsers,
        activeUsers,
        totalSessions,
        completedSessions,
        failedSessions,
        totalToolCalls,
        failedToolCalls,
        totalDocuments,
      },
      toolBreakdown,
      recentToolErrors,
    });
  } catch (err) {
    next(err);
  }
}
