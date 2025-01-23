import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getCurrentPrice, updatePosition, deletePosition } from '../services/api.js';
import './PortfolioList.css';

function PortfolioList() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPosition, setEditingPosition] = useState(null);

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
      const portfolioResponse = await axios.get('http://localhost:3000/api/portfolio');
      const portfolioPositions = portfolioResponse.data;
      
      // Update each position with current price
      const updatedPositions = await Promise.all(
        portfolioPositions.map(async (position) => {
            try {
                // Fetch current price
                const priceResponse = await getCurrentPrice(position.symbol);
                const currentPrice = priceResponse.data.currentPrice;
                console.log(`Current price for ${position.symbol}: ${currentPrice}`);
                // Calculate profit/loss and percentage change
                const profitLoss = currentPrice - position.entryPrice;
                const percentageChange = calculatePercentageChange(position.entryPrice, currentPrice);
    
                // Update position on backend
                const updateResponse = await updatePosition(position._id, {
                  currentPrice,
                  profitLoss,
                  percentageChange
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

  // Delete Position Handler
  const handleDeletePosition = async (positionId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this position?');
    
    if (confirmDelete) {
      try {
        await deletePosition(positionId);
        
        // Remove position from local state
        setPositions(positions.filter(pos => pos._id !== positionId));
        
        alert('Position deleted successfully');
      } catch (error) {
        console.error('Delete Error:', error);
        alert(`Failed to delete position: ${error.response?.data?.details || error.message}`);
      }
    }
  };

  // Edit Position Handler
  const handleEditPosition = (position) => {
    setEditingPosition(position);
  };

  // Save Edited Position
  const saveEditedPosition = async () => {
    try {
      // Update position on backend
      const updatedPosition = await axios.put(`http://localhost:3000/api/positions/${editingPosition._id}`, editingPosition);
      
      // Update local state
      setPositions(positions.map(pos => 
        pos._id === editingPosition._id ? updatedPosition.data : pos
      ));

      // Close edit modal
      setEditingPosition(null);
      alert('Position updated successfully');
    } catch (error) {
      console.error('Error updating position', error);
      alert('Failed to update position');
    }
  };

  if (loading) return <div>Loading portfolio...</div>;

  return (
    <div className="portfolio-container">
      <h2 className="portfolio-title">My Portfolio</h2>
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
            <th>Time Frame</th>
            <th>Status</th>
            <th>Actions</th>
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
                  {new Date(position.startDate).toLocaleDateString()}
                </td>
                <td>
                  {position.targetDate 
                    ? new Date(position.targetDate).toLocaleDateString() 
                    : 'N/A'}
                </td>
                <td>{position.timeframe}</td>
                <td>{position.status}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="edit-btn"
                      onClick={() => handleEditPosition(position)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeletePosition(position._id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Edit Modal */}
      {editingPosition && (
        <div className="edit-modal">
          <div className="edit-modal-content">
            <h2>Edit Position</h2>
            <input
              type="text"
              value={editingPosition.symbol}
              onChange={(e) => setEditingPosition({
                ...editingPosition, 
                symbol: e.target.value
              })}
              placeholder="Symbol"
            />
            <input
              type="number"
              value={editingPosition.entryPrice}
              onChange={(e) => setEditingPosition({
                ...editingPosition, 
                entryPrice: parseFloat(e.target.value)
              })}
              placeholder="Entry Price"
            />
            <input
              type="number"
              value={editingPosition.targetPrice || ''}
              onChange={(e) => setEditingPosition({
                ...editingPosition, 
                targetPrice: e.target.value ? parseFloat(e.target.value) : null
              })}
              placeholder="Target Price"
            />
            <div>
              <button onClick={saveEditedPosition}>Save</button>
              <button onClick={() => setEditingPosition(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      
      {positions.length === 0 && (
        <p className="no-positions">No positions found</p>
      )}
    </div>
  );
}

export default PortfolioList;
