import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCards, deleteCard, getSets, getKeywords, getCard } from '../services/api';
import { sortCards } from '../utils/cardUtils';
import { formatText } from '../utils/textUtils';
import { applyFilters } from '../utils/filterUtils';
import { debounce } from '../utils/debounce';
import CardItem from '../components/CardItem';
import CardDetailModal from '../components/CardDetailModal';
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
  const [selectedCost, setSelectedCost] = useState('');
  const [selectedCardType, setSelectedCardType] = useState('');
  const [selectedTrait, setSelectedTrait] = useState('');
  const [creators, setCreators] = useState([]);
  const [traits, setTraits] = useState([]);
  const [showNotesForCard, setShowNotesForCard] = useState(null);
  const cardRefs = useRef({});
  const [selectedCardDetails, setSelectedCardDetails] = useState(null);
  const [hoveredRelatedCard, setHoveredRelatedCard] = useState(null);
  const [preloadedRelatedCards, setPreloadedRelatedCards] = useState({});
  const [showHiddenSetCards, setShowHiddenSetCards] = useState(false);
  const [cardsFromHiddenSets, setCardsFromHiddenSets] = useState([]);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cardsData, setsData, keywordsData] = await Promise.all([
          getCards(),
          getSets(),
          getKeywords()
        ]);
        
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
        
        // Get unique creators from cards for filtering
        const uniqueCreators = [...new Set(cardsData
          .map(card => card.creator)
          .filter(creator => creator && creator.trim() !== '')
          .sort())];
        
        // Get unique traits from cards for filtering
        const uniqueTraits = [...new Set(cardsData
          .flatMap(card => {
            // Skip cards with no traits
            if (!card.trait || card.trait.trim() === '') return [];
            // Split by slash only and filter out empty strings
            return card.trait.split('/').map(t => t.trim()).filter(t => t);
          })
          .sort())];
        
        setCardsFromHiddenSets(hiddenSetCards);
        setCreators(uniqueCreators);
        setTraits(uniqueTraits);
        setCards(cardsData);
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

  // Memoize sorted cards to avoid unnecessary re-sorting
  const sortedCards = useMemo(() => {
    return sortCards(cards);
  }, [cards]);

  // Preload related cards data when a card is selected for the detail modal
  useEffect(() => {
    if (!selectedCardDetails || !selectedCardDetails.relatedCards || selectedCardDetails.relatedCards.length === 0) {
      return;
    }
    
    const preloadRelatedCardsData = async () => {
      const newPreloadedCards = { ...preloadedRelatedCards };
      let hasNewCards = false;
      
      // For each related card that's not already preloaded
      for (const relatedCard of selectedCardDetails.relatedCards) {
        if (preloadedRelatedCards[relatedCard._id]) continue;
        
        try {
          // Check if the full card data is in our local cache
          const cachedCard = cards.find(card => card._id === relatedCard._id);
          if (cachedCard) {
            // Create a copy and sort its related cards
            const cardWithSortedRelatedCards = {...cachedCard};
            if (cardWithSortedRelatedCards.relatedCards && Array.isArray(cardWithSortedRelatedCards.relatedCards)) {
              cardWithSortedRelatedCards.relatedCards = sortCards(cardWithSortedRelatedCards.relatedCards);
            }
            newPreloadedCards[relatedCard._id] = cardWithSortedRelatedCards;
            hasNewCards = true;
          } else {
            // Otherwise fetch it (don't await here, let it happen in parallel)
            getCard(relatedCard._id, true)
              .then(cardData => {
                // Sort the related cards before caching
                if (cardData.relatedCards && Array.isArray(cardData.relatedCards)) {
                  cardData.relatedCards = sortCards(cardData.relatedCards);
                }
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
      
      // Update the preloaded cards state with any cached cards we found
      if (hasNewCards) {
        setPreloadedRelatedCards(newPreloadedCards);
      }
    };
    
    preloadRelatedCardsData();
  }, [selectedCardDetails, cards, preloadedRelatedCards]);

  // Memoize the selected set data to avoid repeated lookups
  const selectedSetData = useMemo(() => {
    if (!selectedSet || selectedSet === 'tokens' || !sets.length) return null;
    return sets.find(set => set._id === selectedSet);
  }, [selectedSet, sets]);

  // Memoize search term in lowercase to avoid repeated conversion
  const searchTermLower = useMemo(() => {
    return searchTerm.trim().toLowerCase();
  }, [searchTerm]);

  // Memoize filtered cards based on all filter criteria
  const memoizedFilteredCards = useMemo(() => {
    if (cards.length === 0) return [];
    
    // Use the common filter utility function
    return applyFilters(sortedCards, {
      searchTerm: searchTermLower,
      selectedClass,
      selectedRarity,
      selectedSet,
      selectedSetData,
      selectedCreator,
      selectedCost,
      selectedCardType,
      selectedTrait,
      cardsFromHiddenSets,
      showHiddenSetCards
    });
  }, [
    sortedCards, 
    searchTermLower, 
    selectedClass, 
    selectedRarity, 
    selectedSet, 
    selectedSetData, 
    selectedCreator, 
    selectedCost, 
    selectedCardType,
    selectedTrait,
    cardsFromHiddenSets, 
    showHiddenSetCards
  ]);

  // Update filteredCards state when memoized value changes
  useEffect(() => {
    setFilteredCards(memoizedFilteredCards);
  }, [memoizedFilteredCards]);

  // Debounced resize handler to prevent performance issues
  const handleResize = useCallback(debounce(() => {
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
  }, 150), []);

  // Calculate detail position when window is resized
  useEffect(() => {
    // Initial calculation
    handleResize();

    // Add event listener for window resize
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [filteredCards, handleResize]);

  // Memoize class and rarity options
  const classOptions = useMemo(() => [
    'Neutral', 'Forestcraft', 'Swordcraft', 'Runecraft', 
    'Dragoncraft', 'Shadowcraft', 'Bloodcraft', 'Havencraft', 
    'Portalcraft'
  ], []);

  const rarityOptions = useMemo(() => ['Bronze', 'Silver', 'Gold', 'Legendary'], []);

  const cardTypeOptions = useMemo(() => ['Follower', 'Spell', 'Amulet'], []);

  // Handler functions - memoized to prevent unnecessary re-creations
  const handleEdit = useCallback((id) => {
    navigate(`/edit/${id}`);
  }, [navigate]);

  const handleDelete = useCallback(async (id) => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      try {
        await deleteCard(id);
        
        // Update cards state
        setCards(prevCards => {
          const updatedCards = prevCards.filter(card => card._id !== id);
          return updatedCards;
        });
      } catch (err) {
        setError('Failed to delete card. Please try again later.');
      }
    }
  }, []);

  // Prevent event propagation to avoid triggering parent events
  const handleButtonClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // Check if we're on a mobile/tablet device
  const isMobileOrTablet = useCallback(() => {
    return window.innerWidth <= 1200;
  }, []);

  // Handle mouse enter/leave for hover effect on desktop
  const handleMouseEnter = useCallback((id) => {
    if (!isMobileOrTablet()) {
      setActiveCardId(id);
    }
  }, [isMobileOrTablet]);

  const handleMouseLeave = useCallback(() => {
    if (!isMobileOrTablet()) {
      setActiveCardId(null);
      setShowNotesForCard(null);
    }
  }, [isMobileOrTablet]);

  // Handle card click for showing the detail modal
  const handleCardClick = useCallback((card, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Create a copy of the card to avoid modifying the original data
    const cardDataToShow = {...card};
    
    // Sort the related cards if they exist
    if (cardDataToShow.relatedCards && Array.isArray(cardDataToShow.relatedCards)) {
      cardDataToShow.relatedCards = sortCards(cardDataToShow.relatedCards);
    }
    
    setSelectedCardDetails(cardDataToShow);
  }, []);

  // Close the detail modal
  const handleDetailClose = useCallback(() => {
    setSelectedCardDetails(null);
  }, []);

  // Prevent event propagation in modal
  const handleDetailClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // Handle double click to show notes
  const handleDoubleClick = useCallback((card) => {
    if (card.notes && card.notes.trim() !== '') {
      setShowNotesForCard(card._id);
    }
  }, []);

  // Set ref for card element
  const setCardRef = useCallback((id, element) => {
    cardRefs.current[id] = element;
  }, []);

  // Handle search input change
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  // Handle class filter change
  const handleClassChange = useCallback((e) => {
    setSelectedClass(e.target.value);
  }, []);

  // Handle rarity filter change
  const handleRarityChange = useCallback((e) => {
    setSelectedRarity(e.target.value);
  }, []);

  // Handle set filter change
  const handleSetChange = useCallback((e) => {
    setSelectedSet(e.target.value);
  }, []);

  // Handle creator filter change
  const handleCreatorChange = useCallback((e) => {
    setSelectedCreator(e.target.value);
  }, []);

  // Handle cost filter change
  const handleCostChange = useCallback((e) => {
    setSelectedCost(e.target.value);
  }, []);

  // Handle card type filter change
  const handleCardTypeChange = useCallback((e) => {
    setSelectedCardType(e.target.value);
  }, []);

  // Handle trait filter change
  const handleTraitChange = useCallback((e) => {
    setSelectedTrait(e.target.value);
  }, []);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedClass('');
    setSelectedRarity('');
    setSelectedSet('');
    setSelectedCreator('');
    setSelectedCost('');
    setSelectedCardType('');
    setSelectedTrait('');
  }, []);

  // Add handler to close mobile detail view
  const handleCloseMobileDetail = useCallback(() => {
    setActiveCardId(null);
    setShowNotesForCard(null);
  }, []);

  // Handle clicking on a related card to show its details
  const handleRelatedCardClick = useCallback(async (relatedCard, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Reset the hovered related card state
    setHoveredRelatedCard(null);
    
    try {
      // First check if we have this card preloaded
      if (preloadedRelatedCards[relatedCard._id]) {
        // Sort the related cards before showing the details
        const cardData = preloadedRelatedCards[relatedCard._id];
        if (cardData.relatedCards && Array.isArray(cardData.relatedCards)) {
          cardData.relatedCards = sortCards(cardData.relatedCards);
        }
        setSelectedCardDetails(cardData);
        return;
      }
      
      // If the related card already has populated keywords and relatedCards, use it as is
      if (relatedCard.keywords && Array.isArray(relatedCard.keywords) && 
          relatedCard.keywords.length > 0 && typeof relatedCard.keywords[0] === 'object' &&
          relatedCard.relatedCards && Array.isArray(relatedCard.relatedCards)) {
        // Sort the related cards before showing the details
        const cardDataToShow = {...relatedCard};
        cardDataToShow.relatedCards = sortCards(cardDataToShow.relatedCards);
        setSelectedCardDetails(cardDataToShow);
      } else {
        // Otherwise, try to find the full card data with populated keywords
        const fullCardData = cards.find(card => card._id === relatedCard._id);
        if (fullCardData) {
          // Sort the related cards before showing the details
          const cardDataToShow = {...fullCardData};
          if (cardDataToShow.relatedCards && Array.isArray(cardDataToShow.relatedCards)) {
            cardDataToShow.relatedCards = sortCards(cardDataToShow.relatedCards);
          }
          setSelectedCardDetails(cardDataToShow);
          // Also add to cache for future use
          setPreloadedRelatedCards(prev => ({...prev, [relatedCard._id]: cardDataToShow}));
        } else {
          // Last resort - fetch from API
          // Show loading state immediately
          setSelectedCardDetails({
            ...relatedCard,
            title: `${relatedCard.title} (Loading...)`,
            keywords: [],
            relatedCards: []
          });
          
          // Fetch in background
          getCard(relatedCard._id, true)
            .then(cardData => {
              // Sort the related cards before showing the details
              if (cardData.relatedCards && Array.isArray(cardData.relatedCards)) {
                cardData.relatedCards = sortCards(cardData.relatedCards);
              }
              setSelectedCardDetails(cardData);
              setPreloadedRelatedCards(prev => ({...prev, [relatedCard._id]: cardData}));
            })
            .catch(err => {
              console.error('Error fetching card details:', err);
              // If fetch fails, show what we have
              setSelectedCardDetails({
                ...relatedCard,
                title: `${relatedCard.title} (Failed to load details)`,
                keywords: [],
                relatedCards: []
              });
            });
        }
      }
    } catch (err) {
      console.error('Error handling related card click:', err);
      // Fallback if anything goes wrong
      setSelectedCardDetails({
        ...relatedCard,
        keywords: [],
        relatedCards: []
      });
    }
  }, [cards, preloadedRelatedCards]);

  // Handle hover on related card to show its name in the title
  const handleRelatedCardMouseEnter = useCallback((relatedCard) => {
    setHoveredRelatedCard(relatedCard);
  }, []);

  // Handle hover end on related card to restore original title
  const handleRelatedCardMouseLeave = useCallback(() => {
    setHoveredRelatedCard(null);
  }, []);

  // Handle toggle for hidden set cards
  const handleToggleHiddenSetCards = useCallback(() => {
    setShowHiddenSetCards(prev => !prev);
  }, []);

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
          
          <select value={selectedCost} onChange={handleCostChange}>
            <option value="">All Costs</option>
            {[...Array(10).keys()].map(i => (
              <option key={i} value={i}>{i}</option>
            ))}
            <option value="10">10+</option>
          </select>
          
          <select value={selectedCardType} onChange={handleCardTypeChange}>
            <option value="">All Card Types</option>
            {cardTypeOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          
          <select value={selectedTrait} onChange={handleTraitChange}>
            <option value="">All Traits</option>
            {traits.map(trait => (
              <option key={trait} value={trait}>{trait}</option>
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
            <CardItem
              key={card._id}
              card={card}
              isAdmin={isAdmin}
              isActive={activeCardId === card._id}
              showNotes={showNotesForCard === card._id}
              detailPosition={detailPositions[card._id]}
              handleMouseEnter={handleMouseEnter}
              handleMouseLeave={handleMouseLeave}
              handleCardClick={handleCardClick}
              handleButtonClick={handleButtonClick}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              setCardRef={setCardRef}
            />
          ))}
        </div>
      )}

      {/* Full Detail Modal */}
      <CardDetailModal
        cardDetails={selectedCardDetails}
        handleDetailClose={handleDetailClose}
        handleDetailClick={handleDetailClick}
        handleRelatedCardClick={handleRelatedCardClick}
        handleRelatedCardMouseEnter={handleRelatedCardMouseEnter}
        handleRelatedCardMouseLeave={handleRelatedCardMouseLeave}
        hoveredRelatedCard={hoveredRelatedCard}
      />
    </div>
  );
};

export default CardList; 