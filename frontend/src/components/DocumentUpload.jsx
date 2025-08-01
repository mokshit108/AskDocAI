import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle } from 'lucide-react';
import { documentsAPI } from '../services/api';

const DocumentUpload = ({ onUploadSuccess, onUploadError }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleUploadFile = async (file) => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await documentsAPI.upload(file, (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(progress);
      });

      // Show 100% completion briefly
      setUploadProgress(100);
      
      // Small delay to show completion before transitioning
      setTimeout(() => {
        // Handle both response formats for backward compatibility
        const documentData = response.data.data || response.data.document || response.data;
        onUploadSuccess(documentData);
        setSelectedFile(null);
        setUploadProgress(0);
        setUploading(false);
      }, 500); // Reduced delay to show PDF faster
      
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError(error.response?.data?.error || 'Upload failed');
      setUploading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      // Automatically start upload
      handleUploadFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const removeFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {!uploading ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <div
            {...getRootProps()}
            className={`upload-zone-custom ${isDragActive ? 'dragover' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload 
              className="w-8 h-8 mx-auto mb-4" 
              style={{ color: 'rgba(180, 0, 170, 1)' }}
            />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Upload PDF to start chatting
            </h2>
            <p className="text-sm text-gray-500">
              Click or drag and drop your file here
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">    
          
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Upload Progress</span>
              <span className="text-lg font-bold" style={{ color: 'rgba(180, 0, 170, 1)' }}>
                {uploadProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
              <div
                className="h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{ 
                  width: `${uploadProgress}%`,
                  backgroundColor: 'rgba(180, 0, 170, 1)',
                  boxShadow: uploadProgress > 0 ? '0 2px 4px rgba(180, 0, 170, 0.3)' : 'none'
                }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;