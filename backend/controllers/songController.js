'use strict';

const Song = require('../models/Song');
const User = require('../models/User');
const Play = require('../models/Play');
const { uploadToB2, deleteFromB2, getStreamUrl } = require('../services/storage/b2Service');

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

// @desc    Get a short-lived presigned stream URL for a song
// @route   GET /api/songs/:id/stream-url
// @access  Private (any authenticated user)
const getStreamUrlForSong = async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    const requestedQuality = req.query.quality;
    if (requestedQuality && !['standard', 'lossless'].includes(requestedQuality)) {
      return res.status(400).json({ message: 'Invalid quality requested. Must be "standard" or "lossless".' });
    }

    let targetB2Key = null;
    let selectedQuality = null;

    if (requestedQuality && song.audioVariants?.[requestedQuality]?.b2Key) {
      targetB2Key = song.audioVariants[requestedQuality].b2Key;
      selectedQuality = requestedQuality;
    } else if (song.audioVariants?.standard?.b2Key) {
      targetB2Key = song.audioVariants.standard.b2Key;
      selectedQuality = 'standard';
    } else if (song.b2Key) {
      targetB2Key = song.b2Key;
      selectedQuality = 'legacy';
    }

    // B2-backed song — generate presigned URL (expires in 1 hour)
    if (targetB2Key) {
      const streamUrl = await getStreamUrl(targetB2Key, 3600);
      return res.json({ streamUrl, quality: selectedQuality, source: 'b2' });
    }

    // Legacy local song — return the stored URL directly
    if (song.url) {
      return res.json({ streamUrl: song.url, quality: 'legacy', source: 'legacy' });
    }

    return res.status(404).json({ message: 'No audio source available for this song' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a short-lived presigned URL for a cover image
// @route   GET /api/songs/:id/cover-url
// @access  Public
const getCoverUrlForSong = async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    if (song.coverB2Key) {
      const coverUrl = await getStreamUrl(song.coverB2Key, 3600);
      return res.redirect(coverUrl);
    }

    if (song.coverImage) {
      return res.redirect(song.coverImage);
    }

    return res.status(404).json({ message: 'No cover image available for this song' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a new song (URL-based, for already-hosted audio)
// @route   POST /api/songs
// @access  Private (contributor)
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

const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);

const mongoose = require('mongoose');

const cleanupTempFiles = async (files) => {
  if (!files) return;
  const allFiles = [];
  if (files.audioStandard) allFiles.push(...files.audioStandard);
  if (files.audioLossless) allFiles.push(...files.audioLossless);
  if (files.cover) allFiles.push(...files.cover);
  
  for (const file of allFiles) {
    if (file.path) {
      try {
        await unlinkFile(file.path);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error('[cleanupTempFiles] Failed to delete temp file:', file.path, err.message);
        }
      }
    }
  }
};

// @desc    Upload a local audio file → B2 → create Song
// @route   POST /api/songs/upload
// @access  Private (contributor)
const uploadSong = async (req, res) => {
  let standardB2Key = null;
  let losslessB2Key = null;
  let coverB2Key = null;

  try {
    const hasStandard = req.files && req.files.audioStandard && req.files.audioStandard.length > 0;
    const hasLossless = req.files && req.files.audioLossless && req.files.audioLossless.length > 0;

    if (!hasStandard && !hasLossless) {
      return res.status(400).json({ message: 'At least one audio file (standard or lossless) must be provided.' });
    }

    const standardFile = hasStandard ? req.files.audioStandard[0] : null;
    const losslessFile = hasLossless ? req.files.audioLossless[0] : null;
    const coverFile = req.files.cover && req.files.cover.length > 0 ? req.files.cover[0] : null;

    if (coverFile && coverFile.size > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'Cover image must be less than 5MB' });
    }

    const { title, artist, album, genre, duration } = req.body;
    if (!title || !artist) {
      return res.status(400).json({ message: 'Title and artist are required' });
    }

    // ── Pre-generate MongoDB ObjectId (Option A) to construct stable B2 paths ──
    const songId = new mongoose.Types.ObjectId();

    // ── Step 1: Upload streams to B2 ──────────────────────────────
    try {
      if (standardFile) {
        const ext = require('path').extname(standardFile.originalname).toLowerCase() || '.mp3';
        standardB2Key = await uploadToB2({
          filePath: standardFile.path,
          mimetype: standardFile.mimetype,
          originalname: standardFile.originalname,
          explicitKey: `songs/${songId.toString()}/standard${ext}`
        });
      }
      if (losslessFile) {
        const ext = require('path').extname(losslessFile.originalname).toLowerCase() || '.flac';
        losslessB2Key = await uploadToB2({
          filePath: losslessFile.path,
          mimetype: losslessFile.mimetype,
          originalname: losslessFile.originalname,
          explicitKey: `songs/${songId.toString()}/lossless${ext}`
        });
      }
      if (coverFile) {
        const ext = require('path').extname(coverFile.originalname).toLowerCase() || '.jpg';
        coverB2Key = await uploadToB2({
          filePath: coverFile.path,
          mimetype: coverFile.mimetype,
          originalname: coverFile.originalname,
          explicitKey: `covers/${songId.toString()}/cover${ext}`
        });
      }
    } catch (b2UploadErr) {
      console.error('[uploadSong] B2 Upload failed, rolling back uploaded pieces...', b2UploadErr);
      if (standardB2Key) await deleteFromB2(standardB2Key).catch(() => {});
      if (losslessB2Key) await deleteFromB2(losslessB2Key).catch(() => {});
      if (coverB2Key) await deleteFromB2(coverB2Key).catch(() => {});
      return res.status(500).json({ message: 'Failed to upload files to storage server. Upload rolled back.' });
    }

    // ── Step 2: Persist Song in MongoDB ──────────────────────────
    let song;
    try {
      const audioVariants = {};
      if (standardFile) {
        audioVariants.standard = {
          b2Key: standardB2Key,
          format: standardFile.originalname.split('.').pop().toLowerCase(),
          size: standardFile.size
        };
      }
      if (losslessFile) {
        audioVariants.lossless = {
          b2Key: losslessB2Key,
          format: losslessFile.originalname.split('.').pop().toLowerCase(),
          size: losslessFile.size
        };
      }

      song = await Song.create({
        _id: songId,
        title,
        artist,
        album: album || 'Unknown Album',
        genre: genre || 'Unknown',
        url: null,     // Explicitly null for multi-variant uploads
        b2Key: null,   // Explicitly null for multi-variant uploads
        audioVariants,
        coverB2Key,
        duration: duration ? Number(duration) : 0,
        addedBy: req.user._id,
      });
    } catch (mongoErr) {
      // MongoDB failed after successful B2 uploads — remove orphaned object(s)
      console.error('[uploadSong] MongoDB write failed, cleaning up B2 objects:', { standardB2Key, losslessB2Key, coverB2Key });
      if (standardB2Key) await deleteFromB2(standardB2Key).catch(() => {});
      if (losslessB2Key) await deleteFromB2(losslessB2Key).catch(() => {});
      if (coverB2Key) await deleteFromB2(coverB2Key).catch(() => {});
      throw mongoErr;
    }

    res.status(201).json(song);
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await cleanupTempFiles(req.files);
  }
};

