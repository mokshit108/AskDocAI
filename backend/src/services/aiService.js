const { GoogleGenerativeAI } = require('@google/generative-ai');
const VectorService = require('./vectorService');
const Document = require('../models/Document');

class AIService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "models/gemini-pro",
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });
    this.vectorService = new VectorService();
  }

  async generateResponse(question, documentId) {
    try {
      console.log(`Generating response for document ${documentId}, question: "${question}"`);
      
      // First, try vector search
      const similarChunks = await this.vectorService.searchSimilar(question, documentId, 3);
      
      let contextText = '';
      let citations = [];

      if (similarChunks.length > 0) {
        console.log(`Using vector search results: ${similarChunks.length} chunks found`);
        
        contextText = similarChunks
          .map(chunk => `[Page ${chunk.metadata.pageNumber}]: ${chunk.metadata.text}`)
          .join('\n\n');

        // Extract citations
        citations = similarChunks.map(chunk => ({
          pageNumber: chunk.metadata.pageNumber,
          relevanceScore: chunk.score,
          snippet: chunk.metadata.text.substring(0, 200) + '...'
        }));
      } else {
        console.log('No vector results found, using fallback search');
        
        // Fallback: get document from database and use text search
        const document = await Document.findByPk(documentId);
        
        if (!document) {
          throw new Error('Document not found');
        }

        if (document.pagesData && document.pagesData.length > 0) {
          console.log(`Using database pages data: ${document.pagesData.length} pages`);
          const searchResults = this.simpleTextSearch(question, document.pagesData);
          contextText = searchResults.context;
          citations = searchResults.citations;
        } else if (document.extractedText) {
          console.log('Using extracted text for fallback search');
          // Split extracted text into rough pages
          const textChunks = this.splitTextIntoChunks(document.extractedText, document.totalPages || 1);
          const searchResults = this.simpleTextSearch(question, textChunks);
          contextText = searchResults.context;
          citations = searchResults.citations;
        } else {
          console.warn('No document content available for search');
          contextText = 'No document content available for analysis.';
        }
      }

      if (!contextText || contextText.trim() === '') {
        contextText = 'No relevant content found in the document for this question.';
      }

      console.log(`Context length: ${contextText.length} characters`);

      const systemPrompt = `You are an AI assistant that helps users understand PDF documents. 
      Answer questions based on the provided context from the document. 
      Always cite the page numbers where you found the information.
      If the information is not in the context, say so clearly.
      Keep responses concise but informative.
      Be helpful and accurate.`;

      const userPrompt = `Context from document:
${contextText}

Question: ${question}

Please provide a helpful answer based on the context above, and indicate which pages contain the relevant information. If you cannot find relevant information in the context, please say so clearly.`;

      console.log('Sending request to Gemini...');

      const result = await this.model.generateContent([
        { text: systemPrompt },
        { text: userPrompt }
      ]);

      const response = await result.response;
      const answer = response.text();

      // Estimate token usage (Gemini doesn't provide exact count)
      const estimatedTokens = Math.ceil((systemPrompt + userPrompt + answer).length / 4);

      console.log(`Response generated successfully, estimated tokens: ${estimatedTokens}`);

      return {
        answer,
        citations,
        tokensUsed: estimatedTokens
      };
    } catch (error) {
      console.error('AI response generation error:', error);
      
      // Handle rate limiting
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        return {
          answer: "I'm currently experiencing high demand. Please try again in a moment.",
          citations: [],
          tokensUsed: 0
        };
      }
      
      // Handle other API errors
      if (error.message?.includes('API')) {
        return {
          answer: "I'm having trouble connecting to the AI service. Please try again later.",
          citations: [],
          tokensUsed: 0
        };
      }
      
      // Generic fallback response
      return {
        answer: "I apologize, but I'm having trouble processing your question right now. This could be due to technical issues. Please try again in a moment, or rephrase your question.",
        citations: [],
        tokensUsed: 0
      };
    }
  }

  // Improved text-based search
  simpleTextSearch(query, pagesData, maxResults = 3) {
    console.log(`Performing text search with ${pagesData.length} pages`);
    
    const queryWords = query.toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 2)
      .filter(w => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'what', 'how', 'when', 'where', 'why', 'who'].includes(w));
    
    console.log(`Search terms: ${queryWords.join(', ')}`);
    
    const results = pagesData.map((page, index) => {
      const pageText = page.text || page.fullText || '';
      const pageWords = pageText.toLowerCase().split(/\W+/);
      
      // Calculate different types of matches
      const exactMatches = queryWords.reduce((count, word) => {
        return count + (pageWords.filter(pw => pw === word).length);
      }, 0);
      
      const partialMatches = queryWords.reduce((count, word) => {
        return count + (pageWords.filter(pw => pw.includes(word) || word.includes(pw)).length);
      }, 0);
      
      // Bonus for consecutive word matches
      let phraseBonus = 0;
      const pageTextLower = pageText.toLowerCase();
      const queryPhrase = query.toLowerCase();
      if (pageTextLower.includes(queryPhrase)) {
        phraseBonus = 5;
      }
      
      const totalScore = exactMatches * 3 + partialMatches + phraseBonus;
      
      return {
        pageNumber: page.pageNumber || index + 1,
        text: pageText,
        exactMatches,
        partialMatches,
        phraseBonus,
        relevanceScore: totalScore
      };
    }).filter(result => result.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);

    console.log(`Text search found ${results.length} relevant pages`);

    if (results.length === 0) {
      return {
        context: 'No relevant content found in the document for this question.',
        citations: []
      };
    }

    const context = results
      .map(result => `[Page ${result.pageNumber}]: ${result.text.substring(0, 800)}`)
      .join('\n\n');

    const citations = results.map(result => ({
      pageNumber: result.pageNumber,
      relevanceScore: result.relevanceScore / 10, // Normalize score
      snippet: result.text.substring(0, 200) + '...'
    }));

    return { context, citations };
  }

  // Generate question suggestions based on document content
  async generateQuestionSuggestions(documentId) {
    try {
      console.log(`Generating question suggestions for document ${documentId}`);
      
      // Get document content
      const document = await Document.findByPk(documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }

      let contextText = '';
      
      // Use pages data if available, otherwise use extracted text
      if (document.pagesData && document.pagesData.length > 0) {
        // Take first few pages for suggestions
        contextText = document.pagesData
          .slice(0, 3) // Use first 3 pages
          .map(page => page.text || page.fullText || '')
          .join('\n\n')
          .substring(0, 3000); // Limit context size
      } else if (document.extractedText) {
        contextText = document.extractedText.substring(0, 3000);
      } else {
        return { suggestions: [] };
      }

      const systemPrompt = `You are an AI assistant that generates relevant questions based on document content. 
      Generate 5 thoughtful, specific questions that would help users understand and explore the key topics in this document.
      Make the questions diverse, covering different aspects of the content.
      Return only the questions, one per line, without numbering or bullet points.`;

      const userPrompt = `Based on this document content, generate 5 relevant questions:

${contextText}

Generate questions that would help users understand the main topics, key concepts, and important details in this document.`;

      console.log('Generating question suggestions with Gemini...');

      const result = await this.model.generateContent([
        { text: systemPrompt },
        { text: userPrompt }
      ]);

      const response = await result.response;
      const suggestionsText = response.text();

      // Parse suggestions from response
      const suggestions = suggestionsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.match(/^\d+\.?\s*/)) // Remove numbered items
        .slice(0, 5); // Ensure max 5 suggestions

      console.log(`Generated ${suggestions.length} question suggestions`);

      return { suggestions };
    } catch (error) {
      console.error('Question suggestions generation error:', error);
      
      // Return fallback suggestions on error
      return {
        suggestions: [
          "What are the main topics covered in this document?",
          "Can you summarize the key points?",
          "What are the most important findings or conclusions?",
          "Are there any specific recommendations mentioned?",
          "What details should I know about this topic?"
        ]
      };
    }
  }

  // Split text into rough page chunks
  splitTextIntoChunks(text, totalPages) {
    const chunkSize = Math.ceil(text.length / totalPages);
    const chunks = [];
    
    for (let i = 0; i < totalPages; i++) {
      const start = i * chunkSize;
      const end = Math.min((i + 1) * chunkSize, text.length);
      const chunkText = text.substring(start, end);
      
      if (chunkText.trim()) {
        chunks.push({
          pageNumber: i + 1,
          text: chunkText
        });
      }
    }
    
    return chunks;
  }
}

module.exports = AIService;