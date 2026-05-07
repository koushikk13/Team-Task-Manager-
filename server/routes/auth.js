import { Router } from 'express';
import { z } from 'zod';
import { store } from '../db/index.js';
import { ApiError, asyncHandler } from '../middleware/errors.js';
import { requireAuth, signToken, toPublicUser } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { emailSchema, parseBody } from '../utils/validation.js';

const router = Router();

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters.').max(100),
  requestedRole: z.enum(['admin', 'member']).default('member'),
  adminCode: z.string().trim().optional()
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.')
});

router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const body = parseBody(signupSchema, req.body);
    const existing = await store.findUserByEmail(body.email);
    if (existing) throw new ApiError(409, 'An account with this email already exists.');

    const userCount = await store.countUsers();
    let role = userCount === 0 ? 'admin' : 'member';

    if (body.requestedRole === 'admin' && userCount > 0) {
      if (!process.env.ADMIN_SIGNUP_CODE || body.adminCode !== process.env.ADMIN_SIGNUP_CODE) {
        throw new ApiError(403, 'A valid admin signup code is required.');
      }
      role = 'admin';
    }

    const user = await store.createUser({
      name: body.name,
      email: body.email,
      passwordHash: await hashPassword(body.password),
      role
    });

    res.status(201).json({
      token: signToken(user),
      user: toPublicUser(user)
    });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = parseBody(loginSchema, req.body);
    const user = await store.findUserByEmail(body.email);
    if (!user || !(await verifyPassword(body.password, user.password_hash))) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    res.json({
      token: signToken(user),
      user: toPublicUser(user)
    });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

export default router;
