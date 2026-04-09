const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://saidjoseph777-art.github.io'] 
    : '*',
  credentials: true
}));
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/players', require('./routes/players'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/news', require('./routes/news'));
app.use('/api/standings', require('./routes/standings'));
app.use('/api/predictions', require('./routes/predictions'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// Replace the old authentication functions with these:

let currentUser = null;
let isOfficial = false;

// Initialize app
async function initApp() {
  const token = localStorage.getItem('lamu_token');
  
  if (token) {
    try {
      const data = await lamuAPI.auth.getMe();
      currentUser = data.user;
      updateUIForUser();
    } catch (error) {
      // Token invalid
      localStorage.removeItem('lamu_token');
      showLoginModal();
    }
  } else {
    showLoginModal();
  }

  await loadAllData();
}

async function loadAllData() {
  try {
    // Load all data from API
    const [teamsData, matchesData, newsData, standingsData] = await Promise.all([
      lamuAPI.teams.getAll(),
      lamuAPI.matches.getAll(),
      lamuAPI.news.getAll(),
      lamuAPI.standings.getTable()
    ]);

    // Store in memory (not localStorage for security)
    window.appData = {
      teams: teamsData,
      matches: matchesData,
      news: newsData,
      standings: standingsData
    };

    renderTeams();
    renderFixtures();
    renderLeagueTable();
    renderNews();
  } catch (error) {
    showToast('Failed to load data. Please refresh.');
  }
}

// PIN Login
async function pinLogin() {
  const name = document.getElementById('pinName').value.trim();
  const role = document.getElementById('pinRole').value;
  const pin = document.getElementById('pinCode').value;

  if (!name || pin.length !== 4) {
    showToast('Please enter name and 4-digit PIN');
    return;
  }

  try {
    // Try login first
    const data = await lamuAPI.auth.loginPin(name, pin);
    currentUser = data.user;
    hideLoginModal();
    updateUIForUser();
    showToast(`Welcome back, ${currentUser.name}!`);
    await loadAllData();
  } catch (error) {
    // If login fails, try register
    try {
      const data = await lamuAPI.auth.registerPin(name, pin, role);
      currentUser = data.user;
      hideLoginModal();
      showPinWarning();
      updateUIForUser();
      await loadAllData();
    } catch (regError) {
      showToast(regError.message || 'Login failed');
    }
  }
}

// Google Login
async function googleLogin() {
  // You'll need to integrate with Google OAuth2
  // For now, this is a placeholder that should be replaced with real Google Sign-In
  
  // Example using Google Identity Services:
  const client = google.accounts.oauth2.initTokenClient({
    client_id: 'YOUR_GOOGLE_CLIENT_ID',
    scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    callback: async (response) => {
      // Get user info from Google
      const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': `Bearer ${response.access_token}` }
      }).then(res => res.json());

      try {
        const data = await lamuAPI.auth.googleLogin({
          name: userInfo.name,
          email: userInfo.email,
          googleId: userInfo.sub,
          photo: userInfo.picture
        });
        
        currentUser = data.user;
        hideLoginModal();
        updateUIForUser();
        showToast('Welcome! Signed in with Google');
        await loadAllData();
      } catch (error) {
        showToast(error.message);
      }
    }
  });
  
  client.requestAccessToken();
}

function logout() {
  lamuAPI.auth.logout();
  currentUser = null;
  isOfficial = false;
  location.reload();
}

// Official Access
async function verifyOfficial() {
  const code = document.getElementById('officialCode').value;
  
  // Store code temporarily for admin requests
  window.adminCode = code;
  
  try {
    // Verify by making a test request
    await api('/matches', {
      method: 'GET',
      headers: { 'X-Admin-Code': code }
    });
    
    isOfficial = true;
    closeOfficialModal();
    toggleAdmin();
    document.getElementById('quickEditBtn').classList.add('visible');
    showToast('Official access granted!');
  } catch (error) {
    showToast('Invalid access code');
  }
}
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const ADMIN_CODE = process.env.ADMIN_SECRET_CODE || 'lamu2024';

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  teams: path.join(DATA_DIR, 'teams.json'),
  matches: path.join(DATA_DIR, 'matches.json'),
  players: path.join(DATA_DIR, 'players.json'),
  news: path.join(DATA_DIR, 'news.json')
};

