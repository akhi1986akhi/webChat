const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true,
  },
  receiver: {
    type: String,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isFromAdmin: {
    type: Boolean,
    default: false,
  },
  isRead: {
    type: Boolean,
    default: false,
  }
});

// Keep only essential indexes
messageSchema.index({ timestamp: -1 });
messageSchema.index({ sender: 1, timestamp: -1 });

// Virtual for formatted time (optional, keep if needed)
messageSchema.virtual('formattedTime').get(function() {
  return this.timestamp.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
});

module.exports = mongoose.model('Message', messageSchema);