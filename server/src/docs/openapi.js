import { z } from 'zod';
import * as shared from '@tripplanner/shared';
import { projectInfo } from '@tripplanner/shared';
import { config } from '../config/env.js';

/**
 * Part 18 — the API description (OpenAPI 3.1), served at /api/openapi.json and shown at /api/docs.
 * Request bodies and query parameters come straight from the shared Zod schemas, the same ones the server
 * validates with, so the documentation cannot drift from what the API accepts.
 */

const toSchema = (zodSchema) => {
  const json = z.toJSONSchema(zodSchema, { io: 'input', unrepresentable: 'any', reused: 'inline' });
  delete json.$schema; // the document as a whole says which dialect it uses
  return json;
};

// Request bodies shown as named models (Swagger UI lists them under "Schemas").
const MODELS = [
  'RegisterSchema',
  'LoginSchema',
  'TripPreferencesSchema',
  'RegenerateDaySchema',
  'SaveTripSchema',
  'UpdateTripSchema',
  'ItinerarySchema',
  'TripPdfSchema',
  'SavedTripMapSchema',
  'MapEnrichSchema',
  'ShareSettingsSchema',
  'ExpenseInputSchema',
  'SettlementInputSchema',
  'TripMembersSchema',
  'ContactSchema',
  'MessageStatusSchema',
];
const modelName = (schemaName) => schemaName.replace(/Schema$/, '');
const ref = (schemaName) => ({ $ref: `#/components/schemas/${modelName(schemaName)}` });

const queryParameters = (schemaName) => {
  const json = toSchema(shared[schemaName]);
  const required = new Set(json.required ?? []);
  return Object.entries(json.properties ?? {}).map(([name, schema]) => ({
    name,
    in: 'query',
    required: required.has(name),
    schema,
    ...(schema.description && { description: schema.description }),
  }));
};

const PATH_PARAMS = {
  id: { description: 'Trip id (MongoDB ObjectId)', schema: { type: 'string', pattern: '^[a-f0-9]{24}$' } },
  expenseId: { description: 'Expense id', schema: { type: 'string' } },
  slug: { description: 'Share link code, or destination slug (e.g. "goa")', schema: { type: 'string' } },
};
const pathParameters = (path) =>
  [...path.matchAll(/\{(\w+)\}/g)].map(([, name]) => ({ name, in: 'path', required: true, ...(PATH_PARAMS[name] ?? { schema: { type: 'string' } }) }));

const ok = (description, data = {}) => ({
  description,
  content: { 'application/json': { schema: { type: 'object', properties: { success: { const: true }, data, message: { type: 'string' } } } } },
});
const pdf = { description: 'PDF file', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } };
const ERRORS = {
  400: { $ref: '#/components/responses/BadRequest' },
  401: { $ref: '#/components/responses/Unauthorized' },
  403: { $ref: '#/components/responses/Forbidden' },
  404: { $ref: '#/components/responses/NotFound' },
  429: { $ref: '#/components/responses/TooMany' },
};

/**
 * Every endpoint: [method, path, tag, summary, options].
 * options: auth ('user' | 'optional' | 'admin'), body (shared schema name), query (shared schema name),
 * ok (success response), status (success status code), errors (codes), description.
 */