// Ensure data directory exists
async function initDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Initialize files with default data if they don't exist
    const defaultTeams = [
      { _id: '1', name: 'Lamu Queens', abbr: 'LQ', logo: '🦁', stats: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }, colors: { primary: '#FF6B00', secondary: '#FFFFFF' }, isActive: true },
      { _id: '2', name: '11 Brothers', abbr: '11B', logo: '👥', stats: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }, colors: { primary: '#0047AB', secondary: '#FFD700' }, isActive: true },
      { _id: '3', name: 'Blue Rangers', abbr: 'BR', logo: '🔵', stats: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }, colors: { primary: '#0000FF', secondary: '#FFFFFF' }, isActive: true },
      { _id: '4', name: 'Mokowe FC', abbr: 'MFC', logo: '⚓', stats: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }, colors: { primary: '#008000', secondary: '#FFFFFF' }, isActive: true },
      { _id: '5', name: 'Witu Warriors', abbr: 'WW', logo: '⚔️', stats: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }, colors: { primary: '#800080', secondary: '#FFD700' }, isActive: true }
    ];

    for (const [key, filePath] of Object.entries(FILES)) {
      try {
        await fs.access(filePath);
      } catch {
        const defaultData = key === 'teams' ? defaultTeams : [];
        await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2));
      }
    }
  } catch (error) {
    console.error('Error initializing data directory:', error);
  }
}

// Helper functions
async function readData(file) {
  try {
    const data = await fs.readFile(FILES[file], 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeData(file, data) {
  await fs.writeFile(FILES[file], JSON.stringify(data, null, 2));
}

function generateToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
}

// Middleware
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const users = await readData('users');
    req.user = users.find(u => u._id === decoded.id);
    
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized' });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized for this action' });
    }
    next();
  };
};

