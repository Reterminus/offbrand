const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Card = require('../models/Card');
const { admin } = require('../middleware/auth');

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
router.get('/', async (req, res) => {
  try {
    const cards = await Card.find().sort({ createdAt: -1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET a single card - public
router.get('/:id', async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card not found' });
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
      imageUrl
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
      imageUrl: finalImageUrl
    };
    
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
      imageUrl
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

    console.log('Update data being applied:', updateData);
    
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