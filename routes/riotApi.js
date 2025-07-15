const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const GamingAccount = require('../models/GamingAccount');
const User = require('../models/User');
const ComplianceAudit = require('../models/ComplianceAudit');
const auth = require('../middleware/auth');
const router = express.Router();

// Riot API configuration - SECURE BACKEND ONLY
const RIOT_API_BASE_URLS = {
  NA1: 'https://na1.api.riotgames.com',
  EUW1: 'https://euw1.api.riotgames.com',
  EUN1: 'https://eun1.api.riotgames.com',
  KR: 'https://kr.api.riotgames.com',
  JP1: 'https://jp1.api.riotgames.com',
  BR1: 'https://br1.api.riotgames.com',
  LAN: 'https://la1.api.riotgames.com',
  LAS: 'https://la2.api.riotgames.com',
  OCE1: 'https://oc1.api.riotgames.com',
  TR1: 'https://tr1.api.riotgames.com',
  RU: 'https://ru.api.riotgames.com',
};

const RIOT_REGIONAL_URLS = {
  americas: 'https://americas.api.riotgames.com',
  europe: 'https://europe.api.riotgames.com',
  asia: 'https://asia.api.riotgames.com',
};

// Helper function to get regional URL
const getRegionalUrl = (region) => {
  const americasRegions = ['NA1', 'BR1', 'LAN', 'LAS'];
  const europeRegions = ['EUW1', 'EUN1', 'TR1', 'RU'];
  const asiaRegions = ['KR', 'JP1'];

  if (americasRegions.includes(region)) return RIOT_REGIONAL_URLS.americas;
  if (europeRegions.includes(region)) return RIOT_REGIONAL_URLS.europe;
  if (asiaRegions.includes(region)) return RIOT_REGIONAL_URLS.asia;

  return RIOT_REGIONAL_URLS.americas; // default
};

// Rate limiting and compliance tracking
const apiUsageTracker = {
  requests: new Map(),

  track: (endpoint, userId) => {
    const key = `${userId}-${endpoint}`;
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove requests older than 1 minute
    const recent = requests.filter((time) => now - time < 60000);
    recent.push(now);

    this.requests.set(key, recent);
    return recent.length;
  },

  isRateLimited: (endpoint, userId) => {
    const count = this.track(endpoint, userId);
    return count > 20; // 20 requests per minute per user
  },
};

// @route   POST /api/riot/verify
// @desc    Verify Riot account (SECURE PROXY)
// @access  Private
router.post(
  '/verify',
  auth,
  [
    body('username').notEmpty().trim().withMessage('Username is required'),
    body('gameTag').notEmpty().trim().withMessage('Game tag is required'),
    body('region')
      .isIn(Object.keys(RIOT_API_BASE_URLS))
      .withMessage('Invalid region'),
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

      const { username, gameTag, region } = req.body;
      const userId = req.user.userId;

      // Rate limiting check
      if (apiUsageTracker.isRateLimited('verify', userId)) {
        return res.status(429).json({
          success: false,
          message: 'Rate limit exceeded. Please try again later.',
        });
      }

      try {
        const regionalUrl = getRegionalUrl(region);
        const accountResponse = await axios.get(
          `${regionalUrl}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
            username
          )}/${encodeURIComponent(gameTag)}`,
          {
            headers: {
              'X-Riot-Token': process.env.RIOT_API_KEY,
            },
            timeout: 10000,
          }
        );

        const accountData = accountResponse.data;

        // Log API usage for compliance
        await ComplianceAudit.create({
          tournamentId: null, // Not tournament specific
          checkType: 'manual',
          complianceStatus: true,
          riotApiUsage: {
            endpointsUsed: ['account/v1/accounts/by-riot-id'],
            rateLimitStatus: 'normal',
            complianceLevel: 'full',
          },
          auditedBy: 'system',
        });

        res.json({
          success: true,
          message: 'Account verified successfully',
          data: {
            puuid: accountData.puuid,
            username: accountData.gameName,
            gameTag: accountData.tagLine,
            verified: true,
          },
        });
      } catch (riotError) {
        console.error(
          'Riot API Error:',
          riotError.response?.data || riotError.message
        );

        if (riotError.response?.status === 404) {
          return res.status(404).json({
            success: false,
            message: 'Riot account not found. Please check username and tag.',
          });
        }

        if (riotError.response?.status === 429) {
          return res.status(429).json({
            success: false,
            message: 'Riot API rate limit exceeded. Please try again later.',
          });
        }

        res.status(500).json({
          success: false,
          message: 'Failed to verify account with Riot Games',
        });
      }
    } catch (error) {
      console.error('Verify account error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during account verification',
      });
    }
  }
);

