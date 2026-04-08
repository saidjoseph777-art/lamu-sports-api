const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const { protect, restrictTo } = require('../middleware/auth');

// @route   GET /api/players
// @desc    Get all players
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { team, position } = req.query;
    let query = { isActive: true };

    if (team) query.team = team;
    if (position) query.position = position;

    const players = await Player.find(query)
      .populate('team', 'name abbr logo')
      .sort('-stats.goals');

    res.json({
      success: true,
      count: players.length,
      players
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/players
// @desc    Create player
// @access  Private/Official
router.post('/', protect, restrictTo('official', 'admin'), async (req, res) => {
  try {
    const player = await Player.create(req.body);
    await player.populate('team');
    
    res.status(201).json({
      success: true,
      player
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/players/:id/stats
// @desc    Update player stats
// @access  Private/Official
router.put('/:id/stats', protect, restrictTo('official', 'admin'), async (req, res) => {
  try {
    const player = await Player.findByIdAndUpdate(
      req.params.id,
      { $set: { stats: req.body } },
      { new: true }
    );
    
    res.json({
      success: true,
      player
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
