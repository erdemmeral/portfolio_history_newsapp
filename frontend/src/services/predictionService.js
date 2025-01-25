import axios from 'axios';

const predictionService = axios.create({
  baseURL: '/api',
  timeout: 10000
});

// Add request interceptor for authentication
predictionService.interceptors.request.use(
  (config) => {
    // Add your authentication token here if required
    const token = process.env.REACT_APP_PREDICTION_API_KEY;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Get prediction for a specific stock
export const getPrediction = async (symbol) => {
  try {
    const response = await predictionService.get(`/predictions/${symbol}`);
    const { predictions } = response.data;

    return {
      modelPredictions: [
        {
          name: 'SVM',
          price: predictions.svm.price,
          change: predictions.svm.change
        },
        {
          name: 'RF',
          price: predictions.rf.price,
          change: predictions.rf.change
        },
        {
          name: 'XGB',
          price: predictions.xgb.price,
          change: predictions.xgb.change
        },
        {
          name: 'LGB',
          price: predictions.lgb.price,
          change: predictions.lgb.change
        },
        {
          name: 'LSTM',
          price: predictions.lstm.price,
          change: predictions.lstm.change
        }
      ],
      ensemble: {
        price: predictions.ensemble.price,
        change: predictions.ensemble.change
      }
    };
  } catch (error) {
    console.error('Prediction service error:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch prediction');
  }
};

// Get multiple predictions in batch
export const getBatchPredictions = async (positions) => {
  try {
    const response = await predictionService.post('/predictions/batch', {
      positions: positions.map(position => ({
        symbol: position.symbol,
        targetDate: position.targetDate
      }))
    });

    return response.data;
  } catch (error) {
    console.error('Batch prediction error:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch batch predictions');
  }
};

// Get prediction history
export const getPredictionHistory = async (startDate = null) => {
  try {
    let url = '/predictions/history';
    if (startDate) {
      url += `?startDate=${startDate.toISOString()}`;
    }

    const response = await predictionService.get(url);
    return response.data;
  } catch (error) {
    console.error('Prediction history error:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch prediction history');
  }
};

export default predictionService; 