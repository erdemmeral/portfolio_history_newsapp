import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import yahooFinance from 'yahoo-finance2';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalents for __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Position Schema
const positionSchema = new mongoose.Schema({
  ticker: { 
    type: String, 
    required: true 
  },
  entry_price: { 
    type: Number, 
    required: true 
  },
  current_price: { 
    type: Number, 
    default: null 
  },
  entry_date: { 
    type: Date, 
    default: Date.now 
  },
  
  // Scores
  fundamental_score: { 
    type: Number, 
    default: null 
  },
  technical_score: { 
    type: Number, 
    default: null 
  },
  news_score: { 
    type: Number, 
    default: null 
  },
  overall_score: { 
    type: Number, 
    default: null 
  },
  
  // Technical Analysis Data
  support_levels: [Number],
  resistance_levels: [Number],
  stop_loss: { 
    type: Number, 
    default: null 
  },
  take_profit: { 
    type: Number, 
    default: null 
  },
  trend: {
    direction: { 
      type: String, 
      enum: ['bullish', 'bearish', 'neutral'],
      default: 'neutral'
    },
    strength: { 
      type: Number, 
      min: 0, 
      max: 100,
      default: 50 
    },
    ma_alignment: { 
      type: Boolean, 
      default: false 
    }
  },
  
  // Position Status
  pnl: { 
    type: Number, 
    default: 0 
  },
  timeframe: { 
    type: String, 
    enum: ['medium', 'long'],
    required: true 
  },
  status: { 
    type: String, 
    enum: ['open', 'closed'],
    default: 'open' 
  },
  last_updated: { 
    type: Date, 
    default: Date.now 
  },
  
  // Latest Technical Signals
  signals: {
    rsi: { 
      type: Number, 
      default: null 
    },
    macd: {
      value: { 
        type: Number, 
        default: null 
      },
      signal: { 
        type: String, 
        enum: ['buy', 'sell', 'hold'],
        default: 'hold' 
      }
    },
    volume_profile: { 
      type: String, 
      enum: ['increasing', 'decreasing'],
      default: null 
    },
    predicted_move: { 
      type: Number, 
      default: null 
    }
  }
});

// Pre-save middleware to calculate PNL and update last_updated
positionSchema.pre('save', function(next) {
  // Update PNL if we have both entry and current price
  if (this.entry_price && this.current_price) {
    this.pnl = ((this.current_price - this.entry_price) / this.entry_price) * 100;
  }
  
  // Update last_updated timestamp
  this.last_updated = new Date();
  
  next();
});

// Position Model
const Position = mongoose.model('Position', positionSchema);

// Prediction Schema
const predictionSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  targetDate: { type: Date, required: true },
  predictions: {
    svm: {
      price: { type: Number, required: true },
      change: { type: Number, required: true }
    },
    rf: {
      price: { type: Number, required: true },
      change: { type: Number, required: true }
    },
    xgb: {
      price: { type: Number, required: true },
      change: { type: Number, required: true }
    },
    lgb: {
      price: { type: Number, required: true },
      change: { type: Number, required: true }
    },
    lstm: {
      price: { type: Number, required: true },
      change: { type: Number, required: true }
    },
    ensemble: {
      price: { type: Number, required: true },
      change: { type: Number, required: true }
    }
  }
});

// Prediction Model
const Prediction = mongoose.model('Prediction', predictionSchema);

// Cache for S&P 500 data
let sp500Cache = {
  lastUpdate: null,
  data: null
};

// Function to update S&P 500 data
async function updateSP500Data() {
  try {
    console.log('Updating S&P 500 data...');
    const end = new Date();
    const start = new Date();
    start.setMonth(end.getMonth() - 1); // Get 1 month of data

    const sp500Data = await yahooFinance.historical('^GSPC', {
      period1: start,
      period2: end,
      interval: '1d'
    });

    if (!sp500Data || sp500Data.length === 0) {
      throw new Error('No S&P 500 data received');
    }

    // Sort and process data
    sp500Data.sort((a, b) => new Date(a.date) - new Date(b.date));
    const initialValue = sp500Data[0].close;
    
    const processedData = sp500Data.map(point => ({
      date: new Date(point.date),
      value: point.close / initialValue
    }));

    // Update cache
    sp500Cache = {
      lastUpdate: new Date(),
      data: processedData
    };

    console.log('S&P 500 data updated successfully');
  } catch (error) {
    console.error('Error updating S&P 500 data:', error);
  }
}

