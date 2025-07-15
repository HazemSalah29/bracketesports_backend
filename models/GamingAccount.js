const mongoose = require('mongoose');

const gamingAccountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    platform: {
      type: String,
      required: [true, 'Platform is required'],
      enum: ['riot', 'steam', 'epic', 'blizzard'],
    },
    game: {
      type: String,
      required: [true, 'Game is required'],
      enum: [
        'League of Legends',
        'Valorant',
        'TFT',
        'CS2',
        'Dota 2',
        'Fortnite',
        'Overwatch 2',
      ],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
    },
    gameTag: {
      type: String,
      trim: true,
    },
    region: {
      type: String,
      required: [true, 'Region is required'],
      enum: [
        'NA1',
        'EUW1',
        'EUN1',
        'KR',
        'JP1',
        'BR1',
        'LAN',
        'LAS',
        'OCE1',
        'TR1',
        'RU',
      ],
    },
    accountId: {
      type: String,
      required: [true, 'Account ID is required'],
    },
    puuid: {
      type: String,
    },
    summonerId: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationData: {
      lastUpdated: Date,
      verificationMethod: String,
      apiResponse: mongoose.Schema.Types.Mixed,
    },
    stats: {
      currentRank: {
        tier: String,
        division: String,
        lp: Number,
      },
      level: Number,
      wins: Number,
      losses: Number,
      winRate: Number,
      kda: {
        kills: Number,
        deaths: Number,
        assists: Number,
        ratio: Number,
      },
      lastGameDate: Date,
      totalGames: Number,
    },
    recentMatches: [
      {
        gameId: String,
        gameMode: String,
        gameDuration: Number,
        gameCreation: Date,
        champion: String,
        result: {
          type: String,
          enum: ['win', 'loss', 'remake'],
        },
        kda: {
          kills: Number,
          deaths: Number,
          assists: Number,
        },
        items: [String],
        cs: Number,
        damage: Number,
      },
    ],
    preferences: {
      showStats: { type: Boolean, default: true },
      showRank: { type: Boolean, default: true },
      showRecentGames: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for unique user-platform-game combination
gamingAccountSchema.index({ user: 1, platform: 1, game: 1 }, { unique: true });
gamingAccountSchema.index({ accountId: 1, platform: 1 });
gamingAccountSchema.index({ puuid: 1 });

// Virtual for full account name
gamingAccountSchema.virtual('fullAccountName').get(function () {
  if (this.gameTag && this.platform === 'riot') {
    return `${this.username}#${this.gameTag}`;
  }
  return this.username;
});

// Virtual for rank string
gamingAccountSchema.virtual('rankString').get(function () {
  if (this.stats.currentRank && this.stats.currentRank.tier) {
    return `${this.stats.currentRank.tier} ${
      this.stats.currentRank.division || ''
    } ${this.stats.currentRank.lp || 0} LP`;
  }
  return 'Unranked';
});

// Method to update verification status
gamingAccountSchema.methods.verify = function (apiData) {
  this.isVerified = true;
  this.verificationData = {
    lastUpdated: new Date(),
    verificationMethod: 'api',
    apiResponse: apiData,
  };
  return this.save();
};

// Method to update stats
gamingAccountSchema.methods.updateStats = function (statsData) {
  this.stats = { ...this.stats, ...statsData };
  this.verificationData.lastUpdated = new Date();
  return this.save();
};

module.exports = mongoose.model('GamingAccount', gamingAccountSchema);
