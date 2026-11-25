import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    let token = '';
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.query && typeof req.query.token === 'string' && req.path.endsWith('/stream')) {
      // Allow token query param strictly for EventSource SSE streams where custom headers are unsupported
      token = req.query.token.trim();
    }

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required. Please log in.',
        code: 'AUTH_REQUIRED',
      });
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    if (decoded.type === 'refresh') {
      return res.status(401).json({
        error: 'Refresh token cannot be used directly for API access.',
        code: 'INVALID_TOKEN_TYPE',
      });
    }

    const user = await User.findById(decoded.sub).select('-passwordHash');
    if (!user) {
      return res.status(401).json({
        error: 'User account no longer exists.',
        code: 'USER_NOT_FOUND',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Session expired. Refreshing authentication...',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({
      error: 'Invalid authentication token.',
      code: 'INVALID_TOKEN',
    });
  }
}
