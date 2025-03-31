import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSet, updateSet } from '../services/api';

const EditSet = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hidden: false
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSet = async () => {
      try {
        const setData = await getSet(id);
        setFormData({
          name: setData.name,
          description: setData.description || '',
          hidden: setData.hidden || false
        });
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch set details. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchSet();
  }, [id]);

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
      setError('Please provide a set name.');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      await updateSet(id, formData);
      navigate('/sets');
    } catch (err) {
      setError('Failed to update set. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading set details...</div>;
  }

  return (
    <div className="edit-set-page">
      <div className="header">
        <h1>Edit Set</h1>
      </div>
      
      <form className="create-set-form" onSubmit={handleSubmit}>
        <h2 className="form-title">Update Set Details</h2>
        
        {error && <div className="error">{error}</div>}
        
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
            disabled={submitting}
          >
            {submitting ? 'Updating...' : 'Update Set'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditSet; 