const positionSchema = new mongoose.Schema({
  symbol: { 
    type: String, 
    required: [true, 'Symbol is required'],
    uppercase: true
  },
  entryPrice: { 
    type: Number, 
    required: [true, 'Entry Price is required']
  },
  currentPrice: { 
    type: Number, 
    default: null 
  },
  targetPrice: { 
    type: Number, 
    default: null 
  },
  profitLoss: {
    type: Number,
    default: 0
  },
  percentageChange: {
    type: Number,
    default: 0
  },
  startDate: { 
    type: Date, 
    required: [true, 'Start date is required']
  },
  targetDate: { 
    type: Date,
    default: null
  },
  timeframe: {
    type: String,
    enum: ['1h', '1wk', '1mo'],
    required: [true, 'Timeframe is required']
  },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'SOLD'],
    default: 'ACTIVE'
  },
  sellPrice: {
    type: Number,
    default: null
  },
  sellDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  methods: {
    calculateProfitLoss() {
      if (this.currentPrice && this.entryPrice) {
        this.profitLoss = this.currentPrice - this.entryPrice;
        this.profitLossPercentage = 
          ((this.currentPrice - this.entryPrice) / this.entryPrice) * 100;
      }
    },
    calculatePercentageChange() {
      if (this.entryPrice && this.currentPrice) {
        this.profitLossPercentage = 
          ((this.currentPrice - this.entryPrice) / this.entryPrice) * 100;
      } else {
        this.profitLossPercentage = 0;
      }
    }
  }
});

const Position = mongoose.model('Position', positionSchema);