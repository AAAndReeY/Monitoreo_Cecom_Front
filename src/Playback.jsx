import React, { useState, useEffect } from 'react';
import { Calendar, Play, MonitorPlay } from 'lucide-react';
import JSMpegPlayer from './JSMpegPlayer';

function Playback({ setView }) {
  const [cameras, setCameras] = useState([]);
  const [selectedCam, setSelectedCam] = useState(null);
  const [dateTime, setDateTime] = useState('');
  const [playData, setPlayData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/cameras')
      .then(res => res.json())
      .then(data => setCameras(data))
      .catch(console.error);
  }, []);

  const handlePlay = () => {
    if (!selectedCam || !dateTime) return;
    
    // Parse local datetime and convert to proper UTC for Hikvision
    const dateObj = new Date(dateTime);
    const formattedTime = dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    setPlayData({
      camId: selectedCam,
      starttime: formattedTime,
      key: Date.now() // Force re-render
    });
  };

  const getCameraName = (id) => {
    const cam = cameras.find(c => c.id === id);
    return cam ? cam.name : id;
  };

  return (
    <div className="app-container">
      <aside className="sidebar glass-panel">
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.2rem' }}><MonitorPlay size={24} color="#3b82f6" /> Playback</h1>
          <button 
            onClick={() => setView('menu')}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
          >
            Menú
          </button>
        </div>

        <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>Seleccionar Cámara</h3>
          <select 
            value={selectedCam || ''} 
            onChange={(e) => setSelectedCam(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <option value="" disabled>Elige una cámara</option>
            {cameras.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ padding: '16px 0' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>Fecha y Hora</h3>
          <input 
            type="datetime-local" 
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', colorScheme: 'dark' }}
          />
        </div>

        <button 
          onClick={handlePlay}
          disabled={!selectedCam || !dateTime}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--accent-color)', color: 'white', border: 'none', cursor: (!selectedCam || !dateTime) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px', opacity: (!selectedCam || !dateTime) ? 0.5 : 1 }}
        >
          <Play size={18} /> Buscar y Reproducir
        </button>
      </aside>

      <main className="main-content">
        <header className="header-bar glass-panel">
          <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Visor de Grabaciones</div>
        </header>

        {!playData ? (
          <div className="glass-panel empty-state">
            <Calendar size={64} className="empty-icon" />
            <h2>Selecciona los parámetros</h2>
            <p>Elige una cámara y la fecha/hora en la barra lateral para buscar la grabación.</p>
          </div>
        ) : (
          <div className="camera-grid maximized-view">
            <JSMpegPlayer 
              key={playData.key} 
              camId={playData.camId} 
              title={getCameraName(playData.camId) + " (Playback)"}
              onClose={() => setPlayData(null)}
              isPlayback={true}
              starttime={playData.starttime}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default Playback;
