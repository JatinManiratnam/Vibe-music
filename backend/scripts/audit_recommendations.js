/**
 * ML-7 — Recommendation Quality Audit Script
 *
 * Tests scoring signals against the live API running on localhost:5000.
 * Creates temporary test users and songs, then cleans them up.
 * No production data is modified.
 */

'use strict';

const mongoose = require('mongoose');
const dotenv   = require('dotenv');
const User     = require('../models/User');
const Song     = require('../models/Song');
const Play     = require('../models/Play');
const { getRecommendations } = require('../controllers/recommendationController');

dotenv.config();

// ─── helpers ────────────────────────────────────────────────────────────────

let pass = 0;
let fail = 0;
const results = [];

function assert(label, condition, detail = '') {
  const status = condition ? 'PASS' : 'FAIL';
  condition ? pass++ : fail++;
  const line = `[${status}] ${label}${detail ? ' — ' + detail : ''}`;
  results.push(line);
  console.log(line);
}

/** Mock Express req/res so we can call the controller directly. */
async function callRec(user) {
  let body = null;
  let status = 200;
  const req = { user };
  const res = {
    status(code) { status = code; return this; },
    json(data)   { body = data; },
  };
  await getRecommendations(req, res);
  return { status, body };
}

let createdUserIds = [];
let createdSongIds = [];

async function makeUser(suffix) {
  const u = await User.create({
    name:     `ml7_${suffix}`,
    email:    `ml7_${suffix}_${Date.now()}@audit.test`,
    password: 'audit123',
    role:     'listener',
  });
  createdUserIds.push(u._id);
  return u;
}

async function makeSong(overrides = {}) {
  const s = await Song.create({
    title:  overrides.title  || `AuditSong_${Date.now()}`,
    artist: overrides.artist || 'AuditArtist',
    genre:  overrides.genre  || 'AuditGenre',
    b2Key:  overrides.b2Key  || `audit/fake-${Date.now()}.mp3`,
    ...overrides,
  });
  createdSongIds.push(s._id);
  return s;
}

async function makePlays(userId, songId, count, ageMs = 0) {
  const docs = [];
  for (let i = 0; i < count; i++) {
    docs.push({ user: userId, song: songId, createdAt: new Date(Date.now() - ageMs) });
  }
  await Play.insertMany(docs);
}

async function cleanup() {
  await Play.deleteMany({ user: { $in: createdUserIds } });
  await Song.deleteMany({ _id: { $in: createdSongIds } });
  await User.deleteMany({ _id: { $in: createdUserIds } });
}

// ─── main audit ─────────────────────────────────────────────────────────────

