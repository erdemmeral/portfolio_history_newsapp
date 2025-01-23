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
    const databaseName = parsedUri.pathname.replace('/', '');
    
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

    // Other existing routes (update, delete, current price, performance)
    // ... (add other routes from previous implementation)

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
