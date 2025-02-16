import express from 'express';
import Watchlist from '../models/Watchlist.js';

const router = express.Router();

// 1. Get all watchlist items
router.get('/', async (req, res) => {
  try {
    const watchlist = await Watchlist.find().sort({ last_analysis: -1 });
    
    if (watchlist.length === 0) {
      return res.json([]);
    }

    // Format response with all fields
    const formattedWatchlist = watchlist.map(item => ({
      ticker: item.ticker,
      current_price: item.current_price,
      fundamental_score: item.fundamental_score,
      technical_scores: {
        short: item.technical_scores.short,
        medium: item.technical_scores.medium,
        long: item.technical_scores.long
      },
      news_score: item.news_score,
      best_timeframe: item.best_timeframe,
      buy_signal: item.buy_signal,
      analysis_status: item.analysis_status,
      notes: item.notes,
      last_analysis: item.last_analysis,
      added_date: item.added_date,
      last_updated: item.last_updated
    }));

    res.json(formattedWatchlist);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({
      error: 'Failed to fetch watchlist',
      details: error.message
    });
  }
});

// 2. Get single watchlist item
router.get('/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const item = await Watchlist.findOne({ ticker: ticker.toUpperCase() });
    
    if (!item) {
      return res.status(404).json({
        error: `Stock ${ticker} not found in watchlist`
      });
    }

    // Format response with all fields
    res.json({
      ticker: item.ticker,
      current_price: item.current_price,
      fundamental_score: item.fundamental_score,
      technical_scores: {
        short: item.technical_scores.short,
        medium: item.technical_scores.medium,
        long: item.technical_scores.long
      },
      news_score: item.news_score,
      best_timeframe: item.best_timeframe,
      buy_signal: item.buy_signal,
      analysis_status: item.analysis_status,
      notes: item.notes,
      last_analysis: item.last_analysis,
      added_date: item.added_date,
      last_updated: item.last_updated
    });
  } catch (error) {
    console.error('Error fetching watchlist item:', error);
    res.status(500).json({
      error: 'Failed to fetch watchlist item',
      details: error.message
    });
  }
});

// 3. Add stock to watchlist
router.post('/', async (req, res) => {
  try {
    const { ticker, fundamental_score } = req.body;

    if (!ticker || fundamental_score === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: ticker and fundamental_score are required'
      });
    }

    // Check if stock already exists
    const existingStock = await Watchlist.findOne({ ticker: ticker.toUpperCase() });
    if (existingStock) {
      return res.status(400).json({
        error: 'Stock already exists in watchlist'
      });
    }

    // Create new watchlist item
    const watchlistItem = new Watchlist({
      ticker: ticker.toUpperCase(),
      fundamental_score
    });

    await watchlistItem.save();

    res.status(201).json({
      message: 'Stock added to watchlist successfully',
      ticker: watchlistItem.ticker
    });

  } catch (error) {
    console.error('Error adding stock to watchlist:', error);
    res.status(500).json({
      error: 'Failed to add stock to watchlist',
      details: error.message
    });
  }
});

// 4. Update watchlist item
router.patch('/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const {
      fundamental_score,
      technical_scores,
      news_score,
      best_timeframe,
      buy_signal,
      last_analysis
    } = req.body;

    const stock = await Watchlist.findOne({ ticker: ticker.toUpperCase() });
    if (!stock) {
      return res.status(404).json({
        error: `Stock ${ticker} not found in watchlist`
      });
    }

    // Update fields if provided
    if (fundamental_score !== undefined) {
      stock.fundamental_score = fundamental_score;
      stock.analysis_status.fundamental = true;
    }
    
    if (technical_scores) {
      if (technical_scores.short !== undefined) {
        stock.technical_scores.short = technical_scores.short;
      }
      if (technical_scores.medium !== undefined) {
        stock.technical_scores.medium = technical_scores.medium;
      }
      if (technical_scores.long !== undefined) {
        stock.technical_scores.long = technical_scores.long;
      }
      stock.analysis_status.technical = true;
    }
    
    if (news_score !== undefined) {
      stock.news_score = news_score;
      stock.analysis_status.news = true;
    }
    
    if (best_timeframe !== undefined) {
      stock.best_timeframe = best_timeframe;
    }
    
    if (buy_signal !== undefined) {
      stock.buy_signal = buy_signal;
    }
    
    if (last_analysis) {
      stock.last_analysis = new Date(last_analysis);
    }

    await stock.save();

    res.json({
      message: 'Stock analysis updated successfully',
      ticker: stock.ticker
    });

  } catch (error) {
    console.error('Error updating stock analysis:', error);
    res.status(500).json({
      error: 'Failed to update stock analysis',
      details: error.message
    });
  }
});

// 5. Get stocks pending technical analysis
router.get('/pending/technical', async (req, res) => {
  try {
    const stocks = await Watchlist.find({
      'analysis_status.fundamental': true,
      'analysis_status.technical': false
    });

    // Return just the list of tickers
    const tickers = stocks.map(stock => stock.ticker);
    res.json(tickers);
  } catch (error) {
    console.error('Error fetching stocks pending technical analysis:', error);
    res.status(500).json({
      error: 'Failed to fetch pending stocks',
      details: error.message
    });
  }
});

export default router; 