const User = require('../models/User');
const CreatorProfile = require('../models/CreatorProfile');

const creatorAuth = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Get user with creator profile
    const user = await User.findById(userId).populate('creatorProfile');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user has creator account type
    if (user.accountType !== 'creator') {
      return res.status(403).json({
        success: false,
        message: 'Creator account required',
      });
    }

    // Check if user has creator profile
    if (!user.creatorProfile) {
      return res.status(403).json({
        success: false,
        message:
          'Creator profile not found. Please apply for creator program first.',
      });
    }

    // Check if creator application is approved
    if (user.creatorProfile.applicationStatus.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Creator application not approved yet',
        data: {
          status: user.creatorProfile.applicationStatus.status,
          appliedAt: user.creatorProfile.applicationStatus.appliedAt,
        },
      });
    }

    // Add creator profile to request
    req.creatorProfile = user.creatorProfile;

    next();
  } catch (error) {
    console.error('Creator auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in creator authentication',
    });
  }
};

module.exports = creatorAuth;
