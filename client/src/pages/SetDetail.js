import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getSet, getCards, addCardToSet, removeCardFromSet } from '../services/api';
import { sortCards } from '../utils/cardUtils';
import { formatText } from '../utils/textUtils';
import { AuthContext } from '../context/AuthContext';

const SetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useContext(AuthContext);
  const [set, setSet] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [addingCard, setAddingCard] = useState(false);
  const [activeCardId, setActiveCardId] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [detailPositions, setDetailPositions] = useState({});
  const [showNotesForCard, setShowNotesForCard] = useState(null);
  const cardRefs = useRef({});
  
  // New state for card filtering
  const [cardSearchTerm, setCardSearchTerm] = useState('');
  const [selectedFilterClass, setSelectedFilterClass] = useState('');
  const [selectedFilterRarity, setSelectedFilterRarity] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [setData, cardsData] = await Promise.all([
          getSet(id),
          getCards()
        ]);
        
        // Sort the cards in the set
        if (setData.cards && setData.cards.length > 0) {
          setData.cards = sortCards(setData.cards);
        }
        
        // Sort all cards for the dropdown
        const sortedAllCards = sortCards(cardsData);
        
        setSet(setData);
        setAllCards(sortedAllCards);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Calculate detail position when window is resized
  useEffect(() => {
    if (!set || !set.cards || viewMode !== 'grid') return;

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
  }, [set, viewMode]);

  const handleAddCard = async () => {
    if (!selectedCardId) return;
    
    try {
      setAddingCard(true);
      await addCardToSet(id, selectedCardId);
      
      // Refresh set data to show the newly added card
      const updatedSet = await getSet(id);
      
      // Sort the cards in the updated set
      if (updatedSet.cards && updatedSet.cards.length > 0) {
        updatedSet.cards = sortCards(updatedSet.cards);
      }
      
      setSet(updatedSet);
      setSelectedCardId('');
      setAddingCard(false);
    } catch (err) {
      setError('Failed to add card to set. Please try again later.');
      setAddingCard(false);
    }
  };

  const handleRemoveCard = async (cardId) => {
    if (window.confirm('Are you sure you want to remove this card from the set?')) {
      try {
        await removeCardFromSet(id, cardId);
        
        // Update local state to reflect the removal
        const updatedCards = set.cards.filter(card => card._id !== cardId);
        
        // Sort the remaining cards
        const sortedCards = sortCards(updatedCards);
        
        setSet({
          ...set,
          cards: sortedCards
        });
      } catch (err) {
        setError('Failed to remove card from set. Please try again later.');
      }
    }
  };

  // Handle mouse enter/leave for cards
  const handleMouseEnter = (cardId) => {
    setActiveCardId(cardId);
  };

  const handleMouseLeave = () => {
    setActiveCardId(null);
    // Hide notes when mouse leaves the card
    setShowNotesForCard(null);
  };

  // Handle double click to show notes
  const handleDoubleClick = (card) => {
    // Only show notes popup in grid view
    if (viewMode === 'grid' && card.notes && card.notes.trim() !== '') {
      setShowNotesForCard(card._id);
    }
  };

  // Add event listener to close notes when clicking outside in list view
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (viewMode === 'list' && showNotesForCard) {
        // Check if the click was outside the notes window
        const notesElement = document.querySelector('.card-notes.show');
        if (notesElement && !notesElement.contains(event.target)) {
          setShowNotesForCard(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [viewMode, showNotesForCard]);

  // Prevent event propagation to avoid triggering parent events
  const handleButtonClick = (e) => {
    e.stopPropagation();
  };

  // Set ref for card element
  const setCardRef = (id, element) => {
    cardRefs.current[id] = element;
  };

  // Get available cards (cards not already in the set)
  const availableCards = allCards.filter(card => 
    !set?.cards.some(setCard => setCard._id === card._id) &&
    // Apply search and filters
    (cardSearchTerm === '' || 
      card.title.toLowerCase().includes(cardSearchTerm.toLowerCase()) ||
      (card.description && card.description.toLowerCase().includes(cardSearchTerm.toLowerCase()))
    ) &&
    (selectedFilterClass === '' || card.class === selectedFilterClass) &&
    (selectedFilterRarity === '' || card.rarity === selectedFilterRarity)
  );

  // Get the selected card object
  const selectedCard = selectedCardId ? allCards.find(card => card._id === selectedCardId) : null;

  // Class options for the filter dropdown
  const classOptions = [
    'Neutral', 'Forestcraft', 'Swordcraft', 'Runecraft', 
    'Dragoncraft', 'Shadowcraft', 'Bloodcraft', 'Havencraft', 
    'Portalcraft'
  ];

  // Rarity options for the filter dropdown
  const rarityOptions = ['Bronze', 'Silver', 'Gold', 'Legendary'];

  // Clear all filters
  const handleClearFilters = () => {
    setCardSearchTerm('');
    setSelectedFilterClass('');
    setSelectedFilterRarity('');
  };

  if (loading) {
    return <div className="loading">Loading set details...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!set) {
    return <div className="error-message">Set not found.</div>;
  }

  return (
    <div className="set-detail-page">
      <div className="header">
        <div className="header-title">
          <h1>{set.name}</h1>
          <div className="view-toggle">
            <button 
              className={`btn-toggle ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              Grid View
            </button>
            <button 
              className={`btn-toggle ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              List View
            </button>
          </div>
        </div>
        <div className="header-actions">
          {isAdmin && (
            <Link to={`/sets/edit/${id}`} className="btn btn-primary">Edit Set</Link>
          )}
          <Link to="/sets" className="btn btn-secondary">Back to Sets</Link>
        </div>
      </div>

      {set.description && (
        <div className="set-description-box">
          <p>{set.description}</p>
        </div>
      )}

      {isAdmin && (
        <div className="set-management">
          <h2>Add Cards to Set</h2>
          
          <div className="add-card-filters">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search cards by name or description..."
                value={cardSearchTerm}
                onChange={(e) => setCardSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="filter-container">
              <select
                value={selectedFilterClass}
                onChange={(e) => setSelectedFilterClass(e.target.value)}
                className="class-filter"
              >
                <option value="">All Classes</option>
                {classOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              
              <select
                value={selectedFilterRarity}
                onChange={(e) => setSelectedFilterRarity(e.target.value)}
                className="rarity-filter"
              >
                <option value="">All Rarities</option>
                {rarityOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              
              {(cardSearchTerm || selectedFilterClass || selectedFilterRarity) && (
                <button 
                  className="btn btn-secondary clear-filters"
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
          
          <div className="add-card-form">
            <div className="card-selection-container">
              <select 
                value={selectedCardId} 
                onChange={(e) => setSelectedCardId(e.target.value)}
                disabled={addingCard || availableCards.length === 0}
                className="card-select"
              >
                <option value="">
                  {availableCards.length === 0 
                    ? 'No cards available to add' 
                    : `Select a card to add (${availableCards.length} available)`}
                </option>
                {availableCards.map(card => (
                  <option key={card._id} value={card._id}>
                    {card.title} ({card.class}, {card.rarity})
                  </option>
                ))}
              </select>
              <button 
                className="btn btn-primary" 
                onClick={handleAddCard}
                disabled={!selectedCardId || addingCard}
              >
                {addingCard ? 'Adding...' : 'Add Card'}
              </button>
            </div>
            
            {selectedCard && (
              <div className="selected-card-preview">
                <div className="preview-image">
                  <img src={selectedCard.imageUrl} alt={selectedCard.title} />
                </div>
                <div className="preview-details">
                  <h3>{selectedCard.title}</h3>
                  <div className="preview-metadata">
                    <p>
                      <span className="preview-label">Class:</span> 
                      <span className={`preview-class preview-class-${selectedCard.class.toLowerCase()}`}>
                        {selectedCard.class}
                      </span>
                    </p>
                    <p>
                      <span className="preview-label">Rarity:</span> 
                      <span className={`preview-rarity preview-rarity-${selectedCard.rarity.toLowerCase()}`}>
                        {selectedCard.rarity}
                      </span>
                    </p>
                    <p>
                      <span className="preview-label">Cost:</span> {selectedCard.cost}
                    </p>
                    {selectedCard.trait && (
                      <p>
                        <span className="preview-label">Trait:</span> {selectedCard.trait}
                      </p>
                    )}
                    {selectedCard.isToken && (
                      <p className="preview-token">Token Card</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <h2>Cards in this Set ({set.cards.length})</h2>
      
      {set.cards.length === 0 ? (
        <div className="no-cards">
          <p>No cards in this set yet. {isAdmin ? 'Add some cards using the form above.' : ''}</p>
        </div>
      ) : viewMode === 'grid' ? (
        // Grid View (similar to CardList)
        <div className="card-grid">
          {set.cards.map(card => (
            <div 
              className="card-container" 
              key={card._id}
              ref={(el) => setCardRef(card._id, el)}
              onMouseEnter={() => handleMouseEnter(card._id)}
              onMouseLeave={handleMouseLeave}
              onDoubleClick={() => handleDoubleClick(card)}
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
                    <Link 
                      to={`/edit/${card._id}`} 
                      className="btn btn-edit"
                      onClick={handleButtonClick}
                    >
                      Edit
                    </Link>
                    <button 
                      className="btn btn-danger"
                      onClick={(e) => {
                        handleButtonClick(e);
                        handleRemoveCard(card._id);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              
              <div 
                className="card-detail"
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
                      <span className="card-class">{card.class}</span>
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
                      {card.isToken && (
                        <span className="card-token-badge">
                          Token
                        </span>
                      )}
                    </div>
                    <span className={`card-type-badge ${card.cardType?.toLowerCase() || 'follower'}`}>
                      {card.cardType || 'Follower'}
                    </span>
                  </div>
                </div>
                
                {/* Follower card details */}
                {(!card.cardType || card.cardType === 'Follower') && (
                  <div className="card-descriptions">
                    <div className="description-section">
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
                    <div className="description-section">
                      <h4 className="description-title">Spell Effect</h4>
                      <p className="card-description">{formatText(card.spellDescription)}</p>
                    </div>
                  </div>
                )}
                
                {/* Amulet card details */}
                {card.cardType === 'Amulet' && (
                  <div className="card-descriptions">
                    <div className="description-section">
                      <h4 className="description-title">Amulet Effect</h4>
                      <p className="card-description">{formatText(card.amuletDescription)}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Notes popup */}
              {card.notes && card.notes.trim() !== '' && (
                <div 
                  className={`card-notes ${showNotesForCard === card._id ? 'show' : ''}`}
                  style={{
                    left: detailPositions[card._id] === 'left' ? 'auto' : 'calc(100% + 400px)',
                    right: detailPositions[card._id] === 'left' ? 'calc(100% + 400px)' : 'auto'
                  }}
                >
                  <h3 className="card-notes-title">{card.title} Details</h3>
                  <div className="card-notes-content">
                    {card.notes.split('\n').filter(line => line.trim() !== '').map((line, index) => (
                      <div key={index} className="note-line">
                        {formatText(line)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // List View (original implementation)
        <div className="set-cards">
          {set.cards.map(card => (
            <div 
              className="set-card-item" 
              key={card._id}
              onDoubleClick={() => handleDoubleClick(card)}
            >
              <div className="set-card-image">
                <img src={card.imageUrl} alt={card.title} />
                {card.isToken && <div className="token-label">Token</div>}
              </div>
              <div className="set-card-info">
                <div className="set-card-header">
                  <h3>{card.title}</h3>
                  <div className="set-card-meta">
                    <span className="cost-badge">{card.cost}</span>
                    <span className={`card-class-badge ${card.class.toLowerCase()}`}>{card.class}</span>
                    <span className={`card-rarity-badge card-rarity-${card.rarity.toLowerCase()}`}>{card.rarity}</span>
                    <span className={`card-type-badge ${card.cardType?.toLowerCase() || 'follower'}`}>
                      {card.cardType || 'Follower'}
                    </span>
                    {card.trait && <span className="card-trait-badge">Trait: {card.trait}</span>}
                  </div>
                </div>
                
                <div className="set-card-content">
                  {/* Creator info */}
                  <div className="description-section list-section creator-section">
                    <h4 className="description-title">Creator</h4>
                    <p className="card-description">
                      {card.creator ? card.creator : <span className="no-creator">No creator specified</span>}
                    </p>
                  </div>
                  
                  {/* Follower card details */}
                  {(!card.cardType || card.cardType === 'Follower') && (
                    <div className="card-descriptions list-descriptions">
                      <div className="description-section list-section">
                        <h4 className="description-title">Unevolved: <span className="stats-inline">
                          <span className="attack-value">{card.unevolvedAttack}</span>/<span className="defense-value">{card.unevolvedDefense}</span>
                        </span></h4>
                        <p className="card-description">{formatText(card.unevolvedDescription)}</p>
                      </div>
                      
                      <div className="description-section list-section">
                        <h4 className="description-title">Evolved: <span className="stats-inline">
                          <span className="attack-value">{card.evolvedAttack}</span>/<span className="defense-value">{card.evolvedDefense}</span>
                        </span></h4>
                        <p className="card-description">{formatText(card.evolvedDescription)}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Spell card details */}
                  {card.cardType === 'Spell' && (
                    <div className="card-descriptions list-descriptions">
                      <div className="description-section spell-section">
                        <h4 className="description-title">Spell Effect</h4>
                        <p className="card-description">{formatText(card.spellDescription)}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Amulet card details */}
                  {card.cardType === 'Amulet' && (
                    <div className="card-descriptions list-descriptions">
                      <div className="description-section amulet-section">
                        <h4 className="description-title">Amulet Effect</h4>
                        <p className="card-description">{formatText(card.amuletDescription)}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Notes section */}
                  <div className="description-section list-section notes-section">
                    <h4 className="description-title">Card Notes</h4>
                    <div className="card-description">
                      {card.notes && card.notes.trim() !== '' ? 
                        card.notes.split('\n').filter(line => line.trim() !== '').map((line, index) => (
                          <div key={index} className="note-line">
                            {formatText(line)}
                          </div>
                        ))
                        : 
                        <span className="no-notes">No notes available for this card</span>
                      }
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="set-card-actions">
                    <Link to={`/edit/${card._id}`} className="btn btn-edit">Edit</Link>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleRemoveCard(card._id)}
                    >
                      Remove from Set
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SetDetail; 