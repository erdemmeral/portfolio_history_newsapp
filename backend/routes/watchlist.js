import express from 'express';
import Watchlist from '../models/Watchlist.js';
import yahooFinance from 'yahoo-finance2';

const router = express.Router();

// Add stock to watchlist (from fundamental analysis)
router.post('/', async (req, res) => {
  try {
    const { ticker, fundamental_score } = req.body;

    if (!ticker || !fundamental_score) {
      return res.status(400).json({
        error: 'Missing required fields: ticker and fundamental_score are required'
      });
    }

    // Check if stock already exists in watchlist
    const existingStock = await Watchlist.findOne({ ticker: ticker.toUpperCase() });
    if (existingStock) {
      return res.status(400).json({
        error: 'Stock already exists in watchlist'
      });
    }

    // Get current price from Yahoo Finance
    let currentPrice = null;
    try {
      const quote = await yahooFinance.quote(ticker.toUpperCase());
      currentPrice = quote.regularMarketPrice;
    } catch (priceError) {
      console.error(`Could not fetch current price for ${ticker}:`, priceError);
    }

    // Create new watchlist item
    const watchlistItem = new Watchlist({
      ticker: ticker.toUpperCase(),
      current_price: currentPrice,
      fundamental_score
    });

    await watchlistItem.save();

    res.status(201).json({
      message: 'Stock added to watchlist successfully',
      stock: watchlistItem
    });

  } catch (error) {
    console.error('Error adding stock to watchlist:', error);
    res.status(500).json({
      error: 'Failed to add stock to watchlist',
      details: error.message
    });
  }
});

// Get all watchlist items
router.get('/', async (req, res) => {
  try {
    const watchlist = await Watchlist.find().sort({ added_date: -1 });
    
    if (watchlist.length === 0) {
      return res.status(404).json({
        error: 'No stocks found in watchlist'
      });
    }

    res.json(watchlist);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({
      error: 'Failed to fetch watchlist',
      details: error.message
    });
  }
});

// Update stock analysis (technical or news)
router.patch('/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const updates = req.body;

    const stock = await Watchlist.findOne({ ticker: ticker.toUpperCase() });
    if (!stock) {
      return res.status(404).json({
        error: `Stock ${ticker} not found in watchlist`
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'technical_score',
      'news_score',
      'notes',
      'current_price'
    ];

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        stock[field] = updates[field];
      }
    });

    // Update analysis status
    if (updates.technical_score !== undefined) {
      stock.analysis_status.technical = true;
    }
    if (updates.news_score !== undefined) {
      stock.analysis_status.news = true;
    }

    await stock.save();

    res.json({
      message: 'Stock analysis updated successfully',
      stock
    });

  } catch (error) {
    console.error('Error updating stock analysis:', error);
    res.status(500).json({
      error: 'Failed to update stock analysis',
      details: error.message
    });
  }
});

// Remove stock from watchlist
router.delete('/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    
    const result = await Watchlist.findOneAndDelete({ ticker: ticker.toUpperCase() });
    if (!result) {
      return res.status(404).json({
        error: `Stock ${ticker} not found in watchlist`
      });
    }

    res.json({
      message: 'Stock removed from watchlist successfully',
      stock: result
    });

  } catch (error) {
    console.error('Error removing stock from watchlist:', error);
    res.status(500).json({
      error: 'Failed to remove stock from watchlist',
      details: error.message
    });
  }
});

// Get stocks ready for technical analysis (have fundamental but no technical)
router.get('/pending/technical', async (req, res) => {
  try {
    const stocks = await Watchlist.find({
      'analysis_status.fundamental': true,
      'analysis_status.technical': false
    });

    if (stocks.length === 0) {
      return res.status(404).json({
        error: 'No stocks pending technical analysis'
      });
    }

    res.json(stocks);
  } catch (error) {
    console.error('Error fetching stocks pending technical analysis:', error);
    res.status(500).json({
      error: 'Failed to fetch pending stocks',
      details: error.message
    });
  }
});

// Get stocks ready for news analysis (have technical but no news)
router.get('/pending/news', async (req, res) => {
  try {
    const stocks = await Watchlist.find({
      'analysis_status.technical': true,
      'analysis_status.news': false
    });

    if (stocks.length === 0) {
      return res.status(404).json({
        error: 'No stocks pending news analysis'
      });
    }

    res.json(stocks);
  } catch (error) {
    console.error('Error fetching stocks pending news analysis:', error);
    res.status(500).json({
      error: 'Failed to fetch pending stocks',
      details: error.message
    });
  }
});

export default router; 