const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const GamingAccount = require('../models/GamingAccount');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Riot Games API configuration
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

// @route   POST /api/gaming-accounts/link-riot
// @desc    Link Riot Games account
// @access  Private
router.post(
  '/link-riot',
  auth,
  [
    body('username').notEmpty().trim().withMessage('Username is required'),
    body('gameTag').notEmpty().trim().withMessage('Game tag is required'),
    body('game')
      .isIn(['League of Legends', 'Valorant', 'TFT'])
      .withMessage('Invalid game selection'),
    body('region')
      .isIn([
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
      ])
      .withMessage('Invalid region selection'),
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

      const { username, gameTag, game, region } = req.body;
      const userId = req.user.userId;

      // Check if account already linked
      const existingAccount = await GamingAccount.findOne({
        user: userId,
        platform: 'riot',
        game: game,
      });

      if (existingAccount) {
        return res.status(400).json({
          success: false,
          message: 'Riot account for this game is already linked',
        });
      }

      try {
        // SECURITY UPDATE: Use internal Riot API proxy instead of direct calls
        // This ensures all Riot API access is controlled and monitored
        const verificationResponse = await axios.post(
          `${
            process.env.BACKEND_URL || 'http://localhost:5000'
          }/api/riot/verify`,
          {
            username,
            gameTag,
            region,
          },
          {
            headers: {
              Authorization: `Bearer ${
                req.headers.authorization?.split(' ')[1]
              }`,
              'Content-Type': 'application/json',
            },
          }
        );

        const accountData = verificationResponse.data.data;

        // Get game-specific data based on the game
        let gameSpecificData = {};

        if (game === 'League of Legends') {
          // Get summoner data
          const platformUrl = RIOT_API_BASE_URLS[region];
          const summonerResponse = await axios.get(
            `${platformUrl}/lol/summoner/v4/summoners/by-puuid/${accountData.puuid}`,
            {
              headers: {
                'X-Riot-Token': process.env.RIOT_API_KEY,
              },
            }
          );

          const summonerData = summonerResponse.data;

          // Get ranked data
          try {
            const rankedResponse = await axios.get(
              `${platformUrl}/lol/league/v4/entries/by-summoner/${summonerData.id}`,
              {
                headers: {
                  'X-Riot-Token': process.env.RIOT_API_KEY,
                },
              }
            );

            const rankedData = rankedResponse.data;
            const soloQueueData = rankedData.find(
              (queue) => queue.queueType === 'RANKED_SOLO_5x5'
            );

            gameSpecificData = {
              summonerId: summonerData.id,
              level: summonerData.summonerLevel,
              currentRank: soloQueueData
                ? {
                    tier: soloQueueData.tier,
                    division: soloQueueData.rank,
                    lp: soloQueueData.leaguePoints,
                  }
                : null,
              wins: soloQueueData ? soloQueueData.wins : 0,
              losses: soloQueueData ? soloQueueData.losses : 0,
            };
          } catch (rankedError) {
            console.log('Could not fetch ranked data:', rankedError.message);
          }
        }

        // Create gaming account
        const gamingAccount = new GamingAccount({
          user: userId,
          platform: 'riot',
          game: game,
          username: username,
          gameTag: gameTag,
          region: region,
          accountId: accountData.puuid, // Using PUUID as account ID
          puuid: accountData.puuid,
          summonerId: gameSpecificData.summonerId,
          isVerified: true,
          verificationData: {
            lastUpdated: new Date(),
            verificationMethod: 'riot_api',
            apiResponse: accountData,
          },
          stats: {
            currentRank: gameSpecificData.currentRank,
            level: gameSpecificData.level,
            wins: gameSpecificData.wins,
            losses: gameSpecificData.losses,
            winRate:
              gameSpecificData.wins + gameSpecificData.losses > 0
                ? (
                    (gameSpecificData.wins /
                      (gameSpecificData.wins + gameSpecificData.losses)) *
                    100
                  ).toFixed(1)
                : 0,
            totalGames: gameSpecificData.wins + gameSpecificData.losses,
          },
        });

        await gamingAccount.save();

        // Update user's gaming accounts
        await User.findByIdAndUpdate(userId, {
          $push: { gamingAccounts: gamingAccount._id },
        });

        res.status(201).json({
          success: true,
          message: 'Riot account linked successfully',
          data: { gamingAccount },
        });
      } catch (apiError) {
        console.error(
          'Riot API error:',
          apiError.response?.data || apiError.message
        );

        if (apiError.response?.status === 404) {
          return res.status(404).json({
            success: false,
            message:
              'Riot account not found. Please check your username and tag.',
          });
        }

        if (apiError.response?.status === 429) {
          return res.status(429).json({
            success: false,
            message: 'Rate limit exceeded. Please try again later.',
          });
        }

        return res.status(500).json({
          success: false,
          message: 'Failed to verify Riot account',
        });
      }
    } catch (error) {
      console.error('Link Riot account error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

// @route   GET /api/gaming-accounts
// @desc    Get user's gaming accounts
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const gamingAccounts = await GamingAccount.find({ user: req.user.userId });

    res.json({
      success: true,
      data: { gamingAccounts },
    });
  } catch (error) {
    console.error('Get gaming accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   PUT /api/gaming-accounts/:id/refresh
// @desc    Refresh gaming account data
// @access  Private
router.put('/:id/refresh', auth, async (req, res) => {
  try {
    const gamingAccount = await GamingAccount.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!gamingAccount) {
      return res.status(404).json({
        success: false,
        message: 'Gaming account not found',
      });
    }

    if (gamingAccount.platform === 'riot') {
      try {
        // Refresh Riot account data
        const regionalUrl = getRegionalUrl(gamingAccount.region);
        const accountResponse = await axios.get(
          `${regionalUrl}/riot/account/v1/accounts/by-puuid/${gamingAccount.puuid}`,
          {
            headers: {
              'X-Riot-Token': process.env.RIOT_API_KEY,
            },
          }
        );

        if (
          gamingAccount.game === 'League of Legends' &&
          gamingAccount.summonerId
        ) {
          const platformUrl = RIOT_API_BASE_URLS[gamingAccount.region];

          // Get updated summoner data
          const summonerResponse = await axios.get(
            `${platformUrl}/lol/summoner/v4/summoners/by-puuid/${gamingAccount.puuid}`,
            {
              headers: {
                'X-Riot-Token': process.env.RIOT_API_KEY,
              },
            }
          );

          // Get updated ranked data
          const rankedResponse = await axios.get(
            `${platformUrl}/lol/league/v4/entries/by-summoner/${gamingAccount.summonerId}`,
            {
              headers: {
                'X-Riot-Token': process.env.RIOT_API_KEY,
              },
            }
          );

          const rankedData = rankedResponse.data;
          const soloQueueData = rankedData.find(
            (queue) => queue.queueType === 'RANKED_SOLO_5x5'
          );

          // Update stats
          gamingAccount.stats = {
            ...gamingAccount.stats,
            currentRank: soloQueueData
              ? {
                  tier: soloQueueData.tier,
                  division: soloQueueData.rank,
                  lp: soloQueueData.leaguePoints,
                }
              : null,
            level: summonerResponse.data.summonerLevel,
            wins: soloQueueData ? soloQueueData.wins : 0,
            losses: soloQueueData ? soloQueueData.losses : 0,
            winRate:
              soloQueueData && soloQueueData.wins + soloQueueData.losses > 0
                ? (
                    (soloQueueData.wins /
                      (soloQueueData.wins + soloQueueData.losses)) *
                    100
                  ).toFixed(1)
                : 0,
            totalGames: soloQueueData
              ? soloQueueData.wins + soloQueueData.losses
              : 0,
          };
        }

        gamingAccount.verificationData.lastUpdated = new Date();
        await gamingAccount.save();

        res.json({
          success: true,
          message: 'Gaming account refreshed successfully',
          data: { gamingAccount },
        });
      } catch (apiError) {
        console.error(
          'API refresh error:',
          apiError.response?.data || apiError.message
        );
        res.status(500).json({
          success: false,
          message: 'Failed to refresh account data',
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'Refresh not supported for this platform',
      });
    }
  } catch (error) {
    console.error('Refresh gaming account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   DELETE /api/gaming-accounts/:id
// @desc    Unlink gaming account
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const gamingAccount = await GamingAccount.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!gamingAccount) {
      return res.status(404).json({
        success: false,
        message: 'Gaming account not found',
      });
    }

    // Remove from user's gaming accounts
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { gamingAccounts: gamingAccount._id },
    });

    // Delete gaming account
    await GamingAccount.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Gaming account unlinked successfully',
    });
  } catch (error) {
    console.error('Unlink gaming account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

module.exports = router;
