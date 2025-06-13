import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

// Placeholder for socket.io-client, assuming it will be used
// import io from 'socket.io-client';

// const SOCKET_SERVER_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

function App() {
  const [maskingPrompt, setMaskingPrompt] = useState("People's Face");
  const [detectionInterval, setDetectionInterval] = useState("2 Seconds");
  const [maskingType, setMaskingType] = useState("Grey Out");
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentDelay, setCurrentDelay] = useState(0);
  const [averageDelay, setAverageDelay] = useState(0);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  const rawVideoRef = useRef(null);
  const processedVideoRef = useRef(null);
  const controlVideoRef = useRef(null);
  // const socketRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startDetection = async () => {
    console.log("Starting detection with prompt:", maskingPrompt, "Type:", maskingType, "Interval:", detectionInterval);
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

  const containerStyle = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    backgroundColor: '#dcdcf2',
    color: '#333',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    margin: 0,
    padding: 'clamp(10px, 3vw, 20px)',
    boxSizing: 'border-box'
  };

  const innerContainerStyle = {
    width: '80%',
    padding: 'clamp(20px, 5vw, 40px)',
    boxSizing: 'border-box'
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: 'clamp(20px, 5vw, 40px)'
  };

  const h1Style = {
    fontSize: 'clamp(20px, 3vw, 24px)',
    fontWeight: '600',
    color: '#000',
    margin: 0
  };

  const getMainContentStyle = () => {
    const isMobile = windowWidth < 768;
    const isTablet = windowWidth < 1024;
    
    return {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: isMobile ? '20px' : isTablet ? '20px 40px' : '20px 80px',
      alignItems: 'start'
    };
  };

  const videoPlaceholderStyle = {
    width: '100%',
    paddingTop: '56.25%', // 16:9 Aspect Ratio
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    position: 'relative'
  };

  const labelStyle = {
    fontSize: 'clamp(20px, 2vw, 14px)',
    fontWeight: '500',
    marginBottom: '8px',
    color: '#333',
    display: 'block'
  };

  const labelStyleSm = {
    fontSize: 'clamp(16px, 2vw, 16px)',
    fontWeight: '500',
    marginTop:'5px',
    marginBottom: '8px',
    color: '#333',
    display: 'block'
  };

  const startButtonStyle = {
    backgroundColor: '#333',
    color: 'white',
    border: 'none',
    padding: 'clamp(8px, 2vw, 10px) clamp(18px, 4vw, 24px)',
    borderRadius: '8px',
    fontSize: 'clamp(14px, 2.5vw, 16px)',
    fontWeight: '500',
    cursor: 'pointer',
    flex: '1'
  };

  const processDelayStyle = {
    textAlign: 'center',
    fontSize: 'clamp(12px, 2vw, 14px)',
    color: '#555',
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  };

  const bottomRowStyle = {
    display: 'flex',
    gap: 'clamp(10px, 2vw, 15px)',
    alignItems: 'stretch',
    marginTop: 'clamp(20px, 1.5vw, 12px)'
  };

  const processDelaySpanStyle = {
    fontWeight: '600',
    color: '#333',
    display: 'block'
  };

  const formGroupStyle = {
    marginBottom: 'clamp(8px, 1.5vw, 12px)'
  };

  const controlsContainerStyle = {
    height: '0',
    paddingTop: '56.25%', // Same as video placeholder (16:9 aspect ratio)
    position: 'relative',
    marginTop: 'clamp(15px, 3vw, 20px)'
  };

  const controlsInnerStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  };

  const compactFormGroupStyle = {
    marginBottom: 0
  };

  const inputStyle = {
    width: '100%',
    padding: 'clamp(8px, 2vw, 10px) clamp(10px, 2vw, 12px)',
    borderRadius: '8px',
    border: '1px solid #ccc',
    backgroundColor: '#fff',
    fontSize: 'clamp(12px, 2vw, 14px)',
    boxSizing: 'border-box'
  };

  const selectStyle = {
    ...inputStyle,
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    appearance: 'none',
    backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007AFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '10px'
  };

  const videoStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    backgroundColor: '#f5f5f5'
  };

  return (
    <div style={containerStyle}>
      <div style={innerContainerStyle}>
        <header style={headerStyle}>
          <h1 style={h1Style}>Real-time Camera Masking Demo</h1>
        </header>
        
        <div style={getMainContentStyle()}>
          <div className="left-column">
            <div className="video-section">
              <label style={labelStyle}>Live Camera Video</label>
              <div style={videoPlaceholderStyle}>
                <video 
                  ref={rawVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  style={videoStyle}
                ></video>
              </div>
            </div>
            
            <div style={controlsContainerStyle}>
              <div style={controlsInnerStyle}>
                <div style={compactFormGroupStyle}>
                  <label htmlFor="masking-target" style={labelStyleSm}>Masking Target</label>
                  <input 
                    type="text" 
                    id="masking-target" 
                    style={inputStyle}
                    value={maskingPrompt}
                    onChange={(e) => setMaskingPrompt(e.target.value)}
                  />
                </div>
                
                <div style={compactFormGroupStyle}>
                  <label htmlFor="detection-interval" style={labelStyleSm}>Detection Interval</label>
                  <select 
                    id="detection-interval" 
                    style={selectStyle}
                    value={detectionInterval}
                    onChange={(e) => setDetectionInterval(e.target.value)}
                  >
                    <option>2 Seconds</option>
                    <option>5 Seconds</option>
                    <option>10 Seconds</option>
                  </select>
                </div>
                
                <div style={compactFormGroupStyle}>
                  <label htmlFor="masking-type" style={labelStyleSm}>Masking Type</label>
                  <select 
                    id="masking-type" 
                    style={selectStyle}
                    value={maskingType}
                    onChange={(e) => setMaskingType(e.target.value)}
                  >
                    <option>Grey Out</option>
                    <option>Blur</option>
                    <option>Pixelate</option>
                  </select>
                </div>
                
                <div style={bottomRowStyle}>
                  <div style={processDelayStyle}>
                    Process Delay
                    <span style={processDelaySpanStyle}>
                      {isDetecting ? (currentDelay > 0 ? `${currentDelay.toFixed(2)} Seconds` : 'Calculating...') : 'N/A'}
                    </span>
                  </div>
                  
                  <button 
                    style={startButtonStyle}
                    onClick={isDetecting ? stopDetection : startDetection}
                  >
                    {isDetecting ? 'Stop' : 'Start'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="right-column">
            <div className="output-section">
              <label style={labelStyle}>Processed Video</label>
              <div style={videoPlaceholderStyle}>
                <canvas 
                  ref={processedVideoRef} 
                  width="320" 
                  height="240" 
                  style={videoStyle}
                ></canvas>
              </div>
            </div>
            
            <div className="raw-section" style={{marginTop: 'clamp(15px, 3vw, 20px)'}}>
              <label style={labelStyle}>Raw Video (Control)</label>
              <div style={videoPlaceholderStyle}>
                <canvas 
                  ref={controlVideoRef} 
                  width="320" 
                  height="240" 
                  style={videoStyle}
                ></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;