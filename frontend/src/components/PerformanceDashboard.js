import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './PerformanceDashboard.css';

function PerformanceDashboard() {
  const [performance, setPerformance] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('1m');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper function for CSS classes
  const getPerformanceClass = (value) => {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return '';
  };

  // Time periods for selection
  const timePeriods = [
    { label: '1D', value: '1d' },
    { label: '1W', value: '1w' },
    { label: '1M', value: '1m' },
    { label: '6M', value: '6m' },
    { label: '1Y', value: '1y' },
    { label: 'YTD', value: 'ytd' },
    { label: 'ALL', value: 'all' }
  ];

  // Fetch performance metrics and time series data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch overall performance metrics
        const perfResponse = await axios.get('/api/performance');
        setPerformance(perfResponse.data);

        // Fetch time series data
        const timeSeriesResponse = await axios.get(
          `/api/performance/timeseries?period=${selectedPeriod}`
        );
        setTimeSeriesData(timeSeriesResponse.data);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching performance data:', error);
        setError(error);
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPeriod]);

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const percentageChange = ((value - 1) * 100).toFixed(2);
      const sign = percentageChange > 0 ? '+' : '';
      
      return (
        <div className="custom-tooltip">
          <p className="date">{new Date(label).toLocaleDateString()}</p>
          <p className="value">Price: ${value.toFixed(2)}</p>
          <p className="change">Return: {sign}{percentageChange}%</p>
        </div>
      );
    }
    return null;
  };

  if (loading) return <div>Loading performance data...</div>;
  if (error) return <div>Error loading performance data</div>;
  if (!performance || !timeSeriesData) return <div>No performance data available</div>;

  // Calculate the total return for the selected period
  const periodReturn = timeSeriesData.data.length > 1 
    ? ((timeSeriesData.data[timeSeriesData.data.length - 1].value - 1) * 100)
    : 0;

  return (
    <div className="performance-container">
      <h2>Portfolio Performance</h2>
      
      {/* Time Period Selection */}
      <div className="time-period-selector">
        {timePeriods.map(period => (
          <button
            key={period.value}
            className={`period-button ${selectedPeriod === period.value ? 'active' : ''}`}
            onClick={() => setSelectedPeriod(period.value)}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Performance Chart */}
      <div className="chart-container">
        <div className="period-return">
          <span className={getPerformanceClass(periodReturn)}>
            {periodReturn > 0 ? '+' : ''}{periodReturn.toFixed(2)}%
          </span>
          <span className="period-label">
            {timePeriods.find(p => p.value === selectedPeriod)?.label}
          </span>
        </div>
        
        <div className="chart">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={timeSeriesData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <YAxis 
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#2196F3" 
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

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
              <th>Exit Date</th>
              <th>Hold Duration</th>
            </tr>
          </thead>
          <tbody>
            {performance.closedPositions.map((position, index) => {
              const holdDuration = position.soldDate 
                ? Math.ceil(
                    (new Date(position.soldDate) - new Date(position.entryDate)) / 
                    (1000 * 60 * 60 * 24)
                  )
                : 0;

              // Format dates with error handling
              const formatDate = (dateString) => {
                try {
                  const date = new Date(dateString);
                  return date instanceof Date && !isNaN(date) 
                    ? date.toLocaleDateString()
                    : 'N/A';
                } catch {
                  return 'N/A';
                }
              };
              
              return (
                <tr key={index}>
                  <td>{position.symbol}</td>
                  <td>${position.entryPrice.toFixed(2)}</td>
                  <td>${position.soldPrice ? position.soldPrice.toFixed(2) : position.currentPrice.toFixed(2)}</td>
                  <td className={getPerformanceClass(position.profitLoss)}>
                    ${position.profitLoss.toFixed(2)}
                  </td>
                  <td className={getPerformanceClass(position.percentageChange)}>
                    {position.percentageChange.toFixed(2)}%
                  </td>
                  <td>{formatDate(position.entryDate)}</td>
                  <td>{formatDate(position.targetDate)}</td>
                  <td>{formatDate(position.soldDate)}</td>
                  <td>{!isNaN(holdDuration) ? `${holdDuration} days` : 'N/A'}</td>
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