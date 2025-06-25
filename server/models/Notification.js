const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['friend_request', 'meeting_invite', 'meeting_scheduled'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  data: {
    type: Object, // Extra data (e.g., meetingId, senderId)
    default: {},
  },
  read: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema); 