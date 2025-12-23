const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

// User registration/authentication for chat
router.post('/register', 
  [
    body('fullName').notEmpty().withMessage('Full name is required').trim(),
    body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
    body('contact').notEmpty().withMessage('Contact number is required').trim(),
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { fullName, email, contact } = req.body;
   
      // Check if user already exists
      let user = await User.findOne({ email });
      
      if (user) {
        // Update user's information if exists
        user.fullName = fullName;
        user.contact = contact;
        user.lastSeen = Date.now();
        user.isActive = true;
        await user.save();
        
        return res.status(200).json({
          success: true,
          message: 'User information updated',
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            contact: user.contact,
          },
        });
      }

      // Create new user
      user = new User({
        fullName,
        email,
        contact,
      });

      await user.save();

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          contact: user.contact,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message,
      });
    }
  }
);

// Get all users (for admin purposes)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-__v').sort({ createdAt: -1 });
    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.get("/admin-id",async(req,res)=>{
    try {
    const user = await User.findById('694632b0274c2d0becf2c91e').sort({ createdAt: -1 });
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
})

// Get user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '-__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

module.exports = router;