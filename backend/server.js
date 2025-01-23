import express from 'express';
import cors from 'cors';  // Add this import
import yahooFinance from 'yahoo-finance2';
import mongoose from 'mongoose';

//import yahooFinance from 'yahoo-finance2/dist/esm/index.js';

const app = express();
const port = 3000;
const mongoPort = 27017;   // MongoDB default port

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost/portfoliodb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define the Position schema
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


// Create the Position model
const Position = mongoose.model('Position', positionSchema);


// API endpoints
app.post('/api/positions', async (req, res) => {
  try {
    const positionData = req.body;

    // Validate required fields
    const requiredFields = [
      'symbol', 'entryPrice', 'startDate', 
      'timeframe'
    ];
    
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
      status: 'ACTIVE'
    });

    // Fetch current price
    try {
      const priceData = await yahooFinance.quote(newPosition.symbol);
      newPosition.currentPrice = priceData.regularMarketPrice;
      
      // Calculate profit/loss
      newPosition.calculateProfitLoss();
    } catch (priceError) {
      console.error(`Could not fetch current price for ${newPosition.symbol}:`, priceError);
      // Position can be added without current price
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
app.delete('/api/positions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Find the position first to ensure it exists
    const position = await Position.findById(id);
    
    if (!position) {
      return res.status(404).json({ 
        error: 'Position Not Found',
        details: `No position exists with ID ${id}`
      });
    }

    // Delete the position
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

app.patch('/api/positions/:id/sell', async (req, res) => {
  try {
    const { id } = req.params;
    const { sellPrice, sellDate } = req.body;

    // Validate sell data
    if (!sellPrice) {
      return res.status(400).json({ error: 'Sell price is required' });
    }

    // Find and update position
    const position = await Position.findById(id);

    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }

    // Update position status and sell details
    position.status = 'SOLD';
    position.sellPrice = sellPrice;
    position.sellDate = sellDate || new Date();

    // Recalculate profit/loss based on sell price
    position.currentPrice = sellPrice;
    position.calculateProfitLoss();

    await position.save();

    res.json({
      message: 'Position sold successfully',
      position
    });

  } catch (error) {
    console.error('Error selling position:', error);
    res.status(500).json({ 
      error: 'Failed to sell position',
      details: error.message 
    });
  }
});
app.put('/api/positions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find and update the position
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
app.get('/api/portfolio', async (req, res) => {
  try {
    const positions = await Position.find();
    
    //console.log('RETRIEVING Positions:', positions);
    
    res.json(positions);
  } catch (error) {
    console.error('Portfolio Retrieval Error:', error);
    res.status(500).json({ error: 'Failed to retrieve portfolio' });
  }
});

app.post('/api/performance', (req, res) => {
  // Handle saving performance data to the database
  // ...
  res.status(201).json({ message: 'Performance data saved successfully' });
});

app.post('/api/positions', async (req, res) => {
  try {
    console.log('FULL Received Data:', req.body);

    const portfolioEntry = new Position({
      symbol: req.body.symbol,
      entryPrice: req.body.entryPrice,
      currentPrice: req.body.currentPrice,
      targetPrice: req.body.targetPrice,
      timeframe: req.body.timeframe,
      status: 'OPEN'
    });

    // Log the exact document being saved
    console.log('SAVING Document:', portfolioEntry.toObject());

    const savedPosition = await portfolioEntry.save();
    
    console.log('SAVED Position:', savedPosition.toObject());

    res.status(201).json({ 
      message: 'Position added to portfolio', 
      position: savedPosition 
    });

  } catch (error) {
    console.error('DETAILED Saving Error:', error);
    res.status(500).json({ 
      error: 'Failed to save position', 
      details: error.message 
    });
  }
});

app.patch('/api/positions/:id/update', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPrice } = req.body;

    // Find the existing position
    const position = await Position.findById(id);

    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }

    // Calculate profit/loss
    const profitLoss = currentPrice - position.entryPrice;
    const percentageChange = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

    // Update position
    position.currentPrice = currentPrice;
    position.profitLoss = profitLoss;
    position.percentageChange = percentageChange;

    position.lastUpdated = new Date();

    await position.save();

    res.json({
      message: 'Position updated successfully',
      position
    });

  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({ error: 'Failed to update position' });
  }
});
app.patch('/api/positions/:id/update-price', async (req, res) => {
  try {
    const { id } = req.params;

    // Find position
    const position = await Position.findById(id);

    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }

    // Fetch current price
    const priceData = await yahooFinance.quote(position.symbol);
    
    // Update current price
    position.currentPrice = priceData.regularMarketPrice;
    
    // Recalculate profit/loss
    position.calculateProfitLoss();

    await position.save();

    res.json({
      message: 'Position price updated',
      position
    });

  } catch (error) {
    console.error('Error updating position price:', error);
    res.status(500).json({ 
      error: 'Failed to update position price',
      details: error.message 
    });
  }
});

