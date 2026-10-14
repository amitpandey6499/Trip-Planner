import { Component } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

/**
 * If a page throws while rendering (e.g. unexpected data), show this instead of a blank white screen.
 * React only supports this with a class component.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8 bg-slate-50">
        <div className="bg-white rounded-3xl p-10 text-center max-w-md border border-slate-100 shadow-soft space-y-4" role="alert">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h1 className="text-xl font-bold text-slate-800">Something went wrong on this page</h1>
          <p className="text-sm text-slate-500">Your saved trips are safe. Try reloading the page, or go back home.</p>
          {import.meta.env.DEV && <pre className="text-left text-[11px] bg-slate-50 p-3 rounded-lg overflow-auto text-red-700">{String(this.state.error?.message)}</pre>}
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              <RefreshCw className="w-4 h-4" /> Reload
            </button>
            <a href="/" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold">
              <Home className="w-4 h-4" /> Home
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
