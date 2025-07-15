const mongoose = require('mongoose');

const complianceAuditSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
    },
    checkType: {
      type: String,
      enum: ['creation', 'modification', 'completion', 'scheduled', 'manual'],
      required: true,
    },
    complianceStatus: {
      type: Boolean,
      required: true,
    },
    violations: [
      {
        type: {
          type: String,
          enum: [
            'minimum_participants',
            'invalid_format',
            'excessive_entry_fee',
            'gambling_features',
            'unfair_matchmaking',
            'premium_features',
            'monetary_policy',
            'api_misuse',
          ],
        },
        description: String,
        severity: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium',
        },
      },
    ],
    riotApiUsage: {
      endpointsUsed: [String],
      rateLimitStatus: String,
      complianceLevel: {
        type: String,
        enum: ['full', 'partial', 'violations', 'suspended'],
        default: 'full',
      },
    },
    recommendations: [String],
    auditedBy: {
      type: String,
      enum: ['system', 'admin', 'riot_compliance'],
      default: 'system',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    nextAuditDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
complianceAuditSchema.index({ tournamentId: 1, checkType: 1 });
complianceAuditSchema.index({ complianceStatus: 1 });
complianceAuditSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ComplianceAudit', complianceAuditSchema);