const ENDPOINTS = [
  ['get', '/health', 'System', 'Server, database and integration status', { ok: ok('Status', { type: 'object' }), errors: [] }],

  ['post', '/auth/register', 'Account', 'Create an account (logs in: sets the session cookie)', { body: 'RegisterSchema', status: 201, errors: [400, 429], description: '409 when the e-mail already has an account.' }],
  ['post', '/auth/login', 'Account', 'Log in with e-mail and password', { body: 'LoginSchema', errors: [400, 401, 429] }],
  ['post', '/auth/demo', 'Account', 'Log in as the demo traveller (404 when DEMO_LOGIN_ENABLED=false)', { errors: [404, 429] }],
  ['post', '/auth/logout', 'Account', 'Log out (clears the cookie)', { errors: [] }],
  ['get', '/auth/me', 'Account', 'The logged-in user, trip count and AI plans left today', { auth: 'user', errors: [401] }],

  ['post', '/trips/generate', 'Trips', 'Make an itinerary (Gemini AI, or the offline planner)', {
    auth: 'user',
    body: 'TripPreferencesSchema',
    errors: [400, 401, 429],
    description:
      'With `Accept: text/event-stream` the answer is a live stream (events: progress, day, reset, result, error) — each day arrives as soon as it is written. Otherwise one JSON answer with the itinerary.',
    ok: ok('Itinerary + how it was made', ref('ItinerarySchema')),
  }],
  ['post', '/trips/regenerate-day', 'Trips', 'Write one day again (keeps the rest of the plan)', { auth: 'user', body: 'RegenerateDaySchema', errors: [400, 401, 429], description: 'Streams too with `Accept: text/event-stream`.' }],
  ['post', '/trips/pdf', 'Trips', 'PDF of the plan on screen (saved or not)', { auth: 'user', body: 'TripPdfSchema', ok: pdf, errors: [400, 401, 429] }],
  ['post', '/trips', 'Trips', 'Save a trip (same plan saved twice updates instead of duplicating)', { auth: 'user', body: 'SaveTripSchema', status: 201, errors: [400, 401] }],
  ['get', '/trips', 'Trips', 'My saved trips (summaries)', { auth: 'user', errors: [401] }],
  ['get', '/trips/{id}', 'Trips', 'One saved trip with its itinerary', { auth: 'user', errors: [401, 404] }],
  ['put', '/trips/{id}', 'Trips', 'Update a saved trip (title, plan edits, packing ticks …)', { auth: 'user', body: 'UpdateTripSchema', errors: [400, 401, 404] }],
  ['delete', '/trips/{id}', 'Trips', 'Delete a saved trip', { auth: 'user', errors: [401, 404] }],

  ['post', '/map/enrich', 'Map', 'Find positions + road routes for a plan that is not saved', { auth: 'user', body: 'MapEnrichSchema', errors: [400, 401, 429], description: 'OpenStreetMap Nominatim (places) and OSRM (roads), cached; max 1 request per second to each.' }],
  ['post', '/trips/{id}/map', 'Map', 'Find positions + road routes for a saved trip (stored on the trip)', { auth: 'user', body: 'SavedTripMapSchema', errors: [400, 401, 404, 429] }],

  ['get', '/trips/{id}/share', 'Sharing', 'Share link settings and views of my trip', { auth: 'user', errors: [401, 404] }],
  ['put', '/trips/{id}/share', 'Sharing', 'Turn the share link on / off, or make a new link', { auth: 'user', body: 'ShareSettingsSchema', errors: [400, 401, 404] }],
  ['get', '/share/{slug}', 'Sharing', 'The public, read-only trip of a share link', { auth: 'optional', errors: [404], description: 'No e-mail, home city, notes, packing ticks or expenses. Visits by others count as views.' }],
  ['get', '/share/{slug}/pdf', 'Sharing', 'PDF of a shared trip', { ok: pdf, errors: [404, 429] }],
  ['post', '/share/{slug}/copy', 'Sharing', 'Save a copy of a shared trip to my trips', { auth: 'user', status: 201, errors: [401, 404] }],

  ['get', '/trips/{id}/expenses', 'Expenses', 'The trip ledger: expenses, balances, who pays whom, spend vs plan', { auth: 'user', errors: [401, 404] }],
  ['post', '/trips/{id}/expenses', 'Expenses', 'Add an expense (amounts in paise)', { auth: 'user', body: 'ExpenseInputSchema', status: 201, errors: [400, 401, 404] }],
  ['put', '/trips/{id}/expenses/{expenseId}', 'Expenses', 'Change an expense', { auth: 'user', body: 'ExpenseInputSchema', errors: [400, 401, 404] }],
  ['delete', '/trips/{id}/expenses/{expenseId}', 'Expenses', 'Delete an expense', { auth: 'user', errors: [401, 404] }],
  ['post', '/trips/{id}/settlements', 'Expenses', 'Record a payment between two people (settling up)', { auth: 'user', body: 'SettlementInputSchema', status: 201, errors: [400, 401, 404] }],
  ['put', '/trips/{id}/members', 'Expenses', 'The people on the trip', { auth: 'user', body: 'TripMembersSchema', errors: [400, 401, 404] }],

  ['get', '/destinations', 'Destinations', 'Explore: Indian destinations (search, filter)', { query: 'DestinationListQuery', errors: [400] }],
  ['get', '/destinations/{slug}', 'Destinations', 'One destination with its places', { errors: [404] }],
  ['get', '/recommendations/hotels', 'Destinations', 'Stays for a destination and budget', { query: 'StaysQuery', errors: [400] }],
  ['get', '/recommendations/restaurants', 'Destinations', 'Restaurants for a destination', { query: 'RestaurantsQuery', errors: [400] }],
  ['get', '/favorites', 'Destinations', 'My favourite destinations', { auth: 'user', errors: [401] }],
  ['put', '/favorites/{slug}', 'Destinations', 'Add a favourite', { auth: 'user', errors: [401, 404] }],
  ['delete', '/favorites/{slug}', 'Destinations', 'Remove a favourite', { auth: 'user', errors: [401] }],

  ['get', '/travel/weather', 'Travel info', 'Weather for the trip dates (forecast, or last year’s climate)', { query: 'WeatherQuery', errors: [400, 429], description: 'Open-Meteo, cached.' }],
  ['get', '/travel/reach', 'Travel info', 'How to reach: nearest airport / railway station, road distance from your city', { query: 'ReachQuery', errors: [400, 429] }],

  ['post', '/contact', 'Contact', 'Send a message to the team', { auth: 'optional', body: 'ContactSchema', status: 201, errors: [400, 429] }],

  ['get', '/admin/stats', 'Admin', 'Dashboard numbers: sign-ups, trips, AI use, popular destinations', { auth: 'admin', query: 'AdminStatsQuery', errors: [400, 401, 403] }],
  ['get', '/admin/messages', 'Admin', 'Contact messages (filter: status=new|read)', { auth: 'admin', errors: [401, 403] }],
  ['put', '/admin/messages/{id}', 'Admin', 'Mark a message read / unread', { auth: 'admin', body: 'MessageStatusSchema', errors: [400, 401, 403, 404] }],
  ['delete', '/admin/messages/{id}', 'Admin', 'Delete a message', { auth: 'admin', errors: [401, 403, 404] }],
  ['get', '/admin/users', 'Admin', 'Accounts with their trip counts (search)', { auth: 'admin', query: 'AdminUsersQuery', errors: [400, 401, 403] }],
];

