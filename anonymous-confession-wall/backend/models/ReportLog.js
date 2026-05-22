const mongoose = require('mongoose');

const reportLogSchema = new mongoose.Schema({
  confessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Confession',
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  ipHash: {
    type: String,
    required: true
  }
});

reportLogSchema.index({ confessionId: 1, ipHash: 1 }, { unique: true });

module.exports = mongoose.model('ReportLog', reportLogSchema);
