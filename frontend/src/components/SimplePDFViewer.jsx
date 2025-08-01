import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

// Use a stable worker version
pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

const SimplePDFViewer = ({ documentId, pdfUrl, targetPage, onPageChange }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useIframe, setUseIframe] = useState(true); // Start with iframe by default

  console.log('SimplePDFViewer loaded with URL:', pdfUrl);
  
  // Test URL accessibility on mount
  useEffect(() => {
    if (pdfUrl) {
      console.log('Testing PDF URL accessibility:', pdfUrl);
      fetch(pdfUrl, { method: 'HEAD' })
        .then(response => {
          console.log('PDF URL test result:', {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length')
          });
          if (!response.ok) {
            console.error('PDF URL not accessible:', response.status, response.statusText);
          }
        })
        .catch(error => {
          console.error('PDF URL test failed:', error);
        });
    }
  }, [pdfUrl]);

  useEffect(() => {
    if (targetPage && targetPage !== pageNumber) {
      setPageNumber(targetPage);
    }
  }, [targetPage, pageNumber]);

  useEffect(() => {
    setError(null);
    // Keep iframe as default, don't reset to loading
  }, [pdfUrl]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    console.log('PDF loaded successfully, pages:', numPages);
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error);
    setError('Failed to load PDF with advanced viewer');
    setLoading(false);
  };

  const switchToIframe = () => {
    console.log('Switching to iframe viewer');
    setUseIframe(true);
    setError(null);
    setLoading(false);
  };

  const goToPrevPage = () => {
    if (pageNumber > 1) {
      const newPage = pageNumber - 1;
      setPageNumber(newPage);
      onPageChange?.(newPage);
    }
  };

  const goToNextPage = () => {
    if (pageNumber < numPages) {
      const newPage = pageNumber + 1;
      setPageNumber(newPage);
      onPageChange?.(newPage);
    }
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

  if (loading) {
    return (
      <div className="pdf-viewer h-96 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading PDF...</p>
          <button
            onClick={switchToIframe}
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Try Simple View
          </button>
        </div>
      </div>
    );
  }

  if (error && !useIframe) {
    return (
      <div className="pdf-viewer h-96 flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-600 max-w-md">
          <p className="text-lg font-medium">PDF Loading Issue</p>
          <p className="text-sm mb-4">{error}</p>
          <div className="space-x-2">
            <button
              onClick={switchToIframe}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Simple View
            </button>
            <button
              onClick={() => window.open(pdfUrl, '_blank')}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Open in New Tab
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (useIframe) {
    return (
      <div className="pdf-viewer border border-gray-300 rounded-lg overflow-hidden">
        <div className="bg-gray-100 p-3 border-b flex items-center justify-between">
          <div className="text-sm text-gray-600">
            PDF Document
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setUseIframe(false);
                setLoading(true);
                setError(null);
              }}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Try Advanced View
            </button>
            <button
              onClick={() => window.open(pdfUrl, '_blank')}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              Open in New Tab
            </button>
          </div>
        </div>
        <div className="h-96">
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title="PDF Document"
            onLoad={() => console.log('PDF iframe loaded successfully')}
            onError={(e) => {
              console.error('PDF iframe failed to load:', e);
              setError('Failed to load PDF in iframe');
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-viewer border border-gray-300 rounded-lg overflow-hidden">
      {/* Controls */}
      <div className="bg-gray-100 p-3 border-b flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <span className="text-sm">
            Page {pageNumber} of {numPages}
          </span>
          
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button onClick={zoomOut} className="p-1 rounded hover:bg-gray-200">
            <ZoomOut className="h-5 w-5" />
          </button>
          
          <span className="text-sm min-w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <button onClick={zoomIn} className="p-1 rounded hover:bg-gray-200">
            <ZoomIn className="h-5 w-5" />
          </button>

          <button
            onClick={switchToIframe}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          >
            Simple View
          </button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="overflow-auto h-96 bg-gray-50 flex justify-center">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p>Loading document...</p>
            </div>
          }
          options={{
            cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
            disableWorker: false
          }}
        >
          <Page 
            pageNumber={pageNumber} 
            scale={scale}
            className="shadow-lg"
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading={
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto mb-1"></div>
                <p>Loading page...</p>
              </div>
            }
          />
        </Document>
      </div>
    </div>
  );
};

export default SimplePDFViewer;