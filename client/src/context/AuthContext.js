import React, { createContext, useState, useEffect } from 'react';
import { login, getCurrentUser } from '../services/api';

// Create the auth context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on initial load
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const userData = await getCurrentUser();
          setUser(userData);
        } catch (err) {
          console.error('Error loading user:', err);
          // If token is invalid, clear it
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  // Login function
  const handleLogin = async (username, password) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Attempting login with:', { username, passwordLength: password?.length });
      const data = await login(username, password);
      
      // Save token to localStorage
      localStorage.setItem('token', data.token);
      
      // Set user and token in state
      setUser(data.user);
      setToken(data.token);
      
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
      setError(`${errorMessage} (${err.message})`);
      setLoading(false);
      return false;
    }
  };

  // Logout function
  const handleLogout = () => {
    // Remove token from localStorage
    localStorage.removeItem('token');
    
    // Clear user and token from state
    setUser(null);
    setToken(null);
  };

  // Check if user is admin
  const isAdmin = user?.isAdmin || false;

  // Check if user is authenticated
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        isAdmin,
        isAuthenticated,
        login: handleLogin,
        logout: handleLogout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 