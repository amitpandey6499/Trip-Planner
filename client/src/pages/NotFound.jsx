import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export const NotFound = () => (
  <div className="min-h-[60vh] flex items-center justify-center p-8 bg-slate-50">
    <div className="text-center space-y-3">
      <Compass className="w-12 h-12 text-blue-500 mx-auto" />
      <h1 className="text-2xl font-extrabold text-slate-900">Page not found</h1>
      <p className="text-sm text-slate-500">This page does not exist. Let&apos;s get you back on the road.</p>
      <Link to="/" className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
        Go to Home
      </Link>
    </div>
  </div>
);

export default NotFound;
