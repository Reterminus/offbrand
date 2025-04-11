const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Card = require('../models/Card');
const { admin, optionalAuth } = require('../middleware/auth');
const Set = require('../models/Set');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// GET all cards - public
router.get('/', optionalAuth, async (req, res) => {
  try {
    // Check if the user is an admin
    const isAdmin = req.user && req.user.isAdmin;
    
    // Get all cards
    const cards = await Card.find()
      .populate('keywords')
      .populate('relatedCards');
    
    // Check for query param to decide if we should filter hidden cards
    const filterHidden = req.query.filterHidden !== 'false';
    
    // If not admin AND we should filter hidden, filter out cards from hidden sets
    if (!isAdmin && filterHidden) {
      // First get all hidden sets
      const hiddenSets = await Set.find({ hidden: true });
      const hiddenSetIds = hiddenSets.map(set => set._id.toString());
      
      // For each hidden set, get its cards
      let cardsInHiddenSets = [];
      for (const setId of hiddenSetIds) {
        const hiddenSet = await Set.findById(setId);
        if (hiddenSet && hiddenSet.cards && hiddenSet.cards.length > 0) {
          cardsInHiddenSets = [...cardsInHiddenSets, ...hiddenSet.cards.map(id => id.toString())];
        }
      }
      
      // Filter out the cards in hidden sets
      const filteredCards = cards.filter(card => !cardsInHiddenSets.includes(card._id.toString()));
      return res.json(filteredCards);
    }
    
    // If admin OR we should not filter hidden, return all cards
    res.json(cards);
  } catch (err) {
    console.error('Error fetching cards:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET a single card - public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id)
      .populate('keywords')
      .populate('relatedCards');
    
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }
    
    // Check if card belongs to a hidden set (for non-admins)
    const isAdmin = req.user && req.user.isAdmin;
    const isRelatedCardView = req.query.relatedView === 'true';
    
    if (!isAdmin && !isRelatedCardView) {
      const setsWithCard = await Set.find({ cards: card._id, hidden: true });
      if (setsWithCard.length > 0) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    
    res.json(card);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE a new card - admin only
router.post('/', admin, upload.single('image'), async (req, res) => {
  try {
    const { 
      title, 
      cardType,
      trait, 
      isToken, 
      cost,
      rarity, 
      class: cardClass, 
      unevolvedAttack,
      unevolvedDefense,
      evolvedAttack,
      evolvedDefense,
      unevolvedDescription, 
      evolvedDescription,
      spellDescription,
      amuletDescription,
      notes,
      creator,
      imageUrl,
      bannerImageUrl,
      bannerImagePosition,
      keywords,
      relatedCards
    } = req.body;
    
    let finalImageUrl = imageUrl;
    
    // If a file was uploaded, use that instead of the imageUrl
    if (req.file) {
      finalImageUrl = `${req.protocol}://${req.get('host')}/${req.file.path}`;
    }
    
    // Check if we have either a file or an imageUrl
    if (!finalImageUrl) {
      return res.status(400).json({ message: 'Either an image file or image URL is required' });
    }
    
    // Create base card object
    const cardData = {
      title,
      cardType: cardType || 'Follower',
      trait: trait || '',
      isToken: isToken === 'true',
      cost: Number(cost),
      rarity,
      class: cardClass,
      notes: notes || '',
      creator: creator || '',
      imageUrl: finalImageUrl,
      bannerImageUrl: bannerImageUrl || '',
      bannerImagePosition: bannerImagePosition || '50% 50%'
    };
    
    // Handle keywords if provided
    if (keywords) {
      try {
        cardData.keywords = JSON.parse(keywords);
      } catch (err) {
        console.error('Error parsing keywords:', err);
      }
    }
    
    // Handle related cards if provided
    if (relatedCards) {
      try {
        cardData.relatedCards = JSON.parse(relatedCards);
      } catch (err) {
        console.error('Error parsing related cards:', err);
      }
    }
    
    // Add type-specific fields
    if (cardType === 'Follower') {
      cardData.unevolvedAttack = Number(unevolvedAttack);
      cardData.unevolvedDefense = Number(unevolvedDefense);
      cardData.evolvedAttack = Number(evolvedAttack);
      cardData.evolvedDefense = Number(evolvedDefense);
      cardData.unevolvedDescription = unevolvedDescription || '';
      cardData.evolvedDescription = evolvedDescription || '';
    } else if (cardType === 'Spell') {
      cardData.spellDescription = spellDescription || '';
    } else if (cardType === 'Amulet') {
      cardData.amuletDescription = amuletDescription || '';
    }
    
    const newCard = new Card(cardData);
    
    const savedCard = await newCard.save();
    res.status(201).json(savedCard);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE a card - admin only
router.patch('/:id', admin, upload.single('image'), async (req, res) => {
  try {
    console.log('Received update request for card:', req.params.id);
    console.log('Request body:', req.body);
    
    const { 
      title, 
      cardType,
      trait, 
      isToken, 
      cost,
      rarity, 
      class: cardClass, 
      unevolvedAttack,
      unevolvedDefense,
      evolvedAttack,
      evolvedDefense,
      unevolvedDescription, 
      evolvedDescription,
      spellDescription,
      amuletDescription,
      notes,
      creator,
      imageUrl,
      bannerImageUrl,
      bannerImagePosition,
      keywords,
      relatedCards
    } = req.body;
    
    // Create base update object
    const updateData = { 
      title, 
      cardType: cardType || 'Follower',
      trait: trait || '',
      isToken: isToken === 'true',
      cost: Number(cost),
      rarity,
      class: cardClass,
      notes: notes || '',
      creator: creator || ''
    };

    // Update banner image fields if provided
    if (bannerImageUrl !== undefined) {
      updateData.bannerImageUrl = bannerImageUrl;
    }
    
    if (bannerImagePosition !== undefined) {
      updateData.bannerImagePosition = bannerImagePosition;
    }

    console.log('Update data being applied:', updateData);
    
    // Handle keywords if provided
    if (keywords) {
      try {
        updateData.keywords = JSON.parse(keywords);
      } catch (err) {
        console.error('Error parsing keywords:', err);
      }
    }
    
    // Handle related cards if provided
    if (relatedCards) {
      try {
        updateData.relatedCards = JSON.parse(relatedCards);
      } catch (err) {
        console.error('Error parsing related cards:', err);
      }
    }
    
    // Add type-specific fields
    if (cardType === 'Follower') {
      updateData.unevolvedAttack = Number(unevolvedAttack);
      updateData.unevolvedDefense = Number(unevolvedDefense);
      updateData.evolvedAttack = Number(evolvedAttack);
      updateData.evolvedDefense = Number(evolvedDefense);
      updateData.unevolvedDescription = unevolvedDescription || '';
      updateData.evolvedDescription = evolvedDescription || '';
    } else if (cardType === 'Spell') {
      updateData.spellDescription = spellDescription || '';
    } else if (cardType === 'Amulet') {
      updateData.amuletDescription = amuletDescription || '';
    }
    
    // Handle image update
    if (req.file) {
      // If a new file is uploaded
      updateData.imageUrl = `${req.protocol}://${req.get('host')}/${req.file.path}`;
      
      // Delete old image if it's a local file
      const card = await Card.findById(req.params.id);
      if (card && card.imageUrl && card.imageUrl.startsWith(req.protocol)) {
        const oldImagePath = card.imageUrl.split('/').slice(3).join('/');
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    } else if (imageUrl) {
      // If a new URL is provided
      updateData.imageUrl = imageUrl;
    }
    
    const updatedCard = await Card.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!updatedCard) {
      return res.status(404).json({ message: 'Card not found' });
    }
    
    console.log('Card updated successfully:', updatedCard);
    res.json(updatedCard);
  } catch (err) {
    console.error('Error updating card:', err);
    res.status(400).json({ message: err.message });
  }
});

// DELETE a card - admin only
router.delete('/:id', admin, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card not found' });
    
    // Delete image file if exists
    if (card.imageUrl) {
      const imagePath = card.imageUrl.split('/').slice(3).join('/');
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await Card.findByIdAndDelete(req.params.id);
    res.json({ message: 'Card deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 