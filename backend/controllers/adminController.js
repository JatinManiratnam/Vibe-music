'use strict';

const User = require('../models/User');
const Song = require('../models/Song');
const { deleteFromB2 } = require('../services/storage/b2Service');

// ─── Users ──────────────────────────────────────────────────────────────────

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change a user's role (listener ↔ contributor only)
// @route   PATCH /api/admin/users/:id/role
// @access  Admin
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    // Only listener ↔ contributor transitions allowed from this endpoint
    if (!['listener', 'contributor'].includes(role)) {
      return res.status(400).json({
        message: "Role must be 'listener' or 'contributor'. Admin role cannot be set through this endpoint.",
      });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin cannot demote/change their own role
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: 'Admin cannot change their own role' });
    }

    // Protect existing admins from being accidentally changed
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot change the role of another admin' });
    }

    user.role = role;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Overview stats ──────────────────────────────────────────────────────────

// @desc    Get admin dashboard overview stats
// @route   GET /api/admin/stats
// @access  Admin
const getStats = async (req, res) => {
  try {
    const [totalUsers, totalContributors, totalSongs] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'contributor' }),
      Song.countDocuments(),
    ]);

    res.json({ totalUsers, totalContributors, totalSongs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Songs ───────────────────────────────────────────────────────────────────

// @desc    Get all songs (admin view, with uploader info)
// @route   GET /api/admin/songs
// @access  Admin
const getSongs = async (req, res) => {
  try {
    const songs = await Song.find()
      .populate('addedBy', 'name email role')
      .sort({ createdAt: -1 });
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete any song (admin only)
// @route   DELETE /api/admin/songs/:id
// @access  Admin
const deleteSong = async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    // Delete from B2 first to avoid orphaned storage objects
    if (song.b2Key) {
      try {
        await deleteFromB2(song.b2Key);
      } catch (b2Err) {
        console.error('[Admin deleteSong] Failed to delete B2 object:', song.b2Key, b2Err.message);
        return res.status(500).json({
          message: 'Failed to delete audio file from storage. Song record not removed to avoid inconsistent state.',
        });
      }
    }
    
    if (song.coverB2Key) {
      try {
        await deleteFromB2(song.coverB2Key);
      } catch (coverErr) {
        console.error('[Admin deleteSong] Failed to delete B2 cover object:', song.coverB2Key, coverErr.message);
        // Continue with deletion, as audio and mongo doc are more critical
      }
    }

    await song.deleteOne();
    res.json({ message: 'Song removed by admin' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUsers, updateUserRole, getStats, getSongs, deleteSong };
