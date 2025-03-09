import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getKeyword, updateKeyword } from '../services/api';
import ImagePositionSelector from '../components/ImagePositionSelector';

const EditKeyword = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: null,
    imageUrl: '',
    imageSource: 'url', // Default to 'url' since we'll be loading an existing image
    imagePosition: '50% 50%'
  });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchKeyword = async () => {
      try {
        setLoading(true);
        const data = await getKeyword(id);
        setFormData({
          title: data.title,
          description: data.description,
          image: null,
          imageUrl: data.imageUrl || '',
          imageSource: 'url',
          imagePosition: data.imagePosition || '50% 50%'
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
        image: file,
        imageUrl: '',
        imageSource: 'file'
      });
      
      // Create a preview URL for the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlChange = (e) => {
    const url = e.target.value;
    setFormData({
      ...formData,
      imageUrl: url,
      image: null,
      imageSource: 'url'
    });
    setPreview(url);
  };

  const handleImageSourceChange = (source) => {
    setFormData({
      ...formData,
      imageSource: source,
      image: null,
      imageUrl: formData.imageUrl && source === 'url' ? formData.imageUrl : ''
    });
    setPreview(source === 'url' ? formData.imageUrl : null);
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
    if (!formData.title || !formData.description || (!formData.image && !formData.imageUrl)) {
      setError('Please fill in all required fields and provide an image.');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('imagePosition', formData.imagePosition);
      
      // Append either the file or the URL
      if (formData.imageSource === 'file' && formData.image) {
        data.append('image', formData.image);
      } else if (formData.imageSource === 'url' && formData.imageUrl) {
        data.append('imageUrl', formData.imageUrl);
      }
      
      await updateKeyword(id, data);
      navigate('/keywords');
    } catch (err) {
      setError('Failed to update keyword. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="edit-keyword-page">
      <div className="header">
        <h1>Edit Keyword</h1>
      </div>
      
      <form className="edit-keyword-form" onSubmit={handleSubmit}>
        <h2 className="form-title">Keyword Details</h2>
        
        {error && <div className="error">{error}</div>}
        
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
          <label>Keyword Image Source</label>
          <div className="image-source-toggle">
            <button
              type="button"
              className={`btn ${formData.imageSource === 'file' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleImageSourceChange('file')}
            >
              Upload File
            </button>
            <button
              type="button"
              className={`btn ${formData.imageSource === 'url' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleImageSourceChange('url')}
            >
              Image URL
            </button>
          </div>
        </div>

        {formData.imageSource === 'file' ? (
          <div className="form-group">
            <label htmlFor="image">Keyword Image {!preview && '*'}</label>
            <input
              type="file"
              id="image"
              name="image"
              className="form-control"
              onChange={handleImageChange}
              accept="image/*"
              required={formData.imageSource === 'file' && !preview}
            />
            <small className="form-text">
              Upload a new image for your keyword or keep the existing one. Max size: 5MB. Supported formats: JPEG, PNG, GIF.
            </small>
          </div>
        ) : (
          <div className="form-group">
            <label htmlFor="imageUrl">Image URL {!preview && '*'}</label>
            <input
              type="url"
              id="imageUrl"
              name="imageUrl"
              className="form-control"
              value={formData.imageUrl}
              onChange={handleImageUrlChange}
              placeholder="Enter image URL (e.g., https://imgur.com/your-image.jpg)"
              required={formData.imageSource === 'url' && !preview}
            />
            <small className="form-text">
              Enter a direct link to your image. Imgur and similar image hosting services are supported.
            </small>
          </div>
        )}
        
        <div className="image-preview">
          {preview ? (
            <img 
              src={preview} 
              alt="Keyword preview" 
              onError={() => {
                setPreview(null);
                if (formData.imageSource === 'url') {
                  setError('Failed to load image. Please check the URL and try again.');
                }
              }}
            />
          ) : (
            <div className="image-preview-text">No image available</div>
          )}
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="btn submit-btn" 
            disabled={submitting}
          >
            {submitting ? 'Updating...' : 'Update Keyword'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditKeyword; 