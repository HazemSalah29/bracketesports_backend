const mongoose = require('mongoose');
const cron = require('node-cron');
const Tournament = require('./models/Tournament');
const ComplianceAudit = require('./models/ComplianceAudit');
const User = require('./models/User');
const logger = require('./utils/logger');

// Compliance monitoring service
class ComplianceMonitor {
  constructor() {
    this.isRunning = false;
  }

  // Start monitoring
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    logger.info('Compliance monitoring started');

    // Run daily compliance check at 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.runDailyAudit();
    });

    // Run hourly checks for active tournaments
    cron.schedule('0 * * * *', async () => {
      await this.runHourlyCheck();
    });

    // Weekly comprehensive audit
    cron.schedule('0 3 * * 0', async () => {
      await this.runWeeklyAudit();
    });
  }

  // Daily compliance audit
  async runDailyAudit() {
    try {
      logger.info('Starting daily compliance audit');

      const activeTournaments = await Tournament.find({
        status: { $in: ['registration', 'ongoing'] },
        riotApiCompliant: true,
      });

      let totalChecked = 0;
      let violations = 0;

      for (const tournament of activeTournaments) {
        const compliance = await this.checkTournamentCompliance(tournament);
        totalChecked++;

        if (!compliance.isCompliant) {
          violations++;
          await this.recordViolation(tournament._id, compliance.violations);
        }
      }

      // Check user compliance
      const users = await User.find({
        'riotApiCompliance.hasLinkedRiotAccount': true,
        'riotApiCompliance.complianceStatus': { $ne: 'suspended' },
      });

      for (const user of users) {
        await this.checkUserCompliance(user);
      }

      logger.info(
        `Daily audit completed: ${totalChecked} tournaments checked, ${violations} violations found`
      );
    } catch (error) {
      logger.error('Daily audit error:', error);
    }
  }

  // Hourly checks for active tournaments
  async runHourlyCheck() {
    try {
      const activeTournaments = await Tournament.find({
        status: 'ongoing',
        riotApiCompliant: true,
      }).limit(10); // Limit to prevent overload

      for (const tournament of activeTournaments) {
        const compliance = await this.checkTournamentCompliance(tournament);

        if (!compliance.isCompliant) {
          await this.recordViolation(
            tournament._id,
            compliance.violations,
            'hourly'
          );
        }
      }
    } catch (error) {
      logger.error('Hourly check error:', error);
    }
  }

  // Weekly comprehensive audit
  async runWeeklyAudit() {
    try {
      logger.info('Starting weekly comprehensive audit');

      // Generate compliance report
      const report = await this.generateComplianceReport();

      // Check for patterns in violations
      const patterns = await this.analyzeViolationPatterns();

      // Update compliance scores
      await this.updateComplianceScores();

      logger.info('Weekly audit completed', { report, patterns });
    } catch (error) {
      logger.error('Weekly audit error:', error);
    }
  }

  // Check tournament compliance
  async checkTournamentCompliance(tournament) {
    const violations = [];

    // Check minimum participants
    if (tournament.maxParticipants < 20) {
      violations.push({
        type: 'minimum_participants',
        description: 'Tournament allows less than 20 participants',
        severity: 'critical',
      });
    }

    // Check entry fee
    if (tournament.entryFee > 50) {
      violations.push({
        type: 'excessive_entry_fee',
        description: `Entry fee $${tournament.entryFee} exceeds $50 limit`,
        severity: 'high',
      });
    }

    // Check format
    const allowedFormats = [
      'single-elimination',
      'double-elimination',
      'round-robin',
      'swiss',
    ];
    if (!allowedFormats.includes(tournament.format)) {
      violations.push({
        type: 'invalid_format',
        description: `Format ${tournament.format} not allowed`,
        severity: 'high',
      });
    }

    // Check for gambling-like features
    if (
      tournament.description &&
      this.containsGamblingKeywords(tournament.description)
    ) {
      violations.push({
        type: 'gambling_features',
        description: 'Tournament description contains gambling-related content',
        severity: 'critical',
      });
    }

    // Check prize distribution
    if (
      tournament.prizePool &&
      tournament.prizePool.total >
        tournament.entryFee * tournament.maxParticipants
    ) {
      violations.push({
        type: 'invalid_prize_pool',
        description: 'Prize pool exceeds entry fee collections',
        severity: 'medium',
      });
    }

    return {
      isCompliant: violations.length === 0,
      violations,
      timestamp: new Date(),
    };
  }

  // Check user compliance
  async checkUserCompliance(user) {
    const violations = [];

    // Check daily coin purchase limits
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyPurchases =
      user.coinTransactions?.filter(
        (t) =>
          t.type === 'purchase' &&
          new Date(t.timestamp).getTime() >= today.getTime()
      ) || [];

    const dailyTotal = dailyPurchases.reduce((sum, t) => sum + t.amount, 0);
    if (dailyTotal > 10000) {
      // Max daily purchase limit
      violations.push({
        type: 'excessive_coin_purchase',
        description: `Daily coin purchases (${dailyTotal}) exceed limit`,
        severity: 'medium',
      });
    }

    // Check for prohibited coin usage
    const prohibitedUsage =
      user.coinTransactions?.filter(
        (t) =>
          t.usageType &&
          ![
            'tournament-entry-fee',
            'cosmetic-purchases',
            'platform-features',
          ].includes(t.usageType)
      ) || [];

    if (prohibitedUsage.length > 0) {
      violations.push({
        type: 'prohibited_coin_usage',
        description: 'Coins used for prohibited purposes',
        severity: 'high',
      });
    }

    // Update user compliance status
    if (violations.length > 0) {
      user.riotApiCompliance.complianceStatus = violations.some(
        (v) => v.severity === 'critical'
      )
        ? 'violation'
        : 'warning';
      user.riotApiCompliance.complianceViolations.push(
        ...violations.map((v) => ({
          type: v.description,
          severity: v.severity,
        }))
      );
      user.riotApiCompliance.lastComplianceCheck = new Date();
      await user.save();
    }

    return {
      isCompliant: violations.length === 0,
      violations,
    };
  }

  // Record violation
  async recordViolation(tournamentId, violations, checkType = 'scheduled') {
    try {
      await ComplianceAudit.create({
        tournamentId,
        checkType,
        complianceStatus: false,
        violations,
        auditedBy: 'system',
        recommendations: this.generateRecommendations(violations),
      });

      // Update tournament compliance status
      const tournament = await Tournament.findById(tournamentId);
      if (tournament) {
        tournament.riotApiCompliant = false;
        tournament.complianceViolations.push(
          ...violations.map((v) => ({
            violation: v.description,
            severity: v.severity,
          }))
        );
        await tournament.save();
      }
    } catch (error) {
      logger.error('Error recording violation:', error);
    }
  }

  // Generate recommendations
  generateRecommendations(violations) {
    const recommendations = [];

    violations.forEach((violation) => {
      switch (violation.type) {
        case 'minimum_participants':
          recommendations.push(
            'Increase tournament capacity to minimum 20 participants'
          );
          break;
        case 'excessive_entry_fee':
          recommendations.push('Reduce entry fee to $50 USD or less');
          break;
        case 'invalid_format':
          recommendations.push(
            'Change tournament format to elimination, round-robin, or swiss'
          );
          break;
        case 'gambling_features':
          recommendations.push(
            'Remove gambling-related content from tournament description'
          );
          break;
        default:
          recommendations.push('Review tournament settings for compliance');
      }
    });

    return recommendations;
  }

  // Check for gambling keywords
  containsGamblingKeywords(text) {
    const gamblingKeywords = [
      'bet',
      'betting',
      'wager',
      'wagering',
      'gamble',
      'gambling',
      'casino',
      'lottery',
      'jackpot',
      'odds',
      'payout',
      'speculation',
      'investment',
      'profit',
      'trading',
      'market',
      'exchange',
    ];

    const textLower = text.toLowerCase();
    return gamblingKeywords.some((keyword) => textLower.includes(keyword));
  }

  // Generate compliance report
  async generateComplianceReport() {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const totalAudits = await ComplianceAudit.countDocuments({
      createdAt: { $gte: last7Days },
    });

    const violationCount = await ComplianceAudit.countDocuments({
      complianceStatus: false,
      createdAt: { $gte: last7Days },
    });

    const violationTypes = await ComplianceAudit.aggregate([
      { $match: { createdAt: { $gte: last7Days } } },
      { $unwind: '$violations' },
      { $group: { _id: '$violations.type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return {
      period: '7 days',
      totalAudits,
      violationCount,
      complianceRate:
        totalAudits > 0
          ? Math.round(((totalAudits - violationCount) / totalAudits) * 100)
          : 100,
      topViolations: violationTypes.slice(0, 5),
    };
  }

  // Analyze violation patterns
  async analyzeViolationPatterns() {
    // This would implement machine learning or statistical analysis
    // For now, return basic pattern analysis

    const patterns = await ComplianceAudit.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          violations: { $sum: 1 },
        },
      },
      { $sort: { violations: -1 } },
    ]);

    return {
      dailyPatterns: patterns,
      peakViolationDay: patterns[0]?._id,
      trend: 'stable', // Would calculate actual trend
    };
  }

  // Update compliance scores
  async updateComplianceScores() {
    const users = await User.find({
      'riotApiCompliance.hasLinkedRiotAccount': true,
    });

    for (const user of users) {
      const recentViolations =
        user.riotApiCompliance.complianceViolations.filter(
          (v) =>
            new Date(v.timestamp).getTime() >
            Date.now() - 30 * 24 * 60 * 60 * 1000
        );

      let status = 'compliant';
      if (recentViolations.length > 0) {
        const hasCritical = recentViolations.some(
          (v) => v.severity === 'critical'
        );
        const hasHigh = recentViolations.some((v) => v.severity === 'high');

        if (hasCritical) status = 'violation';
        else if (hasHigh || recentViolations.length > 3) status = 'warning';
      }

      user.riotApiCompliance.complianceStatus = status;
      await user.save();
    }
  }

  // Stop monitoring
  stop() {
    this.isRunning = false;
    logger.info('Compliance monitoring stopped');
  }
}

// Export singleton instance
module.exports = new ComplianceMonitor();
