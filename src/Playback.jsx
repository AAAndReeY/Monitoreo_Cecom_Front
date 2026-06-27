import React, { useState, useEffect } from 'react';
import { MonitorPlay, Play, Calendar } from 'lucide-react';
import JSMpegPlayer from './JSMpegPlayer';

const fieldStyle = {
  display: 'block',
  fontSize: '10px',
  color: 'var(--t2)',
  marginBottom: '5px',
  textTransform: 'uppercase',
  letterSpacing: '0.055em',
  fontWeight: 600,
};

const inputStyle = {
  width: '100%',
  padding: '7px 10px',
  background: 'var(--bg)',
  border: '1px solid var(--line2)',
  borderRadius: '6px',
  color: 'var(--t1)',
  fontSize: '12px',
  fontFamily: 'inherit',
  outline: 'none',
  colorScheme: 'dark',
};

export default function Playback({ setView }) {
  const [cameras, setCameras] = useState([]);
  const [cam, setCam]         = useState('');
  const [dt, setDt]           = useState('');
  const [playData, setPlayData] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/cameras`)
      .then(r => r.json())
      .then(setCameras)
      .catch(console.error);
  }, []);

  const handlePlay = () => {
    if (!cam || !dt) return;
    const d = new Date(dt);
    const ts = d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    setPlayData({ camId: cam, starttime: ts, key: Date.now() });
  };

  const getCamName = id => cameras.find(c => c.id === id)?.name ?? id;

  return (
    <div className="layout">

      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sb-brand">
          <div className="sb-brand-logo">
            <MonitorPlay size={16} />
          </div>
          <span className="sb-brand-name">Grabaciones</span>
          <button className="sb-btn-menu" onClick={() => setView('menu')}>Menú</button>
        </div>

        <div style={{ padding: '14px 12px', borderBottom: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '13px' }}>

          <div>
            <label style={fieldStyle}>Cámara</label>
            <select
              value={cam}
              onChange={e => setCam(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="" disabled>Seleccionar cámara...</option>
              {cameras.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.zone}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={fieldStyle}>Fecha y hora</label>
            <input
              type="datetime-local"
              value={dt}
              onChange={e => setDt(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button
            onClick={handlePlay}
            disabled={!cam || !dt}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              padding: '8px',
              borderRadius: '6px',
              border: 'none',
              background: (!cam || !dt) ? 'var(--surf3)' : 'var(--cx)',
              color: (!cam || !dt) ? 'var(--t2)' : '#021018',
              fontSize: '13px',
              fontWeight: '700',
              fontFamily: 'inherit',
              cursor: (!cam || !dt) ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <Play size={14} />
            Reproducir
          </button>
        </div>

        {playData && (
          <div style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--t2)', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--cx)' }}>{getCamName(playData.camId)}</span>
            <br />
            <span style={{ color: 'var(--t3)', fontSize: '10px' }}>{new Date(dt).toLocaleString('es-PE')}</span>
          </div>
        )}
      </aside>

      {/* ── MAIN ── */}
      <main className="main">
        <header className="topbar">
          <h1 className="topbar-title">Visor de Grabaciones</h1>
        </header>

        {!playData ? (
          <div className="main-empty">
            <Calendar size={40} className="empty-icon" />
            <p className="empty-title">Sin grabación seleccionada</p>
            <p className="empty-desc">Elegí una cámara y una fecha para buscar la grabación.</p>
          </div>
        ) : (
          <div className="cam-grid-max">
            <JSMpegPlayer
              key={playData.key}
              camId={playData.camId}
              title={`${getCamName(playData.camId)} · Playback`}
              onClose={() => setPlayData(null)}
              isPlayback
              starttime={playData.starttime}
            />
          </div>
        )}
      </main>
    </div>
  );
}