/** The paths (method + /api path) that are documented — used by the tests. */
export const documentedEndpoints = ENDPOINTS.map(([method, path]) => ({ method, path: `/api${path}` }));

const TAGS = [
  ['System', 'Health check'],
  ['Account', 'Sign up, log in (JWT in an httpOnly cookie "tp_session")'],
  ['Trips', 'Generate, save and edit itineraries'],
  ['Map', 'Positions and road routes (OpenStreetMap)'],
  ['Sharing', 'Read-only share links, copies, PDF'],
  ['Expenses', 'Group expenses and settling up'],
  ['Destinations', 'Explore, stays, restaurants, favourites'],
  ['Travel info', 'Weather and how to reach'],
  ['Contact', 'Contact form'],
  ['Admin', 'Admin dashboard (admins only)'],
];

let cached = null;

export const buildOpenApi = () => {
  if (cached) return cached;
  const paths = {};
  for (const [method, path, tag, summary, o = {}] of ENDPOINTS) {
    const operation = {
      tags: [tag],
      summary,
      ...(o.description && { description: o.description }),
      operationId: `${method}${path.replace(/\{(\w+)\}/g, 'By-$1').replace(/[^A-Za-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))}`,
      parameters: [...pathParameters(path), ...(o.query ? queryParameters(o.query) : [])],
      ...(o.body && { requestBody: { required: true, content: { 'application/json': { schema: ref(o.body) } } } }),
      responses: {
        [o.status ?? 200]: o.ok ?? ok('Done'),
        ...Object.fromEntries((o.errors ?? [400, 401]).map((code) => [code, ERRORS[code]])),
      },
      ...(o.auth === 'user' || o.auth === 'admin' ? { security: [{ cookieAuth: [] }] } : { security: o.auth === 'optional' ? [{}, { cookieAuth: [] }] : [] }),
    };
    if (!operation.parameters.length) delete operation.parameters;
    if (o.auth === 'admin') operation.description = `${operation.description ? `${operation.description} ` : ''}Admins only (ADMIN_EMAILS or role "admin").`;
    paths[path] = { ...paths[path], [method]: operation };
  }

  const errorResponse = (description) => ({
    description,
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  });

  cached = {
    openapi: '3.1.0',
    info: {
      title: `${projectInfo.name} API`,
      version: projectInfo.version,
      description: `${projectInfo.tagline}. B.Tech project, ${projectInfo.college.name}.\n\nAll answers are JSON: \`{ "success": true, "data": … }\` or \`{ "success": false, "error": "message", "details": … }\`. Most routes need a login: POST /auth/login (or /auth/demo) sets an httpOnly session cookie that the browser sends with the next requests.`,
    },
    servers: [{ url: '/api', description: 'This server' }],
    tags: TAGS.map(([name, description]) => ({ name, description })),
    paths,
    components: {
      securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: config.auth.cookieName } },
      schemas: {
        Error: {
          type: 'object',
          required: ['success', 'error'],
          properties: {
            success: { const: false },
            error: { type: 'string', examples: ['Trip not found.'] },
            details: { description: 'Which fields are wrong (validation errors)' },
          },
        },
        ...Object.fromEntries(MODELS.map((name) => [modelName(name), toSchema(shared[name])])),
      },
      responses: {
        BadRequest: errorResponse('The request is not valid (see details)'),
        Unauthorized: errorResponse('Not logged in'),
        Forbidden: errorResponse('Not allowed'),
        NotFound: errorResponse('Not found'),
        TooMany: errorResponse('Too many requests — wait a little (rate limit) or the daily AI limit is used up'),
      },
    },
  };
  return cached;
};

