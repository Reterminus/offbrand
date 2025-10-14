import React, { memo } from 'react';
import { formatText } from '../utils/textUtils';

const CardDetailModal = memo(({
  cardDetails,
  handleDetailClose,
  handleDetailClick,
  handleRelatedCardClick,
  handleRelatedCardMouseEnter,
  handleRelatedCardMouseLeave,
  hoveredRelatedCard,
  hideNotes = false
}) => {
  if (!cardDetails) return null;
  
  return (
    <div 
      className="deck-builder-card-detail card-list-detail-modal"
      onClick={handleDetailClose}
    >
      <div 
        className="detail-header"
        onClick={handleDetailClick}
      >
        <h3 className="card-title">{cardDetails.title}</h3>
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
            src={cardDetails.imageUrl} 
            alt={cardDetails.title} 
            loading="lazy"
          />
        </div>
        
        <div className="card-detail-info">
          <div className="card-metadata">
            <div className="card-metadata-row">
              <div>
                <span className="card-cost">{cardDetails.cost}</span>
                <span className="card-class" title={cardDetails.class}>
                  {cardDetails.class}
                </span>
              </div>
              <span className={`card-rarity card-rarity-${cardDetails.rarity.toLowerCase()}`}>
                {cardDetails.rarity}
              </span>
            </div>
            
            <div className="card-metadata-row">
              <div>
                {cardDetails.trait && (
                  <span className="card-trait">
                    Trait: {cardDetails.trait}
                  </span>
                )}
                {cardDetails.isToken && !cardDetails.trait && (
                  <span className="card-token-badge">
                    Token
                  </span>
                )}
              </div>
              <span className={`card-type-badge ${cardDetails.cardType?.toLowerCase() || 'follower'}`}>
                {cardDetails.cardType || 'Follower'}
              </span>
            </div>
            
            {cardDetails.trait && cardDetails.isToken && (
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
          
          {/* Card description based on type */}
          {renderCardDescription(cardDetails)}
          
          {/* Divider before Keywords/Related Cards/Notes */}
          <div className="card-notes-divider"></div>
          
          {/* Related Cards section */}
          {renderRelatedCards(
            cardDetails, 
            hoveredRelatedCard, 
            handleRelatedCardClick, 
            handleRelatedCardMouseEnter, 
            handleRelatedCardMouseLeave
          )}
          
          {/* Keywords section */
          {renderKeywords(cardDetails)}
          
          {/* Card Notes section */}
          {!hideNotes && renderNotes(cardDetails)}
        </div>
      </div>
    </div>
  );
});

// Extract card description rendering to a separate function
const renderCardDescription = (card) => {
  if (!card.cardType || card.cardType === 'Follower') {
    return (
      <div className="card-descriptions follower-descriptions">
        <div className="description-section follower-section">
          <h4 className="description-title">Unevolved</h4>
          <div className="stats-row">
            <span>Attack: <span className="attack-value">{card.unevolvedAttack}</span></span>
            <span>Defense: <span className="defense-value">{card.unevolvedDefense}</span></span>
          </div>
          <p className="card-description">{formatText(card.unevolvedDescription)}</p>
        </div>
        
        <div className="description-section evolved-section">
          <h4 className="description-title">Evolved</h4>
          <div className="stats-row">
            <span>Attack: <span className="attack-value">{card.evolvedAttack}</span></span>
            <span>Defense: <span className="defense-value">{card.evolvedDefense}</span></span>
          </div>
          <p className="card-description">{formatText(card.evolvedDescription)}</p>
        </div>
      </div>
    );
  } else if (card.cardType === 'Spell') {
    return (
      <div className="card-descriptions spell-descriptions">
        <div className="description-section spell-section">
          <h4 className="description-title">Spell Effect</h4>
          <p className="card-description">{formatText(card.spellDescription)}</p>
        </div>
      </div>
    );
  } else if (card.cardType === 'Amulet') {
    return (
      <div className="card-descriptions amulet-descriptions">
        <div className="description-section amulet-section">
          <h4 className="description-title">Amulet Effect</h4>
          <p className="card-description">{formatText(card.amuletDescription)}</p>
        </div>
      </div>
    );
  }
  
  return null;
};

// Extract related cards rendering to a separate function
const renderRelatedCards = (
  card, 
  hoveredRelatedCard, 
  handleRelatedCardClick, 
  handleRelatedCardMouseEnter, 
  handleRelatedCardMouseLeave
) => {
  if (!card.relatedCards || card.relatedCards.length === 0) return null;
  
  return (
    <div className="related-cards-section">
      <h4 className="related-cards-title">
        {hoveredRelatedCard ? hoveredRelatedCard.title : "Related Cards"}
      </h4>
      <div className="related-cards-grid cards-only">
        {card.relatedCards.map(relatedCard => (
          <div 
            key={relatedCard._id} 
            className="related-card cards-only"
            onClick={(e) => handleRelatedCardClick(relatedCard, e)}
            onMouseEnter={() => handleRelatedCardMouseEnter(relatedCard)}
            onMouseLeave={handleRelatedCardMouseLeave}
          >
            <div className="related-card-image">
              <img 
                src={relatedCard.imageUrl} 
                alt={relatedCard.title} 
                loading="lazy" 
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Extract keywords rendering to a separate function
const renderKeywords = (card) => {
  if (!card.keywords || card.keywords.length === 0) return null;
  
  return (
    <div className="card-keywords">
      {card.keywords.map(keyword => (
        <div 
          key={keyword._id} 
          className="keyword-banner"
        >
          <div 
            className="keyword-overlay"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.5)), url(${keyword.imageUrl})`,
              backgroundPosition: keyword.imagePosition || '50% 50%',
              backgroundSize: 'cover'
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
  );
};

// Extract notes rendering to a separate function
const renderNotes = (card) => {
  if (!card.notes) return null;
  
  return (
    <div className="card-notes-section">
      <h4 className="notes-title">Details</h4>
      <div className="notes-content">
        {card.notes.split('\n').map((line, index) => (
          <p key={index} className="note-line">
            {formatText(line || '')}
          </p>
        ))}
      </div>
    </div>
  );
};

export default CardDetailModal; 