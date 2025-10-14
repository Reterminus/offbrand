import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getCards, getCard, getSets } from '../services/api';
import CardDetailModal from '../components/CardDetailModal';
import { sortCards } from '../utils/cardUtils';
import html2canvas from 'html2canvas';

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

const ROUND_RULES = [
  { type: 'selected', spec: 'goldLegendary_with_one_neutral_legendary' },
  { type: 'selected', spec: 'two_bronze' },
  { type: 'selected', spec: 'two_silver' },
  { type: 'selected', spec: 'two_bronze' },
  { type: 'neutral',  spec: 'neutral_mixed_low_high' },
  { type: 'selected', spec: 'two_silver' },
  { type: 'selected', spec: 'two_bronze' },
  { type: 'selected', spec: 'goldLegendary_at_least_one_legendary' },
  { type: 'selected', spec: 'two_bronze' },
  { type: 'neutral',  spec: 'neutral_bronze_silver_both_pairs' },
  { type: 'selected', spec: 'two_bronze' },
  { type: 'selected', spec: 'two_silver' },
  { type: 'selected', spec: 'two_bronze' },
  { type: 'selected', spec: 'two_silver' },
  { type: 'selected', spec: 'goldLegendary_at_least_one_legendary' }
];

const rarityOrder = ['Bronze', 'Silver', 'Gold', 'Legendary'];

function randomSample(array, n, excludeIds = new Set()) {
  const pool = array.filter(c => !excludeIds.has(c._id));
  if (pool.length < n) return null;
  const result = [];
  let remaining = [...pool];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * remaining.length);
    result.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return result;
}

const buildPools = (cards, sets) => {
  // Allow only cards in non-hidden sets and not tokens
  const allowedCardIds = new Set();
  sets.filter(s => !s.hidden).forEach(s => {
    (s.cards || []).forEach(cid => allowedCardIds.add(cid.toString()));
  });

  const allowed = cards.filter(c => !c.isToken && allowedCardIds.has(c._id.toString()));

  const byClass = {};
  const byNeutral = {};
  ALL_CLASSES.forEach(cls => { byClass[cls] = { Bronze: [], Silver: [], Gold: [], Legendary: [] }; });
  byNeutral['Neutral'] = { Bronze: [], Silver: [], Gold: [], Legendary: [] };

  allowed.forEach(c => {
    const r = rarityOrder.includes(c.rarity) ? c.rarity : 'Bronze';
    if (c.class === 'Neutral') {
      byNeutral['Neutral'][r].push(c);
    } else if (byClass[c.class]) {
      byClass[c.class][r].push(c);
    }
  });

  // Sort within pools for stability
  Object.values(byClass).forEach(map => rarityOrder.forEach(r => map[r] = sortCards(map[r])));
  rarityOrder.forEach(r => byNeutral['Neutral'][r] = sortCards(byNeutral['Neutral'][r]));

  return { byClass, byNeutral };
};

