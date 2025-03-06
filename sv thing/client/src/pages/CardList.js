import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCards, deleteCard } from '../services/api';
import { sortCards } from '../utils/cardUtils';

const CardList = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCardId, setActiveCardId] = useState(null);
  const [detailPositions, setDetailPositions] = useState({});
  const cardRefs = useRef({});

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const data = await getCards();
        // Sort cards by class, rarity, and title
        const sortedCards = sortCards(data);
        setCards(sortedCards);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch cards. Please try again later.');
        setLoading(false);
      }
    };

    fetchCards();
  }, []);

  // Calculate detail position when window is resized
  useEffect(() => {
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
  }, [cards]);

  const handleEdit = (id) => {
    navigate(`/edit/${id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      try {
        await deleteCard(id);
        // Re-sort the cards after deletion
        const updatedCards = cards.filter(card => card._id !== id);
        setCards(sortCards(updatedCards));
      } catch (err) {
        setError('Failed to delete card. Please try again later.');
      }
    }
  };

  // Prevent event propagation to avoid triggering parent events
  const handleButtonClick = (e) => {
    e.stopPropagation();
  };

  // Handle mouse enter/leave for cards
  const handleMouseEnter = (id) => {
    setActiveCardId(id);
  };

  const handleMouseLeave = () => {
    setActiveCardId(null);
  };

  // Set ref for card element
  const setCardRef = (id, element) => {
    cardRefs.current[id] = element;
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
        <Link to="/create" className="btn">Create New Card</Link>
      </div>

      {cards.length === 0 ? (
        <div className="no-cards">
          <p>No cards found. Create your first card!</p>
        </div>
      ) : (
        <div className="card-grid">
          {cards.map(card => (
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
                    <span className={`card-type-badge ${card.cardType.toLowerCase()}`}>
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
      )}
    </div>
  );
};

export default CardList; 