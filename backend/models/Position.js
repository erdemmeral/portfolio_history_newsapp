import mongoose from 'mongoose';

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
  
  // Technical Analysis
  technical_scores: {
    short: { type: Number, default: null },
    medium: { type: Number, default: null },
    long: { type: Number, default: null }
  },
  news_score: { 
    type: Number, 
    default: null 
  },
  
  // Technical Levels
  support_levels: [Number],
  resistance_levels: [Number],
  stop_loss: { 
    type: Number, 
    required: true 
  },
  
  // Trend Information
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
    alignment_score: { 
      type: Number, 
      min: 0, 
      max: 100,
      default: 50 
    }
  },
  
  // Position Status
  timeframe: { 
    type: String, 
    enum: ['short', 'medium', 'long'],
    required: true 
  },
  status: { 
    type: String, 
    enum: ['open', 'closed'],
    default: 'open' 
  },
  pnl: { 
    type: Number, 
    default: 0 
  },
  last_updated: { 
    type: Date, 
    default: Date.now 
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

export default mongoose.model('Position', positionSchema); 