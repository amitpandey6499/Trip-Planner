import { z } from 'zod';
import { requiredText } from './common.js';

/** Contact page form → POST /api/contact (stored in MongoDB). */
export const ContactSchema = z.object({
  name: requiredText('Name', { min: 2, max: 60 }),
  email: z
    .string({ error: 'Email is required.' })
    .trim()
    .toLowerCase()
    .min(1, 'Email is required.')
    .max(254)
    .pipe(z.email('Please enter a valid email address.')),
  message: requiredText('Message', { min: 10, max: 2000 }),
});
