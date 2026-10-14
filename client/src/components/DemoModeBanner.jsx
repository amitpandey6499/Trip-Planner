import { useState } from 'react';
import { X, Sparkles, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { projectInfo } from '@tripplanner/shared';
import { useSystemStatus } from '../hooks/useSystemStatus';

/**
 * Thin notice bar. It only warns about things that are really true right now
 * (server unreachable / AI key missing) instead of always claiming "live demo mode".
 */
export const DemoModeBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  const { status, error, loading } = useSystemStatus();

  if (dismissed || loading) return null;

  let message = null;
  if (error) {
    message = 'Cannot reach the TripPlanner server. Start it with "npm run dev" from the project folder.';
  } else if (status && !status.services?.geminiAI) {
    const places = status.services.offlineDestinations ?? [];
    message = `AI is not set up (no Gemini key), so trips are planned offline from curated places${
      places.length ? ` for ${places.length} destinations: ${places.join(', ')}` : ''
    }.`;
  }
  if (!message) return null;

  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 py-2 text-xs flex items-center justify-between shadow-xs border-b border-blue-800/40 relative z-40 no-print">
      <div className="max-w-7xl mx-auto flex items-center gap-2 flex-wrap justify-center sm:justify-start">
        <span className="inline-flex items-center gap-1 font-semibold bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/30">
          <Sparkles className="w-3 h-3 text-blue-300" />
          {projectInfo.college.shortName} {projectInfo.academicSession}
        </span>
        <span className="text-slate-200 inline-flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
          {message}
        </span>
        <Link to="/profile" className="text-blue-300 hover:text-white underline font-medium ml-1 transition-colors">
          View System Status →
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-slate-400 hover:text-white p-1 rounded transition-colors ml-2"
        title="Dismiss notice"
        aria-label="Dismiss notice"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default DemoModeBanner;