// @route   GET /api/riot/player/:puuid
// @desc    Get player profile (SECURE PROXY)
// @access  Private
router.get('/player/:puuid', auth, async (req, res) => {
  try {
    const { puuid } = req.params;
    const { region = 'NA1', game = 'League of Legends' } = req.query;
    const userId = req.user.userId;

    // Rate limiting check
    if (apiUsageTracker.isRateLimited('player-profile', userId)) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Please try again later.',
      });
    }

    const regionalUrl = RIOT_API_BASE_URLS[region];
    let playerData = {};

    try {
      if (game === 'League of Legends') {
        // Get summoner by PUUID
        const summonerResponse = await axios.get(
          `${regionalUrl}/lol/summoner/v4/summoners/by-puuid/${puuid}`,
          {
            headers: { 'X-Riot-Token': process.env.RIOT_API_KEY },
            timeout: 10000,
          }
        );

        const summoner = summonerResponse.data;

        // Get ranked stats
        const rankedResponse = await axios.get(
          `${regionalUrl}/lol/league/v4/entries/by-summoner/${summoner.id}`,
          {
            headers: { 'X-Riot-Token': process.env.RIOT_API_KEY },
            timeout: 10000,
          }
        );

        const rankedData = rankedResponse.data;
        const soloQueueData = rankedData.find(
          (queue) => queue.queueType === 'RANKED_SOLO_5x5'
        );

        playerData = {
          summoner: {
            id: summoner.id,
            name: summoner.name,
            level: summoner.summonerLevel,
            profileIconId: summoner.profileIconId,
          },
          ranked: soloQueueData
            ? {
                tier: soloQueueData.tier,
                rank: soloQueueData.rank,
                leaguePoints: soloQueueData.leaguePoints,
                wins: soloQueueData.wins,
                losses: soloQueueData.losses,
                winRate: (
                  (soloQueueData.wins /
                    (soloQueueData.wins + soloQueueData.losses)) *
                  100
                ).toFixed(1),
              }
            : null,
        };
      }

      res.json({
        success: true,
        data: {
          puuid,
          game,
          region,
          playerData,
        },
      });
    } catch (riotError) {
      console.error(
        'Riot API Error:',
        riotError.response?.data || riotError.message
      );
      res.status(500).json({
        success: false,
        message: 'Failed to fetch player data',
      });
    }
  } catch (error) {
    console.error('Get player profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during player profile fetch',
    });
  }
});

// @route   GET /api/riot/matches/:puuid
// @desc    Get player match history (SECURE PROXY)
// @access  Private
router.get('/matches/:puuid', auth, async (req, res) => {
  try {
    const { puuid } = req.params;
    const { region = 'NA1', count = 5 } = req.query;
    const userId = req.user.userId;

    // Rate limiting check
    if (apiUsageTracker.isRateLimited('match-history', userId)) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Please try again later.',
      });
    }

    const regionalUrl = getRegionalUrl(region);

    try {
      // Get match IDs
      const matchIdsResponse = await axios.get(
        `${regionalUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`,
        {
          headers: { 'X-Riot-Token': process.env.RIOT_API_KEY },
          timeout: 10000,
        }
      );

      const matchIds = matchIdsResponse.data;
      const matches = [];

      // Get detailed match data (limit to prevent rate limiting)
      for (let i = 0; i < Math.min(matchIds.length, 3); i++) {
        try {
          const matchResponse = await axios.get(
            `${regionalUrl}/lol/match/v5/matches/${matchIds[i]}`,
            {
              headers: { 'X-Riot-Token': process.env.RIOT_API_KEY },
              timeout: 10000,
            }
          );

          const matchData = matchResponse.data;
          const participant = matchData.info.participants.find(
            (p) => p.puuid === puuid
          );

          if (participant) {
            matches.push({
              gameId: matchData.metadata.matchId,
              gameCreation: matchData.info.gameCreation,
              gameDuration: matchData.info.gameDuration,
              championName: participant.championName,
              kills: participant.kills,
              deaths: participant.deaths,
              assists: participant.assists,
              win: participant.win,
            });
          }
        } catch (matchError) {
          console.error('Error fetching match details:', matchError.message);
        }
      }

      res.json({
        success: true,
        data: {
          matches,
          totalMatches: matchIds.length,
        },
      });
    } catch (riotError) {
      console.error(
        'Riot API Error:',
        riotError.response?.data || riotError.message
      );
      res.status(500).json({
        success: false,
        message: 'Failed to fetch match history',
      });
    }
  } catch (error) {
    console.error('Get match history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during match history fetch',
    });
  }
});

// @route   GET /api/riot/stats/:puuid
// @desc    Get player statistics (SECURE PROXY)
// @access  Private
router.get('/stats/:puuid', auth, async (req, res) => {
  try {
    const { puuid } = req.params;
    const { region = 'NA1' } = req.query;
    const userId = req.user.userId;

    // Rate limiting check
    if (apiUsageTracker.isRateLimited('player-stats', userId)) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Please try again later.',
      });
    }

    // This would compile various stats from multiple endpoints
    // For now, return basic structure
    res.json({
      success: true,
      data: {
        puuid,
        region,
        stats: {
          // Would be populated with real stats from Riot API
          overall: {
            gamesPlayed: 0,
            winRate: 0,
            averageKDA: 0,
          },
          recent: {
            last10Games: 0,
            recentWinRate: 0,
          },
        },
      },
    });
  } catch (error) {
    console.error('Get player stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during stats fetch',
    });
  }
});

// @route   GET /api/riot/compliance-status
// @desc    Get Riot API compliance status
// @access  Private (Admin)
router.get('/compliance-status', auth, async (req, res) => {
  try {
    // Check if user is admin (you might want to add admin middleware)
    const user = await User.findById(req.user.userId);
    if (user.accountType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
    }

    // Get recent compliance audits
    const recentAudits = await ComplianceAudit.find({})
      .sort({ createdAt: -1 })
      .limit(50);

    const complianceStats = {
      totalAudits: recentAudits.length,
      compliantAudits: recentAudits.filter((audit) => audit.complianceStatus)
        .length,
      violationsCount: recentAudits.filter((audit) => !audit.complianceStatus)
        .length,
      lastAudit: recentAudits[0]?.createdAt,
      riotApiStatus: 'operational', // Would check actual API status
      complianceLevel: 'full',
    };

    res.json({
      success: true,
      data: {
        complianceStats,
        recentAudits: recentAudits.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('Get compliance status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during compliance check',
    });
  }
});

module.exports = router;
