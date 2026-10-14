import arcjet, { shield, detectBot, slidingWindow } from '@arcjet/node';

let aj = null;

if (process.env.ARCJET_KEY) {
  try {
    aj = arcjet({
      key: process.env.ARCJET_KEY,
      rules: [
        // Shield protects against common attacks like SQL injection and XSS
        shield({
          mode: 'LIVE'
        }),
        // Bot detection
        detectBot({
          mode: 'LIVE',
          allow: ['CATEGORY:SEARCH_ENGINE']
        }),
        // Sliding window rate limit: max 60 requests per minute
        slidingWindow({
          mode: 'LIVE',
          interval: '1m',
          max: 60
        })
      ]
    });
    console.log('[Security] Arcjet rate limiting and bot protection initialized.');
  } catch (err) {
    console.warn('[Security] Arcjet initialization notice:', err.message);
  }
} else {
  console.log('[Security] Arcjet key not specified. Using built-in express rate limiter.');
}

export default aj;
