import { useEffect, useRef, useState, useCallback } from 'react';

const THROTTLE  = 120; // ms between repeated PTZ commands while stick is held
const AXIS_DEAD = 12;  // slightly larger dead zone to avoid jitter-induced stops
const ZOOM_DEAD = 12;
const SAFETY_MS = 10000; // stop if no HID report for 10s (device unplugged, etc.)

// DS-1005KI HID report layout (8 bytes):
// [0, 0, 0,  X,  Y,  Z, 0, 0]
//            ^3  ^4  ^5
// Signed 8-bit: 0=center, 1-127=positive, 128-255=negative (two's complement)
const s8 = (v) => v > 127 ? v - 256 : v;

function parseReport(data) {
  if (data.byteLength < 6) return null;
  return {
    x: s8(data.getUint8(3)), // pan   left(-) / right(+)
    y: s8(data.getUint8(4)), // tilt  up(-)   / down(+)
    z: s8(data.getUint8(5)), // zoom  out(-)  / in(+)
  };
}

function axisToPTZ({ x, y, z }) {
  if (Math.abs(z) > ZOOM_DEAD) return z > 0 ? 'zoomIn' : 'zoomOut';
  const ax = Math.abs(x), ay = Math.abs(y);
  if (ax < AXIS_DEAD && ay < AXIS_DEAD) return 'stop';
  if (ay >= ax) return y < 0 ? 'up' : 'down';
  return x > 0 ? 'right' : 'left';
}

export function useGamepad(camId) {
  const [device, setDevice] = useState(null);
  const deviceRef    = useRef(null);
  const lastCmd      = useRef(null);
  const holdInterval = useRef(null); // repeats active command while stick is held
  const safetyTimer  = useRef(null); // stops if HID reports stop arriving

  const send = useCallback((cmd) => {
    if (!camId) return;
    fetch(`${import.meta.env.VITE_API_URL}/api/ptz/${camId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd }),
    }).catch(() => {});
  }, [camId]);

  const stopMoving = useCallback((sendStop = true) => {
    clearInterval(holdInterval.current);
    holdInterval.current = null;
    clearTimeout(safetyTimer.current);
    if (sendStop && lastCmd.current && lastCmd.current !== 'stop') {
      send('stop');
    }
    lastCmd.current = 'stop';
  }, [send]);

  const startMoving = useCallback((cmd) => {
    clearInterval(holdInterval.current);
    lastCmd.current = cmd;
    send(cmd);
    // Keep re-sending so the camera keeps moving while the stick is held
    holdInterval.current = setInterval(() => send(cmd), THROTTLE);
  }, [send]);

  const openDevice = useCallback(async (dev) => {
    try {
      if (!dev.opened) await dev.open();
      deviceRef.current = dev;
      setDevice(dev);
    } catch (e) {
      console.error('WebHID open error:', e);
    }
  }, []);

  // First-time permission request (manual button fallback)
  const connect = useCallback(async () => {
    if (!navigator.hid) return alert('WebHID no disponible en este navegador.');
    try {
      const [dev] = await navigator.hid.requestDevice({ filters: [] });
      if (!dev) return;
      await openDevice(dev);
    } catch (e) {
      console.error('WebHID connect error:', e);
    }
  }, [openDevice]);

  const disconnect = useCallback(async () => {
    stopMoving(true);
    if (deviceRef.current?.opened) await deviceRef.current.close();
    deviceRef.current = null;
    setDevice(null);
  }, [stopMoving]);

  // Auto-connect: on mount try previously-permitted devices, then watch for plug-in
  useEffect(() => {
    if (!navigator.hid) return;

    // Devices already permitted in a previous session
    navigator.hid.getDevices().then(devices => {
      if (devices.length > 0 && !deviceRef.current) openDevice(devices[0]);
    });

    // Hot-plug: device connected while page is open
    const onConnect = ({ device: dev }) => {
      if (!deviceRef.current) openDevice(dev);
    };
    // Physical unplug
    const onDisconnect = ({ device: dev }) => {
      if (dev === deviceRef.current) {
        stopMoving(false);
        deviceRef.current = null;
        setDevice(null);
      }
    };

    navigator.hid.addEventListener('connect', onConnect);
    navigator.hid.addEventListener('disconnect', onDisconnect);
    return () => {
      navigator.hid.removeEventListener('connect', onConnect);
      navigator.hid.removeEventListener('disconnect', onDisconnect);
    };
  }, [openDevice, stopMoving]);

  useEffect(() => {
    if (!device) return;

    const onReport = ({ data }) => {
      const axes = parseReport(data);
      if (!axes || !camId) return;

      const cmd = axisToPTZ(axes);

      clearTimeout(safetyTimer.current);

      if (cmd === 'stop') {
        stopMoving(true);
      } else {
        if (cmd !== lastCmd.current) startMoving(cmd);
        safetyTimer.current = setTimeout(() => stopMoving(true), SAFETY_MS);
      }
    };

    device.addEventListener('inputreport', onReport);
    return () => {
      device.removeEventListener('inputreport', onReport);
      clearInterval(holdInterval.current);
      clearTimeout(safetyTimer.current);
    };
  }, [device, camId, startMoving, stopMoving]);

  useEffect(() => {
    if (deviceRef.current && !deviceRef.current.opened) {
      deviceRef.current.open().catch(() => {});
    }
  }, [camId]);

  return { device, connect, disconnect };
}
