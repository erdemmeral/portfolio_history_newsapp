import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentPrice, updatePosition } from '../services/api.js';
import './PortfolioList.css';

function PortfolioList() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

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
      
      // Update each position with current price
      const updatedPositions = await Promise.all(
        portfolioPositions.map(async (position) => {
          try {
            // Fetch current price
            const priceResponse = await getCurrentPrice(position.symbol);
            const currentPrice = priceResponse.data.currentPrice;
            console.log(`Current price for ${position.symbol}: ${currentPrice}`);
            
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

  return (
    <div className="portfolio-container">
      <h2 className="portfolio-title">Active Positions</h2>
      <table className="portfolio-table">
        <thead>
          <tr>
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
            // Calculate percentage change
            const percentageChange = 
              position.percentageChange !== undefined 
                ? position.percentageChange 
                : calculatePercentageChange(position.entryPrice, position.currentPrice);

            // Determine CSS class
            const positionPercentChangeClass = getPercentageChangeClass(percentageChange);

            return (
              <tr key={position._id}>
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
