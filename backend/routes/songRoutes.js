const express = require('express');
const router = express.Router();
const {
  getAllSongs,
  getSongById,
  addSong,
  deleteSong,
  uploadSong,
} = require('../controllers/songController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// Public routes
router.get('/', getAllSongs);
router.get('/:id', getSongById);

// Protected routes
router.post('/upload', protect, upload.single('audio'), uploadSong);
router.post('/', protect, addSong);
router.delete('/:id', protect, deleteSong);

module.exports = router;
