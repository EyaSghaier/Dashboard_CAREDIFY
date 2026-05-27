import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, Activity, Loader2, RefreshCw, Navigation, WifiOff, Wifi, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';

declare global {
  interface Window { L: any; }
}

// ── Types ─────────────────────────────────────────────────────────────
interface MapPatient {
  id: string;
  name: string;
  condition: string;
  riskClass: 'Critical' | 'At Risk' | 'Normal';
  aiScore: number;
  heartRate: number;
  avatar: string;
  location: [number, number];
  isRealGPS: boolean;
  isOnline: boolean;
  locationUpdatedAt: string | null;
}

interface POI {
  id: string;
  name: string;
  location: [number, number];
  type: 'hospital' | 'aed';
}

// ── Helpers ───────────────────────────────────────────────────────────
const getRiskColor = (riskClass: string, isOnline: boolean) => {
  if (!isOnline) return '#6B7280';
  if (riskClass === 'Critical') return '#EF4444';
  if (riskClass === 'At Risk')  return '#F59E0B';
  return '#10B981';
};

const getRisk = (status: string | null): 'Critical' | 'At Risk' | 'Normal' =>
  status === 'critical' ? 'Critical' : status === 'warning' ? 'At Risk' : 'Normal';

const toScore = (status: string | null): number =>
  status === 'critical' ? 85 : status === 'warning' ? 62 : 25;

const defaultCenter: [number, number] = [48.8566, 2.3522];

const disperseAroundCenter = (
  patientId: string,
  center: [number, number],
  index: number,
  total: number
): [number, number] => {
  const angle = (index / Math.max(total, 1)) * 2 * Math.PI;
  let hash = 0;
  for (let i = 0; i < patientId.length; i++) {
    hash = (hash * 31 + patientId.charCodeAt(i)) & 0xffffffff;
  }
  const radiusDeg = 0.015 + (Math.abs(hash) % 1000) / 100000;
  return [
    center[0] + radiusDeg * Math.cos(angle),
    center[1] + radiusDeg * Math.sin(angle),
  ];
};

const riskOrder = { Critical: 0, 'At Risk': 1, Normal: 2 };

