import React, { useEffect, useRef, useState } from 'react';
import { CameraOff } from 'lucide-react';

const JSMpegPlayer = ({
  camId, channel, onClose, title,
  isSelected, onSelect, onDoubleClick,
  isPlayback, starttime
}) => {
  const canvasRef = useRef(null);
  const playerRef = useRef(null);
  const activeKeyRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  /* ── STREAM START / STOP ──────────────────────── */
  useEffect(() => {
    let wsPort;

    const startStream = async () => {
      try {
        const endpoint = isPlayback
          ? `/api/stream/playback/${camId}`
          : `/api/stream/start/${camId}`;

        const body = isPlayback
          ? { starttime }
          : channel ? { channel } : null;

        const res = await fetch(`http://localhost:3001${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });
        const data = await res.json();

        if (data.wsPort) {
          wsPort = data.wsPort;
          setTimeout(() => {
            if (canvasRef.current && window.JSMpeg) {
              let played = false;
              playerRef.current = new window.JSMpeg.Player(
                `ws://localhost:${wsPort}`,
                {
                  canvas: canvasRef.current,
                  autoplay: true,
                  audio: false,
                  onPlay: () => { played = true; setLoading(false); }
                }
              );
              // Para live: ocultar spinner tras 2s aunque no haya onPlay
              // Para playback: esperar más; si no arranca en 12s → error
              const timeout = isPlayback ? 12000 : 2000;
              setTimeout(() => {
                if (!played) {
                  if (isPlayback) setError(true);
                  setLoading(false);
                }
              }, timeout);
            }
          }, 500);
        } else {
          setError(true);
          setLoading(false);
        }
      } catch {
        setError(true);
        setLoading(false);
      }
    };

    startStream();

    return () => {
      if (playerRef.current) playerRef.current.destroy();
      const stopEndpoint = isPlayback
        ? `/api/stream/playback/stop/${camId}`
        : `/api/stream/stop/${camId}`;
      fetch(`http://localhost:3001${stopEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: channel ? JSON.stringify({ channel }) : undefined,
      }).catch(() => {});
    };
  }, [camId, channel, isPlayback, starttime]);

  /* ── PTZ KEYBOARD ────────────────────────────── */
  useEffect(() => {
    const ptz = (cmd) => fetch(`http://localhost:3001/api/ptz/${camId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd }),
    }).catch(() => {});

    if (!isSelected) {
      if (activeKeyRef.current) { ptz('stop'); activeKeyRef.current = null; }
      return;
    }

    const handleKeyDown = (e) => {
      if (activeKeyRef.current === e.key) return;
      const map = {
        ArrowUp: 'up', ArrowDown: 'down',
        ArrowLeft: 'left', ArrowRight: 'right',
        '+': 'zoomIn', '=': 'zoomIn',
        '-': 'zoomOut', '_': 'zoomOut',
      };
      const cmd = map[e.key];
      if (cmd) { e.preventDefault(); activeKeyRef.current = e.key; ptz(cmd); }
    };

    const handleKeyUp = (e) => {
      if (activeKeyRef.current === e.key) {
        e.preventDefault();
        activeKeyRef.current = null;
        ptz('stop');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSelected, camId]);

  /* ── RENDER ──────────────────────────────────── */
  const ptzLabel = isSelected ? 'PTZ ACTIVO · flechas para mover' : 'Doble clic para maximizar';

  return (
    <article
      className={`player-wrapper${isSelected ? ' selected-ptz' : ''}`}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      aria-label={title}
    >
      <canvas ref={canvasRef} className="player-canvas" />

      {/* Header overlay */}
      <div className="player-overlay">
        <div className="player-header">
          <div className="camera-title">
            <div className="status-dot" />
            {title}
          </div>
          <button
            className="close-btn"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            title="Cerrar cámara"
            aria-label="Cerrar cámara"
          >
            ✕
          </button>
        </div>
      </div>

      {/* PTZ / maximize hint */}
      <div className="ptz-hint">
        <span className="ptz-hint-badge">{ptzLabel}</span>
      </div>

      {/* Loading */}
      {loading && !error && (
        <div className="loading-state">
          <div className="spinner" />
          <span className="loading-text">Conectando...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="loading-state">
          <CameraOff size={28} color="var(--red)" />
          <span className="error-text">{isPlayback ? 'Sin grabación' : 'Sin señal'}</span>
        </div>
      )}
    </article>
  );
};

export default JSMpegPlayer;
