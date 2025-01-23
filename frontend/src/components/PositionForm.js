import React, { useState } from 'react';
import { addPosition } from '../services/api';

function PositionForm() {
  const [formData, setFormData] = useState({
    symbol: '',
    entryPrice: '',
    currentPrice: '',
    targetPrice: '',
    startDate: new Date(),
    targetDate: '',
    timeframe: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.symbol || !formData.entryPrice) {
      alert('Please fill in required fields');
      return;
    }

    try {
      // Prepare submission data
      const submissionData = {
        symbol: formData.symbol.toUpperCase(),
        entryPrice: parseFloat(formData.entryPrice),
        currentPrice: formData.currentPrice ? parseFloat(formData.currentPrice) : null,
        targetPrice: formData.targetPrice ? parseFloat(formData.targetPrice) : null,
        startDate: formData.startDate,
        targetDate: formData.targetDate ? new Date(formData.targetDate) : null,
        timeframe: formData.timeframe,
        status: 'ACTIVE'
      };

      console.log('Submission Data:', submissionData);

      // Add position
      const response = await addPosition(submissionData);

      console.log('Position Added Successfully:', response);

      // Reset form
      setFormData({
        symbol: '',
        entryPrice: '',
        currentPrice: '',
        targetPrice: '',
        startDate: new Date(),
        targetDate: '',
        timeframe: '1wk'
      });

      alert('Position added successfully');
    } catch (error) {
      console.error('DETAILED Frontend Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      alert(`Failed to add position: ${error.message}`);
    }
  };

  return (
    <div>
      <h2>Add Position</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Symbol</label>
          <input
            type="text"
            name="symbol"
            value={formData.symbol}
            onChange={handleChange}
            placeholder="Stock Symbol"
            required
          />
        </div>
        <div>
          <label>Entry Price</label>
          <input
            type="number"
            name="entryPrice"
            value={formData.entryPrice}
            onChange={handleChange}
            placeholder="Entry Price"
            step="0.01"
            required
          />
        </div>
        <div>
          <label>Current Price (Optional)</label>
          <input
            type="number"
            name="currentPrice"
            value={formData.currentPrice}
            onChange={handleChange}
            placeholder="Current Price"
            step="0.01"
          />
        </div>
        <div>
          <label>Target Price (Optional)</label>
          <input
            type="number"
            name="targetPrice"
            value={formData.targetPrice}
            onChange={handleChange}
            placeholder="Target Price"
            step="0.01"
          />
        </div>
        <div>
          <label>Start Date</label>
          <input
            type="date"
            name="startDate"
            value={formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : ''}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Target Date (Optional)</label>
          <input
            type="date"
            name="targetDate"
            value={formData.targetDate ? new Date(formData.targetDate).toISOString().split('T')[0] : ''}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Timeframe</label>
          <select
            name="timeframe"
            value={formData.timeframe}
            onChange={handleChange}
          >
            <option value="1h">1 Hour</option>
            <option value="1wk">1 Week</option>
            <option value="1mo">1 Month</option>
          </select>
        </div>
        <button type="submit">Add Position</button>
      </form>
    </div>
  );
}

export default PositionForm;