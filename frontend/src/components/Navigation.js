import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

function Navigation() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          Portfolio Tracker
        </div>
        <ul className="nav-links">
          <li>
            <Link 
              to="/" 
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
            >
              Portfolio
            </Link>
          </li>
          <li>
            <Link 
              to="/performance" 
              className={`nav-link ${isActive('/performance') ? 'active' : ''}`}
            >
              Performance
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navigation;
