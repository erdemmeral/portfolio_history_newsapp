import React from 'react';
import { Link } from 'react-router-dom';

function Navigation() {
  return (
    <nav>
      <ul style={{ display: 'flex', listStyle: 'none', padding: 0 }}>
        <li style={{ margin: '0 10px' }}>
          <Link to="/">Portfolio</Link>
        </li>
        <li style={{ margin: '0 10px' }}>
          <Link to="/add-position">Add Position</Link>
        </li>
        <li style={{ margin: '0 10px' }}>
          <Link to="/performance">Performance</Link>
        </li>
      </ul>
    </nav>
  );
}

export default Navigation;
