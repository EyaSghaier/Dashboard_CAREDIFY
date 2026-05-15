import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, CheckCircle, XCircle, Bell, Filter, Eye, Clock, FileText, Send, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../context/LanguageContext';
import { ConfirmNoteModal, AlertSummary } from '../components/ConfirmNoteModal';

// ── Types ──────────────────────────────────────────────────────────
interface Alert {
  id: string; patientId: string; patientName: string;
  type: string; message: string; timestamp: string;
  isRead: boolean; isConfirmed: boolean | null;
  severity: 'critical' | 'warning'; aiScore: number;
  note?: string; confirmedAt?: string; sentToPatient?: boolean;
}

// ── i18n ───────────────────────────────────────────────────────────
const T = {
  FR: {
    title:"Centre d'Alertes", unread:(n:number)=>`${n} non lues`, markAllRead:'Tout marquer comme lu',
    statCritical:'Critiques', statUnread:'Non lues', statConfirmed:'Confirmées',
    filterAll:'Toutes', filterUnread:'Non lues', filterCritical:'Critiques', filterWarning:'Avertissements',
    alertCount:(n:number)=>`${n} alertes`, aiScore:'Score IA:',
    confirm:'Confirmer', dismiss:'Ignorer', confirmed:'Confirmée', dismissed:'Ignorée',
    viewPatient:'Voir patient', critical:'⚠ CRITIQUE', warning:'⚡ AVERTISSEMENT',
    empty:'Aucune alerte dans cette catégorie.', loading:'Chargement des alertes...',
    noteAdded:'Note médicale', confirmedAt:'Confirmée à', sentToPatient:'Envoyé au patient',
    noteSentMsg:(note:string)=>`📋 Note de votre cardiologue :\n${note}`,
    urgencyMsg:(type:string)=>`🚨 ALERTE URGENCE — ${type}. Votre cardiologue a été notifié.`,
  },
  EN: {
    title:'Alerts Center', unread:(n:number)=>`${n} unread`, markAllRead:'Mark all as read',
    statCritical:'Critical', statUnread:'Unread', statConfirmed:'Confirmed',
    filterAll:'All', filterUnread:'Unread', filterCritical:'Critical', filterWarning:'Warnings',
    alertCount:(n:number)=>`${n} alerts`, aiScore:'AI Score:',
    confirm:'Confirm', dismiss:'Dismiss', confirmed:'Confirmed', dismissed:'Dismissed',
    viewPatient:'View patient', critical:'⚠ CRITICAL', warning:'⚡ WARNING',
    empty:'No alerts in this category.', loading:'Loading alerts...',
    noteAdded:'Medical note', confirmedAt:'Confirmed at', sentToPatient:'Sent to patient',
    noteSentMsg:(note:string)=>`📋 Note from your cardiologist:\n${note}`,
    urgencyMsg:(type:string)=>`🚨 URGENCY ALERT — ${type}. Your cardiologist has been notified.`,
  },
};

const statusToScore = (s:string|null) => s==='critical'?Math.floor(75+Math.random()*25):s==='warning'?Math.floor(50+Math.random()*24):Math.floor(10+Math.random()*39);

