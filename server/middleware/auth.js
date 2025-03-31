const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('x-auth-token');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Attach user info to request
      req.user = {
        id: decoded.id,
        username: decoded.username,
        isAdmin: decoded.isAdmin
      };
      
      next();
    } catch (err) {
      res.status(401).json({ message: 'Token is not valid' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// A version of auth that doesn't require a token, but will use it if present
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('x-auth-token');
    
    // If no token, just continue as non-authenticated user
    if (!token) {
      req.user = null;
      return next();
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Attach user info to request
      req.user = {
        id: decoded.id,
        username: decoded.username,
        isAdmin: decoded.isAdmin
      };
      
      next();
    } catch (err) {
      // Invalid token, but we'll still let them through as non-authenticated
      req.user = null;
      next();
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Middleware to check if user is admin
const adminMiddleware = async (req, res, next) => {
  try {
    // First apply the auth middleware
    authMiddleware(req, res, () => {
      // Check if user is admin
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }
      
      next();
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { 
  auth: authMiddleware, 
  admin: adminMiddleware,
  optionalAuth: optionalAuthMiddleware
}; 