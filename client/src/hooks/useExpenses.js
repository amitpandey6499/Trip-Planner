import { useCallback, useEffect, useState } from 'react';
import { expenseApi } from '../services/api';

/**
 * Part 15 — the ledger of one saved trip: { members, expenses, balances, settlements, summary }.
 * Every change answers with the new ledger. Actions return { ok: true } or { ok: false, error, fields }.
 */
export const useExpenses = (tripId) => {
  const [state, setState] = useState({ ledger: null, loading: Boolean(tripId), error: null });

  const load = useCallback(() => {
    if (!tripId) return undefined;
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    expenseApi
      .ledger(tripId)
      .then((res) => active && setState({ ledger: res.data, loading: false, error: null }))
      .catch((err) => active && setState((s) => ({ ...s, loading: false, error: err.message })));
    return () => {
      active = false;
    };
  }, [tripId]);

  useEffect(() => load(), [load]);

  const run = useCallback(async (call) => {
    try {
      const res = await call();
      setState({ ledger: res.data, loading: false, error: null });
      return { ok: true, ledger: res.data };
    } catch (err) {
      return { ok: false, error: err.message, fields: err.fields ?? {} };
    }
  }, []);

  return {
    ...state,
    reload: load,
    add: (body) => run(() => expenseApi.add(tripId, body)),
    update: (id, body) => run(() => expenseApi.update(tripId, id, body)),
    remove: (id) => run(() => expenseApi.remove(tripId, id)),
    settle: (body) => run(() => expenseApi.settle(tripId, body)),
    setMembers: (members) => run(() => expenseApi.setMembers(tripId, members)),
  };
};

export default useExpenses;
