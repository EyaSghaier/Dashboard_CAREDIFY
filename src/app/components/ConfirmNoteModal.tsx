import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, CheckCircle, ChevronRight, FileText, Lightbulb, Send, X } from 'lucide-react';

export interface AlertSummary {
  id: string; patientName: string; type: string;
  severity: 'critical' | 'warning'; aiScore: number;
}

const chips = {
  FR: ['Augmenter les diurétiques','ECG urgent requis','Contacter le patient','Hospitalisation à envisager','Ajuster l\'anticoagulation','Échocardiographie planifiée','Surveillance rapprochée 24h','Bilan biologique urgent','Réduire les bêtabloquants','Consultation anesthésie'],
  EN: ['Increase diuretics','Urgent ECG required','Contact patient','Consider hospitalization','Adjust anticoagulation','Echocardiography scheduled','Close monitoring 24h','Urgent lab workup','Reduce beta-blockers','Anesthesia consultation'],
};

const T = {
  FR: { modalTitle:'Confirmer l\'alerte', modalSubtitle:'Ajoutez une note médicale avant de confirmer.', quickSuggestions:'Suggestions rapides', customNote:'Note personnalisée', notePlaceholder:'Ajoutez vos observations...', confirmWith:'Confirmer avec note', confirmWithout:'Confirmer sans note', cancel:'Annuler', sendToPatient:'Envoyer au patient', sendHint:'Le patient recevra cette note dans sa messagerie', urgencyNotice:'Une alerte d\'urgence sera envoyée automatiquement au patient.' },
  EN: { modalTitle:'Confirm Alert', modalSubtitle:'Add a medical note before confirming.', quickSuggestions:'Quick suggestions', customNote:'Custom note', notePlaceholder:'Add your observations...', confirmWith:'Confirm with note', confirmWithout:'Confirm without note', cancel:'Cancel', sendToPatient:'Send to patient', sendHint:'The patient will receive this note in their messaging', urgencyNotice:'An urgency alert will be automatically sent to the patient.' },
};

interface Props {
  alert: AlertSummary;
  lang: 'FR' | 'EN';
  onConfirm: (note: string, sendToPatient: boolean) => void;
  onClose: () => void;
}

export const ConfirmNoteModal: React.FC<Props> = ({ alert, lang, onConfirm, onClose }) => {
  const tr = T[lang];
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [send, setSend] = useState(true);
  const ref = useRef<HTMLTextAreaElement>(null);
  const accent = alert.severity === 'critical' ? '#EF4444' : '#F59E0B';

  useEffect(() => { setTimeout(() => ref.current?.focus(), 100); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const toggle = (c: string) => setSelected(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
  const build = () => [selected.join(' · '), note.trim()].filter(Boolean).join('\n');
  const hasContent = selected.length > 0 || note.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--cd-bg2)', border: '1px solid var(--cd-bd)' }}>
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg,${accent},#0EA5E9)` }} />
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--cd-bd)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}18` }}>
              <FileText className="w-5 h-5" style={{ color: accent }} />
            </div>
            <div>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--cd-t1)' }}>{tr.modalTitle}</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--cd-t4)' }}>{tr.modalSubtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--cd-t4)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--cd-hv)'; e.currentTarget.style.color = 'var(--cd-t1)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--cd-t4)'; }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Alert summary */}
        <div className="mx-5 mt-4 rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: `${accent}0D`, border: `1px solid ${accent}30` }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: accent }} />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold" style={{ color: 'var(--cd-t1)' }}>{alert.patientName}</span>
            <span className="mx-2 text-xs" style={{ color: 'var(--cd-t5)' }}>·</span>
            <span className="text-xs" style={{ color: accent }}>{alert.type}</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${accent}18`, color: accent }}>{alert.aiScore}/100</span>
        </div>
        {/* Body */}
        <div className="px-5 pt-4 pb-5 space-y-4">
          {/* Chips */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-[#F59E0B]" />
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--cd-t4)' }}>{tr.quickSuggestions}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {chips[lang].map(chip => {
                const on = selected.includes(chip);
                return (
                  <button key={chip} onClick={() => toggle(chip)} className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                    style={on ? { backgroundColor: 'rgba(14,165,233,0.2)', color: '#0EA5E9', border: '1px solid rgba(14,165,233,0.4)' } : { backgroundColor: 'var(--cd-bg3)', color: 'var(--cd-t4)', border: '1px solid var(--cd-bd)' }}>
                    {on && <span className="mr-1">✓</span>}{chip}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Textarea */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="w-3.5 h-3.5" style={{ color: 'var(--cd-t4)' }} />
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--cd-t4)' }}>{tr.customNote}</p>
            </div>
            <textarea ref={ref} value={note} onChange={e => setNote(e.target.value)} placeholder={tr.notePlaceholder} rows={3}
              className="w-full rounded-xl px-3 py-2.5 text-xs resize-none outline-none transition-all"
              style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)', color: 'var(--cd-t2)', caretColor: '#0EA5E9' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(14,165,233,0.5)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--cd-bd)'; }} />
          </div>
          {/* Send toggle */}
          {hasContent && (
            <button onClick={() => setSend(v => !v)} className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 transition-all"
              style={{ backgroundColor: send ? 'rgba(14,165,233,0.08)' : 'var(--cd-bg3)', border: send ? '1px solid rgba(14,165,233,0.3)' : '1px solid var(--cd-bd)' }}>
              <div className="flex items-center gap-2">
                <Send className="w-3.5 h-3.5" style={{ color: send ? '#0EA5E9' : 'var(--cd-t4)' }} />
                <div className="text-left">
                  <p className="text-xs font-medium" style={{ color: send ? '#0EA5E9' : 'var(--cd-t3)' }}>{tr.sendToPatient}</p>
                  <p className="text-[10px]" style={{ color: 'var(--cd-t5)' }}>{tr.sendHint}</p>
                </div>
              </div>
              <div className="w-9 h-5 rounded-full relative transition-all flex-shrink-0" style={{ backgroundColor: send ? '#0EA5E9' : 'var(--cd-bd)' }}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: send ? '17px' : '2px' }} />
              </div>
            </button>
          )}
          {/* Critical notice */}
          {alert.severity === 'critical' && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--cd-t3)' }}>{tr.urgencyNotice}</p>
            </div>
          )}
          {/* Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-medium transition-all"
              style={{ backgroundColor: 'var(--cd-bg3)', color: 'var(--cd-t3)', border: '1px solid var(--cd-bd)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--cd-t1)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--cd-t3)'; }}>
              {tr.cancel}
            </button>
            {!hasContent ? (
              <button onClick={() => onConfirm('', false)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all"
                style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.1)'; }}>
                <CheckCircle className="w-3.5 h-3.5" />{tr.confirmWithout}
              </button>
            ) : (
              <button onClick={() => onConfirm(build(), send)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium ml-auto transition-all"
                style={{ backgroundColor: '#10B981', color: 'white' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#059669'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#10B981'; }}>
                <CheckCircle className="w-3.5 h-3.5" />{tr.confirmWith}<ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
