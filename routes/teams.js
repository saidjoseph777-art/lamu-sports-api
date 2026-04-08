const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const { protect, restrictTo } = require('../middleware/auth');

// @route   GET /api/teams
// @desc    Get all teams
// @access  Public
router.get('/', async (req, res) => {
  try {
    const teams = await Team.find({ isActive: true })
      .populate('players', 'name position number stats')
      .sort('-stats.points -stats.gf');
    
    res.json({
      success: true,
      count: teams.length,
      teams
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/teams/:id
// @desc    Get single team
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('players');
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json({
      success: true,
      team
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/teams
// @desc    Create team
// @access  Private/Official
router.post('/', protect, restrictTo('official', 'admin'), async (req, res) => {
  try {
    const team = await Team.create(req.body);
    
    res.status(201).json({
      success: true,
      team
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/teams/:id
// @desc    Update team
// @access  Private/Official
router.put('/:id', protect, restrictTo('official', 'admin'), async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json({
      success: true,
      team
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
  
