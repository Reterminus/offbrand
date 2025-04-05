import React, { memo } from 'react';
import { formatText } from '../utils/textUtils';

const CardItem = memo(({
  card,
  isAdmin,
  detailPosition,
  isActive,
  showNotes,
  handleMouseEnter,
  handleMouseLeave,
  handleCardClick,
  handleButtonClick,
  handleEdit,
  handleDelete,
  setCardRef
}) => {
  return (
    <div 
      className="card-container" 
      key={card._id}
      ref={(el) => setCardRef(card._id, el)}
      onMouseEnter={() => handleMouseEnter(card._id)}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => handleCardClick(card, e)}
      style={{ zIndex: isActive ? 1000 : 1 }}
    >
      <div className="card">
        <img 
          src={card.imageUrl} 
          alt={card.title} 
          className="card-image" 
          loading="lazy"
        />
        {card.isToken && <div className="token-label">Token</div>}
        {isAdmin && (
          <div className="card-actions">
            <button 
              className="btn btn-edit"
              onClick={(e) => {
                handleButtonClick(e);
                handleEdit(card._id);
              }}
            >
              Edit
            </button>
            <button 
              className="btn btn-danger"
              onClick={(e) => {
                handleButtonClick(e);
                handleDelete(card._id);
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
      
      <div 
        className={`card-detail ${isActive ? 'visible' : ''}`}
        style={{
          left: detailPosition === 'left' ? 'auto' : 'calc(100% + 20px)',
          right: detailPosition === 'left' ? 'calc(100% + 20px)' : 'auto'
        }}
      >
        <h3 className="card-title">{card.title}</h3>
        
        <div className="card-metadata">
          <div className="card-metadata-row">
            <div>
              <span className="card-cost">{card.cost}</span>
              <span className="card-class" title={card.class}>{card.class}</span>
            </div>
            <span className={`card-rarity card-rarity-${card.rarity.toLowerCase()}`}>{card.rarity}</span>
          </div>
          
          <div className="card-metadata-row">
            <div>
              {card.trait && (
                <span className="card-trait">
                  Trait: {card.trait}
                </span>
              )}
              {card.isToken && !card.trait && (
                <span className="card-token-badge">
                  Token
                </span>
              )}
            </div>
            <span className={`card-type-badge ${card.cardType?.toLowerCase() || 'follower'}`}>
              {card.cardType || 'Follower'}
            </span>
          </div>
          
          {card.trait && card.isToken && (
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
        {(!card.cardType || card.cardType === 'Follower') && (
          <div className="card-descriptions">
            <div className="description-section follower-section">
              <h4 className="description-title">Unevolved</h4>
              <div className="stats-row">
                <span>Attack: <span className="attack-value">{card.unevolvedAttack}</span></span>
                <span>Defense: <span className="defense-value">{card.unevolvedDefense}</span></span>
              </div>
              <FormattedText text={card.unevolvedDescription} />
            </div>
            
            <div className="description-section">
              <h4 className="description-title">Evolved</h4>
              <div className="stats-row">
                <span>Attack: <span className="attack-value">{card.evolvedAttack}</span></span>
                <span>Defense: <span className="defense-value">{card.evolvedDefense}</span></span>
              </div>
              <FormattedText text={card.evolvedDescription} />
            </div>
          </div>
        )}
        
        {/* Spell card details */}
        {card.cardType === 'Spell' && (
          <div className="card-descriptions" style={{ border: 'none', borderBottom: 'none' }}>
            <div 
              className="description-section spell-section" 
              style={{ border: 'none', borderBottom: 'none' }}
            >
              <h4 className="description-title">Spell Effect</h4>
              <FormattedText text={card.spellDescription} />
            </div>
          </div>
        )}
        
        {/* Amulet card details */}
        {card.cardType === 'Amulet' && (
          <div className="card-descriptions">
            <div className="description-section amulet-section" style={{ border: 'none', borderBottom: 'none' }}>
              <h4 className="description-title">Amulet Effect</h4>
              <FormattedText text={card.amuletDescription} />
            </div>
          </div>
        )}
        
        {/* Notes section inside the detail window */}
        {(card.notes && card.notes.trim() !== '') || (card.keywords && card.keywords.length > 0) ? (
          <div 
            className={`card-notes-section ${showNotes ? 'show' : ''}`}
          >
            <div className="card-notes-divider"></div>
            
            {/* Keywords section */}
            {card.keywords && card.keywords.length > 0 && (
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
            )}
            
            {/* Notes content */}
            {card.notes && card.notes.trim() !== '' && (
              <div className="card-notes-content">
                {card.notes.split('\n').filter(line => line.trim() !== '').map((line, index) => (
                  <div key={index} className="note-line">
                    <FormattedText text={line} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
});

// Memoized component for formatted text to prevent unnecessary re-renders
const FormattedText = memo(({ text }) => {
  return <p className="card-description">{formatText(text)}</p>;
});

export default CardItem; 