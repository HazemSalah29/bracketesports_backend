const express = require('express');
const { body, validationResult } = require('express-validator');
const Team = require('../models/Team');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// @route   POST /api/teams
// @desc    Create a new team
// @access  Private
router.post(
  '/',
  auth,
  [
    body('name')
      .notEmpty()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Team name must be between 2 and 50 characters'),
    body('tag')
      .notEmpty()
      .trim()
      .isLength({ min: 2, max: 8 })
      .withMessage('Team tag must be between 2 and 8 characters')
      .matches(/^[A-Z0-9]+$/)
      .withMessage('Team tag can only contain uppercase letters and numbers'),
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
    body('region')
      .isIn([
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
      ])
      .withMessage('Invalid region selection'),
    body('maxMembers')
      .isInt({ min: 2, max: 10 })
      .withMessage('Max members must be between 2 and 10'),
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
        tag,
        description,
        game,
        region,
        maxMembers,
        isPublic,
        requiresApproval,
      } = req.body;

      const userId = req.user.userId;

      // Check if team name or tag already exists
      const existingTeam = await Team.findOne({
        $or: [{ name }, { tag: tag.toUpperCase() }],
      });

      if (existingTeam) {
        return res.status(400).json({
          success: false,
          message:
            existingTeam.name === name
              ? 'Team name already exists'
              : 'Team tag already exists',
        });
      }

      // Create team with creator as captain
      const team = new Team({
        name,
        tag: tag.toUpperCase(),
        description,
        game,
        region,
        maxMembers,
        isPublic: isPublic !== undefined ? isPublic : true,
        requiresApproval:
          requiresApproval !== undefined ? requiresApproval : true,
        captain: userId,
        members: [
          {
            user: userId,
            role: 'captain',
            status: 'active',
          },
        ],
      });

      await team.save();

      // Add team to user's teams
      await User.findByIdAndUpdate(userId, {
        $push: { teams: team._id },
      });

      // Populate team data
      await team.populate('captain', 'username avatar');
      await team.populate('members.user', 'username avatar');

      res.status(201).json({
        success: true,
        message: 'Team created successfully',
        data: { team },
      });
    } catch (error) {
      console.error('Create team error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

// @route   GET /api/teams
// @desc    Get teams with filtering and pagination
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      game,
      region,
      search,
      isRecruiting,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build filter object
    const filter = { isPublic: true };

    if (game) filter.game = game;
    if (region) filter.region = region;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tag: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get teams
    let teams = await Team.find(filter)
      .populate('captain', 'username avatar')
      .populate('members.user', 'username avatar')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Filter recruiting teams if requested
    if (isRecruiting === 'true') {
      teams = teams.filter((team) => team.availableSpots > 0);
    }

    // Get total count for pagination
    const total = await Team.countDocuments(filter);

    res.json({
      success: true,
      data: {
        teams,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/teams/:id
// @desc    Get team by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('captain', 'username avatar')
      .populate('members.user', 'username avatar')
      .populate('tournaments.tournament', 'name game status');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    res.json({
      success: true,
      data: { team },
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/teams/:id/join
// @desc    Join a team
// @access  Private
router.post('/:id/join', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    // Check if user is already a member
    if (team.isMember(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this team',
      });
    }

    // Check if team is full
    if (team.availableSpots <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Team is full',
      });
    }

    // Check if team is public or user has an invite
    if (!team.isPublic) {
      const invite = team.invites.find(
        (inv) =>
          inv.user.toString() === userId &&
          inv.status === 'pending' &&
          inv.expiresAt > new Date()
      );

      if (!invite) {
        return res.status(403).json({
          success: false,
          message: 'You need an invitation to join this team',
        });
      }

      // Accept the invite
      invite.status = 'accepted';
    }

    // Add user to team
    const memberStatus = team.requiresApproval ? 'pending' : 'active';

    team.members.push({
      user: userId,
      role: 'member',
      status: memberStatus,
    });

    await team.save();

    // Add team to user's teams if approved
    if (memberStatus === 'active') {
      await User.findByIdAndUpdate(userId, {
        $push: { teams: team._id },
      });
    }

    // Populate updated team data
    await team.populate('members.user', 'username avatar');

    res.json({
      success: true,
      message:
        memberStatus === 'active'
          ? 'Successfully joined team'
          : 'Join request sent, awaiting approval',
      data: { team },
    });
  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/teams/:id/invite
// @desc    Invite user to team (Captain only)
// @access  Private
router.post(
  '/:id/invite',
  auth,
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('role')
      .optional()
      .isIn(['member', 'substitute'])
      .withMessage('Invalid role'),
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

      const { username, role = 'member' } = req.body;
      const userId = req.user.userId;

      const team = await Team.findById(req.params.id);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found',
        });
      }

      // Check if user is team captain
      if (!team.isCaptain(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Only team captain can send invites',
        });
      }

      // Find user to invite
      const userToInvite = await User.findOne({ username });
      if (!userToInvite) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Check if user is already a member
      if (team.isMember(userToInvite._id)) {
        return res.status(400).json({
          success: false,
          message: 'User is already a team member',
        });
      }

      // Check for existing pending invite
      const existingInvite = team.invites.find(
        (inv) =>
          inv.user.toString() === userToInvite._id.toString() &&
          inv.status === 'pending' &&
          inv.expiresAt > new Date()
      );

      if (existingInvite) {
        return res.status(400).json({
          success: false,
          message: 'User already has a pending invite',
        });
      }

      // Create invite
      team.invites.push({
        user: userToInvite._id,
        invitedBy: userId,
        role,
        status: 'pending',
      });

      await team.save();

      res.json({
        success: true,
        message: 'Invite sent successfully',
        data: {
          invite: {
            user: userToInvite.username,
            role,
            invitedBy: req.user.user.username,
          },
        },
      });
    } catch (error) {
      console.error('Invite user error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

// @route   PUT /api/teams/:id/members/:memberId
// @desc    Update member status (Captain only)
// @access  Private
router.put(
  '/:id/members/:memberId',
  auth,
  [
    body('status')
      .isIn(['active', 'inactive', 'pending'])
      .withMessage('Invalid status'),
    body('role')
      .optional()
      .isIn(['captain', 'member', 'substitute'])
      .withMessage('Invalid role'),
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

      const { status, role } = req.body;
      const userId = req.user.userId;

      const team = await Team.findById(req.params.id);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found',
        });
      }

      // Check if user is team captain
      if (!team.isCaptain(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Only team captain can update member status',
        });
      }

      // Find member
      const member = team.members.find(
        (m) => m._id.toString() === req.params.memberId
      );
      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
        });
      }

      // Update member
      if (status) member.status = status;
      if (role) member.role = role;

      // Handle captain transfer
      if (role === 'captain') {
        // Demote current captain to member
        const currentCaptain = team.members.find((m) => m.role === 'captain');
        if (currentCaptain) {
          currentCaptain.role = 'member';
        }
        // Update team captain
        team.captain = member.user;
      }

      await team.save();

      // Update user's teams if status changed to active
      if (status === 'active') {
        await User.findByIdAndUpdate(member.user, {
          $addToSet: { teams: team._id },
        });
      } else if (status === 'inactive') {
        await User.findByIdAndUpdate(member.user, {
          $pull: { teams: team._id },
        });
      }

      await team.populate('members.user', 'username avatar');

      res.json({
        success: true,
        message: 'Member updated successfully',
        data: { team },
      });
    } catch (error) {
      console.error('Update member error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

// @route   DELETE /api/teams/:id/members/:memberId
// @desc    Remove member from team (Captain only)
// @access  Private
router.delete('/:id/members/:memberId', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    // Check if user is team captain
    if (!team.isCaptain(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Only team captain can remove members',
      });
    }

    // Find and remove member
    const memberIndex = team.members.findIndex(
      (m) => m._id.toString() === req.params.memberId
    );
    if (memberIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Member not found',
      });
    }

    const member = team.members[memberIndex];

    // Prevent captain from removing themselves
    if (member.user.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Captain cannot remove themselves',
      });
    }

    team.members.splice(memberIndex, 1);
    await team.save();

    // Remove team from user's teams
    await User.findByIdAndUpdate(member.user, {
      $pull: { teams: team._id },
    });

    res.json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   DELETE /api/teams/:id/leave
// @desc    Leave team
// @access  Private
router.delete('/:id/leave', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    // Check if user is a member
    const memberIndex = team.members.findIndex(
      (m) => m.user.toString() === userId
    );
    if (memberIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'You are not a member of this team',
      });
    }

    const member = team.members[memberIndex];

    // Handle captain leaving
    if (member.role === 'captain') {
      if (team.members.length > 1) {
        // Transfer captaincy to oldest active member
        const newCaptain = team.members.find(
          (m) => m.user.toString() !== userId && m.status === 'active'
        );

        if (newCaptain) {
          newCaptain.role = 'captain';
          team.captain = newCaptain.user;
        } else {
          // No suitable replacement, team needs to be disbanded or handled
          return res.status(400).json({
            success: false,
            message:
              'Cannot leave team as captain without transferring leadership first',
          });
        }
      }
    }

    // Remove member
    team.members.splice(memberIndex, 1);
    await team.save();

    // Remove team from user's teams
    await User.findByIdAndUpdate(userId, {
      $pull: { teams: team._id },
    });

    res.json({
      success: true,
      message: 'Successfully left the team',
    });
  } catch (error) {
    console.error('Leave team error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

module.exports = router;
