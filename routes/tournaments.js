const express = require('express');
const { body, validationResult } = require('express-validator');
const Tournament = require('../models/Tournament');
const ComplianceAudit = require('../models/ComplianceAudit');
const User = require('../models/User');
const Team = require('../models/Team');
const auth = require('../middleware/auth');
const creatorAuth = require('../middleware/creatorAuth');
const router = express.Router();

// Riot API Compliance Validation
const validateTournamentCompliance = (tournamentData) => {
  const violations = [];
  const { maxParticipants, entryFee, format, game } = tournamentData;

  // Check minimum participants (Riot API requirement)
  if (maxParticipants < 20) {
    violations.push({
      type: 'minimum_participants',
      description:
        'Tournament must allow minimum 20 participants for Riot API compliance',
    });
  }

  // Check entry fee limits (monetary policy)
  if (entryFee > 50) {
    violations.push({
      type: 'excessive_entry_fee',
      description: 'Entry fee cannot exceed $50 USD (nominal amount policy)',
    });
  }

  // Check tournament format (traditional formats only)
  const allowedFormats = [
    'single-elimination',
    'double-elimination',
    'round-robin',
    'swiss',
  ];
  if (!allowedFormats.includes(format)) {
    violations.push({
      type: 'invalid_format',
      description:
        'Tournament format must be traditional style (elimination, round-robin, or swiss)',
    });
  }

  // Check if game supports Riot API
  const riotGames = ['League of Legends', 'Valorant', 'TFT'];
  const requiresRiotCompliance = riotGames.includes(game);

  return {
    isCompliant: violations.length === 0,
    violations,
    requiresRiotCompliance,
    complianceLevel:
      violations.length === 0
        ? 'full'
        : violations.length <= 2
        ? 'partial'
        : 'violations',
  };
};

// Fair matchmaking service
const matchmakingService = {
  createBracket: (participants) => {
    // Implement seeding based on skill level/ranking
    // Ensure balanced bracket distribution
    // Prevent manipulation of matchups
    return participants.sort((a, b) => {
      // Sort by skill level, then randomize within tiers
      const skillDiff = (b.skillLevel || 0) - (a.skillLevel || 0);
      return skillDiff !== 0 ? skillDiff : Math.random() - 0.5;
    });
  },

  validateMatchResult: async (matchId, result) => {
    // This would verify match legitimacy through Riot API
    // Prevent result manipulation
    // Log all match outcomes for audit
    return true;
  },
};

