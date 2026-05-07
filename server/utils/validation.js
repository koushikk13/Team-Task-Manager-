import { z } from 'zod';
import { ApiError } from '../middleware/errors.js';

export const idSchema = z.string().min(8);
export const emailSchema = z.string().trim().email().toLowerCase();
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format.')
  .nullable()
  .optional();

export function parseBody(schema, body) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      422,
      'Please fix the highlighted fields.',
      parsed.error.flatten().fieldErrors
    );
  }
  return parsed.data;
}

export function parseQuery(schema, query) {
  const parsed = schema.safeParse(query);
  if (!parsed.success) {
    throw new ApiError(422, 'Invalid query parameters.', parsed.error.flatten().fieldErrors);
  }
  return parsed.data;
}
