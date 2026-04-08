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
