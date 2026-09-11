const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('e:/minor-project/vibe-music/backend/models/User');
const Song = require('e:/minor-project/vibe-music/backend/models/Song');
const Play = require('e:/minor-project/vibe-music/backend/models/Play');

dotenv.config();

async function checkDb() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    const start = Date.now();
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`Connected successfully in ${Date.now() - start}ms.`);
    
    const userCount = await User.countDocuments();
    const songCount = await Song.countDocuments();
    const playCount = await Play.countDocuments();
    
    // Users with liked songs
    const usersWithLikes = await User.countDocuments({ 'likedSongs.0': { $exists: true } });
    
    console.log('--- DATABASE STATS ---');
    console.log('Users:', userCount);
    console.log('Songs:', songCount);
    console.log('Plays:', playCount);
    console.log('Users with Likes:', usersWithLikes);
    console.log('----------------------');

    // Get a random user who has likes or plays
    let testUser = await User.findOne({ 'likedSongs.0': { $exists: true } });
    if (!testUser) {
       const recentPlay = await Play.findOne().sort({ createdAt: -1 });
       if (recentPlay) testUser = await User.findById(recentPlay.user);
    }
    
    if (testUser) {
      console.log('Found a test user with ID:', testUser._id.toString());
      console.log('User Role:', testUser.role);
    } else {
      console.log('No suitable test user found with history.');
    }
    
    await mongoose.disconnect();
    console.log('Disconnected.');
  } catch (error) {
    console.error('Atlas Connection Failed:', error.message);
  }
}

checkDb();
