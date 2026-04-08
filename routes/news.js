const express = require('express');
const router = express.Router();
const News = require('../models/News');
const { protect, restrictTo } = require('../middleware/auth');

// @route   GET /api/news
// @desc    Get all news
// @access  Public
router.get('/', async (req, res) => {
  try {
    const news = await News.find({ isPublished: true })
      .populate('author', 'name')
      .sort('-publishedAt')
      .limit(20);

    res.json({
      success: true,
      count: news.length,
      news
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/news
// @desc    Create news
// @access  Private/Official
router.post('/', protect, restrictTo('official', 'admin'), async (req, res) => {
  try {
    const news = await News.create({
      ...req.body,
      author: req.user.id
    });
    
    await news.populate('author', 'name');

    res.status(201).json({
      success: true,
      news
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/news/:id/react
// @desc    Add reaction to news
// @access  Public
router.post('/:id/react', async (req, res) => {
  try {
    const { type } = req.body;
    const validReactions = ['likes', 'fire', 'celebrate'];
    
    if (!validReactions.includes(type)) {
      return res.status(400).json({ message: 'Invalid reaction type' });
    }

    const news = await News.findByIdAndUpdate(
      req.params.id,
      { $inc: { [`reactions.${type}`]: 1 } },
      { new: true }
    );

    res.json({
      success: true,
      reactions: news.reactions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
      