function TakeTwo() {
  const [phase, setPhase] = useState('start'); // start | class | draft | complete
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cards, setCards] = useState([]);
  const [sets, setSets] = useState([]);
  const [pools, setPools] = useState(null);

  const [offerClasses, setOfferClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');

  const [roundIndex, setRoundIndex] = useState(0); // 0..14
  const [pairLeft, setPairLeft] = useState([]);  // [card, card]
  const [pairRight, setPairRight] = useState([]);
  const [hoverSide, setHoverSide] = useState(null); // 'left' | 'right' | null

  const [deck, setDeck] = useState([]); // 30 cards at completion
  const deckRef = useRef(null);

  const [selectedCardDetails, setSelectedCardDetails] = useState(null);
  const [hoveredRelatedCard, setHoveredRelatedCard] = useState(null);
  const [preloadedRelatedCards, setPreloadedRelatedCards] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [cardsData, setsData] = await Promise.all([
          getCards(),
          getSets()
        ]);
        setCards(cardsData);
        setSets(setsData);
        setPools(buildPools(cardsData, setsData));
        setLoading(false);
      } catch (e) {
        setError('Failed to load cards/sets.');
        setLoading(false);
      }
    };
    load();
  }, []);

  const beginRun = () => {
    // Pick 3 random classes
    const pool = [...ALL_CLASSES];
    const picked = [];
    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool[idx]);
      pool.splice(idx, 1);
    }
    setOfferClasses(picked);
    setPhase('class');
  };

  const nextRound = (cls, currentRound) => {
    if (!pools) return;
    const rule = ROUND_RULES[currentRound];
    const selectedPools = pools.byClass[cls];
    const neutralPools = pools.byNeutral['Neutral'];
    const exclude = new Set();

    function pickFrom(pMap, rarityList, count) {
      const merged = rarityList.flatMap(r => pMap[r]);
      const result = randomSample(merged, count, exclude);
      if (result) result.forEach(c => exclude.add(c._id));
      return result;
    }

    function ensurePairFrom(pMap, r1, r2) {
      const a = pickFrom(pMap, Array.isArray(r1) ? r1 : [r1], 1);
      const b = pickFrom(pMap, Array.isArray(r2) ? r2 : [r2], 1);
      if (!a || !b) return null;
      return [a[0], b[0]];
    }

    let left = null;
    let right = null;

    switch (rule.spec) {
      case 'two_bronze': {
        left = ensurePairFrom(selectedPools, 'Bronze', 'Bronze');
        right = ensurePairFrom(selectedPools, 'Bronze', 'Bronze');
        break;
      }
      case 'two_silver': {
        left = ensurePairFrom(selectedPools, 'Silver', 'Silver');
        right = ensurePairFrom(selectedPools, 'Silver', 'Silver');
        break;
      }
      case 'goldLegendary_at_least_one_legendary': {
        const firstPair = ensurePairFrom(selectedPools, ['Gold', 'Legendary'], ['Gold', 'Legendary']);
        if (!firstPair) break;
        const hasLegendaryFirst = firstPair.some(c => c.rarity === 'Legendary');
        left = firstPair;
        if (!hasLegendaryFirst) {
          const leg = pickFrom(selectedPools, ['Legendary'], 1);
          const other = pickFrom(selectedPools, ['Gold', 'Legendary'], 1);
          if (leg && other) right = [leg[0], other[0]];
        } else {
          right = ensurePairFrom(selectedPools, ['Gold', 'Legendary'], ['Gold', 'Legendary']);
        }
        break;
      }
      case 'goldLegendary_with_one_neutral_legendary': {
        const neuLegend = pickFrom(neutralPools, ['Legendary'], 1);
        if (!neuLegend) break;
        const selGold = pickFrom(selectedPools, ['Gold'], 1);
        if (!selGold) break;
        left = [neuLegend[0], selGold[0]];
        // Weighted distribution for the non-neutral pair (Round 1):
        // 70% Gold+Gold, 20% Gold+Legendary, 10% Legendary+Legendary
        const roll = Math.random();
        const tryGoldGold = () => ensurePairFrom(selectedPools, 'Gold', 'Gold');
        const tryGoldLegend = () => ensurePairFrom(selectedPools, 'Gold', 'Legendary');
        const tryLegendLegend = () => ensurePairFrom(selectedPools, 'Legendary', 'Legendary');

        if (roll < 0.7) {
          right = tryGoldGold() || tryGoldLegend() || tryLegendLegend();
        } else if (roll < 0.9) {
          right = tryGoldLegend() || tryGoldGold() || tryLegendLegend();
        } else {
          right = tryLegendLegend() || tryGoldLegend() || tryGoldGold();
        }
        break;
      }
      case 'neutral_mixed_low_high': {
        const firstIsLow = Math.random() < 0.5;
        if (firstIsLow) {
          const lowLeft = Math.random() < 0.5
            ? ensurePairFrom(neutralPools, 'Bronze', 'Silver')
            : ensurePairFrom(neutralPools, 'Silver', 'Silver');
          left = lowLeft;
          const highRight = ensurePairFrom(neutralPools, 'Gold', ['Bronze', 'Silver']);
          right = highRight;
        } else {
          const highLeft = ensurePairFrom(neutralPools, 'Gold', ['Bronze', 'Silver']);
          left = highLeft;
          const lowRight = Math.random() < 0.5
            ? ensurePairFrom(neutralPools, 'Bronze', 'Silver')
            : ensurePairFrom(neutralPools, 'Silver', 'Silver');
          right = lowRight;
        }
        break;
      }
      case 'neutral_bronze_silver_both_pairs': {
        left = ensurePairFrom(neutralPools, 'Bronze', 'Silver');
        right = ensurePairFrom(neutralPools, 'Bronze', 'Silver');
        break;
      }
      default: {
        left = ensurePairFrom(selectedPools, 'Bronze', 'Bronze');
        right = ensurePairFrom(selectedPools, 'Bronze', 'Bronze');
      }
    }

    if (!left || !right) {
      const fallbackLeft = ensurePairFrom(selectedPools, 'Bronze', 'Bronze');
      const fallbackRight = ensurePairFrom(selectedPools, 'Bronze', 'Bronze');
      setPairLeft(fallbackLeft || []);
      setPairRight(fallbackRight || []);
    } else {
      setPairLeft(left);
      setPairRight(right);
    }
  };

  const onSelectClass = (cls) => {
    setSelectedClass(cls);
    setPhase('draft');
    setDeck([]);
    setRoundIndex(0);
    nextRound(cls, 0);
  };

  const addPairToDeck = (side) => {
    const pair = side === 'left' ? pairLeft : pairRight;
    if (!pair || pair.length !== 2) return;
    setDeck(prev => [...prev, pair[0], pair[1]]);
    const next = roundIndex + 1;
    if (next >= ROUND_RULES.length) {
      setPhase('complete');
    } else {
      setRoundIndex(next);
      nextRound(selectedClass, next);
    }
  };

  const getManaCurve = () => {
    const curve = Array(9).fill(0);
    deck.forEach(card => {
      const cost = Math.min(card.cost || 0, 8);
      curve[cost]++;
    });
    return curve;
  };

  const groupedDeck = useMemo(() => {
    const grouped = {};
    deck.forEach(c => {
      if (!grouped[c._id]) grouped[c._id] = { card: c, count: 1 };
      else grouped[c._id].count++;
    });
    return Object.values(grouped).sort((a, b) => {
      if (a.card.cost !== b.card.cost) return a.card.cost - b.card.cost;
      return a.card.title.localeCompare(b.card.title);
    });
  }, [deck]);

  const exportDeckImage = async () => {
    // Mirror DeckBuilder's "Export TTS Deck Image" behavior but for 30 cards
    if (!deckRef.current) return;

    if (deck.length !== 30) {
      alert('A deck must have exactly 30 cards to export.');
      return;
    }

    try {
      // Create a canvas with 10 columns x 3 rows, each 566x751 like TTS export
      const canvas = document.createElement('canvas');
      canvas.width = 5660; // 10 * 566
      canvas.height = 2253; // 3 * 751
      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const loadImage = (url) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
          img.src = url;
        });
      };

      for (let i = 0; i < deck.length; i++) {
        const card = deck[i];
        const row = Math.floor(i / 10);
        const col = i % 10;
        try {
          const img = await loadImage(card.imageUrl);
          ctx.drawImage(img, col * 566, row * 751, 566, 751);
        } catch (err) {
          console.error(`Failed to load card image: ${card.title}`, err);
          throw new Error(`Failed to load card image: ${card.title}`);
        }
      }

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${selectedClass || 'Deck'}_TakeTwo_TTS.png`;
      link.click();
    } catch (err) {
      console.error('Error exporting TTS deck:', err);
      alert('Failed to export deck for TTS. Please try again.');
    }
  };

  const handleCardDetailView = (card, e) => {
    e.preventDefault();
    e.stopPropagation();
    const cardData = { ...card };
    if (cardData.relatedCards && Array.isArray(cardData.relatedCards)) {
      cardData.relatedCards = sortCards(cardData.relatedCards);
    }
    setSelectedCardDetails(cardData);
  };

  const handleDetailClose = () => setSelectedCardDetails(null);
  const handleDetailClick = (e) => e.stopPropagation();

  const onRelatedClick = async (relatedCard, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (preloadedRelatedCards[relatedCard._id]) {
        const data = { ...preloadedRelatedCards[relatedCard._id] };
        if (data.relatedCards && Array.isArray(data.relatedCards)) {
          data.relatedCards = sortCards(data.relatedCards);
        }
        setSelectedCardDetails(data);
        return;
      }
      const full = await getCard(relatedCard._id, true);
      if (full.relatedCards && Array.isArray(full.relatedCards)) full.relatedCards = sortCards(full.relatedCards);
      setPreloadedRelatedCards(prev => ({ ...prev, [relatedCard._id]: full }));
      setSelectedCardDetails(full);
    } catch {}
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="take-two-page">
      {phase === 'start' && (
        <div className="take-two-start">
          <h1>Begin Take Two Run?</h1>
          <button className="btn" onClick={beginRun}>Confirm</button>
        </div>
      )}

      {phase === 'class' && (
        <div className="take-two-class-select">
          <h2>Select a Class</h2>
          <div className="class-grid">
            {offerClasses.map(cls => (
              <div key={cls} className="class-card" onClick={() => onSelectClass(cls)}>
                <div className="class-icon">
                  <img src={CLASS_ICONS[cls]} alt={cls} />
                </div>
                <h3>{cls}</h3>
              </div>
            ))}
          </div>
        </div>
      )}

      {(phase === 'draft' || phase === 'complete') && (
        <div className="take-two-draft">
          <div className="draft-left">
            {phase === 'draft' ? (
              <>
                {/*<div className="round-header">
                  <h2>Round {roundIndex + 1} / 15</h2>
                  <div className="round-rule">
                    {ROUND_RULES[roundIndex].type === 'neutral' ? 'Neutral Picks' : `${selectedClass} Picks`}
                  </div>
                </div>*/}
                <div className="pairs">
                  <div className={`pair-block`}>
                    <div className={`pair pair-left ${hoverSide === 'left' ? 'hover-left' : ''}`}
                         onMouseEnter={() => setHoverSide('left')}
                         onMouseLeave={() => setHoverSide(null)}
                    >
                      {pairLeft.map(c => (
                        <div key={c._id} className="pair-card" onClick={(e) => handleCardDetailView(c, e)}>
                          <img src={c.imageUrl} alt={c.title} />
                        </div>
                      ))}
                    </div>
                    <div className="pair-actions under">
                      <button
                        className="btn select-left"
                        onMouseEnter={() => setHoverSide('left')}
                        onMouseLeave={() => setHoverSide(null)}
                        onClick={() => addPairToDeck('left')}
                      >
                        Select
                      </button>
                    </div>
                  </div>
                  <div className={`pair-block`}>
                    <div className={`pair pair-right ${hoverSide === 'right' ? 'hover-right' : ''}`}
                         onMouseEnter={() => setHoverSide('right')}
                         onMouseLeave={() => setHoverSide(null)}
                    >
                      {pairRight.map(c => (
                        <div key={c._id} className="pair-card" onClick={(e) => handleCardDetailView(c, e)}>
                          <img src={c.imageUrl} alt={c.title} />
                        </div>
                      ))}
                    </div>
                    <div className="pair-actions under">
                      <button
                        className="btn select-right"
                        onMouseEnter={() => setHoverSide('right')}
                        onMouseLeave={() => setHoverSide(null)}
                        onClick={() => addPairToDeck('right')}
                      >
                        Select
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="complete-header">
                <h2>Draft Complete</h2>
                <button className="btn" onClick={exportDeckImage}>Export Deck as Image</button>
              </div>
            )}
          </div>
          <div className="draft-right">
            <div className="current-deck export-view" ref={deckRef}>
              <div className="deck-header">
                <div className="deck-title-container">
                  <div className="deck-name-input read-only">{selectedClass} Take Two</div>
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
                  <div className="empty-deck"><p>No cards yet</p></div>
                ) : (
                  <div className="deck-card-list export-list">
                    {groupedDeck.map(({ card, count }) => (
                      <div key={`export-${card._id}`} className="deck-card export-card"
                           style={card.bannerImageUrl ? {
                             backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5)), url(${card.bannerImageUrl})`,
                             backgroundPosition: card.bannerImagePosition || '50% 50%',
                             backgroundSize: card.bannerImageZoom ? `${card.bannerImageZoom}%` : 'cover'
                           } : {}}
                           onClick={(e) => handleCardDetailView(card, e)}
                      >
                        <div className="export-card-count">{count}x</div>
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

          <CardDetailModal
            cardDetails={selectedCardDetails}
            handleDetailClose={handleDetailClose}
            handleDetailClick={handleDetailClick}
            handleRelatedCardClick={onRelatedClick}
            handleRelatedCardMouseEnter={(rc) => setHoveredRelatedCard(rc)}
            handleRelatedCardMouseLeave={() => setHoveredRelatedCard(null)}
            hoveredRelatedCard={hoveredRelatedCard}
            hideNotes={true}
          />
        </div>
      )}
    </div>
  );
}

export default TakeTwo;


