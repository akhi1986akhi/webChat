const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    id: String,
    type: { type: String, enum: ['user', 'admin'] },
    name: String
  }],
  lastMessage: {
    content: String,
    timestamp: Date,
    sender: String
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'pending'],
    default: 'active'
  }
});

conversationSchema.index({ 'participants.id': 1 });
conversationSchema.index({ lastActivity: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);