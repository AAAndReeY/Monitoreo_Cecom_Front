import React, { useEffect, useRef, useState } from 'react';
import { CameraOff, Loader } from 'lucide-react';

const JSMpegPlayer = ({ camId, onClose, title, isSelected, onSelect, onDoubleClick, isPlayback, starttime }) => {
  const canvasRef = useRef(null);
  const playerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const activeKeyRef = useRef(null);

  useEffect(() => {
    let wsPort;

    // Start stream via API
    const startStream = async () => {
      try {
        const endpoint = isPlayback ? `/api/stream/playback/${camId}` : `/api/stream/start/${camId}`;
        const bodyData = isPlayback ? JSON.stringify({ starttime }) : undefined;
        
        const res = await fetch(`http://localhost:3001${endpoint}`, {
          method: 'POST',
          headers: isPlayback ? { 'Content-Type': 'application/json' } : undefined,
          body: bodyData
        });
        const data = await res.json();
        
        if (data.wsPort) {
          wsPort = data.wsPort;
          const wsUrl = `ws://localhost:${wsPort}`;
          
          setTimeout(() => {
            if (canvasRef.current && window.JSMpeg) {
              playerRef.current = new window.JSMpeg.Player(wsUrl, {
                canvas: canvasRef.current,
                autoplay: true,
                audio: false,
                onPlay: () => setLoading(false)
              });
              setTimeout(() => setLoading(false), 2000);
            }
          }, 500);
        } else {
          setError(true);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to start stream:", err);
        setError(true);
        setLoading(false);
      }
    };

    startStream();

    return () => {
      if (playerRef.current) playerRef.current.destroy();
      const stopEndpoint = isPlayback ? `/api/stream/playback/stop/${camId}` : `/api/stream/stop/${camId}`;
      fetch(`http://localhost:3001${stopEndpoint}`, { method: 'POST' }).catch(console.error);
    };
  }, [camId, isPlayback, starttime]);

  const sendPTZ = (command) => {
    fetch(`http://localhost:3001/api/ptz/${camId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    }).catch(console.error);
  };

  // Keyboard controls
  useEffect(() => {
    if (!isSelected) {
      if (activeKeyRef.current) {
        sendPTZ('stop');
        activeKeyRef.current = null;
      }
      return;
    }

    const handleKeyDown = (e) => {
      if (activeKeyRef.current === e.key) return; // Prevent repeated triggers
      
      let cmd = null;
      if (e.key === 'ArrowUp') cmd = 'up';
      else if (e.key === 'ArrowDown') cmd = 'down';
      else if (e.key === 'ArrowLeft') cmd = 'left';
      else if (e.key === 'ArrowRight') cmd = 'right';
      else if (e.key === '+' || e.key === '=') cmd = 'zoomIn';
      else if (e.key === '-' || e.key === '_') cmd = 'zoomOut';

      if (cmd) {
        e.preventDefault(); // Stop page scrolling
        activeKeyRef.current = e.key;
        sendPTZ(cmd);
      }
    };

    const handleKeyUp = (e) => {
      if (activeKeyRef.current === e.key) {
        e.preventDefault();
        activeKeyRef.current = null;
        sendPTZ('stop');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSelected, camId]);

  return (
    <div 
      className={`player-wrapper group ${isSelected ? 'selected-ptz' : ''}`}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
    >
      <canvas ref={canvasRef} className="player-canvas"></canvas>
      
      <div className="player-overlay">
        <div className="player-header">
          <div className="camera-title">
            <div className="status-dot"></div>
            {title}
          </div>
          <button className="close-btn" onClick={onClose} title="Close Camera">
            ✕
          </button>
        </div>
      </div>

      {loading && !error && (
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Connecting...</span>
        </div>
      )}

      {error && (
        <div className="loading-state">
          <CameraOff size={32} color="#ef4444" />
          <span style={{ color: '#ef4444' }}>Connection Failed</span>
        </div>
      )}
    </div>
  );
};

export default JSMpegPlayer;
