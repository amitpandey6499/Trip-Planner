import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Mail, LogOut, CalendarDays, Map, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

export const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();

  // Fresh trip count every time the profile opens.
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <div className="min-h-screen py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="border-b border-slate-200/80 pb-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Profile & Settings</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Your account details and settings</p>
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
              <Link to="/explore?favorites=1" className="flex items-center gap-1 hover:text-red-600">
                <Heart className="w-3.5 h-3.5 text-red-400" />
                {user?.favorites?.length ?? 0} favourite {user?.favorites?.length === 1 ? 'destination' : 'destinations'}
              </Link>
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

        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-soft">
          <div className="max-w-2xl">
            <h2 className="text-lg font-bold text-slate-900">Manage your travel profile</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Your account details and travel activity are shown above. Open your saved trips to review or continue planning,
              or browse your favorite destinations whenever you need inspiration.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/my-trips"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Map className="h-4 w-4" />
              View My Trips
            </Link>
            <Link
              to="/explore?favorites=1"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Heart className="h-4 w-4 text-red-400" />
              Browse Favorites
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Profile;
