import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          off-brand-print
        </Link>
        <div className="navbar-links">
          <Link to="/" className="navbar-link">
            Cards
          </Link>
          <Link to="/create" className="navbar-link">
            Create Card
          </Link>
          <Link to="/sets" className="navbar-link">
            Sets
          </Link>
          <Link to="/sets/create" className="navbar-link">
            Create Set
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 