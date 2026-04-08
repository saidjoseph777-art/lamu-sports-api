const express = require('express');
const router = express.Router();
const Team = require('../models/Team');

// @route   GET /api/standings
// @desc    Get league table
// @access  Public
router.get('/', async (req, res) => {
  try {
    const teams = await Team.find({ isActive: true })
      .select('name abbr logo stats')
      .sort('-stats.points -stats.gf');

    // Calculate additional stats
    const standings = teams.map((team, index) => ({
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
      points: team.stats.points,
      form: calculateForm(team) // You'd implement this based on recent matches
    }));

    res.json({
      success: true,
      standings
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

function calculateForm(team) {
  // Placeholder - implement based on last 5 matches
  return ['W', 'D', 'W', 'L', 'W'];
}

module.exports = router;
