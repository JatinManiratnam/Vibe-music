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
  // Origin of the play event. Existing documents without this field are treated
  // as 'direct' by application logic. The field is optional so legacy Play records
  // remain fully valid without a migration.
  source: {
    type: String,
    enum: ['direct', 'recommendation', 'playlist'],
    default: 'direct',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for future analytics queries
playSchema.index({ song: 1, createdAt: -1 });
playSchema.index({ user: 1, createdAt: -1 });
playSchema.index({ createdAt: -1 });
playSchema.index({ source: 1, createdAt: -1 }); // Recommendation effectiveness analytics

module.exports = mongoose.model('Play', playSchema);
