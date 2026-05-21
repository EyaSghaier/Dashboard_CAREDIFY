import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, Activity, Loader2, RefreshCw, Navigation } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';

declare global {
  interface Window {
    L: any;
  }
}

// ── Types ───────────────────────────────────────────────────────────
interface MapPatient {
  id: string;
  name: string;
  condition: string;
  riskClass: 'Critical' | 'At Risk' | 'Normal';
  aiScore: number;
  heartRate: number;
  avatar: string;
  location: [number, number];
}

// ── Helpers ─────────────────────────────────────────────────────────
const getRiskColor = (riskClass: string) => {
  if (riskClass === 'Critical') return '#EF4444';
  if (riskClass === 'At Risk') return '#F59E0B';
  return '#10B981';
};

const getRisk = (status: string | null): 'Critical' | 'At Risk' | 'Normal' =>
  status === 'critical' ? 'Critical' : status === 'warning' ? 'At Risk' : 'Normal';

const toScore = (status: string | null): number =>
  status === 'critical' ? 85 : status === 'warning' ? 62 : 25;

/**
 * Deterministically spread patients across the Paris area using
 * a simple hash of the patient ID (no real GPS in the DB).
 */
const parisBase: [number, number] = [48.8566, 2.3522];
const idToLocation = (id: string): [number, number] => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  const lat = parisBase[0] + ((hash % 1000) - 500) / 10000;
  const lng = parisBase[1] + (((hash >> 10) % 1000) - 500) / 10000;
  return [lat, lng];
};

