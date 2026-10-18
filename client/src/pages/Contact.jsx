import { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ContactSchema, validate } from '@tripplanner/shared';
import { useAuth } from '../context/AuthContext';
import { contactApi } from '../services/api';

const FieldError = ({ message }) => (message ? <p className="mt-1 text-[11px] font-semibold text-red-600">{message}</p> : null);

export const Contact = () => {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState('');
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(() => ({ name: user?.name ?? '', email: user?.email ?? '', message: '' }));

  const update = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // Saved in MongoDB (POST /api/contact), checked with the same rules as the server.
  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = validate(ContactSchema, formData);
    if (!result.success) {
      setErrors(result.fields);
      return;
    }
    setSending(true);
    setServerError('');
    try {
      await contactApi.send(result.data);
      setSubmitted(true);
      setFormData((prev) => ({ ...prev, message: '' }));
    } catch (err) {
      setErrors(err.fields ?? {});
      setServerError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen py-10 sm:py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Title */}
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            Get In Touch
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Contact Project Team
          </h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Questions regarding TripPlanner architecture, deployment, or evaluation? Reach out to the student team.
          </p>
        </div>

        <div className="mx-auto max-w-2xl">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-soft">
            {submitted ? (
              <div className="p-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-lg font-bold text-slate-800">Message Received</h4>
                <p className="text-xs text-slate-500">Thank you for reaching out! Your message has been saved for the project team.</p>
                <button type="button" onClick={() => setSubmitted(false)} className="text-xs font-semibold text-blue-600 hover:underline">
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {serverError && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2" role="alert">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {serverError}
                  </div>
                )}
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Your Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                  <FieldError message={errors.name} />
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                  <FieldError message={errors.email} />
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows="4"
                    value={formData.message}
                    onChange={(e) => update('message', e.target.value)}
                    placeholder="Enter your message or project inquiry..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  ></textarea>
                  <FieldError message={errors.message} />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-75"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{sending ? 'Sending...' : 'Send Message'}</span>
                </button>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Contact;
