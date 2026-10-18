import test from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler } from '../src/middleware/errorHandler.js';

test('unexpected errors log route diagnostics without request or error contents', () => {
  const records = [];
  const originalError = console.error;
  const response = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  console.error = (...args) => records.push(args);
  try {
    errorHandler(
      Object.assign(new Error('password=private-value'), { code: 'ECONNRESET' }),
      {
        method: 'POST',
        baseUrl: '/api/auth',
        route: { path: '/login' },
        originalUrl: '/api/auth/login?token=private-token',
      },
      response,
      () => {},
    );
  } finally {
    console.error = originalError;
  }

  assert.equal(response.statusCode, 500);
  assert.equal(records.length, 1);
  assert.deepEqual(records[0][1], {
    method: 'POST',
    route: '/api/auth/login',
    status: 500,
    error: 'Error',
    code: 'ECONNRESET',
  });
  assert.doesNotMatch(JSON.stringify(records), /private-value|private-token/);
});
