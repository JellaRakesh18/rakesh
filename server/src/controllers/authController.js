import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorMiddleware.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  updateProfileSchema,
} from '../validators/authValidators.js';

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      type: 'access',
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      type: 'refresh',
      tokenVersion: user.tokenVersion || 0,
    },
    env.jwtSecret,
    { expiresIn: env.jwtRefreshExpiresIn }
  );
}

function buildAuthPayload(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  return {
    token: accessToken,
    accessToken,
    refreshToken,
    user: user.toJSON(),
  };
}

export async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      throw new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const userCount = await User.countDocuments();
    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: userCount === 0 ? 'admin' : 'user',
    });

    return res.status(201).json(buildAuthPayload(user));
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const user = await User.findOne({ email: data.email });
    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    return res.json(buildAuthPayload(user));
  } catch (err) {
    next(err);
  }
}

export async function refreshSession(req, res, next) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, env.jwtSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Refresh token expired. Please sign in again.', 401, 'REFRESH_EXPIRED');
      }
      throw new AppError('Invalid refresh token.', 401, 'INVALID_REFRESH_TOKEN');
    }

    if (decoded.type !== 'refresh' || !decoded.sub) {
      throw new AppError('Invalid refresh token type.', 401, 'INVALID_REFRESH_TOKEN');
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      throw new AppError('User account no longer exists.', 401, 'USER_NOT_FOUND');
    }

    if ((user.tokenVersion || 0) !== (decoded.tokenVersion || 0)) {
      throw new AppError('Refresh token has been revoked.', 401, 'REFRESH_REVOKED');
    }

    // Issue fresh access token and sliding 90-day refresh token
    return res.json(buildAuthPayload(user));
  } catch (err) {
    next(err);
  }
}

export async function logoutSession(_req, res) {
  return res.json({ message: 'Signed out successfully.' });
}

export async function getMe(req, res) {
  return res.json({ user: req.user.toJSON() });
}

export async function updateMe(req, res, next) {
  try {
    const updates = updateProfileSchema.parse(req.body);
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    if (updates.name) user.name = updates.name;
    if (updates.preferences) {
      user.preferences = {
        ...user.preferences?.toObject?.(),
        ...updates.preferences,
      };
    }

    await user.save();
    return res.json({ user: user.toJSON() });
  } catch (err) {
    next(err);
  }
}
