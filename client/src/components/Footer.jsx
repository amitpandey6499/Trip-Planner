import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { projectInfo } from '@tripplanner/shared';

export const Footer = () => {
  return (
    <footer className="relative overflow-hidden border-t border-blue-400/20 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-300">
      <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 pb-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-950/50">
                <Compass className="h-5 w-5" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">
                Trip<span className="text-blue-400">Planner</span>
              </span>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-slate-400">
              Plan memorable trips with personalized itineraries, thoughtful budgets, and routes made for exploring.
            </p>
          </div>

          <div className="space-y-4 md:max-w-xl">
            <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-200">
              Quick Links
            </h4>
            <nav aria-label="Footer quick links">
              <ul className="flex flex-wrap gap-2 text-sm">
                <li>
                  <Link to="/" className="inline-flex px-1 py-2 text-slate-400 transition-colors hover:text-white">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/explore" className="inline-flex px-1 py-2 text-slate-400 transition-colors hover:text-white">
                    Explore
                  </Link>
                </li>
                <li>
                  <Link to="/trips/new" className="inline-flex px-1 py-2 text-slate-400 transition-colors hover:text-white">
                    Plan a Trip
                  </Link>
                </li>
                <li>
                  <Link to="/my-trips" className="inline-flex px-1 py-2 text-slate-400 transition-colors hover:text-white">
                    My Trips
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="inline-flex px-1 py-2 text-slate-400 transition-colors hover:text-white">
                    About
                  </Link>
                </li>
                <li>
                  <a
                    href={`${import.meta.env.VITE_API_BASE_URL || '/api'}/docs`}
                    className="inline-flex px-1 py-2 text-slate-400 transition-colors hover:text-white"
                  >
                    API Docs
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {projectInfo.name}. All rights reserved.
          </p>
          <p>Made for your next adventure.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;