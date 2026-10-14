import { Link } from 'react-router-dom';
import { Loader2, MapPinOff } from 'lucide-react';

export const PageLoader = ({ title = 'Loading...', text }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-3" aria-busy="true">
    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
    {text && <p className="text-sm text-slate-500 max-w-sm text-center">{text}</p>}
  </div>
);

export const TripNotFound = ({ message }) => (
  <div className="min-h-[60vh] flex items-center justify-center p-8">
    <div className="bg-white rounded-3xl p-10 text-center max-w-md border border-slate-100 shadow-soft space-y-4">
      <MapPinOff className="w-12 h-12 text-slate-300 mx-auto" />
      <h2 className="text-xl font-bold text-slate-800">Trip not found</h2>
      <p className="text-sm text-slate-500">{message || 'This trip does not exist or belongs to another account.'}</p>
      <Link to="/my-trips" className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
        Go to My Trips
      </Link>
    </div>
  </div>
);
