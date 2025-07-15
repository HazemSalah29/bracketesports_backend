const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  accountType: {
    type: String,
    enum: ['normal', 'creator'],
    default: 'normal'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  coins: {
    type: Number,
    default: 0,
    min: 0
  },
  gamingAccounts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GamingAccount'
  }],
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  tournamentsParticipated: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  }],
  tournamentsWon: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  }],
  creatorProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CreatorProfile'
  },
  stats: {
    totalTournaments: { type: Number, default: 0 },
    tournamentsWon: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 }
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      tournaments: { type: Boolean, default: true },
      teams: { type: Boolean, default: true }
    },
    privacy: {
      profileVisible: { type: Boolean, default: true },
      statsVisible: { type: Boolean, default: true }
    }
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last active
userSchema.methods.updateLastActive = function() {
  this.lastActive = new Date();
  return this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('User', userSchema);
