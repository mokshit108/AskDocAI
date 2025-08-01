import React from 'react';
import { FileText, X } from 'lucide-react';

const DocumentReadySnackbar = ({ isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <div className="w-full p-6">
      <div 
        className="rounded-lg shadow-lg border border-gray-200 p-6"
        style={{ backgroundColor: 'rgba(240, 220, 255, 0.3)' }}
      >
        {/* Header with Icon and Title in one line */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FileText 
              className="w-9 h-9" 
              style={{ color: 'rgba(148, 0, 211, 1)' }}
            />
            <h3 
              className="font-bold text-2xl"
              style={{ color: 'rgba(148, 0, 211, 1)' }}
            >
              Your document is ready!
            </h3>
          </div>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-full hover:bg-white hover:bg-opacity-50 transition-colors"
            aria-label="Close notification"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div>
          <p 
            className="text-xl mb-4"
            style={{ color: 'rgba(148, 0, 211, 1)' }}
          >
            You can now ask questions about your document. For example:
          </p>
          <div className="space-y-2 text-left">
            <div 
              className="text-lg flex items-start"
              style={{ color: 'rgba(148, 0, 211, 1)' }}
            >
              <span className="mr-2">•</span>
              <span>"What is the main topic of this document?"</span>
            </div>
            <div 
              className="text-lg flex items-start"
              style={{ color: 'rgba(148, 0, 211, 1)' }}
            >
              <span className="mr-2">•</span>
              <span>"Can you summarize the key points?"</span>
            </div>
            <div 
              className="text-lg flex items-start"
              style={{ color: 'rgba(148, 0, 211, 1)' }}
            >
              <span className="mr-2">•</span>
              <span>"What are the conclusions or recommendations?"</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentReadySnackbar;