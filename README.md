# Media Understanding Frontend Application

This is a standalone React application with AI-powered media understanding capabilities.

## Overview

The application provides an interactive frontend for media understanding tasks using modern web technologies and AI integration.

**Technology Stack:**
- **React 19** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Jotai** for state management
- **Google Gemini AI** integration
- **Perfect Freehand** for drawing interactions

## Local Development Setup

### Prerequisites
- Node.js (v18 or higher)
- Docker (optional, for containerized deployment)

### Running Locally

1. **Navigate to the application directory:**
   ```bash
   cd spatial-understanding-front
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file with your configuration:
   ```bash
   # For Service Account authentication (recommended for production)
   GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account.json
   PROJECT_ID=your-gcp-project-id
   
   # Fallback API Key for development
   GEMINI_API_KEY=your-gemini-api-key
   ```
   
   **Authentication Options:**
   - **Service Account (Production):** Place your GCP service account JSON file in the root directory
   - **API Key (Development):** Use the `GEMINI_API_KEY` for quick development setup

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Access the application:**
   Open `http://localhost:5173` in your browser

### Building for Production

```bash
npm run build
```

### Running with Docker

```bash
docker compose up --build
```

The application will be available at `http://localhost:5173`


### Google Cloud Build Command

gcloud builds submit . --config=cloudbuild-autopilot.yaml --substitutions=_GEMINI_API_KEY=$GEMINI_API_KEY