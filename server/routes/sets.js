const express = require('express');
const router = express.Router();
const Set = require('../models/Set');
const Card = require('../models/Card');
const { admin } = require('../middleware/auth');

// GET all sets - public
router.get('/', async (req, res) => {
  try {
    // Check if the user is an admin
    const isAdmin = req.user && req.user.isAdmin;
    
    // Filter condition - if admin, show all sets; if not, only show non-hidden sets
    const filterCondition = isAdmin ? {} : { hidden: { $ne: true } };
    
    const sets = await Set.find(filterCondition);
    res.json(sets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET a single set with populated cards - public
router.get('/:id', async (req, res) => {
  try {
    // Check if the user is an admin
    const isAdmin = req.user && req.user.isAdmin;
    
    const set = await Set.findById(req.params.id).populate('cards');
    
    if (!set) {
      return res.status(404).json({ message: 'Set not found' });
    }
    
    // If set is hidden and user is not admin, deny access
    if (set.hidden && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(set);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE a new set - admin only
router.post('/', admin, async (req, res) => {
  try {
    const { name, description, hidden } = req.body;
    
    const newSet = new Set({
      name,
      description,
      hidden: hidden === true // Convert to boolean
    });
    
    const savedSet = await newSet.save();
    res.status(201).json(savedSet);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE a set - admin only
router.patch('/:id', admin, async (req, res) => {
  try {
    const { name, description, hidden } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (hidden !== undefined) updateData.hidden = hidden === true;
    
    const updatedSet = await Set.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );
    
    if (!updatedSet) {
      return res.status(404).json({ message: 'Set not found' });
    }
    
    res.json(updatedSet);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a set - admin only
router.delete('/:id', admin, async (req, res) => {
  try {
    const set = await Set.findById(req.params.id);
    if (!set) return res.status(404).json({ message: 'Set not found' });
    
    await Set.findByIdAndDelete(req.params.id);
    res.json({ message: 'Set deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a card to a set - admin only
router.post('/:setId/cards/:cardId', admin, async (req, res) => {
  try {
    const { setId, cardId } = req.params;
    
    // Check if set exists
    const set = await Set.findById(setId);
    if (!set) return res.status(404).json({ message: 'Set not found' });
    
    // Check if card exists
    const card = await Card.findById(cardId);
    if (!card) return res.status(404).json({ message: 'Card not found' });
    
    // Check if card is already in the set
    if (set.cards.includes(cardId)) {
      return res.status(400).json({ message: 'Card is already in the set' });
    }
    
    // Add card to set
    set.cards.push(cardId);
    await set.save();
    
    // Return updated set with populated cards
    const updatedSet = await Set.findById(setId).populate('cards');
    res.json(updatedSet);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove a card from a set - admin only
router.delete('/:setId/cards/:cardId', admin, async (req, res) => {
  try {
    const { setId, cardId } = req.params;
    
    // Check if set exists
    const set = await Set.findById(setId);
    if (!set) return res.status(404).json({ message: 'Set not found' });
    
    // Check if card is in the set
    if (!set.cards.includes(cardId)) {
      return res.status(400).json({ message: 'Card is not in the set' });
    }
    
    // Remove card from set
    set.cards = set.cards.filter(card => card.toString() !== cardId);
    await set.save();
    
    // Return updated set with populated cards
    const updatedSet = await Set.findById(setId).populate('cards');
    res.json(updatedSet);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 