// ── Component ──────────────────────────────────────────────────────────
export const MapPage: React.FC = () => {
  const mapRef          = useRef<HTMLDivElement>(null);
  const mapInstanceRef  = useRef<any>(null);
  const tileLayerRef    = useRef<any>(null);
  const markersRef      = useRef<Map<string, any>>(new Map());
  const doctorMarkerRef = useRef<any>(null);
  const poisMarkersRef  = useRef<any[]>([]);
  const realtimeChannelRef = useRef<any>(null);

  const navigate = useNavigate();
  const { lang }  = useLang();
  const { theme } = useTheme();
  const loc       = useLocation();

  const [mapReady,  setMapReady]  = useState(false);
  const [patients,  setPatients]  = useState<MapPatient[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [pois,      setPois]      = useState<POI[]>([]);
  const [activeId,  setActiveId]  = useState<string | null>(null);
  const leafletLoadedRef   = useRef(false);
  const overpassFetchedRef = useRef<string | null>(null);
  const doctorCenter       = useRef<[number, number]>(defaultCenter);

  useEffect(() => {
    if (loc.position) doctorCenter.current = loc.position;
  }, [loc.position]);

  // ── Publish cardiologist GPS ──────────────────────────────────────
  const publishDoctorLocation = useCallback(async (lat: number, lng: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      await supabase.from('locations').upsert(
        { user_id: user.id, role: 'carediologue', lat, lng,
          is_sharing: true, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    } catch (err) { console.error('[MapPage] publishDoctorLocation:', err); }
  }, []);

  useEffect(() => {
    if (loc.position) publishDoctorLocation(loc.position[0], loc.position[1]);
  }, [loc.position, publishDoctorLocation]);

  useEffect(() => {
    return () => {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.id)
          supabase.from('locations')
            .update({ is_sharing: false, updated_at: new Date().toISOString() })
            .eq('user_id', data.user.id).then(() => {});
      });
    };
  }, []);

  // ── Fetch patients ─────────────────────────────────────────────────
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pData, error: pErr } = await supabase
        .from('patients')
        .select('id, first_name, last_name, cardiac_pathology')
        .eq('cardiologist_id', user.id)
        .order('created_at', { ascending: false });

      if (pErr || !pData || pData.length === 0) { setPatients([]); return; }

      const patientIds = pData.map((p) => p.id);
      const { data: locationData } = await supabase
        .from('locations')
        .select('user_id, lat, lng, is_sharing, updated_at')
        .in('user_id', patientIds)
        .eq('role', 'patient');

      const locationMap = new Map((locationData ?? []).map((l) => [l.user_id, l]));
      const center = doctorCenter.current;
      const total  = pData.length;

      const enriched: MapPatient[] = await Promise.all(
        pData.map(async (p, index) => {
          const { data: ecg } = await supabase
            .from('ecg_readings')
            .select('heart_rate, status')
            .eq('patient_id', p.id)
            .order('timestamp', { ascending: false })
            .limit(1).maybeSingle();

          const riskClass = getRisk(ecg?.status ?? null);
          const aiScore   = toScore(ecg?.status ?? null);
          const heartRate = ecg?.heart_rate ?? 0;
          const avatar    = `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase();
          const locRow    = locationMap.get(p.id);
          const hasRealGPS = locRow != null && locRow.lat != null && locRow.lng != null;
          const isOnline   = locRow?.is_sharing ?? false;
          const location: [number, number] = hasRealGPS
            ? [locRow!.lat as number, locRow!.lng as number]
            : disperseAroundCenter(p.id, center, index, total);

          return {
            id: p.id,
            name: `${p.first_name} ${p.last_name}`,
            condition: p.cardiac_pathology ?? '—',
            riskClass, aiScore, heartRate, avatar,
            location, isRealGPS: hasRealGPS, isOnline,
            locationUpdatedAt: locRow?.updated_at ?? null,
          } as MapPatient;
        })
      );

      enriched.sort((a, b) => {
        const rDiff = riskOrder[a.riskClass] - riskOrder[b.riskClass];
        if (rDiff !== 0) return rDiff;
        return (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0);
      });

      setPatients(enriched);
    } catch (err) { console.error('[MapPage] fetchPatients:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchPatients();
    const id = setInterval(fetchPatients, 30000);
    return () => clearInterval(id);
  }, [fetchPatients]);

  // ── Realtime ───────────────────────────────────────────────────────
  useEffect(() => {
    const setup = async () => {
      realtimeChannelRef.current?.unsubscribe();
      realtimeChannelRef.current = supabase
        .channel('patients_locations_realtime')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'locations' },
          (payload: any) => {
            const row = payload.new ?? payload.old;
            if (!row || row.role !== 'patient') return;
            const center = doctorCenter.current;
            setPatients((prev) => {
              const total = prev.length;
              return prev.map((p, index) => {
                if (p.id !== row.user_id) return p;
                const hasRealGPS = row.lat != null && row.lng != null;
                const location: [number, number] = hasRealGPS
                  ? [row.lat, row.lng]
                  : disperseAroundCenter(p.id, center, index, total);
                return { ...p, location, isRealGPS: hasRealGPS,
                  isOnline: row.is_sharing ?? false,
                  locationUpdatedAt: row.updated_at ?? null };
              });
            });
          })
        .subscribe();
    };
    setup();
    return () => { realtimeChannelRef.current?.unsubscribe(); };
  }, []);

  // ── Leaflet ────────────────────────────────────────────────────────
  useEffect(() => {
    if (leafletLoadedRef.current) return;
    leafletLoadedRef.current = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setMapReady(true);
    document.head.appendChild(script);
  }, []);

  // ── Overpass ───────────────────────────────────────────────────────
  const fetchNearbyPOI = useCallback(async (lat: number, lng: number) => {
    const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    if (overpassFetchedRef.current === key) return;
    overpassFetchedRef.current = key;
    const radius = 80000;
    const query = `[out:json][timeout:60];(
node["amenity"="hospital"](around:${radius},${lat},${lng});
way["amenity"="hospital"](around:${radius},${lat},${lng});
relation["amenity"="hospital"](around:${radius},${lat},${lng});
node["amenity"="clinic"](around:${radius},${lat},${lng});
way["amenity"="clinic"](around:${radius},${lat},${lng});
node["healthcare"="hospital"](around:${radius},${lat},${lng});
way["healthcare"="hospital"](around:${radius},${lat},${lng});
node["emergency"="defibrillator"](around:${radius},${lat},${lng});
);out center body 200;`;
    const servers = [
      'https://overpass-api.de/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ];
    for (const server of servers) {
      try {
        const res = await fetch(server, { method:'POST',
          body: 'data=' + encodeURIComponent(query),
          headers: { 'Content-Type':'application/x-www-form-urlencoded' } });
        if (!res.ok) continue;
        const json = await res.json();
        const results: POI[] = (json.elements ?? []).map((el: any) => {
          const elLat = el.lat ?? el.center?.lat;
          const elLng = el.lon ?? el.center?.lon;
          if (elLat == null || elLng == null) return null;
          const isAED = el.tags?.emergency === 'defibrillator';
          const amenity = el.tags?.amenity ?? '';
          const healthcare = el.tags?.healthcare ?? '';
          const isHospital = amenity==='hospital'||amenity==='clinic'||healthcare==='hospital';
          if (!isAED && !isHospital) return null;
          const name = el.tags?.name || el.tags?.['name:fr'] || el.tags?.['name:ar'] ||
            (isAED ? 'Défibrillateur automatique' : amenity==='clinic' ? 'Clinique' : 'Hôpital');
          return { id:`${el.type}_${el.id}`, name,
            location:[elLat,elLng] as [number,number],
            type: isAED ? 'aed' : 'hospital' } satisfies POI;
        }).filter(Boolean) as POI[];
        setPois(results);
        return;
      } catch (err) { console.warn('[MapPage] Overpass échec:', server, err); }
    }
  }, []);

  useEffect(() => {
    if (loc.position) fetchNearbyPOI(loc.position[0], loc.position[1]);
  }, [loc.position, fetchNearbyPOI]);

  // ── Init map ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return;
    const L = window.L;
    const center = loc.position ?? defaultCenter;
    const map = L.map(mapRef.current, { center, zoom: loc.position ? 13 : 12, zoomControl: false });
    const tileUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    tileLayerRef.current = L.tileLayer(tileUrl,
      { attribution:'©OpenStreetMap ©CartoDB', maxZoom:19 }).addTo(map);
    L.control.zoom({ position:'bottomright' }).addTo(map);
    mapInstanceRef.current = map;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.5;transform:scale(1.3);}}
      .custom-popup .leaflet-popup-content-wrapper{background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important;}
      .custom-popup .leaflet-popup-tip-container{display:none;}
      .custom-popup .leaflet-popup-content{margin:0!important;}
    `;
    document.head.appendChild(style);
    return () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null; };
  }, [mapReady]);

  // ── Popup click → navigate ─────────────────────────────────────────
  useEffect(() => {
    const container = mapRef.current;
    if (!container) return;
    const handle = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('[data-patient-id]') as HTMLElement | null;
      if (btn) { const id = btn.getAttribute('data-patient-id'); if (id) navigate(`/patients/${id}`); }
    };
    container.addEventListener('click', handle);
    return () => container.removeEventListener('click', handle);
  }, [navigate]);

  // ── Fly to patient ────────────────────────────────────────────────
  const flyToPatient = useCallback((patient: MapPatient) => {
    if (!mapInstanceRef.current) return;
    setActiveId(patient.id);
    mapInstanceRef.current.flyTo(patient.location, 15, { duration: 1.2 });
    const marker = markersRef.current.get(patient.id);
    if (marker) {
      setTimeout(() => marker.openPopup(), 1300);
    }
  }, []);

  // ── POI markers ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L; const map = mapInstanceRef.current;
    poisMarkersRef.current.forEach((m) => map.removeLayer(m));
    poisMarkersRef.current = [];
    pois.forEach((poi) => {
      const isH = poi.type === 'hospital';
      const bg = isH ? '#3B82F6' : '#F59E0B';
      const glow = isH ? 'rgba(59,130,246,.5)' : 'rgba(245,158,11,.5)';
      const emoji = isH ? '' : '';
      const size = isH ? 30 : 26; const r = isH ? '8px' : '6px';
      const icon = L.divIcon({
        html:`<div style="width:${size}px;height:${size}px;background:${bg};border-radius:${r};border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px ${glow};font-size:${isH?14:12}px;">${emoji}</div>`,
        className:'', iconSize:[size,size], iconAnchor:[size/2,size/2] });
      const label = isH ? (lang==='EN'?'Hospital':'Établissement hospitalier')
                        : (lang==='EN'?'Automated defibrillator':'Défibrillateur automatique');
      const m = L.marker(poi.location, { icon }).addTo(map).bindPopup(
        `<div style="background:#111827;color:white;border-radius:8px;padding:10px;border:1px solid #1F2937;font-family:system-ui">
          <strong style="font-size:12px">${poi.name}</strong><br>
          <span style="color:${bg};font-size:11px">${label}</span>
        </div>`);
      poisMarkersRef.current.push(m);
    });
  }, [pois, lang, mapReady]);

  // ── Doctor marker ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L; const map = mapInstanceRef.current;
    if (doctorMarkerRef.current) { map.removeLayer(doctorMarkerRef.current); doctorMarkerRef.current = null; }
    if (!loc.granted || !loc.position) return;
    const [lat, lng] = loc.position;
    const iconHtml = `
      <div style="position:relative;width:42px;height:42px">
        <div style="position:absolute;inset:-8px;background:rgba(14,165,233,.15);border-radius:50%;animation:pulse 1.5s infinite;"></div>
        <div style="position:absolute;inset:-3px;background:rgba(14,165,233,.25);border-radius:50%;animation:pulse 1.5s infinite .4s;"></div>
        <div style="width:42px;height:42px;background:linear-gradient(135deg,#0EA5E9,#0284c7);border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 0 18px rgba(14,165,233,.7);position:relative;z-index:1;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
        </div>
      </div>`;
    const icon = L.divIcon({ html:iconHtml, className:'', iconSize:[42,42], iconAnchor:[21,21] });
    doctorMarkerRef.current = L.marker([lat,lng], { icon }).addTo(map).bindPopup(`
      <div style="background:#111827;color:white;border-radius:12px;padding:12px;min-width:180px;border:1px solid rgba(14,165,233,.3);font-family:system-ui,sans-serif;">
        <div style="font-weight:700;font-size:12px;color:#0EA5E9">${lang==='EN'?'You (Cardiologist)':'Vous (Cardiologue)'}</div>
        <div style="color:#6B7280;font-size:10px;margin-top:2px">${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E</div>
        <div style="margin-top:8px;display:flex;align-items:center;gap:5px;padding:4px 8px;border-radius:20px;font-size:10px;font-weight:700;background:rgba(14,165,233,.15);color:#0EA5E9;border:1px solid rgba(14,165,233,.3);">
          <span style="width:6px;height:6px;border-radius:50%;background:#0EA5E9;display:inline-block;animation:pulse 1s infinite;"></span>
          ${lang==='EN'?'Live position':'Position en direct'}
        </div>
      </div>`, { maxWidth:220, className:'custom-popup' });
    map.flyTo([lat,lng], Math.max(map.getZoom(), 13), { duration:1.5 });
  }, [loc.position, loc.granted, lang, mapReady]);

  // ── Patient markers ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L; const map = mapInstanceRef.current;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current.clear();

    patients.forEach((patient) => {
      const color      = getRiskColor(patient.riskClass, patient.isOnline);
      const isCritical = patient.riskClass === 'Critical' && patient.isOnline;
      const isOffline  = !patient.isOnline;
      const noRealGPS  = !patient.isRealGPS;
      const isActive   = patient.id === activeId;

      const pulseRings = isCritical ? `
        <div style="position:absolute;inset:-6px;background:${color}20;border-radius:50%;animation:pulse 1.5s infinite;"></div>
        <div style="position:absolute;inset:-2px;background:${color}30;border-radius:50%;animation:pulse 1.5s infinite .3s;"></div>` : '';

      const offlineBadge = isOffline ? `
        <div style="position:absolute;bottom:-2px;right:-2px;width:13px;height:13px;background:#374151;border-radius:50%;border:1.5px solid white;display:flex;align-items:center;justify-content:center;z-index:3;">
          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2.5"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
        </div>` : '';

      const estimatedBadge = noRealGPS && !isOffline ? `
        <div style="position:absolute;bottom:-2px;right:-2px;width:13px;height:13px;background:#6B7280;border-radius:50%;border:1.5px solid white;display:flex;align-items:center;justify-content:center;z-index:3;font-size:7px;color:white;font-weight:bold;">~</div>` : '';

      const iconHtml = `
        <div style="position:relative;width:${isActive?44:36}px;height:${isActive?44:36}px">
          ${pulseRings}
          ${isActive ? `<div style="position:absolute;inset:-4px;border:2.5px solid white;border-radius:50%;opacity:.8;"></div>` : ''}
          <div style="width:${isActive?44:36}px;height:${isActive?44:36}px;background:${color};border-radius:50%;border:${isActive?'3px':'2.5px'} solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 0 ${isActive?16:10}px ${color}80;position:relative;z-index:1;cursor:pointer;opacity:${isOffline?'0.75':'1'};">
            <span style="color:white;font-size:${isActive?13:11}px;font-weight:bold;">${patient.avatar}</span>
          </div>
          ${isOffline ? offlineBadge : (noRealGPS ? estimatedBadge : '')}
        </div>`;

      const iconSize: [number,number] = isActive ? [44,44] : [36,36];
      const iconAnchor: [number,number] = isActive ? [22,22] : [18,18];
      const icon = L.divIcon({ html:iconHtml, className:'', iconSize, iconAnchor });

      const riskLabel = patient.riskClass==='Critical' ? (lang==='EN'?'CRITICAL':'CRITIQUE')
        : patient.riskClass==='At Risk' ? (lang==='EN'?'AT RISK':'À RISQUE') : 'NORMAL';

      const gpsStatus = isOffline
        ? `<div style="display:flex;align-items:center;gap:5px;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:600;background:#6B728018;color:#9CA3AF;border:1px solid #6B728030;margin-bottom:8px;">
            📴 ${lang==='EN'?'GPS off':'GPS éteint'}${patient.locationUpdatedAt?` — ${lang==='EN'?'last seen':'vu il y a'} ${Math.round((Date.now()-new Date(patient.locationUpdatedAt).getTime())/60000)} min`:''}
           </div>`
        : noRealGPS
        ? `<div style="display:flex;align-items:center;gap:5px;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:600;background:#6B728018;color:#9CA3AF;border:1px solid #6B728030;margin-bottom:8px;">
            ~ ${lang==='EN'?'Estimated position':'Position estimée'}
           </div>`
        : `<div style="display:flex;align-items:center;gap:5px;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:600;background:rgba(14,165,233,.1);color:#0EA5E9;border:1px solid rgba(14,165,233,.3);margin-bottom:8px;">
            📍 ${lang==='EN'?'Live GPS':'GPS en direct'}
           </div>`;

      const marker = L.marker(patient.location, { icon }).addTo(map);
      marker.on('click', () => setActiveId(patient.id));
      marker.bindPopup(`
        <div style="background:#111827;color:white;border-radius:12px;padding:14px;min-width:210px;border:1px solid #1F2937;font-family:system-ui,sans-serif;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div style="width:38px;height:38px;background:${color};border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;color:white;font-size:12px;box-shadow:0 0 10px ${color}60;flex-shrink:0;">${patient.avatar}</div>
            <div style="min-width:0">
              <div style="font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${patient.name}</div>
              <div style="color:#9CA3AF;font-size:11px">${patient.condition}</div>
            </div>
          </div>
          ${gpsStatus}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
            <div style="background:#1F2937;border-radius:8px;padding:6px 8px">
              <div style="color:#6B7280;font-size:10px;margin-bottom:2px">${lang==='EN'?'AI SCORE':'SCORE IA'}</div>
              <div style="color:${color};font-weight:700;font-size:15px">${patient.aiScore}<span style="font-size:10px;color:#6B7280">/100</span></div>
            </div>
            <div style="background:#1F2937;border-radius:8px;padding:6px 8px">
              <div style="color:#6B7280;font-size:10px;margin-bottom:2px">${lang==='EN'?'HEART RATE':'FRÉQ. CARD.'}</div>
              <div style="color:white;font-weight:700;font-size:15px">${patient.heartRate||'—'}<span style="font-size:10px;color:#6B7280">${patient.heartRate?' bpm':''}</span></div>
            </div>
          </div>
          <div style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:700;background:${color}18;color:${color};border:1px solid ${color}30;margin-bottom:10px;">
            ${isCritical?'● ':''}${riskLabel}
          </div>
          <button data-patient-id="${patient.id}" style="display:block;width:100%;text-align:center;background:linear-gradient(135deg,#0EA5E9,#0284c7);color:white;border-radius:8px;padding:7px;font-size:11px;font-weight:600;border:none;cursor:pointer;">
            ${lang==='EN'?'View record →':'Voir le dossier →'}
          </button>
        </div>`, { maxWidth:260, className:'custom-popup' });

      markersRef.current.set(patient.id, marker);
    });
  }, [patients, lang, mapReady, activeId]);

  // ── Theme ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const tileUrl = theme==='dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    if (tileLayerRef.current) mapInstanceRef.current.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(tileUrl,
      { attribution:'©OpenStreetMap ©CartoDB', maxZoom:19 }).addTo(mapInstanceRef.current);
  }, [theme]);

  // ── Counts ─────────────────────────────────────────────────────────
  const criticalCount  = patients.filter(p => p.riskClass==='Critical').length;
  const atRiskCount    = patients.filter(p => p.riskClass==='At Risk').length;
  const normalCount    = patients.filter(p => p.riskClass==='Normal').length;
  const onlineCount    = patients.filter(p => p.isOnline && p.isRealGPS).length;
  const offlineCount   = patients.filter(p => !p.isOnline).length;
  const estimatedCount = patients.filter(p => !p.isRealGPS && p.isOnline).length;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">

      {/* ── CARTE ── */}
      <div className="relative flex-1 min-h-0">
        <div ref={mapRef} className="absolute inset-0 z-0" style={{ background:'var(--cd-bg1)' }} />

        {/* Loading */}
        {(!mapReady || loading) && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor:'var(--cd-bg1)' }}>
            <div className="text-center">
              <Activity className="w-10 h-10 text-[#0EA5E9] animate-pulse mx-auto mb-3" />
              <p className="text-sm" style={{ color:'var(--cd-t4)' }}>
                {lang==='EN'?'Loading map...':'Chargement de la carte...'}
              </p>
            </div>
          </div>
        )}

        {/* Legend — sans les badges hôpitaux/DEA */}
        <div className="absolute top-3 left-3 z-[1000]">
          <div className="rounded-xl p-3 shadow-2xl min-w-[200px]"
               style={{ background:'var(--cd-bg3)', border:'1px solid var(--cd-bd)', backdropFilter:'blur(12px)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#0EA5E9]" />
                <span className="font-semibold text-xs" style={{ color:'var(--cd-t1)' }}>
                  {lang==='EN'?'Surveillance':'Surveillance Géospatiale'}
                </span>
              </div>
              <button onClick={fetchPatients} className="p-1 rounded-lg" style={{ color:'var(--cd-t4)' }}>
                {loading ? <Loader2 className="w-3 h-3 animate-spin"/> : <RefreshCw className="w-3 h-3"/>}
              </button>
            </div>
            <div className="space-y-1 text-[11px]">
              {[
                { color:'#EF4444', shadow:'0 0 5px #EF4444', label:lang==='EN'?'Critical':'Critique', count:criticalCount },
                { color:'#F59E0B', shadow:'none', label:lang==='EN'?'At Risk':'À risque', count:atRiskCount },
                { color:'#10B981', shadow:'none', label:'Normal', count:normalCount },
              ].map(({ color, shadow, label, count }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background:color, boxShadow:shadow }}/>
                    <span style={{ color:'var(--cd-t4)' }}>{label}</span>
                  </div>
                  <span className="font-bold" style={{ color }}>{count}</span>
                </div>
              ))}
              <div className="pt-1.5 space-y-1" style={{ borderTop:'1px solid var(--cd-bd)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0EA5E9]" style={{ boxShadow:'0 0 4px #0EA5E9' }}/>
                    <span style={{ color:'var(--cd-t4)' }}>GPS live</span>
                  </div>
                  <span className="text-[#0EA5E9] font-bold">{onlineCount}</span>
                </div>
                {estimatedCount > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-500"/>
                      <span style={{ color:'var(--cd-t4)' }}>~{lang==='EN'?'Est.':'Estimée'}</span>
                    </div>
                    <span className="text-gray-400 font-bold">{estimatedCount}</span>
                  </div>
                )}
                {offlineCount > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <WifiOff className="w-2.5 h-2.5 text-gray-400"/>
                      <span style={{ color:'var(--cd-t4)' }}>GPS off</span>
                    </div>
                    <span className="text-gray-400 font-bold">{offlineCount}</span>
                  </div>
                )}
              </div>
              {loc.granted && loc.position && (
                <button onClick={() => mapInstanceRef.current?.flyTo(loc.position, 14, { duration:1 })}
                  className="w-full mt-1 text-[10px] px-2 py-1 rounded-lg font-medium"
                  style={{ background:'rgba(14,165,233,.15)', color:'#0EA5E9', border:'1px solid rgba(14,165,233,.3)' }}>
                  <Navigation className="w-2.5 h-2.5 inline mr-1"/>
                  {lang==='EN'?'Center on me':'Centrer sur moi'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── POIs badge supprimé ── */}
      </div>

      {/* ── LISTE PATIENTS : scroll HORIZONTAL ── */}
      <div style={{ background:'var(--cd-bg2)', borderTop:'1px solid var(--cd-bd)', flexShrink:0 }}>
        {/* En-tête */}
        <div className="flex items-center justify-between px-4 py-2"
             style={{ borderBottom:'1px solid var(--cd-bd)' }}>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm" style={{ color:'var(--cd-t1)' }}>
              {lang==='EN'?'Patients':'Patients'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background:'rgba(14,165,233,.15)', color:'#0EA5E9', border:'1px solid rgba(14,165,233,.2)' }}>
              {patients.length}
            </span>
          </div>
          <span className="text-[11px]" style={{ color:'var(--cd-t5)' }}>
            {lang==='EN'?'Tap to locate':'Appuyer pour localiser'}
          </span>
        </div>

        {/* Scroll horizontal */}
        <div
          className="overflow-x-auto overflow-y-hidden"
          style={{
            display: 'flex',
            flexDirection: 'row',
            paddingLeft: '12px',
            paddingRight: '12px',
            paddingTop: '10px',
            paddingBottom: '10px',
            gap: '10px',
            scrollbarWidth: 'none',      /* Firefox */
            msOverflowStyle: 'none',     /* IE/Edge */
          }}
        >
          <style>{`.patient-hscroll::-webkit-scrollbar{display:none;}`}</style>

          {loading && patients.length === 0 ? (
            <div className="flex items-center justify-center w-full py-4 gap-2" style={{ color:'var(--cd-t4)' }}>
              <Loader2 className="w-4 h-4 animate-spin"/>
              <span className="text-sm">{lang==='EN'?'Loading patients…':'Chargement…'}</span>
            </div>
          ) : patients.length === 0 ? (
            <div className="flex items-center justify-center w-full py-4" style={{ color:'var(--cd-t4)' }}>
              <span className="text-sm">{lang==='EN'?'No patients assigned':'Aucun patient assigné'}</span>
            </div>
          ) : (
            patients.map((p) => {
              const color    = getRiskColor(p.riskClass, p.isOnline);
              const isActive = p.id === activeId;
              const riskLabel = p.riskClass==='Critical' ? (lang==='EN'?'Critical':'Critique')
                : p.riskClass==='At Risk' ? (lang==='EN'?'At Risk':'À risque') : 'Normal';

              return (
                <button
                  key={p.id}
                  onClick={() => flyToPatient(p)}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 14px',
                    borderRadius: '14px',
                    background: isActive ? `${color}18` : 'var(--cd-bg3)',
                    border: `1.5px solid ${isActive ? color : 'var(--cd-bd)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minWidth: '90px',
                    maxWidth: '110px',
                    textAlign: 'center',
                  }}
                >
                  {/* Avatar + badge GPS */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: color,
                      boxShadow: `0 0 8px ${color}60`,
                      opacity: p.isOnline ? 1 : 0.7,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      color: 'white',
                    }}>
                      {p.avatar}
                    </div>
                    {/* Badge statut GPS */}
                    <div style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      border: '2px solid var(--cd-bg2)',
                      background: p.isOnline && p.isRealGPS ? '#10B981'
                               : !p.isOnline ? '#6B7280' : '#F59E0B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {p.isOnline && p.isRealGPS
                        ? <Wifi style={{ width: '8px', height: '8px', color: 'white' }}/>
                        : !p.isOnline
                        ? <WifiOff style={{ width: '8px', height: '8px', color: 'white' }}/>
                        : <span style={{ color: 'white', fontWeight: 'bold', fontSize: '8px' }}>~</span>
                      }
                    </div>
                  </div>

                  {/* Nom */}
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--cd-t1)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '82px',
                    display: 'block',
                  }}>
                    {p.name}
                  </span>

                  {/* Score */}
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color }}>
                    {p.aiScore}
                    <span style={{ fontSize: '10px', fontWeight: 'normal', color: 'var(--cd-t5)' }}>/100</span>
                  </span>

                  {/* Badge risque */}
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '20px',
                    background: `${color}18`,
                    color,
                    border: `1px solid ${color}30`,
                  }}>
                    {riskLabel}
                  </span>

                  {/* Pulse dot for critical */}
                  {p.riskClass === 'Critical' && p.isOnline && (
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: color,
                      display: 'inline-block',
                      animation: 'pulse 1s infinite',
                    }}/>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};