const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');
const { cosine } = require('ml-distance');

class VectorService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "embedding-001" });
    this.vectorStoragePath = process.env.VECTOR_STORAGE_PATH || './vectors';
    this.ensureVectorDirectory();
  }

  async ensureVectorDirectory() {
    try {
      await fs.mkdir(this.vectorStoragePath, { recursive: true });
    } catch (error) {
      console.error('Failed to create vector directory:', error);
    }
  }

  async createEmbedding(text) {
    try {
      // Clean and truncate text for embedding
      const cleanText = text.replace(/\s+/g, ' ').trim();
      const truncatedText = cleanText.substring(0, 20000); // Gemini embedding limit

      const result = await this.model.embedContent(truncatedText);
      return result.embedding.values;
    } catch (error) {
      console.error('Embedding creation error:', error);
      
      // Return null to indicate failure - fallback will handle this
      return null;
    }
  }

  async vectorizeDocument(documentId, pages) {
    try {
      const vectors = [];
      let successful = 0;
      let failed = 0;

      for (const page of pages) {
        if (page.text.trim().length > 0) {
          console.log(`Creating embedding for page ${page.pageNumber}...`);
          
          const embedding = await this.createEmbedding(page.text);
          
          if (embedding) {
            vectors.push({
              id: `${documentId}-page-${page.pageNumber}`,
              values: embedding,
              metadata: {
                documentId,
                pageNumber: page.pageNumber,
                text: page.text.substring(0, 2000), // Store more text for better context
                fullText: page.text
              }
            });
            successful++;
          } else {
            console.warn(`Failed to create embedding for page ${page.pageNumber}`);
            failed++;
          }

          // Add delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`Vectorization complete: ${successful} successful, ${failed} failed`);

      // Save vectors to local file only if we have at least some vectors
      if (vectors.length > 0) {
        const filePath = path.join(this.vectorStoragePath, `${documentId}.json`);
        await fs.writeFile(filePath, JSON.stringify(vectors, null, 2));
        console.log(`Saved ${vectors.length} vectors to ${filePath}`);
      } else {
        console.warn(`No vectors created for document ${documentId}`);
      }

      return vectors.length;
    } catch (error) {
      console.error('Vectorization error:', error);
      // Don't throw error - let the system continue with fallback search
      return 0;
    }
  }

  async searchSimilar(query, documentId, topK = 3) {
    try {
      console.log(`Searching vectors for document ${documentId}, query: "${query}"`);
      
      const queryEmbedding = await this.createEmbedding(query);
      
      if (!queryEmbedding) {
        console.warn('Failed to create query embedding, using fallback');
        return [];
      }
      
      // Load vectors from local file
      const filePath = path.join(this.vectorStoragePath, `${documentId}.json`);
      
      try {
        const vectorData = await fs.readFile(filePath, 'utf8');
        const vectors = JSON.parse(vectorData);

        console.log(`Found ${vectors.length} vectors in file`);

        // Calculate similarities
        const similarities = vectors.map(vector => {
          try {
            const similarity = 1 - cosine(queryEmbedding, vector.values);
            return {
              ...vector,
              score: isNaN(similarity) ? 0 : similarity
            };
          } catch (err) {
            console.warn('Error calculating similarity:', err);
            return {
              ...vector,
              score: 0
            };
          }
        });

        // Sort by similarity and return top K
        const results = similarities
          .sort((a, b) => b.score - a.score)
          .slice(0, topK);

        console.log(`Vector search returning ${results.length} results`);
        return results;

      } catch (fileError) {
        console.warn('Vector file not found, using fallback search');
        return [];
      }

    } catch (error) {
      console.error('Vector search error:', error);
      return [];
    }
  }

  async deleteDocumentVectors(documentId) {
    try {
      const filePath = path.join(this.vectorStoragePath, `${documentId}.json`);
      await fs.unlink(filePath);
      console.log(`Deleted vectors for document ${documentId}`);
    } catch (error) {
      // File might not exist, which is fine
      console.log('Vector file not found for deletion:', documentId);
    }
  }
}

module.exports = VectorService;