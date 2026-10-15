import { SESSION_EXPIRED_EVENT } from './events.js';

/**
 * Part 9 — POST a request and read the server's live events (Server-Sent Events over fetch,
 * because EventSource cannot send a body or use POST).
 *
 *   await postStream('/trips/generate', preferences, { onEvent: (name, data) => ... , signal })
 *
 * Resolves with the final `result` (same body as the normal JSON answer).
 * Rejects with an Error shaped like an axios error (message, fields, response.status/data),
 * so pages handle both kinds of requests the same way. Cancel with an AbortController.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiError = (status, body) => {
  const err = new Error(body?.error || `Request failed (${status}).`);
  err.response = { status, data: body };
  err.fields = body?.details?.fields ?? {};
  if (status === 401) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  return err;
};

const parseBlock = (block) => {
  let event = 'message';
  let data = '';
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data += line.slice(5).trim();
  }
  return data ? { event, data: JSON.parse(data) } : null;
};

export const postStream = async (path, body, { onEvent = () => {}, params, signal } = {}) => {
  const query = params ? `?${new URLSearchParams(params)}` : '';
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}${query}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(body ?? {}),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    const offline = new Error('Cannot reach the server. Is the backend running?');
    offline.fields = {};
    throw offline;
  }

  // Errors found before the work starts (validation, login, rate limit) come back as normal JSON.
  if (!(res.headers.get('content-type') ?? '').includes('text/event-stream')) {
    const data = await res.json().catch(() => null);
    if (!res.ok) throw apiError(res.status, data);
    return data;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let final = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let end;
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      if (!block || block.startsWith(':')) continue; // keep-alive comment
      const message = parseBlock(block);
      if (!message) continue;
      if (message.event === 'result' || message.event === 'error') final = message;
      else onEvent(message.event, message.data);
    }
  }

  if (!final) {
    const lost = new Error('The connection was interrupted. Please try again.');
    lost.fields = {};
    throw lost;
  }
  if (final.event === 'error') throw apiError(final.data.status ?? 500, final.data);
  return final.data;
};
