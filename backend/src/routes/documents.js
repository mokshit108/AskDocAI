const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const DocumentController = require('../controllers/documentController');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Upload document with rate limiting
router.post('/upload', uploadLimiter, upload.single('pdf'), DocumentController.uploadDocument);

// Get all documents
router.get('/', DocumentController.getDocuments);

// Get specific document
router.get('/:id', DocumentController.getDocument);

// Serve PDF file
router.get('/pdf/:id', DocumentController.servePDF);

// Delete document
router.delete('/:id', DocumentController.deleteDocument);

module.exports = router;