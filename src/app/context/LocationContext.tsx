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
    
    // Watch with high accuracy disabled (false) to be smooth, fast, and light on system resources.
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
        // If we already have a location, don't break permission or fail completely on a single timeout/signal failure
        setState(s => {
          if (s.position) {
            return { ...s, watching: false, error: null };
          }
          try { localStorage.removeItem(STORAGE_KEY); } catch {}
          return { ...s, error: err.message, watching: false, granted: false };
        });
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  }, [stopWatch]);

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation not supported' }));
      return;
    }

    setState(s => ({ ...s, error: null }));

    const handleSuccess = (pos: GeolocationPosition) => {
      try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
      setState(s => ({
        ...s,
        granted: true,
        position: [pos.coords.latitude, pos.coords.longitude],
        error: null,
      }));
      startWatch();
    };

    // Fast, low accuracy request first (instantly retrieves position from WiFi/Cell tower without GPS lock wait)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleSuccess(pos);
        // Follow up with high-accuracy query in background if possible, without blocking the UI
        navigator.geolocation.getCurrentPosition(
          (highPos) => {
            setState(s => ({
              ...s,
              position: [highPos.coords.latitude, highPos.coords.longitude],
            }));
          },
          () => {}, // ignore failures
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
        );
      },
      (err) => {
        // Try ultra-fast IP Lookup if geolocation fails or is disabled/delayed
        const fetchIpLocation = async () => {
          try {
            const res = await fetch('https://ipapi.co/json/');
            if (res.ok) {
              const data = await res.json();
              if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
                return [data.latitude, data.longitude] as [number, number];
              }
            }
          } catch (e) {
            console.warn('[LocationContext] IP location fallback failed:', e);
          }
          return null;
        };

        fetchIpLocation().then((ipPos) => {
          if (ipPos) {
            try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
            setState(s => ({
              ...s,
              granted: true,
              position: ipPos,
              error: null,
            }));
            startWatch();
          } else {
            setState(s => ({ ...s, error: err.message, granted: false }));
          }
        });
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
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
