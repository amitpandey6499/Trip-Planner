import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Mail, Lock, User as UserIcon, Sparkles, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { LoginSchema, RegisterSchema, validate } from '@tripplanner/shared';
import { useAuth } from '../context/AuthContext';
import { useSystemStatus } from '../hooks/useSystemStatus';

const emptyForm = { name: '', email: '', password: '', rememberMe: true };

const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1 text-[11px] font-semibold text-red-600" role="alert">
      {message}
    </p>
  ) : null;

const inputClass = (hasError) =>
  `w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
    hasError ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-600'
  }`;

export const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn, loading: authLoading, login, register, loginDemo } = useAuth();
  const { status } = useSystemStatus();
  const demoEnabled = status?.services?.demoLogin ?? false;

  const [mode, setMode] = useState(location.state?.mode === 'register' ? 'register' : 'login');
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const goTo = location.state?.from && location.state.from !== '/auth' ? location.state.from : '/my-trips';
  const isRegister = mode === 'register';

  useEffect(() => {
    setErrors({});
    setServerError('');
  }, [mode]);

  if (!authLoading && isSignedIn) return <Navigate to={goTo} replace />;

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const run = async (action) => {
    setSubmitting(true);
    setServerError('');
    try {
      await action();
      navigate(goTo, { replace: true });
    } catch (err) {
      setErrors(err.fields ?? {});
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Same rules the server uses (shared schemas) → instant feedback, identical messages.
    const result = isRegister
      ? validate(RegisterSchema, { name: form.name, email: form.email, password: form.password })
      : validate(LoginSchema, { email: form.email, password: form.password, rememberMe: form.rememberMe });
    if (!result.success) {
      setErrors(result.fields);
      return;
    }
    run(() => (isRegister ? register(result.data) : login(result.data)));
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl shadow-slate-900/10 border border-slate-100 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        {/* Form column */}
        <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-8">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Trip<span className="text-blue-600">Planner</span>
              </span>
            </div>

            <div className="space-y-1 mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{isRegister ? 'Create an Account' : 'Welcome Back'}</h1>
              <p className="text-sm text-slate-500">
                {isRegister ? 'Sign up to generate and save your itineraries' : 'Sign in to continue your travel journey'}
              </p>
              {location.state?.from && <p className="text-xs text-blue-700 font-medium pt-1">Please sign in to continue.</p>}
            </div>

            {serverError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2" role="alert">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {isRegister && (
                <div>
                  <label htmlFor="name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="Your name"
                      className={inputClass(errors.name)}
                    />
                  </div>
                  <FieldError message={errors.name} />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass(errors.email)}
                  />
                </div>
                <FieldError message={errors.email} />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    placeholder={isRegister ? 'At least 8 characters, a letter and a number' : 'Enter your password'}
                    className={`${inputClass(errors.password)} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-2 p-1 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <FieldError message={errors.password} />
              </div>

              {!isRegister && (
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 pt-1">
                  <input
                    type="checkbox"
                    checked={form.rememberMe}
                    onChange={(e) => update('rememberMe', e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Keep me signed in for 7 days</span>
                </label>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all mt-2 active:scale-98 disabled:opacity-75 inline-flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            {demoEnabled && (
              <>
                <div className="relative my-6 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <span className="relative bg-white px-3 text-xs font-medium text-slate-400 uppercase tracking-wider">or</span>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => run(loginDemo)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100/80 text-blue-700 text-sm font-semibold border border-blue-200/80 transition-colors disabled:opacity-75"
                >
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Try the demo account
                </button>
                <p className="text-[11px] text-slate-400 text-center mt-2">Shared account with a sample Manali trip — no sign-up needed.</p>
              </>
            )}
          </div>

          <div className="pt-6 text-center text-xs text-slate-600">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" onClick={() => setMode(isRegister ? 'login' : 'register')} className="font-bold text-blue-600 hover:text-blue-700 ml-1">
              {isRegister ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>

        {/* Image column */}
        <div className="lg:col-span-6 relative hidden lg:block overflow-hidden bg-slate-900">
          <img
            src="https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80"
            alt="Coastal cliffs and a colourful village"
            className="w-full h-full object-cover object-center brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center select-none">
            <div className="space-y-2 bg-slate-950/40 backdrop-blur-xs p-6 rounded-3xl border border-white/10">
              <p className="font-handwriting text-5xl text-white drop-shadow-lg leading-tight">&ldquo;Explore</p>
              <p className="font-handwriting text-5xl text-sky-200 drop-shadow-lg leading-tight">Plan</p>
              <p className="font-handwriting text-5xl text-amber-200 drop-shadow-lg leading-tight">Travel</p>
              <p className="font-handwriting text-5xl text-white drop-shadow-lg leading-tight">Repeat&rdquo;</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
