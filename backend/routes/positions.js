import express from 'express';
import Position from '../models/Position.js';
import yahooFinance from 'yahoo-finance2';

const router = express.Router();

// Create new position
router.post('/', async (req, res) => {
  try {
    const {
      ticker,
      entry_price,
      timeframe,
      technical_scores,
      news_score,
      support_levels,
      resistance_levels,
      trend,
      signals
    } = req.body;

    // Validate required fields
    if (!ticker || !entry_price || !timeframe) {
      return res.status(400).json({
        error: 'Missing required fields: ticker, entry_price, and timeframe are required'
      });
    }

    // Calculate stop loss if not provided (using lowest support level)
    let stop_loss = null;
    if (support_levels && support_levels.length > 0) {
      stop_loss = Math.max(...support_levels.filter(level => level < entry_price));
    } else {
      // Default stop loss at 5% below entry price if no support levels
      stop_loss = entry_price * 0.95;
    }

    // Fetch current price from Yahoo Finance
    let current_price = entry_price; // Default to entry price
    try {
      const quote = await yahooFinance.quote(ticker.toUpperCase());
      if (quote && quote.regularMarketPrice) {
        current_price = quote.regularMarketPrice;
      }
    } catch (priceError) {
      console.error(`Could not fetch current price for ${ticker}:`, priceError);
    }

    // Create new position with all fields
    const newPosition = new Position({
      ticker: ticker.toUpperCase(),
      entry_price,
      current_price,
      timeframe,
      technical_scores: technical_scores || {
        short: null,
        medium: null,
        long: null
      },
      news_score: news_score || null,
      support_levels: support_levels || [],
      resistance_levels: resistance_levels || [],
      stop_loss,
      trend: trend || {
        direction: 'neutral',
        strength: 50,
        alignment_score: 50
      },
      signals: signals || {
        rsi: null,
        macd: {
          value: null,
          signal: 'hold'
        },
        volume_profile: null,
        predicted_move: null
      }
    });

    // Save position
    await newPosition.save();

    res.status(201).json({
      message: 'Position created successfully',
      ticker: newPosition.ticker,
      position: {
        ticker: newPosition.ticker,
        entry_price: newPosition.entry_price,
        current_price: newPosition.current_price,
        timeframe: newPosition.timeframe,
        technical_scores: newPosition.technical_scores,
        news_score: newPosition.news_score,
        support_levels: newPosition.support_levels,
        resistance_levels: newPosition.resistance_levels,
        stop_loss: newPosition.stop_loss,
        trend: newPosition.trend,
        signals: newPosition.signals,
        status: newPosition.status,
        pnl: newPosition.pnl
      }
    });

  } catch (error) {
    console.error('Error creating position:', error);
    res.status(500).json({
      error: 'Failed to create position',
      details: error.message
    });
  }
});

// Add a new endpoint to update current prices
router.post('/update-prices', async (req, res) => {
  try {
    // Get all open positions
    const positions = await Position.find({ status: 'open' });
    
    // Update each position's current price
    const updates = await Promise.all(positions.map(async (position) => {
      try {
        const quote = await yahooFinance.quote(position.ticker);
        if (quote && quote.regularMarketPrice) {
          position.current_price = quote.regularMarketPrice;
          await position.save(); // This will trigger PNL calculation
          return {
            ticker: position.ticker,
            success: true,
            current_price: quote.regularMarketPrice
          };
        }
      } catch (error) {
        return {
          ticker: position.ticker,
          success: false,
          error: error.message
        };
      }
    }));

    res.json({
      message: 'Prices updated',
      updates
    });

  } catch (error) {
    console.error('Error updating prices:', error);
    res.status(500).json({
      error: 'Failed to update prices',
      details: error.message
    });
  }
});

// Update position status
router.patch('/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { status } = req.body;

    if (status !== 'closed') {
      return res.status(400).json({
        error: 'Invalid status value. Only "closed" is allowed.'
      });
    }

    const position = await Position.findOne({
      ticker: ticker.toUpperCase(),
      status: 'open'
    });

    if (!position) {
      return res.status(404).json({
        error: `No open position found for ticker ${ticker}`
      });
    }

    position.status = 'closed';
    await position.save();

    res.json({
      message: 'Position closed successfully',
      ticker: position.ticker
    });

  } catch (error) {
    console.error('Error closing position:', error);
    res.status(500).json({
      error: 'Failed to close position',
      details: error.message
    });
  }
});

export default router;