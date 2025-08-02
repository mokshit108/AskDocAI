import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import DocumentUpload from './components/DocumentUpload';
import BasicPDFViewer from './components/BasicPDFViewer';
import ChatInterface from './components/ChatInterface';
import { documentsAPI } from './services/api';
import { Document } from './types/index';

function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentsAPI.getAll();
      // Handle both direct array response and wrapped response
      const documentsData = Array.isArray(response.data) ? response.data : response.data.data || [];
      setDocuments(documentsData);
      
      // Check if any documents are still processing and start polling for them
      documentsData.forEach(doc => {
        if (doc.status === 'processing') {
          pollDocumentStatus(doc.id);
        }
      });
      
      // If no documents, selectedDocument will remain null and upload will show
    } catch (error) {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (document: Document) => {
    if (!document || !document.id) {
      setError('Invalid document data received from server');
      return;
    }
    
    setDocuments(prev => [document, ...prev]);
    setSelectedDocument(document);
    setError(null);
    
    // Poll for document processing status in background if not ready
    if (document.status !== 'ready') {
      pollDocumentStatus(document.id);
    }
  };

  const handleUploadError = (error: string) => {
    setError(error);
  };

  // Keep track of active polling instances to prevent duplicates
  const pollingInstances = React.useRef<Set<string>>(new Set());

  const pollDocumentStatus = async (documentId: string) => {
    // Prevent multiple polling instances for the same document
    if (pollingInstances.current.has(documentId)) {
      return;
    }

    pollingInstances.current.add(documentId);
    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await documentsAPI.getById(documentId);
        // Handle both direct document response and wrapped response
        const document = response.data.data || response.data;

        // Update document in list
        setDocuments(prev => 
          prev.map(doc => doc.id === documentId ? document : doc)
        );

        // Update selected document if it's the current one
        setSelectedDocument(prev => {
          if (prev?.id === documentId) {
            return document;
          }
          return prev;
        });

        // Continue polling if still processing
        if (document.status === 'processing' && attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 3000); // Poll every 3 seconds for faster updates
        } else {
          // Remove from active polling instances
          pollingInstances.current.delete(documentId);
        }
      } catch (error) {
        // Retry polling even on error, but with longer delay
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 10000);
        } else {
          // Remove from active polling instances on max attempts reached
          pollingInstances.current.delete(documentId);
        }
      }
    };

    // Start polling immediately
    poll();
  };

  const handleDocumentSelect = (document: Document) => {
    setSelectedDocument(document);
    setCurrentPage(1);
  };

  const handleCitationClick = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    // Citation click will highlight the page in the PDF viewer (already visible on right side)
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleRetryProcessing = async () => {
    if (!selectedDocument) return;
    
    try {
      const response = await fetch(`http://localhost:5000/documents/${selectedDocument.id}/retry`, {
        method: 'POST',
      });
      
      if (response.ok) {
        // Update document status to processing
        setSelectedDocument({ ...selectedDocument, status: 'processing' });
        // Start polling for status updates
        pollDocumentStatus(selectedDocument.id);
      }
    } catch (error) {
      // Handle error silently or show user-friendly message
    }
  };





  // Show loading screen
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'rgba(180, 0, 170, 1)' }}></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show only upload screen if no document is selected
  if (!selectedDocument) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          {error && (
            <div className="mb-6 bg-white rounded-2xl shadow-lg p-6 border border-red-200">
              <div className="text-center">
                <div className="text-red-600 mb-4">
                  <FileText className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-lg font-medium">Error</p>
                </div>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    loadDocuments();
                  }}
                  className="violet-button text-white px-4 py-2 rounded-lg font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
          <DocumentUpload 
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        </div>
      </div>
    );
  }

  // Show split view with chat and PDF when document exists
  if (selectedDocument) {
    // Handle document processing error
    if (selectedDocument.status === 'error') {
      return (
        <div className="h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <FileText className="w-12 h-12 mx-auto mb-2" />
              <p className="text-lg font-medium">Processing Failed</p>
            </div>
            <p className="text-gray-600 mb-4">
              There was an error processing your document. You can try processing again or upload a new document.
            </p>
            <div className="space-x-4">
              <button
                onClick={handleRetryProcessing}
                className="violet-button text-white px-4 py-2 rounded-lg font-medium"
              >
                Retry Processing
              </button>
              <button
                onClick={() => {
                  setSelectedDocument(null);
                  setDocuments([]);
                  setError(null);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                Upload New Document
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Show processing state if document is still being processed
    if (selectedDocument.status === 'processing') {
      return (
        <div className="h-screen flex bg-white">
          {/* Chat Interface - Left Side */}
          <div className="w-1/2 border-r border-gray-200">
            <div className="relative h-full">
              {/* Processing banner */}
              <div className="bg-yellow-50 border-b border-yellow-200 p-3">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                  <span className="text-sm text-yellow-800 font-medium">Processing document...</span>
                  <span className="text-xs text-yellow-600 ml-2">AI features will be available soon</span>
                </div>
              </div>
              
              <ChatInterface
                documentId={selectedDocument.id}
                documentStatus={selectedDocument.status}
                onCitationClick={handleCitationClick}
              />
            </div>
          </div>
          
          {/* PDF Viewer - Right Side (Show immediately) */}
          <div className="w-1/2 h-full">
            <BasicPDFViewer
              documentId={selectedDocument.id}
              pdfUrl={selectedDocument.pdfUrl 
                ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${selectedDocument.pdfUrl}`
                : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/documents/pdf/${selectedDocument.id}`
              }
              targetPage={currentPage}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      );
    }

    // Show ready state - normal split view with full functionality
    if (selectedDocument.status === 'ready') {
      return (
        <div className="h-screen flex bg-white">
          {/* Chat Interface - Left Side */}
          <div className="w-1/2 border-r border-gray-200">
            <ChatInterface
              documentId={selectedDocument.id}
              documentStatus={selectedDocument.status}
              onCitationClick={handleCitationClick}
            />
          </div>
          
          {/* PDF Viewer - Right Side */}
          <div className="w-1/2 h-full">
            <BasicPDFViewer
              documentId={selectedDocument.id}
              pdfUrl={selectedDocument.pdfUrl 
                ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${selectedDocument.pdfUrl}`
                : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/documents/pdf/${selectedDocument.id}`
              }
              targetPage={currentPage}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      );
    }

    // Fallback for any other status (should handle edge cases)
    return (
      <div className="h-screen flex bg-white">
        {/* Chat Interface - Left Side */}
        <div className="w-1/2 border-r border-gray-200">
          <ChatInterface
            documentId={selectedDocument.id}
            documentStatus={selectedDocument.status}
            onCitationClick={handleCitationClick}
          />
        </div>
        
        {/* PDF Viewer - Right Side */}
        <div className="w-1/2 h-full">
          <BasicPDFViewer
            documentId={selectedDocument.id}
            pdfUrl={selectedDocument.pdfUrl 
              ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${selectedDocument.pdfUrl}`
              : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/documents/pdf/${selectedDocument.id}`
            }
            targetPage={currentPage}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    );
  }

  // Fallback - should not reach here normally
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center text-gray-500">
        <p>No document selected</p>
      </div>
    </div>
  );
}

export default App;