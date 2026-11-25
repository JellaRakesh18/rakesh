import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorMiddleware.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from '../validators/authValidators.js';

function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
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
    // First registered user can optionally be promoted or stay standard; keep role 'user' by default
    // unless explicitly promoted in DB. Let's make first user 'admin' ONLY if env.nodeEnv !== 'production'
    // or keep role strictly 'user' and let a seed/script promote admins. Wait: having first user or demo admin
    // is handy, let's keep standard registration strictly 'user' for security!
    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: userCount === 0 ? 'admin' : 'user',
    });

    const token = signToken(user);
    return res.status(201).json({
      token,
      user: user.toJSON(),
    });
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

    const token = signToken(user);
    return res.json({
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
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
