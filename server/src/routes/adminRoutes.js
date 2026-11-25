import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { getAdminOverview } from '../controllers/adminController.js';

const router = Router();

router.get('/overview', requireAuth, requireRole('admin'), getAdminOverview);

export default router;
