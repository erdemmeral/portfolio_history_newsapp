import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './PerformanceDashboard.css';

function PerformanceDashboard() {
  const [performance, setPerformance] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState(null);
  const [sp500Data, setSp500Data] = useState(null);
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

  // Fetch S&P 500 data
  const fetchSP500Data = async (startDate, endDate) => {
    try {
      const response = await axios.get('/api/sp500', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching S&P 500 data:', error);
      return null;
    }
  };

  // Fetch performance metrics and time series data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Calculate date range based on selected period
        const endDate = new Date();
        let startDate = new Date();
        
        switch (selectedPeriod) {
          case '1d':
            startDate.setDate(endDate.getDate() - 1);
            break;
          case '1w':
            startDate.setDate(endDate.getDate() - 7);
            break;
          case '1m':
            startDate.setMonth(endDate.getMonth() - 1);
            break;
          case '6m':
            startDate.setMonth(endDate.getMonth() - 6);
            break;
          case '1y':
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
          case 'ytd':
            startDate = new Date(endDate.getFullYear(), 0, 1);
            break;
          case 'all':
          default:
            // Get earliest position date or default to 1 year ago
            const performanceResponse = await axios.get('/api/performance');
            const positions = performanceResponse.data.closedPositions;
            if (positions && positions.length > 0) {
              const dates = positions.map(p => new Date(p.entryDate));
              startDate = new Date(Math.min(...dates));
            } else {
              startDate.setFullYear(endDate.getFullYear() - 1);
            }
        }

        // Fetch both portfolio and S&P 500 data
        const [performanceResponse, timeSeriesResponse, sp500Response] = await Promise.all([
          axios.get('/api/performance'),
          axios.get('/api/performance/timeseries', {
            params: { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
          }),
          axios.get('/api/sp500', {
            params: { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
          })
        ]);

        // Merge portfolio and S&P 500 data
        const mergedData = timeSeriesResponse.data.data.map(point => {
          const sp500Point = sp500Response.data.find(
            sp => new Date(sp.date).toISOString().split('T')[0] === 
                 new Date(point.date).toISOString().split('T')[0]
          );
          return {
            ...point,
            sp500: sp500Point ? sp500Point.value : null
          };
        });

        setPerformance(performanceResponse.data);
        setTimeSeriesData({ ...timeSeriesResponse.data, data: mergedData });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching performance data:', error);
        setError('Failed to load performance data');
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedPeriod]);

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const portfolioValue = payload[0]?.value;
      const sp500Value = payload[1]?.value;
      
      const portfolioReturn = ((portfolioValue - 1) * 100).toFixed(2);
      const sp500Return = sp500Value ? ((sp500Value - 1) * 100).toFixed(2) : 'N/A';
      
      return (
        <div className="custom-tooltip">
          <p className="date">{new Date(label).toLocaleDateString()}</p>
          <p className={`value ${portfolioReturn >= 0 ? 'positive' : 'negative'}`}>
            Portfolio: {portfolioReturn}%
          </p>
          <p className={`value ${sp500Return >= 0 ? 'positive' : 'negative'}`}>
            S&P 500: {sp500Return}%
          </p>
        </div>
      );
    }
    return null;
  };

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const formatDuration = (duration) => {
    if (duration === null || duration === undefined) return 'N/A';
    return `${duration} days`;
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
            <LineChart data={timeSeriesData?.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <YAxis 
                domain={['auto', 'auto']}
                tickFormatter={(value) => `${((value - 1) * 100).toFixed(1)}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                name="Portfolio"
                stroke="#2563eb" 
                dot={false}
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="sp500" 
                name="S&P 500"
                stroke="#64748b" 
                dot={false}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Overall Performance Metrics */}
      <div className="performance-metrics">
        <div className="metric">
          <h3>Total Trades</h3>
          <p>{performance?.totalTrades || 0}</p>
        </div>
        <div className="metric">
          <h3>Win Rate</h3>
          <p>{performance?.winRate ? (performance.winRate * 100).toFixed(2) : '0.00'}%</p>
        </div>
        <div className="metric">
          <h3>Average Return</h3>
          <p className={getPerformanceClass(performance?.averagePercentageReturn || 0)}>
            {performance?.averagePercentageReturn?.toFixed(2) || '0.00'}%
          </p>
        </div>
        <div className="metric">
          <h3>Best Trade</h3>
          <p className="positive">
            {performance?.bestPercentageReturn?.toFixed(2) || '0.00'}%
          </p>
        </div>
        <div className="metric">
          <h3>Worst Trade</h3>
          <p className="negative">
            {performance?.worstPercentageReturn?.toFixed(2) || '0.00'}%
          </p>
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
              <th>% Return</th>
              <th>Entry Date</th>
              <th>Target Date</th>
              <th>Exit Date</th>
              <th>Hold Duration</th>
            </tr>
          </thead>
          <tbody>
            {performance?.closedPositions?.map((position) => (
              <tr key={`${position.symbol}-${position.entryDate}`}>
                <td>{position.symbol}</td>
                <td>${position.entryPrice?.toFixed(2) || '0.00'}</td>
                <td>${position.soldPrice?.toFixed(2) || '0.00'}</td>
                <td className={position.percentageChange >= 0 ? 'positive' : 'negative'}>
                  {position.percentageChange?.toFixed(2) || '0.00'}%
                </td>
                <td>{formatDateTime(position.entryDate)}</td>
                <td>{formatDateTime(position.targetDate)}</td>
                <td>{formatDateTime(position.soldDate)}</td>
                <td>{formatDuration(position.holdDuration)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PerformanceDashboard;