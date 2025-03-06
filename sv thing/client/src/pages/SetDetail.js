import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getSet, getCards, addCardToSet, removeCardFromSet } from '../services/api';
import { sortCards } from '../utils/cardUtils';

const SetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [set, setSet] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [addingCard, setAddingCard] = useState(false);
  const [activeCardId, setActiveCardId] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [detailPositions, setDetailPositions] = useState({});
  const cardRefs = useRef({});

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
          // If the card is in the right half of the screen, show detail on the left
          newPositions[id] = rect.left > windowWidth / 2 ? 'left' : 'right';
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
  };

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
    !set?.cards.some(setCard => setCard._id === card._id)
  );

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
          <Link to={`/sets/edit/${id}`} className="btn btn-primary">Edit Set</Link>
          <Link to="/sets" className="btn btn-secondary">Back to Sets</Link>
        </div>
      </div>

      {set.description && (
        <div className="set-description-box">
          <p>{set.description}</p>
        </div>
      )}

      <div className="set-management">
        <h2>Add Cards to Set</h2>
        <div className="add-card-form">
          <select 
            value={selectedCardId} 
            onChange={(e) => setSelectedCardId(e.target.value)}
            disabled={addingCard || availableCards.length === 0}
          >
            <option value="">Select a card to add</option>
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
      </div>

      <h2>Cards in this Set ({set.cards.length})</h2>
      
      {set.cards.length === 0 ? (
        <div className="no-cards">
          <p>No cards in this set yet. Add some cards using the form above.</p>
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
              style={{ zIndex: activeCardId === card._id ? 1000 : 1 }}
            >
              <div className="card">
                <img 
                  src={card.imageUrl} 
                  alt={card.title} 
                  className="card-image" 
                />
                {card.isToken && <div className="token-label">Token</div>}
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
                    <span className="card-rarity">{card.rarity}</span>
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
                      <p className="card-description">{card.unevolvedDescription}</p>
                    </div>
                    
                    <div className="description-section">
                      <h4 className="description-title">Evolved</h4>
                      <div className="stats-row">
                        <span>Attack: <span className="attack-value">{card.evolvedAttack}</span></span>
                        <span>Defense: <span className="defense-value">{card.evolvedDefense}</span></span>
                      </div>
                      <p className="card-description">{card.evolvedDescription}</p>
                    </div>
                  </div>
                )}
                
                {/* Spell card details */}
                {card.cardType === 'Spell' && (
                  <div className="card-descriptions">
                    <div className="description-section">
                      <h4 className="description-title">Spell Effect</h4>
                      <p className="card-description">{card.spellDescription}</p>
                    </div>
                  </div>
                )}
                
                {/* Amulet card details */}
                {card.cardType === 'Amulet' && (
                  <div className="card-descriptions">
                    <div className="description-section">
                      <h4 className="description-title">Amulet Effect</h4>
                      <p className="card-description">{card.amuletDescription}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List View (original implementation)
        <div className="set-cards">
          {set.cards.map(card => (
            <div className="set-card-item" key={card._id}>
              <div className="set-card-image">
                <img src={card.imageUrl} alt={card.title} />
                {card.isToken && <div className="token-label">Token</div>}
              </div>
              <div className="set-card-info">
                <h3>{card.title}</h3>
                <div className="set-card-meta">
                  <span className="cost-label">Cost: {card.cost}</span>
                  <span className="card-class">{card.class}</span>
                  <span className="card-rarity">{card.rarity}</span>
                  <span className={`card-type-badge ${card.cardType?.toLowerCase() || 'follower'}`}>
                    {card.cardType || 'Follower'}
                  </span>
                </div>
                
                <div className="set-card-stats">
                  {(!card.cardType || card.cardType === 'Follower') && (
                    <div>
                      <span>Unevolved: <span className="attack-value">{card.unevolvedAttack}</span>/<span className="defense-value">{card.unevolvedDefense}</span></span>
                      <span>Evolved: <span className="attack-value">{card.evolvedAttack}</span>/<span className="defense-value">{card.evolvedDefense}</span></span>
                    </div>
                  )}
                  {card.cardType === 'Spell' && (
                    <div>
                      <span>Spell Effect: {card.spellDescription?.substring(0, 50)}...</span>
                    </div>
                  )}
                  {card.cardType === 'Amulet' && (
                    <div>
                      <span>Amulet Effect: {card.amuletDescription?.substring(0, 50)}...</span>
                    </div>
                  )}
                </div>

                <div className="set-card-actions">
                  <Link to={`/edit/${card._id}`} className="btn btn-edit">Edit</Link>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleRemoveCard(card._id)}
                  >
                    Remove from Set
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SetDetail; 