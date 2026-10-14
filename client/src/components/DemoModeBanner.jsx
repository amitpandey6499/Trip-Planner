import React, { useState } from 'react';
import { Info, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DemoModeBanner = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 py-2 text-xs flex items-center justify-between shadow-xs border-b border-blue-800/40 relative z-40">
      <div className="max-w-7xl mx-auto flex items-center gap-2 flex-wrap justify-center sm:justify-start">
        <span className="inline-flex items-center gap-1 font-semibold bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/30">
          <Sparkles className="w-3 h-3 text-blue-300" />
          ABESIT 2026–27 Mini Project
        </span>
        <span className="text-slate-200">
          TripPlanner is active in Live Interactive Demonstration Mode with sample destinations, hotels, and route visualization.
        </span>
        <Link
          to="/profile"
          className="text-blue-300 hover:text-white underline font-medium ml-1 transition-colors"
        >
          View System Status →
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-slate-400 hover:text-white p-1 rounded transition-colors ml-2"
        title="Dismiss notice"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default DemoModeBanner;