// Update S&P 500 data every 5 minutes during market hours
setInterval(async () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  // Only update during market hours (9:30 AM - 4:00 PM ET)
  if (hours >= 9 && hours <= 16) {
    if (hours === 9 && minutes < 30) return; // Wait until market opens
    if (hours === 16 && minutes > 0) return; // Market is closed
    await updateSP500Data();
  }
}, 5 * 60 * 1000); // 5 minutes

// Initial update when server starts
updateSP500Data();

// MongoDB Connection Function
async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MongoDB URI is not defined');
    throw new Error('MongoDB URI is missing');
  }

  try {
    console.log('🔍 Attempting MongoDB Connection');
    
    // Parse connection string to extract database name
    const parsedUri = new URL(uri);
    const databaseName = 'portfoliodb';
    
    console.log('Connection Details:', {
      uri: uri.substring(0, 50) + '...',
      database: databaseName
    });

    // Connect with explicit database
    await mongoose.connect(uri, {
      dbName: databaseName,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB Connected Successfully');

    // Verify database contents
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('Database Collections:', collections.map(c => c.name));

    return mongoose.connection;

  } catch (error) {
    console.error('❌ MongoDB Connection Error:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
}

// Import watchlist routes
import watchlistRoutes from './routes/watchlist.js';

// Startup Connection and Server
async function startServer() {
  try {
    // Connect to database first
    await connectDatabase();
    
    // Create Express app
    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json());

    // Routes
    app.use('/api/watchlist', watchlistRoutes);

    // Database Details Route
    app.get('/api/db-details', async (req, res) => {
      try {
        const connection = mongoose.connection;
        const db = connection.db;
        
        // List collections
        const collections = await db.listCollections().toArray();
        
        // Count documents in each collection
        const collectionDetails = await Promise.all(
          collections.map(async (collection) => {
            const count = await db.collection(collection.name).countDocuments();
            return {
              name: collection.name,
              documentCount: count
            };
          })
        );

        res.json({
          databaseName: connection.db.databaseName,
          collections: collectionDetails
        });
      } catch (error) {
        console.error('Database Details Error:', error);
        res.status(500).json({ 
          error: 'Failed to retrieve database details',
          details: error.message 
        });
      }
    });

    // Add Position
    app.post('/api/positions', async (req, res) => {
      try {
        const {
          ticker,
          entry_price,
          timeframe,
          technical_score,
          fundamental_score,
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

        // Create new position
        const newPosition = new Position({
          ticker: ticker.toUpperCase(),
          entry_price,
          timeframe,
          technical_score,
          fundamental_score,
          news_score,
          support_levels,
          resistance_levels,
          trend,
          signals
        });

        // Calculate overall score if component scores are provided
        if (technical_score && fundamental_score && news_score) {
          newPosition.overall_score = (technical_score + fundamental_score + news_score) / 3;
        }

        // Set stop loss and take profit based on support/resistance if available
        if (support_levels?.length > 0) {
          newPosition.stop_loss = Math.max(...support_levels.filter(level => level < entry_price));
        }
        if (resistance_levels?.length > 0) {
          newPosition.take_profit = Math.min(...resistance_levels.filter(level => level > entry_price));
        }

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
          message: 'Position added successfully',
          position: newPosition
        });

      } catch (error) {
        console.error('Error adding position:', error);
        res.status(500).json({
          error: 'Failed to add position',
          details: error.message
        });
      }
    });

    // Update Position Price
    // Update Position Price Route
    app.patch('/api/positions/:ticker', async (req, res) => {
      try {
        const { ticker } = req.params;
        const updates = req.body;

        // Find the position
        const position = await Position.findOne({
          ticker: ticker.toUpperCase(),
          status: 'open'
        });

        if (!position) {
          return res.status(404).json({
            error: `No open position found for ticker ${ticker}`
          });
        }

        // Update allowed fields
        const allowedUpdates = [
          'current_price',
          'technical_score',
          'fundamental_score',
          'news_score',
          'support_levels',
          'resistance_levels',
          'trend',
          'signals'
        ];

        allowedUpdates.forEach(field => {
          if (updates[field] !== undefined) {
            position[field] = updates[field];
          }
        });

        // Recalculate overall score if component scores are updated
        if (updates.technical_score || updates.fundamental_score || updates.news_score) {
          position.overall_score = (
            position.technical_score +
            position.fundamental_score +
            position.news_score
          ) / 3;
        }

        // Update stop loss and take profit if levels are updated
        if (updates.support_levels) {
          position.stop_loss = Math.max(
            ...updates.support_levels.filter(level => level < position.entry_price)
          );
        }
        if (updates.resistance_levels) {
          position.take_profit = Math.min(
            ...updates.resistance_levels.filter(level => level > position.entry_price)
          );
        }

        await position.save();

        res.json({
          message: 'Position updated successfully',
          position
        });

      } catch (error) {
        console.error('Error updating position:', error);
        res.status(500).json({
          error: 'Failed to update position',
          details: error.message
        });
      }
    });
    // Get Portfolio
    app.get('/api/portfolio', async (req, res) => {
      try {
        console.log('Portfolio Retrieval Attempt');
        
        // Verify MongoDB Connection
        if (mongoose.connection.readyState !== 1) {
          console.error('MongoDB Connection Not Ready');
          return res.status(500).json({ 
            error: 'Database Connection Failed',
            connectionState: mongoose.connection.readyState 
          });
        }

        // Retrieve All Positions (both open and closed)
        const positions = await Position.find().sort({ entry_date: -1 });
        
        console.log('Retrieved Positions:', {
          count: positions.length,
          firstPosition: positions[0]
        });

        // Check if positions exist
        if (positions.length === 0) {
          return res.status(404).json({ 
            error: 'No positions found',
            message: 'Portfolio is empty' 
          });
        }

        // Calculate cumulative results
        const totalInvestment = positions.reduce((sum, pos) => sum + pos.entry_price, 0);
        const currentValue = positions.reduce((sum, pos) => sum + (pos.current_price || pos.entry_price), 0);
        const totalProfitLoss = positions.reduce((sum, pos) => sum + (pos.pnl || 0), 0);
        
        const openPositions = positions.filter(pos => pos.status === 'open');
        const closedPositions = positions.filter(pos => pos.status === 'closed');
        
        const cumulativeResults = {
          totalPositions: positions.length,
          openPositions: openPositions.length,
          closedPositions: closedPositions.length,
          totalInvestment,
          currentValue,
          totalProfitLoss,
          totalPercentageChange: ((currentValue - totalInvestment) / totalInvestment) * 100
        };

        res.json({
          positions, // Individual transactions
          cumulativeResults // Summary of all transactions
        });
      } catch (error) {
        console.error('Detailed Portfolio Retrieval Error:', {
          message: error.message,
          stack: error.stack
        });

        res.status(500).json({ 
          error: 'Failed to retrieve portfolio',
          details: error.message 
        });
      }
    });

    // Handle Sell Signal
    app.post('/api/positions/:symbol/sell', async (req, res) => {
      try {
        const { symbol } = req.params;
        const { soldPrice, soldDate, sellCondition } = req.body;

        if (!soldPrice) {
          return res.status(400).json({
            error: 'Sold price is required'
          });
        }

        // Find the most recent OPEN position for this symbol
        const position = await Position.findOne({ 
          ticker: symbol.toUpperCase(),
          status: 'open'
        }).sort({ entry_date: -1 });

        if (!position) {
          return res.status(404).json({
            error: `No open position found for symbol ${symbol}`
          });
        }

        // Update position with sold price and status
        position.current_price = parseFloat(soldPrice);
        position.status = 'closed';
        position.last_updated = new Date();

        // Save will trigger pre-save middleware to recalculate pnl
        await position.save();

        res.json({
          message: 'Position closed successfully',
          position
        });

      } catch (error) {
        console.error('Error handling sell signal:', error);
        res.status(500).json({
          error: 'Failed to process sell signal',
          details: error.message
        });
      }
    });

    // Performance Calculation
    app.get('/api/performance', async (req, res) => {
      try {
        // Get all closed positions
        const closedPositions = await Position.find({ status: 'closed' })
          .sort({ last_updated: -1 });

        // Calculate performance metrics
        const totalTrades = closedPositions.length;
        
        // Calculate returns and identify winning trades
        const returns = closedPositions.map(p => ({
          percentageChange: p.pnl,
          isWin: p.pnl > 0
        }));

        // Calculate win rate
        const winningTrades = returns.filter(r => r.isWin).length;
        const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;

        // Calculate average return
        const averagePercentageReturn = returns.length > 0 
          ? returns.reduce((sum, r) => sum + r.percentageChange, 0) / returns.length
          : 0;

        // Find best and worst trades
        let bestPercentageReturn = 0;
        let worstPercentageReturn = 0;

        if (returns.length === 1) {
          // If there's only one trade, set it as the best trade if positive,
          // or worst trade if negative
          const onlyReturn = returns[0].percentageChange;
          if (onlyReturn >= 0) {
            bestPercentageReturn = onlyReturn;
            worstPercentageReturn = 0;
          } else {
            bestPercentageReturn = 0;
            worstPercentageReturn = onlyReturn;
          }
        } else if (returns.length > 1) {
          // If there are multiple trades, find the actual best and worst
          bestPercentageReturn = Math.max(...returns.map(r => r.percentageChange));
          worstPercentageReturn = Math.min(...returns.map(r => r.percentageChange));
        }

        // Format closed positions data
        const formattedPositions = closedPositions.map(p => ({
          ticker: p.ticker,
          entry_price: p.entry_price,
          current_price: p.current_price,
          pnl: p.pnl,
          entry_date: p.entry_date,
          last_updated: p.last_updated
        }));

        res.json({
          totalTrades,
          winRate,
          averagePercentageReturn,
          bestPercentageReturn,
          worstPercentageReturn,
          closedPositions: formattedPositions
        });

      } catch (error) {
        console.error('Error calculating performance:', error);
        res.status(500).json({ error: 'Failed to calculate performance' });
      }
    });

    // Get Performance Time Series
    app.get('/api/performance/timeseries', async (req, res) => {
      try {
        const { startDate, endDate } = req.query;
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Get closed positions within the date range
        const closedPositions = await Position.find({
          status: 'closed',
          entry_date: { $gte: start, $lte: end }
        }).sort({ entry_date: 1 });

        if (closedPositions.length === 0) {
          return res.json({ data: [] });
        }

        // Generate daily data points
        const dailyData = [];
        let currentDate = new Date(start);
        
        while (currentDate <= end) {
          const dateStr = currentDate.toISOString().split('T')[0];
          
          // Calculate cumulative return up to this date
          const relevantPositions = closedPositions.filter(p => 
            new Date(p.entry_date).toISOString().split('T')[0] <= dateStr
          );

          if (relevantPositions.length > 0) {
            const totalReturn = relevantPositions.reduce((sum, pos) => sum + pos.pnl, 0);
            const averageReturn = totalReturn / relevantPositions.length;
            
            dailyData.push({
              date: new Date(currentDate),
              value: 1 + (averageReturn / 100)  // Convert percentage to decimal and add to base value
            });
          } else {
            dailyData.push({
              date: new Date(currentDate),
              value: 1  // Base value when no positions
            });
          }

          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
        }

        res.json({ data: dailyData });
      } catch (error) {
        console.error('Error calculating time series:', error);
        res.status(500).json({ error: 'Failed to calculate time series data' });
      }
    });

    // Receive Predictions from External Service
    app.post('/api/predictions/receive', async (req, res) => {
      try {
        const {
          symbol,
          targetDate,
          predictions: {
            svm,
            rf,
            xgb,
            lgb,
            lstm,
            ensemble
          }
        } = req.body;

        // Validate required fields
        if (!symbol || !targetDate || !svm || !rf || !xgb || !lgb || !lstm || !ensemble) {
          return res.status(400).json({
            error: 'Missing required prediction data'
          });
        }

        // Log received predictions
        console.log('Received predictions for', symbol, {
          targetDate,
          svm,
          rf,
          xgb,
          lgb,
          lstm,
          ensemble
        });

        // Store predictions in MongoDB
        const prediction = new Prediction({
          symbol,
          targetDate,
          predictions: {
            svm,
            rf,
            xgb,
            lgb,
            lstm,
            ensemble
          }
        });

        await prediction.save();

        res.status(201).json({
          message: 'Predictions received and stored successfully',
          prediction
        });

      } catch (error) {
        console.error('Error storing predictions:', error);
        res.status(500).json({
          error: 'Failed to store predictions',
          details: error.message
        });
      }
    });

    // Get Latest Prediction for Symbol
    app.get('/api/predictions/:symbol', async (req, res) => {
      try {
        const { symbol } = req.params;
        
        const prediction = await Prediction.findOne({ symbol })
          .sort({ timestamp: -1 });

        if (!prediction) {
          return res.status(404).json({
            error: 'No predictions found for this symbol'
          });
        }

        res.json(prediction);

      } catch (error) {
        console.error('Error fetching prediction:', error);
        res.status(500).json({
          error: 'Failed to fetch prediction',
          details: error.message
        });
      }
    });

    // Test Prediction Storage
    app.post('/api/predictions/test', async (req, res) => {
      try {
        // Create test prediction
        const testPrediction = new Prediction({
          symbol: 'TEST',
          predictions: {
            svm: { price: 100.00, change: -5.00 },
            rf: { price: 110.00, change: 5.00 },
            xgb: { price: 105.00, change: 0.00 },
            lgb: { price: 107.00, change: 2.00 },
            lstm: { price: 103.00, change: -2.00 },
            ensemble: { price: 105.00, change: 0.00 }
          }
        });

        // Save to database
        await testPrediction.save();

        // Verify storage by retrieving it
        const savedPrediction = await Prediction.findOne({ symbol: 'TEST' })
          .sort({ timestamp: -1 });

        res.json({
          message: 'Test prediction stored and retrieved successfully',
          stored: testPrediction,
          retrieved: savedPrediction
        });

      } catch (error) {
        console.error('Test prediction error:', error);
        res.status(500).json({
          error: 'Test prediction failed',
          details: error.message
        });
      }
    });

    // Get Historical Predictions
    app.get('/api/predictions/history', async (req, res) => {
      try {
        const { startDate } = req.query;
        let query = {};

        // If startDate is provided, filter predictions after that date
        if (startDate) {
          query.timestamp = { $gte: new Date(startDate) };
        }

        // Get predictions sorted by timestamp
        const predictions = await Prediction.find(query)
          .sort({ timestamp: -1 });

        // Format the response
        const formattedPredictions = predictions.map(prediction => ({
          symbol: prediction.symbol,
          timestamp: prediction.timestamp,
          targetDate: prediction.targetDate,
          predictions: {
            svm: {
              price: prediction.predictions.svm.price,
              change: prediction.predictions.svm.change
            },
            rf: {
              price: prediction.predictions.rf.price,
              change: prediction.predictions.rf.change
            },
            xgb: {
              price: prediction.predictions.xgb.price,
              change: prediction.predictions.xgb.change
            },
            lgb: {
              price: prediction.predictions.lgb.price,
              change: prediction.predictions.lgb.change
            },
            lstm: {
              price: prediction.predictions.lstm.price,
              change: prediction.predictions.lstm.change
            },
            ensemble: {
              price: prediction.predictions.ensemble.price,
              change: prediction.predictions.ensemble.change
            }
          }
        }));

        res.json({
          count: formattedPredictions.length,
          predictions: formattedPredictions
        });

      } catch (error) {
        console.error('Error fetching prediction history:', error);
        res.status(500).json({
          error: 'Failed to fetch prediction history',
          details: error.message
        });
      }
    });

    // Test Sell Position
    app.post('/api/test/sell', async (req, res) => {
      try {
        // Create a test position first
        const testPosition = new Position({
          ticker: 'TEST',
          entry_price: 100.00,
          current_price: 100.00,
          entry_date: new Date(),
          status: 'open'
        });

        await testPosition.save();
        console.log('Test position created:', testPosition);

        // Now try to sell it
        testPosition.current_price = 110.00; // Simulate a price increase
        testPosition.status = 'closed';
        await testPosition.save();

        // Get the updated position
        const updatedPosition = await Position.findById(testPosition._id);

        res.json({
          message: 'Test sell completed',
          originalPosition: testPosition,
          updatedPosition: updatedPosition,
          pnl: updatedPosition.pnl,
          percentageChange: updatedPosition.pnl
        });

      } catch (error) {
        console.error('Test sell error:', error);
        res.status(500).json({
          error: 'Test sell failed',
          details: error.message
        });
      }
    });

    // Get Position by Symbol
    app.get('/api/positions/:symbol', async (req, res) => {
      try {
        const { symbol } = req.params;

        // Find the most recent position for this symbol
        const position = await Position.findOne({ 
          ticker: symbol.toUpperCase() 
        }).sort({ entry_date: -1 });

        if (!position) {
          return res.status(404).json({
            error: `No position found for symbol ${symbol}`
          });
        }

        res.json(position);

      } catch (error) {
        console.error('Error fetching position:', error);
        res.status(500).json({
          error: 'Failed to fetch position',
          details: error.message
        });
      }
    });

    // Get S&P 500 Data
    app.get('/api/sp500', async (req, res) => {
      try {
        const { startDate, endDate } = req.query;
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Force update if cache is older than 5 minutes
        if (!sp500Cache.lastUpdate || 
            new Date() - sp500Cache.lastUpdate > 5 * 60 * 1000) {
          await updateSP500Data();
        }

        if (!sp500Cache.data) {
          return res.status(500).json({ error: 'S&P 500 data not available' });
        }

        // Filter and interpolate data for requested date range
        const interpolatedData = [];
        let currentDate = new Date(start);
        let lastKnownValue = sp500Cache.data[0]?.value || 1;

        while (currentDate <= end) {
          const currentDateStr = currentDate.toISOString().split('T')[0];
          
          // Find matching data point
          const dataPoint = sp500Cache.data.find(point => 
            point.date.toISOString().split('T')[0] === currentDateStr
          );

          if (dataPoint) {
            lastKnownValue = dataPoint.value;
          }

          interpolatedData.push({
            date: new Date(currentDate),
            value: lastKnownValue
          });

          currentDate.setDate(currentDate.getDate() + 1);
        }

        res.json(interpolatedData);
      } catch (error) {
        console.error('Error serving S&P 500 data:', error);
        res.status(500).json({ error: 'Failed to fetch S&P 500 data' });
      }
    });

    // Get Current Price
    app.get('/api/prices/:symbol', async (req, res) => {
      try {
        const { symbol } = req.params;
        const quote = await yahooFinance.quote(symbol);
        
        if (!quote || !quote.regularMarketPrice) {
          throw new Error('No price data available');
        }

        res.json({
          ticker: symbol,
          price: quote.regularMarketPrice,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error fetching current price:', error);
        res.status(500).json({ error: 'Failed to fetch current price' });
      }
    });

    // Serve Frontend in Production
    app.use(express.static(path.join(__dirname, '../frontend/build')));

    // Catch-all route to serve React app
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
    });

    // Start server
    const port = process.env.PORT || 3000;
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
