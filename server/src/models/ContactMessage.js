import mongoose from 'mongoose';
import { cleanJSON } from './toJSON.js';

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['new', 'read'], default: 'new' },
  },
  { timestamps: true, toJSON: cleanJSON() },
);

export const ContactMessage = mongoose.models.ContactMessage ?? mongoose.model('ContactMessage', contactMessageSchema);
export default ContactMessage;
