'use strict';

const express = require('express');
const router = express.Router();
const {
  getAllSongs,
  getSongById,
  getStreamUrlForSong,
  getCoverUrlForSong,
  getMySongs,
  addSong,
  deleteSong,
  uploadSong,
  toggleLike,
  recordPlay,
  getContributorAnalytics,
} = require('../controllers/songController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/', getAllSongs);

// ── Protected — /mine and /stream-url MUST come before /:id ──────────────────
// to prevent Express treating "mine" or "stream-url" as a song ID parameter.

// Any authenticated user can get a stream URL for a song
router.get('/:id/stream-url', protect, getStreamUrlForSong);

// Public route to get a presigned URL for a cover image
router.get('/:id/cover-url', getCoverUrlForSong);

// Contributor analytics
router.get('/analytics', protect, requireRole('contributor'), getContributorAnalytics);

// Contributor's own uploaded songs
router.get('/mine', protect, requireRole('contributor'), getMySongs);

// ── Protected — Any authenticated user can like a song ────────────────────────
router.post('/:id/like', protect, toggleLike);

// ── Protected — Any authenticated user can record a play ──────────────────────
router.post('/:id/play', protect, recordPlay);

// ── Public — single song metadata ─────────────────────────────────────────────
router.get('/:id', getSongById);

// ── Protected — contributor ONLY ──────────────────────────────────────────────
// Admins manage songs via /api/admin/songs — they do NOT use these endpoints.
router.post('/upload', protect, requireRole('contributor'), upload.fields([
  { name: 'audioStandard', maxCount: 1 }, 
  { name: 'audioLossless', maxCount: 1 }, 
  { name: 'cover', maxCount: 1 }
]), uploadSong);
router.post('/', protect, requireRole('contributor'), addSong);

// Protected — contributor ONLY, with per-song ownership enforcement in controller
router.delete('/:id', protect, requireRole('contributor'), deleteSong);

module.exports = router;
