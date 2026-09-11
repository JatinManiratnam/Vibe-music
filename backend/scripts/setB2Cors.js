'use strict';

/**
 * One-time script: configure CORS on the Backblaze B2 bucket so browsers
 * can stream audio and load cover images directly from B2 using presigned URLs.
 *
 * ── How B2 CORS works in Vibe Music ─────────────────────────────────────────
 *  1. Frontend asks backend: GET /api/songs/:id/stream-url
 *  2. Backend returns a short-lived B2 presigned URL (1 hour, via AWS SDK v3)
 *  3. Browser sets <audio>.src = presignedUrl  →  browser GETs directly from B2
 *  4. Browser sends "Origin:" header with its own origin (localhost:3000, vercel.app)
 *  5. B2 checks its CORS rules — if the origin matches, it adds CORS response headers
 *  6. Without matching CORS rules the browser blocks the response → no audio
 *
 * ── Run ─────────────────────────────────────────────────────────────────────
 *  Development:
 *    node backend/scripts/setB2Cors.js
 *
 *  Production (add your Vercel URL first):
 *    FRONTEND_URL=https://your-app.vercel.app node backend/scripts/setB2Cors.js
 *
 * ── Environment variables ────────────────────────────────────────────────────
 *  FRONTEND_URL   Vercel frontend URL(s), comma-separated. Added to the allowlist.
 *                 Leave empty locally — localhost:3000 is always included.
 *                 Example: FRONTEND_URL=https://vibe-music.vercel.app
 *
 *  All other B2 credentials are read from .env (B2_BUCKET_NAME, B2_ENDPOINT, etc.)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { PutBucketCorsCommand, GetBucketCorsCommand } = require('@aws-sdk/client-s3');
const b2Client = require('../services/storage/b2Client');

// ── Build origin allowlist ────────────────────────────────────────────────────
const buildAllowedOrigins = () => {
  // localhost:3000 is always allowed for local development
  const origins = new Set(['http://localhost:3000']);

  if (process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL
      .split(',')
      .map(o => o.trim())
      .filter(Boolean)
      .forEach(o => origins.add(o));
    console.log('[B2 CORS] FRONTEND_URL origins added:', [...origins].filter(o => !o.includes('localhost')));
  } else {
    console.log('[B2 CORS] FRONTEND_URL not set — only localhost:3000 will be allowed.');
    console.log('[B2 CORS] Before deploying, set FRONTEND_URL=https://your-app.vercel.app and re-run this script.');
  }

  return [...origins];
};

// ── Show current config before changing anything ─────────────────────────────
const showCurrentConfig = async () => {
  try {
    const current = await b2Client.send(new GetBucketCorsCommand({
      Bucket: process.env.B2_BUCKET_NAME,
    }));
    console.log('\n[B2 CORS] Current configuration on bucket:', process.env.B2_BUCKET_NAME);
    (current.CORSRules || []).forEach((rule, i) => {
      console.log(`  Rule ${i + 1}:`);
      console.log('    Origins:', rule.AllowedOrigins);
      console.log('    Methods:', rule.AllowedMethods);
      console.log('    AllowedHeaders:', rule.AllowedHeaders);
      console.log('    ExposeHeaders:', rule.ExposeHeaders);
      console.log('    MaxAgeSeconds:', rule.MaxAgeSeconds);
    });
    console.log('');
  } catch (err) {
    console.log('[B2 CORS] Could not retrieve existing config (may not be set yet):', err.message);
  }
};

// ── Apply new configuration ───────────────────────────────────────────────────
const setBucketCors = async () => {
  const allowedOrigins = buildAllowedOrigins();

  await showCurrentConfig();

  // ── CORS Rule ──────────────────────────────────────────────────────────────
  // The browser makes a direct GET request to B2 with:
  //   - Origin: <frontend domain>           → must be in AllowedOrigins
  //   - Range: bytes=N-M                    → must be in AllowedHeaders for seek to work
  //   - Accept, Accept-Encoding             → standard browser headers
  //
  // ExposeHeaders allow the browser JS / HTML5 audio element to read:
  //   - Content-Length                      → needed for duration calculation
  //   - Content-Range                       → returned with HTTP 206 for range requests
  //   - Accept-Ranges                       → signals browser that seeking is supported
  //   - ETag                               → browser caching
  //   - Content-Type                        → MIME type verification
  //
  // Only GET and HEAD are needed — uploads go server-side via the Express backend,
  // so PUT/POST/DELETE are not required in B2 CORS.
  // ──────────────────────────────────────────────────────────────────────────
  const corsConfig = {
    Bucket: process.env.B2_BUCKET_NAME,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: allowedOrigins,
          AllowedMethods: ['GET', 'HEAD'],
          // Scope to only headers the browser actually sends for audio streaming:
          // Range is critical for audio seeking (HTTP 206 partial content)
          AllowedHeaders: ['Range', 'Origin', 'Accept', 'Accept-Encoding', 'Accept-Language'],
          ExposeHeaders: [
            'ETag',
            'Content-Length',
            'Content-Type',
            'Accept-Ranges',
            'Content-Range',
          ],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  };

  try {
    await b2Client.send(new PutBucketCorsCommand(corsConfig));

    console.log('✅ B2 CORS configured successfully on bucket:', process.env.B2_BUCKET_NAME);
    console.log('\n  Allowed origins:');
    allowedOrigins.forEach(o => console.log('    -', o));
    console.log('  Allowed methods:   GET, HEAD');
    console.log('  Allowed headers:   Range, Origin, Accept, Accept-Encoding, Accept-Language');
    console.log('  Exposed headers:   ETag, Content-Length, Content-Type, Accept-Ranges, Content-Range');
    console.log('  MaxAgeSeconds:     3600 (1 hour preflight cache)');
    console.log('\n⚠️  IMPORTANT — After Vercel deployment:');
    console.log('   Set FRONTEND_URL=https://your-app.vercel.app in backend/.env');
    console.log('   Then re-run:  node backend/scripts/setB2Cors.js');
    console.log('   This will add the Vercel origin to the B2 allowlist.\n');

  } catch (err) {
    console.error('❌ Failed to set B2 CORS:', err.message);
    console.error('\nManual fallback — configure in Backblaze dashboard:');
    console.error('  Your Bucket → Settings → CORS Rules → Add Rule');
    console.error('  Origins:         http://localhost:3000  (+ your Vercel URL in production)');
    console.error('  Methods:         GET, HEAD');
    console.error('  Allowed headers: Range, Origin, Accept');
    console.error('  Expose headers:  ETag, Content-Length, Content-Type, Accept-Ranges, Content-Range');
    process.exit(1);
  }
};

setBucketCors();
