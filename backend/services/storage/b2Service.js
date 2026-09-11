'use strict';

const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectVersionsCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { randomUUID } = require('crypto');
const path = require('path');
const b2Client = require('./b2Client');

const BUCKET = process.env.B2_BUCKET_NAME;

const fs = require('fs');

/**
 * Upload a file or buffer to Backblaze B2.
 *
 * @param {Object}  opts
 * @param {string}  [opts.filePath]   - Path to the local temporary file
 * @param {Buffer}  [opts.buffer]     - File content buffer (fallback)
 * @param {string}  opts.mimetype     - MIME type of the audio file
 * @param {string}  opts.originalname - Original filename (used only for extension)
 * @param {string}  [opts.prefix='songs/'] - B2 key prefix/folder
 * @param {string}  [opts.explicitKey] - Exact B2 key to use instead of randomUUID
 * @returns {Promise<string>}           The generated B2 object key
 */
const uploadToB2 = async ({ filePath, buffer, mimetype, originalname, prefix = 'songs/', explicitKey }) => {
  const ext = path.extname(originalname || '').toLowerCase() || '.bin';
  const key = explicitKey || `${prefix}${randomUUID()}${ext}`;

  const body = filePath ? fs.createReadStream(filePath) : buffer;

  await b2Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: mimetype,
  }));

  return key;
};

/**
 * Delete an object from Backblaze B2.
 * Throws on failure — callers must handle errors to avoid inconsistent state.
 *
 * @param {string} key - B2 object key (e.g. "songs/<uuid>.mp3")
 */
const deleteFromB2 = async (key) => {
  const versionsData = await b2Client.send(new ListObjectVersionsCommand({
    Bucket: BUCKET,
    Prefix: key,
  }));

  const versions = (versionsData.Versions || []).filter(v => v.Key === key);
  const deleteMarkers = (versionsData.DeleteMarkers || []).filter(dm => dm.Key === key);

  for (const v of versions) {
    await b2Client.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
      VersionId: v.VersionId,
    }));
  }

  for (const dm of deleteMarkers) {
    await b2Client.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
      VersionId: dm.VersionId,
    }));
  }

  if (versions.length === 0 && deleteMarkers.length === 0) {
    await b2Client.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));
  }
};

/**
 * Generate a short-lived presigned URL for audio streaming.
 * The browser uses this URL to stream audio directly from B2.
 * B2 handles all HTTP 206 range requests natively.
 *
 * @param {string} key       - B2 object key
 * @param {number} expiresIn - URL lifetime in seconds (default 3600 = 1 hour)
 * @returns {Promise<string>}  Presigned HTTPS URL
 */
const getStreamUrl = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(b2Client, command, { expiresIn });
};

module.exports = { uploadToB2, deleteFromB2, getStreamUrl };
