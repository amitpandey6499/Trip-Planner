/**
 * Loaded before every test file (see "test" script in package.json).
 * Sets a safe environment BEFORE src/config/env.js reads it:
 * no real AI calls, no MySQL, and a throw-away store file.
 */
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tripplanner-test-'));

process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = '';
process.env.GOOGLE_PLACES_API_KEY = '';
process.env.MYSQL_ENABLED = 'false';
process.env.STORE_FILE = path.join(tmpDir, 'tripsStore.json');
