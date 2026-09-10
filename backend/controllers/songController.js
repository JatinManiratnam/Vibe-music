const Song = require('../models/Song');

// @desc    Get all songs (with optional search query)
// @route   GET /api/songs
// @access  Public
const getAllSongs = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { artist: { $regex: search, $options: 'i' } },
          { album: { $regex: search, $options: 'i' } },
          { genre: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const songs = await Song.find(query).sort({ createdAt: -1 });
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single song by ID
// @route   GET /api/songs/:id
// @access  Public
const getSongById = async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }
    res.json(song);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a new song
// @route   POST /api/songs
// @access  Private
const addSong = async (req, res) => {
  try {
    const { title, artist, album, genre, url, coverImage, duration } = req.body;

    if (!title || !artist || !url) {
      return res.status(400).json({ message: 'Title, artist and URL are required' });
    }

    const song = await Song.create({
      title,
      artist,
      album,
      genre,
      url,
      coverImage,
      duration,
      addedBy: req.user._id,
    });

    res.status(201).json(song);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a song
// @route   DELETE /api/songs/:id
// @access  Private
const deleteSong = async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    await song.deleteOne();
    res.json({ message: 'Song removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload a local audio file and create a song
// @route   POST /api/songs/upload
// @access  Private
const uploadSong = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file uploaded' });
    }

    const { title, artist, album, genre, duration } = req.body;

    if (!title || !artist) {
      return res.status(400).json({ message: 'Title and artist are required' });
    }

    // Build the public URL for the uploaded file
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    const song = await Song.create({
      title,
      artist,
      album: album || 'Unknown Album',
      genre: genre || 'Unknown',
      url: fileUrl,
      duration: duration ? Number(duration) : 0,
      addedBy: req.user._id,
    });

    res.status(201).json(song);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllSongs, getSongById, addSong, deleteSong, uploadSong };
