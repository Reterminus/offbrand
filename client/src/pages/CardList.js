import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCards, deleteCard, getSets, getKeywords, getCard } from '../services/api';
import { sortCards } from '../utils/cardUtils';
import { formatText } from '../utils/textUtils';
import { applyFilters } from '../utils/filterUtils';
import { debounce } from '../utils/debounce';
import CardItem from '../components/CardItem';
import CardDetailModal from '../components/CardDetailModal';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
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
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [selectedRarities, setSelectedRarities] = useState([]);
  const [selectedSets, setSelectedSets] = useState([]);
  const [selectedCreators, setSelectedCreators] = useState([]);
  const [selectedCosts, setSelectedCosts] = useState([]);
  const [selectedCardTypes, setSelectedCardTypes] = useState([]);
  const [selectedTraits, setSelectedTraits] = useState([]);
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
        
        // Pre-process all cards' related cards for immediate access
        const relatedCardsCache = {};
        
        // First, build a map of all cards by ID for quick lookups
        const cardsById = {};
        cardsData.forEach(card => {
          cardsById[card._id] = card;
        });
        
        // Then, for each card with related cards, cache fully populated versions
        cardsData.forEach(card => {
          if (card.relatedCards && card.relatedCards.length > 0) {
            // Create a deep copy of the related cards with full data
            const fullRelatedCards = card.relatedCards.map(relatedCard => {
              // If the related card reference is just an ID, get the full card data
              if (typeof relatedCard === 'string' || !relatedCard.title) {
                const relatedCardId = typeof relatedCard === 'string' ? relatedCard : relatedCard._id;
                return cardsById[relatedCardId] || relatedCard;
              }
              return relatedCard;
            });
            
            // Create a copy of the card with sorted related cards
            const cardWithFullData = {...card};
            cardWithFullData.relatedCards = sortCards(fullRelatedCards);
            relatedCardsCache[card._id] = cardWithFullData;
          }
        });
        
        setCardsFromHiddenSets(hiddenSetCards);
        setCreators(uniqueCreators);
        setTraits(uniqueTraits);
        setCards(cardsData);
        setSets(setsData);
        setKeywords(keywordsData);
        setPreloadedRelatedCards(relatedCardsCache);
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

  // Memoize the selected set data to avoid repeated lookups
  const selectedSetData = useMemo(() => {
    if (selectedSets.length === 0 || !sets.length) return null;
    return sets.filter(set => selectedSets.includes(set._id));
  }, [selectedSets, sets]);

  // Memoize search term in lowercase to avoid repeated conversion
  const searchTermLower = useMemo(() => {
    return searchTerm.trim().toLowerCase();
  }, [searchTerm]);

  // Memoize filtered cards based on all filter criteria
  const memoizedFilteredCards = useMemo(() => {
    if (cards.length === 0) return [];
    
    // Handle set filtering manually since we need to check if cards belong to selected sets
    let filteredCards = sortedCards;
    
    // Apply set filter manually
    if (selectedSets.length > 0) {
      const isTokenSelected = selectedSets.includes('tokens');
      const selectedSetIds = selectedSets.filter(setId => setId !== 'tokens');
      
      filteredCards = filteredCards.filter(card => {
        if (isTokenSelected && card.isToken) {
          return true;
        }
        
        if (selectedSetIds.length > 0) {
          const isInSelectedSets = selectedSetIds.some(setId => {
            const set = sets.find(s => s._id === setId);
            return set && set.cards && set.cards.includes(card._id);
          });
          return isInSelectedSets;
        }
        
        return isTokenSelected;
      });
    }
    
    // Use the common filter utility function for other filters
    return applyFilters(filteredCards, {
      searchTerm: searchTermLower,
      selectedClasses,
      selectedRarities,
      selectedCreators,
      selectedCosts,
      selectedCardTypes,
      selectedTraits,
      cardsFromHiddenSets,
      showHiddenSetCards
    });
  }, [
    sortedCards, 
    searchTermLower, 
    selectedClasses, 
    selectedRarities, 
    selectedSets,
    selectedCreators, 
    selectedCosts, 
    selectedCardTypes,
    selectedTraits,
    cardsFromHiddenSets, 
    showHiddenSetCards,
    sets
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
  const handleClassChange = useCallback((values) => {
    setSelectedClasses(values);
  }, []);

  // Handle rarity filter change
  const handleRarityChange = useCallback((values) => {
    setSelectedRarities(values);
  }, []);

  // Handle set filter change
  const handleSetChange = useCallback((values) => {
    setSelectedSets(values);
  }, []);

  // Handle creator filter change
  const handleCreatorChange = useCallback((values) => {
    setSelectedCreators(values);
  }, []);

  // Handle cost filter change
  const handleCostChange = useCallback((values) => {
    setSelectedCosts(values);
  }, []);

  // Handle card type filter change
  const handleCardTypeChange = useCallback((values) => {
    setSelectedCardTypes(values);
  }, []);

  // Handle trait filter change
  const handleTraitChange = useCallback((values) => {
    setSelectedTraits(values);
  }, []);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedClasses([]);
    setSelectedRarities([]);
    setSelectedSets([]);
    setSelectedCreators([]);
    setSelectedCosts([]);
    setSelectedCardTypes([]);
    setSelectedTraits([]);
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
        // Use the preloaded version with fully populated related cards
        setSelectedCardDetails(preloadedRelatedCards[relatedCard._id]);
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
        // Try to find the full card data in our local cards array
        const fullCardData = cards.find(card => card._id === relatedCard._id);
        if (fullCardData) {
          // Create a version with sorted related cards
          const cardDataToShow = {...fullCardData};
          if (cardDataToShow.relatedCards && Array.isArray(cardDataToShow.relatedCards)) {
            cardDataToShow.relatedCards = sortCards(cardDataToShow.relatedCards);
          }
          setSelectedCardDetails(cardDataToShow);
          
          // Also cache this for future use
          setPreloadedRelatedCards(prev => ({...prev, [relatedCard._id]: cardDataToShow}));
        } else {
          // If we can't find it locally, show what data we have without "Loading..." text
          // This provides a graceful offline experience
          setSelectedCardDetails({
            ...relatedCard,
            keywords: relatedCard.keywords || [],
            relatedCards: []
          });
          
          // Try to fetch in background, but don't disrupt the user experience
          getCard(relatedCard._id, true)
            .then(cardData => {
              // Only update the UI if the fetched card matches what's currently displayed
              if (cardData._id === relatedCard._id) {
                if (cardData.relatedCards && Array.isArray(cardData.relatedCards)) {
                  cardData.relatedCards = sortCards(cardData.relatedCards);
                }
                setSelectedCardDetails(cardData);
                setPreloadedRelatedCards(prev => ({...prev, [relatedCard._id]: cardData}));
              }
            })
            .catch(err => {
              console.error('Error fetching card details:', err);
              // No need to update UI on error - we're already showing what we have
            });
        }
      }
    } catch (err) {
      console.error('Error handling related card click:', err);
      // Fallback to showing what we have without error indicators
      setSelectedCardDetails({
        ...relatedCard,
        keywords: relatedCard.keywords || [],
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
          <MultiSelectDropdown
            options={classOptions}
            selectedValues={selectedClasses}
            onChange={handleClassChange}
            placeholder="All Classes"
          />
          
          <MultiSelectDropdown
            options={rarityOptions}
            selectedValues={selectedRarities}
            onChange={handleRarityChange}
            placeholder="All Rarities"
          />
          
          <MultiSelectDropdown
            options={[...Array(10).keys()].map(i => i.toString()).concat(['10+'])}
            selectedValues={selectedCosts}
            onChange={handleCostChange}
            placeholder="All Costs"
          />
          
          <MultiSelectDropdown
            options={cardTypeOptions}
            selectedValues={selectedCardTypes}
            onChange={handleCardTypeChange}
            placeholder="All Card Types"
          />
          
          <MultiSelectDropdown
            options={traits}
            selectedValues={selectedTraits}
            onChange={handleTraitChange}
            placeholder="All Traits"
          />
          
          <MultiSelectDropdown
            options={['Token', ...sets.map(set => set.name)]}
            selectedValues={selectedSets.map(setId => 
              setId === 'tokens' ? 'Token' : sets.find(s => s._id === setId)?.name
            ).filter(Boolean)}
            onChange={(values) => {
              const mappedValues = values.map(value => 
                value === 'Token' ? 'tokens' : sets.find(s => s.name === value)?._id
              ).filter(Boolean);
              handleSetChange(mappedValues);
            }}
            placeholder="All Sets"
          />

          <MultiSelectDropdown
            options={creators}
            selectedValues={selectedCreators}
            onChange={handleCreatorChange}
            placeholder="All Creators"
          />
          
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