import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Mail, GraduationCap, LogOut, CheckCircle2, AlertTriangle, XCircle, Loader2, CalendarDays, Map } from 'lucide-react';
import { projectInfo, collegeLabel } from '@tripplanner/shared';
import { useAuth } from '../context/AuthContext';
import { useSystemStatus } from '../hooks/useSystemStatus';
import Avatar from '../components/Avatar';

const badgeStyles = {
  ok: 'bg-emerald-100 text-emerald-800',
  warn: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-700',
};
const badgeIcons = { ok: CheckCircle2, warn: AlertTriangle, error: XCircle };

const StatusCard = ({ title, state, label, detail }) => {
  const Icon = badgeIcons[state];
  return (
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-slate-800">{title}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${badgeStyles[state]}`}>
          <Icon className="w-3 h-3" />
          {label}
        </span>
      </div>
      <p className="text-slate-500 text-[11px]">{detail}</p>
    </div>
  );
};

/** Turns GET /api/health into status cards. Nothing here is hardcoded "green". */
const buildStatusCards = (status, error, aiUsage) => {
  if (error || !status) {
    return [
      { title: 'Backend API', state: 'error', label: 'Offline', detail: 'Server not reachable. Run "npm run dev" in the project folder.' },
    ];
  }
  const { services = {}, database = {} } = status;
  return [
    { title: 'Backend API', state: 'ok', label: 'Online', detail: `${status.environment} • v${status.version} • up ${status.uptimeSeconds}s` },
    {
      title: 'Database',
      state: database.connected ? 'ok' : 'error',
      label: database.connected ? 'Connected' : 'Disconnected',
      detail: database.connected ? `MongoDB database "${database.name}"` : 'MongoDB is not reachable. Check MONGODB_URI in server/.env.',
    },
    { title: 'Login', state: 'ok', label: 'JWT', detail: 'Session in an httpOnly cookie, passwords hashed with bcrypt.' },
    {
      title: 'Google Gemini AI',
      state: services.geminiAI ? 'ok' : 'warn',
      label: services.geminiAI ? 'Configured' : 'Not configured',
      detail: services.geminiAI
        ? `Model: ${services.aiModel}${aiUsage ? ` • ${aiUsage.left} of ${aiUsage.limit} AI plans left today` : ''}`
        : `Add GEMINI_API_KEY in server/.env. Until then the offline planner is used (${(services.offlineDestinations ?? []).length} destinations).`,
    },
    {
      title: 'Google Places',
      state: services.googlePlaces ? 'ok' : 'warn',
      label: services.googlePlaces ? 'Configured' : 'Optional',
      detail: services.googlePlaces ? 'Live hotel search enabled.' : 'Using the curated hotel and restaurant list.',
    },
    {
      title: 'Maps & routes',
      state: services.map?.enabled ? 'ok' : 'warn',
      label: services.map?.enabled ? 'Active' : 'Estimates only',
      detail: services.map?.enabled
        ? `Places: ${services.map.geocoder} • Road routes: ${services.map.router} • Leaflet + OpenStreetMap tiles.`
        : 'MAP_ENABLED=false: distances are straight-line estimates.',
    },
  ];
};

export const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { status, error, loading } = useSystemStatus();
  const cards = buildStatusCards(status, error, user?.ai);

  // Fresh trip count every time the profile opens.
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="border-b border-slate-200/80 pb-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Profile & Settings</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Your account and the live status of the system</p>
        </div>

        {/* User card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-soft flex flex-col sm:flex-row items-center gap-6">
          <Avatar user={user} size="w-20 h-20" textSize="text-2xl" />

          <div className="space-y-1 text-center sm:text-left flex-1">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 justify-center sm:justify-start">
              {user?.name}
              {user?.isDemo && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Demo account</span>}
            </h2>
            <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {user?.email}
            </p>
            <p className="text-xs text-slate-500 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              {user?.createdAt && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                  Member since {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Map className="w-3.5 h-3.5 text-slate-400" />
                {user?.tripCount ?? 0} saved {user?.tripCount === 1 ? 'trip' : 'trips'}
              </span>
            </p>
          </div>

          <button
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* College project details */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-blue-800/40 space-y-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-amber-300" />
            <h3 className="text-lg font-bold">{projectInfo.projectType}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 space-y-1">
              <span className="text-slate-300 block text-[10px] uppercase font-bold">Institution</span>
              <p className="font-bold text-sm text-white">{collegeLabel}</p>
              <p className="text-slate-300">{projectInfo.college.university}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 space-y-1">
              <span className="text-slate-300 block text-[10px] uppercase font-bold">Academic Session</span>
              <p className="font-bold text-sm text-white">{projectInfo.academicSession}</p>
              <p className="text-slate-300">{projectInfo.college.department}</p>
            </div>
          </div>
        </div>

        {/* Live system status */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-soft space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">System Integration Status</h3>
              <p className="text-xs text-slate-500">Read live from the server (GET /api/health)</p>
            </div>
            {loading && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
          </div>

          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {cards.map((card) => (
                <StatusCard key={card.title} {...card} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
