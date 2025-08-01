const Document = require('../models/Document');
const PDFService = require('../services/pdfService');
const VectorService = require('../services/vectorService');
const path = require('path');
const fs = require('fs').promises;

class DocumentController {
  static async uploadDocument(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Create document record
      const document = await Document.create({
        filename: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        status: 'processing'
      });

      // Process PDF in background
      processDocumentAsync(document.id, req.file.path);

      res.status(201).json({
        message: 'Document uploaded successfully',
        data: {
          id: document.id,
          originalName: document.originalName,
          filename: document.filename,
          fileSize: document.fileSize,
          totalPages: document.totalPages,
          status: document.status,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }

  static async getDocument(req, res) {
    try {
      const { id } = req.params;
      const document = await Document.findByPk(id);

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      res.json({ data: document });
    } catch (error) {
      console.error('Get document error:', error);
      res.status(500).json({ error: 'Failed to retrieve document' });
    }
  }

  static async getDocuments(req, res) {
    try {
      const documents = await Document.findAll({
        attributes: ['id', 'originalName', 'fileSize', 'totalPages', 'status', 'createdAt'],
        order: [['createdAt', 'DESC']]
      });

      res.json({ data: documents });
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({ error: 'Failed to retrieve documents' });
    }
  }

  static async servePDF(req, res) {
    try {
      const { id } = req.params;
      const document = await Document.findByPk(id);

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const filePath = path.resolve(document.filePath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
      
      const fileBuffer = await fs.readFile(filePath);
      res.send(fileBuffer);
    } catch (error) {
      console.error('Serve PDF error:', error);
      res.status(500).json({ error: 'Failed to serve PDF' });
    }
  }

  static async deleteDocument(req, res) {
    try {
      const { id } = req.params;
      const document = await Document.findByPk(id);

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Delete vector data
      const vectorService = new VectorService();
      await vectorService.deleteDocumentVectors(id);

      // Delete file from disk
      try {
        await fs.unlink(document.filePath);
      } catch (fileError) {
        console.warn('Failed to delete file from disk:', fileError);
      }

      // Delete from database
      await document.destroy();

      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }
}

// Updated background processing function
async function processDocumentAsync(documentId, filePath) {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const document = await Document.findByPk(documentId);
      if (!document) return;

      console.log(`Processing document ${documentId}, attempt ${retryCount + 1}`);

      // Extract text and pages
      const extractedData = await PDFService.extractText(filePath);
      const pages = await PDFService.extractTextByPage(filePath);

      console.log(`Extracted ${pages.length} pages from document ${documentId}`);

      // Update document with extracted data AND pages data
      await document.update({
        extractedText: extractedData.text,
        totalPages: extractedData.pages,
        pagesData: pages, // Store pages data for fallback search
        status: 'processing'
      });

      console.log(`Document ${documentId} data saved to database`);

      // Try to vectorize document (but don't fail if it doesn't work)
      const vectorService = new VectorService();
      
      try {
        const vectorCount = await vectorService.vectorizeDocument(documentId, pages);
        console.log(`Document ${documentId} vectorized successfully: ${vectorCount} vectors created`);
        
        await document.update({
          vectorized: vectorCount > 0,
          status: 'ready'
        });
      } catch (vectorError) {
        console.warn(`Vectorization failed for ${documentId}:`, vectorError);
        
        // Continue without vectorization - text search will be used as fallback
        await document.update({
          vectorized: false,
          status: 'ready' // Still mark as ready since we have text data
        });
      }

      console.log(`Document ${documentId} processed successfully`);
      return; // Success, exit retry loop

    } catch (error) {
      retryCount++;
      console.error(`Failed to process document ${documentId}, attempt ${retryCount}:`, error);
      
      if (retryCount >= maxRetries) {
        // Mark as error after all retries failed
        const document = await Document.findByPk(documentId);
        if (document) {
          await document.update({ status: 'error' });
        }
        return;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
    }
  }
}

module.exports = DocumentController;