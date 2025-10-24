import React, { useState, useEffect, useRef } from 'react';
import { getCards, getCard, getSets } from '../services/api';
import { formatText } from '../utils/textUtils';
import html2canvas from 'html2canvas';
import { sortCards } from '../utils/cardUtils';
import MultiSelectDropdown from '../components/MultiSelectDropdown';

const DeckBuilder = () => {
  const [cards, setCards] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
  const [deck, setDeck] = useState([]);
  const [deckName, setDeckName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCosts, setSelectedCosts] = useState([]);
  const [selectedCardTypes, setSelectedCardTypes] = useState([]);
  const [selectedClassCardType, setSelectedClassCardType] = useState('');
  const [selectedClassCardTypes, setSelectedClassCardTypes] = useState([]);
  const [selectedTraits, setSelectedTraits] = useState([]);
  const [selectedRarities, setSelectedRarities] = useState([]);
  const [selectedSets, setSelectedSets] = useState([]);
  const [traits, setTraits] = useState([]);
  const deckRef = useRef(null);
  const [exportingDeck, setExportingDeck] = useState(false);
  const [selectedCardDetails, setSelectedCardDetails] = useState(null);
  // New state variables for related cards functionality
  const [hoveredRelatedCard, setHoveredRelatedCard] = useState(null);
  const [preloadedRelatedCards, setPreloadedRelatedCards] = useState({});
  const [sets, setSets] = useState([]);
  // Add a state to track which card is being hovered
  const [hoveredCardId, setHoveredCardId] = useState(null);
  // Add new state for TTS export
  const [exportingTTSDeck, setExportingTTSDeck] = useState(false);

  // Fetch all cards on component mount
  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true);
        const [cardsData, setsData] = await Promise.all([
          getCards(),
          getSets()
        ]);
        
        // Identify cards from hidden sets
        const hiddenSetCardIds = new Set();
        setsData.forEach(set => {
          if (set.hidden && set.cards && Array.isArray(set.cards)) {
            set.cards.forEach(cardId => {
              hiddenSetCardIds.add(cardId.toString());
            });
          }
        });
        
        // Filter out both token cards and cards from hidden sets
        const filteredCards = cardsData.filter(card => {
          return !card.isToken && !hiddenSetCardIds.has(card._id.toString());
        });
        
        // We'll set traits later based on selected class
        setCards(filteredCards);
        setFilteredCards(filteredCards);
        setSets(setsData.filter(set => !set.hidden)); // Only include non-hidden sets
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

    // Filter by class card type (class/neutral)
    if (selectedClassCardTypes.length > 0) {
      result = result.filter(card => {
        if (selectedClassCardTypes.includes('class') && selectedClass && card.class === selectedClass) {
          return true;
        }
        if (selectedClassCardTypes.includes('neutral') && card.class === 'Neutral') {
          return true;
        }
        return false;
      });
    }

    // Filter by card type (Follower/Spell/Amulet)
    if (selectedCardTypes.length > 0) {
      result = result.filter(card => selectedCardTypes.includes(card.cardType || 'Follower'));
    }

    // Filter by rarity
    if (selectedRarities.length > 0) {
      result = result.filter(card => selectedRarities.includes(card.rarity));
    }
    
    // Filter by trait
    if (selectedTraits.length > 0) {
      result = result.filter(card => {
        if (!card.trait) return false;
        const cardTraits = card.trait.split('/').map(t => t.trim()).filter(t => t);
        return selectedTraits.some(selectedTrait => cardTraits.includes(selectedTrait));
      });
    }
    
    // Filter by set
    if (selectedSets.length > 0) {
      const isTokenSelected = selectedSets.includes('tokens');
      const selectedSetIds = selectedSets.filter(setId => setId !== 'tokens');
      
      result = result.filter(card => {
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

    // Filter by cost
    if (selectedCosts.length > 0) {
      result = result.filter(card => {
        return selectedCosts.some(selectedCost => {
          const cost = parseInt(selectedCost);
          if (cost < 10) {
            return card.cost === cost;
          } else {
            // 10+ cost
            return card.cost >= 10;
          }
        });
      });
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

    // Sort cards by cost, then rarity, then class, then card type, and finally by name
    result.sort((a, b) => {
      // First sort by cost
      if (a.cost !== b.cost) {
        return a.cost - b.cost;
      }
      
      // Then sort by rarity (Legendary, Gold, Silver, Bronze)
      const rarityOrder = { 'Legendary': 0, 'Gold': 1, 'Silver': 2, 'Bronze': 3 };
      // Handle case where rarity might not match exactly or be undefined
      const aRarityValue = rarityOrder[a.rarity] !== undefined ? rarityOrder[a.rarity] : 999;
      const bRarityValue = rarityOrder[b.rarity] !== undefined ? rarityOrder[b.rarity] : 999;
      
      if (aRarityValue !== bRarityValue) {
        return aRarityValue - bRarityValue;
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
  }, [selectedClass, selectedCosts, searchTerm, selectedCardTypes, selectedClassCardTypes, selectedRarities, selectedTraits, selectedSets, cards, sets]);

  // Update traits list when selected class changes
  useEffect(() => {
    if (!selectedClass || cards.length === 0) return;
    
    // Filter cards by selected class (and Neutral)
    const classCards = cards.filter(card => 
      card.class === selectedClass || card.class === 'Neutral'
    );
    
    // Extract unique traits from filtered cards
    const uniqueTraits = [...new Set(classCards
      .flatMap(card => {
        // Skip cards with no traits
        if (!card.trait || card.trait.trim() === '') return [];
        // Split by slash only and filter out empty strings
        return card.trait.split('/').map(t => t.trim()).filter(t => t);
      })
      .sort())];
    
    setTraits(uniqueTraits);
    
    // Reset selected traits if they're not in the new list of traits
    if (selectedTraits.length > 0) {
      const validTraits = selectedTraits.filter(trait => uniqueTraits.includes(trait));
      if (validTraits.length !== selectedTraits.length) {
        setSelectedTraits(validTraits);
      }
    }
  }, [selectedClass, cards]);

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

  // Card type options for dropdown
  const cardTypeOptions = ['Follower', 'Spell', 'Amulet'];
  
  // Class card type options for dropdown
  const classCardTypeOptions = ['class', 'neutral'];
  
  // Rarity options for dropdown
  const rarityOptions = ['Bronze', 'Silver', 'Gold', 'Legendary'];

  // Preload related cards data when a card is selected for the detail modal
  useEffect(() => {
    if (selectedCardDetails && selectedCardDetails.relatedCards && selectedCardDetails.relatedCards.length > 0) {
      const preloadRelatedCardsData = async () => {
        const newPreloadedCards = { ...preloadedRelatedCards };
        
        // For each related card that's not already preloaded
        for (const relatedCard of selectedCardDetails.relatedCards) {
          if (!preloadedRelatedCards[relatedCard._id]) {
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
        }
        
        // Update the preloaded cards state with any cached cards we found
        if (Object.keys(newPreloadedCards).length > Object.keys(preloadedRelatedCards).length) {
          setPreloadedRelatedCards(newPreloadedCards);
        }
      };
      
      preloadRelatedCardsData();
    }
  }, [selectedCardDetails, cards, preloadedRelatedCards]);

  // Handle clicking on a card to view details
  const handleCardDetailView = (card, e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent adding to deck when viewing details
    
    // Create a copy of the card to avoid modifying the original data
    const cardDataToShow = {...card};
    
    // Sort the related cards if they exist
    if (cardDataToShow.relatedCards && Array.isArray(cardDataToShow.relatedCards)) {
      cardDataToShow.relatedCards = sortCards(cardDataToShow.relatedCards);
    }
    
    setSelectedCardDetails(cardDataToShow);
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

  // Add new function to reset class selection and go back to class selection screen
  const handleBackToClassSelection = () => {
    // Confirm if deck has cards to prevent accidental loss
    if (deck.length > 0) {
      if (!window.confirm('Going back will clear your current deck. Continue?')) {
        return;
      }
    }
    
    // Reset class and deck
    setSelectedClass('');
    setDeck([]);
    setDeckName('');
    
    // Also reset any filters
    setSearchTerm('');
    setSelectedCosts([]);
    setSelectedCardTypes([]);
    setSelectedCardDetails(null);
  };

  // Handle searching
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle cost filter
  const handleCostChange = (values) => {
    setSelectedCosts(values);
  };

  // Handle card type filter (class/neutral)
  const handleCardTypeChange = (e) => {
    const value = e.target.value;
    // Check if it's a class/neutral filter or a card type filter
    if (['', 'class', 'neutral'].includes(value)) {
      // It's a class/neutral filter
      setSelectedClassCardType(value);
    } else if (['Follower', 'Spell', 'Amulet'].includes(value)) {
      // It's a card type filter
      setSelectedCardTypes([value]);
    }
  };

  // Handle card type multi-select
  const handleCardTypeMultiChange = (values) => {
    setSelectedCardTypes(values);
  };

  // Handle class card type multi-select
  const handleClassCardTypeMultiChange = (values) => {
    setSelectedClassCardTypes(values);
  };

  // Handle rarity filter
  const handleRarityChange = (values) => {
    setSelectedRarities(values);
  };

  // Handle trait filter
  const handleTraitChange = (values) => {
    setSelectedTraits(values);
  };

  // Handle set filter
  const handleSetChange = (values) => {
    setSelectedSets(values);
  };

  // Handle clearing filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCosts([]);
    setSelectedCardTypes([]);
    setSelectedClassCardType('');
    setSelectedClassCardTypes([]);
    setSelectedRarities([]);
    setSelectedTraits([]);
    setSelectedSets([]);
  };

  // Count cards in deck by cost for the mana curve
  const getManaCurve = () => {
    const curve = Array(9).fill(0); // 0-8+ cost
    
    deck.forEach(card => {
      const cost = Math.min(card.cost, 8); // Group 8+ cost cards together
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
      
      // Add a class to prevent layout shifts during export
      document.body.classList.add('exporting-deck');
      
      // Small delay to ensure the DOM has updated and images are loaded
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(deckRef.current, {
        backgroundColor: '#1a1a1a',
        scale: window.innerWidth <= 768 ? 1 : 2, // Lower scale on mobile
        logging: false,
        useCORS: true,
        allowTaint: true,
        imageTimeout: 15000, // Increase timeout for image loading
        onclone: (clonedDoc) => {
          // Adjust any clone document elements if needed
          const clonedDeckRef = clonedDoc.querySelector('.export-view');
          if (clonedDeckRef) {
            // Make sure we capture the full content
            clonedDeckRef.style.height = 'auto';
            clonedDeckRef.style.maxHeight = 'none';
            clonedDeckRef.style.overflow = 'visible';
            
            // Also adjust the deck-cards container to be fully visible
            const deckCardsContainer = clonedDeckRef.querySelector('.deck-cards');
            if (deckCardsContainer) {
              deckCardsContainer.style.maxHeight = 'none';
              deckCardsContainer.style.overflow = 'visible';
              deckCardsContainer.style.height = 'auto';
            }
            
            // Hide all view-details-btn elements in the cloned document before rendering to canvas
            const detailButtons = clonedDeckRef.querySelectorAll('.view-details-btn');
            detailButtons.forEach(button => {
              button.style.display = 'none';
            });
          }
        }
      });
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      // Use deck name if provided, otherwise use default name
      const fileName = deckName.trim() 
        ? `${deckName.trim()}.png`
        : `${selectedClass}_Deck.png`;
      link.download = fileName;
      link.click();
      
      // Remove the export class
      document.body.classList.remove('exporting-deck');
      setExportingDeck(false);
    } catch (err) {
      console.error('Error exporting deck:', err);
      alert('Failed to export deck as image. Please try again.');
      document.body.classList.remove('exporting-deck');
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

  // Handle clicking on a related card to show its details
  const handleRelatedCardClick = async (relatedCard, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Reset the hovered related card state
    setHoveredRelatedCard(null);
    
    try {
      // First check if we have this card preloaded
      if (preloadedRelatedCards[relatedCard._id]) {
        // Sort the related cards before showing the details
        const cardData = {...preloadedRelatedCards[relatedCard._id]};
        if (cardData.relatedCards && Array.isArray(cardData.relatedCards)) {
          cardData.relatedCards = sortCards(cardData.relatedCards);
        }
        setSelectedCardDetails(cardData);
        
        // Continue preloading the next level of related cards in the background
        if (cardData.relatedCards && cardData.relatedCards.length > 0) {
          setTimeout(() => {
            cardData.relatedCards.forEach(nestedRelatedCard => {
              if (!preloadedRelatedCards[nestedRelatedCard._id]) {
                getCard(nestedRelatedCard._id, true)
                  .then(nestedCardData => {
                    if (nestedCardData.relatedCards && Array.isArray(nestedCardData.relatedCards)) {
                      nestedCardData.relatedCards = sortCards(nestedCardData.relatedCards);
                    }
                    setPreloadedRelatedCards(prev => ({
                      ...prev,
                      [nestedRelatedCard._id]: nestedCardData
                    }));
                  })
                  .catch(err => console.error(`Error preloading nested card ${nestedRelatedCard._id}:`, err));
              }
            });
          }, 100); // Small delay to prioritize UI updates first
        }
        
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
        
        // Also add to cache for future use
        setPreloadedRelatedCards(prev => ({...prev, [relatedCard._id]: cardDataToShow}));
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
              // Ensure we didn't navigate away while loading
              const currentCard = cardData;
              
              // Sort the related cards before showing the details
              if (currentCard.relatedCards && Array.isArray(currentCard.relatedCards)) {
                currentCard.relatedCards = sortCards(currentCard.relatedCards);
              }
              
              // Update the UI with the loaded card data
              setSelectedCardDetails(prev => {
                // Only update if we're still looking at the same card (by title)
                if (prev && prev.title.includes(relatedCard.title)) {
                  return currentCard;
                }
                return prev;
              });
              
              // Cache the card data for future use
              setPreloadedRelatedCards(prev => ({...prev, [relatedCard._id]: currentCard}));
            })
            .catch(err => {
              console.error('Error fetching card details:', err);
              // If fetch fails, show what we have
              setSelectedCardDetails(prev => {
                // Only update if we're still looking at the loading version
                if (prev && prev.title.includes(`${relatedCard.title} (Loading...)`)) {
                  return {
                    ...relatedCard,
                    title: `${relatedCard.title} (Failed to load details)`,
                    keywords: [],
                    relatedCards: []
                  };
                }
                return prev;
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
  };

  // Handle hover on related card to show its name in the title
  const handleRelatedCardMouseEnter = (relatedCard) => {
    setHoveredRelatedCard(relatedCard);
  };

  // Handle hover end on related card to restore original title
  const handleRelatedCardMouseLeave = () => {
    setHoveredRelatedCard(null);
  };

  // Helper function to check if a card belongs to a hidden set
  const isCardFromHiddenSet = (card) => {
    // If we don't have sets data yet, assume it's not from a hidden set
    if (!sets || sets.length === 0 || !card || !card._id) return false;
    
    // Check if this card belongs to any hidden set
    const isHidden = sets.some(set => 
      set.hidden && 
      set.cards && 
      Array.isArray(set.cards) && 
      set.cards.some(cardId => cardId === card._id || cardId.toString() === card._id.toString())
    );
    
    return isHidden;
  };

  // Add handler for deck name changes
  const handleDeckNameChange = (e) => {
    setDeckName(e.target.value);
  };

  // Add new export function for TTS deck
  const exportTTSDeck = async () => {
    if (!deckRef.current) return;
    
    // Check if deck has exactly 40 cards
    if (deck.length !== 40) {
      alert('A deck must have exactly 40 cards to export for TTS.');
      return;
    }
    
    try {
      setExportingTTSDeck(true);
      
      // Create a canvas with the specific TTS dimensions
      const canvas = document.createElement('canvas');
      canvas.width = 5660;  // 10 cards × 566px
      canvas.height = 5258; // 7 rows × 751px
      const ctx = canvas.getContext('2d');
      
      // Make the background transparent
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Load all card images first
      const loadImage = (url) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "Anonymous";  // Handle CORS
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
          img.src = url;
        });
      };
      
      // Load and draw all cards
      for (let i = 0; i < deck.length; i++) {
        const card = deck[i];
        const row = Math.floor(i / 10);
        const col = i % 10;
        
        try {
          const img = await loadImage(card.imageUrl);
          ctx.drawImage(
            img,
            col * 566,    // x position
            row * 751,    // y position
            566,          // width
            751           // height
          );
        } catch (err) {
          console.error(`Failed to load card image: ${card.title}`, err);
          throw new Error(`Failed to load card image: ${card.title}`);
        }
      }
      
      // Convert canvas to PNG and download
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      const fileName = deckName.trim() 
        ? `${deckName.trim()}_TTS.png`
        : `${selectedClass}_Deck_TTS.png`;
      link.download = fileName;
      link.click();
      
      setExportingTTSDeck(false);
    } catch (err) {
      console.error('Error exporting TTS deck:', err);
      alert('Failed to export deck for TTS. Please try again.');
      setExportingTTSDeck(false);
    }
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
        <div className="header-actions">
          {selectedClass && (
            <button 
              className="btn btn-secondary" 
              onClick={handleBackToClassSelection}
              style={{ marginRight: '10px' }}
            >
              Back to Class Selection
            </button>
          )}
          {deck.length > 0 && (
            <>
              <button 
                className="btn" 
                onClick={exportDeck}
                disabled={exportingDeck}
                style={{ marginRight: '10px' }}
              >
                {exportingDeck ? 'Exporting...' : 'Export Deck as Image'}
              </button>
              {deck.length === 40 && (
                <button
                  className="btn"
                  onClick={exportTTSDeck}
                  disabled={exportingTTSDeck}
                >
                  {exportingTTSDeck ? 'Generating TTS Image...' : 'Export TTS Deck Image'}
                </button>
              )}
            </>
          )}
        </div>
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
              
              {/* Display filter options */}
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
                  <div className="filter-row primary-filters">
                    <MultiSelectDropdown
                      options={classCardTypeOptions.map(option => 
                        option === 'class' ? selectedClass : option === 'neutral' ? 'Neutral' : option
                      )}
                      selectedValues={selectedClassCardTypes.map(value => 
                        value === 'class' ? selectedClass : value === 'neutral' ? 'Neutral' : value
                      )}
                      onChange={(values) => {
                        const mappedValues = values.map(value => 
                          value === selectedClass ? 'class' : value === 'Neutral' ? 'neutral' : value
                        );
                        handleClassCardTypeMultiChange(mappedValues);
                      }}
                      placeholder="All Classes"
                    />
                    
                    <MultiSelectDropdown
                      options={cardTypeOptions}
                      selectedValues={selectedCardTypes}
                      onChange={handleCardTypeMultiChange}
                      placeholder="All Types"
                    />
                    
                    <MultiSelectDropdown
                      options={[...Array(10).keys()].map(i => i.toString()).concat(['10+'])}
                      selectedValues={selectedCosts}
                      onChange={handleCostChange}
                      placeholder="All Costs"
                    />
                  </div>
                  
                  <div className="filter-row secondary-filters">
                    <MultiSelectDropdown
                      options={rarityOptions}
                      selectedValues={selectedRarities}
                      onChange={handleRarityChange}
                      placeholder="All Rarities"
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
                  </div>
                  
                  <button onClick={clearFilters} className="clear-btn">Clear Filters</button>
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
                <div className="deck-title-container">
                  <input
                    type="text"
                    value={deckName}
                    onChange={handleDeckNameChange}
                    placeholder={`${selectedClass} Deck`}
                    className="deck-name-input"
                  />
                  <span className="deck-count">({deck.length}/40)</span>
                </div>
                
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
                      <div className="mana-cost">{cost === 8 ? "8+" : cost}</div>
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
                        onClick={(e) => handleCardDetailView(card, e)}
                        onMouseEnter={() => setHoveredCardId(card._id)}
                        onMouseLeave={() => setHoveredCardId(null)}
                        style={card.bannerImageUrl ? {
                          backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5)), url(${card.bannerImageUrl})`,
                          backgroundPosition: card.bannerImagePosition || '50% 50%',
                          backgroundSize: card.bannerImageZoom ? `${card.bannerImageZoom}%` : 'cover',
                          position: 'relative',
                          transition: 'all 0.3s ease',
                          opacity: hoveredCardId === card._id ? 1 : 0.8
                        } : {}}
                      >
                        <div className="export-card-count">{count}x</div>
                        {!card.bannerImageUrl && (
                          <div className="export-card-thumbnail">
                            <img 
                              src={card.imageUrl} 
                              alt={card.title} 
                              className="mini-card-image" 
                            />
                          </div>
                        )}
                        
                        <div className="deck-card-info">
                          <div className="deck-card-cost">{card.cost}</div>
                          <div className="deck-card-title">{card.title}</div>
                          <div className={`deck-card-class ${card.class.toLowerCase()}`}>
                            {card.class}
                          </div>
                        </div>
                        <button 
                          className="view-details-btn deck-card-details-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCardFromDeck(card._id);
                          }}
                        >
                          ✕
                        </button>
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
                  
                  {/* Related Cards section - Add before detail actions */}
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
                  
                  {/* Keywords section - Add before detail actions */}
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
                              backgroundSize: keyword.imageZoom ? `${keyword.imageZoom}%` : 'cover'
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
                  
                  {/* Notes section - Add before detail actions */}
                  {selectedCardDetails.notes && selectedCardDetails.notes.trim() !== '' && (
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
      )}
    </div>
  );
};

export default DeckBuilder; 