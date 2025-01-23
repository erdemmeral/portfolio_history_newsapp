import axios from 'axios';

const apiService = axios.create({
  baseURL: '/api', // Always use relative path
  timeout: 10000   // Optional: set timeout
});

// Export individual API methods
export const getCurrentPrice = (symbol) => 
  apiService.get(`/positions/current-price/${symbol}`);

// In api.js or services file
export const updatePosition = (positionId, updateData) => 
  axios.patch(`/api/positions/${positionId}/update-price`, updateData);


export const addPosition = (positionData) => 
  apiService.post('/positions', positionData);

export const deletePosition = (positionId) => 
  apiService.delete(`/positions/${positionId}`);

export const getPortfolio = () => 
  apiService.get('/portfolio');

export const getPerformance = () => 
  apiService.get('/performance');

export default apiService;