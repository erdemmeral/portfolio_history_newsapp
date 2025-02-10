import axios from 'axios';

const apiService = axios.create({
  baseURL: 'https://portfolio-tracker-rough-dawn-5271.fly.dev/api',
  timeout: 10000   // Optional: set timeout
});

// Add a new position
export const addPosition = (positionData) => 
  apiService.post('/positions', {
    ...positionData,
    ticker: positionData.ticker.toUpperCase()
  });

// Get current price for a symbol
export const getCurrentPrice = async (ticker) => {
  try {
    const response = await apiService.get(`/prices/${ticker}`);
    return response.data.price;
  } catch (error) {
    console.error(`Error fetching current price for ${ticker}:`, error);
    throw error;
  }
};

// Get position details by ticker
export const getPosition = (ticker) => 
  apiService.get(`/positions/${ticker}`);

// Update position details
export const updatePosition = (ticker, updateData) => 
  apiService.patch(`/positions/${ticker}`, updateData);

// Update position price
export const updatePositionPrice = (symbol, currentPrice) => 
  apiService.patch(`/positions/${symbol}/update-price`, { currentPrice });

// Sell position
export const sellPosition = (ticker, { soldPrice }) => 
  apiService.post(`/positions/${ticker}/sell`, { soldPrice });

// Get portfolio
export const getPortfolio = () => 
  apiService.get('/portfolio');

// Get performance
export const getPerformance = () => 
  apiService.get('/performance');

// Get performance time series
export const getPerformanceTimeSeries = (startDate, endDate) => 
  apiService.get('/performance/timeseries', {
    params: { startDate, endDate }
  });

// Format trend data for display
export const formatTrendData = (trend) => ({
  direction: trend?.direction || 'neutral',
  strength: trend?.strength || 50,
  ma_alignment: trend?.ma_alignment || false
});

// Format signals data for display
export const formatSignalsData = (signals) => ({
  rsi: signals?.rsi || null,
  macd: {
    value: signals?.macd?.value || null,
    signal: signals?.macd?.signal || 'hold'
  },
  volume_profile: signals?.volume_profile || null,
  predicted_move: signals?.predicted_move || null
});

export default apiService;