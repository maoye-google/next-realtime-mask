# Real-time Camera Masking Application

This project implements a real-time camera masking web application as outlined in the "Real-time Camera Masking Application: Feature & Architecture Plan".

## Overview

The application captures video from a user's USB camera, allows the user to specify a target object via a text prompt, identifies and tracks this object, and applies a visual mask (grey out or border highlight) in real-time.

It uses a microservices architecture orchestrated with Docker, comprising:
- **Frontend**: React.js application for user interaction and video display.
- **Backend**: Python (FastAPI) API for handling requests, WebSocket communication, and object tracking.
- **Processing Worker**: Python service for heavy AI/ML tasks (object detection and segmentation) via Kafka.
- **Kafka**: Message queue for decoupling services.
- **MongoDB**: Database for storing processing results.
- **Segment Anything Model**: Containerized service for image segmentation (as per plan).
- **Vertex AI**: Used for semantic understanding and mask validation.

## Local Development Setup

### Prerequisites
- Docker and Docker Compose installed.
- A `.env` file created from `.env.example` with necessary configurations (e.g., Google Cloud credentials).
  - You will need a `gcp-service-account.json` file for Vertex AI access. Place it in the root or backend/processing directories as configured in `docker-compose.yml` and `.env`.

### Running the Application

1.  **Clone the repository (if applicable).**
2.  **Create a `.env` file:**
    ```bash
    cp .env.example .env
    ```
    Update the `.env` file with your specific configurations, especially `GOOGLE_APPLICATION_CREDENTIALS` path if you place the JSON key elsewhere or name it differently.
3.  **Start all services:**
    ```bash
    docker compose up --build
    ```

### Accessing Services
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000` (e.g., `http://localhost:8000/docs` for FastAPI Swagger UI)

## Further Development

Refer to the "Real-time Camera Masking Application: Feature & Architecture Plan.txt" for detailed data flows, API schemas, and component responsibilities. Implement the TODOs in the placeholder code to build out the full functionality.