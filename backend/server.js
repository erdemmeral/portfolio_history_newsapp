import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import yahooFinance from 'yahoo-finance2';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalents for __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI;
console.log('MongoDB URI:', mongoUri);

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('MongoDB Atlas Connected Successfully');
})
.catch((error) => {
  console.error('MongoDB Connection Error:', error);
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Position Schema
const positionSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  entryPrice: { type: Number, required: true },
  currentPrice: { type: Number, default: null },
  targetPrice: { type: Number, required: true },
  entryDate: { type: Date, default: Date.now },
  targetDate: Date,
  timeframe: String,
  status: { 
    type: String, 
    enum: ['OPEN', 'CLOSED', 'PENDING'],
    default: 'OPEN'
  },
  profitLoss: { type: Number, default: 0 }
});

// Position Model
const Position = mongoose.model('Position', positionSchema);

// API Routes
// Add Position
app.post('/api/positions', async (req, res) => {
  try {
    const positionData = req.body;

    // Validate required fields
    const requiredFields = ['symbol', 'entryPrice', 'startDate', 'timeframe'];
    
    for (let field of requiredFields) {
      if (!positionData[field]) {
        return res.status(400).json({ 
          error: `${field} is required` 
        });
      }
    }

    // Create new position
    const newPosition = new Position({
      symbol: positionData.symbol,
      entryPrice: positionData.entryPrice,
      targetPrice: positionData.targetPrice || null,
      startDate: positionData.startDate,
      targetDate: positionData.targetDate || null,
      timeframe: positionData.timeframe,
      status: 'OPEN'
    });

    // Fetch current price
    try {
      const priceData = await yahooFinance.quote(newPosition.symbol);
      newPosition.currentPrice = priceData.regularMarketPrice;
    } catch (priceError) {
      console.error(`Could not fetch current price for ${newPosition.symbol}:`, priceError);
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

    // Retrieve Positions
    const positions = await Position.find();
    
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

    res.json(positions);
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

// Update Position
app.put('/api/positions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedPosition = await Position.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );

    if (!updatedPosition) {
      return res.status(404).json({ error: 'Position not found' });
    }

    res.json(updatedPosition);

  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({ 
      error: 'Failed to update position',
      details: error.message 
    });
  }
});

// Delete Position
app.delete('/api/positions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const position = await Position.findById(id);
    
    if (!position) {
      return res.status(404).json({ 
        error: 'Position Not Found',
        details: `No position exists with ID ${id}`
      });
    }

    await Position.findByIdAndDelete(id);

    res.status(200).json({ 
      message: 'Position Deleted Successfully',
      position: position 
    });

  } catch (error) {
    console.error('Deletion Error:', error);
    res.status(500).json({ 
      error: 'Failed to delete position',
      details: error.message 
    });
  }
});

// Current Price Endpoint
app.get('/api/positions/current-price/:symbol', async (req, res) => {
  const symbol = req.params.symbol;

  try {
    console.log(`Attempting to fetch price for: ${symbol}`);

    const quote = await yahooFinance.quote(symbol);

    if (!quote || !quote.regularMarketPrice) {
      return res.status(404).json({ 
        error: 'Price not found', 
        symbol: symbol 
      });
    }

    res.json({
      symbol: symbol,
      currentPrice: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent
    });

  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error.message);
    
    res.status(500).json({ 
      error: 'Failed to fetch current price',
      symbol: symbol,
      details: error.message 
    });
  }
});

// Performance Endpoint
app.get('/api/performance', async (req, res) => {
  try {
    const closedPositions = await Position.find({ status: 'CLOSED' });

    const totalTrades = closedPositions.length;
    const totalProfit = closedPositions.reduce((sum, position) => 
      sum + (position.currentPrice - position.entryPrice) * 100, 0);

    const winningTrades = closedPositions.filter(position => 
      position.currentPrice > position.entryPrice);

    const winRate = totalTrades > 0 
      ? (winningTrades.length / totalTrades) * 100 
      : 0;

    res.json({
      totalTrades,
      totalProfit,
      winRate,
      closedPositions
    });

  } catch (error) {
    console.error('Error calculating performance:', error);
    res.status(500).json({ error: 'Performance calculation failed' });
  }
});

// Serve Frontend in Production
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Catch-all route to serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Start Server
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
