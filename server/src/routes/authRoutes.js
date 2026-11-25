import { Router } from 'express';
import { register, login, getMe, updateMe } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimitMiddleware.js';

const router = Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, updateMe);

export default router;
