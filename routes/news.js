const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const router = express.Router();

// News sources configuration
const NEWS_SOURCES = {
  ESPORTS_NEWS: {
    name: 'Esports News',
    url: 'https://newsapi.org/v2/everything',
    params: {
      q: 'esports OR "League of Legends" OR "Valorant" OR "CS2" OR "Counter Strike" OR "Fortnite" OR "Overwatch" OR "Dota 2"',
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: 20
    }
  },
  RIOT_GAMES: {
    name: 'Riot Games News',
    url: 'https://newsapi.org/v2/everything',
    params: {
      q: '"Riot Games" OR "League of Legends esports" OR "Valorant esports" OR "LCS" OR "LEC" OR "Worlds"',
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: 15
    }
  },
  GENERAL_GAMING: {
    name: 'Gaming News',
    url: 'https://newsapi.org/v2/everything',
    params: {
      q: 'gaming tournament OR esports championship OR gaming competition',
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: 10
    }
  }
};

// Cache for news articles
let newsCache = {
  data: null,
  lastUpdated: null,
  expiry: 30 * 60 * 1000 // 30 minutes
};

// Helper function to fetch news from external APIs
async function fetchNewsFromSource(source, apiKey) {
  try {
    const response = await axios.get(source.url, {
      params: {
        ...source.params,
        apiKey: apiKey
      },
      timeout: 10000
    });
    
    return response.data.articles || [];
  } catch (error) {
    console.error(`Error fetching from ${source.name}:`, error.message);
    return [];
  }
}

// Helper function to format news article
function formatNewsArticle(article, source) {
  return {
    id: Buffer.from(article.url).toString('base64'),
    title: article.title,
    description: article.description,
    content: article.content,
    url: article.url,
    urlToImage: article.urlToImage,
    publishedAt: article.publishedAt,
    source: {
      name: article.source?.name || source,
      url: article.url
    },
    author: article.author,
    category: determineCategory(article.title + ' ' + article.description)
  };
}

// Helper function to determine article category
function determineCategory(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('league of legends') || lowerText.includes('lol')) return 'League of Legends';
  if (lowerText.includes('valorant')) return 'Valorant';
  if (lowerText.includes('cs2') || lowerText.includes('counter-strike')) return 'CS2';
  if (lowerText.includes('fortnite')) return 'Fortnite';
  if (lowerText.includes('overwatch')) return 'Overwatch 2';
  if (lowerText.includes('dota')) return 'Dota 2';
  if (lowerText.includes('tournament') || lowerText.includes('championship')) return 'Tournaments';
  if (lowerText.includes('esports') || lowerText.includes('e-sports')) return 'Esports';
  
  return 'Gaming';
}

// @route   GET /api/news
// @desc    Get esports news
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      category,
      game,
      limit = 20,
      page = 1,
      fresh = false
    } = req.query;

    // Check cache if not requesting fresh data
    const now = Date.now();
    if (!fresh && newsCache.data && newsCache.lastUpdated && 
        (now - newsCache.lastUpdated) < newsCache.expiry) {
      
      let articles = newsCache.data;
      
      // Apply filters
      if (category && category !== 'all') {
        articles = articles.filter(article => 
          article.category.toLowerCase() === category.toLowerCase()
        );
      }
      
      if (game && game !== 'all') {
        articles = articles.filter(article => 
          article.category.toLowerCase() === game.toLowerCase() ||
          article.title.toLowerCase().includes(game.toLowerCase()) ||
          article.description?.toLowerCase().includes(game.toLowerCase())
        );
      }

      // Pagination
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      const paginatedArticles = articles.slice(startIndex, endIndex);

      return res.json({
        success: true,
        data: {
          articles: paginatedArticles,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(articles.length / parseInt(limit)),
            count: articles.length,
            limit: parseInt(limit)
          },
          cached: true,
          lastUpdated: new Date(newsCache.lastUpdated).toISOString()
        }
      });
    }

    // Fetch fresh news data
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'News API key not configured'
      });
    }

    // Fetch from multiple sources
    const newsPromises = Object.entries(NEWS_SOURCES).map(([key, source]) => 
      fetchNewsFromSource(source, apiKey)
    );

    const newsResults = await Promise.allSettled(newsPromises);
    
    // Combine and format articles
    let allArticles = [];
    newsResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const sourceName = Object.keys(NEWS_SOURCES)[index];
        const formattedArticles = result.value.map(article => 
          formatNewsArticle(article, sourceName)
        );
        allArticles = allArticles.concat(formattedArticles);
      }
    });

    // Remove duplicates based on URL
    const uniqueArticles = allArticles.filter((article, index, self) => 
      index === self.findIndex(a => a.url === article.url)
    );

    // Sort by published date
    uniqueArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Update cache
    newsCache = {
      data: uniqueArticles,
      lastUpdated: now,
      expiry: 30 * 60 * 1000
    };

    // Apply filters
    let filteredArticles = uniqueArticles;
    
    if (category && category !== 'all') {
      filteredArticles = filteredArticles.filter(article => 
        article.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    if (game && game !== 'all') {
      filteredArticles = filteredArticles.filter(article => 
        article.category.toLowerCase() === game.toLowerCase() ||
        article.title.toLowerCase().includes(game.toLowerCase()) ||
        article.description?.toLowerCase().includes(game.toLowerCase())
      );
    }

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedArticles = filteredArticles.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        articles: paginatedArticles,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(filteredArticles.length / parseInt(limit)),
          count: filteredArticles.length,
          limit: parseInt(limit)
        },
        cached: false,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news'
    });
  }
});

