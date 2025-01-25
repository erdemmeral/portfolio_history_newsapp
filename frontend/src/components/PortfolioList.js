import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentPrice, updatePosition } from '../services/api.js';
import { getPrediction } from '../services/predictionService';
import './PortfolioList.css';

function PortfolioList() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPosition, setExpandedPosition] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [loadingPredictions, setLoadingPredictions] = useState({});

  // Fetch predictions for a specific symbol
  const fetchPredictions = async (symbol, targetDate) => {
    try {
      setLoadingPredictions(prev => ({ ...prev, [symbol]: true }));
      
      // Use the prediction service
      const predictionData = await getPrediction(symbol, targetDate);
      
      setPredictions(prev => ({
        ...prev,
        [symbol]: predictionData
      }));
    } catch (error) {
      console.error(`Error fetching predictions for ${symbol}:`, error);
      setPredictions(prev => ({
        ...prev,
        [symbol]: { error: error.message || 'Failed to load predictions' }
      }));
    } finally {
      setLoadingPredictions(prev => ({ ...prev, [symbol]: false }));
    }
  };

  // Toggle expanded row
  const toggleExpanded = (positionId, symbol, targetDate) => {
    if (expandedPosition === positionId) {
      setExpandedPosition(null);
    } else {
      setExpandedPosition(positionId);
      if (!predictions[symbol]) {
        fetchPredictions(symbol, targetDate);
      }
    }
  };

  // Determine CSS class for percentage change
  const getPercentageChangeClass = (percentageChange) => {
    if (percentageChange > 0) return 'positive';
    if (percentageChange < 0) return 'negative';
    return '';
  };

  // Calculate Percentage Change Manually
  const calculatePercentageChange = (entryPrice, currentPrice) => {
    if (!entryPrice || !currentPrice) return 0;
    return ((currentPrice - entryPrice) / entryPrice) * 100;
  };

  // Fetch and update positions
  const fetchAndUpdatePositions = async () => {
    try {
      // Fetch current portfolio
      const portfolioResponse = await axios.get('https://portfolio-tracker-rough-dawn-5271.fly.dev/api/portfolio');
      const { positions: portfolioPositions } = portfolioResponse.data;
      
      // Filter for only OPEN positions
      const openPositions = portfolioPositions.filter(position => position.status === 'OPEN');
      
      // Update each position with current price
      const updatedPositions = await Promise.all(
        openPositions.map(async (position) => {
          try {
            // Fetch current price
            const priceResponse = await getCurrentPrice(position.symbol);
            const currentPrice = priceResponse.data.currentPrice;
            
            // Update position on backend
            const updateResponse = await updatePosition(position._id, {
              currentPrice
            });
    
            return updateResponse.data.position;
          } catch (updateError) {
            console.error(`Error updating position ${position._id}:`, updateError);
            return position;
          }
        })
      );

      setPositions(updatedPositions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching and updating portfolio:', error);
      setLoading(false);
    }
  };

  // Initial fetch and periodic updates
  useEffect(() => {
    fetchAndUpdatePositions();

    // Update every 5 minutes
    const intervalId = setInterval(fetchAndUpdatePositions, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  if (loading) return <div>Loading portfolio...</div>;

  // Render prediction details
  const renderPredictionDetails = (symbol) => {
    const prediction = predictions[symbol];
    const isLoading = loadingPredictions[symbol];

    if (isLoading) {
      return (
        <div className="prediction-loading">
          Loading predictions...
        </div>
      );
    }

    if (!prediction) {
      return null;
    }

    if (prediction.error) {
      return (
        <div className="prediction-error">
          {prediction.error}
        </div>
      );
    }

    return (
      <div className="prediction-details">
        <h4>Model Predictions for {symbol}</h4>
        <div className="prediction-table">
          <table>
            <thead>
              <tr>
                <th>Model Name</th>
                <th>Prediction</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {prediction.modelPredictions.map((model) => (
                <tr key={model.name}>
                  <td>{model.name}</td>
                  <td>${model.price.toFixed(2)}</td>
                  <td className={getPercentageChangeClass(model.change)}>
                    {model.change > 0 ? '+' : ''}{model.change.toFixed(2)}%
                  </td>
                </tr>
              ))}
              <tr className="ensemble-row">
                <td colSpan="3" className="separator"></td>
              </tr>
              <tr className="ensemble-row">
                <td>ENSEMBLE PREDICTION</td>
                <td>${prediction.ensemble.price.toFixed(2)}</td>
                <td className={getPercentageChangeClass(prediction.ensemble.change)}>
                  {prediction.ensemble.change > 0 ? '+' : ''}{prediction.ensemble.change.toFixed(2)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="portfolio-container">
      <h2 className="portfolio-title">Active Positions</h2>
      <table className="portfolio-table">
        <thead>
          <tr>
            <th></th>
            <th>Symbol</th>
            <th>Entry Price</th>
            <th>Current Price</th>
            <th>Profit/Loss</th>
            <th>% Change</th>
            <th>Target Price</th>
            <th>Starting Date</th>
            <th>Target Date</th>
            <th>Time Left</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {positions.map(position => {
            const percentageChange = 
              position.percentageChange !== undefined 
                ? position.percentageChange 
                : calculatePercentageChange(position.entryPrice, position.currentPrice);

            const positionPercentChangeClass = getPercentageChangeClass(percentageChange);
            const isExpanded = expandedPosition === position._id;

            return (
              <React.Fragment key={position._id}>
                <tr className={isExpanded ? 'expanded' : ''}>
                  <td>
                    <button 
                      className="expand-button"
                      onClick={() => toggleExpanded(position._id, position.symbol, position.targetDate)}
                    >
                      {isExpanded ? '−' : '+'}
                    </button>
                  </td>
                  <td>{position.symbol}</td>
                  <td>${position.entryPrice.toFixed(2)}</td>
                  <td>
                    {position.currentPrice 
                      ? `$${position.currentPrice.toFixed(2)}` 
                      : 'N/A'}
                  </td>
                  <td>
                    {position.profitLoss 
                      ? `$${position.profitLoss.toFixed(2)}` 
                      : '$0.00'}
                  </td>
                  <td className={positionPercentChangeClass}>
                    {percentageChange 
                      ? `${percentageChange.toFixed(2)}%` 
                      : '0.00%'}
                  </td>
                  <td>
                    {position.targetPrice 
                      ? `$${position.targetPrice.toFixed(2)}` 
                      : 'N/A'}
                  </td>
                  <td>
                    {new Date(position.entryDate).toLocaleDateString()}
                  </td>
                  <td>
                    {position.targetDate 
                      ? new Date(position.targetDate).toLocaleDateString() 
                      : 'N/A'}
                  </td>
                  <td>
                    {position.timeLeft !== undefined
                      ? position.timeLeft > 0
                        ? `${position.timeLeft} days left`
                        : position.timeLeft === 0
                          ? 'Due today'
                          : `${Math.abs(position.timeLeft)} days overdue`
                      : 'N/A'}
                  </td>
                  <td>{position.status}</td>
                </tr>
                {isExpanded && (
                  <tr className="prediction-row">
                    <td colSpan="11">
                      {renderPredictionDetails(position.symbol)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      
      {positions.length === 0 && (
        <p className="no-positions">No positions found</p>
      )}
    </div>
  );
}

export default PortfolioList;
