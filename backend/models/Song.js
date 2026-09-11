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
    // URL to the audio file.
    // - Legacy local songs: full HTTP URL (http://localhost:5000/uploads/...)
    // - B2-backed songs: null (playback uses b2Key + presigned URL)
    url: {
      type: String,
      default: null,
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
    // B2 object key for new uploads (songs/<uuid>.<ext>).
    // null for legacy local songs.
    b2Key: {
      type: String,
      default: null,
    },
    // B2 object key for cover images (covers/<uuid>.<ext>).
    coverB2Key: {
      type: String,
      default: null,
    },
    // Future audio variants support
    audioVariants: {
      standard: {
        b2Key: { type: String, default: null },
        format: { type: String },
        size: { type: Number }
      },
      lossless: {
        b2Key: { type: String, default: null },
        format: { type: String },
        size: { type: Number }
      }
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Song', songSchema);
