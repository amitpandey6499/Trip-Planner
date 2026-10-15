import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Inbox, LayoutDashboard, Link2, Loader2, Mail, MapPin, Receipt, Search, ShieldAlert, Trash2, Users, Map as MapIcon } from 'lucide-react';
import { ADMIN_RANGES, formatPaise } from '@tripplanner/shared';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../services/api';
import { ChartCard, DailyColumns, RankedBars, StatTile } from '../components/admin/Charts';

const SOURCE_LABELS = { gemini: 'Gemini AI', offline: 'Offline planner', sample: 'Sample plan' };

const when = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', ...(!sameYear && { year: 'numeric' }), hour: 'numeric', minute: '2-digit' });
};

const Messages = () => {
  const [filter, setFilter] = useState('all');
  const [state, setState] = useState({ list: [], loading: true, error: null });
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true }));
    adminApi
      .messages(filter)
      .then((res) => active && setState({ list: res.data, loading: false, error: null }))
      .catch((err) => active && setState({ list: [], loading: false, error: err.message }));
    return () => {
      active = false;
    };
  }, [filter]);
  useEffect(() => load(), [load]);

  const setStatus = async (m, status) => {
    try {
      const res = await adminApi.setMessage(m.id, status);
      setState((s) => ({ ...s, list: filter === 'all' ? s.list.map((x) => (x.id === m.id ? res.data : x)) : s.list.filter((x) => x.id !== m.id) }));
    } catch (err) {
      setState((s) => ({ ...s, error: err.message }));
    }
  };
  const remove = async (m) => {
    try {
      await adminApi.deleteMessage(m.id);
      setConfirmId(null);
      setState((s) => ({ ...s, list: s.list.filter((x) => x.id !== m.id) }));
    } catch (err) {
      setState((s) => ({ ...s, error: err.message }));
    }
  };

  return (
    <ChartCard
      title="Contact messages"
      subtitle="Sent with the Contact form. Reply by e-mail."
      testId="admin-messages"
      action={
        <div className="flex rounded-lg border border-slate-200 p-0.5" role="group" aria-label="Show messages">
          {['all', 'new', 'read'].map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold capitalize ${filter === f ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {f === 'new' ? 'Unread' : f}
            </button>
          ))}
        </div>
      }
    >
      {state.error && <p className="text-xs font-semibold text-red-700" role="alert">{state.error}</p>}
      {state.loading ? (
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </p>
      ) : state.list.length === 0 ? (
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <Inbox className="w-4 h-4" /> No messages here.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {state.list.map((m) => (
            <li key={m.id} className="py-3 space-y-1.5" data-testid="admin-message">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  {m.status === 'new' && <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">New</span>}
                  {m.name}
                  <span className="text-xs font-normal text-slate-500">{m.email}</span>
                </p>
                <span className="text-[11px] text-slate-500">{when(m.createdAt)}</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-line">{m.message}</p>
              <div className="flex flex-wrap gap-2 pt-0.5">
                <a href={`mailto:${m.email}?subject=${encodeURIComponent('Re: your message to TripPlanner')}`} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">
                  <Mail className="w-3.5 h-3.5" /> Reply
                </a>
                <button type="button" onClick={() => setStatus(m, m.status === 'new' ? 'read' : 'new')} className="text-xs font-semibold text-slate-600 hover:text-slate-900">
                  {m.status === 'new' ? 'Mark as read' : 'Mark as unread'}
                </button>
                {confirmId === m.id ? (
                  <span className="inline-flex items-center gap-2 text-xs">
                    <span className="text-red-700">Delete for good?</span>
                    <button type="button" onClick={() => remove(m)} className="font-semibold text-red-700 hover:underline">
                      Delete
                    </button>
                    <button type="button" onClick={() => setConfirmId(null)} className="font-semibold text-slate-600">
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirmId(m.id)} aria-label={`Delete the message from ${m.name}`} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-700">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
};

const UsersTable = () => {
  const [q, setQ] = useState('');
  const [state, setState] = useState({ list: [], loading: true, error: null });

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      adminApi
        .users(q.trim())
        .then((res) => active && setState({ list: res.data, loading: false, error: null }))
        .catch((err) => active && setState({ list: [], loading: false, error: err.message }));
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [q]);

  return (
    <ChartCard
      title="Accounts"
      subtitle="Newest first (up to 100)."
      testId="admin-users"
      action={
        <label className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name or e-mail"
            aria-label="Search accounts"
            className="pl-7 pr-2 py-1 rounded-lg border border-slate-200 text-xs w-40 sm:w-52 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </label>
      }
    >
      {state.error && <p className="text-xs font-semibold text-red-700" role="alert">{state.error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[640px] [&_th]:px-2 [&_td]:px-2 [&_th:first-child]:pl-0 [&_td:first-child]:pl-0">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <th className="py-2 font-semibold">Name</th>
              <th className="py-2 font-semibold">E-mail</th>
              <th className="py-2 font-semibold">Role</th>
              <th className="py-2 font-semibold text-right">Trips</th>
              <th className="py-2 font-semibold">Joined</th>
              <th className="py-2 font-semibold">Last login</th>
            </tr>
          </thead>
          <tbody>
            {state.list.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0" data-testid="admin-user-row">
                <td className="py-2 font-semibold text-slate-800">{u.name}</td>
                <td className="py-2 text-slate-600 max-w-[15rem] truncate" title={u.email}>{u.email}</td>
                <td className="py-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                      u.role === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-200' : u.isDemo ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {u.isDemo ? 'demo' : u.role}
                  </span>
                </td>
                <td className="py-2 text-right font-semibold text-slate-900 tabular-nums">{u.trips}</td>
                <td className="py-2 text-slate-600 whitespace-nowrap">{when(u.createdAt)}</td>
                <td className="py-2 text-slate-600 whitespace-nowrap">{when(u.lastLoginAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!state.loading && state.list.length === 0 && <p className="text-sm text-slate-500 py-3">No accounts found.</p>}
      </div>
    </ChartCard>
  );
};

/**
 * Part 17 — /admin: how the app is used (counts only), contact messages and accounts. Admins only
 * (role from the server: ADMIN_EMAILS or `npm run admin -w server -- add <email>`).
 */
export const AdminDashboard = () => {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const [state, setState] = useState({ stats: null, loading: true, error: null });
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return undefined;
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    adminApi
      .stats(days)
      .then((res) => active && setState({ stats: res.data, loading: false, error: null }))
      .catch((err) => active && setState((s) => ({ ...s, loading: false, error: err.message })));
    return () => {
      active = false;
    };
  }, [days, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-10 text-center max-w-md border border-slate-100 shadow-soft space-y-3" data-testid="admin-forbidden">
          <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto" />
          <h1 className="text-xl font-bold text-slate-800">Admins only</h1>
          <p className="text-sm text-slate-500">This page is for the people who run TripPlanner.</p>
          <Link to="/my-trips" className="inline-block text-sm font-semibold text-blue-700 hover:underline">
            Go to My Trips
          </Link>
        </div>
      </div>
    );
  }

  const s = state.stats;
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
              <LayoutDashboard className="w-7 h-7 text-blue-600" /> Admin dashboard
            </h1>
            <p className="text-sm text-slate-500">How TripPlanner is used. Counts only — nobody&apos;s plans or expenses are shown.</p>
          </div>
          <div className="flex items-center gap-2">
            {state.loading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" aria-label="Loading" />}
            <div className="flex rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label="Time range">
              {ADMIN_RANGES.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={days === d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${days === d ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {d} days
                </button>
              ))}
            </div>
          </div>
        </div>

        {state.error && (
          <p className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700" role="alert">
            {state.error}
          </p>
        )}

        {s && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3" data-testid="admin-kpis">
              <StatTile icon={Users} label="Accounts" value={s.totals.users.toLocaleString('en-IN')} sub={`+${s.newUsers} in ${s.range.days} days`} testId="kpi-users" />
              <StatTile icon={MapPin} label="Saved trips" value={s.totals.trips.toLocaleString('en-IN')} sub={`+${s.newTrips} in ${s.range.days} days`} testId="kpi-trips" />
              <StatTile icon={Link2} label="Shared links on" value={s.totals.sharedTrips.toLocaleString('en-IN')} />
              <StatTile icon={Receipt} label="Expenses tracked" value={s.totals.expenses.toLocaleString('en-IN')} sub={formatPaise(s.totals.expensesPaise)} />
              <StatTile icon={Inbox} label="Messages" value={s.totals.messages.toLocaleString('en-IN')} sub={`${s.totals.unreadMessages} unread`} testId="kpi-messages" />
              <StatTile icon={Bot} label="AI plans today" value={s.ai.enabled ? `${s.ai.callsToday}` : 'AI off'} sub={s.ai.enabled ? `${s.ai.usersToday} people • limit ${s.ai.dailyLimit} each` : 'Offline planner in use'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DailyColumns title="Trips saved per day" data={s.tripsPerDay} unit="trips" testId="chart-trips" />
              <DailyColumns title="New accounts per day" data={s.signupsPerDay} unit="sign-ups" testId="chart-signups" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ChartCard title="Popular destinations" subtitle="All saved trips" testId="chart-destinations">
                <RankedBars rows={s.popularDestinations.map((p) => ({ label: p.destination, value: p.trips }))} unit="trips" empty="No saved trips yet." />
              </ChartCard>
              <ChartCard title="Who made the plans" subtitle={`Trips saved in ${s.range.days} days`}>
                <RankedBars rows={s.planSources.map((p) => ({ label: SOURCE_LABELS[p.source] ?? p.source, value: p.trips }))} unit="trips" empty="No trips in this time." />
              </ChartCard>
              <ChartCard title="Saved answers (cache)" subtitle="Each one is a request the free services did not need again">
                <RankedBars
                  rows={[
                    { label: 'AI plans', value: s.ai.cachedPlans },
                    { label: 'Place positions', value: s.cache.places },
                    { label: 'Road routes', value: s.cache.routes },
                    { label: 'Weather', value: s.cache.weather },
                  ]}
                  unit="cached"
                  empty="Nothing cached yet."
                />
              </ChartCard>
            </div>

            {s.ai.enabled ? (
              <DailyColumns title="AI plans per day" subtitle={`${s.ai.callsInRange} Gemini calls (${s.ai.model}); answers from the cache do not count`} data={s.ai.callsPerDay} unit="AI plans" testId="chart-ai" />
            ) : (
              <p className="p-4 rounded-xl bg-white border border-slate-100 text-sm text-slate-600 flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-slate-400" /> AI is off (no GEMINI_API_KEY on the server), so the offline planner makes every plan.
              </p>
            )}
          </>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
          <div className="xl:col-span-2">
            <Messages />
          </div>
          <div className="xl:col-span-3">
            <UsersTable />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
