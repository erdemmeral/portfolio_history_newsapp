const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  entryPrice: { type: Number, required: true },
  currentPrice: { type: Number, required: true },
  targetPrice: { type: Number, required: true },
  entryDate: { type: Date, required: true },
  targetDate: { type: Date, required: true },
  timeLeft: { type: Number },
  status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' },
  soldDate: { type: Date },
  soldPrice: { type: Number },
  profitLoss: { type: Number, default: 0 },
  percentageChange: { type: Number, default: 0 }
});

// Pre-save middleware to calculate profitLoss and percentageChange
positionSchema.pre('save', function(next) {
  if (this.entryPrice && this.currentPrice) {
    this.profitLoss = this.currentPrice - this.entryPrice;
    this.percentageChange = (this.profitLoss / this.entryPrice) * 100;
  }
  next();
});

module.exports = mongoose.model('Position', positionSchema); 