import React, { useState, useEffect } from 'react';
import { getPortfolio, getCurrentPrice, updatePosition } from '../services/api';
import { getPrediction } from '../services/predictionService';
import './PortfolioList.css';

function PortfolioList() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedPosition, setExpandedPosition] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [loadingPredictions, setLoadingPredictions] = useState({});

  // Fetch and update positions
  const fetchAndUpdatePositions = async () => {
    try {
      setError(null);
      const { data } = await getPortfolio();
      
      // If we get a 404 with "Portfolio is empty" message, treat it as empty portfolio
      if (!data || !data.positions) {
        setPositions([]);
        setLoading(false);
        return;
      }
      
      // Filter for only open positions
      const openPositions = data.positions.filter(pos => pos.status === 'open');
      
      // Update current prices
      const updatedPositions = await Promise.all(
        openPositions.map(async (position) => {
          try {
            const currentPrice = await getCurrentPrice(position.ticker);
            await updatePosition(position.ticker, { current_price: currentPrice });
            return {
              ...position,
              current_price: currentPrice
            };
          } catch (updateError) {
            console.error(`Error updating position ${position.ticker}:`, updateError);
            return position;
          }
        })
      );

      setPositions(updatedPositions);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      // Only set error if it's not the empty portfolio case
      if (error.response?.data?.error !== "No positions found") {
        setError('Failed to load portfolio data. Please try again later.');
      } else {
        setPositions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and periodic updates
  useEffect(() => {
    fetchAndUpdatePositions();
    const intervalId = setInterval(fetchAndUpdatePositions, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Fetch predictions for a position
  const fetchPredictions = async (ticker) => {
    try {
      setLoadingPredictions(prev => ({ ...prev, [ticker]: true }));
      const predictionData = await getPrediction(ticker);
      setPredictions(prev => ({
        ...prev,
        [ticker]: predictionData
      }));
    } catch (error) {
      console.error(`Error fetching predictions for ${ticker}:`, error);
      setPredictions(prev => ({
        ...prev,
        [ticker]: { error: 'Failed to load predictions' }
      }));
    } finally {
      setLoadingPredictions(prev => ({ ...prev, [ticker]: false }));
    }
  };

  // Toggle expanded position
  const toggleExpanded = (positionId, ticker) => {
    if (expandedPosition === positionId) {
      setExpandedPosition(null);
    } else {
      setExpandedPosition(positionId);
      if (!predictions[ticker]) {
        fetchPredictions(ticker);
      }
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    if (!value && value !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Format percentage
  const formatPercentage = (value) => {
    if (!value && value !== 0) return 'N/A';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="portfolio-container">
        <div className="loading-state">Loading portfolio data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portfolio-container">
        <div className="error-state">{error}</div>
      </div>
    );
  }

  return (
    <div className="portfolio-container">
      <h2 className="portfolio-title">Active Positions</h2>
      
      {positions.length === 0 ? (
        <div className="no-positions">
          No active positions found. Add a position to get started.
        </div>
      ) : (
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
              <th>Timeframe</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => {
              const isExpanded = expandedPosition === position._id;
              const pnl = position.pnl || 0;
              
              return (
                <React.Fragment key={position._id}>
                  <tr className={isExpanded ? 'expanded' : ''}>
                    <td>
                      <button 
                        className="expand-button"
                        onClick={() => toggleExpanded(position._id, position.ticker)}
                      >
                        {isExpanded ? '−' : '+'}
                      </button>
                    </td>
                    <td>{position.ticker}</td>
                    <td>{formatCurrency(position.entry_price)}</td>
                    <td>{formatCurrency(position.current_price)}</td>
                    <td className={pnl > 0 ? 'positive' : pnl < 0 ? 'negative' : ''}>
                      {formatCurrency(Math.abs(pnl))}
                    </td>
                    <td className={pnl > 0 ? 'positive' : pnl < 0 ? 'negative' : ''}>
                      {formatPercentage(pnl)}
                    </td>
                    <td>{formatCurrency(position.take_profit)}</td>
                    <td>{formatDate(position.entry_date)}</td>
                    <td>
                      <span className="timeframe">
                        {position.timeframe?.charAt(0).toUpperCase() + position.timeframe?.slice(1) || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className={`status ${position.status.toLowerCase()}`}>
                        {position.status}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="details-row">
                      <td colSpan="11">
                        <div className="position-details">
                          <div className="details-section">
                            <h4>Analysis Scores</h4>
                            <div className="scores-grid">
                              <div className="score">
                                <label>Technical</label>
                                <span>{position.technical_score || 'N/A'}</span>
                              </div>
                              <div className="score">
                                <label>Fundamental</label>
                                <span>{position.fundamental_score || 'N/A'}</span>
                              </div>
                              <div className="score">
                                <label>News</label>
                                <span>{position.news_score || 'N/A'}</span>
                              </div>
                              <div className="score">
                                <label>Overall</label>
                                <span>{position.overall_score || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="details-section">
                            <h4>Technical Analysis</h4>
                            <div className="analysis-grid">
                              <div className="analysis-item">
                                <label>Trend Direction</label>
                                <span className={`trend ${position.trend?.direction || 'neutral'}`}>
                                  {position.trend?.direction || 'Neutral'}
                                </span>
                              </div>
                              <div className="analysis-item">
                                <label>Trend Strength</label>
                                <span>{position.trend?.strength || 'N/A'}</span>
                              </div>
                              <div className="analysis-item">
                                <label>Support Levels</label>
                                <span>
                                  {position.support_levels?.length > 0
                                    ? position.support_levels.map(formatCurrency).join(', ')
                                    : 'N/A'}
                                </span>
                              </div>
                              <div className="analysis-item">
                                <label>Resistance Levels</label>
                                <span>
                                  {position.resistance_levels?.length > 0
                                    ? position.resistance_levels.map(formatCurrency).join(', ')
                                    : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="details-section">
                            <h4>Technical Signals</h4>
                            <div className="signals-grid">
                              <div className="signal">
                                <label>RSI</label>
                                <span>{position.signals?.rsi || 'N/A'}</span>
                              </div>
                              <div className="signal">
                                <label>MACD</label>
                                <span>{position.signals?.macd?.value || 'N/A'}</span>
                              </div>
                              <div className="signal">
                                <label>Volume Profile</label>
                                <span>{position.signals?.volume_profile || 'N/A'}</span>
                              </div>
                              <div className="signal">
                                <label>Predicted Move</label>
                                <span>
                                  {position.signals?.predicted_move
                                    ? formatPercentage(position.signals.predicted_move)
                                    : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default PortfolioList;
