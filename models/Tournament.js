const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tournament name is required'],
    trim: true,
    maxlength: [100, 'Tournament name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  game: {
    type: String,
    required: [true, 'Game is required'],
    enum: ['League of Legends', 'Valorant', 'CS2', 'Fortnite', 'Overwatch 2', 'Dota 2', 'TFT']
  },
  gameMode: {
    type: String,
    required: [true, 'Game mode is required']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  maxParticipants: {
    type: Number,
    required: [true, 'Max participants is required'],
    min: [2, 'Tournament must have at least 2 participants'],
    max: [256, 'Tournament cannot exceed 256 participants']
  },
  entryFee: {
    type: Number,
    required: [true, 'Entry fee is required'],
    min: [0, 'Entry fee cannot be negative']
  },
  prizePool: {
    total: { type: Number, default: 0 },
    distribution: [{
      position: Number,
      amount: Number,
      percentage: Number
    }]
  },
  status: {
    type: String,
    enum: ['draft', 'registration', 'ongoing', 'completed', 'cancelled'],
    default: 'draft'
  },
  format: {
    type: String,
    enum: ['single-elimination', 'double-elimination', 'round-robin', 'swiss'],
    default: 'single-elimination'
  },
  teamSize: {
    type: Number,
    required: [true, 'Team size is required'],
    min: [1, 'Team size must be at least 1'],
    max: [10, 'Team size cannot exceed 10']
  },
  registrationStart: {
    type: Date,
    required: [true, 'Registration start date is required']
  },
  registrationEnd: {
    type: Date,
    required: [true, 'Registration end date is required']
  },
  tournamentStart: {
    type: Date,
    required: [true, 'Tournament start date is required']
  },
  tournamentEnd: {
    type: Date
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    registrationDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['registered', 'checked-in', 'eliminated', 'winner'],
      default: 'registered'
    }
  }],
  bracket: {
    rounds: [{
      roundNumber: Number,
      matches: [{
        matchId: String,
        participant1: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'teamSize'
        },
        participant2: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'teamSize'
        },
        winner: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'teamSize'
        },
        status: {
          type: String,
          enum: ['pending', 'ongoing', 'completed'],
          default: 'pending'
        },
        scheduledTime: Date,
        gameData: {
          gameId: String,
          platform: String,
          region: String
        },
        result: {
          score: String,
          details: mongoose.Schema.Types.Mixed
        }
      }]
    }]
  },
  rules: {
    type: String,
    maxlength: [2000, 'Rules cannot exceed 2000 characters']
  },
  prizes: [{
    position: Number,
    reward: {
      coins: Number,
      items: [String],
      title: String
    }
  }],
  settings: {
    autoStart: { type: Boolean, default: false },
    allowSubstitutes: { type: Boolean, default: true },
    checkInRequired: { type: Boolean, default: true },
    checkInWindow: { type: Number, default: 30 }, // minutes
    spectatorMode: { type: Boolean, default: true }
  },
  stats: {
    totalRegistrations: { type: Number, default: 0 },
    checkedInCount: { type: Number, default: 0 },
    completedMatches: { type: Number, default: 0 },
    totalMatches: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
tournamentSchema.index({ creator: 1 });
tournamentSchema.index({ game: 1 });
tournamentSchema.index({ status: 1 });
tournamentSchema.index({ registrationStart: 1, registrationEnd: 1 });

// Virtual for current participant count
tournamentSchema.virtual('currentParticipants').get(function() {
  return this.participants.filter(p => p.status !== 'eliminated').length;
});

// Virtual for spots remaining
tournamentSchema.virtual('spotsRemaining').get(function() {
  return this.maxParticipants - this.currentParticipants;
});

// Virtual for registration status
tournamentSchema.virtual('isRegistrationOpen').get(function() {
  const now = new Date();
  return this.status === 'registration' && 
         now >= this.registrationStart && 
         now <= this.registrationEnd &&
         this.currentParticipants < this.maxParticipants;
});

module.exports = mongoose.model('Tournament', tournamentSchema);
