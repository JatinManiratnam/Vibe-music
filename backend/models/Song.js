const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Song title is required'],
      trim: true,
    },
    artist: {
      type: String,
      required: [true, 'Artist name is required'],
      trim: true,
    },
    album: {
      type: String,
      default: 'Unknown Album',
      trim: true,
    },
    genre: {
      type: String,
      default: 'Unknown',
      trim: true,
    },
    // URL to the audio file (Cloudinary / S3 / direct link)
    url: {
      type: String,
      required: [true, 'Audio URL is required'],
    },
    // URL to the cover art image
    coverImage: {
      type: String,
      default: '',
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Song', songSchema);
