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
      stop_loss,
      trend
    } = req.body;

    // Validate required fields
    if (!ticker || !entry_price || !timeframe || !stop_loss) {
      return res.status(400).json({
        error: 'Missing required fields: ticker, entry_price, timeframe, and stop_loss are required'
      });
    }

    // Create new position
    const newPosition = new Position({
      ticker: ticker.toUpperCase(),
      entry_price,
      timeframe,
      technical_scores,
      news_score,
      support_levels,
      resistance_levels,
      stop_loss,
      trend
    });

    // Fetch current price from Yahoo Finance
    try {
      const quote = await yahooFinance.quote(newPosition.ticker);
      newPosition.current_price = quote.regularMarketPrice;
    } catch (priceError) {
      console.error(`Could not fetch current price for ${newPosition.ticker}:`, priceError);
    }

    // Save position
    await newPosition.save();

    res.status(201).json({
      message: 'Position created successfully',
      ticker: newPosition.ticker
    });

  } catch (error) {
    console.error('Error creating position:', error);
    res.status(500).json({
      error: 'Failed to create position',
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