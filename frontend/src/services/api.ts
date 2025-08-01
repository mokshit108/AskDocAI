import axios, { AxiosResponse } from 'axios';
import { Document, ChatMessage, ApiResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Documents API
export const documentsAPI = {
  upload: (file: File, onProgress?: (progressEvent: any) => void): Promise<AxiosResponse<ApiResponse<Document>>> => {
    const formData = new FormData();
    formData.append('pdf', file);
    
    return api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
  },
  
  getAll: (): Promise<AxiosResponse<ApiResponse<Document[]>>> => api.get('/documents'),
  
  getById: (id: string): Promise<AxiosResponse<ApiResponse<Document>>> => api.get(`/documents/${id}`),
  
  getPDF: (id: string): Promise<AxiosResponse<Blob>> => api.get(`/documents/pdf/${id}`, {
    responseType: 'blob',
  }),
  
  delete: (id: string): Promise<AxiosResponse<ApiResponse<void>>> => api.delete(`/documents/${id}`),
};

// Chat API
export const chatAPI = {
  sendMessage: (documentId: string, question: string): Promise<AxiosResponse<ApiResponse<ChatMessage>>> =>
    api.post('/chat', { documentId, question }),
  
  getHistory: (documentId: string): Promise<AxiosResponse<ApiResponse<ChatMessage[]>>> =>
    api.get(`/chat/document/${documentId}`),
  
  deleteChat: (id: string): Promise<AxiosResponse<ApiResponse<void>>> =>
    api.delete(`/chat/${id}`),
};

export default api;