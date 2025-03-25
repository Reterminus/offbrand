import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCards, deleteCard, getSets } from '../services/api';
import { sortCards } from '../utils/cardUtils';
import { AuthContext } from '../context/AuthContext';

const CardList = () => {
  const navigate = useNavigate();
  const { isAdmin } = useContext(AuthContext);
  const [cards, setCards] = useState([]);
  const [sets, setSets] = useState([]);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cardsData, setsData] = await Promise.all([
          getCards(),
          getSets()
        ]);
        // Sort cards by class, rarity, and title
        const sortedCards = sortCards(cardsData);
        // Extract unique creators from cards
        const uniqueCreators = [...new Set(sortedCards
          .map(card => card.creator)
          .filter(creator => creator && creator.trim() !== '')
          .sort())];
        setCreators(uniqueCreators);
        setCards(sortedCards);
        setFilteredCards(sortedCards);
        setSets(setsData);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter cards when search term or selected filters change
  useEffect(() => {
    if (cards.length === 0) return;
    
    let result = [...cards];
    
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
    
    // Filter by class
    if (selectedClass !== '') {
      result = result.filter(card => card.class === selectedClass);
    }
    
    // Filter by rarity
    if (selectedRarity !== '') {
      result = result.filter(card => card.rarity === selectedRarity);
    }

    // Filter by set
    if (selectedSet !== '') {
      const selectedSetData = sets.find(set => set._id === selectedSet);
      if (selectedSetData) {
        result = result.filter(card => selectedSetData.cards.includes(card._id));
      }
    }

    // Filter by creator
    if (selectedCreator !== '') {
      result = result.filter(card => card.creator === selectedCreator);
    }
    
    setFilteredCards(result);
  }, [searchTerm, selectedClass, selectedRarity, selectedSet, selectedCreator, cards, sets]);

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

  // Handle mouse enter/leave for cards
  const handleMouseEnter = (id) => {
    setActiveCardId(id);
  };

  const handleMouseLeave = () => {
    if (window.innerWidth > 768) {
      setActiveCardId(null);
      setShowNotesForCard(null);
    }
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
          <Link to="/create" className="btn">Add Card</Link>
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
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CardList; 