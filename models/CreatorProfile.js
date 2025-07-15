const mongoose = require('mongoose');

const creatorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      unique: true,
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      maxlength: [50, 'Display name cannot exceed 50 characters'],
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    banner: {
      type: String,
      default: null,
    },
    socialLinks: {
      twitch: String,
      youtube: String,
      twitter: String,
      instagram: String,
      discord: String,
      tiktok: String,
    },
    specialties: [
      {
        type: String,
        enum: [
          'League of Legends',
          'Valorant',
          'CS2',
          'Fortnite',
          'Overwatch 2',
          'Dota 2',
          'TFT',
        ],
      },
    ],
    followers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        followDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    verification: {
      isVerified: { type: Boolean, default: false },
      verifiedAt: Date,
      verificationLevel: {
        type: String,
        enum: ['basic', 'partner', 'featured'],
        default: 'basic',
      },
      requirements: {
        minFollowers: { type: Boolean, default: false },
        contentQuality: { type: Boolean, default: false },
        activityLevel: { type: Boolean, default: false },
        communityStanding: { type: Boolean, default: false },
      },
    },
    earnings: {
      totalEarnings: { type: Number, default: 0 },
      monthlyEarnings: { type: Number, default: 0 },
      lastPayout: Date,
      pendingPayout: { type: Number, default: 0 },
      payoutThreshold: { type: Number, default: 100 }, // minimum coins for payout
    },
    tournaments: {
      created: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      totalParticipants: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
    },
    ratings: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        tournament: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Tournament',
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
          required: true,
        },
        comment: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    subscriptions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        tier: {
          type: String,
          enum: ['basic', 'premium', 'vip'],
          default: 'basic',
        },
        price: Number,
        startDate: {
          type: Date,
          default: Date.now,
        },
        endDate: Date,
        isActive: {
          type: Boolean,
          default: true,
        },
        autoRenew: {
          type: Boolean,
          default: true,
        },
      },
    ],
    analytics: {
      profileViews: { type: Number, default: 0 },
      tournamentViews: { type: Number, default: 0 },
      clickThroughRate: { type: Number, default: 0 },
      engagementRate: { type: Number, default: 0 },
      retentionRate: { type: Number, default: 0 },
    },
    settings: {
      allowDirectMessages: { type: Boolean, default: true },
      showEarnings: { type: Boolean, default: false },
      autoApproveFriends: { type: Boolean, default: false },
      notifyOnFollow: { type: Boolean, default: true },
      publicProfile: { type: Boolean, default: true },
    },
    applicationStatus: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'under_review'],
        default: 'pending',
      },
      appliedAt: {
        type: Date,
        default: Date.now,
      },
      reviewedAt: Date,
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      rejectionReason: String,
      notes: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
creatorProfileSchema.index({ user: 1 });
creatorProfileSchema.index({ 'verification.isVerified': 1 });
creatorProfileSchema.index({ 'applicationStatus.status': 1 });

// Virtual for follower count
creatorProfileSchema.virtual('followerCount').get(function () {
  return this.followers.length;
});

// Virtual for average rating
creatorProfileSchema.virtual('averageRating').get(function () {
  if (this.ratings.length === 0) return 0;
  const total = this.ratings.reduce((sum, rating) => sum + rating.rating, 0);
  return (total / this.ratings.length).toFixed(1);
});

// Virtual for active subscribers
creatorProfileSchema.virtual('activeSubscribers').get(function () {
  return this.subscriptions.filter(
    (sub) => sub.isActive && sub.endDate > new Date()
  ).length;
});

// Method to check if user is following
creatorProfileSchema.methods.isFollowedBy = function (userId) {
  return this.followers.some(
    (follower) => follower.user.toString() === userId.toString()
  );
};

// Method to add follower
creatorProfileSchema.methods.addFollower = function (userId) {
  if (!this.isFollowedBy(userId)) {
    this.followers.push({ user: userId });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove follower
creatorProfileSchema.methods.removeFollower = function (userId) {
  this.followers = this.followers.filter(
    (follower) => follower.user.toString() !== userId.toString()
  );
  return this.save();
};

// Method to calculate earnings for period
creatorProfileSchema.methods.calculateEarnings = function (startDate, endDate) {
  // This would integrate with tournament earnings and subscription revenue
  // Implementation would involve aggregating tournament revenue and subscription payments
  return 0; // Placeholder
};

module.exports = mongoose.model('CreatorProfile', creatorProfileSchema);