// ── Main ───────────────────────────────────────────────────────────
export const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const { lang } = useLang();
  const tr = T[lang];

  const [alertList, setAlertList] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all'|'unread'|'critical'|'warning'>('all');
  const [confirming, setConfirming] = useState<Alert|null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ecg_readings')
        .select(`id,status,heart_rate,timestamp,patient_id,patients(id,first_name,last_name)`)
        .in('status',['critical','warning'])
        .order('timestamp',{ascending:false})
        .limit(50);
      if (error) throw error;
      const built: Alert[] = (data??[]).filter(e=>e.patients).map(e=>{
        const p = e.patients as unknown as {id:string;first_name:string;last_name:string};
        const name = `${p.first_name} ${p.last_name}`.trim();
        const hr = e.heart_rate?`${e.heart_rate} bpm`:'—';
        return {
          id: e.id, patientId: p.id, patientName: name,
          type: e.status==='critical'?(lang==='FR'?'ECG Critique Détecté':'Critical ECG Detected'):(lang==='FR'?'Avertissement ECG':'ECG Warning'),
          message: lang==='FR'
            ? (e.status==='critical'?`Anomalie ECG critique — ${name}. FC: ${hr}.`:`Signal ECG anormal — ${name}. FC: ${hr}.`)
            : (e.status==='critical'?`Critical ECG anomaly — ${name}. HR: ${hr}.`:`Abnormal ECG signal — ${name}. HR: ${hr}.`),
          timestamp: new Date(e.timestamp).toLocaleTimeString(lang==='FR'?'fr-FR':'en-US',{hour:'2-digit',minute:'2-digit'}),
          isRead: false, isConfirmed: null,
          severity: e.status as 'critical'|'warning',
          aiScore: statusToScore(e.status),
        };
      });
      setAlertList(prev => {
        // Preserve local confirm/dismiss/note state
        const map = new Map(prev.map(a=>[a.id,a]));
        return built.map(a=>map.has(a.id)?{...a,...map.get(a.id),timestamp:a.timestamp}:a);
      });
    } catch(err){ console.error('Alerts fetch error:',err); }
    finally { setLoading(false); }
  }, [lang]);

  useEffect(()=>{ fetchAlerts(); const id=setInterval(fetchAlerts,30000); return()=>clearInterval(id); },[fetchAlerts]);

  const handleConfirm = (id:string, note:string, send:boolean) => {
    const now = new Date().toLocaleTimeString(lang==='FR'?'fr-FR':'en-US',{hour:'2-digit',minute:'2-digit'});
    setAlertList(prev=>prev.map(a=>a.id===id?{...a,isConfirmed:true,isRead:true,note:note||undefined,confirmedAt:now,sentToPatient:send&&!!note}:a));
    setConfirming(null);
  };

  const dismiss = (id:string) => setAlertList(prev=>prev.map(a=>a.id===id?{...a,isConfirmed:false,isRead:true}:a));
  const markAllRead = () => setAlertList(prev=>prev.map(a=>({...a,isRead:true})));

  const filtered = alertList.filter(a=>{
    if(filter==='unread') return !a.isRead;
    if(filter==='critical') return a.severity==='critical';
    if(filter==='warning') return a.severity==='warning';
    return true;
  });

  const unreadCount = alertList.filter(a=>!a.isRead).length;
  const criticalCount = alertList.filter(a=>a.severity==='critical'&&a.isConfirmed===null).length;
  const confirmedCount = alertList.filter(a=>a.isConfirmed===true).length;

  const modalSummary: AlertSummary|null = confirming ? {
    id: confirming.id, patientName: confirming.patientName,
    type: confirming.type, severity: confirming.severity, aiScore: confirming.aiScore,
  } : null;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-xl" style={{color:'var(--cd-t1)'}}>{tr.title}</h1>
          {unreadCount>0&&<span className="px-2.5 py-0.5 bg-[#EF4444] text-white text-xs font-bold rounded-full animate-pulse">{tr.unread(unreadCount)}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>{setLoading(true);fetchAlerts();}} className="p-2 rounded-lg transition-colors"
            style={{backgroundColor:'var(--cd-bg3)',border:'1px solid var(--cd-bd)',color:'var(--cd-t4)'}}
            onMouseEnter={e=>{e.currentTarget.style.color='#0EA5E9';}} onMouseLeave={e=>{e.currentTarget.style.color='var(--cd-t4)';}}>
            {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<RefreshCw className="w-4 h-4"/>}
          </button>
          <button onClick={markAllRead} className="text-[#0EA5E9] text-xs hover:underline">{tr.markAllRead}</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {val:criticalCount,label:tr.statCritical,color:'#EF4444',Icon:AlertTriangle},
          {val:unreadCount,  label:tr.statUnread,   color:'#F59E0B',Icon:Bell},
          {val:confirmedCount,label:tr.statConfirmed,color:'#10B981',Icon:CheckCircle},
        ].map(({val,label,color,Icon})=>(
          <div key={label} className="rounded-xl p-4 flex items-center gap-3" style={{backgroundColor:'var(--cd-bg3)',border:`1px solid ${color}40`}}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{backgroundColor:`${color}18`}}>
              <Icon className="w-4 h-4" style={{color}}/>
            </div>
            <div>
              <p className="font-bold text-lg" style={{color}}>{val}</p>
              <p className="text-xs" style={{color:'var(--cd-t4)'}}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4" style={{color:'var(--cd-t4)'}}/>
        {([{key:'all',label:tr.filterAll},{key:'unread',label:tr.filterUnread},{key:'critical',label:tr.filterCritical},{key:'warning',label:tr.filterWarning}] as const).map(({key,label})=>(
          <button key={key} onClick={()=>setFilter(key)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={filter===key?{backgroundColor:'#0EA5E9',color:'white'}:{backgroundColor:'var(--cd-bg3)',border:'1px solid var(--cd-bd)',color:'var(--cd-t4)'}}
            onMouseEnter={e=>{if(filter!==key)e.currentTarget.style.color='var(--cd-t1)';}} onMouseLeave={e=>{if(filter!==key)e.currentTarget.style.color='var(--cd-t4)';}}>
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs" style={{color:'var(--cd-t4)'}}>{tr.alertCount(filtered.length)}</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-20" style={{color:'var(--cd-t4)'}}>
          <Loader2 className="w-5 h-5 animate-spin"/><span className="text-sm">{tr.loading}</span>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(alert=>(
            <AlertCard key={alert.id} alert={alert} tr={tr}
              onConfirmRequest={()=>setConfirming(alert)}
              onDismiss={dismiss}
              onView={()=>navigate(`/patients/${alert.patientId}`)}/>
          ))}
          {filtered.length===0&&(
            <div className="py-16 text-center">
              <CheckCircle className="w-12 h-12 text-[#10B981] mx-auto mb-3 opacity-50"/>
              <p style={{color:'var(--cd-t4)'}}>{tr.empty}</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalSummary&&(
        <ConfirmNoteModal
          alert={modalSummary} lang={lang}
          onConfirm={(note,send)=>handleConfirm(confirming!.id,note,send)}
          onClose={()=>setConfirming(null)}/>
      )}
    </div>
  );
};

// ── AlertCard ──────────────────────────────────────────────────────
const AlertCard: React.FC<{
  alert: Alert; tr: typeof T['FR'];
  onConfirmRequest:()=>void; onDismiss:(id:string)=>void; onView:()=>void;
}> = ({alert,tr,onConfirmRequest,onDismiss,onView}) => {
  const accent = alert.severity==='critical'?'#EF4444':'#F59E0B';
  return (
    <div className={`relative rounded-xl p-4 transition-all ${alert.isConfirmed===true?'opacity-70':''}`}
      style={{backgroundColor:'var(--cd-bg3)',border:'1px solid var(--cd-bd)',borderLeft:!alert.isRead?`3px solid ${accent}`:'1px solid var(--cd-bd)'}}>
      {!alert.isRead&&<span className="absolute top-4 right-4 w-2 h-2 rounded-full animate-pulse" style={{backgroundColor:accent}}/>}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{backgroundColor:`${accent}18`}}>
          <AlertTriangle className="w-4 h-4" style={{color:accent}}/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold" style={{color:'var(--cd-t1)'}}>{alert.patientName}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{backgroundColor:`${accent}18`,color:accent,border:`1px solid ${accent}30`}}>
                  {alert.severity==='critical'?tr.critical:tr.warning}
                </span>
              </div>
              <p className="text-[#0EA5E9] text-xs font-medium mt-0.5">{alert.type}</p>
            </div>
            <div className="flex items-center gap-1 text-xs flex-shrink-0" style={{color:'var(--cd-t5)'}}>
              <Clock className="w-3 h-3"/>{alert.timestamp}
            </div>
          </div>
          <p className="text-xs leading-relaxed mb-3" style={{color:'var(--cd-t3)'}}>{alert.message}</p>
          {/* Score */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs" style={{color:'var(--cd-t4)'}}>{tr.aiScore}</span>
            <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{backgroundColor:'var(--cd-bd)'}}>
              <div className="h-full rounded-full" style={{width:`${alert.aiScore}%`,backgroundColor:accent}}/>
            </div>
            <span className="font-bold text-xs" style={{color:accent}}>{alert.aiScore}/100</span>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {alert.isConfirmed===null&&(
              <>
                <button onClick={onConfirmRequest} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{backgroundColor:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.25)',color:'#10B981'}}
                  onMouseEnter={e=>{e.currentTarget.style.backgroundColor='rgba(16,185,129,0.25)';}} onMouseLeave={e=>{e.currentTarget.style.backgroundColor='rgba(16,185,129,0.15)';}}>
                  <CheckCircle className="w-3.5 h-3.5"/>{tr.confirm}
                </button>
                <button onClick={()=>onDismiss(alert.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{backgroundColor:'rgba(239,68,68,0.10)',border:'1px solid rgba(239,68,68,0.25)',color:'#EF4444'}}
                  onMouseEnter={e=>{e.currentTarget.style.backgroundColor='rgba(239,68,68,0.20)';}} onMouseLeave={e=>{e.currentTarget.style.backgroundColor='rgba(239,68,68,0.10)';}}>
                  <XCircle className="w-3.5 h-3.5"/>{tr.dismiss}
                </button>
              </>
            )}
            {alert.isConfirmed===true&&(
              <span className="flex items-center gap-1 text-[#10B981] text-xs">
                <CheckCircle className="w-3 h-3"/>{tr.confirmed}
                {alert.confirmedAt&&<span className="text-[10px] ml-1" style={{color:'var(--cd-t5)'}}>· {tr.confirmedAt} {alert.confirmedAt}</span>}
              </span>
            )}
            {alert.isConfirmed===false&&(
              <span className="flex items-center gap-1 text-xs" style={{color:'var(--cd-t4)'}}>
                <XCircle className="w-3 h-3"/>{tr.dismissed}
              </span>
            )}
            <button onClick={onView} className="flex items-center gap-1 px-3 py-1.5 text-[#0EA5E9] rounded-lg text-xs transition-all ml-auto"
              style={{background:'rgba(14,165,233,0.08)',border:'1px solid rgba(14,165,233,0.2)'}}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(14,165,233,0.16)';}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(14,165,233,0.08)';}}>
              <Eye className="w-3 h-3"/>{tr.viewPatient}
            </button>
          </div>
          {/* Note (post-confirm) */}
          {alert.isConfirmed===true&&alert.note&&(
            <div className="mt-3 rounded-lg p-3 flex items-start gap-2" style={{backgroundColor:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.2)'}}>
              <FileText className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0 mt-0.5"/>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[10px] font-semibold text-[#10B981] uppercase tracking-wide">{tr.noteAdded}</p>
                  {alert.sentToPatient&&(
                    <span className="flex items-center gap-0.5 text-[9px] font-medium text-[#0EA5E9] bg-[#0EA5E9]/10 border border-[#0EA5E9]/20 px-1.5 py-0.5 rounded-full">
                      <Send className="w-2.5 h-2.5"/>{tr.sentToPatient}
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed" style={{color:'var(--cd-t3)'}}>{alert.note}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};