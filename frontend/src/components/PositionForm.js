import React, { useState } from 'react';
import axios from 'axios';

function PositionForm() {
  // Initial state with today's date
  const [formData, setFormData] = useState({
    symbol: '',
    entryPrice: '',
    currentPrice: '',
    targetPrice: '',
    entryDate: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
    targetDate: '', 
    timeframe: ''
  });

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.symbol || !formData.entryPrice || !formData.targetDate) {
      alert('Please fill in required fields');
      return;
    }

    try {
      // Prepare submission data
      const positionData = {
        symbol: formData.symbol.toUpperCase(),
        entryPrice: parseFloat(formData.entryPrice),
        currentPrice: formData.currentPrice ? parseFloat(formData.currentPrice) : null,
        targetPrice: formData.targetPrice ? parseFloat(formData.targetPrice) : null,
        entryDate: new Date(formData.entryDate).toISOString(),
        targetDate: new Date(formData.targetDate).toISOString(),
        timeframe: formData.timeframe
      };

      // Send POST request
      const response = await axios.post('/api/positions', positionData);
      
      console.log('Position Added:', response.data);
      
      // Reset form after successful submission
      setFormData({
        symbol: '',
        entryPrice: '',
        currentPrice: '',
        targetPrice: '',
        entryDate: new Date().toISOString().split('T')[0],
        targetDate: '', 
        timeframe: ''
      });

      alert('Position added successfully');
    } catch (error) {
      console.error('Error adding position', error.response?.data || error);
      alert(`Failed to add position: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div>
      <h2>Add New Position</h2>
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
          <label>Entry Date</label>
          <input
            type="date"
            name="entryDate"
            value={formData.entryDate}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Target Date</label>
          <input
            type="date"
            name="targetDate"
            value={formData.targetDate}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Timeframe</label>
          <select
            name="timeframe"
            value={formData.timeframe}
            onChange={handleChange}
          >
            <option value="">Select Timeframe</option>
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
