import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface LocationState {
  granted: boolean;
  position: [number, number] | null;
  error: string | null;
  watching: boolean;
}

interface LocationContextValue extends LocationState {
  requestPermission: () => void;
  revokePermission: () => void;
}

const LocationContext = createContext<LocationContextValue>({
  granted: false,
  position: null,
  error: null,
  watching: false,
  requestPermission: () => {},
  revokePermission: () => {},
});

const STORAGE_KEY = 'caredify_location_granted';

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<LocationState>({
    granted: (() => {
      try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
    })(),
    position: null,
    error: null,
    watching: false,
  });

  const watchIdRef = useRef<number | null>(null);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const startWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation not supported', granted: false }));
      return;
    }
    setState(s => ({ ...s, watching: true, error: null }));
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState(s => ({
          ...s,
          position: [pos.coords.latitude, pos.coords.longitude],
          error: null,
          watching: true,
        }));
      },
      (err) => {
        setState(s => ({ ...s, error: err.message, watching: false, granted: false }));
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        stopWatch();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [stopWatch]);

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation not supported' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
        setState(s => ({
          ...s,
          granted: true,
          position: [pos.coords.latitude, pos.coords.longitude],
          error: null,
        }));
        startWatch();
      },
      (err) => {
        setState(s => ({ ...s, error: err.message, granted: false }));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [startWatch]);

  const revokePermission = useCallback(() => {
    stopWatch();
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setState({ granted: false, position: null, error: null, watching: false });
  }, [stopWatch]);

  // Auto-start watch if permission was previously granted
  useEffect(() => {
    if (state.granted) {
      startWatch();
    }
    return stopWatch;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LocationContext.Provider value={{ ...state, requestPermission, revokePermission }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
