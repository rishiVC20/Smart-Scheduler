const mongoose = require('mongoose');

const timingSchema = new mongoose.Schema({
  start: { type: Date },
  end: { type: Date }
}, { _id: false });

const inviteeResponseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timings: [timingSchema],
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
  invitees: [
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
  suggestedSlots: [
    {
      start: { type: Date },
      end: { type: Date },
      availableUserIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        }
      ],
    }
  ],
  finalizedSlot: {
    start: { type: Date },
    end: { type: Date },
    confirmedParticipants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
  },
  meetLink: {
    type: String,
    default: null
  },
  inviteeResponses: [inviteeResponseSchema],
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

meetingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const scheduledMeetingSchema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
  title: { type: String, required: true },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invitees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  meetLink: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = {
  Meeting: mongoose.models.Meeting || mongoose.model('Meeting', meetingSchema),
  ScheduledMeeting: mongoose.models.ScheduledMeeting || mongoose.model('ScheduledMeeting', scheduledMeetingSchema)
}; 