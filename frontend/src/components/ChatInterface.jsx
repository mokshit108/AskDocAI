import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Loader, User, Bot } from 'lucide-react';
import { chatAPI } from '../services/api';
import CitationButton from './CitationButton';
import DocumentReadySnackbar from './DocumentReadySnackbar';

const ChatInterface = ({ documentId, documentStatus, onCitationClick }) => {
  const [showReadySnackbar, setShowReadySnackbar] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (documentId) {
      loadChatHistory();
    }
  }, [documentId]);

  useEffect(() => {
    if (documentStatus === 'ready' && messages.length === 0) {
      setShowReadySnackbar(true);
    }
  }, [documentStatus, messages.length]);

  const loadChatHistory = async () => {
    try {
      const response = await chatAPI.getHistory(documentId);
      const history = (response.data.data || response.data).map(chat => [
        { type: 'user', content: chat.question, timestamp: chat.createdAt },
        { 
          type: 'assistant', 
          content: chat.answer, 
          citations: chat.citations,
          tokensUsed: chat.tokensUsed,
          timestamp: chat.createdAt 
        }
      ]).flat();
      setMessages(history);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;
    
    // Check if document is still processing
    if (documentStatus === 'processing') {
      const processingMessage = {
        type: 'error',
        content: 'Please wait for the document to finish processing before asking questions. You can view the PDF while processing continues.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, 
        { type: 'user', content: inputValue.trim(), timestamp: new Date().toISOString() },
        processingMessage
      ]);
      setInputValue('');
      return;
    }

    const userMessage = { 
      type: 'user', 
      content: inputValue.trim(), 
      timestamp: new Date().toISOString() 
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    setError(null);

    try {
      console.log(`Sending message to document ${documentId}:`, userMessage.content);
      console.log(`Document status:`, documentStatus);
      
      const response = await chatAPI.sendMessage(documentId, userMessage.content);
      console.log('Chat API response:', response.data);
      
      const responseData = response.data.data || response.data;
      const assistantMessage = {
        type: 'assistant',
        content: responseData.answer,
        citations: responseData.citations,
        tokensUsed: responseData.tokensUsed,
        timestamp: responseData.createdAt
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.error || 'Failed to send message');
      
      const errorMessage = {
        type: 'error',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = (message, index) => {
    const isUser = message.type === 'user';
    const isError = message.type === 'error';
    
    return (
      <div key={index} className={`chat-message ${isUser ? 'user-message' : isError ? 'bg-red-100 mr-8' : 'ai-message'}`}>
        <div className="flex items-start space-x-2">
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
            {isUser ? (
              <User className="h-5 w-5 text-blue-500" />
            ) : isError ? (
              <MessageCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Bot className="h-5 w-5" style={{ color: 'rgba(180, 0, 170, 1)' }} />
            )}
          </div>
          
          <div className="flex-1">
            <div className="prose prose-sm max-w-none">
              <p className="mb-2">{message.content}</p>
              
              {message.citations && message.citations.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  <span className="text-xs text-gray-600 mr-2">Sources:</span>
                  {message.citations.map((citation, citationIndex) => (
                    <CitationButton
                      key={citationIndex}
                      pageNumber={citation.pageNumber}
                      snippet={citation.snippet}
                      relevanceScore={citation.relevanceScore}
                      onClick={onCitationClick}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Show snackbar as full content when visible and no messages */}
      {showReadySnackbar && messages.length === 0 && !loading ? (
        <div className="flex-1 flex flex-col">
          <DocumentReadySnackbar
            isVisible={true}
            onClose={() => setShowReadySnackbar(false)}
          />
        </div>
      ) : (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !loading && documentStatus === 'processing' && (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Document is processing...</p>
                <p className="text-sm">You can view the PDF while AI features are being prepared</p>
              </div>
            )}
            
            {messages.map(renderMessage)}
            
            {loading && (
              <div className="chat-message ai-message">
                <div className="flex items-center space-x-2">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
                    <Loader className="h-4 w-4 text-white animate-spin" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-600">Thinking...</p>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Error Display */}
          {error && (
            <div className="border-t border-red-200 bg-red-50 p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </>
      )}

      {/* Input Area - Always visible */}
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={documentStatus === 'processing' 
              ? "Document is processing... Please wait to ask questions" 
              : "Ask a question about your document..."
            }
            className={`flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 ${
              documentStatus === 'processing' 
                ? 'border-yellow-300 bg-yellow-50 text-gray-500 focus:ring-yellow-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            disabled={loading || documentStatus === 'processing'}
          />
          <button
            type="submit"
            disabled={loading || !inputValue.trim() || documentStatus === 'processing'}
            className="violet-button text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;