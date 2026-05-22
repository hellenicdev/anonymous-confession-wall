const mongoose = require('mongoose');

const confessionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Confession text is required'],
    trim: true,
    minlength: [1, 'Confession must be at least 1 character'],
    maxlength: [1000, 'Confession must be under 1000 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  reactions: {
    heart: { type: Number, default: 0 },
    fire: { type: Number, default: 0 },
    skull: { type: Number, default: 0 },
    laugh: { type: Number, default: 0 }
  },
  reports: {
    type: Number,
    default: 0
  },
  hidden: {
    type: Boolean,
    default: false
  },
  ipHash: {
    type: String,
    select: false
  },
  textHash: {
    type: String,
    select: false,
    index: true
  }
});

confessionSchema.index({ createdAt: -1 });
confessionSchema.index({ 'reactions.heart': -1, 'reactions.fire': -1, 'reactions.skull': -1, 'reactions.laugh': -1 });

module.exports = mongoose.model('Confession', confessionSchema);
