import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

// Placeholder for socket.io-client, assuming it will be used
// import io from 'socket.io-client';

// const SOCKET_SERVER_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

function App() {
  const [maskingPrompt, setMaskingPrompt] = useState("a person's face");
  const [maskFormat, setMaskFormat] = useState("grey_out");
  const [snapshotFrequency, setSnapshotFrequency] = useState(5); // seconds
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentDelay, setCurrentDelay] = useState(0);
  const [averageDelay, setAverageDelay] = useState(0);

  const rawVideoRef = useRef(null);
  const processedVideoRef = useRef(null);
  const controlVideoRef = useRef(null);
  // const socketRef = useRef(null);

  const startDetection = async () => {
    console.log("Starting detection with prompt:", maskingPrompt, "Format:", maskFormat, "Freq:", snapshotFrequency);
    setIsDetecting(true);
    // TODO: Call DELETE /api/results
    // TODO: Start camera and snapshot logic
    // TODO: Establish WebSocket connection if needed for tracking phase

    // Example: Access camera
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (rawVideoRef.current) {
          rawVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera: ", err);
        alert("Could not access camera. Please check permissions.");
        setIsDetecting(false);
      }
    }
  };

  const stopDetection = () => {
    console.log("Stopping detection.");
    setIsDetecting(false);
    // TODO: Stop camera stream, close WebSocket, clear intervals
    if (rawVideoRef.current && rawVideoRef.current.srcObject) {
      rawVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      rawVideoRef.current.srcObject = null;
    }
    // if (socketRef.current) {
    //   socketRef.current.disconnect();
    // }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Real-time Camera Masking</h1>
      </header>
      <div className="controls">
        <input type="text" value={maskingPrompt} onChange={(e) => setMaskingPrompt(e.target.value)} placeholder="Masking Target Prompt" />
        <select value={maskFormat} onChange={(e) => setMaskFormat(e.target.value)}>
          <option value="grey_out">Grey Out</option>
          <option value="border_highlight">Border Highlight</option>
        </select>
        <label>
          Snapshot Frequency (s):
          <input type="number" value={snapshotFrequency} onChange={(e) => setSnapshotFrequency(Number(e.target.value))} min="1" />
        </label>
        <button onClick={isDetecting ? stopDetection : startDetection}>
          {isDetecting ? 'Stop' : 'Start'} Detection
        </button>
      </div>
      <div className="video-views">
        <div className="video-container">
          <h2>Real-time Camera View</h2>
          <video ref={rawVideoRef} autoPlay playsInline muted width="320" height="240"></video>
        </div>
        <div className="video-container">
          <h2>Processed Video View</h2>
          <canvas ref={processedVideoRef} width="320" height="240" style={{backgroundColor: '#333'}}></canvas>
          {/* Or use an <img> if displaying Base64 strings directly */}
        </div>
        <div className="video-container">
          <h2>Control Video View</h2>
          <canvas ref={controlVideoRef} width="320" height="240" style={{backgroundColor: '#333'}}></canvas>
          {/* Or use an <img> */}
        </div>
      </div>
      <div className="metrics">
        <p>Current Delay: {currentDelay.toFixed(3)}s</p>
        <p>Average Delay: {averageDelay.toFixed(3)}s</p>
      </div>
    </div>
  );
}

export default App;