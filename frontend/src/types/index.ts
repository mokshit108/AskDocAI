export interface Document {
  id: string;
  originalName: string;
  filename: string;
  fileSize: number;
  totalPages: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  createdAt: string;
  updatedAt: string;
  // Optional fields that might be computed on frontend
  pdfUrl?: string;
  summary?: string;
  keyTopics?: string;
  // Backend fields that might be useful
  extractedText?: string;
  vectorized?: boolean;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  citations?: Citation[];
}

export interface Citation {
  pageNumber: number;
  text: string;
  documentId: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

// Component Props
export interface DocumentUploadProps {
  onUploadSuccess: (document: Document) => void;
  onUploadError: (error: string) => void;
}

export interface PDFViewerProps {
  documentId: string;
  pdfUrl: string;
  targetPage?: number;
  onPageChange?: (pageNumber: number) => void;
}

export interface ChatInterfaceProps {
  documentId: string;
  documentStatus?: 'uploading' | 'processing' | 'ready' | 'error';
  onCitationClick: (pageNumber: number) => void;
}