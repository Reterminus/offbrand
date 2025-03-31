const mongoose = require('mongoose');

const SetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  cards: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card'
  }],
  hidden: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 9999 // High default value so new sets appear at the end
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Set', SetSchema); 