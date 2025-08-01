const Chat = require('../models/Chat');
const Document = require('../models/Document');
const AIService = require('../services/aiService');

class ChatController {
  static async sendMessage(req, res) {
    try {
      const { documentId, question } = req.body;

      console.log(`Chat request for document ${documentId}, question: "${question}"`);

      if (!documentId || !question) {
        return res.status(400).json({ 
          error: 'Document ID and question are required' 
        });
      }

      // Check if document exists and is ready
      const document = await Document.findByPk(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      console.log(`Chat request for document ${documentId}, status: ${document.status}`);

      if (document.status !== 'ready') {
        return res.status(400).json({ 
          error: 'Document is not ready for chat. Please wait for processing to complete.' 
        });
      }

      // Generate AI response
      const aiService = new AIService();
      const { answer, citations, tokensUsed } = await aiService.generateResponse(
        question, 
        documentId
      );

      console.log(`Generated response for ${documentId}: ${answer.substring(0, 100)}...`);

      // Save chat record
      const chat = await Chat.create({
        documentId,
        question,
        answer,
        citations,
        tokensUsed
      });

      res.json({
        id: chat.id,
        question: chat.question,
        answer: chat.answer,
        citations: chat.citations,
        tokensUsed: chat.tokensUsed,
        createdAt: chat.createdAt
      });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: 'Failed to process chat message' });
    }
  }

  static async getChatHistory(req, res) {
    try {
      const { documentId } = req.params;

      const chats = await Chat.findAll({
        where: { documentId },
        order: [['createdAt', 'ASC']],
        attributes: ['id', 'question', 'answer', 'citations', 'tokensUsed', 'createdAt']
      });

      res.json(chats);
    } catch (error) {
      console.error('Get chat history error:', error);
      res.status(500).json({ error: 'Failed to retrieve chat history' });
    }
  }

  static async deleteChat(req, res) {
    try {
      const { id } = req.params;
      
      const chat = await Chat.findByPk(id);
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      await chat.destroy();
      res.json({ message: 'Chat deleted successfully' });
    } catch (error) {
      console.error('Delete chat error:', error);
      res.status(500).json({ error: 'Failed to delete chat' });
    }
  }

  static async suggestQuestions(req, res) {
    try {
      const { documentId } = req.params;

      console.log(`Question suggestions request for document ${documentId}`);

      // Check if document exists and is ready
      const document = await Document.findByPk(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      if (document.status !== 'ready') {
        return res.status(400).json({ 
          error: 'Document is not ready. Please wait for processing to complete.' 
        });
      }

      // Generate question suggestions
      const aiService = new AIService();
      const { suggestions } = await aiService.generateQuestionSuggestions(documentId);

      console.log(`Generated ${suggestions.length} question suggestions for document ${documentId}`);

      res.json({ suggestions });
    } catch (error) {
      console.error('Question suggestions error:', error);
      res.status(500).json({ error: 'Failed to generate question suggestions' });
    }
  }
}

module.exports = ChatController;