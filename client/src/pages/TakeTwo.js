import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getCards, getSets, getCard } from '../services/api';
import html2canvas from 'html2canvas';
import { sortCards } from '../utils/cardUtils';
import { formatText } from '../utils/textUtils';

const ALL_CLASSES = [
  'Forestcraft', 'Swordcraft', 'Runecraft', 'Dragoncraft',
  'Shadowcraft', 'Bloodcraft', 'Havencraft', 'Portalcraft'
];

const CLASS_ICONS = {
  'Forestcraft': 'https://i.imgur.com/5jy1gEE.png',
  'Swordcraft': 'https://i.imgur.com/f0wdoOs.png',
  'Runecraft': 'https://i.imgur.com/NO0WSFV.png',
  'Dragoncraft': 'https://i.imgur.com/O6AM8nz.png',
  'Shadowcraft': 'https://i.imgur.com/XXbSrdK.png',
  'Bloodcraft': 'https://i.imgur.com/2pfTjrj.png',
  'Havencraft': 'https://i.imgur.com/xGSGSkT.png',
  'Portalcraft': 'https://i.imgur.com/p4foy4o.png'
};

const ROUNDS = [
  'GL_NEUTRAL_ONE', // 1
  'B_CLASS',        // 2
  'S_CLASS',        // 3
  'B_CLASS',        // 4
  'NEUTRAL_MIX',    // 5
  'S_CLASS',        // 6
  'B_CLASS',        // 7
  'GL_CLASS_AT_LEAST_ONE_LEG', // 8
  'B_CLASS',        // 9
  'NEUTRAL_BS_BS',  // 10
  'B_CLASS',        // 11
  'S_CLASS',        // 12
  'B_CLASS',        // 13
  'S_CLASS',        // 14
  'GL_CLASS_AT_LEAST_ONE_LEG'  // 15
];

const rarityIs = (card, r) => card.rarity === r;
const isLegendaryOrGold = (card) => card.rarity === 'Legendary' || card.rarity === 'Gold';

