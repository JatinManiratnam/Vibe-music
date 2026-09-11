'use strict';

const Song = require('../models/Song');
const Play = require('../models/Play');
const User = require('../models/User');

const getRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Gather user context
    const user = await User.findById(userId).populate('likedSongs');

    // Fetch recent plays (last 48 hours)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentPlays = await Play.find({
      user: userId,
      createdAt: { $gte: fortyEightHoursAgo }
    }).populate('song');

    // Extract recent play counts per song
    const recentPlayCounts = {};
    recentPlays.forEach(play => {
      if (!play.song) return; // defensive
      const songId = play.song._id.toString();
      recentPlayCounts[songId] = (recentPlayCounts[songId] || 0) + 1;
    });

    // Derive Top Artists and Genres from liked songs + recent plays
    const artistScores = {};
    const genreScores = {};

    const recordPreference = (song, weight) => {
      if (song.artist) {
        artistScores[song.artist] = (artistScores[song.artist] || 0) + weight;
      }
      if (song.genre && song.genre !== 'Unknown') {
        genreScores[song.genre] = (genreScores[song.genre] || 0) + weight;
      }
    };

    user.likedSongs.forEach(song => recordPreference(song, 2));
    recentPlays.forEach(play => {
      if (play.song) recordPreference(play.song, 1);
    });

    // Get top 5 artists and top 3 genres
    const topArtists = Object.keys(artistScores)
      .sort((a, b) => artistScores[b] - artistScores[a])
      .slice(0, 5);
    const topGenres = Object.keys(genreScores)
      .sort((a, b) => genreScores[b] - genreScores[a])
      .slice(0, 3);

    // 2. Global Popularity Aggregation
    const popularAgg = await Play.aggregate([
      { $group: { _id: '$song', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 30 }
    ]);
    const popularSongIds = popularAgg.map(p => p._id.toString());

    // 3. Candidate Generation
    const candidatePromises = [];

    // Content Candidates
    if (topArtists.length > 0 || topGenres.length > 0) {
      const orConditions = [];
      if (topArtists.length > 0) orConditions.push({ artist: { $in: topArtists } });
      if (topGenres.length > 0) orConditions.push({ genre: { $in: topGenres } });

      candidatePromises.push(Song.find({ $or: orConditions }).limit(50).lean());
    }

    // Popular Candidates
    if (popularAgg.length > 0) {
      candidatePromises.push(Song.find({ _id: { $in: popularAgg.map(p => p._id) } }).lean());
    }

    // Fresh Candidates
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    candidatePromises.push(Song.find({ createdAt: { $gte: sevenDaysAgo } }).limit(20).lean());

    const candidateArrays = await Promise.all(candidatePromises);
    const candidateMap = new Map();

    candidateArrays.forEach(arr => {
      arr.forEach(song => {
        candidateMap.set(song._id.toString(), song);
      });
    });

    // 4. Scoring Engine
    const scoredCandidates = [];

    for (const [id, song] of candidateMap.entries()) {
      let score = 0;
      let reason = 'Recommended for you';
      let highestSignalScore = 0;

      const updateReason = (points, msg) => {
        score += points;
        if (points > highestSignalScore) {
          highestSignalScore = points;
          reason = msg;
        }
      };

      // Affinity Signals
      if (topArtists.includes(song.artist)) updateReason(30, 'Because you listen to this artist');
      if (song.genre && topGenres.includes(song.genre)) updateReason(20, 'Because you like this genre');

      // Popularity Signal
      if (popularSongIds.includes(id)) {
        updateReason(15, 'Popular on Vibe Music');
      }

      // Freshness Signal
      if (song.createdAt >= sevenDaysAgo) {
        updateReason(15, 'New on Vibe Music');
      }

      // Fatigue Penalty
      const recentPlaysForSong = recentPlayCounts[id] || 0;
      if (recentPlaysForSong > 5) {
        score -= 50;
      } else if (recentPlaysForSong > 0) {
        score -= 10;
      }

      scoredCandidates.push({ song, score, reason });
    }

    // 5. Diversification & Output
    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    const finalRecommendations = [];
    const artistCounts = {};

    for (const item of scoredCandidates) {
      if (finalRecommendations.length >= 15) break;

      const artist = item.song.artist;
      artistCounts[artist] = (artistCounts[artist] || 0) + 1;

      // Skip if we already have 3 songs by this artist
      if (artistCounts[artist] > 3) continue;

      const songData = {
        _id: item.song._id,
        title: item.song.title,
        artist: item.song.artist,
        album: item.song.album,
        genre: item.song.genre,
        duration: item.song.duration,
        addedBy: item.song.addedBy,
        createdAt: item.song.createdAt,
        reason: item.reason,
        // Required by usePlayer to detect B2 source and fetch a signed stream URL.
        // Without these fields, the player falls back to song.url (undefined for B2 songs)
        // and emits an audio playback error.
        b2Key: item.song.b2Key || null,
        audioVariants: item.song.audioVariants || null,
        url: item.song.url || null,
      };

      if (item.song.coverB2Key) {
         songData.coverB2Key = item.song.coverB2Key;
      } else if (item.song.coverImage) {
         songData.coverImage = item.song.coverImage;
      }

      finalRecommendations.push(songData);
    }

    if (process.env.RECOMMENDATION_DEBUG === 'true') {
      const reasonCounts = {};
      finalRecommendations.forEach(r => {
        reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1;
      });

      const coldStart = user.likedSongs.length === 0 && recentPlays.length === 0;

      console.log('\n[Recommendations]');
      console.log(`user: ...${userId.toString().slice(-6)}`);
      console.log(`coldStart: ${coldStart}`);
      console.log(`interactions: ${user.likedSongs.length + recentPlays.length}`);
      console.log(`candidates: ${candidateMap.size}`);
      console.log(`returned: ${finalRecommendations.length}`);
      console.log('reasons:');
      if (Object.keys(reasonCounts).length > 0) {
        Object.entries(reasonCounts).forEach(([r, count]) => {
          console.log(`  ${r}: ${count}`);
        });
      } else {
        console.log('  (none)');
      }
      console.log();
    }

    res.json({ recommendations: finalRecommendations });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ message: 'Failed to generate recommendations' });
  }
};

module.exports = {
  getRecommendations,
};
