/**
 * Apply filters to a collection of cards
 * 
 * @param {Array} cards - Array of card objects
 * @param {Object} filters - Filter criteria
 * @param {string} filters.searchTerm - Text search term
 * @param {string} filters.selectedClass - Selected card class
 * @param {string} filters.selectedRarity - Selected card rarity
 * @param {string} filters.selectedSet - Selected set ID
 * @param {Object} filters.selectedSetData - Selected set data object (if selectedSet is set)
 * @param {string} filters.selectedCreator - Selected creator
 * @param {string} filters.selectedCost - Selected cost 
 * @param {string} filters.selectedCardType - Selected card type (Follower, Spell, Amulet)
 * @param {string} filters.selectedTrait - Selected card trait
 * @param {Array} filters.cardsFromHiddenSets - IDs of cards from hidden sets
 * @param {boolean} filters.showHiddenSetCards - Whether to show cards from hidden sets
 * @returns {Array} - Filtered array of cards
 */
export const applyFilters = (cards, filters) => {
  const {
    searchTerm,
    selectedClass,
    selectedRarity,
    selectedSet,
    selectedSetData,
    selectedCreator,
    selectedCost,
    selectedCardType,
    selectedTrait,
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
    if (selectedClass && card.class !== selectedClass) {
      return false;
    }
    
    // Rarity filter
    if (selectedRarity && card.rarity !== selectedRarity) {
      return false;
    }
    
    // Set filter
    if (selectedSet) {
      if (selectedSet === 'tokens') {
        if (!card.isToken) return false;
      } else if (selectedSetData) {
        if (!selectedSetData.cards.includes(card._id)) return false;
      }
    }
    
    // Creator filter
    if (selectedCreator && card.creator !== selectedCreator) {
      return false;
    }
    
    // Card type filter
    if (selectedCardType && card.cardType !== selectedCardType) {
      return false;
    }
    
    // Trait filter
    if (selectedTrait && card.trait) {
      // Split the trait string by slash only to handle multiple traits
      const cardTraits = card.trait.split('/').map(t => t.trim()).filter(t => t);
      // Check if the selected trait is included in the card's traits
      if (!cardTraits.includes(selectedTrait)) {
        return false;
      }
    } else if (selectedTrait) {
      // Card has no traits but trait filter is applied
      return false;
    }
    
    // Cost filter
    if (selectedCost) {
      const cost = parseInt(selectedCost);
      if (cost < 10) {
        if (card.cost !== cost) return false;
      } else {
        // Cost 10+
        if (card.cost < 10) return false;
      }
    }
    
    // Card passed all filters
    return true;
  });
}; 