/**
 * Text formatting utilities
 */

/**
 * Format text by converting markdown-like syntax to HTML elements
 * Currently supports:
 * - **text** for bold text
 * 
 * @param {string} text - The text to format
 * @returns {Array} - Array of React elements and strings
 */
export const formatText = (text) => {
  if (!text) return '';
  
  // Split the text by the bold pattern (**text**)
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return parts.map((part, index) => {
    // Check if this part is a bold pattern
    if (part.startsWith('**') && part.endsWith('**')) {
      // Extract the text between ** markers
      const boldText = part.slice(2, -2);
      return <strong key={index}>{boldText}</strong>;
    }
    
    // Return regular text as is
    return part;
  });
}; 