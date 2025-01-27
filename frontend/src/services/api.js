import axios from 'axios';

const apiService = axios.create({
  baseURL: '/api', // Always use relative path
  timeout: 10000   // Optional: set timeout
});

// Get position details by symbol
export const getPosition = (symbol) => 
  apiService.get(`/positions/${symbol}`);

// Update position details
export const updatePosition = (symbol, updateData) => 
  apiService.patch(`/positions/${symbol}`, updateData);

// Update position price
export const updatePositionPrice = (symbol, currentPrice) => 
  apiService.patch(`/positions/${symbol}/update-price`, { currentPrice });

// Sell position
export const sellPosition = (symbol, { soldPrice, soldDate, sellCondition }) => 
  apiService.post(`/positions/${symbol}/sell`, { soldPrice, soldDate, sellCondition });

// Get portfolio
export const getPortfolio = () => 
  apiService.get('/portfolio');

// Get performance
export const getPerformance = () => 
  apiService.get('/performance');

export default apiService;