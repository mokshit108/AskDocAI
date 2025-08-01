# Deployment Guide - NotebookLM Clone

## Overview
This application consists of:
- **Frontend**: React application (Static Site on Render)
- **Backend**: Node.js/Express API (Web Service on Render)
- **Database**: PostgreSQL (Managed Database on Render)

## Branch Structure
- `master`: Production configuration for Render deployment
- `local-dev`: Local development configuration

## Render Deployment Steps

### 1. Prerequisites
- GitHub repository connected to Render
- Render account
- Google AI API key
- Pinecone API key

### 2. Database Setup
1. Go to Render Dashboard
2. Create a new PostgreSQL database:
   - Name: `notebooklm-db`
   - Database Name: `notebooklm`
   - User: `notebooklm_user`
   - Plan: Starter (or higher)
3. Note the connection string for later use

### 3. Backend Service Setup
1. Create a new Web Service
2. Connect your GitHub repository
3. Configure:
   - **Name**: `notebooklm-backend`
   - **Environment**: Node
   - **Branch**: `master`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Starter (or higher)

4. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=[Auto-filled from database]
   GOOGLE_API_KEY=[Your Google AI API Key]
   PINECONE_API_KEY=[Your Pinecone API Key]
   PINECONE_INDEX_NAME=vector-index
   MAX_FILE_SIZE=50000000
   UPLOAD_PATH=./uploads
   ```

### 4. Frontend Service Setup
1. Create a new Static Site
2. Connect your GitHub repository
3. Configure:
   - **Name**: `notebooklm-frontend`
   - **Branch**: `master`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/build`

4. Add Environment Variables:
   ```
   REACT_APP_API_URL=https://notebooklm-backend.onrender.com/api
   GENERATE_SOURCEMAP=false
   ```

### 5. Post-Deployment
1. Update CORS origins in backend if using custom domain
2. Test all functionality
3. Monitor logs for any issues

## Local Development

### Switch to Local Branch
```bash
git checkout local-dev
```

### Environment Setup
- Backend uses `.env` with local database configuration
- Frontend uses `.env` with `http://localhost:5000/api`

### Running Locally
```bash
# Install dependencies
npm run install-all

# Run both frontend and backend
npm run dev
```

## Environment Variables Reference

### Backend (.env for local, Render dashboard for production)
```
NODE_ENV=development|production
PORT=5000|10000
DATABASE_URL=postgresql://... (production only)
DB_HOST=localhost (local only)
DB_PORT=5432 (local only)
DB_USER=postgres (local only)
DB_NAME=dbnotebook (local only)
DB_PASS=your_password (local only)
GOOGLE_API_KEY=your_google_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=vector-index
MAX_FILE_SIZE=50000000
UPLOAD_PATH=./uploads
```

### Frontend (.env for local, Render dashboard for production)
```
REACT_APP_API_URL=http://localhost:5000/api|https://notebooklm-backend.onrender.com/api
GENERATE_SOURCEMAP=false
```

## Troubleshooting

### Common Issues
1. **Database Connection**: Ensure DATABASE_URL is properly set
2. **CORS Errors**: Check frontend URL in backend CORS configuration
3. **Build Failures**: Check Node.js version compatibility
4. **File Upload Issues**: Verify MAX_FILE_SIZE and upload path

### Logs
- Backend logs: Available in Render dashboard
- Frontend build logs: Available in Render dashboard
- Database logs: Available in database dashboard

## Security Notes
- Never commit `.env` files with real API keys
- Use Render's environment variables for sensitive data
- Enable SSL/HTTPS in production
- Regularly rotate API keys