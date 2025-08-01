import React from 'react';
import { ExternalLink } from 'lucide-react';

const CitationButton = ({ pageNumber, snippet, onClick, relevanceScore }) => {
  const handleClick = () => {
    onClick(pageNumber);
  };

  return (
    <button
      onClick={handleClick}
      className="citation-button group relative"
      title={`Go to page ${pageNumber}`}
    >
      <ExternalLink className="h-3 w-3 inline mr-1" />
      Page {pageNumber}
      
      {/* Tooltip */}
      {snippet && (
        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
          <div className="bg-black text-white text-xs rounded p-2 whitespace-nowrap max-w-xs">
            <div className="font-medium mb-1">Page {pageNumber}</div>
            <div className="text-gray-300 truncate">{snippet}</div>
            {relevanceScore && (
              <div className="text-gray-400 text-xs mt-1">
                Relevance: {Math.round(relevanceScore * 100)}%
              </div>
            )}
          </div>
        </div>
      )}
    </button>
  );
};

export default CitationButton;