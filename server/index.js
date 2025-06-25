const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRouter = require('./routes/auth');
const notificationRouter = require('./routes/notification');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const TOKEN_PATH = path.join(__dirname, 'token.json');

app.use(cors({
  origin: true,
  credentials: true,
  exposedHeaders: ['Authorization']
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
  res.send('API is running');
});

app.use('/api', authRouter);
app.use('/api', notificationRouter);

function getOAuth2Client() {
  const credentials = JSON.parse(fs.readFileSync('E:/Scheduling Project/server/credentials.json'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
}

app.get('/api/google-auth', (req, res) => {
  const oAuth2Client = getOAuth2Client();
  const SCOPES = ['https://www.googleapis.com/auth/calendar'];
  const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
  res.send(`<a href="${authUrl}">Click here to authorize Google Calendar access</a>`);
});

app.get('/oauth2callback', async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 