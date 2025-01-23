import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import PortfolioList from './components/PortfolioList';
import PositionForm from './components/PositionForm';
import PerformanceDashboard from './components/PerformanceDashboard';

function App() {
  return (
    <Router>
      <div>
        <Navigation />
        
        <Routes>
          <Route path="/" element={<PortfolioList />} />
          <Route path="/portfolio" element={<PortfolioList />} />
          <Route path="/add-position" element={<PositionForm />} />
          <Route path="/performance" element={<PerformanceDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;