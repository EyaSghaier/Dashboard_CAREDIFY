import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { MapPin, Activity, Loader2, RefreshCw } from 'lucide-react';
import { hospitalLocations, aedLocations } from '../data/mockData';
import { supabase } from '../../lib/supabase';
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

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
  const navigate = useNavigate();
  const { lang } = useLang();
  const { theme } = useTheme();

  const [mapReady, setMapReady] = useState(false);
  const [patients, setPatients] = useState<MapPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const leafletLoadedRef = useRef(false);

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

  // ── Init map ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return;

    const L = window.L;

    const map = L.map(mapRef.current, {
      center: parisBase,
      zoom: 12,
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

    // ── Static markers: hospitals ──────────────────────────────────
    hospitalLocations.forEach((h) => {
      const icon = L.divIcon({
        html: `<div style="width:30px;height:30px;background:#3B82F6;border-radius:8px;border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px rgba(59,130,246,0.5);font-size:14px;">🏥</div>`,
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      L.marker(h.location, { icon }).addTo(map).bindPopup(`
        <div style="background:#111827;color:white;border-radius:8px;padding:10px;border:1px solid #1F2937;font-family:system-ui">
          <strong style="font-size:12px">${h.name}</strong><br>
          <span style="color:#3B82F6;font-size:11px">${lang === 'EN' ? 'Hospital' : 'Établissement hospitalier'}</span>
        </div>
      `);
    });

    // ── Static markers: AEDs ───────────────────────────────────────
    aedLocations.forEach((a) => {
      const icon = L.divIcon({
        html: `<div style="width:26px;height:26px;background:#F59E0B;border-radius:6px;border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px rgba(245,158,11,0.5);font-size:12px;">⚡</div>`,
        className: '',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker(a.location, { icon }).addTo(map).bindPopup(`
        <div style="background:#111827;color:white;border-radius:8px;padding:10px;border:1px solid #1F2937;font-family:system-ui">
          <strong style="font-size:12px">${a.name}</strong><br>
          <span style="color:#F59E0B;font-size:11px">${lang === 'EN' ? 'Automated defibrillator' : 'Défibrillateur automatique'}</span>
        </div>
      `);
    });

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
                  {lang === 'EN' ? 'Hospitals' : 'Hôpitaux'} ({hospitalLocations.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <span style={{ color: 'var(--cd-t4)' }}>DEA ({aedLocations.length})</span>
              </div>
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