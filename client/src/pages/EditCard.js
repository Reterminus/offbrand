import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCard, updateCard, getSets, addCardToSet, getKeywords, getCards } from '../services/api';

const EditCard = () => {
  const navigate = useNavigate();
  const { id } = useParams();
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
    setId: '',
    keywords: [],
    referencedCards: []
  });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sets, setSets] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [allCards, setAllCards] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch card data, sets, and keywords in parallel
        const [cardData, setsData, keywordsData, cardsData] = await Promise.all([
          getCard(id),
          getSets(),
          getKeywords(),
          getCards()
        ]);
        
        // Find which set (if any) this card belongs to
        const cardSetId = findCardSetId(setsData, id);
        
        // Extract keyword IDs from the card data
        const keywordIds = cardData.keywords ? 
          cardData.keywords.map(keyword => keyword._id) : [];
        
        // Extract referenced card IDs
        const referencedCardIds = cardData.referencedCards ? 
          cardData.referencedCards.map(card => card._id) : [];
        
        // Filter out the current card from allCards to prevent self-referencing
        const filteredCards = cardsData.filter(card => card._id !== id);
        setAllCards(filteredCards);
        
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
          setId: cardSetId || '',
          keywords: keywordIds,
          referencedCards: referencedCardIds
        });
        
        setSets(setsData);
        setKeywords(keywordsData);
        setPreview(cardData.imageUrl);
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

  const handleKeywordChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData({
      ...formData,
      keywords: selectedOptions
    });
  };

  const handleReferencedCardsChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData({
      ...formData,
      referencedCards: selectedOptions
    });
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
      
      // Append referenced cards if selected
      if (formData.referencedCards.length > 0) {
        data.append('referencedCards', JSON.stringify(formData.referencedCards));
      }
      
      // Update the card
      const response = await updateCard(id, data);
      
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

  if (loading) {
    return <div className="loading">Loading card...</div>;
  }

  return (
    <div className="edit-card-page">
      <div className="header">
        <h1>Edit Card</h1>
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
            If selected, the card will be added to this set after updating.
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
              <textarea
                id="unevolvedDescription"
                name="unevolvedDescription"
                className="form-control"
                value={formData.unevolvedDescription}
                onChange={handleChange}
                placeholder="Enter unevolved card description (optional)"
                rows="4"
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
              <textarea
                id="evolvedDescription"
                name="evolvedDescription"
                className="form-control"
                value={formData.evolvedDescription}
                onChange={handleChange}
                placeholder="Enter evolved card description (optional)"
                rows="4"
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
            <textarea
              id="spellDescription"
              name="spellDescription"
              className="form-control"
              value={formData.spellDescription}
              onChange={handleChange}
              placeholder="Enter spell description"
              rows="4"
              required
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
            <textarea
              id="amuletDescription"
              name="amuletDescription"
              className="form-control"
              value={formData.amuletDescription}
              onChange={handleChange}
              placeholder="Enter amulet description"
              rows="4"
              required
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
            <label htmlFor="image">Card Image {!preview && '*'}</label>
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
              Upload a new image for your card or keep the existing one. Max size: 5MB. Supported formats: JPEG, PNG, GIF.
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
              alt="Card preview" 
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
        
        <div className="form-group">
          <label htmlFor="keywords">Keywords:</label>
          <select
            id="keywords"
            name="keywords"
            multiple
            value={formData.keywords}
            onChange={handleKeywordChange}
            className="form-control"
          >
            {keywords.map(keyword => (
              <option key={keyword._id} value={keyword._id}>
                {keyword.title}
              </option>
            ))}
          </select>
          <small>Hold Ctrl (or Cmd on Mac) to select multiple keywords.</small>
        </div>
        
        <div className="form-group">
          <label htmlFor="referencedCards">Referenced Cards:</label>
          <select
            id="referencedCards"
            name="referencedCards"
            multiple
            value={formData.referencedCards}
            onChange={handleReferencedCardsChange}
            className="form-control"
          >
            {allCards.map(card => (
              <option key={card._id} value={card._id}>
                {card.title} ({card.cardType}, {card.class}, {card.rarity})
              </option>
            ))}
          </select>
          <small>Hold Ctrl (or Cmd on Mac) to select multiple cards.</small>
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="btn submit-btn" 
            disabled={submitting}
          >
            {submitting ? 'Updating...' : 'Update Card'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditCard; 