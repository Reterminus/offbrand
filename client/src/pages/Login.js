import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { initAdmin } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, error: authError, loading } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState(null);
  const [initMessage, setInitMessage] = useState(null);
  const [initLoading, setInitLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    if (!formData.username || !formData.password) {
      setError('Please enter both username and password');
      return;
    }
    
    // Attempt login
    const success = await login(formData.username, formData.password);
    
    if (success) {
      navigate('/');
    }
  };

  const handleInitAdmin = async () => {
    setInitLoading(true);
    setInitMessage(null);
    setError(null);
    
    try {
      const response = await initAdmin();
      
      // Check if credentials were returned in the response
      if (response.credentials) {
        setFormData({
          username: response.credentials.username,
          password: response.credentials.password
        });
        setInitMessage(`Admin user created successfully. Username and password have been filled in for you.`);
      } else {
        setInitMessage(response.message || 'Admin user created successfully. Username: dumpster, Password: @bsolutemor@lity');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initialize admin user. It may already exist.');
    } finally {
      setInitLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1 className="login-title">Login</h1>
        
        {(error || authError) && (
          <div className="error-message">
            {error || authError}
          </div>
        )}
        
        {initMessage && (
          <div className="success-message">
            {initMessage}
          </div>
        )}
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              className="form-control"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter username"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-control"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn login-btn"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        {/* Admin initialization section - commented out after initial setup
        <div className="init-admin-section">
          <p>First time setup? Initialize the admin account:</p>
          <button 
            className="btn btn-secondary init-btn"
            onClick={handleInitAdmin}
            disabled={initLoading}
          >
            {initLoading ? 'Initializing...' : 'Initialize Admin User'}
          </button>
          <small className="form-text">
            This will create an admin user with username: dumpster and password: @bsolutemor@lity
          </small>
        </div>
        */}
      </div>
    </div>
  );
};

export default Login; 