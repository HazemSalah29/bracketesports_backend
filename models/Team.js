const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Team name must be at least 2 characters'],
      maxlength: [50, 'Team name cannot exceed 50 characters'],
    },
    tag: {
      type: String,
      required: [true, 'Team tag is required'],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [2, 'Team tag must be at least 2 characters'],
      maxlength: [8, 'Team tag cannot exceed 8 characters'],
    },
    description: {
      type: String,
      maxlength: [300, 'Description cannot exceed 300 characters'],
    },
    logo: {
      type: String,
      default: null,
    },
    captain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Team captain is required'],
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['captain', 'member', 'substitute'],
          default: 'member',
        },
        joinDate: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ['active', 'inactive', 'pending'],
          default: 'pending',
        },
      },
    ],
    game: {
      type: String,
      required: [true, 'Primary game is required'],
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
    region: {
      type: String,
      required: [true, 'Region is required'],
      enum: [
        'NA',
        'EU',
        'ASIA',
        'OCE',
        'BR',
        'LAN',
        'LAS',
        'TR',
        'RU',
        'JP',
        'KR',
      ],
    },
    maxMembers: {
      type: Number,
      required: [true, 'Max members is required'],
      min: [2, 'Team must have at least 2 members'],
      max: [10, 'Team cannot exceed 10 members'],
      default: 5,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    requiresApproval: {
      type: Boolean,
      default: true,
    },
    tournaments: [
      {
        tournament: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Tournament',
        },
        joinDate: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ['registered', 'active', 'eliminated', 'winner'],
          default: 'registered',
        },
        placement: Number,
      },
    ],
    stats: {
      tournamentsPlayed: { type: Number, default: 0 },
      tournamentsWon: { type: Number, default: 0 },
      winRate: { type: Number, default: 0 },
      totalEarnings: { type: Number, default: 0 },
      bestPlacement: { type: Number, default: null },
    },
    invites: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        invitedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['member', 'substitute'],
          default: 'member',
        },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'declined', 'expired'],
          default: 'pending',
        },
        inviteDate: {
          type: Date,
          default: Date.now,
        },
        expiresAt: {
          type: Date,
          default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      },
    ],
    settings: {
      autoAcceptMembers: { type: Boolean, default: false },
      allowSubstitutes: { type: Boolean, default: true },
      visibility: {
        type: String,
        enum: ['public', 'private', 'invite-only'],
        default: 'public',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
teamSchema.index({ name: 1 });
teamSchema.index({ tag: 1 });
teamSchema.index({ captain: 1 });
teamSchema.index({ game: 1, region: 1 });

// Virtual for current member count
teamSchema.virtual('currentMembers').get(function () {
  return this.members.filter((member) => member.status === 'active').length;
});

// Virtual for available spots
teamSchema.virtual('availableSpots').get(function () {
  return this.maxMembers - this.currentMembers;
});

// Virtual for active members
teamSchema.virtual('activeMembers').get(function () {
  return this.members.filter((member) => member.status === 'active');
});

// Method to check if user is captain
teamSchema.methods.isCaptain = function (userId) {
  return this.captain.toString() === userId.toString();
};

// Method to check if user is member
teamSchema.methods.isMember = function (userId) {
  return this.members.some(
    (member) =>
      member.user.toString() === userId.toString() && member.status === 'active'
  );
};

// Method to add member
teamSchema.methods.addMember = function (userId, role = 'member') {
  if (this.currentMembers >= this.maxMembers) {
    throw new Error('Team is full');
  }

  this.members.push({
    user: userId,
    role: role,
    status: this.requiresApproval ? 'pending' : 'active',
  });

  return this.save();
};

module.exports = mongoose.model('Team', teamSchema);
