const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @route   POST /api/auth/register-pin
// @desc    Register with PIN
// @access  Public
router.post('/register-pin', [
  body('name').trim().isLength({ min: 2, max: 50 }).escape(),
  body('pin').isLength({ min: 4, max: 4 }).isNumeric(),
  body('role').optional().isIn(['fan', 'player', 'coach'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, pin, role = 'fan' } = req.body;

    // Check if name exists (for PIN users, name is unique identifier)
    const existingUser = await User.findOne({ name, authMethod: 'pin' });
    if (existingUser) {
      return res.status(400).json({ message: 'Name already taken' });
    }

    const user = await User.create({
      name,
      pin,
      authMethod: 'pin',
      role,
      lastLogin: new Date()
    });

    res.status(201).json({
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

// @route   POST /api/auth/login-pin
// @desc    Login with PIN
// @access  Public
router.post('/login-pin', async (req, res) => {
  try {
    const { name, pin } = req.body;

    const user = await User.findOne({ name, authMethod: 'pin' }).select('+pin');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePin(pin);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

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

// @route   POST /api/auth/google
// @desc    Google OAuth login/register
// @access  Public
router.post('/google', async (req, res) => {
  try {
    const { name, email, googleId, photo } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        profilePhoto: photo,
        authMethod: 'google',
        role: 'fan',
        lastLogin: new Date()
      });
    } else {
      user.lastLogin = new Date();
      await user.save();
    }

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

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// @route   PUT /api/auth/update-profile
// @desc    Update user profile
// @access  Private
router.put('/update-profile', protect, async (req, res) => {
  try {
    const { name, photo } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, profilePhoto: photo },
      { new: true }
    );
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/auth/delete-account
// @desc    Delete user account
// @access  Private
router.delete('/delete-account', protect, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
      