app.post('/api/signals', async (req, res) => {
  try {
    // Log incoming signal for debugging
    console.log('Received Signal:', req.body);

    // Validate incoming signal
    const { 
      symbol, 
      entryPrice, 
      action, 
      timeframe, 
      targetPrice 
    } = req.body;

    // Validate required fields
    if (!symbol || !entryPrice) {
      return res.status(400).json({ 
        error: 'Invalid signal',
        details: 'Symbol and entry price are required' 
      });
    }

    // Handle different actions
    switch(action.toUpperCase()) {
      case 'BUY':
        // Create new position
        const newPosition = new Position({
          symbol: symbol.toUpperCase(),
          entryPrice: entryPrice,
          targetPrice: targetPrice,
          timeframe: timeframe,
          startDate: new Date(),
          status: 'ACTIVE'
        });

        await newPosition.save();

        return res.status(201).json({
          message: 'Position created from signal',
          position: newPosition
        });

      case 'SELL':
        // Find and update existing position
        const position = await Position.findOne({ 
          symbol: symbol.toUpperCase(), 
          status: 'ACTIVE' 
        });

        if (!position) {
          return res.status(404).json({ 
            error: 'No active position found',
            details: `No active position for ${symbol}` 
          });
        }

        position.status = 'CLOSED';
        position.currentPrice = entryPrice;
        await position.save();

        return res.status(200).json({
          message: 'Position closed from signal',
          position: position
        });

      default:
        return res.status(400).json({ 
          error: 'Invalid action',
          details: 'Action must be BUY or SELL' 
        });
    }

  } catch (error) {
    console.error('Signal Processing Error:', error);
    res.status(500).json({ 
      error: 'Failed to process signal',
      details: error.message 
    });
  }
});
app.get('/api/performance', async (req, res) => {
  try {
    // Find all closed positions
    const closedPositions = await Position.find({ status: 'CLOSED' });

    // Calculate performance metrics
    const totalTrades = closedPositions.length;
    const totalProfit = closedPositions.reduce((sum, position) => 
      sum + (position.currentPrice - position.entryPrice) * 100, 0); // Assuming 100 shares

    const winningTrades = closedPositions.filter(position => 
      position.currentPrice > position.entryPrice);

    const winRate = winningTrades.length / totalTrades;

    res.json({
      totalTrades,
      totalProfit,
      winRate: winRate * 100, // Convert to percentage
      closedPositions
    });

  } catch (error) {
    console.error('Error calculating performance:', error);
    res.status(500).json({ error: 'Performance calculation failed' });
  }
});
// Ensure this route is added

app.get('/api/positions/current-price/:symbol', async (req, res) => {
  const symbol = req.params.symbol; // Define symbol at the top

  try {
    console.log(`Attempting to fetch price for: ${symbol}`);

    // Use different method to fetch quote
    const quote = await yahooFinance.quote(symbol);

    //console.log('Quote retrieved:', quote);

    // Ensure we have a valid price
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
    // Use the symbol from the outer scope
    console.error(`Error fetching price for ${symbol}:`, error.message);
    
    res.status(500).json({ 
      error: 'Failed to fetch current price',
      symbol: symbol,
      details: error.message 
    });
  }
});
// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 