const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chatController');
const { chatLimiter } = require('../middleware/rateLimiter');

// Apply chat-specific rate limiting
router.use(chatLimiter);

// Send chat message
router.post('/', ChatController.sendMessage);

// Get chat history for a document
router.get('/document/:documentId', ChatController.getChatHistory);

// Delete specific chat
router.delete('/:id', ChatController.deleteChat);

module.exports = router;