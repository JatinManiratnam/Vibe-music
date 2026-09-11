'use strict';

/**
 * One-time script: configure CORS on the Backblaze B2 bucket so browsers
 * can stream audio directly from B2 using presigned URLs.
 *
 * Run once:  node backend/scripts/setB2Cors.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { PutBucketCorsCommand } = require('@aws-sdk/client-s3');
const b2Client = require('../services/storage/b2Client');

async function setBucketCors() {
  const corsConfig = {
    Bucket: process.env.B2_BUCKET_NAME,
    CORSConfiguration: {
      CORSRules: [
        {
          // Allow GET and HEAD from the Vibe Music frontend origins
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'HEAD'],
          AllowedOrigins: [
            'http://localhost:3000',         // local dev
            'https://*.onrender.com',         // Render deployment
            'https://*.netlify.app',          // Netlify (if used)
          ],
          // Required for browser seeking to work (HTTP 206 / range requests)
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
    console.log('✅ Backblaze B2 CORS configured successfully on bucket:', process.env.B2_BUCKET_NAME);
    console.log('   Allowed origins: localhost:3000, *.onrender.com, *.netlify.app');
    console.log('   Allowed methods: GET, HEAD');
    console.log('   Exposed headers: ETag, Content-Length, Content-Type, Accept-Ranges, Content-Range');
  } catch (err) {
    console.error('❌ Failed to set B2 CORS:', err.message);
    console.error('\nManual fallback — configure in Backblaze dashboard:');
    console.error('  Bucket → Settings → CORS Rules');
    console.error('  Origin: http://localhost:3000');
    console.error('  Methods: GET, HEAD');
    console.error('  Response headers: ETag, Content-Length, Content-Type, Accept-Ranges, Content-Range');
    process.exit(1);
  }
}

setBucketCors();
