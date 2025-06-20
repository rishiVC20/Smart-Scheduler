const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Meeting = require('../models/Meeting');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

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

// Search users by partial email (exclude self, already friends, sent/received requests)
router.get('/search-users', authMiddleware, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.json([]);
    const me = await User.findById(req.user.id);
    const excludeIds = [me._id, ...me.friends, ...me.sentRequests, ...me.receivedRequests];
    const users = await User.find({
      email: { $regex: email, $options: 'i' },
      _id: { $nin: excludeIds }
    }).select('name email');
    res.json(users);
  } catch (err) {
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
    const { friendIds, duration, title } = req.body;
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
      deadlineToRespond: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      inviteeResponses: [],
      status: 'pending',
      // Do not set finalizedSlot or suggestedSlots on creation
    });
    await meeting.save();
    res.json({ message: 'Meeting scheduled', meeting });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get meetings for logged-in user (as host or invitee)
router.get('/meetings', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const meetings = await Meeting.find({
      $or: [
        { host: userId },
        { invitees: userId }
      ]
    })
      .populate('host', 'name email')
      .populate('invitees', 'name email')
      .populate('inviteeResponses.user', 'name email');
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
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
    const meetings = await Meeting.find({ invitees: userId });
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

module.exports = router; 