import { config } from '../config/env.js';
import { ApiError } from './ApiError.js';

/**
 * Server-Sent Events (Part 9). Long jobs (AI generation, map update) can answer in two ways:
 *   Accept: text/event-stream  → live events:  progress … (day …) … result | error
 *   anything else              → one normal JSON answer when the job is done (API tools, tests)
 *
 * Event payloads are JSON. The final `result` has exactly the same body as the JSON answer,
 * and `error` has the usual error shape plus `status`.
 */

export const wantsEventStream = (req) => /text\/event-stream/i.test(req.get('accept') ?? '');

export const openEventStream = (res) => {
  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // ask proxies (nginx, Render) not to buffer
  });
  res.flushHeaders();

  // The browser closed the page / pressed Cancel → stop the work.
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });
  // Comment lines keep idle connections open through proxies.
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) res.write(': keep-alive\n\n');
  }, 15000);

  return {
    signal: controller.signal,
    send(event, data) {
      if (res.writableEnded || controller.signal.aborted) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    end() {
      clearInterval(heartbeat);
      if (!res.writableEnded) res.end();
    },
  };
};

/** Same rules as the global error handler: our own messages are shown, unexpected ones are hidden. */
const errorPayload = (err) => {
  let status = Number(err?.statusCode ?? err?.status) || 500;
  if (status < 400 || status > 599) status = 500;
  const expected = err instanceof ApiError || status < 500;
  if (!expected) console.error('[Stream] Unexpected error:', err);
  return {
    success: false,
    status,
    error: expected || !config.isProd ? err.message : 'Something went wrong on our side. Please try again.',
    ...(expected && err.details !== undefined && { details: err.details }),
  };
};

/**
 * Run a long job and answer as a stream or as JSON.
 * @param work async ({ streaming, onProgress, emit, signal }) => payload   (payload is merged into { success: true, ... })
 */
export const respondWithProgress = async (req, res, work, { status = 200 } = {}) => {
  if (!wantsEventStream(req)) {
    const payload = await work({ streaming: false, onProgress: () => {}, emit: () => {}, signal: undefined });
    res.status(status).json({ success: true, ...payload });
    return;
  }
  const stream = openEventStream(res);
  try {
    const payload = await work({
      streaming: true,
      onProgress: (progress) => stream.send('progress', progress),
      emit: (event, data) => stream.send(event, data),
      signal: stream.signal,
    });
    stream.send('result', { success: true, ...payload });
  } catch (err) {
    if (!stream.signal.aborted) stream.send('error', errorPayload(err));
  } finally {
    stream.end();
  }
};
