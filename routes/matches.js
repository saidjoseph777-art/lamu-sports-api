const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const Team = require('../models/Team');
const { protect, restrictTo } = require('../middleware/auth');

// @route   GET /api/matches
// @desc    Get all matches
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { status, date } = req.query;
    let query = { isPublished: true };

    if (status) query.status = status;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.date = { $gte: start, $lt: end };
    }

    const matches = await Match.find(query)
      .populate('home', 'name abbr logo')
      .populate('away', 'name abbr logo')
      .populate('motm', 'name')
      .sort('-date');

    res.json({
      success: true,
      count: matches.length,
      matches
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/matches/live
// @desc    Get live matches
// @access  Public
router.get('/live', async (req, res) => {
  try {
    const matches = await Match.find({ status: 'live', isPublished: true })
      .populate('home', 'name abbr logo')
      .populate('away', 'name abbr logo');

    res.json({
      success: true,
      matches
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/matches
// @desc    Create match
// @access  Private/Official
router.post('/', protect, restrictTo('official', 'admin'), async (req, res) => {
  try {
    const match = await Match.create(req.body);
    
    res.status(201).json({
      success: true,
      match
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/matches/:id
// @desc    Update match (scores, status, events)
// @access  Private/Official
router.put('/:id', protect, restrictTo('official', 'admin'), async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('home away');

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Update team stats if match finished
    if (req.body.status === 'finished' && match.home && match.away) {
      await updateTeamStats(match);
    }

    res.json({
      success: true,
      match
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper function to update team stats
async function updateTeamStats(match) {
  const homeTeam = await Team.findById(match.home);
  const awayTeam = await Team.findById(match.away);

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

  await homeTeam.save();
  await awayTeam.save();
}

module.exports = router;
  
