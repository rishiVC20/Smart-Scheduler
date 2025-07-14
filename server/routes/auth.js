const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Meeting, ScheduledMeeting } = require('../models/Meeting');
const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');
const Notification = require('../models/Notification');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

// Google OAuth2 setup
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const CREDENTIALS_PATH = 'E:/Scheduling Project/server/credentials.json';
const TOKEN_PATH = path.join(__dirname, '../token.json');

function generateToken(user) {
  return jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
}

// Middleware to verify JWT
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    req.user = decoded;
    next();
  });
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    const token = generateToken(user);
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { name: user.name, email: user.email, _id: user._id }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = generateToken(user);
    res.status(200).json({
      message: 'Login successful',
      token,
      user: { name: user.name, email: user.email, _id: user._id }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Search users by partial email
router.get('/search-users', authMiddleware, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.json([]);
    }

    const me = await User.findById(req.user.id);

    // Find all users matching the search, except for the user themselves
    const users = await User.find({
      email: { $regex: email, $options: 'i' },
      _id: { $ne: me._id }
    }).select('name email').lean(); // .lean() for plain JS objects to add properties

    // Add a 'status' field to each user based on their relationship with the current user
    const usersWithStatus = users.map(user => {
      let status = 'none';
      if (me.friends.some(friendId => friendId.equals(user._id))) {
        status = 'friend';
      } else if (me.sentRequests.some(reqId => reqId.equals(user._id))) {
        status = 'sent';
      }
      return { ...user, status };
    });

    res.json(usersWithStatus);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send friend request
router.post('/send-request', authMiddleware, async (req, res) => {
  try {
    const { toUserId } = req.body;
    const fromUser = await User.findById(req.user.id);
    const toUser = await User.findById(toUserId);
    if (!toUser) return res.status(404).json({ message: 'User not found' });
    if (fromUser.friends.includes(toUserId) || fromUser.sentRequests.includes(toUserId) || fromUser.receivedRequests.includes(toUserId)) {
      return res.status(400).json({ message: 'Already friends or request pending' });
    }
    fromUser.sentRequests.push(toUserId);
    toUser.receivedRequests.push(fromUser._id);
    await fromUser.save();
    await toUser.save();
    // Create notification for recipient
    await Notification.create({
      user: toUserId,
      type: 'friend_request',
      message: `${fromUser.name} sent you a friend request`,
      data: { fromUserId: fromUser._id, fromUserName: fromUser.name, fromUserEmail: fromUser.email },
    });
    res.json({ message: 'Friend request sent' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept friend request
router.post('/accept-request', authMiddleware, async (req, res) => {
  try {
    const { fromUserId } = req.body;
    const me = await User.findById(req.user.id);
    const fromUser = await User.findById(fromUserId);
    if (!fromUser) return res.status(404).json({ message: 'User not found' });
    if (!me.receivedRequests.includes(fromUserId)) {
      return res.status(400).json({ message: 'No such request' });
    }
    // Remove from requests
    me.receivedRequests = me.receivedRequests.filter(id => id.toString() !== fromUserId);
    fromUser.sentRequests = fromUser.sentRequests.filter(id => id.toString() !== me._id.toString());
    // Add to friends
    me.friends.push(fromUserId);
    fromUser.friends.push(me._id);
    await me.save();
    await fromUser.save();
    // Notify sender
    await Notification.create({
      user: fromUserId,
      type: 'friend_request',
      message: `${me.name} accepted your friend request`,
      data: { toUserId: me._id, toUserName: me.name, toUserEmail: me.email },
    });
    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get friends and requests
router.get('/connections', authMiddleware, async (req, res) => {
  try {
    const me = await User.findById(req.user.id)
      .populate('friends', 'name email')
      .populate('sentRequests', 'name email')
      .populate('receivedRequests', 'name email');
    res.json({
      friends: me.friends,
      sentRequests: me.sentRequests,
      receivedRequests: me.receivedRequests
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Schedule a meeting
router.post('/schedule-meeting', authMiddleware, async (req, res) => {
  try {
    const { friendIds, duration, title, meetingDate, windowStart, windowEnd } = req.body;
    if (!friendIds || !Array.isArray(friendIds) || friendIds.length === 0) {
      return res.status(400).json({ message: 'No friends selected' });
    }
    // Provide custom or default title and deadlineToRespond
    const meeting = new Meeting({
      title: title || 'Meeting',
      description: '',
      host: req.user.id,
      invitees: friendIds,
      duration,
      meetingDate,
      windowStart,
      windowEnd,
      deadlineToRespond: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      inviteeResponses: [],
      status: 'pending',
      // Do not set finalizedSlot or suggestedSlots on creation
    });
    await meeting.save();
    // Notify all invitees
    for (const inviteeId of friendIds) {
      await Notification.create({
        user: inviteeId,
        type: 'meeting_invite',
        message: `${req.user.name} invited you to a meeting: ${meeting.title}`,
        data: { meetingId: meeting._id, hostId: req.user.id, hostName: req.user.name },
      });
    }
    res.json({ message: 'Meeting scheduled', meeting });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get meetings for logged-in user (as host or invitee) - REWRITTEN FOR ACCURACY
router.get('/meetings', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Step 1: Fetch all relevant meetings, getting plain JS objects
    const meetings = await Meeting.find({
      $or: [{ host: userId }, { invitees: userId }]
    })
      .populate('host', 'name email')
      .populate('invitees', 'name email')
      .populate({
        path: 'inviteeResponses',
        populate: {
          path: 'user',
          select: 'name email'
        }
      })
      .lean(); // .lean() is crucial for performance and avoiding Mongoose doc issues

    // Step 2: Manually process each meeting to ensure correct counts and data
    const finalMeetings = await Promise.all(
      meetings.map(async (meeting) => {
        // Patch: Ensure all inviteeResponses have a user object (not just id)
        if (Array.isArray(meeting.inviteeResponses)) {
          for (let resp of meeting.inviteeResponses) {
            if (resp.user && typeof resp.user === 'string') {
              // Populate user object if missing
              const userObj = await User.findById(resp.user).select('name email _id').lean();
              if (userObj) resp.user = userObj;
            }
          }
        }
        // Create a new Set of user IDs who have submitted valid timings.
        const usersWhoResponded = new Set(
          (meeting.inviteeResponses || [])
            .filter(response => response.user && response.timings && response.timings.length > 0)
            .map(response => (response.user._id ? response.user._id.toString() : response.user.toString()))
        );
        meeting.submittedCount = usersWhoResponded.size;
        if (meeting.finalizedSlot && meeting.finalizedSlot.confirmedParticipants?.length > 0) {
          meeting.finalizedSlot.confirmedParticipants = await User.find({
            _id: { $in: meeting.finalizedSlot.confirmedParticipants }
          }).select('name email _id').lean();
        }
        return meeting;
      })
    );

    res.json(finalMeetings);

  } catch (err) {
    console.error('Error in /api/meetings endpoint:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Invitee submits a timing (one at a time, no edit)
router.post('/meetings/:id/respond', authMiddleware, async (req, res) => {
  try {
    const { start, end } = req.body;
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    // Only invited friends can respond
    if (!meeting.invitees.map(id => id.toString()).includes(req.user.id)) {
      return res.status(403).json({ message: 'Not invited' });
    }
    // Validate duration
    const durationMs = meeting.duration * 60 * 1000;
    if (new Date(end) - new Date(start) < durationMs) {
      return res.status(400).json({ message: 'Timing must be at least the meeting duration' });
    }
    // Find or create invitee response
    let response = meeting.inviteeResponses.find(r => r.user.toString() === req.user.id);
    if (!response) {
      response = { user: req.user.id, timings: [] };
      meeting.inviteeResponses.push(response);
    }
    // No edit, only add
    response.timings.push({ start, end });
    await meeting.save();
    res.json({ message: 'Timing submitted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get count of pending meeting invites for notification badge
router.get('/meetings/notifications', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const meetings = await Meeting.find({
      invitees: userId,
      status: { $in: ['pending', 'awaiting_selection'] } // Only count for non-finalized/expired meetings
    });
    // Count meetings where user has not submitted any timings
    let count = 0;
    meetings.forEach(m => {
      const resp = m.inviteeResponses.find(r => r.user.toString() === userId);
      if (!resp || resp.timings.length === 0) count++;
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Sweep line algorithm to suggest top 3 meeting times
router.get('/meetings/:id/suggest-times', authMiddleware, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('host', 'name email _id')
      .populate('invitees', 'name email _id')
      .populate('inviteeResponses.user', 'name email _id');
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    // Collect all intervals: host + invitees
    const allParticipants = [
      { _id: meeting.host._id, name: meeting.host.name, email: meeting.host.email, timings: [] },
      ...meeting.invitees.map(i => ({ _id: i._id, name: i.name, email: i.email, timings: [] }))
    ];
    // Fill timings for each participant
    allParticipants.forEach(p => {
      const resp = meeting.inviteeResponses.find(r => r.user._id.toString() === p._id.toString());
      if (resp) p.timings = resp.timings;
      if (p._id.toString() === meeting.host._id.toString()) {
        // Host can also submit timings (optional, for now assume host is always available)
        if (!p.timings || p.timings.length === 0) {
          // If host hasn't submitted, assume always available
          p.timings = [{ start: new Date(0), end: new Date(9999, 0, 1) }];
        }
      }
    });
    // Build events for sweep line: { time, type: 'start'|'end', userId }
    let events = [];
    allParticipants.forEach(p => {
      p.timings.forEach(t => {
        events.push({ time: new Date(t.start), type: 'start', userId: p._id.toString() });
        events.push({ time: new Date(t.end), type: 'end', userId: p._id.toString() });
      });
    });
    events.sort((a, b) => a.time - b.time || (a.type === 'start' ? -1 : 1));
    // Sweep line to find all intervals with at least host+1, and >= duration
    const durationMs = meeting.duration * 60 * 1000;
    let active = new Set();
    let intervals = [];
    for (let i = 0; i < events.length - 1; ++i) {
      const e = events[i];
      if (e.type === 'start') active.add(e.userId);
      else active.delete(e.userId);
      const nextTime = events[i + 1].time;
      const currTime = e.time;
      if (nextTime - currTime >= durationMs && active.has(meeting.host._id.toString()) && active.size >= 2) {
        intervals.push({
          start: new Date(currTime),
          end: new Date(nextTime),
          participants: Array.from(active)
        });
      }
    }
    // For each interval, expand to all possible sub-intervals of exact duration
    let candidateSlots = [];
    intervals.forEach(intv => {
      let slotStart = new Date(intv.start);
      while (slotStart.getTime() + durationMs <= intv.end.getTime()) {
        let slotEnd = new Date(slotStart.getTime() + durationMs);
        candidateSlots.push({
          start: new Date(slotStart),
          end: new Date(slotEnd),
          participants: intv.participants
        });
        slotStart = new Date(slotStart.getTime() + 5 * 60 * 1000); // 5 min step
      }
    });
    // Group by participant set, prioritize by most participants
    candidateSlots.forEach(slot => {
      slot.participantObjs = allParticipants.filter(p => slot.participants.includes(p._id.toString()));
    });
    candidateSlots.sort((a, b) => b.participants.length - a.participants.length || a.start - b.start);
    // Only keep slots with max participants, or next lower if none
    let topSlots = [];
    let maxCount = candidateSlots.length > 0 ? candidateSlots[0].participants.length : 0;
    for (let slot of candidateSlots) {
      if (slot.participants.length < maxCount && topSlots.length > 0) break;
      topSlots.push(slot);
      if (topSlots.length >= 3) break;
    }
    // If less than 3, add next best (host+1, etc.)
    if (topSlots.length < 3) {
      let nextCount = maxCount - 1;
      while (topSlots.length < 3 && nextCount >= 2) {
        let more = candidateSlots.filter(s => s.participants.length === nextCount);
        for (let s of more) {
          topSlots.push(s);
          if (topSlots.length >= 3) break;
        }
        nextCount--;
      }
    }
    // Format output
    const result = topSlots.map(slot => ({
      start: slot.start,
      end: slot.end,
      participants: slot.participantObjs.map(p => ({ _id: p._id, name: p.name, email: p.email }))
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Clear all timings for the current user for a meeting
router.post('/meetings/:id/clear-timings', authMiddleware, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    // Only invited friends can clear timings
    if (!meeting.invitees.map(id => id.toString()).includes(req.user.id)) {
      return res.status(403).json({ message: 'Not invited' });
    }
    // Find invitee response
    let response = meeting.inviteeResponses.find(r => r.user.toString() === req.user.id);
    if (response) {
      response.timings = [];
      await meeting.save();
      return res.json({ message: 'Timings cleared' });
    } else {
      return res.json({ message: 'No timings to clear' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

function getOAuth2Client() {
  console.log('Current working directory:', process.cwd());
  console.log('Looking for credentials at:', CREDENTIALS_PATH);
  console.log('File exists:', fs.existsSync(CREDENTIALS_PATH));
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  if (fs.existsSync(TOKEN_PATH)) {
    oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
  }
  return oAuth2Client;
}

// OAuth2 callback route (visit this URL in browser to authorize)
router.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  const oAuth2Client = getOAuth2Client();
  if (!code) {
    return res.status(400).send('No code provided');
  }
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    res.send('Google Calendar authorization successful! You can close this tab.');
  } catch (err) {
    res.status(500).send('Error retrieving access token: ' + err.message);
  }
});

// Schedule a GMeet for a meeting slot
router.post('/meetings/:id/schedule-gmeet', authMiddleware, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id).populate('host').populate('invitees');
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    if (meeting.host._id.toString() !== req.user.id) return res.status(403).json({ message: 'Only host can schedule' });
    let { start, end, participants } = req.body; // participants: [{name, email, _id}]
    if (!start || !end || !participants || participants.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    // Ensure all participants have _id
    const User = require('../models/User');
    const getId = async (p) => {
      if (p._id) return p._id;
      const user = await User.findOne({ email: p.email });
      return user ? user._id : null;
    };
    const confirmedParticipants = [];
    for (const p of participants) {
      const id = await getId(p);
      if (id) confirmedParticipants.push(id);
    }
    const oAuth2Client = getOAuth2Client();
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    // Create event
    const event = {
      summary: meeting.title,
      description: meeting.description || '',
      start: { dateTime: new Date(start).toISOString() },
      end: { dateTime: new Date(end).toISOString() },
      attendees: participants.map(p => ({ email: p.email, displayName: p.name })),
      conferenceData: {
        createRequest: {
          requestId: Math.random().toString(36).substring(2),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      },
    };
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    });
    const meetLink = response.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri;
    // Save to ScheduledMeeting collection
    const scheduled = new ScheduledMeeting({
      meetingId: meeting._id,
      title: meeting.title,
      host: meeting.host._id,
      invitees: meeting.invitees.map(i => i._id),
      start: new Date(start),
      end: new Date(end),
      meetLink,
    });
    await scheduled.save();
    // Update original meeting: set meetLink, finalizedSlot, and status
    meeting.meetLink = meetLink;
    meeting.finalizedSlot = {
      start: new Date(start),
      end: new Date(end),
      confirmedParticipants,
    };
    meeting.status = 'finalized';
    await meeting.save();
    // Notify all participants except host
    for (const invitee of meeting.invitees) {
      if (invitee._id.toString() !== meeting.host._id.toString()) {
        await Notification.create({
          user: invitee._id,
          type: 'meeting_scheduled',
          message: `Meeting scheduled: ${meeting.title}. Join link: ${meetLink}`,
          data: { meetingId: meeting._id, meetLink },
        });
      }
    }
    res.json({ meetLink, event: response.data, scheduled });
  } catch (err) {
    console.error('Error in /api/meetings/:id/schedule-gmeet:', err, err?.stack);
    if (err.code === 401) {
      // Not authorized, prompt for OAuth
      const oAuth2Client = getOAuth2Client();
      const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
      return res.status(401).json({ message: 'Google authorization required', authUrl });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 