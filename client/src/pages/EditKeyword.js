import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getKeyword, updateKeyword } from '../services/api';
import ImagePositionSelector from '../components/ImagePositionSelector';

const EditKeyword = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imagePosition: '50% 50%',
    image: null
  });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchKeyword = async () => {
      try {
        const data = await getKeyword(id);
        setFormData({
          title: data.title,
          description: data.description,
          imagePosition: data.imagePosition || '50% 50%',
          image: null
        });
        setPreview(data.imageUrl);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch keyword. Please try again later.');
        setLoading(false);
      }
    };

    fetchKeyword();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        image: file
      });
      
      // Create a preview URL for the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePositionChange = (position) => {
    setFormData({
      ...formData,
      imagePosition: position
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.title || !formData.description) {
      setError('Please fill in all required fields.');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('imagePosition', formData.imagePosition);
      
      if (formData.image) {
        data.append('image', formData.image);
      }
      
      await updateKeyword(id, data);
      navigate('/keywords');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update keyword. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading keyword details...</div>;
  }

  if (error && !submitting) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="edit-keyword-page">
      <div className="header">
        <h1>Edit Keyword</h1>
      </div>
      
      <form className="edit-keyword-form" onSubmit={handleSubmit}>
        <h2 className="form-title">Keyword Details</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            className="form-control"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter keyword title"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            className="form-control"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter keyword description"
            rows="4"
            required
          ></textarea>
        </div>
        
        <div className="form-group">
          <label htmlFor="image">Background Image</label>
          <input
            type="file"
            id="image"
            name="image"
            className="form-control"
            onChange={handleImageChange}
            accept="image/*"
          />
          <small className="form-text">
            Upload a new background image or leave empty to keep the current one.
          </small>
        </div>
        
        {preview && (
          <div className="form-group">
            <label>Image Position</label>
            <ImagePositionSelector 
              imageUrl={preview}
              initialPosition={formData.imagePosition}
              onChange={handlePositionChange}
            />
            <small className="form-text">
              Drag to adjust how the image is positioned in the keyword card.
            </small>
          </div>
        )}
        
        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/keywords')}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditKeyword; 