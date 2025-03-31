import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSet } from '../services/api';

const CreateSet = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hidden: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      setError('Please enter a set name.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await createSet(formData);
      navigate('/sets');
    } catch (err) {
      setError('Failed to create set. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="create-set-page">
      <div className="header">
        <h1>Create New Set</h1>
      </div>
      
      {error && <div className="error">{error}</div>}
      
      <form className="create-set-form" onSubmit={handleSubmit}>
        <h2 className="form-title">Set Details</h2>
        
        <div className="form-group">
          <label htmlFor="name">Set Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            className="form-control"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter set name"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description (Optional)</label>
          <textarea
            id="description"
            name="description"
            className="form-control"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter set description"
            rows="4"
          ></textarea>
        </div>
        
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="hidden"
              checked={formData.hidden}
              onChange={handleChange}
            />
            Hidden Set (Only visible to admins; cards won't appear in lists)
          </label>
          <p className="form-text text-muted">
            When a set is hidden, its cards will only be accessible from the set page or through related cards.
          </p>
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/sets')}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn submit-btn"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Set'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSet; 