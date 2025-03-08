const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Keyword = require('../models/Keyword');
const { admin } = require('../middleware/auth');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/keywords/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create a unique filename with original extension
    const fileExt = path.extname(file.originalname);
    const fileName = `keyword-${Date.now()}${fileExt}`;
    cb(null, fileName);
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

// GET all keywords - public
router.get('/', async (req, res) => {
  try {
    const keywords = await Keyword.find().sort({ title: 1 });
    res.json(keywords);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET a single keyword - public
router.get('/:id', async (req, res) => {
  try {
    const keyword = await Keyword.findById(req.params.id);
    if (!keyword) return res.status(404).json({ message: 'Keyword not found' });
    res.json(keyword);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE a new keyword - admin only
router.post('/', admin, upload.single('image'), async (req, res) => {
  try {
    const { title, description, imagePosition } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }
    
    // Ensure the image URL is properly formatted
    const imageUrl = `${req.protocol}://${req.get('host')}/${req.file.path.replace(/\\/g, '/')}`;
    
    // Check if keyword with same title already exists
    const existingKeyword = await Keyword.findOne({ title });
    if (existingKeyword) {
      return res.status(400).json({ message: 'A keyword with this title already exists' });
    }
    
    const newKeyword = new Keyword({
      title,
      description,
      imageUrl,
      imagePosition: imagePosition || 'center'
    });
    
    const savedKeyword = await newKeyword.save();
    res.status(201).json(savedKeyword);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE a keyword - admin only
router.patch('/:id', admin, upload.single('image'), async (req, res) => {
  try {
    const { title, description, imagePosition } = req.body;
    
    // Create update object
    const updateData = { 
      title, 
      description,
      imagePosition: imagePosition || undefined
    };
    
    // If a new image is uploaded, update the imageUrl
    if (req.file) {
      // Ensure the image URL is properly formatted
      const imageUrl = `${req.protocol}://${req.get('host')}/${req.file.path.replace(/\\/g, '/')}`;
      updateData.imageUrl = imageUrl;
      
      // Delete old image if exists
      const keyword = await Keyword.findById(req.params.id);
      if (keyword && keyword.imageUrl) {
        const oldImagePath = keyword.imageUrl.split('/').slice(3).join('/');
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }
    
    // Check if updating to a title that already exists (excluding this keyword)
    if (title) {
      const existingKeyword = await Keyword.findOne({ 
        title, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingKeyword) {
        return res.status(400).json({ message: 'A keyword with this title already exists' });
      }
    }
    
    const updatedKeyword = await Keyword.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!updatedKeyword) return res.status(404).json({ message: 'Keyword not found' });
    res.json(updatedKeyword);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a keyword - admin only
router.delete('/:id', admin, async (req, res) => {
  try {
    const keyword = await Keyword.findById(req.params.id);
    if (!keyword) return res.status(404).json({ message: 'Keyword not found' });
    
    // Delete image file if exists
    if (keyword.imageUrl) {
      const imagePath = keyword.imageUrl.split('/').slice(3).join('/');
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await Keyword.findByIdAndDelete(req.params.id);
    res.json({ message: 'Keyword deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 