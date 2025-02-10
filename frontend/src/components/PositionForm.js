import React, { useState } from 'react';
import { addPosition } from '../services/api';
import './PositionForm.css';

function PositionForm() {
  const [formData, setFormData] = useState({
    ticker: '',
    entry_price: '',
    timeframe: '',
    technical_score: '',
    fundamental_score: '',
    news_score: '',
    support_levels: '',  // Will be converted to array
    resistance_levels: '', // Will be converted to array
    trend: {
      direction: 'neutral',
      strength: 50,
      ma_alignment: false
    },
    signals: {
      rsi: '',
      macd: {
        value: '',
        signal: 'hold'
      },
      volume_profile: '',
      predicted_move: ''
    }
  });

  // Handle input changes for basic fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Handle trend changes
  const handleTrendChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevState => ({
      ...prevState,
      trend: {
        ...prevState.trend,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };

  // Handle signals changes
  const handleSignalsChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prevState => ({
        ...prevState,
        signals: {
          ...prevState.signals,
          [parent]: {
            ...prevState.signals[parent],
            [child]: value
          }
        }
      }));
    } else {
      setFormData(prevState => ({
        ...prevState,
        signals: {
          ...prevState.signals,
          [name]: value
        }
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Convert string inputs to appropriate types
      const positionData = {
        ...formData,
        entry_price: parseFloat(formData.entry_price),
        technical_score: formData.technical_score ? parseFloat(formData.technical_score) : null,
        fundamental_score: formData.fundamental_score ? parseFloat(formData.fundamental_score) : null,
        news_score: formData.news_score ? parseFloat(formData.news_score) : null,
        support_levels: formData.support_levels
          ? formData.support_levels.split(',').map(level => parseFloat(level.trim()))
          : [],
        resistance_levels: formData.resistance_levels
          ? formData.resistance_levels.split(',').map(level => parseFloat(level.trim()))
          : [],
        signals: {
          ...formData.signals,
          rsi: formData.signals.rsi ? parseFloat(formData.signals.rsi) : null,
          macd: {
            ...formData.signals.macd,
            value: formData.signals.macd.value ? parseFloat(formData.signals.macd.value) : null
          },
          predicted_move: formData.signals.predicted_move 
            ? parseFloat(formData.signals.predicted_move) 
            : null
        }
      };

      const response = await addPosition(positionData);
      console.log('Position Added:', response.data);
      
      // Reset form
      setFormData({
        ticker: '',
        entry_price: '',
        timeframe: '',
        technical_score: '',
        fundamental_score: '',
        news_score: '',
        support_levels: '',
        resistance_levels: '',
        trend: {
          direction: 'neutral',
          strength: 50,
          ma_alignment: false
        },
        signals: {
          rsi: '',
          macd: {
            value: '',
            signal: 'hold'
          },
          volume_profile: '',
          predicted_move: ''
        }
      });

      alert('Position added successfully');
    } catch (error) {
      console.error('Error adding position:', error);
      alert(`Failed to add position: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div className="position-form-container">
      <h2>Add New Position</h2>
      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className="form-section">
          <h3>Basic Information</h3>
          <div className="form-group">
            <label>Ticker</label>
            <input
              type="text"
              name="ticker"
              value={formData.ticker}
              onChange={handleChange}
              placeholder="Stock Ticker"
              required
            />
          </div>

          <div className="form-group">
            <label>Entry Price</label>
            <input
              type="number"
              name="entry_price"
              value={formData.entry_price}
              onChange={handleChange}
              placeholder="Entry Price"
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label>Timeframe</label>
            <select
              name="timeframe"
              value={formData.timeframe}
              onChange={handleChange}
              required
            >
              <option value="">Select Timeframe</option>
              <option value="medium">Medium Term</option>
              <option value="long">Long Term</option>
            </select>
          </div>
        </div>

        {/* Scores */}
        <div className="form-section">
          <h3>Analysis Scores</h3>
          <div className="form-group">
            <label>Technical Score (0-100)</label>
            <input
              type="number"
              name="technical_score"
              value={formData.technical_score}
              onChange={handleChange}
              placeholder="Technical Score"
              min="0"
              max="100"
            />
          </div>

          <div className="form-group">
            <label>Fundamental Score (0-100)</label>
            <input
              type="number"
              name="fundamental_score"
              value={formData.fundamental_score}
              onChange={handleChange}
              placeholder="Fundamental Score"
              min="0"
              max="100"
            />
          </div>

          <div className="form-group">
            <label>News Score (0-100)</label>
            <input
              type="number"
              name="news_score"
              value={formData.news_score}
              onChange={handleChange}
              placeholder="News Score"
              min="0"
              max="100"
            />
          </div>
        </div>

        {/* Technical Levels */}
        <div className="form-section">
          <h3>Technical Levels</h3>
          <div className="form-group">
            <label>Support Levels (comma-separated)</label>
            <input
              type="text"
              name="support_levels"
              value={formData.support_levels}
              onChange={handleChange}
              placeholder="e.g., 100.50, 98.75, 95.00"
            />
          </div>

          <div className="form-group">
            <label>Resistance Levels (comma-separated)</label>
            <input
              type="text"
              name="resistance_levels"
              value={formData.resistance_levels}
              onChange={handleChange}
              placeholder="e.g., 105.50, 108.25, 110.00"
            />
          </div>
        </div>

        {/* Trend Information */}
        <div className="form-section">
          <h3>Trend Analysis</h3>
          <div className="form-group">
            <label>Direction</label>
            <select
              name="direction"
              value={formData.trend.direction}
              onChange={handleTrendChange}
            >
              <option value="neutral">Neutral</option>
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
            </select>
          </div>

          <div className="form-group">
            <label>Strength (0-100)</label>
            <input
              type="number"
              name="strength"
              value={formData.trend.strength}
              onChange={handleTrendChange}
              min="0"
              max="100"
            />
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                name="ma_alignment"
                checked={formData.trend.ma_alignment}
                onChange={handleTrendChange}
              />
              Moving Averages Aligned
            </label>
          </div>
        </div>

        {/* Technical Signals */}
        <div className="form-section">
          <h3>Technical Signals</h3>
          <div className="form-group">
            <label>RSI</label>
            <input
              type="number"
              name="rsi"
              value={formData.signals.rsi}
              onChange={handleSignalsChange}
              placeholder="RSI Value"
              min="0"
              max="100"
            />
          </div>

          <div className="form-group">
            <label>MACD Value</label>
            <input
              type="number"
              name="macd.value"
              value={formData.signals.macd.value}
              onChange={handleSignalsChange}
              placeholder="MACD Value"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label>MACD Signal</label>
            <select
              name="macd.signal"
              value={formData.signals.macd.signal}
              onChange={handleSignalsChange}
            >
              <option value="hold">Hold</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>

          <div className="form-group">
            <label>Volume Profile</label>
            <select
              name="volume_profile"
              value={formData.signals.volume_profile}
              onChange={handleSignalsChange}
            >
              <option value="">Select Volume Profile</option>
              <option value="increasing">Increasing</option>
              <option value="decreasing">Decreasing</option>
            </select>
          </div>

          <div className="form-group">
            <label>Predicted Move (%)</label>
            <input
              type="number"
              name="predicted_move"
              value={formData.signals.predicted_move}
              onChange={handleSignalsChange}
              placeholder="Predicted Price Movement"
              step="0.01"
            />
          </div>
        </div>

        <button type="submit" className="submit-button">Add Position</button>
      </form>
    </div>
  );
}

export default PositionForm;
