import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, isAdmin, logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
  };

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
          <Link to="/sets" className="navbar-link">
            Sets
          </Link>
          <Link to="/keywords" className="navbar-link">
            Keywords
          </Link>
          <Link to="/deck-builder" className="navbar-link">
            Deck Builder
          </Link>
          
          {/* Admin-only links */}
          {isAdmin && (
            <>
              <Link to="/create" className="navbar-link">
                Create Card
              </Link>
              <Link to="/sets/create" className="navbar-link">
                Create Set
              </Link>
            </>
          )}
          
          {/* Authentication links */}
          {isAuthenticated ? (
            <div className="navbar-auth">
              <button 
                className="navbar-logout" 
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="navbar-link">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 