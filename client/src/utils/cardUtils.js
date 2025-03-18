/**
 * Utility functions for card operations
 */

// Class order for sorting
const CLASS_ORDER = [
  'Forestcraft',
  'Swordcraft',
  'Runecraft',
  'Dragoncraft',
  'Shadowcraft',
  'Bloodcraft',
  'Havencraft',
  'Portalcraft',
  'Neutral'
];

// Rarity order for sorting (reversed to show highest rarity first)
const RARITY_ORDER = [
  'Legendary',
  'Gold',
  'Silver',
  'Bronze'
];

// Card type order for sorting
const CARD_TYPE_ORDER = [
  'Follower',
  'Spell',
  'Amulet'
];

/**
 * Sort cards by class, then rarity (highest first), then non-tokens before tokens, then card type, then cost, then alphabetically by title
 * @param {Array} cards - Array of card objects to sort
 * @returns {Array} - Sorted array of cards
 */
export const sortCards = (cards) => {
  return [...cards].sort((a, b) => {
    // First sort by class
    const classA = CLASS_ORDER.indexOf(a.class);
    const classB = CLASS_ORDER.indexOf(b.class);
    
    // If class is not in the predefined order, put it at the end
    const classAIndex = classA === -1 ? 999 : classA;
    const classBIndex = classB === -1 ? 999 : classB;
    
    if (classAIndex !== classBIndex) {
      return classAIndex - classBIndex;
    }
    
    // Then sort by rarity (highest first)
    const rarityA = RARITY_ORDER.indexOf(a.rarity);
    const rarityB = RARITY_ORDER.indexOf(b.rarity);
    
    // If rarity is not in the predefined order, put it at the end
    const rarityAIndex = rarityA === -1 ? 999 : rarityA;
    const rarityBIndex = rarityB === -1 ? 999 : rarityB;
    
    if (rarityAIndex !== rarityBIndex) {
      return rarityAIndex - rarityBIndex;
    }

    // Then sort tokens to the end within their class/rarity group
    if (a.isToken !== b.isToken) {
      return a.isToken ? 1 : -1;
    }
    
    // Then sort by card type
    const typeA = CARD_TYPE_ORDER.indexOf(a.cardType || 'Follower');
    const typeB = CARD_TYPE_ORDER.indexOf(b.cardType || 'Follower');
    
    // If card type is not in the predefined order, put it at the end
    const typeAIndex = typeA === -1 ? 999 : typeA;
    const typeBIndex = typeB === -1 ? 999 : typeB;
    
    if (typeAIndex !== typeBIndex) {
      return typeAIndex - typeBIndex;
    }
    
    // Then sort by cost
    if (a.cost !== b.cost) {
      return a.cost - b.cost;
    }
    
    // Finally sort alphabetically by title
    return a.title.localeCompare(b.title);
  });
}; 