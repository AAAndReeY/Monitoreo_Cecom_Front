import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MonitorPlay, Video, Search, X, Shield, ChevronRight, LayoutGrid, XCircle } from 'lucide-react';
import JSMpegPlayer from './JSMpegPlayer';
import Playback from './Playback';

/* ── GRID LAYOUT CALCULATOR ──────────────────────── */
function gridStyle(n) {
  // 1-2 cámaras: sin filas fijas, el aspect-ratio 16:9 controla la altura
  if (n <= 1) return { gridTemplateColumns: '1fr',            alignContent: 'center' };
  if (n === 2) return { gridTemplateColumns: '1fr 1fr',       alignContent: 'center' };
  // 3+ cámaras: grilla fija que llena la pantalla
  if (n === 3) return { gridTemplateColumns: '1fr 1fr',       gridTemplateRows: '1fr 1fr' };
  if (n === 4) return { gridTemplateColumns: '1fr 1fr',       gridTemplateRows: '1fr 1fr' };
  if (n <= 6)  return { gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: '1fr 1fr' };
  return              { gridTemplateColumns: 'repeat(4,1fr)', gridTemplateRows: '1fr 1fr' };
}

/* ── MAIN MENU ───────────────────────────────────── */
function MainMenu({ setView }) {
  return (
    <div className="menu-screen">
      <div className="menu-wrap">

        <header className="menu-header">
          <div className="menu-badge">
            <Shield size={11} />
            CECOM · San Juan de Lurigancho
          </div>
          <h1 className="menu-title">HikViewer <em>Pro</em></h1>
          <p className="menu-desc">Plataforma centralizada de videovigilancia municipal</p>
        </header>

        <div className="menu-cards">
          <button className="mcard mcard--accent" onClick={() => setView('monitoring')}>
            <div className="mcard-icon">
              <LayoutGrid size={26} />
            </div>
            <div className="mcard-body">
              <span className="mcard-title">Centro de Monitoreo</span>
              <span className="mcard-desc">Vista en vivo · hasta 8 cámaras simultáneas</span>
            </div>
            <ChevronRight size={16} className="mcard-arrow" />
          </button>

          <button className="mcard" onClick={() => setView('playback')}>
            <div className="mcard-icon mcard-icon--dim">
              <Video size={26} />
            </div>
            <div className="mcard-body">
              <span className="mcard-title">Visor de Grabaciones</span>
              <span className="mcard-desc">Reproducción por fecha y hora · playback NVR</span>
            </div>
            <ChevronRight size={16} className="mcard-arrow" />
          </button>
        </div>

      </div>
    </div>
  );
}

/* ── HELPERS ─────────────────────────────────────── */
const makeKey  = (camId, channel) => `${camId}:${channel}`;
const parseKey = (key) => {
  const i = key.lastIndexOf(':');
  return { camId: key.slice(0, i), channel: parseInt(key.slice(i + 1)) };
};

