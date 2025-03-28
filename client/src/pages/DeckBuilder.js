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
  const deckRef = useRef(null);
  const [exportingDeck, setExportingDeck] = useState(false);
  const [selectedCardDetails, setSelectedCardDetails] = useState(null);

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

    // Sort cards by cost, then class (selected class first), then rarity, then card type
    result.sort((a, b) => {
      // First sort by cost
      if (a.cost !== b.cost) {
        return a.cost - b.cost;
      }
      
      // Then sort by class (selected class first, neutral last)
      if (a.class !== b.class) {
        // If the selected class is present, it should appear first
        if (a.class === selectedClass) return -1;
        if (b.class === selectedClass) return 1;
        
        // Neutral cards should be last
        if (a.class === 'Neutral') return 1;
        if (b.class === 'Neutral') return -1;
        
        // Other classes sorted alphabetically
        return a.class.localeCompare(b.class);
      }
      
      // Then sort by rarity (Legendary, Gold, Silver, Bronze)
      const rarityOrder = { 'Legendary': 0, 'Gold': 1, 'Silver': 2, 'Bronze': 3 };
      // Handle case where rarity might not match exactly or be undefined
      const aRarityValue = rarityOrder[a.rarity] !== undefined ? rarityOrder[a.rarity] : 999;
      const bRarityValue = rarityOrder[b.rarity] !== undefined ? rarityOrder[b.rarity] : 999;
      
      if (aRarityValue !== bRarityValue) {
        return aRarityValue - bRarityValue;
      }
      
      // Then sort by card type (Follower, Spell, Amulet)
      const typeOrder = { 'Follower': 0, 'Spell': 1, 'Amulet': 2 };
      const aType = a.cardType || 'Follower';
      const bType = b.cardType || 'Follower';
      
      if (typeOrder[aType] !== typeOrder[bType]) {
        return typeOrder[aType] - typeOrder[bType];
      }
      
      // Finally sort by card name
      return a.title.localeCompare(b.title);
    });

    setFilteredCards(result);
  }, [selectedClass, selectedCost, searchTerm, selectedCardType, cards]);

  // Filter for class selection (first selection screen)
  const classOptions = [
    'Forestcraft', 'Swordcraft', 'Runecraft', 
    'Dragoncraft', 'Shadowcraft', 'Bloodcraft', 
    'Havencraft', 'Portalcraft'
  ];

  // Class icon URLs
  const classIcons = {
    'Forestcraft': 'https://i.imgur.com/5jy1gEE.png',
    'Swordcraft': 'https://i.imgur.com/f0wdoOs.png',
    'Runecraft': 'https://i.imgur.com/NO0WSFV.png',
    'Dragoncraft': 'https://i.imgur.com/O6AM8nz.png',
    'Shadowcraft': 'https://i.imgur.com/XXbSrdK.png',
    'Bloodcraft': 'https://i.imgur.com/2pfTjrj.png',
    'Havencraft': 'https://i.imgur.com/xGSGSkT.png',
    'Portalcraft': 'https://i.imgur.com/p4foy4o.png'
  };

  // Handle clicking on a card to view details
  const handleCardDetailView = (card, e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent adding to deck when viewing details
    setSelectedCardDetails(card);
  };

  // Close the card detail view when clicking outside
  const handleDetailClose = () => {
    setSelectedCardDetails(null);
  };

  // Prevent events from propagating to parent elements
  const handleDetailClick = (e) => {
    e.stopPropagation();
  };

  // Handle adding a card to the deck
  const addCardToDeck = (card) => {
    // Check if we already have 3 copies of this card
    const cardCount = deck.filter(c => c._id === card._id).length;
    if (cardCount >= 3) {
      /*alert('You can only have 3 copies of each card in your deck.');*/
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
      /*alert('Your deck is already full (40 cards).');*/
      return;
    }

    // All checks passed, add the card
    setDeck([...deck, card]);
  };

  // Handle removing a card from the deck - Modified to work with grouped cards
  const removeCardFromDeck = (cardId) => {
    // Find the first occurrence of the card in the deck
    const index = deck.findIndex(card => card._id === cardId);
    if (index !== -1) {
      const newDeck = [...deck];
      newDeck.splice(index, 1);
      setDeck(newDeck);
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

  // Export deck as image
  const exportDeck = async () => {
    if (!deckRef.current) return;
    
    // Check if deck has exactly 40 cards and show alert if not
    if (deck.length !== 40) {
      alert(`A ${deck.length} card deck isn't legal. Fill out your deck lmao`);
      return;
    }
    
    try {
      setExportingDeck(true);
      
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
      
      setExportingDeck(false);
    } catch (err) {
      console.error('Error exporting deck:', err);
      alert('Failed to export deck as image. Please try again.');
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
            {/* Top row - First 4 classes */}
            {classOptions.slice(0, 4).map(className => (
              <div 
                key={className} 
                className="class-card"
                onClick={() => handleClassSelect(className)}
              >
                <div className="class-icon">
                  <img 
                    src={classIcons[className]} 
                    alt={className} 
                  />
                </div>
                <h3>{className}</h3>
              </div>
            ))}
            
            {/* Bottom row - Last 4 classes */}
            {classOptions.slice(4).map(className => (
              <div 
                key={className} 
                className="class-card"
                onClick={() => handleClassSelect(className)}
              >
                <div className="class-icon">
                  <img 
                    src={classIcons[className]} 
                    alt={className} 
                  />
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
                    onClick={() => addCardToDeck(card)}
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
                    <button 
                      className="view-details-btn"
                      onClick={(e) => handleCardDetailView(card, e)}
                      title="View card details"
                    >
                      ℹ
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Current Deck - Always use export view style */}
            <div className="current-deck export-view" ref={deckRef}>
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
                
                {/* Always show mana curve */}
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
              </div>
              
              <div className="deck-cards">
                {deck.length === 0 ? (
                  <div className="empty-deck">
                    <p>empty deck lmao</p>
                  </div>
                ) : (
                  // Always use the export list view for grouping cards
                  <div className="deck-card-list export-list">
                    {getGroupedDeckCards().map(({ card, count }) => (
                      <div 
                        key={`export-${card._id}`} 
                        className="deck-card export-card"
                        onClick={() => removeCardFromDeck(card._id)}
                        title="Click to remove one copy"
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
                )}
              </div>
            </div>
          </div>

          {/* Card Detail Panel */}
          {selectedCardDetails && (
            <div 
              className="deck-builder-card-detail"
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
                  
                  <div className="detail-actions">
                    <button 
                      className="add-to-deck-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        addCardToDeck(selectedCardDetails);
                        // You may choose to close the detail view after adding or keep it open
                        // setSelectedCardDetails(null);
                      }}
                      disabled={deck.filter(c => c._id === selectedCardDetails._id).length >= 3 || deck.length >= 40}
                    >
                      Add to Deck ({deck.filter(c => c._id === selectedCardDetails._id).length}/3)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DeckBuilder; 