// Auth Routes
app.post('/api/auth/register-pin', async (req, res) => {
  try {
    const { name, pin, role = 'fan' } = req.body;
    
    if (!name || !pin || pin.length !== 4) {
      return res.status(400).json({ message: 'Please provide name and 4-digit PIN' });
    }
    
    const users = await readData('users');
    
    if (users.find(u => u.name === name && u.authMethod === 'pin')) {
      return res.status(400).json({ message: 'Name already taken' });
    }
    
    const hashedPin = await bcrypt.hash(pin, 12);
    const newUser = {
      _id: Date.now().toString(),
      name,
      pin: hashedPin,
      authMethod: 'pin',
      role,
      favorites: { teams: [], players: [] },
      predictions: [],
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    await writeData('users', users);
    
    res.status(201).json({
      success: true,
      token: generateToken(newUser._id),
      user: {
        id: newUser._id,
        name: newUser.name,
        role: newUser.role,
        authMethod: newUser.authMethod
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/login-pin', async (req, res) => {
  try {
    const { name, pin } = req.body;
    
    const users = await readData('users');
    const user = users.find(u => u.name === name && u.authMethod === 'pin');
    
    if (!user || !(await bcrypt.compare(pin, user.pin))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    user.lastLogin = new Date().toISOString();
    await writeData('users', users);
    
    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        authMethod: user.authMethod
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { name, email, googleId, photo } = req.body;
    
    const users = await readData('users');
    let user = users.find(u => u.email === email);
    
    if (!user) {
      user = {
        _id: Date.now().toString(),
        name,
        email,
        googleId,
        profilePhoto: photo,
        authMethod: 'google',
        role: 'fan',
        favorites: { teams: [], players: [] },
        predictions: [],
        createdAt: new Date().toISOString()
      };
      users.push(user);
    }
    
    user.lastLogin = new Date().toISOString();
    await writeData('users', users);
    
    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        authMethod: user.authMethod,
        photo: user.profilePhoto
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/auth/me', protect, async (req, res) => {
  const { pin, ...userWithoutPin } = req.user;
  res.json({ success: true, user: userWithoutPin });
});

// Teams Routes
app.get('/api/teams', async (req, res) => {
  const teams = await readData('teams');
  res.json({ success: true, count: teams.length, teams });
});

app.post('/api/teams', protect, restrictTo('official', 'admin'), async (req, res) => {
  const teams = await readData('teams');
  const newTeam = {
    _id: Date.now().toString(),
    ...req.body,
    stats: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 },
    isActive: true,
    createdAt: new Date().toISOString()
  };
  teams.push(newTeam);
  await writeData('teams', teams);
  res.status(201).json({ success: true, team: newTeam });
});

app.put('/api/teams/:id', protect, restrictTo('official', 'admin'), async (req, res) => {
  const teams = await readData('teams');
  const index = teams.findIndex(t => t._id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Team not found' });
  
  teams[index] = { ...teams[index], ...req.body, updatedAt: new Date().toISOString() };
  await writeData('teams', teams);
  res.json({ success: true, team: teams[index] });
});

// Matches Routes
app.get('/api/matches', async (req, res) => {
  const matches = await readData('matches');
  const { status, date } = req.query;
  
  let filtered = matches;
  if (status) filtered = filtered.filter(m => m.status === status);
  if (date) {
    const queryDate = new Date(date).toDateString();
    filtered = filtered.filter(m => new Date(m.date).toDateString() === queryDate);
  }
  
  res.json({ success: true, count: filtered.length, matches: filtered });
});

app.get('/api/matches/live', async (req, res) => {
  const matches = await readData('matches');
  const live = matches.filter(m => m.status === 'live');
  res.json({ success: true, matches: live });
});

app.post('/api/matches', protect, restrictTo('official', 'admin'), async (req, res) => {
  const matches = await readData('matches');
  const newMatch = {
    _id: Date.now().toString(),
    ...req.body,
    status: req.body.status || 'upcoming',
    homeScore: 0,
    awayScore: 0,
    events: [],
    isPublished: true,
    createdAt: new Date().toISOString()
  };
  matches.push(newMatch);
  await writeData('matches', matches);
  res.status(201).json({ success: true, match: newMatch });
});

app.put('/api/matches/:id', protect, restrictTo('official', 'admin'), async (req, res) => {
  const matches = await readData('matches');
  const index = matches.findIndex(m => m._id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Match not found' });
  
  const oldMatch = matches[index];
  matches[index] = { ...oldMatch, ...req.body, updatedAt: new Date().toISOString() };
  
  // Update team stats if match finished
  if (req.body.status === 'finished' && oldMatch.status !== 'finished') {
    await updateTeamStats(matches[index]);
  }
  
  await writeData('matches', matches);
  res.json({ success: true, match: matches[index] });
});

async function updateTeamStats(match) {
  const teams = await readData('teams');
  const homeTeam = teams.find(t => t._id === match.home);
  const awayTeam = teams.find(t => t._id === match.away);
  
  if (!homeTeam || !awayTeam) return;
  
  homeTeam.stats.played += 1;
  awayTeam.stats.played += 1;
  homeTeam.stats.gf += match.homeScore;
  homeTeam.stats.ga += match.awayScore;
  awayTeam.stats.gf += match.awayScore;
  awayTeam.stats.ga += match.homeScore;
  
  if (match.homeScore > match.awayScore) {
    homeTeam.stats.won += 1;
    awayTeam.stats.lost += 1;
  } else if (match.homeScore < match.awayScore) {
    homeTeam.stats.lost += 1;
    awayTeam.stats.won += 1;
  } else {
    homeTeam.stats.drawn += 1;
    awayTeam.stats.drawn += 1;
  }
  
  homeTeam.stats.points = (homeTeam.stats.won * 3) + homeTeam.stats.drawn;
  awayTeam.stats.points = (awayTeam.stats.won * 3) + awayTeam.stats.drawn;
  
  await writeData('teams', teams);
}

// Players Routes
app.get('/api/players', async (req, res) => {
  const players = await readData('players');
  const { team, position } = req.query;
  
  let filtered = players;
  if (team) filtered = filtered.filter(p => p.team === team);
  if (position) filtered = filtered.filter(p => p.position === position);
  
  res.json({ success: true, count: filtered.length, players: filtered });
});

app.post('/api/players', protect, restrictTo('official', 'admin'), async (req, res) => {
  const players = await readData('players');
  const newPlayer = {
    _id: Date.now().toString(),
    ...req.body,
    stats: { appearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, rating: 0 },
    isActive: true,
    createdAt: new Date().toISOString()
  };
  players.push(newPlayer);
  await writeData('players', players);
  res.status(201).json({ success: true, player: newPlayer });
});

// News Routes
app.get('/api/news', async (req, res) => {
  const news = await readData('news');
  const published = news.filter(n => n.isPublished).sort((a, b) => 
    new Date(b.publishedAt) - new Date(a.publishedAt)
  );
  res.json({ success: true, count: published.length, news: published });
});

app.post('/api/news', protect, restrictTo('official', 'admin'), async (req, res) => {
  const news = await readData('news');
  const newArticle = {
    _id: Date.now().toString(),
    ...req.body,
    author: req.user._id,
    reactions: { likes: 0, fire: 0, celebrate: 0 },
    isPublished: true,
    publishedAt: new Date().toISOString()
  };
  news.push(newArticle);
  await writeData('news', news);
  res.status(201).json({ success: true, news: newArticle });
});

// Standings Route
app.get('/api/standings', async (req, res) => {
  const teams = await readData('teams');
  const sorted = teams
    .filter(t => t.isActive)
    .sort((a, b) => {
      if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
      return (b.stats.gf - b.stats.ga) - (a.stats.gf - a.stats.ga);
    })
    .map((team, index) => ({
      position: index + 1,
      team: {
        name: team.name,
        abbr: team.abbr,
        logo: team.logo
      },
      played: team.stats.played,
      won: team.stats.won,
      drawn: team.stats.drawn,
      lost: team.stats.lost,
      gf: team.stats.gf,
      ga: team.stats.ga,
      gd: team.stats.gf - team.stats.ga,
      points: team.stats.points
    }));
  
  res.json({ success: true, standings: sorted });
});

// Predictions Routes
app.post('/api/predictions', protect, async (req, res) => {
  const { matchId, homeScore, awayScore } = req.body;
  
  const matches = await readData('matches');
  const match = matches.find(m => m._id === matchId);
  
  if (!match) return res.status(404).json({ message: 'Match not found' });
  if (match.status !== 'upcoming') return res.status(400).json({ message: 'Match already started' });
  
  const users = await readData('users');
  const userIndex = users.findIndex(u => u._id === req.user._id);
  
  const existingIndex = users[userIndex].predictions.findIndex(p => p.match === matchId);
  const prediction = { match: matchId, homeScore, awayScore, points: 0 };
  
  if (existingIndex >= 0) {
    users[userIndex].predictions[existingIndex] = prediction;
  } else {
    users[userIndex].predictions.push(prediction);
  }
  
  await writeData('users', users);
  res.json({ success: true, message: 'Prediction saved' });
});

app.get('/api/predictions/leaderboard', async (req, res) => {
  const users = await readData('users');
  const withPredictions = users.filter(u => u.predictions && u.predictions.length > 0);
  
  const leaderboard = withPredictions
    .map(u => ({
      name: u.name,
      totalPredictions: u.predictions.length,
      points: u.predictions.reduce((sum, p) => sum + (p.points || 0), 0)
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 50);
  
  res.json({ success: true, leaderboard });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
initDataDir().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
  });
});
    