const TakeTwo = () => {
  const [phase, setPhase] = useState('confirm'); // confirm -> pickClass -> rounds -> done
  const [availableClasses, setAvailableClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [allCards, setAllCards] = useState([]);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [roundIndex, setRoundIndex] = useState(0);
  const [pairLeft, setPairLeft] = useState([]);   // two cards
  const [pairRight, setPairRight] = useState([]); // two cards
  const [hoverSide, setHoverSide] = useState(null); // 'left' | 'right' | null
  const [selectedCardDetails, setSelectedCardDetails] = useState(null);
  const [preloadedRelatedCards, setPreloadedRelatedCards] = useState({});

  const [deck, setDeck] = useState([]);
  const deckRef = useRef(null);
  const [exportingDeck, setExportingDeck] = useState(false);

  // Load base card and set data
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [cardsData, setsData] = await Promise.all([
          getCards(),
          getSets()
        ]);
        // Filter out hidden sets and token cards
        const hiddenSetIds = new Set(setsData.filter(s => s.hidden).map(s => s._id.toString()));
        const filtered = cardsData.filter(c => !c.isToken && !belongsToHiddenSet(c, setsData));
        setAllCards(filtered);
        setSets(setsData);
        setLoading(false);
      } catch (e) {
        setError('Failed to load cards/sets');
        setLoading(false);
      }
    };
    load();
  }, []);

  const belongsToHiddenSet = (card, setsData) => {
    return setsData.some(s => s.hidden && Array.isArray(s.cards) && s.cards.some(id => id.toString() === card._id.toString()));
  };

  // Confirm flow -> pick 3 random classes
  const beginRun = () => {
    const shuffled = [...ALL_CLASSES].sort(() => Math.random() - 0.5);
    setAvailableClasses(shuffled.slice(0, 3));
    setPhase('pickClass');
  };

  const handleSelectClass = (cls) => {
    setSelectedClass(cls);
    // Initialize first round
    setRoundIndex(0);
    setDeck([]);
    setPhase('rounds');
    generateRound(0, cls);
  };

  // Helpers to sample cards
  const sample = (arr, n, predicate = () => true, excludeIds = new Set()) => {
    const pool = arr.filter(c => predicate(c) && !excludeIds.has(c._id));
    const shuffled = pool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  };

  const classFilter = (cls) => (c) => c.class === cls;
  const neutralFilter = (c) => c.class === 'Neutral';

  const rarityFilter = (rarities) => (c) => rarities.includes(c.rarity);

  const ensureNoDuplicatesBetweenPairs = (left, right) => {
    const leftIds = new Set(left.map(c => c._id));
    return right.filter(c => !leftIds.has(c._id));
  };

  const generateRound = (idx, cls) => {
    const rule = ROUNDS[idx];
    const exclude = new Set();

    const pickGLClass = () => {
      // Gold or Legendary from selected class
      return sample(allCards, 1, (c) => classFilter(cls)(c) && isLegendaryOrGold(c), exclude)[0];
    };
    const pickLegendaryClass = () => sample(allCards, 1, (c) => classFilter(cls)(c) && c.rarity === 'Legendary', exclude)[0];
    const pickGoldClass = () => sample(allCards, 1, (c) => classFilter(cls)(c) && c.rarity === 'Gold', exclude)[0];
    const pickBronzeClass = () => sample(allCards, 1, (c) => classFilter(cls)(c) && c.rarity === 'Bronze', exclude)[0];
    const pickSilverClass = () => sample(allCards, 1, (c) => classFilter(cls)(c) && c.rarity === 'Silver', exclude)[0];
    const pickAnyClass = (r) => sample(allCards, 1, (c) => classFilter(cls)(c) && c.rarity === r, exclude)[0];

    const pickNeutral = (r) => sample(allCards, 1, (c) => neutralFilter(c) && c.rarity === r, exclude)[0];
    const pickNeutralGL = () => sample(allCards, 1, (c) => neutralFilter(c) && isLegendaryOrGold(c), exclude)[0];

    const pushEx = (card) => { if (card) exclude.add(card._id); return card; };

    let L = [], R = [];

    if (rule === 'GL_NEUTRAL_ONE') {
      // Two pairs of Gold/Legendary selected class cards, but exactly one Neutral Legendary present overall.
      // And one pair cannot have two Legendaries.
      // Approach: pick one neutral legendary, then fill remaining three slots with selected class GL; ensure at most one legendary per pair.
      const neutralLegend = pushEx(pickNeutral('Legendary'));
      // Gather three class GL (Gold or Legendary)
      const gl1 = pushEx(pickGLClass());
      const gl2 = pushEx(pickGLClass());
      const gl3 = pushEx(pickGLClass());
      const pool = [neutralLegend, gl1, gl2, gl3].filter(Boolean);
      // Distribute to avoid two legendaries in a single pair
      const legends = pool.filter(c => c.rarity === 'Legendary');
      const golds = pool.filter(c => c.rarity === 'Gold');
      // Build pairs
      if (legends.length === 2) {
        // Put one legendary with one gold on each side
        L = [legends[0], golds[0] || legends[1]];
        R = [legends[1], golds[1] || golds[0] || legends[0]];
      } else if (legends.length === 1) {
        // Ensure the neutral legendary is used and split others
        L = [legends[0], golds[0] || gl1].filter(Boolean).slice(0,2);
        R = [golds[1] || gl2, golds[2] || gl3].filter(Boolean).slice(0,2);
      } else {
        // No class legendary pulled; ensure neutral legendary present, pair with a gold
        L = [neutralLegend, golds[0]].filter(Boolean);
        R = [golds[1] || gl2, golds[2] || gl3].filter(Boolean);
      }
    } else if (rule === 'B_CLASS') {
      L = [pushEx(pickBronzeClass()), pushEx(pickBronzeClass())].filter(Boolean);
      R = ensureNoDuplicatesBetweenPairs(L, [pushEx(pickBronzeClass()), pushEx(pickBronzeClass())].filter(Boolean));
    } else if (rule === 'S_CLASS') {
      L = [pushEx(pickSilverClass()), pushEx(pickSilverClass())].filter(Boolean);
      R = ensureNoDuplicatesBetweenPairs(L, [pushEx(pickSilverClass()), pushEx(pickSilverClass())].filter(Boolean));
    } else if (rule === 'NEUTRAL_MIX') {
      // One side: 1 Bronze + 1 Silver or 2 Silvers
      // Other: 1 Gold + 1 Bronze or Silver
      const firstIsTwoSilver = Math.random() < 0.5;
      if (firstIsTwoSilver) {
        L = [pushEx(pickNeutral('Silver')), pushEx(pickNeutral('Silver'))].filter(Boolean);
      } else {
        L = [pushEx(pickNeutral('Bronze')), pushEx(pickNeutral('Silver'))].filter(Boolean);
      }
      const secondUseBronze = Math.random() < 0.5;
      const otherSecond = secondUseBronze ? pushEx(pickNeutral('Bronze')) : pushEx(pickNeutral('Silver'));
      R = ensureNoDuplicatesBetweenPairs(L, [pushEx(pickNeutral('Gold')), otherSecond].filter(Boolean));
    } else if (rule === 'GL_CLASS_AT_LEAST_ONE_LEG') {
      // Two pairs of Gold/Legendary selected class cards. At least one pair has a Legendary; the other may have none.
      // Build four class GL ensuring at least one legendary present, and avoid placing two legendaries in the same pair unless needed.
      const gls = [];
      for (let i = 0; i < 6 && gls.length < 4; i++) {
        const c = pickGLClass(); if (c) { pushEx(c); gls.push(c); }
      }
      const legends = gls.filter(c => c.rarity === 'Legendary');
      const golds = gls.filter(c => c.rarity === 'Gold');
      if (legends.length === 0) {
        // Force at least one legendary by replacing one gold if possible
        const forced = pickLegendaryClass();
        if (forced) { pushEx(forced); gls[0] = forced; }
      }
      const l2 = gls[0] && gls[1] ? [gls[0], gls[1]] : gls.slice(0,2);
      const r2 = gls[2] && gls[3] ? [gls[2], gls[3]] : gls.slice(2,4);
      L = l2;
      R = ensureNoDuplicatesBetweenPairs(L, r2);
      // Try to avoid double-legendaries in one pair if both pairs can have 1 each
      const countLeg = (arr) => arr.filter(c => c.rarity === 'Legendary').length;
      if (countLeg(L) === 2 && countLeg(R) === 0 && R.length === 2) {
        // Swap one legendary with a gold if available
        const lLeg = L.find(c => c.rarity === 'Legendary');
        const rGold = R.find(c => c.rarity === 'Gold');
        if (lLeg && rGold) {
          L = [L.find(c => c !== lLeg), rGold];
          R = [R.find(c => c !== rGold), lLeg];
        }
      }
    } else if (rule === 'NEUTRAL_BS_BS') {
      // Two pairs of Neutral, both sides 1 Bronze + 1 Silver
      L = [pushEx(pickNeutral('Bronze')), pushEx(pickNeutral('Silver'))].filter(Boolean);
      R = ensureNoDuplicatesBetweenPairs(L, [pushEx(pickNeutral('Bronze')), pushEx(pickNeutral('Silver'))].filter(Boolean));
    }

    // Fallback if pools too small
    if (L.length < 2 || R.length < 2) {
      const fallback = sample(allCards, 4, classFilter(cls));
      L = fallback.slice(0,2);
      R = fallback.slice(2,4);
    }

    setPairLeft(L);
    setPairRight(R);
    setHoverSide(null);
  };

  const addPairToDeck = (side) => {
    const picked = side === 'left' ? pairLeft : pairRight;
    const nextDeck = [...deck, ...picked];
    setDeck(nextDeck);
    const nextRound = roundIndex + 1;
    if (nextRound >= 15) {
      setPhase('done');
    } else {
      setRoundIndex(nextRound);
      generateRound(nextRound, selectedClass);
    }
  };

  const getManaCurve = () => {
    const curve = Array(9).fill(0);
    deck.forEach(card => { const cost = Math.min(card.cost, 8); curve[cost]++; });
    return curve;
  };

  // Detail modal behaviors reusing DeckBuilder style
  const handleCardDetailView = (card, e) => {
    e.preventDefault();
    e.stopPropagation();
    const cardDataToShow = { ...card };
    if (cardDataToShow.relatedCards && Array.isArray(cardDataToShow.relatedCards)) {
      cardDataToShow.relatedCards = sortCards(cardDataToShow.relatedCards);
    }
    setSelectedCardDetails(cardDataToShow);
  };
  const handleDetailClose = () => setSelectedCardDetails(null);
  const handleDetailClick = (e) => e.stopPropagation();

  const exportDeck = async () => {
    if (!deckRef.current) return;
    try {
      setExportingDeck(true);
      document.body.classList.add('exporting-deck');
      await new Promise(r => setTimeout(r, 250));
      const canvas = await html2canvas(deckRef.current, { backgroundColor: '#1a1a1a', scale: 2, logging: false, useCORS: true, allowTaint: true });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${selectedClass || 'TakeTwo'}_Deck.png`;
      link.click();
    } catch (e) {
      // noop
    } finally {
      document.body.classList.remove('exporting-deck');
      setExportingDeck(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="take-two-page">
      {phase === 'confirm' && (
        <div className="take-two-confirm">
          <h1>Begin Take Two Run?</h1>
          <button className="btn" onClick={beginRun}>Confirm</button>
        </div>
      )}

      {phase === 'pickClass' && (
        <div className="class-selection">
          <h2>Select a Class</h2>
          <div className="class-grid">
            {availableClasses.map(className => (
              <div key={className} className="class-card" onClick={() => handleSelectClass(className)}>
                <div className="class-icon">
                  <img src={CLASS_ICONS[className]} alt={className} />
                </div>
                <h3>{className}</h3>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === 'rounds' && (
        <div className="take-two-rounds">
          <div className="rounds-left">
            <div className="round-header">
              <h2>Round {roundIndex + 1} / 15</h2>
              <p>Select one pair to add to your deck.</p>
            </div>

            <div className="pairs-container">
              <div 
                className={`pair left ${hoverSide === 'left' ? 'hover-left' : ''}`}
                onMouseEnter={() => setHoverSide('left')}
                onMouseLeave={() => setHoverSide(null)}
              >
                <div className="pair-cards">
                  {pairLeft.map(card => (
                    <div key={card._id} className="pair-card" onClick={(e) => handleCardDetailView(card, e)}>
                      <img src={card.imageUrl} alt={card.title} />
                    </div>
                  ))}
                </div>
                <button className="btn select-btn" onClick={() => addPairToDeck('left')}>Select</button>
              </div>

              <div 
                className={`pair right ${hoverSide === 'right' ? 'hover-right' : ''}`}
                onMouseEnter={() => setHoverSide('right')}
                onMouseLeave={() => setHoverSide(null)}
              >
                <div className="pair-cards">
                  {pairRight.map(card => (
                    <div key={card._id} className="pair-card" onClick={(e) => handleCardDetailView(card, e)}>
                      <img src={card.imageUrl} alt={card.title} />
                    </div>
                  ))}
                </div>
                <button className="btn select-btn" onClick={() => addPairToDeck('right')}>Select</button>
              </div>
            </div>
          </div>

          <div className="rounds-right">
            <div className="current-deck export-view" ref={deckRef}>
              <div className="deck-header">
                <div className="deck-title-container">
                  <div className="deck-name-input">{selectedClass} Take Two</div>
                  <span className="deck-count">({deck.length}/30)</span>
                </div>
                <div className="mana-curve">
                  {getManaCurve().map((count, cost) => (
                    <div key={cost} className="mana-bar">
                      <div className="mana-bar-fill" style={{ height: `${Math.min(100, count * 10)}%` }}></div>
                      <div className="mana-cost">{cost === 8 ? '8+' : cost}</div>
                      <div className="mana-count">{count}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="deck-cards">
                {deck.length === 0 ? (
                  <div className="empty-deck"><p>empty deck lmao</p></div>
                ) : (
                  <div className="deck-card-list export-list">
                    {deck.map((card, idx) => (
                      <div
                        key={`${card._id}-${idx}`}
                        className="deck-card export-card"
                        style={card.bannerImageUrl ? {
                          backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5)), url(${card.bannerImageUrl})`,
                          backgroundPosition: card.bannerImagePosition || '50% 50%',
                          backgroundSize: card.bannerImageZoom ? `${card.bannerImageZoom}%` : 'cover'
                        } : {}}
                      >
                        {!card.bannerImageUrl && (
                          <div className="export-card-thumbnail">
                            <img src={card.imageUrl} alt={card.title} className="mini-card-image" />
                          </div>
                        )}
                        <div className="deck-card-info">
                          <div className="deck-card-cost">{card.cost}</div>
                          <div className="deck-card-title">{card.title}</div>
                          <div className={`deck-card-class ${card.class.toLowerCase()}`}>{card.class}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedCardDetails && (
            <div className="deck-builder-card-detail card-list-detail-modal" onClick={handleDetailClose}>
              <div className="detail-header" onClick={handleDetailClick}>
                <h3 className="card-title">{selectedCardDetails.title}</h3>
                <button className="close-detail-btn" onClick={handleDetailClose}>×</button>
              </div>
              <div className="card-detail-content" onClick={handleDetailClick}>
                <div className="card-detail-image">
                  <img src={selectedCardDetails.imageUrl} alt={selectedCardDetails.title} />
                </div>
                <div className="card-detail-info">
                  <div className="card-metadata">
                    <div className="card-metadata-row">
                      <div>
                        <span className="card-cost">{selectedCardDetails.cost}</span>
                        <span className="card-class" title={selectedCardDetails.class}>{selectedCardDetails.class}</span>
                      </div>
                      <span className={`card-rarity card-rarity-${selectedCardDetails.rarity.toLowerCase()}`}>{selectedCardDetails.rarity}</span>
                    </div>
                    <div className="card-metadata-row">
                      <div>
                        {selectedCardDetails.trait && (
                          <span className="card-trait">Trait: {selectedCardDetails.trait}</span>
                        )}
                        {selectedCardDetails.isToken && !selectedCardDetails.trait && (
                          <span className="card-token-badge">Token</span>
                        )}
                      </div>
                      <span className={`card-type-badge ${selectedCardDetails.cardType?.toLowerCase() || 'follower'}`}>
                        {selectedCardDetails.cardType || 'Follower'}
                      </span>
                    </div>
                  </div>
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
                  {selectedCardDetails.cardType === 'Spell' && (
                    <div className="card-descriptions"><div className="description-section"><h4 className="description-title">Spell Effect</h4><p className="card-description">{formatText(selectedCardDetails.spellDescription)}</p></div></div>
                  )}
                  {selectedCardDetails.cardType === 'Amulet' && (
                    <div className="card-descriptions"><div className="description-section"><h4 className="description-title">Amulet Effect</h4><p className="card-description">{formatText(selectedCardDetails.amuletDescription)}</p></div></div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'done' && (
        <div className="take-two-complete">
          <h2>Take Two Complete</h2>
          <div className="current-deck export-view" ref={deckRef}>
            <div className="deck-header">
              <div className="deck-title-container">
                <div className="deck-name-input">{selectedClass} Take Two</div>
                <span className="deck-count">({deck.length}/30)</span>
              </div>
              <div className="mana-curve">
                {getManaCurve().map((count, cost) => (
                  <div key={cost} className="mana-bar">
                    <div className="mana-bar-fill" style={{ height: `${Math.min(100, count * 10)}%` }}></div>
                    <div className="mana-cost">{cost === 8 ? '8+' : cost}</div>
                    <div className="mana-count">{count}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="deck-cards">
              <div className="deck-card-list export-list">
                {deck.map((card, idx) => (
                  <div key={`${card._id}-${idx}`} className="deck-card export-card" style={card.bannerImageUrl ? {
                    backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5)), url(${card.bannerImageUrl})`,
                    backgroundPosition: card.bannerImagePosition || '50% 50%',
                    backgroundSize: card.bannerImageZoom ? `${card.bannerImageZoom}%` : 'cover'
                  } : {}}>
                    {!card.bannerImageUrl && (
                      <div className="export-card-thumbnail"><img src={card.imageUrl} alt={card.title} className="mini-card-image" /></div>
                    )}
                    <div className="deck-card-info">
                      <div className="deck-card-cost">{card.cost}</div>
                      <div className="deck-card-title">{card.title}</div>
                      <div className={`deck-card-class ${card.class.toLowerCase()}`}>{card.class}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="export-actions">
            <button className="btn" onClick={exportDeck} disabled={exportingDeck}>{exportingDeck ? 'Exporting...' : 'Export Deck as Image'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeTwo;


