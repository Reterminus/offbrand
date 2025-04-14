import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCard, getSets, addCardToSet, getKeywords, getCards } from '../services/api';

const CreateCard = () => {
  const navigate = useNavigate();
  
  // Add tab state
  const [activeTab, setActiveTab] = useState('basic');
  
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
    imageSource: 'file',
    bannerImageUrl: '',
    bannerImagePosition: '50% 50%',
    bannerImageZoom: 100,
    setId: '',
    keywords: [],
    relatedCards: []
  });
  const [preview, setPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sets, setSets] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [allCards, setAllCards] = useState([]);

  const [bannerZoom, setBannerZoom] = useState(100);
  const [bannerPosition, setBannerPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [relatedCardSearch, setRelatedCardSearch] = useState('');
  const [filteredRelatedCards, setFilteredRelatedCards] = useState([]);

  const unevolvedDescRef = useRef(null);
  const evolvedDescRef = useRef(null);
  const spellDescRef = useRef(null);
  const amuletDescRef = useRef(null);

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [setsData, keywordsData, cardsData] = await Promise.all([
          getSets(),
          getKeywords(),
          getCards(false)
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

  const handleBannerImageChange = (e) => {
    const url = e.target.value;
    setFormData({
      ...formData,
      bannerImageUrl: url
    });
    setBannerPreview(url);
  };

  const handleBannerPositionChange = (e) => {
    const position = e.target.value;
    setFormData({
      ...formData,
      bannerImagePosition: position
    });
    
    const [xPos, yPos] = position.split(' ').map(val => parseInt(val));
    setBannerPosition({
      x: xPos,
      y: yPos
    });
  };

  const handleBannerZoomChange = (e) => {
    setBannerZoom(parseInt(e.target.value));
  };

  const handleDragStart = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
    e.preventDefault();
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
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

  const handleDragEnd = () => {
    setIsDragging(false);
  };

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
      .filter(card => card._id !== formData._id)
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
    
    if (!formData.title || !formData.rarity || !formData.class || 
        formData.cost === undefined || (!formData.image && !formData.imageUrl)) {
      setError('Please fill in all required fields and provide an image.');
      return;
    }
    
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
      
      if (formData.bannerImageUrl) {
        data.append('bannerImageUrl', formData.bannerImageUrl);
        data.append('bannerImagePosition', formData.bannerImagePosition);
        data.append('bannerImageZoom', bannerZoom || 100);
      }
      
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
      
      if (formData.imageSource === 'file' && formData.image) {
        data.append('image', formData.image);
      } else if (formData.imageSource === 'url' && formData.imageUrl) {
        data.append('imageUrl', formData.imageUrl);
      }
      
      if (formData.keywords.length > 0) {
        data.append('keywords', JSON.stringify(formData.keywords));
      }
      
      if (formData.relatedCards.length > 0) {
        data.append('relatedCards', JSON.stringify(formData.relatedCards));
      }
      
      const createdCard = await createCard(data);
      
      if (formData.setId) {
        await addCardToSet(formData.setId, createdCard._id);
      }
      
      navigate('/');
    } catch (err) {
      setError('Failed to create card. Please try again.');
      setLoading(false);
    }
  };

  const rarityOptions = ['Bronze', 'Silver', 'Gold', 'Legendary'];
  
  const classOptions = [
    'Neutral', 'Forestcraft', 'Swordcraft', 'Runecraft', 
    'Dragoncraft', 'Shadowcraft', 'Bloodcraft', 'Havencraft', 
    'Portalcraft'
  ];
  
  const cardTypeOptions = ['Follower', 'Spell', 'Amulet'];

  const handleBoldClick = (textareaRef, fieldName) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start !== end) {
      const currentText = formData[fieldName];
      const selectedText = currentText.substring(start, end);
      
      const newText = 
        currentText.substring(0, start) + 
        '**' + selectedText + '**' + 
        currentText.substring(end);
      
      setFormData({
        ...formData,
        [fieldName]: newText
      });
      
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + selectedText.length + 4;
        textarea.selectionStart = newPosition;
        textarea.selectionEnd = newPosition;
      }, 10);
    }
  };

  useEffect(() => {
    if (formData.bannerImageUrl) {
      setFormData(prevFormData => ({
        ...prevFormData,
        bannerImagePosition: `${bannerPosition.x}% ${bannerPosition.y}%`
      }));
    }
  }, [bannerPosition]);

  useEffect(() => {
  }, [bannerZoom]);

  return (
    <div className="create-card-page">
      <div className="header">
        <h1>Create New Card</h1>
      </div>
      
      {/* Tab navigation */}
      <div className="card-form-tabs">
        <button 
          className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`} 
          onClick={() => handleTabChange('basic')}
        >
          Basic Info
        </button>
        <button 
          className={`tab-button ${activeTab === 'details' ? 'active' : ''}`} 
          onClick={() => handleTabChange('details')}
        >
          Card Details
        </button>
        <button 
          className={`tab-button ${activeTab === 'images' ? 'active' : ''}`} 
          onClick={() => handleTabChange('images')}
        >
          Images
        </button>
        <button 
          className={`tab-button ${activeTab === 'references' ? 'active' : ''}`} 
          onClick={() => handleTabChange('references')}
        >
          References
        </button>
        <button 
          className={`tab-button ${activeTab === 'notes' ? 'active' : ''}`} 
          onClick={() => handleTabChange('notes')}
        >
          Notes
        </button>
      </div>
      
      <form className="create-card-form" onSubmit={handleSubmit}>
        <h2 className="form-title">Card Details</h2>
        
        {error && <div className="error">{error}</div>}
        
        {/* Basic Info Tab */}
        <div className={`tab-content ${activeTab === 'basic' ? 'active' : ''}`}>
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cardType">Card Type *</label>
              <select
                id="cardType"
                name="cardType"
                value={formData.cardType}
                onChange={handleChange}
                required
              >
                {cardTypeOptions.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="cost">Cost *</label>
              <input
                type="number"
                id="cost"
                name="cost"
                min="0"
                value={formData.cost}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="class">Class *</label>
              <select
                id="class"
                name="class"
                value={formData.class}
                onChange={handleChange}
                required
              >
                <option value="">Select Class</option>
                {classOptions.map(classOption => (
                  <option key={classOption} value={classOption}>{classOption}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="rarity">Rarity *</label>
              <select
                id="rarity"
                name="rarity"
                value={formData.rarity}
                onChange={handleChange}
                required
              >
                <option value="">Select Rarity</option>
                {rarityOptions.map(rarityOption => (
                  <option key={rarityOption} value={rarityOption}>{rarityOption}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="trait">Trait</label>
              <input
                type="text"
                id="trait"
                name="trait"
                value={formData.trait}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group checkbox-group">
              <label>
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
        </div>
        
        {/* Card Details Tab */}
        <div className={`tab-content ${activeTab === 'details' ? 'active' : ''}`}>
          {/* Follower card specific fields */}
          {formData.cardType === 'Follower' && (
            <div className="follower-form">
              <div className="form-section">
                <h3>Unevolved</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="unevolvedAttack">Attack</label>
                    <input
                      type="number"
                      id="unevolvedAttack"
                      name="unevolvedAttack"
                      min="0"
                      value={formData.unevolvedAttack}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="unevolvedDefense">Defense</label>
                    <input
                      type="number"
                      id="unevolvedDefense"
                      name="unevolvedDefense"
                      min="0"
                      value={formData.unevolvedDefense}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="unevolvedDescription">Description</label>
                  <div className="textarea-with-controls">
                    <div className="textarea-controls">
                      <button 
                        type="button" 
                        className="format-button"
                        onClick={() => handleBoldClick(unevolvedDescRef, 'unevolvedDescription')}
                      >
                        <strong>B</strong>
                      </button>
                    </div>
                    <textarea
                      ref={unevolvedDescRef}
                      id="unevolvedDescription"
                      name="unevolvedDescription"
                      value={formData.unevolvedDescription}
                      onChange={handleChange}
                      rows="3"
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-section">
                <h3>Evolved</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="evolvedAttack">Attack</label>
                    <input
                      type="number"
                      id="evolvedAttack"
                      name="evolvedAttack"
                      min="0"
                      value={formData.evolvedAttack}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="evolvedDefense">Defense</label>
                    <input
                      type="number"
                      id="evolvedDefense"
                      name="evolvedDefense"
                      min="0"
                      value={formData.evolvedDefense}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="evolvedDescription">Description</label>
                  <div className="textarea-with-controls">
                    <div className="textarea-controls">
                      <button 
                        type="button" 
                        className="format-button"
                        onClick={() => handleBoldClick(evolvedDescRef, 'evolvedDescription')}
                      >
                        <strong>B</strong>
                      </button>
                    </div>
                    <textarea
                      ref={evolvedDescRef}
                      id="evolvedDescription"
                      name="evolvedDescription"
                      value={formData.evolvedDescription}
                      onChange={handleChange}
                      rows="3"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Spell card specific fields */}
          {formData.cardType === 'Spell' && (
            <div className="spell-form">
              <div className="form-group">
                <label htmlFor="spellDescription">Spell Effect</label>
                <div className="textarea-with-controls">
                  <div className="textarea-controls">
                    <button 
                      type="button" 
                      className="format-button"
                      onClick={() => handleBoldClick(spellDescRef, 'spellDescription')}
                    >
                      <strong>B</strong>
                    </button>
                  </div>
                  <textarea
                    ref={spellDescRef}
                    id="spellDescription"
                    name="spellDescription"
                    value={formData.spellDescription}
                    onChange={handleChange}
                    rows="5"
                    required
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Amulet card specific fields */}
          {formData.cardType === 'Amulet' && (
            <div className="amulet-form">
              <div className="form-group">
                <label htmlFor="amuletDescription">Amulet Effect</label>
                <div className="textarea-with-controls">
                  <div className="textarea-controls">
                    <button 
                      type="button" 
                      className="format-button"
                      onClick={() => handleBoldClick(amuletDescRef, 'amuletDescription')}
                    >
                      <strong>B</strong>
                    </button>
                  </div>
                  <textarea
                    ref={amuletDescRef}
                    id="amuletDescription"
                    name="amuletDescription"
                    value={formData.amuletDescription}
                    onChange={handleChange}
                    rows="5"
                    required
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Images Tab */}
        <div className={`tab-content ${activeTab === 'images' ? 'active' : ''}`}>
          <div className="form-section">
            <h3>Card Image</h3>
            
            <div className="form-group">
              <div className="image-source-toggle">
                <button
                  type="button"
                  className={`source-button ${formData.imageSource === 'file' ? 'active' : ''}`}
                  onClick={() => handleImageSourceChange('file')}
                >
                  Upload Image
                </button>
                <button
                  type="button"
                  className={`source-button ${formData.imageSource === 'url' ? 'active' : ''}`}
                  onClick={() => handleImageSourceChange('url')}
                >
                  Image URL
                </button>
              </div>
              
              {formData.imageSource === 'file' ? (
                <div className="file-upload">
                  <input
                    type="file"
                    id="image"
                    name="image"
                    onChange={handleImageChange}
                    accept="image/*"
                  />
                  <div className="upload-note">
                    Max size: 5MB. Supported formats: JPEG, PNG, GIF
                  </div>
                </div>
              ) : (
                <input
                  type="url"
                  id="imageUrl"
                  name="imageUrl"
                  placeholder="https://example.com/image.jpg"
                  value={formData.imageUrl}
                  onChange={handleImageUrlChange}
                />
              )}
            </div>
            
            {preview && (
              <div className="image-preview">
                <h4>Preview</h4>
                <img
                  src={preview}
                  alt="Card preview"
                  className="preview-image"
                />
              </div>
            )}
          </div>
          
          <div className="form-section">
            <h3>Banner Image (Optional)</h3>
            <div className="form-group">
              <label htmlFor="bannerImageUrl">Banner Image URL</label>
              <input
                type="url"
                id="bannerImageUrl"
                name="bannerImageUrl"
                placeholder="https://example.com/banner.jpg"
                value={formData.bannerImageUrl}
                onChange={handleBannerImageChange}
              />
            </div>
            
            {bannerPreview && (
              <div className="banner-preview">
                <h4>Banner Preview</h4>
                <div className="banner-controls">
                  <div className="banner-position-control">
                    <label>Position</label>
                    <div 
                      className="banner-preview-image" 
                      style={{
                        backgroundImage: `url(${bannerPreview})`,
                        backgroundPosition: `${bannerPosition.x}% ${bannerPosition.y}%`,
                        backgroundSize: `${bannerZoom}%`
                      }}
                      onMouseDown={handleDragStart}
                      onMouseMove={handleDragMove}
                      onMouseUp={handleDragEnd}
                      onMouseLeave={handleDragEnd}
                    >
                      <div className="position-indicator">+</div>
                    </div>
                    <button 
                      type="button" 
                      className="reset-button"
                      onClick={resetBannerPosition}
                    >
                      Reset Position
                    </button>
                  </div>
                  
                  <div className="banner-zoom-control">
                    <label>Zoom: {bannerZoom}%</label>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      value={bannerZoom}
                      onChange={handleBannerZoomChange}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* References Tab */}
        <div className={`tab-content ${activeTab === 'references' ? 'active' : ''}`}>
          <div className="form-section">
            <h3>Card Set</h3>
            <div className="form-group">
              <label htmlFor="setId">Add to Set</label>
              <select
                id="setId"
                name="setId"
                value={formData.setId}
                onChange={handleChange}
              >
                <option value="">None</option>
                {sets.map(set => (
                  <option key={set._id} value={set._id}>{set.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="form-section">
            <h3>Keywords</h3>
            <div className="form-group">
              <label htmlFor="keywords">Associated Keywords</label>
              <select
                id="keywords"
                name="keywords"
                multiple
                value={formData.keywords}
                onChange={handleKeywordChange}
              >
                {keywords.map(keyword => (
                  <option key={keyword._id} value={keyword._id}>{keyword.title}</option>
                ))}
              </select>
              <div className="select-hint">
                Hold Ctrl (Cmd on Mac) to select multiple keywords
              </div>
            </div>
          </div>
          
          <div className="form-section">
            <h3>Related Cards</h3>
            <div className="form-group">
              <label htmlFor="relatedCardSearch">Search Related Cards</label>
              <input
                type="text"
                id="relatedCardSearch"
                value={relatedCardSearch}
                onChange={handleRelatedCardSearch}
                placeholder="Search by name, class, rarity, or trait"
              />
              
              {filteredRelatedCards.length > 0 && (
                <div className="search-results">
                  {filteredRelatedCards.map(card => (
                    <div 
                      key={card._id} 
                      className="search-result-item"
                      onClick={() => handleAddRelatedCard(card._id)}
                    >
                      <div className="search-result-image">
                        <img src={card.imageUrl} alt={card.title} />
                      </div>
                      <div className="search-result-info">
                        <div className="search-result-title">{card.title}</div>
                        <div className="search-result-meta">
                          {card.class} - {card.rarity} - {card.cardType}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {formData.relatedCards.length > 0 && (
                <div className="related-cards-list">
                  <h4>Selected Related Cards</h4>
                  <ul>
                    {formData.relatedCards.map(cardId => {
                      const card = getRelatedCardById(cardId);
                      return card ? (
                        <li key={cardId} className="related-card-item">
                          <div className="related-card-info">
                            <img
                              src={card.imageUrl}
                              alt={card.title}
                              className="related-card-thumbnail"
                            />
                            <span>{card.title}</span>
                          </div>
                          <button
                            type="button"
                            className="remove-button"
                            onClick={() => handleRemoveRelatedCard(cardId)}
                          >
                            &times;
                          </button>
                        </li>
                      ) : null;
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Notes Tab */}
        <div className={`tab-content ${activeTab === 'notes' ? 'active' : ''}`}>
          <div className="form-section">
            <h3>Additional Information</h3>
            
            <div className="form-group">
              <label htmlFor="creator">Creator</label>
              <input
                type="text"
                id="creator"
                name="creator"
                value={formData.creator}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="5"
                placeholder="Add any design notes, ideas for future versions, or other comments about this card."
              />
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Card'}
          </button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => navigate(-1)}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCard; 