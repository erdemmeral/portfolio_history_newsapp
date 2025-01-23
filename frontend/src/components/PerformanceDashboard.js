import React, { useState, useEffect } from 'react';
import axios from 'axios';

function PerformanceDashboard() {
  const [performance, setPerformance] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/performance');
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

  // Loading state
  if (loading) {
    return <div>Loading performance data...</div>;
  }

  // Error state
  if (error) {
    return <div>Error loading performance data</div>;
  }

  // No performance data
  if (!performance) {
    return <div>No performance data available</div>;
  }

  // Safe rendering with default values
  return (
    <div>
      <h2>Performance Dashboard</h2>
      <div>
        <p>Total Trades: {performance.totalTrades || 0}</p>
        <p>Total Profit: ${performance.totalProfit ? performance.totalProfit.toFixed(2) : '0.00'}</p>
        <p>Win Rate: {performance.winRate ? performance.winRate.toFixed(2) : '0.00'}%</p>
      </div>
    </div>
  );
}

export default PerformanceDashboard;