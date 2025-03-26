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
  const [hoveredCard, setHoveredCard] = useState(null); // State for tracking hovered card
  const [detailPosition, setDetailPosition] = useState({ top: 0, left: 0 }); // Position of detail window
  const deckRef = useRef(null);
  const [exportingDeck, setExportingDeck] = useState(false);

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
    if (newDeck.length === 0) {
      setSelectedClass('');
    }
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

  // Handle card hover for details
  const handleCardHover = (card, event) => {
    setHoveredCard(card);
    
    const cardElement = event.currentTarget;
    const rect = cardElement.getBoundingClientRect();
    const scrollY = window.scrollY;
    
    // Determine whether to show detail on left or right
    const windowWidth = window.innerWidth;
    const detailWidth = 450; // Width of detail window
    
    let left, top;
    
    if (rect.right + detailWidth > windowWidth) {
      // Show on left
      left = rect.left - detailWidth - 10;
    } else {
      // Show on right
      left = rect.right + 10;
    }
    
    // Center vertically with the card
    top = rect.top + scrollY - (450 / 2) + (rect.height / 2);
    
    // Ensure the detail stays within viewport vertically
    const detailHeight = 600; // Approximate max height of detail
    if (top + detailHeight > document.body.scrollHeight) {
      top = document.body.scrollHeight - detailHeight - 20;
    }
    if (top < scrollY) {
      top = scrollY + 20;
    }
    
    setDetailPosition({ top, left });
  };

  // Handle card hover end
  const handleCardHoverEnd = () => {
    setHoveredCard(null);
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
                    className="card-container"
                  >
                    <div
                      className="browsable-card"
                      onClick={() => addCardToDeck(card)}
                      onMouseEnter={(e) => handleCardHover(card, e)}
                      onMouseLeave={handleCardHoverEnd}
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
                    </div>
                    
                    {/* Card Detail Window */}
                    {hoveredCard && hoveredCard._id === card._id && (
                      <div 
                        className="card-detail" 
                        style={{
                          opacity: 1,
                          visibility: 'visible',
                          top: `${detailPosition.top}px`,
                          left: `${detailPosition.left}px`,
                          right: 'auto'
                        }}
                      >
                        <div className="card-title">{card.title}</div>
                        
                        <div className="card-metadata">
                          <div className="card-metadata-row">
                            <span>
                              <span className={`card-type-badge ${card.cardType ? card.cardType.toLowerCase() : 'follower'}`}>
                                {card.cardType || 'Follower'}
                              </span>
                            </span>
                            <span className="card-class" title={card.class}>
                              {card.class}
                            </span>
                          </div>
                          
                          <div className="card-metadata-row">
                            <span>
                              Cost: <span className="cost-label">{card.cost}</span>
                            </span>
                            <span className={`card-rarity card-rarity-${card.rarity ? card.rarity.toLowerCase() : ''}`}>
                              {card.rarity}
                            </span>
                          </div>
                          
                          {card.trait && (
                            <div className="card-trait">
                              Trait: {card.trait}
                            </div>
                          )}
                        </div>
                        
                        <div className="card-descriptions">
                          {(!card.cardType || card.cardType === 'Follower') && (
                            <>
                              <div className="description-section">
                                <div className="stats-row">
                                  <span>
                                    <span className="attack-label">Attack:</span> <span className="attack-value">{card.unevolvedAttack || '?'}</span>
                                  </span>
                                  <span>
                                    <span className="defense-label">Defense:</span> <span className="defense-value">{card.unevolvedDefense || '?'}</span>
                                  </span>
                                </div>
                                <div className="description-title">Unevolved</div>
                                <div className="card-description">{formatText(card.unevolvedDescription || '')}</div>
                              </div>
                              
                              <div className="description-section">
                                <div className="stats-row">
                                  <span>
                                    <span className="attack-label">Attack:</span> <span className="attack-value">{card.evolvedAttack || '?'}</span>
                                  </span>
                                  <span>
                                    <span className="defense-label">Defense:</span> <span className="defense-value">{card.evolvedDefense || '?'}</span>
                                  </span>
                                </div>
                                <div className="description-title">Evolved</div>
                                <div className="card-description">{formatText(card.evolvedDescription || '')}</div>
                              </div>
                            </>
                          )}
                          
                          {card.cardType === 'Spell' && (
                            <div className="description-section">
                              <div className="card-description">{formatText(card.spellDescription || '')}</div>
                            </div>
                          )}
                          
                          {card.cardType === 'Amulet' && (
                            <div className="description-section">
                              <div className="card-description">{formatText(card.amuletDescription || '')}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
                    <p>Your deck is empty. Click on cards in the browser to add them.</p>
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
                        className="card-container"
                      >
                        <div 
                          className="deck-card"
                          onClick={() => removeCardFromDeck(index)}
                          onMouseEnter={(e) => handleCardHover(card, e)}
                          onMouseLeave={handleCardHoverEnd}
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
                        
                        {/* Card Detail Window */}
                        {hoveredCard && hoveredCard._id === card._id && (
                          <div 
                            className="card-detail" 
                            style={{
                              opacity: 1,
                              visibility: 'visible',
                              top: `${detailPosition.top}px`,
                              left: `${detailPosition.left}px`,
                              right: 'auto'
                            }}
                          >
                            <div className="card-title">{card.title}</div>
                            
                            <div className="card-metadata">
                              <div className="card-metadata-row">
                                <span>
                                  <span className={`card-type-badge ${card.cardType ? card.cardType.toLowerCase() : 'follower'}`}>
                                    {card.cardType || 'Follower'}
                                  </span>
                                </span>
                                <span className="card-class" title={card.class}>
                                  {card.class}
                                </span>
                              </div>
                              
                              <div className="card-metadata-row">
                                <span>
                                  Cost: <span className="cost-label">{card.cost}</span>
                                </span>
                                <span className={`card-rarity card-rarity-${card.rarity ? card.rarity.toLowerCase() : ''}`}>
                                  {card.rarity}
                                </span>
                              </div>
                              
                              {card.trait && (
                                <div className="card-trait">
                                  Trait: {card.trait}
                                </div>
                              )}
                            </div>
                            
                            <div className="card-descriptions">
                              {(!card.cardType || card.cardType === 'Follower') && (
                                <>
                                  <div className="description-section">
                                    <div className="stats-row">
                                      <span>
                                        <span className="attack-label">Attack:</span> <span className="attack-value">{card.unevolvedAttack || '?'}</span>
                                      </span>
                                      <span>
                                        <span className="defense-label">Defense:</span> <span className="defense-value">{card.unevolvedDefense || '?'}</span>
                                      </span>
                                    </div>
                                    <div className="description-title">Unevolved</div>
                                    <div className="card-description">{formatText(card.unevolvedDescription || '')}</div>
                                  </div>
                                  
                                  <div className="description-section">
                                    <div className="stats-row">
                                      <span>
                                        <span className="attack-label">Attack:</span> <span className="attack-value">{card.evolvedAttack || '?'}</span>
                                      </span>
                                      <span>
                                        <span className="defense-label">Defense:</span> <span className="defense-value">{card.evolvedDefense || '?'}</span>
                                      </span>
                                    </div>
                                    <div className="description-title">Evolved</div>
                                    <div className="card-description">{formatText(card.evolvedDescription || '')}</div>
                                  </div>
                                </>
                              )}
                              
                              {card.cardType === 'Spell' && (
                                <div className="description-section">
                                  <div className="card-description">{formatText(card.spellDescription || '')}</div>
                                </div>
                              )}
                              
                              {card.cardType === 'Amulet' && (
                                <div className="description-section">
                                  <div className="card-description">{formatText(card.amuletDescription || '')}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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