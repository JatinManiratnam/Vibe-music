'use strict';

// Load env vars before anything else
require('dotenv').config();

const { PutObjectCommand } = require('@aws-sdk/client-s3');
const b2Client = require('./services/storage/b2Client');

const BUCKET = process.env.B2_BUCKET_NAME;
const KEY    = 'test/vibe-music-connection-test.txt';
const BODY   = 'Vibe Music B2 connection test';

async function run() {
  try {
    await b2Client.send(
      new PutObjectCommand({
        Bucket:      BUCKET,
        Key:         KEY,
        Body:        BODY,
        ContentType: 'text/plain',
      })
    );
    console.log(`✅ B2 upload succeeded — object key: ${KEY}`);
    console.log(`   Bucket : ${BUCKET}`);
  } catch (err) {
    console.error('❌ B2 upload failed.');
    console.error(`   Error name    : ${err.name}`);
    console.error(`   Error message : ${err.message}`);
    process.exit(1);
  }
}

run();
