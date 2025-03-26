import React from 'react';

/**
 * Component to display keyword information as a banner
 * 
 * @param {Object} keyword - The keyword object to display
 * @returns {JSX.Element} - The keyword banner component
 */
const KeywordBanner = ({ keyword }) => {
  if (!keyword) return null;
  
  return (
    <div 
      className="keyword-banner"
      style={{
        '--keyword-image': `url(${keyword.imageUrl})`,
        '--keyword-image-position': keyword.imagePosition || '50% 50%'
      }}
    >
      <div className="keyword-banner-content">
        <h4 className="keyword-banner-title">{keyword.title}</h4>
        <p className="keyword-banner-description">{keyword.description}</p>
      </div>
    </div>
  );
};

export default KeywordBanner; 