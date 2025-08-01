const { pipeline } = require('@xenova/transformers');

class LocalEmbeddingService {
  constructor() {
    this.embedder = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  async initialize() {
    if (this.isInitialized) {
      return this.embedder;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initializeEmbedder();
    return this.initPromise;
  }

  async _initializeEmbedder() {
    try {
      console.log('Initializing local embedding model...');
      
      // Use a lightweight, fast embedding model
      // all-MiniLM-L6-v2 produces 384-dimensional embeddings
      this.embedder = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        {
          quantized: true, // Use quantized version for better performance
        }
      );
      
      this.isInitialized = true;
      console.log('✅ Local embedding model initialized successfully');
      return this.embedder;
    } catch (error) {
      console.error('❌ Failed to initialize local embedding model:', error);
      throw new Error('Failed to initialize local embedding model');
    }
  }

  async createEmbedding(text) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Clean and prepare text
      const cleanText = text.trim().substring(0, 512); // Limit to 512 chars for performance
      if (!cleanText) {
        throw new Error('Empty text provided for embedding');
      }

      console.log(`Creating embedding for text (${cleanText.length} chars)...`);
      
      // Generate embedding
      const output = await this.embedder(cleanText, {
        pooling: 'mean',
        normalize: true
      });

      // Convert to regular array
      const embedding = Array.from(output.data);
      
      console.log(`✅ Embedding created successfully (${embedding.length} dimensions)`);
      return embedding;
    } catch (error) {
      console.error('❌ Local embedding creation error:', error);
      throw new Error(`Failed to create local embedding: ${error.message}`);
    }
  }

  // Batch processing for better performance
  async createEmbeddings(texts) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const cleanTexts = texts.map(text => text.trim().substring(0, 512)).filter(text => text.length > 0);
      
      if (cleanTexts.length === 0) {
        return [];
      }

      console.log(`Creating embeddings for ${cleanTexts.length} texts...`);
      
      const embeddings = [];
      
      // Process in batches to avoid memory issues
      const batchSize = 5;
      for (let i = 0; i < cleanTexts.length; i += batchSize) {
        const batch = cleanTexts.slice(i, i + batchSize);
        
        for (const text of batch) {
          const output = await this.embedder(text, {
            pooling: 'mean',
            normalize: true
          });
          embeddings.push(Array.from(output.data));
        }
        
        // Small delay between batches to prevent overwhelming the system
        if (i + batchSize < cleanTexts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`✅ Created ${embeddings.length} embeddings successfully`);
      return embeddings;
    } catch (error) {
      console.error('❌ Batch embedding creation error:', error);
      throw new Error(`Failed to create batch embeddings: ${error.message}`);
    }
  }

  // Get model info
  getModelInfo() {
    return {
      model: 'all-MiniLM-L6-v2',
      dimensions: 384,
      maxTokens: 512,
      provider: 'local',
      quantized: true
    };
  }
}

module.exports = LocalEmbeddingService;