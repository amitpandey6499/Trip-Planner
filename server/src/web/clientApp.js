import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { getShareMeta } from '../services/shareService.js';

/**
 * Part 18 — one service for app + API: the built React app (client/dist) is served by Express.
 * - /assets/* have content hashes in their names → cached for a year; index.html is never cached.
 * - Every other GET that is not /api → index.html (React Router decides the page).
 * - /share/:slug → index.html with Open Graph tags of that trip, so WhatsApp / Telegram show a preview.
 */

const escapeHtml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The template with the page title and preview tags of a shared trip (the general preview tags are replaced). */
export const withShareMeta = (template, meta) => {
  if (!meta) return template;
  const tags = [
    ['og:type', 'website'],
    ['og:site_name', 'TripPlanner'],
    ['og:title', meta.title],
    ['og:description', meta.description],
    ['og:url', meta.url],
    ...(meta.image ? [['og:image', meta.image]] : []),
  ]
    .map(([property, content]) => `<meta property="${property}" content="${escapeHtml(content)}" />`)
    .concat(
      `<meta name="description" content="${escapeHtml(meta.description)}" />`,
      `<meta name="twitter:card" content="${meta.image ? 'summary_large_image' : 'summary'}" />`,
    )
    .join('\n    ');
  return template
    .replace(/\s*<meta (?:property="og:[^"]*"|name="description"|name="twitter:[^"]*")[^>]*>/g, '')
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`)
    .replace('</head>', `    ${tags}\n  </head>`);
};

export const clientApp = ({ distDir }) => {
  const router = express.Router();
  const template = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  const sendPage = (res, html) => {
    res.set('Cache-Control', 'no-cache');
    res.type('html').send(html);
  };

  router.use('/assets', express.static(path.join(distDir, 'assets'), { immutable: true, maxAge: '1y', index: false, fallthrough: false }));
  router.use(express.static(distDir, { index: false, maxAge: '1h' }));

  router.get('/share/:slug', async (req, res) => {
    let meta = null;
    try {
      meta = await getShareMeta(req.params.slug);
    } catch {
      // database hiccup: the page still loads, just without a preview
    }
    sendPage(res, withShareMeta(template, meta));
  });

  // Everything else that is a page (not /api, not a file): the React app.
  router.use((req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path === '/api' || req.path.startsWith('/api/')) return next();
    sendPage(res, template);
  });
  return router;
};
