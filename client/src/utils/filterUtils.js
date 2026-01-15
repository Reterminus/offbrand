/**
 * Apply filters to a collection of cards
 * 
 * @param {Array} cards - Array of card objects
 * @param {Object} filters - Filter criteria
 * @param {string} filters.searchTerm - Text search term
 * @param {Array} filters.selectedClasses - Selected card classes
 * @param {Array} filters.selectedRarities - Selected card rarities
 * @param {Array} filters.selectedSets - Selected set IDs
 * @param {Array} filters.selectedCreators - Selected creators
 * @param {Array} filters.selectedCosts - Selected costs
 * @param {Array} filters.selectedCardTypes - Selected card types (Follower, Spell, Amulet)
 * @param {Array} filters.selectedTraits - Selected card traits
 * @param {Array} filters.cardsFromHiddenSets - IDs of cards from hidden sets
 * @param {boolean} filters.showHiddenSetCards - Whether to show cards from hidden sets
 * @returns {Array} - Filtered array of cards
 */
export const applyFilters = (cards, filters) => {
  const {
    searchTerm,
    selectedClasses = [],
    selectedRarities = [],
    selectedSets = [],
    selectedCreators = [],
    selectedCosts = [],
    selectedCardTypes = [],
    selectedTraits = [],
    cardsFromHiddenSets = [],
    showHiddenSetCards = false
  } = filters;
  
  // Start with all cards
  return cards.filter(card => {
    // Filter out hidden set cards if toggle is off
    if (!showHiddenSetCards && cardsFromHiddenSets.includes(card._id.toString())) {
      return false;
    }
    
    // Search term filter
    if (searchTerm && searchTerm.trim() !== '') {
      const searchTermLower = searchTerm.toLowerCase();
      const textMatch = 
        // Check title
        card.title.toLowerCase().includes(searchTermLower) ||
        // Check trait
        (card.trait && card.trait.toLowerCase().includes(searchTermLower)) ||
        // Check descriptions based on card type
        ((!card.cardType || card.cardType === 'Follower') && 
          ((card.unevolvedDescription && card.unevolvedDescription.toLowerCase().includes(searchTermLower)) || 
           (card.evolvedDescription && card.evolvedDescription.toLowerCase().includes(searchTermLower)))) ||
        (card.cardType === 'Spell' && 
          card.spellDescription && 
          card.spellDescription.toLowerCase().includes(searchTermLower)) ||
        (card.cardType === 'Amulet' && 
          card.amuletDescription && 
          card.amuletDescription.toLowerCase().includes(searchTermLower));
          
      if (!textMatch) return false;
    }
    
    // Class filter
    if (selectedClasses.length > 0 && !selectedClasses.includes(card.class)) {
      return false;
    }
    
    // Rarity filter
    if (selectedRarities.length > 0 && !selectedRarities.includes(card.rarity)) {
      return false;
    }
    
    // Set filter - handled by calling component
    // This is intentionally left empty since set filtering is handled
    // manually in the calling component to avoid conflicts
    
    // Creator filter
    if (selectedCreators.length > 0 && !selectedCreators.includes(card.creator)) {
      return false;
    }
    
    // Card type filter
    if (selectedCardTypes.length > 0 && !selectedCardTypes.includes(card.cardType || 'Follower')) {
      return false;
    }
    
    // Trait filter
    if (selectedTraits.length > 0) {
      if (!card.trait) {
        return false; // Card has no traits but trait filter is applied
      }
      
      // Split the trait string by slash to handle multiple traits
      const cardTraits = card.trait.split('/').map(t => t.trim()).filter(t => t);
      // Check if any of the selected traits match any of the card's traits
      const hasMatchingTrait = selectedTraits.some(selectedTrait => 
        cardTraits.includes(selectedTrait)
      );
      
      if (!hasMatchingTrait) {
        return false;
      }
    }
    
    // Cost filter
    if (selectedCosts.length > 0) {
      const cardCost = card.cost;
      const hasMatchingCost = selectedCosts.some(selectedCost => {
        const cost = parseInt(selectedCost);
        if (cost < 10) {
          return cardCost === cost;
        } else {
          // Cost 10+
          return cardCost >= 10;
        }
      });
      
      if (!hasMatchingCost) {
        return false;
      }
    }
    
    // Card passed all filters
    return true;
  });
}; 