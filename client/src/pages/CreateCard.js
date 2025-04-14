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
  
  // New state for tab navigation
  const [activeTab, setActiveTab] = useState('basicInfo');

  const unevolvedDescRef = useRef(null);
  const evolvedDescRef = useRef(null);
  const spellDescRef = useRef(null);
  const amuletDescRef = useRef(null);

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
    if (formData.bannerImageUrl) {
      setFormData(prevFormData => ({
        ...prevFormData,
        bannerImageZoom: bannerZoom
      }));
    }
  }, [bannerZoom]);

  // Define tabs for easier navigation
  const tabs = [
    { id: 'basicInfo', label: 'Basic Info' },
    { id: 'cardDetails', label: 'Card Details' },
    { id: 'cardImage', label: 'Card Image' },
    { id: 'bannerImage', label: 'Banner Image' },
    { id: 'keywords', label: 'Keywords' },
    { id: 'relatedCards', label: 'Related Cards' },
    { id: 'preview', label: 'Preview' }
  ];

  return (
    <div className="create-card-page">
      <div className="header">
        <h1>Create New Card</h1>
      </div>
      
      {/* New tabbed navigation */}
      <div className="card-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <form className="create-card-form" onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        
        {/* Basic Info Tab */}
        <div className={`tab-content ${activeTab === 'basicInfo' ? 'active' : ''}`}>
          <h2 className="form-title">Basic Information</h2>
          
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
          
          <div className="form-group">
            <label htmlFor="cardType">Card Type *</label>
            <select
              id="cardType"
              name="cardType"
              value={formData.cardType}
              onChange={handleChange}
              required
            >
              {cardTypeOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          
          <div className="form-row">
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
                {rarityOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
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
                {classOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            
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
          </div>
          
          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              id="isToken"
              name="isToken"
              checked={formData.isToken}
              onChange={handleChange}
            />
            <label htmlFor="isToken">This is a Token card</label>
          </div>
          
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
        </div>
        
        {/* Card Details Tab */}
        <div className={`tab-content ${activeTab === 'cardDetails' ? 'active' : ''}`}>
          <h2 className="form-title">Card Details</h2>
          
          {/* Follower-specific fields */}
          {formData.cardType === 'Follower' && (
            <>
              <div className="form-section">
                <h3>Unevolved Stats</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="unevolvedAttack">Attack *</label>
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
                    <label htmlFor="unevolvedDefense">Defense *</label>
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
                  <label htmlFor="unevolvedDescription">Unevolved Description</label>
                  <div className="textarea-with-controls">
                    <div className="text-controls">
                      <button 
                        type="button" 
                        className="control-btn"
                        onClick={() => handleBoldClick(unevolvedDescRef, 'unevolvedDescription')}
                      >
                        B
                      </button>
                    </div>
                    <textarea
                      id="unevolvedDescription"
                      name="unevolvedDescription"
                      ref={unevolvedDescRef}
                      value={formData.unevolvedDescription}
                      onChange={handleChange}
                      rows="4"
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-section">
                <h3>Evolved Stats</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="evolvedAttack">Attack *</label>
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
                    <label htmlFor="evolvedDefense">Defense *</label>
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
                  <label htmlFor="evolvedDescription">Evolved Description</label>
                  <div className="textarea-with-controls">
                    <div className="text-controls">
                      <button 
                        type="button" 
                        className="control-btn"
                        onClick={() => handleBoldClick(evolvedDescRef, 'evolvedDescription')}
                      >
                        B
                      </button>
                    </div>
                    <textarea
                      id="evolvedDescription"
                      name="evolvedDescription"
                      ref={evolvedDescRef}
                      value={formData.evolvedDescription}
                      onChange={handleChange}
                      rows="4"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* Spell-specific fields */}
          {formData.cardType === 'Spell' && (
            <div className="form-group">
              <label htmlFor="spellDescription">Spell Description *</label>
              <div className="textarea-with-controls">
                <div className="text-controls">
                  <button 
                    type="button" 
                    className="control-btn"
                    onClick={() => handleBoldClick(spellDescRef, 'spellDescription')}
                  >
                    B
                  </button>
                </div>
                <textarea
                  id="spellDescription"
                  name="spellDescription"
                  ref={spellDescRef}
                  value={formData.spellDescription}
                  onChange={handleChange}
                  rows="6"
                  required
                />
              </div>
            </div>
          )}
          
          {/* Amulet-specific fields */}
          {formData.cardType === 'Amulet' && (
            <div className="form-group">
              <label htmlFor="amuletDescription">Amulet Description *</label>
              <div className="textarea-with-controls">
                <div className="text-controls">
                  <button 
                    type="button" 
                    className="control-btn"
                    onClick={() => handleBoldClick(amuletDescRef, 'amuletDescription')}
                  >
                    B
                  </button>
                </div>
                <textarea
                  id="amuletDescription"
                  name="amuletDescription"
                  ref={amuletDescRef}
                  value={formData.amuletDescription}
                  onChange={handleChange}
                  rows="6"
                  required
                />
              </div>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
            />
          </div>
        </div>
        
        {/* Card Image Tab */}
        <div className={`tab-content ${activeTab === 'cardImage' ? 'active' : ''}`}>
          <h2 className="form-title">Card Image</h2>
          
          <div className="form-group">
            <label>Image Source</label>
            <div className="radio-group">
              <div className="radio-option">
                <input
                  type="radio"
                  id="imageSourceFile"
                  name="imageSource"
                  checked={formData.imageSource === 'file'}
                  onChange={() => handleImageSourceChange('file')}
                />
                <label htmlFor="imageSourceFile">Upload File</label>
              </div>
              
              <div className="radio-option">
                <input
                  type="radio"
                  id="imageSourceUrl"
                  name="imageSource"
                  checked={formData.imageSource === 'url'}
                  onChange={() => handleImageSourceChange('url')}
                />
                <label htmlFor="imageSourceUrl">Image URL</label>
              </div>
            </div>
          </div>
          
          {formData.imageSource === 'file' ? (
            <div className="form-group">
              <label htmlFor="image">Upload Image *</label>
              <input
                type="file"
                id="image"
                name="image"
                accept="image/*"
                onChange={handleImageChange}
              />
              <div className="image-requirements">
                Recommended: High-quality art images. Max size: 5MB.
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="imageUrl">Image URL *</label>
              <input
                type="url"
                id="imageUrl"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleImageUrlChange}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          )}
          
          {preview && (
            <div className="image-preview-container">
              <div className="image-preview">
                <h4>Image Preview</h4>
                <img src={preview} alt="Preview" />
              </div>
            </div>
          )}
        </div>
        
        {/* Banner Image Tab */}
        <div className={`tab-content ${activeTab === 'bannerImage' ? 'active' : ''}`}>
          <h2 className="form-title">Banner Image</h2>
          <p className="form-description">
            The banner image is used when displaying the card in sets and deck builder.
            It's optional but provides a better visual experience.
          </p>
          
          <div className="form-group">
            <label htmlFor="bannerImageUrl">Banner Image URL</label>
            <input
              type="url"
              id="bannerImageUrl"
              name="bannerImageUrl"
              value={formData.bannerImageUrl}
              onChange={handleBannerImageChange}
              placeholder="https://example.com/banner.jpg"
            />
          </div>
          
          {bannerPreview && (
            <>
              <div className="form-group">
                <label>Banner Image Position</label>
                <div 
                  className="banner-position-selector"
                  onMouseDown={handleDragStart}
                  onMouseMove={handleDragMove}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                >
                  <img 
                    src={bannerPreview} 
                    alt="Banner Preview"
                    style={{
                      transform: `scale(${bannerZoom / 100})`,
                      transformOrigin: `${bannerPosition.x}% ${bannerPosition.y}%`
                    }}
                  />
                  <div className="banner-position-indicator" style={{
                    left: `${bannerPosition.x}%`,
                    top: `${bannerPosition.y}%`
                  }}></div>
                </div>
                <div className="banner-controls">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="bannerZoom">Zoom: {bannerZoom}%</label>
                      <input
                        type="range"
                        id="bannerZoom"
                        min="100"
                        max="300"
                        value={bannerZoom}
                        onChange={handleBannerZoomChange}
                      />
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-reset"
                      onClick={resetBannerPosition}
                    >
                      Reset Position
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Keywords Tab */}
        <div className={`tab-content ${activeTab === 'keywords' ? 'active' : ''}`}>
          <h2 className="form-title">Keywords</h2>
          <p className="form-description">
            Keywords are game mechanics that can be associated with this card.
          </p>
          
          <div className="form-group">
            <label htmlFor="keywords">Select Keywords</label>
            <select
              id="keywords"
              name="keywords"
              multiple
              size="5"
              value={formData.keywords}
              onChange={handleKeywordChange}
            >
              {keywords.map(keyword => (
                <option key={keyword._id} value={keyword._id}>
                  {keyword.title}
                </option>
              ))}
            </select>
            <div className="help-text">Hold Ctrl/Cmd to select multiple keywords</div>
          </div>
          
          {formData.keywords.length > 0 && (
            <div className="selected-items">
              <h4>Selected Keywords:</h4>
              <ul>
                {formData.keywords.map(keywordId => {
                  const keyword = keywords.find(k => k._id === keywordId);
                  return keyword ? (
                    <li key={keywordId} className="selected-keyword">
                      {keyword.title}
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          )}
        </div>
        
        {/* Related Cards Tab */}
        <div className={`tab-content ${activeTab === 'relatedCards' ? 'active' : ''}`}>
          <h2 className="form-title">Related Cards</h2>
          <p className="form-description">
            Link this card to others it generates or is related to.
          </p>
          
          <div className="form-group">
            <label htmlFor="relatedCardSearch">Search for Related Cards</label>
            <input
              type="text"
              id="relatedCardSearch"
              value={relatedCardSearch}
              onChange={handleRelatedCardSearch}
              placeholder="Search by card name, class, or trait"
            />
          </div>
          
          {filteredRelatedCards.length > 0 && (
            <div className="search-results">
              <h4>Search Results:</h4>
              <ul className="results-list">
                {filteredRelatedCards.slice(0, 10).map(card => (
                  <li key={card._id} className="result-item">
                    <span className="result-title">{card.title}</span>
                    <span className="result-meta">{card.class} - {card.rarity}</span>
                    <button
                      type="button"
                      className="btn btn-add"
                      onClick={() => handleAddRelatedCard(card._id)}
                    >
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {formData.relatedCards.length > 0 && (
            <div className="selected-items">
              <h4>Selected Related Cards:</h4>
              <ul className="related-cards-list">
                {formData.relatedCards.map(cardId => {
                  const relatedCard = getRelatedCardById(cardId);
                  return relatedCard ? (
                    <li key={cardId} className="related-card-item">
                      <span className="related-card-title">
                        {relatedCard.title}
                      </span>
                      <span className="related-card-meta">
                        {relatedCard.class} - {relatedCard.rarity}
                      </span>
                      <button
                        type="button"
                        className="btn btn-remove"
                        onClick={() => handleRemoveRelatedCard(cardId)}
                      >
                        Remove
                      </button>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          )}
        </div>
        
        {/* Preview Tab */}
        <div className={`tab-content ${activeTab === 'preview' ? 'active' : ''}`}>
          <h2 className="form-title">Card Preview & Submit</h2>
          
          <div className="form-group">
            <label htmlFor="setId">Add to Set (Optional)</label>
            <select
              id="setId"
              name="setId"
              value={formData.setId}
              onChange={handleChange}
            >
              <option value="">Do not add to a set</option>
              {sets.map(set => (
                <option key={set._id} value={set._id}>
                  {set.title}
                </option>
              ))}
            </select>
          </div>
          
          <div className="preview-card-container">
            {preview ? (
              <div className="card-preview">
                <div className="card-preview-header">
                  <h3>{formData.title || 'Untitled Card'}</h3>
                  <div className="card-preview-meta">
                    <span>Cost: {formData.cost}</span>
                    <span>{formData.class || 'No Class'}</span>
                    <span>{formData.rarity || 'No Rarity'}</span>
                  </div>
                </div>
                <div className="card-preview-image">
                  <img src={preview} alt="Card Preview" />
                </div>
                <div className="card-preview-details">
                  <div className="card-type">{formData.cardType || 'Follower'}</div>
                  {formData.trait && <div className="card-trait">Trait: {formData.trait}</div>}
                  {formData.isToken && <div className="card-token-badge">Token</div>}
                  
                  {formData.cardType === 'Follower' && (
                    <div className="card-stats">
                      <div className="unevolved-stats">
                        <h4>Unevolved:</h4>
                        <div>ATK: {formData.unevolvedAttack} / DEF: {formData.unevolvedDefense}</div>
                        <p>{formData.unevolvedDescription}</p>
                      </div>
                      <div className="evolved-stats">
                        <h4>Evolved:</h4>
                        <div>ATK: {formData.evolvedAttack} / DEF: {formData.evolvedDefense}</div>
                        <p>{formData.evolvedDescription}</p>
                      </div>
                    </div>
                  )}
                  
                  {formData.cardType === 'Spell' && (
                    <div className="spell-effect">
                      <p>{formData.spellDescription}</p>
                    </div>
                  )}
                  
                  {formData.cardType === 'Amulet' && (
                    <div className="amulet-effect">
                      <p>{formData.amuletDescription}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="preview-placeholder">
                <p>Please add an image to see the card preview</p>
              </div>
            )}
          </div>
          
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary btn-create"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Card'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateCard; 