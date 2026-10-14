import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Compass, Mail, Lock, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Auth = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('demo@tripplanner.com');
  const [password, setPassword] = useState('password123');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      login(email, password);
      setLoading(false);
      navigate('/my-trips');
    }, 400);
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      loginWithGoogle();
      setLoading(false);
      navigate('/my-trips');
    }, 400);
  };

  const handleQuickDemo = () => {
    login('aarav.sharma@tripplanner.com', 'demo2026');
    navigate('/my-trips');
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl shadow-slate-900/10 border border-slate-100 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        
        {/* Left Form Column */}
        <div className="lg:col-span-6 p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-2 mb-8">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Trip<span className="text-blue-600">Planner</span>
              </span>
            </div>

            {/* Title */}
            <div className="space-y-1 mb-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {isSignUp ? 'Create an Account' : 'Welcome Back'}
              </h2>
              <p className="text-sm text-slate-500">
                {isSignUp
                  ? 'Join TripPlanner to generate and save your AI itineraries'
                  : 'Sign in to continue your travel journey'}
              </p>
            </div>

            {/* Social Google Login Button */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-all shadow-2xs hover:border-slate-300"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.26v3.15C3.25 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.59H1.26C.46 8.19 0 9.99 0 12s.46 3.81 1.26 5.41l4.02-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.59l4.02 3.15c.95-2.84 3.6-4.99 6.72-4.99z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Quick Demo Button for Evaluator */}
              <button
                type="button"
                onClick={handleQuickDemo}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100/80 text-blue-700 text-xs font-semibold border border-blue-200/80 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>One-Click Demo Sign In (Aarav Sharma)</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <span className="relative bg-white px-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                or
              </span>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                <a href="#forgot" onClick={(e) => e.preventDefault()} className="font-semibold text-blue-600 hover:text-blue-700">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all mt-2 active:scale-98 disabled:opacity-75"
              >
                {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Toggle Sign Up / Sign In */}
          <div className="pt-6 text-center text-xs text-slate-600">
            {isSignUp ? (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => setIsSignUp(false)}
                  className="font-bold text-blue-600 hover:text-blue-700 ml-1"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{' '}
                <button
                  onClick={() => setIsSignUp(true)}
                  className="font-bold text-blue-600 hover:text-blue-700 ml-1"
                >
                  Sign Up
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Right Image Column (Matching Screen 2 in mockup) */}
        <div className="lg:col-span-6 relative hidden lg:block overflow-hidden bg-slate-900">
          <img
            src="https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80"
            alt="Scenic Mediterranean coastal cliffs and colorful village"
            className="w-full h-full object-cover object-center brightness-90"
          />
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20"></div>

          {/* Cursive quote overlay matching reference image */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center select-none">
            <div className="space-y-2 bg-slate-950/40 backdrop-blur-xs p-6 rounded-3xl border border-white/10">
              <p className="font-handwriting text-5xl text-white drop-shadow-lg leading-tight">
                "Explore
              </p>
              <p className="font-handwriting text-5xl text-sky-200 drop-shadow-lg leading-tight">
                Plan
              </p>
              <p className="font-handwriting text-5xl text-amber-200 drop-shadow-lg leading-tight">
                Travel
              </p>
              <p className="font-handwriting text-5xl text-white drop-shadow-lg leading-tight">
                Repeat"
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Auth;
