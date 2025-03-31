const mongoose = require('mongoose');

const CardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  cardType: {
    type: String,
    required: true,
    enum: ['Follower', 'Spell', 'Amulet'],
    default: 'Follower'
  },
  trait: {
    type: String,
    trim: true,
    default: ''
  },
  isToken: {
    type: Boolean,
    default: false
  },
  cost: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  rarity: {
    type: String,
    required: true,
    trim: true
  },
  class: {
    type: String,
    required: true,
    trim: true
  },
  keywords: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Keyword'
  }],
  referencedCards: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card'
  }],
  unevolvedAttack: {
    type: Number,
    default: 0
  },
  unevolvedDefense: {
    type: Number,
    default: 0
  },
  evolvedAttack: {
    type: Number,
    default: 0
  },
  evolvedDefense: {
    type: Number,
    default: 0
  },
  unevolvedDescription: {
    type: String,
    trim: true,
    default: ''
  },
  evolvedDescription: {
    type: String,
    trim: true,
    default: ''
  },
  spellDescription: {
    type: String,
    trim: true,
    default: ''
  },
  amuletDescription: {
    type: String,
    trim: true,
    default: ''
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  imageUrl: {
    type: String,
    required: true
  },
  creator: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Card', CardSchema); 