import { Link } from 'react-router-dom';
import { Compass, GraduationCap, ShieldCheck } from 'lucide-react';
import { projectInfo, collegeLabel } from '@tripplanner/shared';

const chipColors = ['text-blue-300', 'text-emerald-300', 'text-purple-300', 'text-teal-300', 'text-sky-300', 'text-amber-300'];

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          
          {/* Col 1: Brand & College Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">
                Trip<span className="text-blue-400">Planner</span>
              </span>
            </div>
            
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              AI-Powered Smart Trip Planner generating personalized, budget-aware, day-wise travel itineraries, interactive map routes, and curated stays.
            </p>

            <div className="flex items-center gap-2 text-xs text-amber-400 bg-slate-800/80 p-3 rounded-lg border border-slate-700/60 max-w-md">
              <GraduationCap className="w-5 h-5 flex-shrink-0 text-amber-400" />
              <div>
                <span className="font-semibold block text-slate-200">{projectInfo.projectType}</span>
                <span>{collegeLabel} • Session {projectInfo.academicSession}</span>
              </div>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-slate-400 hover:text-white transition-colors">
                  Home Landing
                </Link>
              </li>
              <li>
                <Link to="/explore" className="text-slate-400 hover:text-white transition-colors">
                  Explore Destinations
                </Link>
              </li>
              <li>
                <Link to="/create-trip" className="text-slate-400 hover:text-white transition-colors">
                  Create Trip Wizard
                </Link>
              </li>
              <li>
                <Link to="/my-trips" className="text-slate-400 hover:text-white transition-colors">
                  My Trips Dashboard
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-slate-400 hover:text-white transition-colors">
                  About Project
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Technology Stack */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Technology Stack
            </h4>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {projectInfo.techStack.map((tech, idx) => (
                <span key={tech} className={`px-2.5 py-1 rounded bg-slate-800 border border-slate-700 ${chipColors[idx % chipColors.length]}`}>
                  {tech}
                </span>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {projectInfo.academicSession} {projectInfo.name}. Built at {projectInfo.college.department}, {collegeLabel}.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Secure REST API & Rate Limiting
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