// ── Component ───────────────────────────────────────────────────────
export const MapPage: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const doctorMarkerRef = useRef<any>(null);
  const navigate = useNavigate();
  const { lang } = useLang();
  const { theme } = useTheme();
  const loc = useLocation();

  const [mapReady, setMapReady] = useState(false);
  const [patients, setPatients] = useState<MapPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const leafletLoadedRef = useRef(false);

  // POI (hospitals + AEDs) loaded from Overpass or fallback mock
  interface POI { id: string; name: string; location: [number, number]; type: 'hospital' | 'aed' }
  const [pois, setPois] = useState<POI[]>([]);
  const poisMarkersRef = useRef<any[]>([]);
  const overpassFetchedRef = useRef<string | null>(null); // tracks last fetched coord key

  // ── Fetch real data ──────────────────────────────────────────────
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const { data: pData } = await supabase
        .from('patients')
        .select('id, first_name, last_name, cardiac_pathology')
        .order('created_at', { ascending: false });

      const enriched: MapPatient[] = await Promise.all(
        (pData ?? []).map(async (p) => {
          const { data: ecg } = await supabase
            .from('ecg_readings')
            .select('heart_rate, status')
            .eq('patient_id', p.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .maybeSingle();

          const riskClass = getRisk(ecg?.status ?? null);
          const aiScore = toScore(ecg?.status ?? null);
          const heartRate = ecg?.heart_rate ?? 0;
          const avatar =
            `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase();

          return {
            id: p.id,
            name: `${p.first_name} ${p.last_name}`,
            condition: p.cardiac_pathology ?? '—',
            riskClass,
            aiScore,
            heartRate,
            avatar,
            location: idToLocation(p.id),
          };
        })
      );

      setPatients(enriched);
    } catch (err) {
      console.error('MapPage fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
    const id = setInterval(fetchPatients, 30000);
    return () => clearInterval(id);
  }, [fetchPatients]);

  // ── Load Leaflet ─────────────────────────────────────────────────
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

  // ── Fetch nearby hospitals & AEDs via Overpass API ───────────────
  const fetchNearbyPOI = useCallback(async (lat: number, lng: number) => {
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (overpassFetchedRef.current === key) return; // already fetched for this location
    overpassFetchedRef.current = key;

    console.log('[MapPage] Fetching POI from Overpass for', lat, lng);

    const radius = 5000; // 5 km
    const query = `[out:json][timeout:25];(node["amenity"="hospital"](around:${radius},${lat},${lng});way["amenity"="hospital"](around:${radius},${lat},${lng});relation["amenity"="hospital"](around:${radius},${lat},${lng});node["amenity"="clinic"](around:${radius},${lat},${lng});way["amenity"="clinic"](around:${radius},${lat},${lng});node["emergency"="defibrillator"](around:${radius},${lat},${lng}););out center body 100;`;

    try {
      const res = await fetch(
        'https://overpass-api.de/api/interpreter',
        { method: 'POST', body: 'data=' + encodeURIComponent(query) }
      );
      if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
      const json = await res.json();
      console.log('[MapPage] Overpass returned', json.elements?.length ?? 0, 'elements');

      const results: POI[] = (json.elements ?? []).map((el: any) => {
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        if (!elLat || !elLng) return null;
        const isAED = el.tags?.emergency === 'defibrillator';
        const name = el.tags?.name ||
          (isAED ? 'Défibrillateur' : el.tags?.amenity === 'clinic' ? 'Clinique' : 'Hôpital');
        return {
          id: String(el.id),
          name,
          location: [elLat, elLng] as [number, number],
          type: isAED ? 'aed' : 'hospital',
        } satisfies POI;
      }).filter(Boolean) as POI[];

      console.log('[MapPage] Parsed POIs:', results.length);
      setPois(results);
    } catch (err) {
      console.error('[MapPage] Overpass fetch failed:', err);
      // No fallback to mock data — just show nothing
      setPois([]);
    }
  }, []);

  // Trigger POI fetch when cardiologist position becomes available
  useEffect(() => {
    if (loc.position) {
      fetchNearbyPOI(loc.position[0], loc.position[1]);
    }
    // No GPS → no POIs (no mock fallback)
  }, [loc.position, fetchNearbyPOI]);

  // ── Init map ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return;

    const L = window.L;

    // Center on doctor's real position if available, else Paris
    const center: [number, number] = loc.position ?? parisBase;

    const map = L.map(mapRef.current, {
      center,
      zoom: loc.position ? 14 : 12,
      zoomControl: false,
    });

    const tileUrl =
      theme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: '©OpenStreetMap ©CartoDB',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapInstanceRef.current = map;

    // ── Static markers: hospitals & AEDs (replaced by dynamic POI layer) ──
    // Markers are now rendered reactively in the pois useEffect below.

    // Pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.3); }
      }
      .custom-popup .leaflet-popup-content-wrapper {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
      }
      .custom-popup .leaflet-popup-tip-container { display: none; }
      .custom-popup .leaflet-popup-content { margin: 0 !important; }
    `;
    document.head.appendChild(style);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapReady]);

  // ── Handle popup button clicks via event delegation ──────────────
  useEffect(() => {
    const container = mapRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('[data-patient-id]') as HTMLElement | null;
      if (btn) {
        const id = btn.getAttribute('data-patient-id');
        if (id) navigate(`/patients/${id}`);
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [navigate]);

  // ── Render POI markers (hospitals + AEDs) ────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Clear old POI markers
    poisMarkersRef.current.forEach(m => map.removeLayer(m));
    poisMarkersRef.current = [];

    if (pois.length === 0) return;

    console.log('[MapPage] Rendering', pois.length, 'POI markers on map');

    pois.forEach((poi) => {
      const isHospital = poi.type === 'hospital';
      const bg = isHospital ? '#3B82F6' : '#F59E0B';
      const glow = isHospital ? 'rgba(59,130,246,0.5)' : 'rgba(245,158,11,0.5)';
      const emoji = isHospital ? '🏥' : '⚡';
      const size = isHospital ? 30 : 26;
      const radius = isHospital ? '8px' : '6px';

      const icon = L.divIcon({
        html: `<div style="width:${size}px;height:${size}px;background:${bg};border-radius:${radius};border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px ${glow};font-size:${isHospital ? 14 : 12}px;">${emoji}</div>`,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const typeLabel = isHospital
        ? (lang === 'EN' ? 'Hospital' : 'Établissement hospitalier')
        : (lang === 'EN' ? 'Automated defibrillator' : 'Défibrillateur automatique');

      const marker = L.marker(poi.location, { icon }).addTo(map).bindPopup(`
        <div style="background:#111827;color:white;border-radius:8px;padding:10px;border:1px solid #1F2937;font-family:system-ui">
          <strong style="font-size:12px">${poi.name}</strong><br>
          <span style="color:${bg};font-size:11px">${typeLabel}</span>
        </div>
      `);
      poisMarkersRef.current.push(marker);
    });
  }, [pois, lang, mapReady]);

  // ── Doctor's real-time position marker ───────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Remove previous doctor marker
    if (doctorMarkerRef.current) {
      map.removeLayer(doctorMarkerRef.current);
      doctorMarkerRef.current = null;
    }

    if (!loc.granted || !loc.position) return;

    const [lat, lng] = loc.position;

    const iconHtml = `
      <div style="position:relative;width:42px;height:42px">
        <div style="position:absolute;inset:-8px;background:rgba(14,165,233,0.15);border-radius:50%;animation:pulse 1.5s infinite;"></div>
        <div style="position:absolute;inset:-3px;background:rgba(14,165,233,0.25);border-radius:50%;animation:pulse 1.5s infinite 0.4s;"></div>
        <div style="width:42px;height:42px;background:linear-gradient(135deg,#0EA5E9,#0284c7);border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 0 18px rgba(14,165,233,0.7);position:relative;z-index:1;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: '',
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });

    const popupContent = `
      <div style="background:#111827;color:white;border-radius:12px;padding:12px;min-width:180px;border:1px solid rgba(14,165,233,0.3);font-family:system-ui,sans-serif;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="width:32px;height:32px;background:linear-gradient(135deg,#0EA5E9,#0284c7);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(14,165,233,0.5);">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          </div>
          <div>
            <div style="font-weight:700;font-size:12px;color:#0EA5E9">${lang === 'EN' ? 'You (Cardiologist)' : 'Vous (Cardiologue)'}</div>
            <div style="color:#6B7280;font-size:10px">${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:5px;padding:4px 8px;border-radius:20px;font-size:10px;font-weight:700;background:rgba(14,165,233,0.15);color:#0EA5E9;border:1px solid rgba(14,165,233,0.3);">
          <span style="width:6px;height:6px;border-radius:50%;background:#0EA5E9;display:inline-block;animation:pulse 1s infinite;"></span>
          ${lang === 'EN' ? 'Live position' : 'Position en direct'}
        </div>
      </div>
    `;

    doctorMarkerRef.current = L.marker([lat, lng], { icon }).addTo(map)
      .bindPopup(popupContent, { maxWidth: 220, className: 'custom-popup' });

    // Smoothly pan to doctor if first fix
    map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 1.5 });
  }, [loc.position, loc.granted, lang, mapReady]);

  // ── Update patient markers when data changes ─────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Remove old patient markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    patients.forEach((patient) => {
      const color = getRiskColor(patient.riskClass);
      const isCritical = patient.riskClass === 'Critical';

      const iconHtml = `
        <div style="position:relative;width:36px;height:36px">
          ${isCritical ? `
            <div style="position:absolute;inset:-6px;background:${color}20;border-radius:50%;animation:pulse 1.5s infinite;"></div>
            <div style="position:absolute;inset:-2px;background:${color}30;border-radius:50%;animation:pulse 1.5s infinite 0.3s;"></div>
          ` : ''}
          <div style="width:36px;height:36px;background:${color};border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px ${color}80;position:relative;z-index:1;cursor:pointer;">
            <span style="color:white;font-size:10px;font-weight:bold;">${patient.avatar}</span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const riskLabel =
        patient.riskClass === 'Critical'
          ? lang === 'EN' ? 'CRITICAL' : 'CRITIQUE'
          : patient.riskClass === 'At Risk'
          ? lang === 'EN' ? 'AT RISK' : 'À RISQUE'
          : lang === 'EN' ? 'NORMAL' : 'NORMAL';

      const marker = L.marker(patient.location, { icon }).addTo(map);

      marker.bindPopup(`
        <div style="background:#111827;color:white;border-radius:12px;padding:14px;min-width:200px;border:1px solid #1F2937;font-family:system-ui,sans-serif;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div style="width:36px;height:36px;background:${color};border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;color:white;font-size:11px;box-shadow:0 0 10px ${color}60;">${patient.avatar}</div>
            <div>
              <div style="font-weight:600;font-size:13px">${patient.name}</div>
              <div style="color:#9CA3AF;font-size:11px">${patient.condition}</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
            <div style="background:#1F2937;border-radius:8px;padding:6px 8px">
              <div style="color:#6B7280;font-size:10px;margin-bottom:2px">${lang === 'EN' ? 'AI SCORE' : 'SCORE IA'}</div>
              <div style="color:${color};font-weight:700;font-size:15px">${patient.aiScore}<span style="font-size:10px;color:#6B7280">/100</span></div>
            </div>
            <div style="background:#1F2937;border-radius:8px;padding:6px 8px">
              <div style="color:#6B7280;font-size:10px;margin-bottom:2px">${lang === 'EN' ? 'HEART RATE' : 'FRÉQ. CARD.'}</div>
              <div style="color:white;font-weight:700;font-size:15px">${patient.heartRate || '—'}<span style="font-size:10px;color:#6B7280">${patient.heartRate ? ' bpm' : ''}</span></div>
            </div>
          </div>
          <div style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:700;background:${color}18;color:${color};border:1px solid ${color}30;margin-bottom:10px;">
            ${isCritical ? '● ' : ''}${riskLabel}
          </div>
          <div>
            <button data-patient-id="${patient.id}" style="display:block;width:100%;text-align:center;background:linear-gradient(135deg,#0EA5E9,#0284c7);color:white;border-radius:8px;padding:6px;font-size:11px;font-weight:600;border:none;cursor:pointer;">
              ${lang === 'EN' ? 'View record →' : 'Voir le dossier →'}
            </button>
          </div>
        </div>
      `, { maxWidth: 250, className: 'custom-popup' });

      markersRef.current.push(marker);
    });
  }, [patients, lang]);

  // ── Swap tile layer on theme change ─────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const tileUrl =
      theme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: '©OpenStreetMap ©CartoDB',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);
  }, [theme]);

  // ── Derived counts ───────────────────────────────────────────────
  const criticalCount = patients.filter((p) => p.riskClass === 'Critical').length;
  const atRiskCount = patients.filter((p) => p.riskClass === 'At Risk').length;
  const normalCount = patients.filter((p) => p.riskClass === 'Normal').length;

  return (
    <div className="relative h-full w-full">
      {/* Map */}
      <div ref={mapRef} className="absolute inset-0 z-0" style={{ background: 'var(--cd-bg1)' }} />

      {/* Loading overlay */}
      {(!mapReady || loading) && (
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: 'var(--cd-bg1)' }}>
          <div className="text-center">
            <Activity className="w-10 h-10 text-[#0EA5E9] animate-pulse mx-auto mb-3" />
            <p className="text-sm" style={{ color: 'var(--cd-t4)' }}>
              {lang === 'EN' ? 'Loading map...' : 'Chargement de la carte...'}
            </p>
          </div>
        </div>
      )}

      {/* Legend panel */}
      <div className="absolute top-4 left-4 z-[1000]">
        <div
          className="rounded-xl p-4 shadow-2xl min-w-[200px]"
          style={{ background: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#0EA5E9]" />
              <span className="font-semibold text-sm" style={{ color: 'var(--cd-t1)' }}>
                {lang === 'EN' ? 'Geospatial Surveillance' : 'Surveillance Géospatiale'}
              </span>
            </div>
            <button
              onClick={fetchPatients}
              className="p-1 rounded-lg transition-colors"
              style={{ color: 'var(--cd-t4)' }}
              title={lang === 'EN' ? 'Refresh' : 'Actualiser'}
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#EF4444]" style={{ boxShadow: '0 0 6px #EF4444' }} />
                <span style={{ color: 'var(--cd-t4)' }}>{lang === 'EN' ? 'Critical' : 'Critique'}</span>
              </div>
              <span className="text-[#EF4444] font-bold">{criticalCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                <span style={{ color: 'var(--cd-t4)' }}>{lang === 'EN' ? 'At Risk' : 'À risque'}</span>
              </div>
              <span className="text-[#F59E0B] font-bold">{atRiskCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                <span style={{ color: 'var(--cd-t4)' }}>{lang === 'EN' ? 'Normal' : 'Normal'}</span>
              </div>
              <span className="text-[#10B981] font-bold">{normalCount}</span>
            </div>
            <div className="pt-2 space-y-1.5" style={{ borderTop: '1px solid var(--cd-bd)' }}>
              <div className="flex items-center gap-2">
                <span className="text-base">🏥</span>
                <span style={{ color: 'var(--cd-t4)' }}>
                  {lang === 'EN' ? 'Hospitals' : 'Hôpitaux'} ({pois.filter(p => p.type === 'hospital').length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <span style={{ color: 'var(--cd-t4)' }}>DEA ({pois.filter(p => p.type === 'aed').length})</span>
                {loc.granted && pois.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>OSM</span>
                )}
              </div>
              {loc.granted && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-3 h-3 text-[#0EA5E9]" />
                    <span style={{ color: 'var(--cd-t4)' }}>
                      {lang === 'EN' ? 'You' : 'Vous'}
                    </span>
                  </div>
                  {loc.position ? (
                    <button
                      onClick={() => {
                        if (mapInstanceRef.current && loc.position) {
                          mapInstanceRef.current.flyTo(loc.position, 15, { duration: 1 });
                        }
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium transition-all"
                      style={{ background: 'rgba(14,165,233,0.15)', color: '#0EA5E9', border: '1px solid rgba(14,165,233,0.3)' }}
                    >
                      {lang === 'EN' ? 'Center' : 'Centrer'}
                    </button>
                  ) : (
                    <span className="text-[10px] animate-pulse" style={{ color: '#0EA5E9' }}>GPS…</span>
                  )}
                </div>
              )}
            </div>
            <div className="pt-1.5" style={{ borderTop: '1px solid var(--cd-bd)' }}>
              <span className="text-[10px]" style={{ color: 'var(--cd-t5)' }}>
                {patients.length} {lang === 'EN' ? 'patients tracked' : 'patients suivis'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom patient strip */}
      <div className="absolute bottom-4 left-4 right-4 z-[1000]">
        <div
          className="rounded-xl p-3 shadow-2xl overflow-x-auto"
          style={{ background: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)', backdropFilter: 'blur(12px)' }}
        >
          {patients.filter((p) => p.riskClass === 'Critical' || p.riskClass === 'At Risk').length === 0 ? (
            <p className="text-xs text-center py-1" style={{ color: 'var(--cd-t4)' }}>
              {loading
                ? lang === 'EN' ? 'Loading patients…' : 'Chargement des patients…'
                : lang === 'EN' ? 'No critical or at-risk patients' : 'Aucun patient critique ou à risque'}
            </p>
          ) : (
            <div className="flex items-center gap-3 min-w-max">
              {patients
                .filter((p) => p.riskClass === 'Critical' || p.riskClass === 'At Risk')
                .slice(0, 8)
                .map((p) => {
                  const color = getRiskColor(p.riskClass);
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/patients/${p.id}`)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:scale-105"
                      style={{ background: `${color}10`, borderColor: `${color}30` }}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {p.avatar}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--cd-t1)' }}>
                          {p.name}
                        </p>
                        <p className="text-xs font-bold" style={{ color }}>
                          {p.aiScore}/100
                        </p>
                      </div>
                      {p.riskClass === 'Critical' && (
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
                      )}
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};