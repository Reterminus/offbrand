import React, { useState, useEffect, useRef } from 'react';
import { getCards } from '../services/api';
import { formatText } from '../utils/textUtils';
import html2canvas from 'html2canvas';

const DeckBuilder = () => {
  const [cards, setCards] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
  const [deck, setDeck] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCost, setSelectedCost] = useState('');
  const [selectedCardType, setSelectedCardType] = useState('');
  const [exportView, setExportView] = useState(false);
  const deckRef = useRef(null);
  const [exportingDeck, setExportingDeck] = useState(false);
  const [activeCardId, setActiveCardId] = useState(null);
  const [detailPositions, setDetailPositions] = useState({});
  const cardRefs = useRef({});

  // Fetch all cards on component mount
  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true);
        const cardsData = await getCards();
        // Filter out token cards
        const nonTokenCards = cardsData.filter(card => !card.isToken);
        setCards(nonTokenCards);
        setFilteredCards(nonTokenCards);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch cards. Please try again later.');
        setLoading(false);
      }
    };

    fetchCards();
  }, []);

  // Filter cards when filters or search term changes
  useEffect(() => {
    if (cards.length === 0) return;

    let result = [...cards];

    // Filter by class (allow the selected class and Neutral)
    if (selectedClass) {
      result = result.filter(card => card.class === selectedClass || card.class === 'Neutral');
    }

    // Filter by card type (class/neutral)
    if (selectedCardType === 'class' && selectedClass) {
      result = result.filter(card => card.class === selectedClass);
    } else if (selectedCardType === 'neutral') {
      result = result.filter(card => card.class === 'Neutral');
    }

    // Filter by cost
    if (selectedCost !== '') {
      const cost = parseInt(selectedCost);
      if (cost < 10) {
        result = result.filter(card => card.cost === cost);
      } else {
        // 10+ cost
        result = result.filter(card => card.cost >= 10);
      }
    }

    // Filter by search term
    if (searchTerm.trim() !== '') {
      const searchTermLower = searchTerm.toLowerCase();
      result = result.filter(card => {
        // Search in card title
        if (card.title.toLowerCase().includes(searchTermLower)) {
          return true;
        }
        
        // Search in card trait
        if (card.trait && card.trait.toLowerCase().includes(searchTermLower)) {
          return true;
        }
        
        // Search in descriptions based on card type
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

    setFilteredCards(result);
  }, [selectedClass, selectedCost, searchTerm, selectedCardType, cards]);

  // Filter for class selection (first selection screen)
  const classOptions = [
    'Forestcraft', 'Swordcraft', 'Runecraft', 
    'Dragoncraft', 'Shadowcraft', 'Bloodcraft', 
    'Havencraft', 'Portalcraft'
  ];

  // Handle adding a card to the deck
  const addCardToDeck = (card) => {
    // Check if we already have 3 copies of this card
    const cardCount = deck.filter(c => c._id === card._id).length;
    if (cardCount >= 3) {
      alert('You can only have 3 copies of each card in your deck.');
      return;
    }

    // Check if this is the first card and it's not Neutral
    if (deck.length === 0 && card.class !== 'Neutral') {
      setSelectedClass(card.class);
    }

    // Check if the card's class matches the deck's class restriction
    if (deck.length > 0 && card.class !== 'Neutral' && card.class !== selectedClass) {
      alert(`This deck can only contain ${selectedClass} and Neutral cards.`);
      return;
    }

    // Check if adding this card would exceed 40 cards
    if (deck.length >= 40) {
      alert('Your deck is already full (40 cards).');
      return;
    }

    // All checks passed, add the card
    setDeck([...deck, card]);
  };

  // Handle removing a card from the deck
  const removeCardFromDeck = (index) => {
    const newDeck = [...deck];
    newDeck.splice(index, 1);
    setDeck(newDeck);

    // If the deck is now empty, reset the selected class
    /*if (newDeck.length === 0) {
      setSelectedClass('');
    }*/
  };

  // Handle class selection
  const handleClassSelect = (className) => {
    setSelectedClass(className);
  };

  // Handle searching
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle cost filter
  const handleCostChange = (e) => {
    setSelectedCost(e.target.value);
  };

  // Handle card type filter (class/neutral)
  const handleCardTypeChange = (e) => {
    setSelectedCardType(e.target.value);
  };

  // Handle clearing filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCost('');
    setSelectedCardType('');
  };

  // Count cards in deck by cost for the mana curve
  const getManaCurve = () => {
    const curve = Array(11).fill(0); // 0-10+ cost
    
    deck.forEach(card => {
      const cost = Math.min(card.cost, 10); // Group 10+ cost cards together
      curve[cost]++;
    });
    
    return curve;
  };

  // Group cards in deck by name and count for optimization
  const getGroupedDeckCards = () => {
    const grouped = {};
    
    deck.forEach(card => {
      if (!grouped[card._id]) {
        grouped[card._id] = {
          card,
          count: 1
        };
      } else {
        grouped[card._id].count++;
      }
    });
    
    // Convert to array and sort by cost and then name
    return Object.values(grouped).sort((a, b) => {
      if (a.card.cost !== b.card.cost) {
        return a.card.cost - b.card.cost;
      }
      return a.card.title.localeCompare(b.card.title);
    });
  };

  // Toggle export view
  const toggleExportView = () => {
    setExportView(!exportView);
  };

  // Export deck as image
  const exportDeck = async () => {
    if (!deckRef.current) return;
    
    try {
      setExportingDeck(true);

      // Set to export view before capturing
      setExportView(true);
      
      // Small delay to ensure the DOM has updated and images are loaded
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(deckRef.current, {
        backgroundColor: '#1a1a1a',
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${selectedClass || 'Shadowverse'}_Deck_${new Date().toISOString().split('T')[0]}.png`;
      link.click();
      
      // Reset back to normal view
      setExportView(false);
      setExportingDeck(false);
    } catch (err) {
      console.error('Error exporting deck:', err);
      alert('Failed to export deck as image. Please try again.');
      setExportView(false);
      setExportingDeck(false);
    }
  };

  // Calculate deck statistics
  const getDeckStats = () => {
    const stats = {
      followers: deck.filter(card => !card.cardType || card.cardType === 'Follower').length,
      spells: deck.filter(card => card.cardType === 'Spell').length,
      amulets: deck.filter(card => card.cardType === 'Amulet').length,
      neutralCount: deck.filter(card => card.class === 'Neutral').length,
      classCount: deck.filter(card => card.class !== 'Neutral').length
    };
    
    return stats;
  };

  // Counts of each card in the deck
  const getCardCounts = () => {
    const counts = {};
    
    deck.forEach(card => {
      counts[card._id] = (counts[card._id] || 0) + 1;
    });
    
    return counts;
  };

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

  // Handle mouse enter/leave for card detail
  const handleMouseEnter = (id) => {
    setActiveCardId(id);
  };

  const handleMouseLeave = () => {
    if (window.innerWidth > 768) {
      setActiveCardId(null);
    }
  };

  // Set ref for card element
  const setCardRef = (id, element) => {
    cardRefs.current[id] = element;
  };

  // Prevent event propagation to avoid triggering parent events
  const handleButtonClick = (e) => {
    e.stopPropagation();
  };

  // If still loading
  if (loading) {
    return <div className="loading">Loading cards...</div>;
  }

  // If error
  if (error) {
    return <div className="error-message">{error}</div>;
  }

  // Card counts for the view
  const cardCounts = getCardCounts();
  const groupedDeckCards = getGroupedDeckCards();

  return (
    <div className="deck-builder-page">
      <div className="header">
        <h1>Deck Builder</h1>
        {deck.length > 0 && (
          <div className="header-actions">
            <button 
              className="btn" 
              onClick={exportDeck}
              disabled={exportingDeck || deck.length !== 40}
            >
              {exportingDeck ? 'Exporting...' : 'Export Deck as Image'}
            </button>
          </div>
        )}
      </div>

      {!selectedClass ? (
        // Class selection screen
        <div className="class-selection">
          <h2>Select a Class</h2>
          <div className="class-grid">
            {classOptions.map(className => (
              <div 
                key={className} 
                className="class-card"
                onClick={() => handleClassSelect(className)}
              >
                <div className="class-icon">
                  {/* You could add class icons here */}
                </div>
                <h3>{className}</h3>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Deck building interface
        <div className="deck-builder-interface">
          <div className="deck-builder-container">
            {/* Card Browser */}
            <div className="card-browser">
              <h2>Card Browser</h2>
              
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
                  <select value={selectedCost} onChange={handleCostChange}>
                    <option value="">All Costs</option>
                    {[...Array(10).keys()].map(i => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                    <option value="10">10+</option>
                  </select>
                  
                  {/* New filter for class/neutral */}
                  <select value={selectedCardType} onChange={handleCardTypeChange}>
                    <option value="">All Cards</option>
                    <option value="class">{selectedClass} Cards</option>
                    <option value="neutral">Neutral Cards</option>
                  </select>
                  
                  <button onClick={clearFilters} className="clear-filters-btn">
                    Clear Filters
                  </button>
                </div>
              </div>

              <div className="card-browser-grid">
                {filteredCards.map(card => (
                  <div 
                    key={card._id} 
                    className="browsable-card"
                    ref={(el) => setCardRef(card._id, el)}
                    onMouseEnter={() => handleMouseEnter(card._id)}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => {
                      handleButtonClick(e);
                      addCardToDeck(card);
                    }}
                    style={{ zIndex: activeCardId === card._id ? 1000 : 1 }}
                  >
                    <div className="card-count-badge">
                      {cardCounts[card._id] || 0}/3
                    </div>
                    <img 
                      src={card.imageUrl} 
                      alt={card.title} 
                      className="card-thumbnail" 
                    />
                    <div className="card-info">
                      <div className="card-cost-badge">{card.cost}</div>
                      <div className="card-title-small">{card.title}</div>
                      <div className={`card-class-small ${card.class.toLowerCase()}`}>
                        {card.class}
                      </div>
                    </div>
                    
                    {/* Card Detail Window */}
                    <div 
                      className="card-detail"
                      style={{
                        left: detailPositions[card._id] === 'left' ? 'auto' : 'calc(100% + 20px)',
                        right: detailPositions[card._id] === 'left' ? 'calc(100% + 20px)' : 'auto',
                        opacity: activeCardId === card._id ? 1 : 0,
                        visibility: activeCardId === card._id ? 'visible' : 'hidden'
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
                        <div className="card-descriptions">
                          <div className="description-section spell-section" style={{ border: 'none', borderBottom: 'none' }}>
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Current Deck */}
            <div className={`current-deck ${exportView ? 'export-view' : ''}`} ref={deckRef}>
              <div className="deck-header">
                <h2>{selectedClass} Deck ({deck.length}/40)</h2>
                
                <div className="deck-stats">
                  <div className="deck-stats-row">
                    <span>Followers: {getDeckStats().followers}</span>
                    <span>Spells: {getDeckStats().spells}</span>
                    <span>Amulets: {getDeckStats().amulets}</span>
                  </div>
                  <div className="deck-stats-row">
                    <span>{selectedClass}: {getDeckStats().classCount}</span>
                    <span>Neutral: {getDeckStats().neutralCount}</span>
                  </div>
                </div>
                
                {!exportView && (
                  <div className="mana-curve">
                    {getManaCurve().map((count, cost) => (
                      <div key={cost} className="mana-bar">
                        <div 
                          className="mana-bar-fill" 
                          style={{ height: `${Math.min(100, count * 10)}%` }}
                        ></div>
                        <div className="mana-cost">{cost === 10 ? "10+" : cost}</div>
                        <div className="mana-count">{count}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="deck-cards">
                {deck.length === 0 ? (
                  <div className="empty-deck">
                    <p>empty deck lmao</p>
                  </div>
                ) : exportView ? (
                  // Optimized view for export - group cards by count
                  <div className="deck-card-list export-list">
                    {groupedDeckCards.map(({ card, count }) => (
                      <div 
                        key={`export-${card._id}`} 
                        className="deck-card export-card"
                      >
                        <div className="export-card-count">{count}x</div>
                        <div className="export-card-thumbnail">
                          <img 
                            src={card.imageUrl} 
                            alt={card.title} 
                            className="mini-card-image" 
                          />
                        </div>
                        <div className="deck-card-info">
                          <div className="deck-card-cost">{card.cost}</div>
                          <div className="deck-card-title">{card.title}</div>
                          <div className={`deck-card-class ${card.class.toLowerCase()}`}>
                            {card.class}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Normal view for building - show all cards individually
                  <div className="deck-card-list">
                    {deck.sort((a, b) => {
                      // Sort by cost, then by card title
                      if (a.cost !== b.cost) return a.cost - b.cost;
                      return a.title.localeCompare(b.title);
                    }).map((card, index) => (
                      <div 
                        key={`${card._id}-${index}`} 
                        className="deck-card"
                        onClick={() => removeCardFromDeck(index)}
                      >
                        <img 
                          src={card.imageUrl} 
                          alt={card.title} 
                          className="deck-card-thumbnail" 
                        />
                        <div className="deck-card-info">
                          <div className="deck-card-cost">{card.cost}</div>
                          <div className="deck-card-title">{card.title}</div>
                          <div className={`deck-card-class ${card.class.toLowerCase()}`}>
                            {card.class}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeckBuilder; 