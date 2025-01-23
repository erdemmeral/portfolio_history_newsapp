import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PerformanceDashboard.css';

function PerformanceDashboard() {
  const [performance, setPerformance] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper function for CSS classes
  const getPerformanceClass = (value) => {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return '';
  };

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const response = await axios.get('https://portfolio-tracker-rough-dawn-5271.fly.dev/api/performance');
        setPerformance(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching performance', error);
        setError(error);
        setLoading(false);
      }
    };

    fetchPerformance();
  }, []);

  if (loading) return <div>Loading performance data...</div>;
  if (error) return <div>Error loading performance data</div>;
  if (!performance) return <div>No performance data available</div>;

  return (
    <div className="performance-container">
      <h2>Trading Performance</h2>
      
      {/* Overall Statistics */}
      <div className="performance-summary">
        <h3>Overall Statistics</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <label>Total Trades</label>
            <span>{performance.totalTrades}</span>
          </div>
          <div className="stat-item">
            <label>Win Rate</label>
            <span className={getPerformanceClass(performance.winRate - 50)}>
              {performance.winRate.toFixed(2)}%
            </span>
          </div>
          <div className="stat-item">
            <label>Total Profit/Loss</label>
            <span className={getPerformanceClass(performance.totalProfit)}>
              ${performance.totalProfit.toFixed(2)}
            </span>
          </div>
          <div className="stat-item">
            <label>Average Profit per Trade</label>
            <span className={getPerformanceClass(performance.avgProfit)}>
              ${performance.avgProfit.toFixed(2)}
            </span>
          </div>
          <div className="stat-item">
            <label>Largest Win</label>
            <span className="positive">
              ${performance.largestWin.toFixed(2)}
            </span>
          </div>
          <div className="stat-item">
            <label>Largest Loss</label>
            <span className="negative">
              ${Math.abs(performance.largestLoss).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Closed Positions Table */}
      <div className="closed-positions">
        <h3>Closed Positions History</h3>
        <table className="positions-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Entry Price</th>
              <th>Exit Price</th>
              <th>Profit/Loss</th>
              <th>% Return</th>
              <th>Entry Date</th>
              <th>Target Date</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {performance.closedPositions.map((position, index) => {
              const duration = Math.ceil(
                (new Date(position.targetDate) - new Date(position.entryDate)) / 
                (1000 * 60 * 60 * 24)
              );
              
              return (
                <tr key={index}>
                  <td>{position.symbol}</td>
                  <td>${position.entryPrice.toFixed(2)}</td>
                  <td>${position.soldPrice.toFixed(2)}</td>
                  <td className={getPerformanceClass(position.profitLoss)}>
                    ${position.profitLoss.toFixed(2)}
                  </td>
                  <td className={getPerformanceClass(position.percentageChange)}>
                    {position.percentageChange.toFixed(2)}%
                  </td>
                  <td>{new Date(position.entryDate).toLocaleDateString()}</td>
                  <td>{new Date(position.targetDate).toLocaleDateString()}</td>
                  <td>{duration} days</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PerformanceDashboard;