// @route   GET /api/news/categories
// @desc    Get available news categories
// @access  Public
router.get('/categories', (req, res) => {
  try {
    const categories = [
      'All',
      'Esports',
      'League of Legends',
      'Valorant', 
      'CS2',
      'Fortnite',
      'Overwatch 2',
      'Dota 2',
      'Tournaments',
      'Gaming'
    ];

    res.json({
      success: true,
      data: { categories }
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/news/:id
// @desc    Get specific news article
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const articleId = req.params.id;
    
    // Check cache first
    if (newsCache.data) {
      const article = newsCache.data.find(a => a.id === articleId);
      if (article) {
        return res.json({
          success: true,
          data: { article }
        });
      }
    }

    // If not in cache, try to decode the URL and fetch
    try {
      const articleUrl = Buffer.from(articleId, 'base64').toString();
      
      // Find article by URL in cache
      if (newsCache.data) {
        const article = newsCache.data.find(a => a.url === articleUrl);
        if (article) {
          return res.json({
            success: true,
            data: { article }
          });
        }
      }
    } catch (decodeError) {
      // Invalid base64 ID
    }

    res.status(404).json({
      success: false,
      message: 'Article not found'
    });

  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/news/refresh
// @desc    Force refresh news cache
// @access  Private (Admin only)
router.post('/refresh', auth, async (req, res) => {
  try {
    // Clear cache to force refresh
    newsCache = {
      data: null,
      lastUpdated: null,
      expiry: 30 * 60 * 1000
    };

    // Fetch fresh data by calling the main endpoint
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'News API key not configured'
      });
    }

    const newsPromises = Object.entries(NEWS_SOURCES).map(([key, source]) => 
      fetchNewsFromSource(source, apiKey)
    );

    const newsResults = await Promise.allSettled(newsPromises);
    
    let allArticles = [];
    newsResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const sourceName = Object.keys(NEWS_SOURCES)[index];
        const formattedArticles = result.value.map(article => 
          formatNewsArticle(article, sourceName)
        );
        allArticles = allArticles.concat(formattedArticles);
      }
    });

    const uniqueArticles = allArticles.filter((article, index, self) => 
      index === self.findIndex(a => a.url === article.url)
    );

    uniqueArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Update cache
    newsCache = {
      data: uniqueArticles,
      lastUpdated: Date.now(),
      expiry: 30 * 60 * 1000
    };

    res.json({
      success: true,
      message: 'News cache refreshed successfully',
      data: {
        articlesCount: uniqueArticles.length,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Refresh news error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh news'
    });
  }
});

// @route   GET /api/news/trending/topics
// @desc    Get trending topics from news
// @access  Public
router.get('/trending/topics', (req, res) => {
  try {
    if (!newsCache.data) {
      return res.json({
        success: true,
        data: { topics: [] }
      });
    }

    // Extract trending topics from news titles and descriptions
    const topicCounts = {};
    const keywords = [
      'tournament', 'championship', 'worlds', 'playoffs', 'finals',
      'league of legends', 'valorant', 'cs2', 'fortnite', 'overwatch',
      'esports', 'gaming', 'competition', 'team', 'player'
    ];

    newsCache.data.forEach(article => {
      const text = (article.title + ' ' + article.description).toLowerCase();
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          topicCounts[keyword] = (topicCounts[keyword] || 0) + 1;
        }
      });
    });

    // Sort topics by frequency
    const trendingTopics = Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([topic, count]) => ({
        topic: topic.charAt(0).toUpperCase() + topic.slice(1),
        count,
        articles: newsCache.data.filter(article => 
          (article.title + ' ' + article.description).toLowerCase().includes(topic)
        ).length
      }));

    res.json({
      success: true,
      data: { topics: trendingTopics }
    });

  } catch (error) {
    console.error('Get trending topics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
