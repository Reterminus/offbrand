import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCard, getSets, addCardToSet, getKeywords, getCards } from '../services/api';

const CreateCard = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    cardType: 'Follower',
    trait: '',
    isToken: false,
    cost: 0,
    rarity: '',
    class: '',
    unevolvedAttack: 0,
    unevolvedDefense: 0,
    evolvedAttack: 0,
    evolvedDefense: 0,
    unevolvedDescription: '',
    evolvedDescription: '',
    spellDescription: '',
    amuletDescription: '',
    notes: '',
    creator: '',
    image: null,
    imageUrl: '',
    imageSource: 'url', // Changed default to 'url'
    bannerImageUrl: '', // Add banner image URL for deck display
    bannerImagePosition: '50% 50%', // Add banner image position
    setId: '', // Added setId field
    keywords: [],
    relatedCards: []
  });
  const [preview, setPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null); // Add banner preview state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sets, setSets] = useState([]); // Added state for sets
  const [keywords, setKeywords] = useState([]);
  const [allCards, setAllCards] = useState([]);

  // Add state for draggable banner image
  const [bannerZoom, setBannerZoom] = useState(100);
  const [bannerPosition, setBannerPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Add state for searching related cards
  const [relatedCardSearch, setRelatedCardSearch] = useState('');
  const [filteredRelatedCards, setFilteredRelatedCards] = useState([]);

  // Add refs for each description textarea
  const unevolvedDescRef = useRef(null);
  const evolvedDescRef = useRef(null);
  const spellDescRef = useRef(null);
  const amuletDescRef = useRef(null);

  // Fetch available sets, keywords, and cards when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [setsData, keywordsData, cardsData] = await Promise.all([
          getSets(),
          getKeywords(),
          getCards(false) // Pass false to get all cards including from hidden sets
        ]);
        setSets(setsData);
        setKeywords(keywordsData);
        setAllCards(cardsData);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Special handling for card type changes
    if (name === 'cardType') {
      setFormData({
        ...formData,
        cardType: value
      });
      return;
    }
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : 
              (type === 'number' ? (value === '' ? 0 : Number(value)) : value)
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
      imageUrl: ''
    });
    setPreview(null);
  };

  // Handle banner image URL change
  const handleBannerImageChange = (e) => {
    const url = e.target.value;
    setFormData({
      ...formData,
      bannerImageUrl: url
    });
    setBannerPreview(url);
  };

  // Handle banner image position change
  const handleBannerPositionChange = (e) => {
    const position = e.target.value;
    setFormData({
      ...formData,
      bannerImagePosition: position
    });
    
    // Update the bannerPosition state for the advanced editor
    const [xPos, yPos] = position.split(' ').map(val => parseInt(val));
    setBannerPosition({
      x: xPos,
      y: yPos
    });
  };

  // Handle banner zoom change
  const handleBannerZoomChange = (e) => {
    setBannerZoom(parseInt(e.target.value));
  };

  // Handle drag start
  const handleDragStart = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
    e.preventDefault();
  };

  // Handle drag move
  const handleDragMove = (e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    // Calculate new position (with constraints)
    const newX = Math.max(0, Math.min(100, bannerPosition.x - dx * 0.5));
    const newY = Math.max(0, Math.min(100, bannerPosition.y - dy * 0.5));
    
    setBannerPosition({
      x: newX,
      y: newY
    });
    
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
    
    e.preventDefault();
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Reset banner position
  const resetBannerPosition = () => {
    setBannerPosition({ x: 50, y: 50 });
    setBannerZoom(100);
  };

  const handleKeywordChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData({
      ...formData,
      keywords: selectedOptions
    });
  };

  const handleRelatedCardSearch = (e) => {
    const searchTerm = e.target.value.toLowerCase();
    setRelatedCardSearch(searchTerm);
    
    if (searchTerm.trim() === '') {
      setFilteredRelatedCards([]);
      return;
    }
    
    const filtered = allCards
      .filter(card => card._id !== formData._id) // Prevent self-reference
      .filter(card => 
        card.title.toLowerCase().includes(searchTerm) ||
        card.class.toLowerCase().includes(searchTerm) ||
        card.rarity.toLowerCase().includes(searchTerm) ||
        (card.trait && card.trait.toLowerCase().includes(searchTerm))
      );
    
    setFilteredRelatedCards(filtered);
  };

  const handleAddRelatedCard = (cardId) => {
    if (!formData.relatedCards.includes(cardId)) {
      setFormData({
        ...formData,
        relatedCards: [...formData.relatedCards, cardId]
      });
    }
    setRelatedCardSearch('');
    setFilteredRelatedCards([]);
  };

  const handleRemoveRelatedCard = (cardId) => {
    setFormData({
      ...formData,
      relatedCards: formData.relatedCards.filter(id => id !== cardId)
    });
  };

  const getRelatedCardById = (cardId) => {
    return allCards.find(card => card._id === cardId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.title || !formData.rarity || !formData.class || 
        formData.cost === undefined || (!formData.image && !formData.imageUrl)) {
      setError('Please fill in all required fields and provide an image.');
      return;
    }
    
    // Card type specific validation
    if (formData.cardType === 'Follower') {
      if (formData.unevolvedAttack === undefined || formData.unevolvedDefense === undefined ||
          formData.evolvedAttack === undefined || formData.evolvedDefense === undefined) {
        setError('Please fill in all attack and defense values for the follower card.');
        return;
      }
    } else if (formData.cardType === 'Spell' && !formData.spellDescription) {
      setError('Please provide a description for the spell card.');
      return;
    } else if (formData.cardType === 'Amulet' && !formData.amuletDescription) {
      setError('Please provide a description for the amulet card.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('cardType', formData.cardType);
      data.append('trait', formData.trait);
      data.append('isToken', formData.isToken);
      data.append('cost', formData.cost);
      data.append('rarity', formData.rarity);
      data.append('class', formData.class);
      data.append('notes', formData.notes);
      data.append('creator', formData.creator);
      
      // Append banner image data
      if (formData.bannerImageUrl) {
        data.append('bannerImageUrl', formData.bannerImageUrl);
        data.append('bannerImagePosition', formData.bannerImagePosition);
      }
      
      // Append fields based on card type
      if (formData.cardType === 'Follower') {
        data.append('unevolvedAttack', formData.unevolvedAttack);
        data.append('unevolvedDefense', formData.unevolvedDefense);
        data.append('evolvedAttack', formData.evolvedAttack);
        data.append('evolvedDefense', formData.evolvedDefense);
        data.append('unevolvedDescription', formData.unevolvedDescription);
        data.append('evolvedDescription', formData.evolvedDescription);
      } else if (formData.cardType === 'Spell') {
        data.append('spellDescription', formData.spellDescription);
      } else if (formData.cardType === 'Amulet') {
        data.append('amuletDescription', formData.amuletDescription);
      }
      
      // Append either the file or the URL
      if (formData.imageSource === 'file' && formData.image) {
        data.append('image', formData.image);
      } else if (formData.imageSource === 'url' && formData.imageUrl) {
        data.append('imageUrl', formData.imageUrl);
      }
      
      // Append keywords if selected
      if (formData.keywords.length > 0) {
        data.append('keywords', JSON.stringify(formData.keywords));
      }
      
      // Append related cards if selected
      if (formData.relatedCards.length > 0) {
        data.append('relatedCards', JSON.stringify(formData.relatedCards));
      }
      
      // Create the card
      const createdCard = await createCard(data);
      
      // If a set was selected, add the card to the set
      if (formData.setId) {
        await addCardToSet(formData.setId, createdCard._id);
      }
      
      // Always navigate to the main page
      navigate('/');
    } catch (err) {
      setError('Failed to create card. Please try again.');
      setLoading(false);
    }
  };

  // Rarity options
  const rarityOptions = ['Bronze', 'Silver', 'Gold', 'Legendary'];
  
  // Class options
  const classOptions = [
    'Neutral', 'Forestcraft', 'Swordcraft', 'Runecraft', 
    'Dragoncraft', 'Shadowcraft', 'Bloodcraft', 'Havencraft', 
    'Portalcraft'
  ];
  
  // Card type options
  const cardTypeOptions = ['Follower', 'Spell', 'Amulet'];

  // Add a function to handle applying bold formatting
  const handleBoldClick = (textareaRef, fieldName) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Only apply if there's selected text
    if (start !== end) {
      const currentText = formData[fieldName];
      const selectedText = currentText.substring(start, end);
      
      // Create the new text with asterisks around the selection
      const newText = 
        currentText.substring(0, start) + 
        '**' + selectedText + '**' + 
        currentText.substring(end);
      
      // Update form data
      setFormData({
        ...formData,
        [fieldName]: newText
      });
      
      // Reset focus and set cursor position after the formatted text
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + selectedText.length + 4; // Adding 4 for the **text**
        textarea.selectionStart = newPosition;
        textarea.selectionEnd = newPosition;
      }, 10);
    }
  };

  // Add these new useEffect hooks after other state management code
  useEffect(() => {
    if (formData.bannerImageUrl) {
      setFormData(prevFormData => ({
        ...prevFormData,
        bannerImagePosition: `${bannerPosition.x}% ${bannerPosition.y}%`
      }));
    }
  }, [bannerPosition]);

  useEffect(() => {
    // This effect watches for zoom changes and updates the preview
    // No need to update formData directly for zoom
  }, [bannerZoom]);

  return (
    <div className="create-card-page">
      <div className="header">
        <h1>Create New Card</h1>
      </div>
      
      <form className="create-card-form" onSubmit={handleSubmit}>
        <h2 className="form-title">Card Details</h2>
        
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
            placeholder="Enter card title"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="creator">Creator</label>
          <input
            type="text"
            id="creator"
            name="creator"
            className="form-control"
            value={formData.creator}
            onChange={handleChange}
            placeholder="Card creator's name or username"
          />
        </div>
        
        {/* Add Set Selection */}
        <div className="form-group">
          <label htmlFor="setId">Add to Set (Optional)</label>
          <select
            id="setId"
            name="setId"
            className="form-control"
            value={formData.setId}
            onChange={handleChange}
          >
            <option value="">-- Select a Set --</option>
            {sets.map(set => (
              <option key={set._id} value={set._id}>{set.name}</option>
            ))}
          </select>
          <small className="form-text">
            If selected, the card will be added to this set upon creation.
          </small>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="cardType">Card Type *</label>
            <select
              id="cardType"
              name="cardType"
              className="form-control"
              value={formData.cardType}
              onChange={handleChange}
              required
            >
              {cardTypeOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="trait">Trait (Optional)</label>
            <input
              type="text"
              id="trait"
              name="trait"
              className="form-control"
              value={formData.trait}
              onChange={handleChange}
              placeholder="Enter card trait"
            />
          </div>
          
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isToken"
                checked={formData.isToken}
                onChange={handleChange}
              />
              Token Card
            </label>
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="cost" className="cost-label">Cost (PP) *</label>
            <input
              type="number"
              id="cost"
              name="cost"
              className="form-control"
              value={formData.cost}
              onChange={handleChange}
              placeholder="0"
              min="0"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="rarity">Rarity *</label>
            <select
              id="rarity"
              name="rarity"
              className="form-control"
              value={formData.rarity}
              onChange={handleChange}
              required
            >
              <option value="">Select Rarity</option>
              {rarityOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="class">Class *</label>
            <select
              id="class"
              name="class"
              className="form-control"
              value={formData.class}
              onChange={handleChange}
              required
            >
              <option value="">Select Class</option>
              {classOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Follower-specific fields */}
        {formData.cardType === 'Follower' && (
          <>
            <h3 className="section-title">Unevolved Stats</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="unevolvedAttack" className="attack-label">Attack *</label>
                <input
                  type="number"
                  id="unevolvedAttack"
                  name="unevolvedAttack"
                  className="form-control"
                  value={formData.unevolvedAttack}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="unevolvedDefense" className="defense-label">Defense *</label>
                <input
                  type="number"
                  id="unevolvedDefense"
                  name="unevolvedDefense"
                  className="form-control"
                  value={formData.unevolvedDefense}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="unevolvedDescription">Unevolved Description</label>
              <div className="text-formatting-toolbar">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary format-btn"
                  onClick={() => handleBoldClick(unevolvedDescRef, 'unevolvedDescription')}
                >
                  <strong>B</strong>
                </button>
              </div>
              <textarea
                id="unevolvedDescription"
                name="unevolvedDescription"
                className="form-control"
                value={formData.unevolvedDescription}
                onChange={handleChange}
                placeholder="Enter unevolved card description (optional)"
                rows="4"
                ref={unevolvedDescRef}
              ></textarea>
              <small className="form-text">
                Press Enter for line breaks. They will be preserved in the card view.
              </small>
            </div>
            
            <h3 className="section-title">Evolved Stats</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="evolvedAttack" className="attack-label">Attack *</label>
                <input
                  type="number"
                  id="evolvedAttack"
                  name="evolvedAttack"
                  className="form-control"
                  value={formData.evolvedAttack}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="evolvedDefense" className="defense-label">Defense *</label>
                <input
                  type="number"
                  id="evolvedDefense"
                  name="evolvedDefense"
                  className="form-control"
                  value={formData.evolvedDefense}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="evolvedDescription">Evolved Description</label>
              <div className="text-formatting-toolbar">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary format-btn"
                  onClick={() => handleBoldClick(evolvedDescRef, 'evolvedDescription')}
                >
                  <strong>B</strong>
                </button>
              </div>
              <textarea
                id="evolvedDescription"
                name="evolvedDescription"
                className="form-control"
                value={formData.evolvedDescription}
                onChange={handleChange}
                placeholder="Enter evolved card description (optional)"
                rows="4"
                ref={evolvedDescRef}
              ></textarea>
              <small className="form-text">
                Press Enter for line breaks. They will be preserved in the card view.
              </small>
            </div>
          </>
        )}
        
        {/* Spell-specific fields */}
        {formData.cardType === 'Spell' && (
          <div className="form-group">
            <label htmlFor="spellDescription">Spell Description *</label>
            <div className="text-formatting-toolbar">
              <button
                type="button"
                className="btn btn-sm btn-secondary format-btn"
                onClick={() => handleBoldClick(spellDescRef, 'spellDescription')}
              >
                <strong>B</strong>
              </button>
            </div>
            <textarea
              id="spellDescription"
              name="spellDescription"
              className="form-control"
              value={formData.spellDescription}
              onChange={handleChange}
              placeholder="Enter spell description"
              rows="4"
              required
              ref={spellDescRef}
            ></textarea>
            <small className="form-text">
              Press Enter for line breaks. They will be preserved in the card view.
            </small>
          </div>
        )}
        
        {/* Amulet-specific fields */}
        {formData.cardType === 'Amulet' && (
          <div className="form-group">
            <label htmlFor="amuletDescription">Amulet Description *</label>
            <div className="text-formatting-toolbar">
              <button
                type="button"
                className="btn btn-sm btn-secondary format-btn"
                onClick={() => handleBoldClick(amuletDescRef, 'amuletDescription')}
              >
                <strong>B</strong>
              </button>
            </div>
            <textarea
              id="amuletDescription"
              name="amuletDescription"
              className="form-control"
              value={formData.amuletDescription}
              onChange={handleChange}
              placeholder="Enter amulet description"
              rows="4"
              required
              ref={amuletDescRef}
            ></textarea>
            <small className="form-text">
              Press Enter for line breaks. They will be preserved in the card view.
            </small>
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="notes">Card Details (Optional)</label>
          <textarea
            id="notes"
            name="notes"
            className="form-control"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Enter any additional details about this card"
            rows="4"
          ></textarea>
          <small className="form-text">
            Details are only visible when double-clicking on a card in the card list.
          </small>
        </div>
        
        <div className="form-group">
          <label>Card Image Source</label>
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
            <label htmlFor="image">Card Image *</label>
            <input
              type="file"
              id="image"
              name="image"
              className="form-control"
              onChange={handleImageChange}
              accept="image/*"
              required={formData.imageSource === 'file'}
            />
            <small className="form-text">
              Upload an image for your card. Max size: 5MB. Supported formats: JPEG, PNG, GIF.
            </small>
          </div>
        ) : (
          <div className="form-group">
            <label htmlFor="imageUrl">Image URL *</label>
            <input
              type="url"
              id="imageUrl"
              name="imageUrl"
              className="form-control"
              value={formData.imageUrl}
              onChange={handleImageUrlChange}
              placeholder="Enter image URL (e.g., https://imgur.com/your-image.jpg)"
              required={formData.imageSource === 'url'}
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
              alt="Card preview" 
              onError={() => {
                setPreview(null);
                if (formData.imageSource === 'url') {
                  setError('Failed to load image. Please check the URL and try again.');
                }
              }}
            />
          ) : (
            <div className="image-preview-text">Image preview will appear here</div>
          )}
        </div>
        
        {/* Banner Image Section for Deck Display */}
        <h3 className="section-title">Deck Banner Image</h3>
        <div className="form-group">
          <label htmlFor="bannerImageUrl">Banner Image URL (Optional)</label>
          <input
            type="url"
            id="bannerImageUrl"
            name="bannerImageUrl"
            className="form-control"
            value={formData.bannerImageUrl}
            onChange={handleBannerImageChange}
            placeholder="Enter banner image URL for deck display"
          />
          <small className="form-text">
            This image will be used as a background in the deck builder. Similar to keyword banners.
          </small>
        </div>
        
        <div className="form-group">
          <label htmlFor="bannerImagePosition">Banner Image Position</label>
          <select
            id="bannerImagePosition"
            name="bannerImagePosition"
            className="form-control"
            value={formData.bannerImagePosition}
            onChange={handleBannerPositionChange}
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
        
        {formData.bannerImageUrl && (
          <>
            <div className="advanced-banner-editor">
              <h4>Advanced Banner Position Editor</h4>
              
              <div className="banner-controls">
                <div className="zoom-control">
                  <label>Zoom: {bannerZoom}%</label>
                  <input 
                    type="range" 
                    min="100" 
                    max="300" 
                    value={bannerZoom} 
                    onChange={handleBannerZoomChange} 
                    className="zoom-slider"
                  />
                </div>
                
                <div className="position-actions">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={resetBannerPosition}
                  >
                    Reset
                  </button>
                </div>
              </div>
              
              <div 
                className="draggable-banner-container"
                style={{
                  cursor: isDragging ? 'grabbing' : 'grab',
                  height: '200px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  position: 'relative',
                  marginBottom: '20px',
                }}
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
              >
                <div
                  className="draggable-banner"
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.4)), url(${formData.bannerImageUrl})`,
                    backgroundPosition: `${bannerPosition.x}% ${bannerPosition.y}%`,
                    backgroundSize: `${bannerZoom}%`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '18px'
                  }}
                >
                  <span>Position updates automatically - {formData.title || "Card Title"}</span>
                </div>
              </div>
            </div>

            <div className="banner-preview">
              <h4>Banner Preview</h4>
              <div 
                className="keyword-banner-preview"
                style={{
                  backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.4)), url(${formData.bannerImageUrl})`,
                  backgroundPosition: formData.bannerImagePosition,
                  backgroundSize: `${bannerZoom}%`,
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
                <span>Banner Preview - {formData.title || "Card Title"}</span>
              </div>
            </div>
          </>
        )}
        
        <div className="form-group">
          <label className="form-label">Keywords:</label>
          <div className="keywords-container">
            {keywords.map(keyword => (
              <div key={keyword._id} className="keyword-selection-item">
                <div className="keyword-checkbox-wrapper">
                  <input
                    type="checkbox"
                    id={`keyword-${keyword._id}`}
                    checked={formData.keywords.includes(keyword._id)}
                    onChange={() => {
                      // Toggle this keyword in the selected keywords
                      const newKeywords = formData.keywords.includes(keyword._id)
                        ? formData.keywords.filter(id => id !== keyword._id)
                        : [...formData.keywords, keyword._id];
                      
                      setFormData({
                        ...formData,
                        keywords: newKeywords
                      });
                    }}
                    className="keyword-checkbox"
                  />
                  <label htmlFor={`keyword-${keyword._id}`} className="keyword-label">
                    {keyword.title}
                  </label>
                </div>
                <div 
                  className="keyword-preview-banner"
                  style={{
                    backgroundImage: `url(${keyword.imageUrl})`,
                    backgroundPosition: keyword.imagePosition || '50% 50%',
                    backgroundSize: 'cover'
                  }}
                >
                  <div className="keyword-preview-overlay">
                    <div className="keyword-preview-content">
                      <h5 className="keyword-preview-title">{keyword.title}</h5>
                      <p className="keyword-preview-description">{keyword.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {keywords.length === 0 && (
            <div className="no-keywords-message">
              No keywords available. <a href="/keywords/create">Create keywords</a> to add them to cards.
            </div>
          )}
        </div>
        
        {/* Replace the existing Related Cards Selection */}
        <div className="form-group">
          <label>Related Cards</label>
          
          <div className="related-cards-manager">
            {/* Search input for related cards */}
            <div className="related-cards-search">
              <input
                type="text"
                placeholder="Search for cards to relate..."
                value={relatedCardSearch}
                onChange={handleRelatedCardSearch}
                className="form-control"
              />
              
              {/* Search results dropdown */}
              {filteredRelatedCards.length > 0 && (
                <div className="related-cards-search-results">
                  {filteredRelatedCards.map(card => (
                    <div 
                      key={card._id} 
                      className="related-card-search-item"
                      onClick={() => handleAddRelatedCard(card._id)}
                    >
                      <div className="related-card-search-image">
                        <img src={card.imageUrl} alt={card.title} />
                      </div>
                      <div className="related-card-search-info">
                        <div className="related-card-search-title">{card.title}</div>
                        <div className="related-card-search-meta">
                          <span>{card.class}</span>
                          <span>{card.rarity}</span>
                          <span>{card.cardType || 'Follower'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Currently selected related cards */}
            <div className="selected-related-cards">
              <h4>Selected Related Cards</h4>
              
              {formData.relatedCards.length === 0 ? (
                <div className="no-related-cards">No related cards selected</div>
              ) : (
                <div className="selected-related-cards-list">
                  {formData.relatedCards.map(cardId => {
                    const card = getRelatedCardById(cardId);
                    if (!card) return null;
                    
                    return (
                      <div key={cardId} className="selected-related-card">
                        <div className="selected-related-card-image">
                          <img src={card.imageUrl} alt={card.title} />
                        </div>
                        <div className="selected-related-card-info">
                          <div className="selected-related-card-title">{card.title}</div>
                          <div className="selected-related-card-meta">
                            <span>{card.class}</span>
                            <span>{card.rarity}</span>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          className="remove-related-card-btn"
                          onClick={() => handleRemoveRelatedCard(cardId)}
                        >
                          &times;
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="btn submit-btn" 
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Card'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCard; 