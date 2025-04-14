import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCard, updateCard, getSets, addCardToSet, getKeywords, getCards } from '../services/api';

const EditCard = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const unevolvedDescRef = useRef(null);
  const evolvedDescRef = useRef(null);
  const spellDescRef = useRef(null);
  const amuletDescRef = useRef(null);
  
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
    imageSource: 'url', // Default to 'url' since we'll be loading an existing image
    bannerImageUrl: '', // Add banner image URL for deck display
    bannerImagePosition: '50% 50%', // Add banner image position
    bannerImageZoom: 100, // Add banner image zoom
    setId: '',
    keywords: [],
    relatedCards: []
  });
  const [preview, setPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null); // Add banner preview state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sets, setSets] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [relatedCardSearch, setRelatedCardSearch] = useState('');
  const [filteredRelatedCards, setFilteredRelatedCards] = useState([]);
  const [bannerZoom, setBannerZoom] = useState(100);
  const [bannerPosition, setBannerPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch card data, sets, and keywords in parallel
        const [cardData, setsData, keywordsData, cardsData] = await Promise.all([
          getCard(id),
          getSets(),
          getKeywords(),
          getCards(false) // Pass false to get all cards including from hidden sets
        ]);
        
        // Filter out the current card from allCards to prevent self-reference
        const filteredCards = cardsData.filter(card => card._id !== id);
        setAllCards(filteredCards);
        
        // Find which set (if any) this card belongs to
        const cardSetId = findCardSetId(setsData, id);
        
        // Extract keyword IDs from the card data
        const keywordIds = cardData.keywords ? 
          cardData.keywords.map(keyword => keyword._id) : [];
        
        setFormData({
          title: cardData.title,
          cardType: cardData.cardType || 'Follower',
          trait: cardData.trait || '',
          isToken: cardData.isToken || false,
          cost: cardData.cost || 0,
          rarity: cardData.rarity || '',
          class: cardData.class || '',
          unevolvedAttack: cardData.unevolvedAttack || 0,
          unevolvedDefense: cardData.unevolvedDefense || 0,
          evolvedAttack: cardData.evolvedAttack || 0,
          evolvedDefense: cardData.evolvedDefense || 0,
          unevolvedDescription: cardData.unevolvedDescription || '',
          evolvedDescription: cardData.evolvedDescription || '',
          spellDescription: cardData.spellDescription || '',
          amuletDescription: cardData.amuletDescription || '',
          notes: cardData.notes || '',
          creator: cardData.creator || '',
          image: null,
          imageUrl: cardData.imageUrl || '',
          imageSource: 'url',
          bannerImageUrl: cardData.bannerImageUrl || '',
          bannerImagePosition: cardData.bannerImagePosition || '50% 50%',
          bannerImageZoom: cardData.bannerImageZoom || 100,
          setId: cardSetId || '',
          keywords: keywordIds,
          relatedCards: cardData.relatedCards ? cardData.relatedCards.map(c => c._id) : []
        });
        
        setSets(setsData);
        setKeywords(keywordsData);
        setPreview(cardData.imageUrl);
        setBannerPreview(cardData.bannerImageUrl);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Helper function to find which set the card belongs to
  const findCardSetId = (setsData, cardId) => {
    if (!setsData || !cardId) return null;
    
    // Look through all sets to find one that contains this card
    for (const set of setsData) {
      if (set.cards && Array.isArray(set.cards)) {
        // Check if the card ID is in the set's cards array
        // We need to use toString() for proper comparison since MongoDB IDs might be stored differently
        const cardInSet = set.cards.some(setCardId => 
          setCardId.toString() === cardId.toString() || setCardId === cardId
        );
        
        if (cardInSet) {
          return set._id;
        }
      }
    }
    
    return null;
  };

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
      imageUrl: formData.imageUrl && source === 'url' ? formData.imageUrl : ''
    });
    setPreview(source === 'url' ? formData.imageUrl : null);
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

  const handleRelatedCardSearch = (e) => {
    const searchTerm = e.target.value.toLowerCase();
    setRelatedCardSearch(searchTerm);
    
    if (searchTerm.trim() === '') {
      setFilteredRelatedCards([]);
      return;
    }
    
    const filtered = allCards
      .filter(card => card._id !== id) // Prevent self-reference
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
    
    setSubmitting(true);
    setError(null);
    
    try {
      console.log('Submitting form data with creator:', formData.creator);
      const data = new FormData();
      data.append('title', formData.title);
      data.append('cardType', formData.cardType);
      data.append('trait', formData.trait);
      data.append('isToken', formData.isToken);
      data.append('cost', formData.cost);
      data.append('rarity', formData.rarity);
      data.append('class', formData.class);
      data.append('notes', formData.notes);
      data.append('creator', formData.creator || '');
      
      // Append banner image data
      if (formData.bannerImageUrl) {
        data.append('bannerImageUrl', formData.bannerImageUrl);
      }
      data.append('bannerImagePosition', formData.bannerImagePosition || '50% 50%');
      data.append('bannerImageZoom', bannerZoom || 100);
      
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
      data.append('keywords', JSON.stringify(formData.keywords));
      
      // Append related cards if selected
      if (formData.relatedCards.length > 0) {
        data.append('relatedCards', JSON.stringify(formData.relatedCards));
      }
      
      // Handle set assignment
      if (formData.setId) {
        // Find if the card is already in this set
        const selectedSet = sets.find(set => set._id === formData.setId);
        const cardAlreadyInSet = selectedSet && selectedSet.cards && 
          Array.isArray(selectedSet.cards) &&
          selectedSet.cards.some(setCardId => 
            setCardId.toString() === id.toString() || setCardId === id
          );
        
        // Only add the card to the set if it's not already there
        if (!cardAlreadyInSet) {
          await addCardToSet(formData.setId, id);
        }
      }
      
      // Update the card data
      await updateCard(id, data);
      
      // Always navigate to the main page
      navigate('/');
    } catch (err) {
      console.error('Error updating card:', err);
      setError('Failed to update card. Please try again.');
      setSubmitting(false);
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

  // Update the useEffect to sync bannerZoom and bannerPosition changes to formData automatically
  useEffect(() => {
    if (formData.bannerImageUrl) {
      setFormData(prevFormData => ({
        ...prevFormData,
        bannerImagePosition: `${bannerPosition.x}% ${bannerPosition.y}%`
      }));
    }
  }, [bannerPosition]);

  useEffect(() => {
    // This effect watches for zoom changes and updates formData
    if (formData.bannerImageUrl) {
      // We don't need to update bannerImagePosition for zoom changes
      // Just ensuring the preview will update with this dependency
    }
  }, [bannerZoom]);

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  if (loading) {
    return <div className="loading">Loading card...</div>;
  }

  return (
    <div className="edit-card-page">
      <div className="header">
        <h1>Edit Card</h1>
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
      
      <form className="edit-card-form" onSubmit={handleSubmit}>
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
                      onMouseDown={() => {
                        setIsDragging(true);
                        setDragStart({ x: 0, y: 0 });
                      }}
                      onMouseMove={(e) => {
                        if (!isDragging) return;
                        
                        const deltaX = e.clientX - dragStart.x;
                        const deltaY = e.clientY - dragStart.y;
                        
                        // Calculate new position as percentage
                        const newX = Math.max(0, Math.min(100, bannerPosition.x - (deltaX / 5)));
                        const newY = Math.max(0, Math.min(100, bannerPosition.y - (deltaY / 5)));
                        
                        setBannerPosition({
                          x: newX,
                          y: newY
                        });
                      }}
                      onMouseUp={() => {
                        setIsDragging(false);
                      }}
                      onMouseLeave={() => {
                        setIsDragging(false);
                      }}
                    >
                      <div className="position-indicator">+</div>
                    </div>
                    
                    <div className="banner-zoom-control">
                      <label>Zoom: {bannerZoom}%</label>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        value={bannerZoom}
                        onChange={(e) => setBannerZoom(parseInt(e.target.value))}
                      />
                    </div>
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
                onChange={handleChange}
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
            disabled={submitting}
          >
            {submitting ? 'Updating...' : 'Update Card'}
          </button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => navigate(-1)}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditCard; 