const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderEmail: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text',
  },
  room: {
    type: String,
    default: 'general',
  },
});

// Index for faster queries
messageSchema.index({ timestamp: -1 });
messageSchema.index({ sender: 1, timestamp: -1 });
messageSchema.index({ room: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);