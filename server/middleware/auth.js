import jwt from 'jsonwebtoken';
import { ApiError } from './errors.js';
import { store } from '../db/index.js';

const jwtSecret = () => process.env.JWT_SECRET || 'development-secret-change-me';

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, 'Authentication required.');

    const payload = jwt.verify(token, jwtSecret());
    const user = await store.findUserById(payload.sub);
    if (!user) throw new ApiError(401, 'Session user no longer exists.');

    req.user = toPublicUser(user);
    next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    next(new ApiError(401, 'Invalid or expired session.'));
  }
}

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required.'));
  }
  next();
}

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role
    },
    jwtSecret(),
    { expiresIn: '7d' }
  );
}

export function toPublicUser(user) {
  if (!user) return null;
  const { password_hash, passwordHash, ...safeUser } = user;
  return safeUser;
}
