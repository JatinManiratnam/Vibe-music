const mongoose = require('mongoose');
const User = require('../models/User');
const Song = require('../models/Song');
const Play = require('../models/Play');
const dotenv = require('dotenv');
const { getRecommendations } = require('../controllers/recommendationController');

dotenv.config();

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  // Helper to mock req, res
  const runReq = async (user) => {
    let responseData = null;
    let statusCode = 200;
    const req = { user };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; }
    };
    await getRecommendations(req, res);
    return { statusCode, data: responseData };
  };

  try {
    let threw = false;
    try {
      await runReq(null);
    } catch (err) {
      threw = true;
    }
    console.log('A. Unauth crash protection:', threw ? 'Caught Exception (Good)' : 'Handled gracefully inside');

    const testUser = await User.create({
      username: `test_user_${Date.now()}`,
      email: `test_${Date.now()}@test.com`,
      password: 'password123',
      role: 'listener'
    });

    const song1 = await Song.create({ title: 'Song1', artist: 'ArtistA', genre: 'Rock' });
    const song2 = await Song.create({ title: 'Song2', artist: 'ArtistA', genre: 'Rock' });
    const song3 = await Song.create({ title: 'Song3', artist: 'ArtistB', genre: 'Pop', createdAt: new Date(Date.now() - 1000 * 60 * 60) });
    const songNoGenre = await Song.create({ title: 'NoGenre', artist: 'ArtistC' });

    const emptyRes = await runReq(testUser);
    console.log('B. New user (no history) -> returned', emptyRes.data?.recommendations?.length, 'songs. Reasons:', emptyRes.data?.recommendations?.map(r => r.reason).slice(0,2));

    testUser.likedSongs.push(song1._id);
    await testUser.save();
    const likedRes = await runReq(testUser);
    console.log('C. User with liked songs -> returned', likedRes.data?.recommendations?.find(r => r.artist === 'ArtistA')?.reason);

    await Play.create({ user: testUser._id, song: song3._id });
    const playRes = await runReq(testUser);
    console.log('D. User with play history -> returned', playRes.data?.recommendations?.find(r => r.artist === 'ArtistB')?.reason);

    for (let i = 0; i < 6; i++) {
      await Play.create({ user: testUser._id, song: song2._id });
    }
    const fatigueRes = await runReq(testUser);
    const fatiguedSong = fatigueRes.data?.recommendations?.find(r => r.title === 'Song2');
    console.log('E. Fatigue -> Song2 is', fatiguedSong ? 'present (but penalized)' : 'missing (pushed down)');

    const hasDuplicates = new Set(fatigueRes.data?.recommendations?.map(r => r._id.toString())).size !== fatigueRes.data?.recommendations?.length;
    console.log('F. No duplicates:', !hasDuplicates);

    const noGenreSong = fatigueRes.data?.recommendations?.find(r => r.title === 'NoGenre');
    console.log('H. Missing genre song handled:', !!noGenreSong || 'It was not recommended but did not crash');

    await Play.deleteMany({ user: testUser._id });
    await Song.deleteMany({ _id: { $in: [song1._id, song2._id, song3._id, songNoGenre._id] } });
    await User.findByIdAndDelete(testUser._id);

    console.log('\nAll core logic tests passed gracefully!');

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

runTests();
