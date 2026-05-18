import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Search, Phone, Video, MoreVertical,
  Paperclip, Smile, Loader2, CheckCheck,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { supabase } from '../../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ── Types ──────────────────────────────────────────────────────────
interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isFromDoctor: boolean;
  isRead: boolean;
}

interface Conversation {
  id: string;           // patients.id = auth UUID du patient
  patientName: string;
  patientAvatar: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: Message[];
  conversationId: string; // sort([doctorId, patientId]).join('_')
}

// ── Helpers ────────────────────────────────────────────────────────
const initials = (fn: string, ln: string) =>
  `${fn?.[0] ?? ''}${ln?.[0] ?? ''}`.toUpperCase();

const buildConvId = (a: string, b: string) =>
  [a, b].sort().join('_');

const fmtTime = (iso: string, lang: 'FR' | 'EN') =>
  new Date(iso).toLocaleTimeString(lang === 'FR' ? 'fr-FR' : 'en-US', {
    hour: '2-digit', minute: '2-digit',
  });

// ── Component ──────────────────────────────────────────────────────
export const MessagesPage: React.FC = () => {
  const { lang } = useLang();

  const [convos, setConvos]           = useState<Conversation[]>([]);
  const [loading, setLoading]         = useState(true);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [selectedId, setSelectedId]   = useState<string>('');
  const [inputText, setInputText]     = useState('');
  const [search, setSearch]           = useState('');

  // ✅ Refs pour éviter les closures stale
  const doctorUidRef  = useRef<string>('');
  const selectedIdRef = useRef<string>('');
  const convosRef     = useRef<Conversation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef     = useRef<RealtimeChannel | null>(null);

  // Sync refs
  useEffect(() => { selectedIdRef.current = selectedId; },  [selectedId]);
  useEffect(() => { convosRef.current     = convos; },      [convos]);

  const selectedConvo = convos.find((c) => c.id === selectedId);

  // ── 1. Charger patients du cardiologue ──────────────────────────
  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // ✅ Stocker l'UUID du docteur dans le ref
      doctorUidRef.current = user.id;

      // RLS filtre automatiquement — seulement SES patients
      const { data: patients, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
        .order('last_name', { ascending: true });

      if (error) {
        console.error('Erreur chargement patients:', error);
        setLoading(false);
        return;
      }

      const now = new Date().toLocaleTimeString(
        lang === 'FR' ? 'fr-FR' : 'en-US',
        { hour: '2-digit', minute: '2-digit' }
      );

      const built: Conversation[] = (patients ?? []).map((p) => ({
        id:             p.id,   // ✅ patients.id = auth UUID du patient
        patientName:    `${p.first_name} ${p.last_name}`,
        patientAvatar:  initials(p.first_name, p.last_name),
        lastMessage:    lang === 'FR' ? 'Démarrer une conversation' : 'Start a conversation',
        lastTime:       now,
        unread:         0,
        messages:       [],
        conversationId: buildConvId(user.id, p.id), // ✅ patients.id
      }));

      setConvos(built);
      if (built.length > 0) setSelectedId(built[0].id);
      setLoading(false);
    };

    fetchPatients();
  }, [lang]);

  // ── 2. Charger historique quand conv sélectionnée ───────────────
  useEffect(() => {
    if (!selectedId || !selectedConvo || !doctorUidRef.current) return;

    const loadHistory = async () => {
      setMsgsLoading(true);

      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at, is_read')
        .eq('conversation_id', selectedConvo.conversationId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Erreur historique:', error);
        setMsgsLoading(false);
        return;
      }

      const doctorUid = doctorUidRef.current;
      const msgs: Message[] = (data ?? []).map((m) => ({
        id:           m.id,
        senderId:     m.sender_id,
        content:      m.content,
        timestamp:    fmtTime(m.created_at, lang),
        isFromDoctor: m.sender_id === doctorUid,
        isRead:       m.is_read,
      }));

      const unread   = msgs.filter((m) => !m.isFromDoctor && !m.isRead).length;
      const lastData = data?.[data.length - 1];

      setConvos((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? {
                ...c,
                messages:    msgs,
                unread,
                lastMessage: lastData?.content    ?? c.lastMessage,
                lastTime:    lastData
                  ? fmtTime(lastData.created_at, lang)
                  : c.lastTime,
              }
            : c
        )
      );

      // Marquer les messages reçus comme lus
      if (data && data.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', selectedConvo.conversationId)
          .eq('receiver_id', doctorUid)
          .eq('is_read', false);
      }

      setMsgsLoading(false);
    };

    loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ── 3. Realtime — écouter les nouveaux messages ─────────────────
  useEffect(() => {
    if (!selectedConvo?.conversationId || !doctorUidRef.current) return;

    // Désabonner l'ancien canal
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const convId    = selectedConvo.conversationId;
    const doctorUid = doctorUidRef.current;

    const channel = supabase
      .channel(`conv:${convId}:${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'messages',
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          const m = payload.new as {
            id: string;
            sender_id: string;
            content: string;
            created_at: string;
            is_read: boolean;
          };

          const isFromDoctor = m.sender_id === doctorUid;

          const newMsg: Message = {
            id:           m.id,
            senderId:     m.sender_id,
            content:      m.content,
            timestamp:    fmtTime(m.created_at, lang),
            isFromDoctor,
            isRead:       m.is_read,
          };

          const currentSelectedId = selectedIdRef.current;

          setConvos((prev) =>
            prev.map((c) =>
              c.conversationId === convId
                ? {
                    ...c,
                    messages:    [...c.messages, newMsg],
                    lastMessage: newMsg.content,
                    lastTime:    newMsg.timestamp,
                    unread: (!isFromDoctor && c.id !== currentSelectedId)
                      ? c.unread + 1
                      : c.unread,
                  }
                : c
            )
          );

          // Auto-marquer lu si message du patient et conv active
          if (!isFromDoctor) {
            supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', m.id);
          }
        }
      )
      .subscribe((status) => {
        console.log(`Realtime [${convId}]:`, status);
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConvo?.conversationId]);

  // ── 4. Auto-scroll ──────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConvo?.messages.length]);

  // ── 5. Envoyer message ──────────────────────────────────────────
  const sendMessage = async () => {
    const content   = inputText.trim();
    const doctorUid = doctorUidRef.current;
    const convo     = convosRef.current.find((c) => c.id === selectedIdRef.current);

    if (!content || !convo || !doctorUid) {
      console.warn('sendMessage bloqué:', {
        hasContent:   !!content,
        hasConvo:     !!convo,
        hasDoctorUid: !!doctorUid,
      });
      return;
    }

    setInputText('');

    const { error } = await supabase.from('messages').insert({
      conversation_id: convo.conversationId,
      sender_id:       doctorUid,
      receiver_id:     convo.id,   // ✅ patients.id = auth UUID du patient
      content,
    });

    if (error) {
      console.error('Erreur envoi message:', error);
      setInputText(content); // remettre si erreur
    }
    // Le message revient via Realtime — pas de setState ici
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredConvos = convos.filter((c) =>
    c.patientName.toLowerCase().includes(search.toLowerCase())
  );

  const markAsRead = async (convo: Conversation) => {
    setConvos((prev) =>
      prev.map((c) => c.id === convo.id ? { ...c, unread: 0 } : c)
    );
    const doctorUid = doctorUidRef.current;
    if (!doctorUid) return;
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', convo.conversationId)
      .eq('receiver_id', doctorUid)
      .eq('is_read', false);
  };

  // ── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ backgroundColor: 'var(--cd-bg1)' }}
      >
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--cd-t4)' }} />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex h-full" style={{ backgroundColor: 'var(--cd-bg1)' }}>

      {/* ════════════════════════════════════════════
          Liste des conversations
      ════════════════════════════════════════════ */}
      <div
        className={`${selectedId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 lg:w-80 flex-shrink-0`}
        style={{ backgroundColor: 'var(--cd-bg2)', borderRight: '1px solid var(--cd-bd)' }}
      >
        {/* Header liste */}
        <div className="p-4" style={{ borderBottom: '1px solid var(--cd-bd)' }}>
          <h2 className="font-bold text-base mb-3" style={{ color: 'var(--cd-t1)' }}>
            Messages
            <span
              className="ml-2 px-1.5 py-0.5 text-[10px] rounded-full"
              style={{
                background: 'rgba(14,165,233,0.12)',
                color:      '#0EA5E9',
                border:     '1px solid rgba(14,165,233,0.25)',
              }}
            >
              {convos.length}
            </span>
          </h2>
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}
          >
            <Search className="w-3.5 h-3.5" style={{ color: 'var(--cd-t5)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'FR' ? 'Rechercher...' : 'Search...'}
              className="bg-transparent text-xs outline-none w-full"
              style={{ color: 'var(--cd-t3)' }}
            />
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {filteredConvos.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-xs" style={{ color: 'var(--cd-t5)' }}>
                {lang === 'FR' ? 'Aucun patient trouvé' : 'No patients found'}
              </p>
            </div>
          ) : (
            filteredConvos.map((convo) => (
              <button
                key={convo.id}
                onClick={() => { setSelectedId(convo.id); markAsRead(convo); }}
                className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors"
                style={{
                  backgroundColor: selectedId === convo.id ? 'var(--cd-bg3)' : 'transparent',
                  borderBottom:    '1px solid var(--cd-bd2)',
                  borderLeft:      selectedId === convo.id
                    ? '2px solid #0EA5E9'
                    : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (selectedId !== convo.id)
                    e.currentTarget.style.backgroundColor = 'var(--cd-hv)';
                }}
                onMouseLeave={(e) => {
                  if (selectedId !== convo.id)
                    e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#0284c7] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {convo.patientAvatar}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className="text-sm truncate"
                      style={{
                        color:      'var(--cd-t1)',
                        fontWeight: convo.unread > 0 ? 700 : 500,
                      }}
                    >
                      {convo.patientName}
                    </span>
                    <span
                      className="text-[10px] flex-shrink-0 ml-1"
                      style={{ color: 'var(--cd-t5)' }}
                    >
                      {convo.lastTime}
                    </span>
                  </div>
                  <p
                    className="text-xs truncate"
                    style={{
                      color:      convo.unread > 0 ? 'var(--cd-t1)' : 'var(--cd-t4)',
                      fontWeight: convo.unread > 0 ? 600 : 400,
                    }}
                  >
                    {convo.lastMessage}
                  </p>
                </div>

                {/* Badge non-lu */}
                {convo.unread > 0 && (
                  <span className="w-4 h-4 bg-[#0EA5E9] text-white text-[10px] rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {convo.unread}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          Zone de chat
      ════════════════════════════════════════════ */}
      {selectedConvo ? (
        <div className={`${selectedId ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>

          {/* Header chat */}
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ backgroundColor: 'var(--cd-bg2)', borderBottom: '1px solid var(--cd-bd)' }}
          >
            <div className="flex items-center gap-3">
              <button
                className="md:hidden mr-1"
                style={{ color: 'var(--cd-t4)' }}
                onClick={() => setSelectedId('')}
              >←</button>
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#0284c7] flex items-center justify-center text-white text-xs font-bold">
                  {selectedConvo.patientAvatar}
                </div>
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#10B981] rounded-full border-2"
                  style={{ borderColor: 'var(--cd-bg2)' }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--cd-t1)' }}>
                  {selectedConvo.patientName}
                </p>
                <p className="text-[#10B981] text-xs">
                  {lang === 'FR' ? 'En ligne' : 'Online'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {[Phone, Video, MoreVertical].map((Icon, i) => (
                <button
                  key={i}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--cd-t4)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--cd-hv)';
                    e.currentTarget.style.color           = 'var(--cd-t1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color           = 'var(--cd-t4)';
                  }}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

            {/* Séparateur date */}
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--cd-bd)' }} />
              <span className="text-xs px-2" style={{ color: 'var(--cd-t5)' }}>
                {lang === 'FR' ? "Aujourd'hui" : 'Today'}
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--cd-bd)' }} />
            </div>

            {/* États */}
            {msgsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--cd-t4)' }} />
              </div>
            ) : selectedConvo.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'var(--cd-bg3)' }}
                >
                  <Send className="w-5 h-5" style={{ color: 'var(--cd-t5)' }} />
                </div>
                <p className="text-xs text-center" style={{ color: 'var(--cd-t5)' }}>
                  {lang === 'FR'
                    ? `Démarrez votre conversation avec ${selectedConvo.patientName}`
                    : `Start your conversation with ${selectedConvo.patientName}`}
                </p>
              </div>
            ) : (
              selectedConvo.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isFromDoctor ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Avatar patient */}
                  {!msg.isFromDoctor && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#0284c7] flex items-center justify-center text-white text-[10px] font-bold mr-2 flex-shrink-0 self-end">
                      {selectedConvo.patientAvatar.slice(0, 1)}
                    </div>
                  )}

                  {/* Bulle */}
                  <div
                    className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                      msg.isFromDoctor ? 'rounded-br-sm' : 'rounded-bl-sm'
                    }`}
                    style={{
                      background: msg.isFromDoctor
                        ? 'linear-gradient(135deg, #0EA5E9, #0284c7)'
                        : 'var(--cd-hv)',
                    }}
                  >
                    <p
                      className={`text-sm leading-relaxed ${msg.isFromDoctor ? 'text-white' : ''}`}
                      style={!msg.isFromDoctor ? { color: 'var(--cd-t1)' } : undefined}
                    >
                      {msg.content}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span
                        className="text-[10px]"
                        style={
                          msg.isFromDoctor
                            ? { color: 'rgba(191,219,254,0.7)' }
                            : { color: 'var(--cd-t4)' }
                        }
                      >
                        {msg.timestamp}
                      </span>
                      {/* Indicateur lu/non-lu */}
                      {msg.isFromDoctor && (
                        <CheckCheck
                          className="w-3 h-3"
                          style={{
                            color: msg.isRead
                              ? 'rgba(191,219,254,1)'
                              : 'rgba(191,219,254,0.35)',
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Avatar docteur */}
                  {msg.isFromDoctor && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-white text-[10px] font-bold ml-2 flex-shrink-0 self-end">
                      Dr
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="px-4 py-3"
            style={{ backgroundColor: 'var(--cd-bg2)', borderTop: '1px solid var(--cd-bd)' }}
          >
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}
            >
              <button
                className="p-1 transition-colors"
                style={{ color: 'var(--cd-t4)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cd-t1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cd-t4)'; }}
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={lang === 'FR' ? 'Écrire un message...' : 'Write a message...'}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--cd-t1)' }}
              />

              <button
                className="p-1 transition-colors"
                style={{ color: 'var(--cd-t4)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cd-t1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cd-t4)'; }}
              >
                <Smile className="w-4 h-4" />
              </button>

              <button
                onClick={sendMessage}
                disabled={!inputText.trim()}
                className="p-1.5 rounded-lg transition-all disabled:opacity-40"
                style={{
                  background: inputText.trim()
                    ? 'linear-gradient(135deg, #0EA5E9, #0284c7)'
                    : 'var(--cd-hv)',
                }}
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>

            <p className="text-[10px] text-center mt-1.5" style={{ color: 'var(--cd-t5)' }}>
              {lang === 'FR'
                ? 'Entrée pour envoyer · Shift+Entrée pour nouvelle ligne'
                : 'Enter to send · Shift+Enter for new line'}
            </p>
          </div>
        </div>
      ) : (
        /* Aucune conversation sélectionnée */
        <div
          className="hidden md:flex flex-1 items-center justify-center"
          style={{ color: 'var(--cd-t4)' }}
        >
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--cd-bg3)' }}
            >
              <Send className="w-7 h-7" style={{ color: 'var(--cd-t5)' }} />
            </div>
            <p>
              {lang === 'FR' ? 'Sélectionnez une conversation' : 'Select a conversation'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};