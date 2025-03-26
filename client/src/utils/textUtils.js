/**
 * Text formatting utilities
 */

/**
 * Format text by converting markdown-like syntax to HTML elements
 * Currently supports:
 * - **text** for bold text
 * 
 * @param {string} text - The text to format
 * @param {Array} keywords - Array of keyword objects (optional)
 * @returns {Array} - Array of React elements and strings
 */
export const formatText = (text, keywords = []) => {
  if (!text) return '';
  
  // Split the text by the bold pattern (**text**)
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return parts.map((part, index) => {
    // Check if this part is a bold pattern
    if (part.startsWith('**') && part.endsWith('**')) {
      // Extract the text between ** markers
      const boldText = part.slice(2, -2);
      
      // Check if this bold text matches a keyword title
      const matchedKeyword = keywords && keywords.length > 0 
        ? keywords.find(kw => kw.title.toLowerCase() === boldText.toLowerCase())
        : null;
      
      // If it matches a keyword, add the data-keyword attribute for potential use
      if (matchedKeyword) {
        return <strong key={index} className="keyword-text" data-keyword-id={matchedKeyword._id}>{boldText}</strong>;
      }
      
      // Regular bold text with no keyword match
      return <strong key={index}>{boldText}</strong>;
    }
    
    // Return regular text as is
    return part;
  });
}; 

/**
 * Find keywords in text
 * 
 * @param {string} text - The text to scan for keywords
 * @param {Array} keywords - Array of keyword objects
 * @returns {Array} - Array of found keyword objects
 */
export const findKeywordsInText = (text, keywords = []) => {
  if (!text || !keywords || keywords.length === 0) return [];
  
  // Extract bolded terms from the text
  const boldedTerms = [];
  const boldRegex = /\*\*(.*?)\*\*/g;
  let match;
  
  while ((match = boldRegex.exec(text)) !== null) {
    boldedTerms.push(match[1]);
  }
  
  // Find matching keywords
  const foundKeywords = keywords.filter(keyword => 
    boldedTerms.some(term => term.toLowerCase() === keyword.title.toLowerCase())
  );
  
  return foundKeywords;
}; 