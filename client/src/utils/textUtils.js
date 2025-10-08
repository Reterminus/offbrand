/**
 * Text formatting utilities
 */

/**
 * Format text by converting simple markup to HTML elements
 * Supports:
 * - [b]text[/b] for bold text (new)
 * - **text** for bold text (legacy support)
 *
 * @param {string} text - The text to format
 * @returns {Array} - Array of React elements and strings
 */
export const formatText = (text) => {
  if (!text) return '';

  // Split by either [b]...[/b] or **...** blocks, preserving delimiters
  const parts = text.split(/(\[b\].*?\[\/b\]|\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    // New syntax: [b]...[/b]
    if (part.startsWith('[b]') && part.endsWith('[/b]')) {
      const boldText = part.slice(3, -4);
      return <strong key={index}>{boldText}</strong>;
    }

    // Legacy syntax: **...**
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return <strong key={index}>{boldText}</strong>;
    }

    return part;
  });
};