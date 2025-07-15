const express = require('express');
const { body, validationResult } = require('express-validator');
const Tournament = require('../models/Tournament');
const ComplianceAudit = require('../models/ComplianceAudit');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Compliance validation service
const complianceService = {
  // Check tournament compliance
  validateTournament: async (tournamentData) => {
    const violations = [];
    const { maxParticipants, entryFee, format, game, creator } = tournamentData;

    // Minimum participants check
    if (maxParticipants < 20) {
      violations.push({
        type: 'minimum_participants',
        description: 'Tournament must have minimum 20 participants',
        severity: 'critical',
      });
    }

    // Entry fee check
    if (entryFee > 50) {
      violations.push({
        type: 'excessive_entry_fee',
        description: 'Entry fee exceeds $50 USD limit',
        severity: 'high',
      });
    }

    // Format validation
    const allowedFormats = [
      'single-elimination',
      'double-elimination',
      'round-robin',
      'swiss',
    ];
    if (!allowedFormats.includes(format)) {
      violations.push({
        type: 'invalid_format',
        description: 'Tournament format not allowed for Riot API compliance',
        severity: 'high',
      });
    }

    // Creator compliance check
    const creatorUser = await User.findById(creator);
    if (
      creatorUser &&
      creatorUser.riotApiCompliance.complianceStatus !== 'compliant'
    ) {
      violations.push({
        type: 'creator_non_compliant',
        description: 'Tournament creator has compliance violations',
        severity: 'medium',
      });
    }

    return {
      isCompliant: violations.length === 0,
      violations,
      complianceLevel:
        violations.length === 0
          ? 'full'
          : violations.some((v) => v.severity === 'critical')
          ? 'violations'
          : 'partial',
    };
  },

  // Monitor ongoing compliance
  monitorCompliance: async () => {
    const activeTournaments = await Tournament.find({
      status: { $in: ['registration', 'ongoing'] },
    });

    const results = [];
    for (const tournament of activeTournaments) {
      const validation = await complianceService.validateTournament(tournament);

      if (!validation.isCompliant) {
        // Create audit record
        await ComplianceAudit.create({
          tournamentId: tournament._id,
          checkType: 'scheduled',
          complianceStatus: false,
          violations: validation.violations,
          auditedBy: 'system',
        });

        // Update tournament compliance status
        tournament.riotApiCompliant = false;
        tournament.complianceViolations.push(
          ...validation.violations.map((v) => ({
            violation: v.description,
            severity: v.severity,
          }))
        );
        await tournament.save();
      }

      results.push({
        tournamentId: tournament._id,
        tournamentName: tournament.name,
        ...validation,
      });
    }

    return results;
  },
};

// @route   POST /api/compliance/validate-tournament
// @desc    Validate tournament compliance
// @access  Private
router.post(
  '/validate-tournament',
  auth,
  [
    body('tournamentId')
      .isMongoId()
      .withMessage('Valid tournament ID required'),
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

      const { tournamentId } = req.body;
      const tournament = await Tournament.findById(tournamentId);

      if (!tournament) {
        return res.status(404).json({
          success: false,
          message: 'Tournament not found',
        });
      }

      const validation = await complianceService.validateTournament(tournament);

      // Create audit record
      await ComplianceAudit.create({
        tournamentId: tournament._id,
        checkType: 'manual',
        complianceStatus: validation.isCompliant,
        violations: validation.violations,
        reviewedBy: req.user.userId,
        auditedBy: 'manual',
      });

      res.json({
        success: true,
        data: {
          tournamentId,
          tournamentName: tournament.name,
          ...validation,
          auditTimestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Validate tournament compliance error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during compliance validation',
      });
    }
  }
);

// @route   GET /api/compliance/audit-log
// @desc    Get compliance audit log
// @access  Private (Admin)
router.get('/audit-log', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.accountType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const { page = 1, limit = 20, status, severity } = req.query;
    const query = {};

    if (status) query.complianceStatus = status === 'true';
    if (severity) query['violations.severity'] = severity;

    const audits = await ComplianceAudit.find(query)
      .populate('tournamentId', 'name status creator')
      .populate('reviewedBy', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ComplianceAudit.countDocuments(query);

    res.json({
      success: true,
      data: {
        audits,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during audit log retrieval',
    });
  }
});

