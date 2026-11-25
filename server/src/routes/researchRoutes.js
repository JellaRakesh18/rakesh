import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { researchRateLimiter } from '../middleware/rateLimitMiddleware.js';
import {
  generatePlan,
  executeResearch,
  getResearchHistory,
  getResearchSessionById,
  streamResearchSession,
  pauseResearch,
  resumeResearch,
  cancelResearch,
  approvePendingAction,
  deleteResearchSession,
  askFollowUp,
} from '../controllers/researchController.js';

const router = Router();

router.use(requireAuth);

router.post('/plan', researchRateLimiter, generatePlan);
router.post('/execute', researchRateLimiter, executeResearch);
router.get('/history', getResearchHistory);
router.get('/:id', getResearchSessionById);
router.get('/:id/stream', streamResearchSession);
router.post('/:id/pause', pauseResearch);
router.post('/:id/resume', resumeResearch);
router.post('/:id/cancel', cancelResearch);
router.post('/:id/approve', approvePendingAction);
router.delete('/:id', deleteResearchSession);
router.post('/:id/followup', researchRateLimiter, askFollowUp);

export default router;
