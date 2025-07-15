const express = require('express');
const { body, validationResult } = require('express-validator');
const CreatorProfile = require('../models/CreatorProfile');
const User = require('../models/User');
const auth = require('../middleware/auth');
const creatorAuth = require('../middleware/creatorAuth');
const router = express.Router();

// @route   POST /api/creator/apply
// @desc    Apply for creator program
// @access  Private
router.post(
  '/apply',
  auth,
  [
    body('displayName')
      .notEmpty()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Display name is required and cannot exceed 50 characters'),
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters'),
    body('specialties')
      .isArray({ min: 1 })
      .withMessage('At least one specialty game is required'),
    body('socialLinks')
      .optional()
      .isObject()
      .withMessage('Social links must be an object'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array(),
        });
      }

      const userId = req.user.userId;
      const { displayName, bio, specialties, socialLinks } = req.body;

      // Check if user already has a creator profile
      const existingProfile = await CreatorProfile.findOne({ user: userId });
      if (existingProfile) {
        return res.status(400).json({
          success: false,
          message: 'You have already applied for the creator program',
          data: {
            status: existingProfile.applicationStatus.status,
            appliedAt: existingProfile.applicationStatus.appliedAt,
          },
        });
      }

      // Validate specialties
      const validGames = [
        'League of Legends',
        'Valorant',
        'CS2',
        'Fortnite',
        'Overwatch 2',
        'Dota 2',
        'TFT',
      ];
      const invalidSpecialties = specialties.filter(
        (game) => !validGames.includes(game)
      );
      if (invalidSpecialties.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid game specialties',
          errors: invalidSpecialties,
        });
      }

      // Create creator profile application
      const creatorProfile = new CreatorProfile({
        user: userId,
        displayName,
        bio,
        specialties,
        socialLinks: socialLinks || {},
        applicationStatus: {
          status: 'pending',
          appliedAt: new Date(),
        },
      });

      await creatorProfile.save();

      // Update user's creator profile reference
      await User.findByIdAndUpdate(userId, {
        creatorProfile: creatorProfile._id,
      });

      res.status(201).json({
        success: true,
        message: 'Creator application submitted successfully',
        data: {
          application: {
            id: creatorProfile._id,
            displayName: creatorProfile.displayName,
            status: creatorProfile.applicationStatus.status,
            appliedAt: creatorProfile.applicationStatus.appliedAt,
          },
        },
      });
    } catch (error) {
      console.error('Creator application error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

// @route   GET /api/creator/profile
// @desc    Get creator profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const creatorProfile = await CreatorProfile.findOne({ user: userId })
      .populate('user', 'username email avatar')
      .populate('followers.user', 'username avatar');

    if (!creatorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found',
      });
    }

    res.json({
      success: true,
      data: { creatorProfile },
    });
  } catch (error) {
    console.error('Get creator profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/creator/profile
// @desc    Update creator profile
// @access  Private (Creator only)
router.put(
  '/profile',
  auth,
  creatorAuth,
  [
    body('displayName')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Display name cannot exceed 50 characters'),
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters'),
    body('socialLinks')
      .optional()
      .isObject()
      .withMessage('Social links must be an object'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array(),
        });
      }

      const userId = req.user.userId;
      const updates = req.body;

      const creatorProfile = await CreatorProfile.findOneAndUpdate(
        { user: userId },
        { $set: updates },
        { new: true, runValidators: true }
      ).populate('user', 'username email avatar');

      if (!creatorProfile) {
        return res.status(404).json({
          success: false,
          message: 'Creator profile not found',
        });
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { creatorProfile },
      });
    } catch (error) {
      console.error('Update creator profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

// @route   POST /api/creator/:id/follow
// @desc    Follow a creator
// @access  Private
router.post('/:id/follow', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const creatorId = req.params.id;

    const creatorProfile = await CreatorProfile.findById(creatorId);
    if (!creatorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Creator not found',
      });
    }

    // Check if user is trying to follow themselves
    if (creatorProfile.user.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself',
      });
    }

    // Check if already following
    if (creatorProfile.isFollowedBy(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You are already following this creator',
      });
    }

    // Add follower
    await creatorProfile.addFollower(userId);

    res.json({
      success: true,
      message: 'Successfully followed creator',
      data: {
        followerCount: creatorProfile.followerCount + 1,
      },
    });
  } catch (error) {
    console.error('Follow creator error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   DELETE /api/creator/:id/follow
// @desc    Unfollow a creator
// @access  Private
router.delete('/:id/follow', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const creatorId = req.params.id;

    const creatorProfile = await CreatorProfile.findById(creatorId);
    if (!creatorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Creator not found',
      });
    }

    // Check if currently following
    if (!creatorProfile.isFollowedBy(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You are not following this creator',
      });
    }

    // Remove follower
    await creatorProfile.removeFollower(userId);

    res.json({
      success: true,
      message: 'Successfully unfollowed creator',
      data: {
        followerCount: creatorProfile.followerCount - 1,
      },
    });
  } catch (error) {
    console.error('Unfollow creator error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/creator/discover
// @desc    Discover creators with filtering
// @access  Public
router.get('/discover', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      game,
      verified,
      sortBy = 'followerCount',
      sortOrder = 'desc',
    } = req.query;

    // Build filter
    const filter = {
      'applicationStatus.status': 'approved',
    };

    if (game) {
      filter.specialties = { $in: [game] };
    }

    if (verified === 'true') {
      filter['verification.isVerified'] = true;
    }

    // Build sort
    const sortOptions = {};
    if (sortBy === 'followerCount') {
      // Sort by follower count (array length)
      sortOptions['followers'] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get creators
    const creators = await CreatorProfile.find(filter)
      .populate('user', 'username avatar')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await CreatorProfile.countDocuments(filter);

    res.json({
      success: true,
      data: {
        creators,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Discover creators error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/creator/:id
// @desc    Get creator by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const creatorProfile = await CreatorProfile.findById(req.params.id)
      .populate('user', 'username avatar')
      .populate('followers.user', 'username avatar');

    if (!creatorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Creator not found',
      });
    }

    // Only show approved creators to public
    if (creatorProfile.applicationStatus.status !== 'approved') {
      return res.status(404).json({
        success: false,
        message: 'Creator not found',
      });
    }

    res.json({
      success: true,
      data: { creatorProfile },
    });
  } catch (error) {
    console.error('Get creator error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/creator/dashboard/analytics
// @desc    Get creator analytics dashboard
// @access  Private (Creator only)
router.get('/dashboard/analytics', auth, creatorAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const creatorProfile = await CreatorProfile.findOne({ user: userId });
    if (!creatorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found',
      });
    }

    // Calculate analytics data
    const analytics = {
      followers: {
        total: creatorProfile.followerCount,
        growth: 0, // Calculate from historical data in production
        weeklyGrowth: 0,
      },
      tournaments: {
        created: creatorProfile.tournaments.created,
        completed: creatorProfile.tournaments.completed,
        totalParticipants: creatorProfile.tournaments.totalParticipants,
        averageRating: creatorProfile.tournaments.averageRating,
      },
      earnings: {
        total: creatorProfile.earnings.totalEarnings,
        monthly: creatorProfile.earnings.monthlyEarnings,
        pending: creatorProfile.earnings.pendingPayout,
      },
      engagement: {
        profileViews: creatorProfile.analytics.profileViews,
        tournamentViews: creatorProfile.analytics.tournamentViews,
        clickThroughRate: creatorProfile.analytics.clickThroughRate,
      },
      ratings: {
        average: creatorProfile.averageRating,
        total: creatorProfile.ratings.length,
        recent: creatorProfile.ratings.slice(-5),
      },
    };

    res.json({
      success: true,
      data: { analytics },
    });
  } catch (error) {
    console.error('Get creator analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/creator/:id/rate
// @desc    Rate a creator after tournament
// @access  Private
router.post(
  '/:id/rate',
  auth,
  [
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('comment')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Comment cannot exceed 200 characters'),
    body('tournamentId').notEmpty().withMessage('Tournament ID is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array(),
        });
      }

      const { rating, comment, tournamentId } = req.body;
      const userId = req.user.userId;
      const creatorId = req.params.id;

      const creatorProfile = await CreatorProfile.findById(creatorId);
      if (!creatorProfile) {
        return res.status(404).json({
          success: false,
          message: 'Creator not found',
        });
      }

      // Check if user has already rated this creator for this tournament
      const existingRating = creatorProfile.ratings.find(
        (r) =>
          r.user.toString() === userId &&
          r.tournament.toString() === tournamentId
      );

      if (existingRating) {
        return res.status(400).json({
          success: false,
          message: 'You have already rated this creator for this tournament',
        });
      }

      // Add rating
      creatorProfile.ratings.push({
        user: userId,
        tournament: tournamentId,
        rating,
        comment,
      });

      await creatorProfile.save();

      res.json({
        success: true,
        message: 'Rating submitted successfully',
        data: {
          newAverageRating: creatorProfile.averageRating,
        },
      });
    } catch (error) {
      console.error('Rate creator error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

module.exports = router;
