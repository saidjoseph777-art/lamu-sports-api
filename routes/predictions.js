const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Match = require('../models/Match');
const { protect } = require('../middleware/auth');

// @route   POST /api/predictions
// @desc    Make prediction
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { matchId, homeScore, awayScore } = req.body;

    // Check if match exists and is upcoming
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    if (match.status !== 'upcoming') {
      return res.status(400).json({ message: 'Match already started' });
    }

    // Check if user already predicted
    const existingPrediction = req.user.predictions.find(
      p => p.match.toString() === matchId
    );

    if (existingPrediction) {
      // Update existing
      existingPrediction.homeScore = homeScore;
      existingPrediction.awayScore = awayScore;
    } else {
      req.user.predictions.push({ match: matchId, homeScore, awayScore });
    }

    await req.user.save();

    res.json({
      success: true,
      message: 'Prediction saved'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/predictions/leaderboard
// @desc    Get predictions leaderboard
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find({ 'predictions.0': { $exists: true } })
      .select('name predictions')
      .sort('-predictions.points')
      .limit(50);

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      name: user.name,
      totalPredictions: user.predictions.length,
      points: user.predictions.reduce((sum, p) => sum + (p.points || 0), 0)
    }));

    res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
      
