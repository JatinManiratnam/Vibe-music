const mongoose = require('mongoose');

const playSchema = new mongoose.Schema({
  song: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for future analytics queries
playSchema.index({ song: 1, createdAt: -1 });
playSchema.index({ user: 1 });
playSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Play', playSchema);