// @route   POST /api/tournaments
// @desc    Create a new tournament
// @access  Private (Creator only)
router.post(
  '/',
  auth,
  creatorAuth,
  [
    body('name')
      .notEmpty()
      .trim()
      .isLength({ max: 100 })
      .withMessage(
        'Tournament name is required and cannot exceed 100 characters'
      ),
    body('game')
      .isIn([
        'League of Legends',
        'Valorant',
        'CS2',
        'Fortnite',
        'Overwatch 2',
        'Dota 2',
        'TFT',
      ])
      .withMessage('Invalid game selection'),
    body('maxParticipants')
      .isInt({ min: 20, max: 256 })
      .withMessage(
        'Max participants must be between 20 and 256 (Riot API compliance requires minimum 20)'
      ),
    body('entryFee')
      .isFloat({ min: 0, max: 50 })
      .withMessage(
        'Entry fee must be between $0 and $50 USD (nominal amount policy)'
      ),
    body('teamSize')
      .isInt({ min: 1, max: 10 })
      .withMessage('Team size must be between 1 and 10'),
    body('registrationStart')
      .isISO8601()
      .withMessage('Valid registration start date is required'),
    body('registrationEnd')
      .isISO8601()
      .withMessage('Valid registration end date is required'),
    body('tournamentStart')
      .isISO8601()
      .withMessage('Valid tournament start date is required'),
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

      const {
        name,
        description,
        game,
        gameMode,
        maxParticipants,
        entryFee,
        teamSize,
        format,
        registrationStart,
        registrationEnd,
        tournamentStart,
        rules,
        prizes,
      } = req.body;

      // Riot API Compliance Validation
      const complianceCheck = validateTournamentCompliance({
        maxParticipants,
        entryFee,
        format,
        game,
      });

      if (!complianceCheck.isCompliant) {
        return res.status(400).json({
          success: false,
          message: 'Tournament does not meet Riot API compliance requirements',
          violations: complianceCheck.violations,
        });
      }

      // Validate dates
      const regStart = new Date(registrationStart);
      const regEnd = new Date(registrationEnd);
      const tournStart = new Date(tournamentStart);
      const now = new Date();

      if (regStart < now) {
        return res.status(400).json({
          success: false,
          message: 'Registration start date cannot be in the past',
        });
      }

      if (regEnd <= regStart) {
        return res.status(400).json({
          success: false,
          message: 'Registration end date must be after start date',
        });
      }

      if (tournStart <= regEnd) {
        return res.status(400).json({
          success: false,
          message: 'Tournament start must be after registration ends',
        });
      }

      // Calculate prize pool (fiat-based, not coin-based for compliance)
      const prizePool = {
        total: entryFee * maxParticipants,
        distribution: prizes || [
          { position: 1, percentage: 50 },
          { position: 2, percentage: 30 },
          { position: 3, percentage: 20 },
        ],
      };

      // Calculate actual amounts
      prizePool.distribution = prizePool.distribution.map((prize) => ({
        ...prize,
        amount: (prizePool.total * prize.percentage) / 100,
      }));

      const tournament = new Tournament({
        name,
        description,
        game,
        gameMode: gameMode || 'Standard',
        creator: req.user.userId,
        maxParticipants,
        entryFee,
        prizePool,
        teamSize,
        format: format || 'single-elimination',
        registrationStart: regStart,
        registrationEnd: regEnd,
        tournamentStart: tournStart,
        rules,
        prizes: prizes || [],
      });

      await tournament.save();

      // Populate creator info
      await tournament.populate('creator', 'username displayName avatar');

      res.status(201).json({
        success: true,
        message: 'Tournament created successfully',
        data: { tournament },
      });
    } catch (error) {
      console.error('Create tournament error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

// @route   GET /api/tournaments
// @desc    Get tournaments with filtering and pagination
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      game,
      status,
      format,
      creator,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build filter object
    const filter = {};

    if (game) filter.game = game;
    if (status) filter.status = status;
    if (format) filter.format = format;
    if (creator) filter.creator = creator;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get tournaments
    const tournaments = await Tournament.find(filter)
      .populate('creator', 'username displayName avatar')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Tournament.countDocuments(filter);

    res.json({
      success: true,
      data: {
        tournaments,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/tournaments/:id
// @desc    Get tournament by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('creator', 'username displayName avatar')
      .populate('participants.user', 'username avatar')
      .populate('participants.team', 'name tag logo');

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
      });
    }

    res.json({
      success: true,
      data: { tournament },
    });
  } catch (error) {
    console.error('Get tournament error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/tournaments/:id/join
// @desc    Join a tournament
// @access  Private
router.post('/:id/join', auth, async (req, res) => {
  try {
    const { teamId } = req.body;
    const userId = req.user.userId;

    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
      });
    }

    // Check if registration is open
    if (!tournament.isRegistrationOpen) {
      return res.status(400).json({
        success: false,
        message: 'Tournament registration is closed',
      });
    }

    // Check if user already joined
    const existingParticipant = tournament.participants.find(
      (p) => p.user && p.user.toString() === userId
    );

    if (existingParticipant) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this tournament',
      });
    }

    // Check if tournament is full
    if (tournament.currentParticipants >= tournament.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Tournament is full',
      });
    }

    // Get user and check coin balance
    const user = await User.findById(userId);
    if (user.coins < tournament.entryFee) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient coins for entry fee',
      });
    }

    // Handle team registration
    if (tournament.teamSize > 1) {
      if (!teamId) {
        return res.status(400).json({
          success: false,
          message: 'Team ID is required for team tournaments',
        });
      }

      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found',
        });
      }

      // Check if user is team captain or member
      if (!team.isCaptain(userId) && !team.isMember(userId)) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this team',
        });
      }

      // Check if team already joined
      const existingTeamParticipant = tournament.participants.find(
        (p) => p.team && p.team.toString() === teamId
      );

      if (existingTeamParticipant) {
        return res.status(400).json({
          success: false,
          message: 'Team is already registered for this tournament',
        });
      }

      // Add team to tournament
      tournament.participants.push({
        team: teamId,
        user: userId, // Captain who registered the team
      });
    } else {
      // Solo registration
      tournament.participants.push({
        user: userId,
      });
    }

    // Deduct entry fee
    user.coins -= tournament.entryFee;
    await user.save();

    // Update tournament stats
    tournament.stats.totalRegistrations += 1;
    await tournament.save();

    // Emit real-time update
    req.io.to(`tournament_${tournament._id}`).emit('participant_joined', {
      tournamentId: tournament._id,
      participant: tournament.participants[tournament.participants.length - 1],
      currentParticipants: tournament.currentParticipants,
    });

    res.json({
      success: true,
      message: 'Successfully joined tournament',
      data: {
        tournament,
        entryFeePaid: tournament.entryFee,
        remainingCoins: user.coins,
      },
    });
  } catch (error) {
    console.error('Join tournament error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/tournaments/:id/start
// @desc    Start a tournament (Creator only)
// @access  Private
router.post('/:id/start', auth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found',
      });
    }

    // Check if user is the creator
    if (tournament.creator.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Only tournament creator can start the tournament',
      });
    }

    if (tournament.status !== 'registration') {
      return res.status(400).json({
        success: false,
        message: 'Tournament cannot be started in current status',
      });
    }

    if (tournament.currentParticipants < 2) {
      return res.status(400).json({
        success: false,
        message: 'Tournament needs at least 2 participants to start',
      });
    }

    // Generate bracket
    tournament.status = 'ongoing';
    tournament.bracket = generateBracket(
      tournament.participants,
      tournament.format
    );
    await tournament.save();

    // Emit real-time update
    req.io.to(`tournament_${tournament._id}`).emit('tournament_started', {
      tournamentId: tournament._id,
      bracket: tournament.bracket,
    });

    res.json({
      success: true,
      message: 'Tournament started successfully',
      data: { tournament },
    });
  } catch (error) {
    console.error('Start tournament error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Helper function to generate bracket
function generateBracket(participants, format) {
  // Simple single elimination bracket generation
  const shuffledParticipants = [...participants].sort(
    () => Math.random() - 0.5
  );

  const rounds = [];
  let currentRound = shuffledParticipants;
  let roundNumber = 1;

  while (currentRound.length > 1) {
    const matches = [];

    for (let i = 0; i < currentRound.length; i += 2) {
      if (i + 1 < currentRound.length) {
        matches.push({
          matchId: `R${roundNumber}M${Math.floor(i / 2) + 1}`,
          participant1:
            currentRound[i]._id || currentRound[i].user || currentRound[i].team,
          participant2:
            currentRound[i + 1]._id ||
            currentRound[i + 1].user ||
            currentRound[i + 1].team,
          status: 'pending',
        });
      } else {
        // Bye for odd number of participants
        matches.push({
          matchId: `R${roundNumber}M${Math.floor(i / 2) + 1}`,
          participant1:
            currentRound[i]._id || currentRound[i].user || currentRound[i].team,
          winner:
            currentRound[i]._id || currentRound[i].user || currentRound[i].team,
          status: 'completed',
        });
      }
    }

    rounds.push({
      roundNumber,
      matches,
    });

    currentRound = matches
      .filter((m) => m.status === 'completed')
      .map((m) => ({ _id: m.winner }));
    currentRound = currentRound.concat(
      matches.filter((m) => m.status === 'pending')
    );
    roundNumber++;
  }

  return { rounds };
}

module.exports = router;