// @desc    Delete a song (contributor — own songs only; admin — any song)
// @route   DELETE /api/songs/:id
// @access  Private (contributor)
const deleteSong = async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    const userRole = req.user.role ?? 'listener';

    // Contributors may only delete their own songs
    if (userRole !== 'admin') {
      const ownerId = song.addedBy ? song.addedBy.toString() : null;
      if (!ownerId || ownerId !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Forbidden: you can only delete your own songs' });
      }
    }

    // ── Delete B2 object(s) first (if applicable) ───────────────────
    const keysToDelete = [];
    if (song.b2Key) keysToDelete.push(song.b2Key);
    if (song.audioVariants?.standard?.b2Key) keysToDelete.push(song.audioVariants.standard.b2Key);
    if (song.audioVariants?.lossless?.b2Key) keysToDelete.push(song.audioVariants.lossless.b2Key);
    
    // Deduplicate in case multiple fields share a key (e.g., during migration scripts later)
    const uniqueKeysToDelete = [...new Set(keysToDelete)];

    for (const key of uniqueKeysToDelete) {
      try {
        await deleteFromB2(key);
      } catch (b2Err) {
        console.error('[deleteSong] Failed to delete B2 object:', key, b2Err.message);
        return res.status(500).json({
          message: 'Failed to delete audio file from storage. Song record not removed to avoid inconsistent state.',
        });
      }
    }
    
    if (song.coverB2Key) {
      try {
        await deleteFromB2(song.coverB2Key);
      } catch (coverErr) {
        console.error('[deleteSong] Failed to delete B2 cover object:', song.coverB2Key, coverErr.message);
        // Continue with deletion, as audio and mongo doc are more critical
      }
    }

    await song.deleteOne();
    res.json({ message: 'Song removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get songs uploaded by the authenticated contributor
// @route   GET /api/songs/mine
// @access  Private (contributor)
const getMySongs = async (req, res) => {
  try {
    const songs = await Song.find({ addedBy: req.user._id }).sort({ createdAt: -1 });
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle like for a song
// @route   POST /api/songs/:id/like
// @access  Private
const toggleLike = async (req, res) => {
  try {
    const songId = req.params.id;
    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.likedSongs) {
      user.likedSongs = [];
    }

    const index = user.likedSongs.indexOf(songId);
    let liked = false;
    
    if (index === -1) {
      user.likedSongs.push(songId);
      liked = true;
    } else {
      user.likedSongs.splice(index, 1);
      liked = false;
    }

    await user.save();

    res.json({
      liked,
      likedSongs: user.likedSongs,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Record a play for a song
// @route   POST /api/songs/:id/play
// @access  Private
const recordPlay = async (req, res) => {
  try {
    const songId = req.params.id;
    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }

    // Accept an optional source field from the client.
    // Only allow known enum values; anything else falls back to 'direct'
    // so that old clients and new clients both work.
    const ALLOWED_SOURCES = ['direct', 'recommendation', 'playlist'];
    const source = ALLOWED_SOURCES.includes(req.body?.source) ? req.body.source : 'direct';

    await Play.create({
      song: songId,
      user: req.user._id,
      source,
    });

    res.json({ recorded: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get contributor analytics
// @route   GET /api/songs/analytics
// @access  Private (Contributor only)
const getContributorAnalytics = async (req, res) => {
  try {
    const contributorId = req.user._id;

    // 1. Get all song IDs owned by this contributor
    const songs = await Song.find({ addedBy: contributorId }).select('_id');
    const songIds = songs.map((s) => s._id);

    // Default empty response
    const emptyResponse = {
      totalSongs: 0,
      totalPlays: 0,
      totalLikes: 0,
      totalListeners: 0,
      topSongs: [],
      recentPlays: [], // Deprecated, keeping for backward safety
      recentSongs: [],
      playsOverTime: [],
    };

    if (songIds.length === 0) {
      return res.json(emptyResponse);
    }

    // 2. Aggregate Total Plays & Listeners
    const totalsAgg = await Play.aggregate([
      { $match: { song: { $in: songIds } } },
      { $group: {
          _id: null,
          totalPlays: { $sum: 1 },
          listeners: { $addToSet: '$user' }
      }}
    ]);

    let totalPlays = 0;
    let totalListeners = 0;
    if (totalsAgg.length > 0) {
      totalPlays = totalsAgg[0].totalPlays;
      totalListeners = totalsAgg[0].listeners.length;
    }

    // 3. Top Songs
    const topSongsAgg = await Play.aggregate([
      { $match: { song: { $in: songIds } } },
      { $group: { _id: '$song', playCount: { $sum: 1 } } },
      { $sort: { playCount: -1 } },
      { $limit: 5 },
      { $lookup: {
          from: 'songs',
          localField: '_id',
          foreignField: '_id',
          as: 'songData'
      }},
      { $unwind: '$songData' },
      { $project: {
          _id: 1,
          playCount: 1,
          title: '$songData.title',
          artist: '$songData.artist',
          album: '$songData.album',
          coverImage: '$songData.coverImage',
          coverB2Key: '$songData.coverB2Key'
      }}
    ]);

    // Calculate likes for top songs (we do this manually since likes are in User.likedSongs)
    const topSongIds = topSongsAgg.map(s => s._id);
    const likesAgg = await User.aggregate([
      { $project: { likedSongs: 1 } },
      { $unwind: '$likedSongs' },
      { $match: { likedSongs: { $in: topSongIds } } },
      { $group: { _id: '$likedSongs', likeCount: { $sum: 1 } } }
    ]);
    const likeMap = {};
    likesAgg.forEach(l => { likeMap[l._id.toString()] = l.likeCount; });

    topSongsAgg.forEach(s => {
      s.likeCount = likeMap[s._id.toString()] || 0;
    });

    // Calculate Total Likes for all songs
    const totalLikesAgg = await User.aggregate([
      { $project: { likedSongs: 1 } },
      { $unwind: '$likedSongs' },
      { $match: { likedSongs: { $in: songIds } } },
      { $count: 'totalLikes' }
    ]);
    const totalLikes = totalLikesAgg.length > 0 ? totalLikesAgg[0].totalLikes : 0;

    // 4. Recent Plays (keeping for backward compatibility if needed, but adding Recent Songs)
    const recentPlaysRaw = await Play.find({ song: { $in: songIds } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('song', 'title artist coverImage coverB2Key');

    const recentPlays = recentPlaysRaw.map((p) => ({
      songId: p.song._id,
      title: p.song.title,
      artist: p.song.artist,
      playedAt: p.createdAt,
      coverImage: p.song.coverImage,
      coverB2Key: p.song.coverB2Key
    }));

    // 4.5 Recent Songs (Uploads)
    const recentSongs = await Song.find({ addedBy: contributorId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title artist coverImage coverB2Key createdAt');

    // 5. Per-song plays over time (last 30 days) — ONE aggregation for ALL songs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 5a. Overall daily plays (all creator songs combined)
    const playsOverTimeRaw = await Play.aggregate([
      { $match: { song: { $in: songIds }, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          plays: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    const playsOverTime = playsOverTimeRaw.map((p) => ({
      date: p._id,
      plays: p.plays
    }));

    // 5b. Per-song daily plays (last 30 days) — grouped by song + date
    const perSongDailyRaw = await Play.aggregate([
      { $match: { song: { $in: songIds }, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: {
          _id: {
            song: '$song',
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
          },
          plays: { $sum: 1 }
      }},
      { $sort: { '_id.date': 1 } }
    ]);

    // Build a map: songId -> { date -> plays }
    const perSongDailyMap = {};
    perSongDailyRaw.forEach(r => {
      const sid = r._id.song.toString();
      if (!perSongDailyMap[sid]) perSongDailyMap[sid] = {};
      perSongDailyMap[sid][r._id.date] = r.plays;
    });

    // 6. All creator songs — total plays + likes per song
    const allSongsRaw = await Song.find({ addedBy: contributorId })
      .sort({ createdAt: -1 })
      .select('_id title artist coverImage coverB2Key createdAt');

    // Plays per song
    const playsPerSongAgg = await Play.aggregate([
      { $match: { song: { $in: songIds } } },
      { $group: { _id: '$song', totalPlays: { $sum: 1 } } }
    ]);
    const playsPerSongMap = {};
    playsPerSongAgg.forEach(p => { playsPerSongMap[p._id.toString()] = p.totalPlays; });

    // Likes per song (from User.likedSongs)
    const allSongLikesAgg = await User.aggregate([
      { $project: { likedSongs: 1 } },
      { $unwind: '$likedSongs' },
      { $match: { likedSongs: { $in: songIds } } },
      { $group: { _id: '$likedSongs', likeCount: { $sum: 1 } } }
    ]);
    const allSongLikesMap = {};
    allSongLikesAgg.forEach(l => { allSongLikesMap[l._id.toString()] = l.likeCount; });

    // Build zero-filled 30-day dailyPlays for each song
    const dateRange = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dateRange.push(d.toISOString().split('T')[0]);
    }

    const songs30d = allSongsRaw.map(song => {
      const sid = song._id.toString();
      const dayMap = perSongDailyMap[sid] || {};
      const dailyPlays = dateRange.map(date => ({ date, plays: dayMap[date] || 0 }));
      return {
        _id: sid,
        title: song.title,
        artist: song.artist,
        coverImage: song.coverImage,
        coverB2Key: song.coverB2Key,
        totalPlays: playsPerSongMap[sid] || 0,
        totalLikes: allSongLikesMap[sid] || 0,
        dailyPlays
      };
    });

    // Sort by totalPlays descending
    songs30d.sort((a, b) => b.totalPlays - a.totalPlays);

    res.json({
      totalSongs: songIds.length,
      totalPlays,
      totalLikes,
      totalListeners,
      topSongs: topSongsAgg,
      recentSongs,
      playsOverTime,
      songs: songs30d,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllSongs, getSongById, getStreamUrlForSong, getCoverUrlForSong, addSong, deleteSong, uploadSong, getMySongs, toggleLike, recordPlay, getContributorAnalytics };

