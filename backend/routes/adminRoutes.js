'use strict';

const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/authMiddleware');
const {
  getUsers,
  updateUserRole,
  getStats,
  getSongs,
  deleteSong,
} = require('../controllers/adminController');

// Every admin route requires a valid JWT AND admin role
router.use(protect, requireRole('admin'));

// ── Overview ──────────────────────────────────────────────────
router.get('/stats', getStats);

// ── Users ─────────────────────────────────────────────────────
router.get('/users', getUsers);
router.patch('/users/:id/role', updateUserRole);

// ── Songs ─────────────────────────────────────────────────────
router.get('/songs', getSongs);
router.delete('/songs/:id', deleteSong);

module.exports = router;
