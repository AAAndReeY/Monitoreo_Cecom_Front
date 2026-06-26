import React, { useState, useEffect } from 'react';
import { Camera, Server, Activity, MonitorPlay, Video, LayoutGrid } from 'lucide-react';
import JSMpegPlayer from './JSMpegPlayer';
import Playback from './Playback';

function MainMenu({ setView }) {
  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', maxWidth: '600px' }}>
        <MonitorPlay size={64} color="#3b82f6" style={{ marginBottom: '20px' }} />
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>HikViewer Pro</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', fontSize: '1.1rem' }}>
          Sistema de gestión de video inteligente.
        </p>
        
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <button 
            className="menu-btn"
            onClick={() => setView('monitoring')}
            style={{ padding: '20px 40px', fontSize: '1.2rem', borderRadius: '12px', background: 'var(--accent-color)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <LayoutGrid size={32} />
            Centro de Monitoreo
          </button>
          
          <button 
            className="menu-btn"
            onClick={() => setView('playback')}
            style={{ padding: '20px 40px', fontSize: '1.2rem', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
          >
            <Video size={32} />
            Playback (Grabaciones)
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [currentView, setCurrentView] = useState('menu'); // 'menu', 'monitoring', 'playback'
  const [cameras, setCameras] = useState([]);
  const [activeCameras, setActiveCameras] = useState([]); // Array of camera IDs
  const [selectedPTZCamera, setSelectedPTZCamera] = useState(null); // The camera selected for keyboard PTZ
  const [maximizedCamera, setMaximizedCamera] = useState(null); // The camera currently maximized

  const MAX_CAMERAS = 8;

  useEffect(() => {
    // Fetch available cameras from backend
    fetch('http://localhost:3001/api/cameras')
      .then(res => res.json())
      .then(data => setCameras(data))
      .catch(err => console.error("Error fetching cameras:", err));
  }, []);

  const toggleCamera = (camId) => {
    if (activeCameras.includes(camId)) {
      setActiveCameras(activeCameras.filter(id => id !== camId));
      if (selectedPTZCamera === camId) setSelectedPTZCamera(null);
      if (maximizedCamera === camId) setMaximizedCamera(null);
    } else {
      if (activeCameras.length >= MAX_CAMERAS) {
        const removedCam = activeCameras[0];
        setActiveCameras([...activeCameras.slice(1), camId]);
        if (selectedPTZCamera === removedCam) setSelectedPTZCamera(null);
        if (maximizedCamera === removedCam) setMaximizedCamera(null);
      } else {
        setActiveCameras([...activeCameras, camId]);
      }
    }
  };

  const toggleMaximize = (camId) => {
    setMaximizedCamera(prev => prev === camId ? null : camId);
  };

  const getCameraName = (id) => {
    const cam = cameras.find(c => c.id === id);
    return cam ? cam.name : id;
  };

  if (currentView === 'menu') {
    return <MainMenu setView={setCurrentView} />;
  }

  if (currentView === 'playback') {
    return <Playback setView={setCurrentView} />;
  }

  // Monitoring View
  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar glass-panel">
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.2rem' }}><MonitorPlay size={24} color="#3b82f6" /> HikViewer Pro</h1>
          <button 
            onClick={() => setCurrentView('menu')}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
          >
            Menú
          </button>
        </div>
        
        <div className="header-stats" style={{ marginBottom: '12px' }}>
          <div className="stat-item">
            <Activity size={16} /> Activas: <strong>{activeCameras.length} / {MAX_CAMERAS}</strong>
          </div>
        </div>

        <div className="camera-list">
          {cameras.map((cam) => {
            const isActive = activeCameras.includes(cam.id);
            return (
              <div 
                key={cam.id} 
                className={`camera-item ${isActive ? 'active' : ''}`}
                onClick={() => toggleCamera(cam.id)}
              >
                <div className="camera-info">
                  <Camera size={20} className="camera-icon" />
                  <span className="camera-name">{cam.name}</span>
                </div>
                {isActive && (
                  <div className="status-dot" style={{ width: 6, height: 6 }}></div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header-bar glass-panel">
          <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Centro de Monitoreo</div>
          <div className="header-stats">
            <div className="stat-item">
              <Server size={18} /> Backend: <strong style={{ color: '#10b981' }}>Online</strong>
            </div>
          </div>
        </header>

        {activeCameras.length === 0 ? (
          <div className="glass-panel empty-state">
            <MonitorPlay size={64} className="empty-icon" />
            <h2>No hay cámaras seleccionadas</h2>
            <p>Selecciona una cámara de la lista lateral para comenzar a monitorear.</p>
          </div>
        ) : (
          <div className={`camera-grid ${maximizedCamera ? 'maximized-view' : ''}`}>
            {(maximizedCamera ? [maximizedCamera] : activeCameras).map(camId => (
              <JSMpegPlayer 
                key={camId} 
                camId={camId} 
                title={getCameraName(camId)}
                onClose={() => toggleCamera(camId)} 
                isSelected={selectedPTZCamera === camId}
                onSelect={() => setSelectedPTZCamera(camId)}
                onDoubleClick={() => toggleMaximize(camId)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
