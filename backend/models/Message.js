const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  sender: {
    type: String, // 'user' ya 'admin'
    required: true,
    enum: ['user', 'admin']
  },
  senderId: {
    type: String, // User ID ya 'admin'
    required: true
  },
  receiverId: {
    type: String, // User ID ya 'admin'
    required: true
  },
  senderSocketId: {
    type: String // Optional: Socket ID for tracking
  },
  receiverSocketId: {
    type: String // Optional: Socket ID for tracking
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'image', 'broadcast'],
    default: 'text'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  // Metadata for user/admin info
  userInfo: {
    name: String,
    email: String,
    contact: String
  },
  adminInfo: {
    name: String
  },
  // For broadcast messages
  isBroadcast: {
    type: Boolean,
    default: false
  },
  broadcastTo: [{
    userId: String,
    name: String
  }]
});

// Composite index for faster queries
messageSchema.index({ conversationId: 1, timestamp: 1 });
messageSchema.index({ senderId: 1, receiverId: 1, timestamp: -1 });

// Virtual for conversation between two parties
messageSchema.virtual('conversationKey').get(function() {
  const participants = [this.senderId, this.receiverId].sort();
  return participants.join('_');
});

module.exports = mongoose.model('Message', messageSchema);