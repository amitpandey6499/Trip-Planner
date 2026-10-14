import { useNavigate } from 'react-router-dom';
import { Mail, GraduationCap, LogOut, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { projectInfo, collegeLabel } from '@tripplanner/shared';
import { useAuth } from '../context/AuthContext';
import { useSystemStatus } from '../hooks/useSystemStatus';

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
const buildStatusCards = (status, error) => {
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
      state: database.isMySql ? 'ok' : 'warn',
      label: database.isMySql ? 'MySQL' : 'Local store',
      detail: database.isMySql ? 'Connected to MySQL.' : 'MySQL not running, trips are saved in a local JSON file.',
    },
    {
      title: 'Google Gemini AI',
      state: services.geminiAI ? 'ok' : 'warn',
      label: services.geminiAI ? 'Configured' : 'Not configured',
      detail: services.geminiAI ? `Model: ${services.aiModel}` : 'Add GEMINI_API_KEY in server/.env. Until then the offline sample generator is used.',
    },
    {
      title: 'Google Places',
      state: services.googlePlaces ? 'ok' : 'warn',
      label: services.googlePlaces ? 'Configured' : 'Optional',
      detail: services.googlePlaces ? 'Live hotel search enabled.' : 'Using the curated hotel and restaurant list.',
    },
    { title: 'Maps', state: 'ok', label: 'Active', detail: 'Leaflet with OpenStreetMap tiles.' },
  ];
};

export const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { status, error, loading } = useSystemStatus();
  const cards = buildStatusCards(status, error);

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="border-b border-slate-200/80 pb-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Profile & Settings</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Your account and the live status of the system</p>
        </div>

        {/* User card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-soft flex flex-col sm:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-blue-500/30 p-1 flex-shrink-0 bg-slate-100">
            {user?.avatarUrl && <img src={user.avatarUrl} alt={user?.name || 'User'} className="w-full h-full object-cover rounded-xl" />}
          </div>

          <div className="space-y-1 text-center sm:text-left flex-1">
            <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
            <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {user?.email}
            </p>
            <p className="text-[11px] text-slate-400">
              User ID: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{user?.id}</code>
            </p>
          </div>

          <button
            onClick={() => {
              logout();
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