// @route   GET /api/compliance/dashboard
// @desc    Get compliance dashboard stats
// @access  Private (Admin)
router.get('/dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.accountType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get compliance statistics
    const totalTournaments = await Tournament.countDocuments();
    const compliantTournaments = await Tournament.countDocuments({
      riotApiCompliant: true,
    });
    const recentViolations = await ComplianceAudit.countDocuments({
      complianceStatus: false,
      createdAt: { $gte: last24Hours },
    });

    const severityStats = await ComplianceAudit.aggregate([
      { $match: { createdAt: { $gte: last7Days } } },
      { $unwind: '$violations' },
      { $group: { _id: '$violations.severity', count: { $sum: 1 } } },
    ]);

    const violationTypes = await ComplianceAudit.aggregate([
      { $match: { createdAt: { $gte: last7Days } } },
      { $unwind: '$violations' },
      { $group: { _id: '$violations.type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const complianceScore =
      totalTournaments > 0
        ? Math.round((compliantTournaments / totalTournaments) * 100)
        : 100;

    res.json({
      success: true,
      data: {
        overview: {
          totalTournaments,
          compliantTournaments,
          complianceScore,
          recentViolations,
        },
        severityBreakdown: severityStats,
        topViolationTypes: violationTypes,
        riotApiStatus: {
          status: 'operational', // Would check actual API status
          lastCheck: new Date().toISOString(),
          rateLimitUsage: '45%', // Would track actual usage
        },
        recommendations: [
          'Review tournaments with minimum participant violations',
          'Monitor entry fee compliance for new tournaments',
          'Update creator onboarding about policy requirements',
        ],
      },
    });
  } catch (error) {
    console.error('Get compliance dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during dashboard generation',
    });
  }
});

// @route   POST /api/compliance/run-audit
// @desc    Run comprehensive compliance audit
// @access  Private (Admin)
router.post('/run-audit', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.accountType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    const results = await complianceService.monitorCompliance();

    const summary = {
      totalChecked: results.length,
      compliant: results.filter((r) => r.isCompliant).length,
      violations: results.filter((r) => !r.isCompliant).length,
      critical: results.filter((r) =>
        r.violations?.some((v) => v.severity === 'critical')
      ).length,
    };

    res.json({
      success: true,
      message: 'Compliance audit completed',
      data: {
        summary,
        results,
        auditTimestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Run compliance audit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during compliance audit',
    });
  }
});

// @route   PUT /api/compliance/resolve-violation/:auditId
// @desc    Mark compliance violation as resolved
// @access  Private (Admin)
router.put(
  '/resolve-violation/:auditId',
  auth,
  [
    body('resolution').notEmpty().withMessage('Resolution notes required'),
    body('resolved').isBoolean().withMessage('Resolved status required'),
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

      const user = await User.findById(req.user.userId);
      if (user.accountType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }

      const { auditId } = req.params;
      const { resolution, resolved } = req.body;

      const audit = await ComplianceAudit.findById(auditId);
      if (!audit) {
        return res.status(404).json({
          success: false,
          message: 'Audit record not found',
        });
      }

      // Update audit with resolution
      audit.complianceStatus = resolved;
      audit.resolution = resolution;
      audit.resolvedBy = req.user.userId;
      audit.resolvedAt = new Date();
      await audit.save();

      // If resolved, update tournament compliance status
      if (resolved && audit.tournamentId) {
        const tournament = await Tournament.findById(audit.tournamentId);
        if (tournament) {
          tournament.riotApiCompliant = true;
          tournament.complianceChecked = true;
          await tournament.save();
        }
      }

      res.json({
        success: true,
        message: 'Violation resolution updated',
        data: {
          auditId,
          resolved,
          resolution,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Resolve violation error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during violation resolution',
      });
    }
  }
);

module.exports = router;
