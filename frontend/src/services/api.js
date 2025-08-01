import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Documents API
export const documentsAPI = {
  upload: (file, onProgress) => {
    const formData = new FormData();
    formData.append('pdf', file);
    
    return api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
  },
  
  getAll: () => api.get('/documents'),
  
  getById: (id) => api.get(`/documents/${id}`),
  
  getPDF: (id) => api.get(`/documents/${id}/pdf`, {
    responseType: 'blob',
  }),
  
  delete: (id) => api.delete(`/documents/${id}`),
};

// Chat API
export const chatAPI = {
  sendMessage: (documentId, question) =>
    api.post('/chat', { documentId, question }),
  
  getHistory: (documentId) =>
    api.get(`/chat/document/${documentId}`),
  
  deleteChat: (id) =>
    api.delete(`/chat/${id}`),
};

export default api;