/* ── CAMERA ROW ──────────────────────────────────── */
function CamRow({ cam, activeKeys, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const isMulti   = cam.channels && cam.channels.length > 1;
  const anyActive = (cam.channels || []).some(ch => activeKeys.includes(makeKey(cam.id, ch)));

  const handleClick = () => {
    if (isMulti) {
      setExpanded(e => !e);
    } else {
      onToggle(makeKey(cam.id, (cam.channels || [102])[0]));
    }
  };

  return (
    <div className="cam-entry">
      <button
        className={`cam-row${anyActive ? ' cam-row--on' : ''}`}
        onClick={handleClick}
        title={cam.name}
      >
        <span className={`led${anyActive ? ' led--on' : ''}`} />
        <span className="cam-label">{cam.name}</span>
        {isMulti && (
          <ChevronRight size={10} className={`acc-arrow cam-expand-arrow${expanded ? ' acc-arrow--open' : ''}`} />
        )}
      </button>
      {expanded && isMulti && (
        <div className="lens-picker">
          {cam.channels.map((ch, i) => {
            const key = makeKey(cam.id, ch);
            const isOn = activeKeys.includes(key);
            return (
              <button
                key={ch}
                className={`lens-btn${isOn ? ' lens-btn--on' : ''}`}
                onClick={() => onToggle(key)}
                title={`Vista ${i + 1} (canal ${ch})`}
              >
                Vista {i + 1}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── MACRO ZONE → ZONE → CAMERAS ────────────────── */
const MACRO_ZONES = [
  { key: 'ZONA NORTE',  zones: ['10 DE OCTUBRE', 'BAYOVAR', 'MARISCAL CACERES'] },
  { key: 'ZONA CENTRO', zones: ['CANTO REY', 'SANTA ELIZABETH'] },
  { key: 'ZONA SUR',    zones: ['ZARATE', 'CAJA DE AGUA', 'LA HUAYRONA'] },
];

function ZoneAccordion({ grouped, activeKeys, onToggle }) {
  const [openMacros, setOpenMacros] = useState(() => new Set(MACRO_ZONES.map(m => m.key)));
  const [openZones, setOpenZones]   = useState(new Set());

  const toggleMacro = (key) => setOpenMacros(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const toggleZone = (zone) => setOpenZones(prev => {
    const next = new Set(prev);
    if (next.has(zone)) next.delete(zone); else next.add(zone);
    return next;
  });

  const camIsActive = (cam) => (cam.channels || []).some(ch => activeKeys.includes(makeKey(cam.id, ch)));

  return (
    <div>
      {MACRO_ZONES.map(({ key, zones }) => {
        const macroOpen   = openMacros.has(key);
        const macroCams   = zones.flatMap(z => grouped[z] || []);
        const macroActive = macroCams.filter(camIsActive).length;

        return (
          <div key={key} className="macro-section">
            <button className="macro-header" onClick={() => toggleMacro(key)}>
              <ChevronRight size={12} className={`acc-arrow${macroOpen ? ' acc-arrow--open' : ''}`} />
              <span className="macro-name">{key}</span>
              <span className="acc-meta">
                {macroActive > 0 && <span className="acc-live">{macroActive}</span>}
                <span className="acc-total">{macroCams.length}</span>
              </span>
            </button>

            {macroOpen && (
              <div className="macro-body">
                {zones.map(z => {
                  const cams       = grouped[z] || [];
                  const activeHere = cams.filter(camIsActive).length;
                  const isOpen     = openZones.has(z);
                  return (
                    <div key={z} className={`acc-item${isOpen ? ' acc-item--open' : ''}`}>
                      <button className="acc-trigger" onClick={() => toggleZone(z)}>
                        <ChevronRight size={11} className={`acc-arrow${isOpen ? ' acc-arrow--open' : ''}`} />
                        <span className="acc-zone">{z}</span>
                        <span className="acc-meta">
                          {activeHere > 0 && <span className="acc-live">{activeHere}</span>}
                          <span className="acc-total">{cams.length}</span>
                        </span>
                      </button>
                      {isOpen && (
                        <div className="acc-body">
                          {cams.map(cam => (
                            <CamRow key={cam.id} cam={cam} activeKeys={activeKeys} onToggle={onToggle} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── APP ─────────────────────────────────────────── */
export default function App() {
  const [view, setView]     = useState('menu');
  const [cameras, setCameras] = useState([]);
  const [active, setActive] = useState([]);
  const [ptzCam, setPtzCam] = useState(null);
  const [maxCam, setMaxCam] = useState(null);
  const [search, setSearch] = useState('');
  const MAX = 8;

  useEffect(() => {
    fetch('import.meta.env.VITE_API_URL/api/cameras')
      .then(r => r.json())
      .then(setCameras)
      .catch(console.error);
  }, []);

  const visibleCameras = useMemo(
    () => cameras.filter(c => c.zone !== 'GENERAL'),
    [cameras]
  );

  const grouped = useMemo(() => {
    return visibleCameras.reduce((acc, c) => {
      const z = c.zone || 'Sin zona';
      if (!acc[z]) acc[z] = [];
      acc[z].push(c);
      return acc;
    }, {});
  }, [visibleCameras]);

  const searchResults = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    return visibleCameras.filter(c => c.name.toLowerCase().includes(q) || c.id.includes(q));
  }, [visibleCameras, search]);

  const toggle = useCallback((key) => {
    setActive(prev => {
      if (prev.includes(key)) {
        if (ptzCam === key) setPtzCam(null);
        if (maxCam === key) setMaxCam(null);
        return prev.filter(x => x !== key);
      }
      if (prev.length >= MAX) {
        const [out, ...rest] = prev;
        if (ptzCam === out) setPtzCam(null);
        if (maxCam === out) setMaxCam(null);
        return [...rest, key];
      }
      return [...prev, key];
    });
  }, [ptzCam, maxCam]);

  const closeAll = () => {
    setActive([]);
    setPtzCam(null);
    setMaxCam(null);
  };

  const toggleMax = (key) => setMaxCam(p => p === key ? null : key);

  const getName = (key) => {
    const { camId, channel } = parseKey(key);
    const cam = cameras.find(c => c.id === camId);
    if (!cam) return camId;
    const idx = (cam.channels || []).indexOf(channel);
    return cam.name + (idx > 0 ? ` · Vista ${idx + 1}` : '');
  };

  if (view === 'menu')     return <MainMenu setView={setView} />;
  if (view === 'playback') return <Playback setView={setView} />;

  const displayCams = maxCam ? [maxCam] : active;
  const gridCount   = maxCam ? 1 : active.length;

  return (
    <div className="layout">

      {/* ── SIDEBAR ─────────────────────────── */}
      <aside className="sidebar" role="navigation" aria-label="Lista de cámaras">

        {/* Brand */}
        <div className="sb-brand">
          <div className="sb-brand-logo">
            <MonitorPlay size={16} />
          </div>
          <span className="sb-brand-name">HikViewer Pro</span>
          <button className="sb-btn-menu" onClick={() => setView('menu')}>Menú</button>
        </div>

        {/* Search */}
        <div className="sb-search">
          <label htmlFor="cam-search" className="sr-only">Buscar cámara</label>
          <Search size={13} className="sb-search-icon" aria-hidden />
          <input
            id="cam-search"
            className="sb-search-input"
            type="search"
            placeholder="Buscar cámara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoComplete="off"
          />
          {search && (
            <button className="sb-search-clear" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Cameras count */}
        <div className="sb-info">
          <span>{visibleCameras.length} cámaras · máx. 8 simultáneas</span>
          {active.length > 0 && (
            <button className="sb-close-all" onClick={closeAll} title="Cerrar todas las cámaras">
              <XCircle size={13} />
              Cerrar todo
            </button>
          )}
        </div>

        {/* Body: search results OR accordion */}
        <div className="sb-body" role="list">
          {search ? (
            <div className="sb-search-results">
              <p className="sb-results-label">{searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}</p>
              {searchResults.map(cam => (
                <CamRow key={cam.id} cam={cam} activeKeys={active} onToggle={toggle} />
              ))}
              {!searchResults.length && <p className="sb-empty">Sin resultados para "{search}"</p>}
            </div>
          ) : (
            <ZoneAccordion grouped={grouped} activeKeys={active} onToggle={toggle} />
          )}
        </div>

        {/* Footer */}
        <div className="sb-footer">
          <span className="sb-footer-title">Monitoreo de Cámaras</span>
          <span className="sb-footer-sub">San Juan de Lurigancho · CECOM</span>
        </div>

      </aside>

      {/* ── MAIN ────────────────────────────── */}
      <main className="main" role="main">

        {/* Topbar */}
        <header className="topbar">
          <h1 className="topbar-title">Centro de Monitoreo</h1>
          {active.length > 0 && (
            <div className="topbar-right">
              <span className="topbar-count">{active.length} de {MAX} cámaras</span>
              <button className="topbar-close-all" onClick={closeAll}>
                <X size={13} /> Cerrar todo
              </button>
            </div>
          )}
        </header>

        {/* Content */}
        {active.length === 0 ? (
          <div className="empty-state" role="status">
            <div className="empty-icon-wrap">
              <LayoutGrid size={36} />
            </div>
            <h2 className="empty-title">Sin cámaras activas</h2>
            <p className="empty-desc">
              Seleccioná una jurisdicción del panel y elegí una cámara para comenzar el monitoreo.
            </p>
          </div>
        ) : (
          <div
            className={`cam-grid${maxCam ? ' cam-grid--max' : ''}`}
            style={maxCam ? {} : gridStyle(gridCount)}
            data-count={maxCam ? 1 : gridCount}
            role="region"
            aria-label="Grilla de cámaras"
          >
            {displayCams.map(key => {
              const { camId, channel } = parseKey(key);
              return (
                <JSMpegPlayer
                  key={key}
                  camId={camId}
                  channel={channel}
                  title={getName(key)}
                  onClose={() => toggle(key)}
                  isSelected={ptzCam === key}
                  onSelect={() => setPtzCam(key)}
                  onDoubleClick={() => toggleMax(key)}
                />
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}
