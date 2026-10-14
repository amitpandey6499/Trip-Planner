import { z } from 'zod';
import { requiredText } from './common.js';

/** Used by Part 4 (JWT login). Defined now so the contract is fixed early. */

const email = z
  .string({ error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .min(1, 'Email is required.')
  .max(254)
  .pipe(z.email('Please enter a valid email address.'));

const password = z
  .string({ error: 'Password is required.' })
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password can be at most 72 characters.') // bcrypt only uses the first 72 bytes
  .regex(/[A-Za-z]/, 'Password must contain a letter.')
  .regex(/\d/, 'Password must contain a number.');

export const RegisterSchema = z.object({
  name: requiredText('Name', { min: 2, max: 60 }),
  email,
  password,
});

export const LoginSchema = z.object({
  email,
  password: z.string({ error: 'Password is required.' }).min(1, 'Password is required.').max(72),
});
