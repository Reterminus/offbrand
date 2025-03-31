import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCards, deleteCard, getSets, getKeywords, getCard } from '../services/api';
import { sortCards } from '../utils/cardUtils';
import { formatText } from '../utils/textUtils';
import { AuthContext } from '../context/AuthContext';

const CardList = () => {
  const navigate = useNavigate();
  const { isAdmin } = useContext(AuthContext);
  const [cards, setCards] = useState([]);
  const [sets, setSets] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCardId, setActiveCardId] = useState(null);
  const [detailPositions, setDetailPositions] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedRarity, setSelectedRarity] = useState('');
  const [selectedSet, setSelectedSet] = useState('');
  const [selectedCreator, setSelectedCreator] = useState('');
  const [creators, setCreators] = useState([]);
  const [showNotesForCard, setShowNotesForCard] = useState(null);
  const cardRefs = useRef({});
  const [selectedCardDetails, setSelectedCardDetails] = useState(null);
  const [hoveredRelatedCard, setHoveredRelatedCard] = useState(null);
  const [preloadedRelatedCards, setPreloadedRelatedCards] = useState({});
  const [showHiddenSetCards, setShowHiddenSetCards] = useState(false);
  const [cardsFromHiddenSets, setCardsFromHiddenSets] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cardsData, setsData, keywordsData] = await Promise.all([
          getCards(),
          getSets(),
          getKeywords()
        ]);
        
        const sortedCards = sortCards(cardsData);
        
        // Identify cards from hidden sets for admin toggle functionality
        const hiddenSets = setsData.filter(set => set.hidden);
        const hiddenSetCards = [];
        
        // Collect all cards that belong to hidden sets
        hiddenSets.forEach(set => {
          if (set.cards && Array.isArray(set.cards)) {
            set.cards.forEach(cardId => {
              // Ensure we're comparing strings
              const cardIdStr = cardId.toString();
              if (!hiddenSetCards.includes(cardIdStr)) {
                hiddenSetCards.push(cardIdStr);
              }
            });
          }
        });
        setCardsFromHiddenSets(hiddenSetCards);
        
        const uniqueCreators = [...new Set(sortedCards
          .map(card => card.creator)
          .filter(creator => creator && creator.trim() !== '')
          .sort())];
        
        setCreators(uniqueCreators);
        setCards(sortedCards);
        setFilteredCards(sortedCards);
        setSets(setsData);
        setKeywords(keywordsData);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Preload related cards data when a card is selected for the detail modal
  useEffect(() => {
    if (selectedCardDetails && selectedCardDetails.relatedCards && selectedCardDetails.relatedCards.length > 0) {
      const preloadRelatedCardsData = async () => {
        const relatedCardIds = selectedCardDetails.relatedCards.map(card => card._id);
        const newPreloadedCards = { ...preloadedRelatedCards };
        
        // For each related card that's not already preloaded
        for (const relatedCard of selectedCardDetails.relatedCards) {
          if (!preloadedRelatedCards[relatedCard._id]) {
            try {
              // Check if the full card data is in our local cache
              const cachedCard = cards.find(card => card._id === relatedCard._id);
              if (cachedCard) {
                newPreloadedCards[relatedCard._id] = cachedCard;
              } else {
                // Otherwise fetch it (don't await here, let it happen in parallel)
                getCard(relatedCard._id, true)
                  .then(cardData => {
                    setPreloadedRelatedCards(prev => ({
                      ...prev,
                      [relatedCard._id]: cardData
                    }));
                  })
                  .catch(err => console.error(`Error preloading card ${relatedCard._id}:`, err));
              }
            } catch (err) {
              console.error(`Error preloading related card ${relatedCard._id}:`, err);
            }
          }
        }
        
        // Update the preloaded cards state with any cached cards we found
        if (Object.keys(newPreloadedCards).length > preloadedRelatedCards.length) {
          setPreloadedRelatedCards(newPreloadedCards);
        }
      };
      
      preloadRelatedCardsData();
    }
  }, [selectedCardDetails, cards, preloadedRelatedCards]);

  // Filter cards when search term or selected filters change
  useEffect(() => {
    if (cards.length === 0) return;
    
    let result = [...cards];
    
    // Filter cards from hidden sets if toggle is off
    if (!showHiddenSetCards && cardsFromHiddenSets.length > 0) {
      result = result.filter(card => !cardsFromHiddenSets.includes(card._id.toString()));
    }
    
    if (searchTerm.trim() !== '') {
      const searchTermLower = searchTerm.toLowerCase();
      result = result.filter(card => {
        if (card.title.toLowerCase().includes(searchTermLower)) {
          return true;
        }
        
        if (card.trait && card.trait.toLowerCase().includes(searchTermLower)) {
          return true;
        }
        
        if ((!card.cardType || card.cardType === 'Follower') && 
            ((card.unevolvedDescription && card.unevolvedDescription.toLowerCase().includes(searchTermLower)) || 
             (card.evolvedDescription && card.evolvedDescription.toLowerCase().includes(searchTermLower)))) {
          return true;
        }
        
        if (card.cardType === 'Spell' && 
            card.spellDescription && 
            card.spellDescription.toLowerCase().includes(searchTermLower)) {
          return true;
        }
        
        if (card.cardType === 'Amulet' && 
            card.amuletDescription && 
            card.amuletDescription.toLowerCase().includes(searchTermLower)) {
          return true;
        }
        
        return false;
      });
    }
    
    if (selectedClass !== '') {
      result = result.filter(card => card.class === selectedClass);
    }
    
    if (selectedRarity !== '') {
      result = result.filter(card => card.rarity === selectedRarity);
    }

    if (selectedSet !== '') {
      if (selectedSet === 'tokens') {
        result = result.filter(card => card.isToken === true);
      } else {
        const selectedSetData = sets.find(set => set._id === selectedSet);
        if (selectedSetData) {
          result = result.filter(card => selectedSetData.cards.includes(card._id));
        }
      }
    }

    if (selectedCreator !== '') {
      result = result.filter(card => card.creator === selectedCreator);
    }
    
    setFilteredCards(result);
  }, [searchTerm, selectedClass, selectedRarity, selectedSet, selectedCreator, cards, sets, showHiddenSetCards, cardsFromHiddenSets]);

  // Calculate detail position when window is resized
  useEffect(() => {
    const handleResize = () => {
      const newPositions = {};
      Object.keys(cardRefs.current).forEach(id => {
        const cardElement = cardRefs.current[id];
        if (cardElement) {
          const rect = cardElement.getBoundingClientRect();
          const windowWidth = window.innerWidth;
          // Calculate the center position of the card
          const cardCenter = rect.left + (rect.width / 2);
          // If the card's center is in the right half of the screen, show detail on the left
          newPositions[id] = cardCenter > windowWidth / 2 ? 'left' : 'right';
        }
      });
      setDetailPositions(newPositions);
    };

    // Initial calculation
    handleResize();

    // Add event listener for window resize
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [filteredCards]);

  const handleEdit = (id) => {
    navigate(`/edit/${id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      try {
        await deleteCard(id);
        // Re-sort the cards after deletion
        const updatedCards = cards.filter(card => card._id !== id);
        const sortedCards = sortCards(updatedCards);
        setCards(sortedCards);
        setFilteredCards(sortedCards.filter(card => {
          let match = true;
          
          if (searchTerm.trim() !== '') {
            const searchTermLower = searchTerm.toLowerCase();
            
            // Check title
            let textMatch = card.title.toLowerCase().includes(searchTermLower);

            // Check trait
            if (!textMatch && card.trait) {
              textMatch = card.trait.toLowerCase().includes(searchTermLower);
            }
            
            // Check descriptions based on card type
            if (!textMatch && (!card.cardType || card.cardType === 'Follower')) {
              textMatch = (card.unevolvedDescription && card.unevolvedDescription.toLowerCase().includes(searchTermLower)) || 
                         (card.evolvedDescription && card.evolvedDescription.toLowerCase().includes(searchTermLower));
            }
            
            if (!textMatch && card.cardType === 'Spell') {
              textMatch = card.spellDescription && card.spellDescription.toLowerCase().includes(searchTermLower);
            }
            
            if (!textMatch && card.cardType === 'Amulet') {
              textMatch = card.amuletDescription && card.amuletDescription.toLowerCase().includes(searchTermLower);
            }
            
            match = match && textMatch;
          }
          
          if (selectedClass !== '') {
            match = match && card.class === selectedClass;
          }
          
          if (selectedRarity !== '') {
            match = match && card.rarity === selectedRarity;
          }
          
          if (selectedSet !== '') {
            if (selectedSet === 'tokens') {
              match = match && card.isToken === true;
            } else {
              const selectedSetData = sets.find(set => set._id === selectedSet);
              match = match && (selectedSetData && selectedSetData.cards.includes(card._id));
            }
          }
          
          if (selectedCreator !== '') {
            match = match && card.creator === selectedCreator;
          }
          
          return match;
        }));
      } catch (err) {
        setError('Failed to delete card. Please try again later.');
      }
    }
  };

  // Prevent event propagation to avoid triggering parent events
  const handleButtonClick = (e) => {
    e.stopPropagation();
  };

  // Check if we're on a mobile/tablet device
  const isMobileOrTablet = () => {
    return window.innerWidth <= 1200;
  };

  // Handle mouse enter/leave for hover effect on desktop
  const handleMouseEnter = (id) => {
    if (!isMobileOrTablet()) {
      setActiveCardId(id);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobileOrTablet()) {
      setActiveCardId(null);
      setShowNotesForCard(null);
    }
  };

  // Handle card click for showing the detail modal
  const handleCardClick = (card, e) => {
    e.preventDefault();
    e.stopPropagation();
    // Log for debugging
    console.log('Selected card notes:', card.notes);
    setSelectedCardDetails(card);
  };

  // Close the detail modal
  const handleDetailClose = () => {
    setSelectedCardDetails(null);
  };

  // Prevent event propagation in modal
  const handleDetailClick = (e) => {
    e.stopPropagation();
  };

  // Handle double click to show notes
  const handleDoubleClick = (card) => {
    if (card.notes && card.notes.trim() !== '') {
      setShowNotesForCard(card._id);
    }
  };

  // Set ref for card element
  const setCardRef = (id, element) => {
    cardRefs.current[id] = element;
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle class filter change
  const handleClassChange = (e) => {
    setSelectedClass(e.target.value);
  };

  // Handle rarity filter change
  const handleRarityChange = (e) => {
    setSelectedRarity(e.target.value);
  };

  // Handle set filter change
  const handleSetChange = (e) => {
    setSelectedSet(e.target.value);
  };

  // Handle creator filter change
  const handleCreatorChange = (e) => {
    setSelectedCreator(e.target.value);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedClass('');
    setSelectedRarity('');
    setSelectedSet('');
    setSelectedCreator('');
  };

  // Class options for the filter dropdown
  const classOptions = [
    'Neutral', 'Forestcraft', 'Swordcraft', 'Runecraft', 
    'Dragoncraft', 'Shadowcraft', 'Bloodcraft', 'Havencraft', 
    'Portalcraft'
  ];

  // Rarity options for the filter dropdown
  const rarityOptions = ['Bronze', 'Silver', 'Gold', 'Legendary'];

  // Add handler to close mobile detail view
  const handleCloseMobileDetail = () => {
    setActiveCardId(null);
    setShowNotesForCard(null);
  };

  // Handle clicking on a related card to show its details
  const handleRelatedCardClick = async (relatedCard, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Reset the hovered related card state
    setHoveredRelatedCard(null);
    
    try {
      // First check if we have this card preloaded
      if (preloadedRelatedCards[relatedCard._id]) {
        setSelectedCardDetails(preloadedRelatedCards[relatedCard._id]);
        return;
      }
      
      // If the related card already has populated keywords and relatedCards, use it as is
      if (relatedCard.keywords && Array.isArray(relatedCard.keywords) && 
          relatedCard.keywords.length > 0 && typeof relatedCard.keywords[0] === 'object' &&
          relatedCard.relatedCards && Array.isArray(relatedCard.relatedCards)) {
        setSelectedCardDetails(relatedCard);
      } else {
        // Otherwise, try to find the full card data with populated keywords
        const fullCardData = cards.find(card => card._id === relatedCard._id);
        if (fullCardData) {
          setSelectedCardDetails(fullCardData);
        } else {
          // If the card isn't in our local cache (e.g., it might be from a hidden set),
          // we need to fetch it directly from the API
          try {
            // Pass true to indicate this is a related card view
            const cardData = await getCard(relatedCard._id, true);
            setSelectedCardDetails(cardData);
            
            // Also add it to our preloaded cards for future use
            setPreloadedRelatedCards(prev => ({
              ...prev,
              [relatedCard._id]: cardData
            }));
          } catch (err) {
            console.error('Error fetching card details:', err);
            // Fallback to using the minimal related card data we have
            // This ensures something is shown even if the fetch fails
            setSelectedCardDetails({
              ...relatedCard,
              keywords: [],
              relatedCards: []
            });
          }
        }
      }
    } catch (err) {
      console.error('Error handling related card click:', err);
      // Provide user feedback if needed
    }
  };

  // Handle hover on related card to show its name in the title
  const handleRelatedCardMouseEnter = (relatedCard) => {
    setHoveredRelatedCard(relatedCard);
  };

  // Handle hover end on related card to restore original title
  const handleRelatedCardMouseLeave = () => {
    setHoveredRelatedCard(null);
  };

  // Handle toggle for hidden set cards
  const handleToggleHiddenSetCards = () => {
    setShowHiddenSetCards(prev => !prev);
  };

  if (loading) {
    return <div className="loading">Loading cards...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="card-list-page">
      <div className="header">
        <h1>All Cards</h1>
        {isAdmin && (
          <div className="admin-controls">
            <Link to="/create" className="btn">Add Card</Link>
            <div className="hidden-sets-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={showHiddenSetCards}
                  onChange={handleToggleHiddenSetCards}
                />
                Show Hidden Set Cards
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search cards..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        
        <div className="filter-group">
          <select value={selectedClass} onChange={handleClassChange}>
            <option value="">All Classes</option>
            {classOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          
          <select value={selectedRarity} onChange={handleRarityChange}>
            <option value="">All Rarities</option>
            {rarityOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          
          <select value={selectedSet} onChange={handleSetChange}>
            <option value="">All Sets</option>
            <option value="tokens">Token</option>
            {sets.map(set => (
              <option key={set._id} value={set._id}>{set.name}</option>
            ))}
          </select>

          <select value={selectedCreator} onChange={handleCreatorChange}>
            <option value="">All Creators</option>
            {creators.map(creator => (
              <option key={creator} value={creator}>{creator}</option>
            ))}
          </select>
          
          <button onClick={handleClearFilters} className="clear-filters-btn">
            Clear Filters
          </button>
        </div>
      </div>

      {filteredCards.length === 0 ? (
        <div className="no-cards">
          <p>
            {cards.length === 0 
              ? 'No cards found. Create your first card!' 
              : 'No cards match your search criteria. Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="card-grid">
          {filteredCards.map(card => (
            <div 
              className="card-container" 
              key={card._id}
              ref={(el) => setCardRef(card._id, el)}
              onMouseEnter={() => handleMouseEnter(card._id)}
              onMouseLeave={handleMouseLeave}
              onClick={(e) => handleCardClick(card, e)}
              style={{ zIndex: activeCardId === card._id ? 1000 : 1 }}
            >
              <div className="card">
                <img 
                  src={card.imageUrl} 
                  alt={card.title} 
                  className="card-image" 
                />
                {card.isToken && <div className="token-label">Token</div>}
                {isAdmin && (
                  <div className="card-actions">
                    <button 
                      className="btn btn-edit"
                      onClick={(e) => {
                        handleButtonClick(e);
                        handleEdit(card._id);
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={(e) => {
                        handleButtonClick(e);
                        handleDelete(card._id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              
              <div 
                className={`card-detail ${activeCardId === card._id ? 'visible' : ''}`}
                style={{
                  left: detailPositions[card._id] === 'left' ? 'auto' : 'calc(100% + 20px)',
                  right: detailPositions[card._id] === 'left' ? 'calc(100% + 20px)' : 'auto'
                }}
              >
                <h3 className="card-title">{card.title}</h3>
                
                <div className="card-metadata">
                  <div className="card-metadata-row">
                    <div>
                      <span className="card-cost">{card.cost}</span>
                      <span className="card-class" title={card.class}>{card.class}</span>
                    </div>
                    <span className={`card-rarity card-rarity-${card.rarity.toLowerCase()}`}>{card.rarity}</span>
                  </div>
                  
                  <div className="card-metadata-row">
                    <div>
                      {card.trait && (
                        <span className="card-trait">
                          Trait: {card.trait}
                        </span>
                      )}
                      {card.isToken && !card.trait && (
                        <span className="card-token-badge">
                          Token
                        </span>
                      )}
                    </div>
                    <span className={`card-type-badge ${card.cardType?.toLowerCase() || 'follower'}`}>
                      {card.cardType || 'Follower'}
                    </span>
                  </div>
                  
                  {card.trait && card.isToken && (
                    <div className="card-metadata-row token-row">
                      <div>
                        <span className="card-token-badge">
                          Token
                        </span>
                      </div>
                      <div></div>
                    </div>
                  )}
                </div>
                
                {/* Follower card details */}
                {(!card.cardType || card.cardType === 'Follower') && (
                  <div className="card-descriptions">
                    <div className="description-section follower-section">
                      <h4 className="description-title">Unevolved</h4>
                      <div className="stats-row">
                        <span>Attack: <span className="attack-value">{card.unevolvedAttack}</span></span>
                        <span>Defense: <span className="defense-value">{card.unevolvedDefense}</span></span>
                      </div>
                      <p className="card-description">{formatText(card.unevolvedDescription)}</p>
                    </div>
                    
                    <div className="description-section">
                      <h4 className="description-title">Evolved</h4>
                      <div className="stats-row">
                        <span>Attack: <span className="attack-value">{card.evolvedAttack}</span></span>
                        <span>Defense: <span className="defense-value">{card.evolvedDefense}</span></span>
                      </div>
                      <p className="card-description">{formatText(card.evolvedDescription)}</p>
                    </div>
                  </div>
                )}
                
                {/* Spell card details */}
                {card.cardType === 'Spell' && (
                  <div className="card-descriptions" style={{ border: 'none', borderBottom: 'none' }}>
                    <div 
                      className="description-section spell-section" 
                      style={{ border: 'none', borderBottom: 'none' }}
                    >
                      <h4 className="description-title">Spell Effect</h4>
                      <p className="card-description">{formatText(card.spellDescription)}</p>
                    </div>
                  </div>
                )}
                
                {/* Amulet card details */}
                {card.cardType === 'Amulet' && (
                  <div className="card-descriptions">
                    <div className="description-section amulet-section" style={{ border: 'none', borderBottom: 'none' }}>
                      <h4 className="description-title">Amulet Effect</h4>
                      <p className="card-description">{formatText(card.amuletDescription)}</p>
                    </div>
                  </div>
                )}
                
                {/* Notes section inside the detail window */}
                {(card.notes && card.notes.trim() !== '') || (card.keywords && card.keywords.length > 0) ? (
                  <div 
                    className={`card-notes-section ${showNotesForCard === card._id ? 'show' : ''}`}
                  >
                    <div className="card-notes-divider"></div>
                    
                    {/* Keywords section */}
                    {card.keywords && card.keywords.length > 0 && (
                      <div className="card-keywords">
                        {card.keywords.map(keyword => (
                          <div 
                            key={keyword._id} 
                            className="keyword-banner"
                          >
                            <div 
                              className="keyword-overlay"
                              style={{
                                backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.5)), url(${keyword.imageUrl})`,
                                backgroundPosition: keyword.imagePosition || '50% 50%',
                                backgroundSize: 'cover'
                              }}
                            >
                              <h5 className="keyword-title">{keyword.title}</h5>
                              <div className="keyword-description-scrollable">
                                <p className="keyword-description">{keyword.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Notes content */}
                    {card.notes && card.notes.trim() !== '' && (
                      <div className="card-notes-content">
                        {card.notes.split('\n').filter(line => line.trim() !== '').map((line, index) => (
                          <div key={index} className="note-line">
                            {formatText(line)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Detail Modal */}
      {selectedCardDetails && (
        <div 
          className="deck-builder-card-detail card-list-detail-modal"
          onClick={handleDetailClose}
        >
          <div 
            className="detail-header"
            onClick={handleDetailClick}
          >
            <h3 className="card-title">{selectedCardDetails.title}</h3>
            <button 
              className="close-detail-btn" 
              onClick={handleDetailClose}
            >
              ×
            </button>
          </div>
          
          <div 
            className="card-detail-content"
            onClick={handleDetailClick}
          >
            <div className="card-detail-image">
              <img 
                src={selectedCardDetails.imageUrl} 
                alt={selectedCardDetails.title} 
              />
            </div>
            
            <div className="card-detail-info">
              <div className="card-metadata">
                <div className="card-metadata-row">
                  <div>
                    <span className="card-cost">{selectedCardDetails.cost}</span>
                    <span className="card-class" title={selectedCardDetails.class}>
                      {selectedCardDetails.class}
                    </span>
                  </div>
                  <span className={`card-rarity card-rarity-${selectedCardDetails.rarity.toLowerCase()}`}>
                    {selectedCardDetails.rarity}
                  </span>
                </div>
                
                <div className="card-metadata-row">
                  <div>
                    {selectedCardDetails.trait && (
                      <span className="card-trait">
                        Trait: {selectedCardDetails.trait}
                      </span>
                    )}
                    {selectedCardDetails.isToken && !selectedCardDetails.trait && (
                      <span className="card-token-badge">
                        Token
                      </span>
                    )}
                  </div>
                  <span className={`card-type-badge ${selectedCardDetails.cardType?.toLowerCase() || 'follower'}`}>
                    {selectedCardDetails.cardType || 'Follower'}
                  </span>
                </div>
                
                {selectedCardDetails.trait && selectedCardDetails.isToken && (
                  <div className="card-metadata-row token-row">
                    <div>
                      <span className="card-token-badge">
                        Token
                      </span>
                    </div>
                    <div></div>
                  </div>
                )}
              </div>
              
              {/* Follower card details */}
              {(!selectedCardDetails.cardType || selectedCardDetails.cardType === 'Follower') && (
                <div className="card-descriptions">
                  <div className="description-section follower-section">
                    <h4 className="description-title">Unevolved</h4>
                    <div className="stats-row">
                      <span>Attack: <span className="attack-value">{selectedCardDetails.unevolvedAttack}</span></span>
                      <span>Defense: <span className="defense-value">{selectedCardDetails.unevolvedDefense}</span></span>
                    </div>
                    <p className="card-description">{formatText(selectedCardDetails.unevolvedDescription)}</p>
                  </div>
                  
                  <div className="description-section">
                    <h4 className="description-title">Evolved</h4>
                    <div className="stats-row">
                      <span>Attack: <span className="attack-value">{selectedCardDetails.evolvedAttack}</span></span>
                      <span>Defense: <span className="defense-value">{selectedCardDetails.evolvedDefense}</span></span>
                    </div>
                    <p className="card-description">{formatText(selectedCardDetails.evolvedDescription)}</p>
                  </div>
                </div>
              )}
              
              {/* Spell card details */}
              {selectedCardDetails.cardType === 'Spell' && (
                <div className="card-descriptions">
                  <div className="description-section spell-section" style={{ border: 'none', borderBottom: 'none' }}>
                    <h4 className="description-title">Spell Effect</h4>
                    <p className="card-description">{formatText(selectedCardDetails.spellDescription)}</p>
                  </div>
                </div>
              )}
              
              {/* Amulet card details */}
              {selectedCardDetails.cardType === 'Amulet' && (
                <div className="card-descriptions">
                  <div className="description-section amulet-section" style={{ border: 'none', borderBottom: 'none' }}>
                    <h4 className="description-title">Amulet Effect</h4>
                    <p className="card-description">{formatText(selectedCardDetails.amuletDescription)}</p>
                  </div>
                </div>
              )}
              
              {/* Divider before Keywords/Related Cards/Notes */}
              <div className="card-notes-divider"></div>
              
              {/* Related Cards section - Move above Keywords */}
              {selectedCardDetails.relatedCards && selectedCardDetails.relatedCards.length > 0 && (
                <div className="related-cards-section">
                  <h4 className="related-cards-title">
                    {hoveredRelatedCard ? hoveredRelatedCard.title : "Related Cards"}
                  </h4>
                  <div className="related-cards-grid cards-only">
                    {selectedCardDetails.relatedCards.map(relatedCard => (
                      <div 
                        key={relatedCard._id} 
                        className="related-card cards-only"
                        onClick={(e) => handleRelatedCardClick(relatedCard, e)}
                        onMouseEnter={() => handleRelatedCardMouseEnter(relatedCard)}
                        onMouseLeave={handleRelatedCardMouseLeave}
                      >
                        <div className="related-card-image">
                          <img src={relatedCard.imageUrl} alt={relatedCard.title} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Keywords section */}
              {selectedCardDetails.keywords && selectedCardDetails.keywords.length > 0 && (
                <div className="card-keywords">
                  {selectedCardDetails.keywords.map(keyword => (
                    <div 
                      key={keyword._id} 
                      className="keyword-banner"
                    >
                      <div 
                        className="keyword-overlay"
                        style={{
                          backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.5)), url(${keyword.imageUrl})`,
                          backgroundPosition: keyword.imagePosition || '50% 50%',
                          backgroundSize: 'cover'
                        }}
                      >
                        <h5 className="keyword-title">{keyword.title}</h5>
                        <div className="keyword-description-scrollable">
                          <p className="keyword-description">{keyword.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Card Notes section */}
              {selectedCardDetails.notes && (
                <div className="card-notes-section">
                  <h4 className="notes-title">Details</h4>
                  <div className="notes-content">
                    {selectedCardDetails.notes.split('\n').map((line, index) => (
                      <p key={index} className="note-line">
                        {formatText(line || '')}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardList; 