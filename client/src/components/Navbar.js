import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, isAdmin, logout } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu when Escape key is pressed
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    // Prevent scrolling when menu is open
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          off-brand-print
        </Link>
        
        {/* Hamburger Menu Button (Mobile) */}
        <div className="hamburger-menu" onClick={toggleMenu}>
          <div className={`hamburger-line ${menuOpen ? 'open' : ''}`}></div>
          <div className={`hamburger-line ${menuOpen ? 'open' : ''}`}></div>
          <div className={`hamburger-line ${menuOpen ? 'open' : ''}`}></div>
        </div>
        
        {/* Backdrop (appears when mobile menu is open) */}
        {menuOpen && <div className="navbar-backdrop" onClick={closeMenu}></div>}
        
        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/" className="navbar-link" onClick={closeMenu}>
            Cards
          </Link>
          <Link to="/sets" className="navbar-link" onClick={closeMenu}>
            Sets
          </Link>
          <Link to="/keywords" className="navbar-link" onClick={closeMenu}>
            Keywords
          </Link>
          <Link to="/deck-builder" className="navbar-link" onClick={closeMenu}>
            Deck Builder
          </Link>
          <Link to="/take-two" className="navbar-link" onClick={closeMenu}>
            Take Two
          </Link>
          
          {/* Admin-only links */}
          {isAdmin && (
            <>
              <Link to="/create" className="navbar-link" onClick={closeMenu}>
                Create Card
              </Link>
              <Link to="/sets/create" className="navbar-link" onClick={closeMenu}>
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
            <Link to="/login" className="navbar-link" onClick={closeMenu}>
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 