import axios from 'axios';

// Base URL for API calls
const API_BASE_URL = 'http://localhost:3000/api';

// Create an axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000, // Optional: set timeout
});

// Portfolio-related API calls
export const getPortfolio = () => api.get('/portfolio');
export const addPosition = (positionData) => api.post('/positions', positionData);
export const getPerformance = () => api.get('/performance');
export const getCurrentPrice = (symbol) => {
    console.log(`Attempting to get price for ${symbol}`);
    return axios.get(`${API_BASE_URL}/positions/current-price/${symbol}`);
};
export const updatePosition = (positionId, updateData) => 
    axios.patch(`${API_BASE_URL}/positions/${positionId}/update`, updateData);
  
export const deletePosition = (positionId) => {
  return axios.delete(`${API_BASE_URL}/positions/${positionId}`);
};

export default api;