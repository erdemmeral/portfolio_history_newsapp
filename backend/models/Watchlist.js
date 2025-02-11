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
  technical_score: { 
    type: Number, 
    default: null 
  },
  news_score: { 
    type: Number, 
    default: null 
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

// Pre-save middleware to update last_updated
watchlistSchema.pre('save', function(next) {
  this.last_updated = new Date();
  next();
});

export default mongoose.model('Watchlist', watchlistSchema); 