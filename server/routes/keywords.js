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
    const { title, description, imagePosition, imageZoom, imageUrl } = req.body;
    
    let finalImageUrl = imageUrl;
    
    // If a file was uploaded, use that instead of the imageUrl
    if (req.file) {
      finalImageUrl = `${req.protocol}://${req.get('host')}/${req.file.path}`;
    }
    
    // Check if we have either a file or an imageUrl
    if (!finalImageUrl) {
      return res.status(400).json({ message: 'Either an image file or image URL is required' });
    }
    
    const newKeyword = new Keyword({
      title,
      description,
      imageUrl: finalImageUrl,
      imagePosition: imagePosition || '50% 50%',
      imageZoom: Number(imageZoom) || 100
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
    const { title, description, imagePosition, imageZoom, imageUrl } = req.body;
    
    // Create base update object
    const updateData = {
      title,
      description,
      imagePosition: imagePosition || '50% 50%'
    };
    
    // Set imageZoom if provided
    if (imageZoom !== undefined) {
      updateData.imageZoom = Number(imageZoom) || 100;
    }
    
    // Handle image update
    if (req.file) {
      // If a new file is uploaded
      updateData.imageUrl = `${req.protocol}://${req.get('host')}/${req.file.path}`;
      
      // Delete old image if it's a local file
      const keyword = await Keyword.findById(req.params.id);
      if (keyword && keyword.imageUrl && keyword.imageUrl.startsWith(req.protocol)) {
        const oldImagePath = keyword.imageUrl.split('/').slice(3).join('/');
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    } else if (imageUrl) {
      // If a new URL is provided
      updateData.imageUrl = imageUrl;
    }
    
    const updatedKeyword = await Keyword.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!updatedKeyword) {
      return res.status(404).json({ message: 'Keyword not found' });
    }
    
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