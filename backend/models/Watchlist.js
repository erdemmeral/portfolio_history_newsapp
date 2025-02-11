import mongoose from 'mongoose';

const watchlistSchema = new mongoose.Schema({
  ticker: { 
    type: String, 
    required: true,
    unique: true 
  },
  current_price: { 
    type: Number, 
    default: null 
  },
  fundamental_score: { 
    type: Number, 
    required: true 
  },
  technical_scores: {
    short: { 
      type: Number, 
      default: null 
    },
    medium: { 
      type: Number, 
      default: null 
    },
    long: { 
      type: Number, 
      default: null 
    }
  },
  news_score: { 
    type: Number, 
    default: null 
  },
  best_timeframe: {
    type: String,
    enum: ['short', 'medium', 'long'],
    default: null
  },
  buy_signal: {
    type: Boolean,
    default: false
  },
  last_analysis: { 
    type: Date, 
    default: Date.now 
  },
  analysis_status: {
    fundamental: { 
      type: Boolean, 
      default: true 
    },
    technical: { 
      type: Boolean, 
      default: false 
    },
    news: { 
      type: Boolean, 
      default: false 
    }
  },
  added_date: { 
    type: Date, 
    default: Date.now 
  },
  last_updated: { 
    type: Date, 
    default: Date.now 
  },
  notes: { 
    type: String, 
    default: '' 
  }
});

// Pre-save middleware to update last_updated and last_analysis
watchlistSchema.pre('save', function(next) {
  this.last_updated = new Date();
  this.last_analysis = new Date();
  next();
});

export default mongoose.model('Watchlist', watchlistSchema); 