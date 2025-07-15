const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Virtual currency configuration
const COIN_PACKAGES = [
  { coins: 100, price: 0.99, bonus: 0, popular: false },
  { coins: 500, price: 4.99, bonus: 50, popular: false },
  { coins: 1000, price: 9.99, bonus: 150, popular: true },
  { coins: 2500, price: 24.99, bonus: 500, popular: false },
  { coins: 5000, price: 49.99, bonus: 1250, popular: false },
  { coins: 10000, price: 99.99, bonus: 3000, popular: false }
];

const COIN_TO_USD_RATE = parseFloat(process.env.COIN_TO_USD_RATE) || 0.01;
const PLATFORM_FEE_PERCENTAGE = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE) || 30;

// @route   GET /api/coins/packages
// @desc    Get available coin packages
// @access  Public
router.get('/packages', (req, res) => {
  try {
    const packages = COIN_PACKAGES.map(pkg => ({
      ...pkg,
      totalCoins: pkg.coins + pkg.bonus,
      valuePerCoin: (pkg.price / (pkg.coins + pkg.bonus)).toFixed(4),
      savings: pkg.bonus > 0 ? `${((pkg.bonus / pkg.coins) * 100).toFixed(0)}% bonus` : null
    }));

    res.json({
      success: true,
      data: { packages }
    });

  } catch (error) {
    console.error('Get coin packages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/coins/purchase
// @desc    Create payment intent for coin purchase
// @access  Private
router.post('/purchase', auth, [
  body('packageIndex')
    .isInt({ min: 0, max: COIN_PACKAGES.length - 1 })
    .withMessage('Invalid package selection')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { packageIndex } = req.body;
    const userId = req.user.userId;

    const selectedPackage = COIN_PACKAGES[packageIndex];
    if (!selectedPackage) {
      return res.status(400).json({
        success: false,
        message: 'Invalid package selection'
      });
    }

    try {
      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(selectedPackage.price * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          userId: userId,
          coins: selectedPackage.coins.toString(),
          bonus: selectedPackage.bonus.toString(),
          packageIndex: packageIndex.toString()
        },
        description: `${selectedPackage.coins + selectedPackage.bonus} Bracket Coins`
      });

      res.json({
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          amount: selectedPackage.price,
          coins: selectedPackage.coins,
          bonus: selectedPackage.bonus,
          totalCoins: selectedPackage.coins + selectedPackage.bonus
        }
      });

    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      res.status(500).json({
        success: false,
        message: 'Payment processing error'
      });
    }

  } catch (error) {
    console.error('Purchase coins error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/coins/webhook
// @desc    Handle Stripe webhook for payment confirmation
// @access  Public (Stripe webhook)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const { userId, coins, bonus } = paymentIntent.metadata;

      // Add coins to user account
      const totalCoins = parseInt(coins) + parseInt(bonus);
      await User.findByIdAndUpdate(userId, {
        $inc: { coins: totalCoins }
      });

      console.log(`Added ${totalCoins} coins to user ${userId}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({
      success: false,
      message: 'Webhook error'
    });
  }
});

// @route   GET /api/coins/balance
// @desc    Get user's coin balance
// @access  Private
router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('coins');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        coins: user.coins,
        usdValue: (user.coins * COIN_TO_USD_RATE).toFixed(2)
      }
    });

  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/coins/transfer
// @desc    Transfer coins between users
// @access  Private
router.post('/transfer', auth, [
  body('recipientUsername')
    .notEmpty()
    .withMessage('Recipient username is required'),
  body('amount')
    .isInt({ min: 1 })
    .withMessage('Amount must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { recipientUsername, amount, message } = req.body;
    const senderId = req.user.userId;

    // Find sender and recipient
    const [sender, recipient] = await Promise.all([
      User.findById(senderId),
      User.findOne({ username: recipientUsername })
    ]);

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender not found'
      });
    }

    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    if (sender._id.toString() === recipient._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer coins to yourself'
      });
    }

    // Check sender's balance
    if (sender.coins < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient coin balance'
      });
    }

    // Perform transfer
    await Promise.all([
      User.findByIdAndUpdate(senderId, { $inc: { coins: -amount } }),
      User.findByIdAndUpdate(recipient._id, { $inc: { coins: amount } })
    ]);

    res.json({
      success: true,
      message: `Successfully transferred ${amount} coins to ${recipientUsername}`,
      data: {
        transferred: amount,
        remainingBalance: sender.coins - amount,
        recipient: recipientUsername
      }
    });

  } catch (error) {
    console.error('Transfer coins error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/coins/redeem
// @desc    Redeem coins for USD (Creator cashout)
// @access  Private
router.post('/redeem', auth, [
  body('amount')
    .isInt({ min: 100 })
    .withMessage('Minimum redemption amount is 100 coins'),
  body('payoutMethod')
    .isIn(['paypal', 'bank_transfer', 'stripe'])
    .withMessage('Invalid payout method'),
  body('payoutDetails')
    .isObject()
    .withMessage('Payout details are required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { amount, payoutMethod, payoutDetails } = req.body;
    const userId = req.user.userId;

    // Check if user is a creator
    const user = await User.findById(userId).populate('creatorProfile');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.accountType !== 'creator' || !user.creatorProfile) {
      return res.status(403).json({
        success: false,
        message: 'Only verified creators can redeem coins'
      });
    }

    // Check coin balance
    if (user.coins < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient coin balance'
      });
    }

    // Calculate USD amount (minus platform fee)
    const grossAmount = amount * COIN_TO_USD_RATE;
    const platformFee = grossAmount * (PLATFORM_FEE_PERCENTAGE / 100);
    const netAmount = grossAmount - platformFee;

    // Minimum payout check
    if (netAmount < 10) {
      return res.status(400).json({
        success: false,
        message: 'Minimum payout amount is $10 USD'
      });
    }

    // For demo purposes, we'll simulate the payout process
    // In production, you'd integrate with actual payment processors

    // Deduct coins from user
    user.coins -= amount;
    await user.save();

    // Update creator earnings
    if (user.creatorProfile) {
      user.creatorProfile.earnings.totalEarnings += netAmount;
      user.creatorProfile.earnings.lastPayout = new Date();
      await user.creatorProfile.save();
    }

    // In a real implementation, you would:
    // 1. Create a payout record in the database
    // 2. Queue the payout for processing
    // 3. Handle payout status updates
    // 4. Send confirmation emails

    res.json({
      success: true,
      message: 'Redemption request submitted successfully',
      data: {
        redemptionId: `RDM-${Date.now()}`, // Generate proper ID in production
        coinAmount: amount,
        grossAmount: grossAmount.toFixed(2),
        platformFee: platformFee.toFixed(2),
        netAmount: netAmount.toFixed(2),
        payoutMethod,
        status: 'processing',
        estimatedProcessingTime: '3-5 business days'
      }
    });

  } catch (error) {
    console.error('Redeem coins error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/coins/transactions
// @desc    Get user's coin transaction history
// @access  Private
router.get('/transactions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const userId = req.user.userId;

    // For demo purposes, return mock transaction data
    // In production, you'd have a proper transactions collection
    
    const mockTransactions = [
      {
        id: 'tx_1',
        type: 'purchase',
        amount: 1000,
        description: 'Purchased 1000 coins',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        id: 'tx_2',
        type: 'tournament_entry',
        amount: -50,
        description: 'Tournament entry fee',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        id: 'tx_3',
        type: 'prize',
        amount: 200,
        description: 'Tournament prize',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: 'completed'
      }
    ];

    // Filter by type if specified
    let filteredTransactions = mockTransactions;
    if (type) {
      filteredTransactions = mockTransactions.filter(tx => tx.type === type);
    }

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        transactions: paginatedTransactions,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(filteredTransactions.length / parseInt(limit)),
          count: filteredTransactions.length,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/coins/exchange-rate
// @desc    Get current coin to USD exchange rate
// @access  Public
router.get('/exchange-rate', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        coinToUsd: COIN_TO_USD_RATE,
        usdToCoin: Math.round(1 / COIN_TO_USD_RATE),
        platformFee: PLATFORM_FEE_PERCENTAGE,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get exchange rate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
