# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Starting the Application
```bash
docker compose up --build
```
This starts the complete microservices stack including frontend, backend, processing worker, Kafka, MongoDB, and Segment Anything Model.

### Individual Service Development
- **Frontend**: `cd frontend && npm run dev` (Vite development server on port 5173)
- **Backend**: `cd backend && python main.py` (FastAPI server on port 8000)
- **Processing Worker**: `cd processing && python worker.py`

### Testing and Building
- **Frontend Dev**: `cd frontend && npm run dev`
- **Frontend Build**: `cd frontend && npm run build`
- **Frontend Lint**: `cd frontend && npm run lint`

### Accessing Services
- **Frontend**: http://localhost:5173 (or port specified in .env PORT variable)
- **Backend API**: http://localhost:8000 (Swagger UI at /docs)
- **MongoDB**: localhost:27017
- **Kafka**: localhost:9092

## Architecture Overview

This is a real-time camera masking application with a microservices architecture:

### Core Components
- **Frontend** (React + Vite + TypeScript): Camera access, UI controls, WebSocket streaming to/from backend
- **Backend** (FastAPI): REST API, WebSocket handling, object tracking with OpenCV, Kafka producer/consumer
- **Processing Worker** (Python): Kafka consumer for heavy AI tasks, integrates with Segment Anything Model and Vertex AI
- **Infrastructure**: Kafka (message queue), MongoDB (results storage), Zookeeper

### Data Flow
1. User captures snapshot → Frontend sends to `/api/detect` → Backend produces to Kafka `snapshot-requests`
2. Processing Worker consumes snapshot → Calls Segment Anything Model → Validates with Vertex AI → Produces to `processing-results`
3. Backend consumes results → Initializes OpenCV tracker → Switches to real-time WebSocket streaming
4. Frontend streams frames via WebSocket → Backend tracks and applies masks → Returns processed frames

### Key Technologies
- **Computer Vision**: OpenCV (CSRT tracker), Segment Anything Model (supervisely/segment-anything-2)
- **AI/ML**: Google Vertex AI Gemini for semantic validation
- **Messaging**: Apache Kafka with topics `snapshot-requests` and `processing-results`
- **Database**: MongoDB collection `processing_results`
- **Communication**: FastAPI WebSockets for real-time frame streaming

### Important Files
- **docker-compose.yml**: Complete service orchestration
- **backend/main.py**: FastAPI server with tracking logic
- **processing/worker.py**: AI processing pipeline
- **frontend/src/App.js**: React UI with camera access
- **.env**: Environment configuration (copy from .env.example)

### Configuration Requirements
- Google Cloud service account JSON key for Vertex AI access
- Environment variables: `PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`
- Kafka and MongoDB connection strings in docker-compose.yml

## Working with the Codebase

### Object Tracking Implementation
The backend uses OpenCV's CSRT tracker initialized from Segment Anything masks. Tracking state is managed in `tracking_sessions` dict with session IDs.

### Kafka Message Patterns
- Snapshot requests include imageId, base64 image data, prompt, and timestamp
- Processing results include mask coordinates, success status, and processing metadata

### WebSocket Events
- `stream_frame`: Client sends video frames for tracking
- `processed_frame`: Server returns masked frames with delay metrics
- `tracking_started`: Notifies client when object detection succeeds

### Development Notes
- The application uses base64 encoding for image transmission
- Mask formats: "grey_out" (semi-transparent overlay) or "border_highlight" (colored border)
- Processing latency is tracked and displayed in real-time
- All processing results are persisted to MongoDB for analysis