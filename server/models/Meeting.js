const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  availableUserIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  ],
}, { _id: false });

const finalizedSlotSchema = new mongoose.Schema({
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  confirmedParticipants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  ],
}, { _id: false });

const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  ],
  duration: {
    type: Number, // Duration in minutes
    required: true
  },
  deadlineToRespond: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'awaiting_selection', 'finalized', 'expired'],
    default: 'pending'
  },
  suggestedSlots: [timeSlotSchema],
  finalizedSlot: finalizedSlotSchema,
  meetLink: {
    type: String,
    default: null
  },
}, { timestamps: true });

meetingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.models.Meeting || mongoose.model('Meeting', meetingSchema); 