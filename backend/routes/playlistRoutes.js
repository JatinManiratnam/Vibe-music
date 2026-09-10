const express = require('express');
const router = express.Router();
const {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addSongToPlaylist,
  removeSongFromPlaylist,
  deletePlaylist,
} = require('../controllers/playlistController');
const { protect } = require('../middleware/authMiddleware');

// All playlist routes are protected
router.use(protect);

router.get('/', getUserPlaylists);
router.post('/', createPlaylist);
router.get('/:id', getPlaylistById);
router.delete('/:id', deletePlaylist);
router.put('/:id/songs', addSongToPlaylist);
router.delete('/:id/songs/:songId', removeSongFromPlaylist);

module.exports = router;
