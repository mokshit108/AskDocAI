import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
// CSS imports moved to index.css to avoid module resolution issues

// Set worker path - use unpkg for better compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

// Enable verbose logging for debugging
if (process.env.NODE_ENV === 'development') {
  pdfjs.GlobalWorkerOptions.verbosity = pdfjs.VerbosityLevel.INFOS;
}

const PDFViewer = ({ documentId, pdfUrl, targetPage, onPageChange }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  // Debug logging and URL validation
  useEffect(() => {
    console.log('PDFViewer initialized with:', { documentId, pdfUrl, targetPage });
    
    // Test PDF URL accessibility
    if (pdfUrl) {
      console.log('Testing PDF URL:', pdfUrl);
      
      fetch(pdfUrl, { method: 'HEAD' })
        .then(response => {
          console.log('PDF URL test result:', {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length')
          });
          
          if (!response.ok) {
            console.error('PDF URL is not accessible:', response.status);
            setError(`PDF URL returned ${response.status}: ${response.statusText}`);
            setLoading(false);
          }
        })
        .catch(error => {
          console.error('PDF URL test failed:', error);
          setError(`Failed to access PDF URL: ${error.message}`);
          setLoading(false);
        });
    } else {
      console.error('No PDF URL provided');
      setError('No PDF URL provided');
      setLoading(false);
    }
  }, [documentId, pdfUrl, targetPage]);

  // Handle target page changes
  useEffect(() => {
    if (targetPage && targetPage !== pageNumber) {
      setPageNumber(targetPage);
    }
  }, [targetPage, pageNumber]);

  // Reset state when document changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    setNumPages(null);
    setPageNumber(1);
  }, [documentId, pdfUrl]);

  // Add loading timeout
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        if (loading) {
          console.warn('PDF loading timeout reached');
          setError('PDF loading timeout. The document may be too large or the server is not responding.');
          setLoading(false);
        }
      }, 30000); // 30 second timeout

      return () => clearTimeout(timeout);
    }
  }, [loading]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    console.log('PDF loaded successfully with', numPages, 'pages');
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      pdfUrl
    });
    
    const errorMessage = error.message || error.toString() || 'Unknown error';
    setError(`Failed to load PDF with react-pdf: ${errorMessage}`);
    setLoading(false);
  };

  const tryIframeFallback = () => {
    console.log('Switching to iframe fallback');
    setUseIframeFallback(true);
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

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const rotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const goToPage = (page) => {
    const pageNum = parseInt(page);
    if (pageNum >= 1 && pageNum <= numPages) {
      setPageNumber(pageNum);
      onPageChange?.(pageNum);
    }
  };

  const retryLoading = () => {
    setError(null);
    setLoading(true);
    setNumPages(null);
  };

  if (loading) {
    return (
      <div className="pdf-viewer h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading PDF...</p>
          <p className="text-xs text-gray-500 mt-2">URL: {pdfUrl}</p>
        </div>
      </div>
    );
  }

  if (error && !useIframeFallback) {
    return (
      <div className="pdf-viewer h-96 flex items-center justify-center">
        <div className="text-center text-red-600 max-w-md">
          <p className="text-lg font-medium">Error Loading PDF</p>
          <p className="text-sm mb-2">{error}</p>
          <p className="text-xs text-gray-500 mb-4">URL: {pdfUrl}</p>
          <div className="space-x-2">
            <button
              onClick={retryLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={tryIframeFallback}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Try Simple View
            </button>
            <button
              onClick={() => window.open(pdfUrl, '_blank')}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Open in New Tab
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Iframe fallback view
  if (useIframeFallback) {
    return (
      <div className="pdf-viewer">
        <div className="bg-gray-100 p-3 border-b flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Simple PDF View (some features may be limited)
          </div>
          <div className="space-x-2">
            <button
              onClick={() => {
                setUseIframeFallback(false);
                setLoading(true);
                setError(null);
              }}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
            >
              Try Advanced View
            </button>
            <button
              onClick={() => window.open(pdfUrl, '_blank')}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
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
            onError={(e) => console.error('PDF iframe error:', e)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-viewer">
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
            Page 
            <input
              type="number"
              min="1"
              max={numPages}
              value={pageNumber}
              onChange={(e) => goToPage(e.target.value)}
              className="w-12 mx-1 px-1 text-center border rounded"
            />
            of {numPages}
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
          <button
            onClick={zoomOut}
            className="p-1 rounded hover:bg-gray-200"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          
          <span className="text-sm min-w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <button
            onClick={zoomIn}
            className="p-1 rounded hover:bg-gray-200"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          
          <button
            onClick={rotate}
            className="p-1 rounded hover:bg-gray-200"
          >
            <RotateCw className="h-5 w-5" />
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
            <div className="p-4 text-gray-500 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
              Loading document...
            </div>
          }
          error={<div className="p-4 text-red-500">Failed to load document</div>}
          options={{
            cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/',
            disableWorker: false,
            verbosity: 1
          }}
        >
          {numPages && (
            <Page 
              pageNumber={pageNumber} 
              scale={scale}
              rotate={rotation}
              className="shadow-lg"
              loading={
                <div className="p-2 text-gray-500 text-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mx-auto mb-1"></div>
                  Loading page {pageNumber}...
                </div>
              }
              error={<div className="p-2 text-red-500">Failed to load page {pageNumber}</div>}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          )}
        </Document>
      </div>
    </div>
  );
};

export default PDFViewer;