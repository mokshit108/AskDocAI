import React from 'react';

const BasicPDFViewer = ({ documentId, pdfUrl, targetPage, onPageChange }) => {

  if (!pdfUrl) {
    return (
      <div className="pdf-viewer h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p>No PDF URL provided</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-viewer h-screen">
      <iframe
        src={pdfUrl}
        className="w-full h-full border-0"
        title="PDF Document"
      />
    </div>
  );
};

export default BasicPDFViewer;