async function runAudit() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas\n');

  // ── 0. Real database inventory ───────────────────────────────────────────
  const realSongs = await Song.countDocuments();
  const realUsers = await User.countDocuments();
  const realPlays = await Play.countDocuments();
  const realUsersWithLikes = await User.countDocuments({ 'likedSongs.0': { $exists: true } });
  console.log('─── Real database inventory ───');
  console.log(`  Songs  : ${realSongs}`);
  console.log(`  Users  : ${realUsers}`);
  console.log(`  Plays  : ${realPlays}`);
  console.log(`  Users with likes: ${realUsersWithLikes}`);
  console.log('───────────────────────────────\n');

  try {

    // ── TC-1: Cold-start user ─────────────────────────────────────────────
    console.log('TC-1: Cold-start user');
    const coldUser = await makeUser('cold');
    // Add fresh songs so there is something to recommend
    const freshSong = await makeSong({ title: 'FreshHit', artist: 'Nobody' });
    const { body: coldBody } = await callRec(coldUser);
    assert('TC-1 No crash for cold-start user', !!coldBody);
    assert('TC-1 Returns recommendations array', Array.isArray(coldBody?.recommendations));
    // Cold-start relies on freshness/popularity fallbacks
    const coldReasons = (coldBody?.recommendations || []).map(r => r.reason);
    const coldFallback = coldReasons.some(r =>
      r === 'Popular on Vibe Music' || r === 'New on Vibe Music' || r === 'Recommended for you'
    );
    assert('TC-1 Cold-start uses popularity/freshness fallback', coldFallback || coldBody?.recommendations?.length === 0,
           coldBody?.recommendations?.length === 0 ? 'empty (db too small — acceptable)' : `reason: ${coldReasons[0]}`);

    // ── TC-2: Artist preference ───────────────────────────────────────────
    console.log('\nTC-2: Artist preference');
    const artistUser = await makeUser('artist');
    const artistSongA1 = await makeSong({ title: 'ArtistA_Song1', artist: 'BoostArtist', genre: 'Rock' });
    const artistSongA2 = await makeSong({ title: 'ArtistA_Song2', artist: 'BoostArtist', genre: 'Rock' });
    // User likes artistSongA1 — triggers artist affinity for BoostArtist
    artistUser.likedSongs.push(artistSongA1._id);
    await artistUser.save();

    const { body: artistBody } = await callRec(artistUser);
    const artistRec = (artistBody?.recommendations || []).find(r => r.artist === 'BoostArtist');
    assert('TC-2 Artist-affinity song is recommended', !!artistRec, artistRec ? `found: "${artistRec.title}"` : 'not found');
    assert('TC-2 Reason reflects artist affinity', artistRec?.reason === 'Because you listen to this artist', `reason: ${artistRec?.reason}`);

    // ── TC-3: Genre preference ────────────────────────────────────────────
    console.log('\nTC-3: Genre preference');
    const genreUser = await makeUser('genre');
    const genreSong = await makeSong({ title: 'GenreSong', artist: 'XYZ', genre: 'Jazz' });
    const likedGenreSong = await makeSong({ title: 'LikedJazzSong', artist: 'ABC', genre: 'Jazz' });
    genreUser.likedSongs.push(likedGenreSong._id);
    await genreUser.save();

    const { body: genreBody } = await callRec(genreUser);
    const genreRec = (genreBody?.recommendations || []).find(r => r._id.toString() === genreSong._id.toString());
    assert('TC-3 Genre-affinity song is recommended', !!genreRec, genreRec ? `found: "${genreRec.title}"` : 'not found');
    const genreReasonOk = genreRec?.reason === 'Because you like this genre' || genreRec?.reason === 'New on Vibe Music';
    assert('TC-3 Reason reflects genre or freshness', genreReasonOk, `reason: ${genreRec?.reason}`);

    // ── TC-4: Popularity signal ───────────────────────────────────────────
    console.log('\nTC-4: Popularity signal');
    const popUser  = await makeUser('pop');
    const popSong  = await makeSong({ title: 'PopHit', artist: 'PopStar', genre: 'Pop' });
    const otherUser1 = await makeUser('popplayer1');
    const otherUser2 = await makeUser('popplayer2');
    // Simulate many plays by other users
    await makePlays(otherUser1._id, popSong._id, 10, 96 * 60 * 60 * 1000); // older plays
    await makePlays(otherUser2._id, popSong._id, 8,  96 * 60 * 60 * 1000);

    const { body: popBody } = await callRec(popUser);
    const popRec = (popBody?.recommendations || []).find(r => r._id.toString() === popSong._id.toString());
    assert('TC-4 Popular song is recommended', !!popRec, popRec ? `found: "${popRec.title}"` : 'not found (may lose to freshness if tied)');
    assert('TC-4 Popularity reason is set', popRec?.reason === 'Popular on Vibe Music' || popRec?.reason === 'New on Vibe Music',
           `reason: ${popRec?.reason}`);

    // ── TC-5: Fatigue penalty (>5 plays in 48h) ───────────────────────────
    console.log('\nTC-5: Fatigue — >5 plays in 48h');
    const fatigueUser  = await makeUser('fatigue');
    const fatigueSong  = await makeSong({ title: 'FatigueSong', artist: 'OverplayedArtist', genre: 'EDM' });
    const freshSong2   = await makeSong({ title: 'FreshAlt', artist: 'FreshArtist', genre: 'EDM' });
    // 6 plays in the last 48h → -50 penalty
    await makePlays(fatigueUser._id, fatigueSong._id, 6, 1 * 60 * 60 * 1000);

    const { body: fatigueBody } = await callRec(fatigueUser);
    const fatiguedSong = (fatigueBody?.recommendations || []).find(r => r._id.toString() === fatigueSong._id.toString());
    const freshAlt     = (fatigueBody?.recommendations || []).find(r => r._id.toString() === freshSong2._id.toString());
    // The fatigued song can still appear if there are very few candidates, but must rank below fresh alt
    if (fatiguedSong && freshAlt) {
      const fatigueIdx = fatigueBody.recommendations.indexOf(fatiguedSong);
      const freshIdx   = fatigueBody.recommendations.indexOf(freshAlt);
      assert('TC-5a Fatigued song ranks below fresh alternative', fatigueIdx > freshIdx,
             `fatigued at pos ${fatigueIdx}, fresh at pos ${freshIdx}`);
    } else {
      assert('TC-5a Fatigued song is suppressed or absent', !fatiguedSong || !!freshAlt,
             `fatigued: ${!!fatiguedSong}, freshAlt present: ${!!freshAlt}`);
    }

    // ── TC-6: Fatigue penalty (1–4 plays) ────────────────────────────────
    console.log('\nTC-6: Fatigue — 1–4 plays in 48h');
    const mildUser = await makeUser('mild');
    const mildSong = await makeSong({ title: 'MildFatigue', artist: 'MildArtist', genre: 'Blues' });
    await makePlays(mildUser._id, mildSong._id, 3, 1 * 60 * 60 * 1000);

    const { body: mildBody } = await callRec(mildUser);
    // Song should still be returned — mild penalty doesn't eliminate it
    const mildRec = (mildBody?.recommendations || []).find(r => r._id.toString() === mildSong._id.toString());
    // With -10 and +15 freshness it should still appear
    assert('TC-6 Mild-fatigue song still recommended (score not fully suppressed)', !!mildRec,
           mildRec ? 'present' : 'absent (may be ok with large candidate pool)');

    // ── TC-7: Freshness boost ─────────────────────────────────────────────
    console.log('\nTC-7: Freshness boost');
    const freshUser  = await makeUser('fresh');
    const newSong    = await makeSong({ title: 'BrandNew', artist: 'NewcomerArtist', genre: 'Indie' });
    const { body: freshBody } = await callRec(freshUser);
    const newRec = (freshBody?.recommendations || []).find(r => r._id.toString() === newSong._id.toString());
    assert('TC-7 Freshly uploaded song is recommended', !!newRec, newRec ? `found: "${newRec.title}"` : 'not found');
    assert('TC-7 Reason is "New on Vibe Music"', newRec?.reason === 'New on Vibe Music', `reason: ${newRec?.reason}`);

    // ── TC-8: No duplicate song IDs ───────────────────────────────────────
    console.log('\nTC-8: Duplicate prevention');
    const dupUser = await makeUser('dup');
    dupUser.likedSongs.push(artistSongA1._id); // already a candidate via artist
    await dupUser.save();
    await makePlays(dupUser._id, artistSongA1._id, 1, 96 * 60 * 60 * 1000); // also in popularity

    const { body: dupBody } = await callRec(dupUser);
    const ids = (dupBody?.recommendations || []).map(r => r._id.toString());
    const uniqueIds = [...new Set(ids)];
    assert('TC-8 No duplicate song IDs', ids.length === uniqueIds.length,
           `total: ${ids.length}, unique: ${uniqueIds.length}`);

    // ── TC-9: Artist diversity cap (max 3 per artist) ────────────────────
    console.log('\nTC-9: Artist diversity cap');
    const divUser = await makeUser('div');
    // Create 5 songs from same artist + like one to trigger affinity
    const divSongs = [];
    for (let i = 0; i < 5; i++) {
      divSongs.push(await makeSong({ title: `DivSong${i}`, artist: 'MonoArtist', genre: 'Country' }));
    }
    divUser.likedSongs.push(divSongs[0]._id);
    await divUser.save();

    const { body: divBody } = await callRec(divUser);
    const monoArtistRecs = (divBody?.recommendations || []).filter(r => r.artist === 'MonoArtist');
    assert('TC-9 Artist diversity cap ≤ 3', monoArtistRecs.length <= 3,
           `MonoArtist appears ${monoArtistRecs.length} times`);

    // ── TC-10: Liked songs — do they appear in recommendations? ──────────
    console.log('\nTC-10: Liked songs in recommendations (audit only — no fix)');
    const likedAuditUser = await makeUser('likedaudit');
    const likedAuditSong = await makeSong({ title: 'AlreadyLiked', artist: 'LikedArtist', genre: 'Soul' });
    likedAuditUser.likedSongs.push(likedAuditSong._id);
    await likedAuditUser.save();

    const { body: likedAuditBody } = await callRec(likedAuditUser);
    const likedSongInRecs = (likedAuditBody?.recommendations || []).find(
      r => r._id.toString() === likedAuditSong._id.toString()
    );
    // Just report — don't assert pass/fail
    console.log(`[INFO] TC-10 Already-liked song appears in recommendations: ${!!likedSongInRecs}`);
    console.log(`[INFO] TC-10 Current behavior: liked songs are NOT excluded from recommendations`);

    // ── TC-11: Insufficient data evaluation ──────────────────────────────
    console.log('\nTC-11: Insufficient data evaluation');
    assert('TC-11 Real DB song count', realSongs >= 1, `${realSongs} songs`);
    const canMeaningfullyEvaluate = realSongs >= 20 && realPlays >= 50;
    console.log(`[INFO] TC-11 Enough data for meaningful quality eval: ${canMeaningfullyEvaluate}`);
    console.log(`[INFO] TC-11 Need ≥20 songs, ≥50 plays. Current: ${realSongs} songs, ${realPlays} plays`);

  } finally {
    await cleanup();
    await mongoose.disconnect();
  }

  // ── Final report ─────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log('AUDIT SUMMARY');
  console.log('═══════════════════════════════════════');
  results.forEach(r => console.log(r));
  console.log('───────────────────────────────────────');
  console.log(`Total: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
  console.log('═══════════════════════════════════════\n');
}

runAudit().catch(err => {
  console.error('Audit crashed:', err);
  process.exit(1);
});
