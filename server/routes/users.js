import { Router } from 'express';
import { store } from '../db/index.js';
import { asyncHandler } from '../middleware/errors.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const users = await store.listUsers();
    res.json({ users });
  })
);

export default router;
