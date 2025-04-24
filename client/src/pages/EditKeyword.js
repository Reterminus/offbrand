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
    imageUrl: '',
    imagePosition: '50% 50%',
    imageZoom: 100,
    image: null,
    imageSource: 'url'
  });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [imageZoom, setImageZoom] = useState(100);
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fetchKeyword = async () => {
      try {
        setLoading(true);
        const keyword = await getKeyword(id);
        
        // Parse the image position to get x and y values if available
        let posX = 50, posY = 50;
        if (keyword.imagePosition && keyword.imagePosition.includes('%')) {
          const [x, y] = keyword.imagePosition.split(' ').map(val => 
            parseInt(val.replace('%', ''), 10)
          );
          if (!isNaN(x) && !isNaN(y)) {
            posX = x;
            posY = y;
          }
        }
        
        setFormData({
          title: keyword.title,
          description: keyword.description,
          imageUrl: keyword.imageUrl,
          imagePosition: keyword.imagePosition || '50% 50%',
          imageZoom: keyword.imageZoom || 100,
          image: null,
          imageSource: 'url'
        });
        setPreview(keyword.imageUrl);
        setImageZoom(keyword.imageZoom || 100);
        setImagePosition({ x: posX, y: posY });
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

  // Handle position change from the position selector (now only used for presets)
  const handlePositionChange = (position) => {
    if (position.includes('%')) {
      const [x, y] = position.split(' ').map(val => 
        parseInt(val.replace('%', ''), 10)
      );
      if (!isNaN(x) && !isNaN(y)) {
        setImagePosition({ x, y });
      }
    }
    setFormData({
      ...formData,
      imagePosition: position
    });
  };
  
  // Update formData when imagePosition changes from dragging
  useEffect(() => {
    if (isDragging) return; // Don't update during drag to prevent flicker
    
    setFormData({
      ...formData,
      imagePosition: `${imagePosition.x}% ${imagePosition.y}%`
    });
  }, [imagePosition]);
  
  // Update formData when zoom changes
  useEffect(() => {
    setFormData({
      ...formData,
      imageZoom: imageZoom
    });
  }, [imageZoom]);

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
      data.append('imagePosition', `${imagePosition.x}% ${imagePosition.y}%`);
      data.append('imageZoom', imageZoom || 100);
      
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
        
        {preview && (
          <div className="form-group">
            <label>Image Position</label>
            
            <div className="position-selector-container">
              <div className="position-preset-dropdown">
                <label htmlFor="imagePosition">Preset Positions</label>
                <select
                  id="imagePosition"
                  name="imagePosition"
                  className="form-control"
                  value={formData.imagePosition}
                  onChange={(e) => handlePositionChange(e.target.value)}
                >
                  <option value="50% 50%">Center</option>
                  <option value="50% 0%">Top</option>
                  <option value="50% 100%">Bottom</option>
                  <option value="0% 50%">Left</option>
                  <option value="100% 50%">Right</option>
                  <option value="0% 0%">Top Left</option>
                  <option value="100% 0%">Top Right</option>
                  <option value="0% 100%">Bottom Left</option>
                  <option value="100% 100%">Bottom Right</option>
                </select>
              </div>
              
              <div className="zoom-control">
                <label htmlFor="image-zoom">Zoom:</label>
                <input 
                  type="range" 
                  id="image-zoom" 
                  min="100" 
                  max="300" 
                  value={imageZoom || 100} 
                  onChange={(e) => setImageZoom(parseInt(e.target.value))}
                  className="zoom-slider"
                />
                <div className="zoom-input-container">
                  <input
                    type="number"
                    min="100"
                    max="300"
                    value={imageZoom || 100}
                    onChange={(e) => setImageZoom(Math.min(300, Math.max(100, parseInt(e.target.value) || 100)))}
                    className="zoom-text-input"
                  />
                  <span className="zoom-unit">%</span>
                </div>
              </div>
              
              <div className="position-buttons">
                <button 
                  type="button" 
                  className="reset-position-btn"
                  onClick={() => {
                    setImagePosition({ x: 50, y: 50 });
                    setImageZoom(100);
                  }}
                >
                  Reset Position
                </button>
              </div>
            </div>
            
            {/* Advanced drag to position area */}
            <div 
              className="draggable-image-container"
              style={{
                position: 'relative',
                height: '200px',
                overflow: 'hidden',
                borderRadius: '8px',
                cursor: isDragging ? 'grabbing' : 'grab',
                margin: '10px 0'
              }}
              onMouseDown={(e) => {
                setIsDragging(true);
                setDragStart({
                  x: e.clientX,
                  y: e.clientY
                });
              }}
              onMouseMove={(e) => {
                if (!isDragging) return;
                
                const deltaX = e.clientX - dragStart.x;
                const deltaY = e.clientY - dragStart.y;
                
                // Calculate new position as percentage
                const newX = Math.max(0, Math.min(100, imagePosition.x - (deltaX / 5)));
                const newY = Math.max(0, Math.min(100, imagePosition.y - (deltaY / 5)));
                
                setImagePosition({
                  x: newX,
                  y: newY
                });
                
                setDragStart({
                  x: e.clientX,
                  y: e.clientY
                });
              }}
              onMouseUp={() => {
                setIsDragging(false);
              }}
              onMouseLeave={() => {
                setIsDragging(false);
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.4)), url(${preview})`,
                  backgroundPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                  backgroundSize: `${imageZoom || 100}%`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold'
                }}
              >
                <span>Drag to position • Slide to zoom</span>
              </div>
            </div>
            
            <div className="image-editor-help">
              <small>Drag the image to adjust position. Use the slider to zoom in/out. Changes apply automatically.</small>
            </div>
            
            {/* Image preview with current settings */}
            <div className="keyword-preview">
              <div 
                className="keyword-banner-preview"
                style={{
                  backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.4)), url(${preview})`,
                  backgroundPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                  backgroundSize: `${imageZoom}%`,
                  height: '80px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold'
                }}
              >
                <span>Preview - {formData.title || "Keyword Title"}</span>
              </div>
            </div>
          </div>
        )}
        
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