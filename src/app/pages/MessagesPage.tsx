import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Search, Phone, Video, MoreVertical,
  Paperclip, Smile, Loader2, CheckCheck, Star,
  FileText, Download, X, Shield,
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
  isFromMe: boolean;
  isRead: boolean;
}

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: Message[];
  conversationId: string;
  isMyPatient: boolean; // étoile dorée si patient attitré
}

// ── Helpers ────────────────────────────────────────────────────────
const initials = (name: string) => {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

const buildConvId = (a: string, b: string) => [a, b].sort().join('_');

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

  // States & Refs for emoji picker, permissions, and file attachments
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [filePermission, setFilePermission] = useState<boolean>(() => {
    try {
      return localStorage.getItem('caredify_file_permission') === 'true';
    } catch {
      return false;
    }
  });
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: string;
    type: string;
    dataUrl: string;
  } | null>(null);

  const fileInputRef    = useRef<HTMLInputElement>(null);
  const emojiPickerRef  = useRef<HTMLDivElement>(null);
  const emojiButtonRef  = useRef<HTMLButtonElement>(null);

  const doctorUidRef   = useRef<string>('');
  const selectedIdRef  = useRef<string>('');
  const convosRef      = useRef<Conversation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef     = useRef<RealtimeChannel | null>(null);

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { convosRef.current     = convos; },     [convos]);

  const selectedConvo = convos.find((c) => c.id === selectedId);

  // ── 1. Charger conversations ────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      doctorUidRef.current = user.id;

      const now = new Date().toLocaleTimeString(
        lang === 'FR' ? 'fr-FR' : 'en-US',
        { hour: '2-digit', minute: '2-digit' }
      );

      // ── A. Mes patients attitrés (RLS filtre automatiquement) ────
      const { data: myPatients, error: pErr } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
        .order('last_name', { ascending: true });

      if (pErr) console.error('Erreur patients:', pErr);

      const myPatientIds = new Set((myPatients ?? []).map((p) => p.id));

      // Map id → nom pour les patients attitrés
      const myPatientMap = new Map(
        (myPatients ?? []).map((p) => [
          p.id,
          `${p.first_name} ${p.last_name}`,
        ])
      );

      // ── B. Patients ayant déjà envoyé un message au docteur ──────
      // On récupère les conversations distinctes où receiver_id = doctorId
      const { data: incomingMsgs, error: mErr } = await supabase
        .from('messages')
        .select('conversation_id, sender_id, content, created_at')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });

      if (mErr) console.error('Erreur messages entrants:', mErr);

      // Déduplication : garder le dernier message par sender
      const seenSenders = new Set<string>();
      const otherPatientMsgs: {
        senderId: string;
        convId: string;
        lastContent: string;
        lastTime: string;
      }[] = [];

      for (const m of incomingMsgs ?? []) {
        const sid = m.sender_id as string;
        // Exclure mes patients attitrés (déjà couverts) et moi-même
        if (!seenSenders.has(sid) && !myPatientIds.has(sid) && sid !== user.id) {
          seenSenders.add(sid);
          otherPatientMsgs.push({
            senderId:    sid,
            convId:      m.conversation_id,
            lastContent: m.content,
            lastTime:    fmtTime(m.created_at, lang),
          });
        }
      }

      // Récupérer les noms des "autres patients" depuis profiles
      const otherIds = otherPatientMsgs.map((m) => m.senderId);
      let otherNamesMap = new Map<string, string>();

      if (otherIds.length > 0) {
        // Essayer d'abord dans patients (cas où le patient existe mais n'est pas attitré)
        const { data: otherPatientsData } = await supabase
          .from('patients')
          .select('id, first_name, last_name')
          .in('id', otherIds);

        for (const p of otherPatientsData ?? []) {
          otherNamesMap.set(p.id, `${p.first_name} ${p.last_name}`);
        }

        // Pour ceux non trouvés dans patients, chercher dans profiles
        const missingIds = otherIds.filter((id) => !otherNamesMap.has(id));
        if (missingIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', missingIds);

          for (const p of profilesData ?? []) {
            otherNamesMap.set(p.id, p.full_name ?? 'Patient inconnu');
          }
        }
      }

      // ── C. Construire les Conversation[] ────────────────────────

      // Patients attitrés
      const myPatientConvos: Conversation[] = (myPatients ?? []).map((p) => ({
        id:             p.id,
        name:           `${p.first_name} ${p.last_name}`,
        avatar:         initials(`${p.first_name} ${p.last_name}`),
        lastMessage:    lang === 'FR' ? 'Démarrer une conversation' : 'Start a conversation',
        lastTime:       now,
        unread:         0,
        messages:       [],
        conversationId: buildConvId(user.id, p.id),
        isMyPatient:    true,
      }));

      // Autres patients (qui ont envoyé un message)
      const otherConvos: Conversation[] = otherPatientMsgs.map((m) => ({
        id:             m.senderId,
        name:           otherNamesMap.get(m.senderId) ?? 'Patient inconnu',
        avatar:         initials(otherNamesMap.get(m.senderId) ?? '?'),
        lastMessage:    m.lastContent,
        lastTime:       m.lastTime,
        unread:         0,
        messages:       [],
        conversationId: m.convId,
        isMyPatient:    false,
      }));

      const all = [...myPatientConvos, ...otherConvos];

      // ── D. Enrichir : lastMessage + unread pour chaque conv ──────
      const enriched = await Promise.all(
        all.map(async (conv) => {
          try {
            const { data: lastMsgs } = await supabase
              .from('messages')
              .select('content, created_at')
              .eq('conversation_id', conv.conversationId)
              .order('created_at', { ascending: false })
              .limit(1);

            const { data: unreadData } = await supabase
              .from('messages')
              .select('id')
              .eq('conversation_id', conv.conversationId)
              .eq('receiver_id', user.id)
              .eq('is_read', false);

            const last = lastMsgs?.[0];
            return {
              ...conv,
              lastMessage: last?.content     ?? conv.lastMessage,
              lastTime:    last
                ? fmtTime(last.created_at, lang)
                : conv.lastTime,
              unread: unreadData?.length ?? 0,
            };
          } catch {
            return conv;
          }
        })
      );

      // ── E. Trier : patients attitrés en premier, puis par unread ─
      enriched.sort((a, b) => {
        if (a.isMyPatient && !b.isMyPatient) return -1;
        if (!a.isMyPatient && b.isMyPatient) return 1;
        if (b.unread !== a.unread) return b.unread - a.unread;
        return a.name.localeCompare(b.name);
      });

      setConvos(enriched);
      if (enriched.length > 0) setSelectedId(enriched[0].id);
      setLoading(false);
    };

    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const myUid = doctorUidRef.current;
      const msgs: Message[] = (data ?? []).map((m) => ({
        id:        m.id,
        senderId:  m.sender_id,
        content:   m.content,
        timestamp: fmtTime(m.created_at, lang),
        isFromMe:  m.sender_id === myUid,
        isRead:    m.is_read,
      }));

      const unread   = msgs.filter((m) => !m.isFromMe && !m.isRead).length;
      const lastData = data?.[data.length - 1];

      setConvos((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? {
                ...c,
                messages:    msgs,
                unread,
                lastMessage: lastData?.content ?? c.lastMessage,
                lastTime:    lastData
                  ? fmtTime(lastData.created_at, lang)
                  : c.lastTime,
              }
            : c
        )
      );

      if (data && data.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', selectedConvo.conversationId)
          .eq('receiver_id', myUid)
          .eq('is_read', false);
      }

      setMsgsLoading(false);
    };

    loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ── 3. Realtime ─────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedConvo?.conversationId || !doctorUidRef.current) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const convId = selectedConvo.conversationId;
    const myUid  = doctorUidRef.current;

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
            id: string; sender_id: string; content: string;
            created_at: string; is_read: boolean;
          };
          const isFromMe = m.sender_id === myUid;
          const newMsg: Message = {
            id:        m.id,
            senderId:  m.sender_id,
            content:   m.content,
            timestamp: fmtTime(m.created_at, lang),
            isFromMe,
            isRead:    m.is_read,
          };

          setConvos((prev) => {
            // Si la conversation existe déjà, on l'update
            const exists = prev.some((c) => c.conversationId === convId);
            if (exists) {
              return prev.map((c) =>
                c.conversationId === convId
                  ? {
                      ...c,
                      messages:    [...c.messages, newMsg],
                      lastMessage: newMsg.content,
                      lastTime:    newMsg.timestamp,
                      unread: (!isFromMe && c.id !== selectedIdRef.current)
                        ? c.unread + 1 : c.unread,
                    }
                  : c
              );
            }
            // Sinon, nouveau patient non attitré → l'ajouter dynamiquement
            return prev;
          });

          if (!isFromMe) {
            supabase.from('messages').update({ is_read: true }).eq('id', m.id);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConvo?.conversationId]);

  // ── Realtime global : détecter nouveaux patients qui écrivent ───
  useEffect(() => {
    if (!doctorUidRef.current) return;

    const myUid = doctorUidRef.current;

    const globalChannel = supabase
      .channel(`inbox:${myUid}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'messages',
          filter: `receiver_id=eq.${myUid}`,
        },
        async (payload) => {
          const m = payload.new as {
            id: string; sender_id: string; content: string;
            created_at: string; conversation_id: string;
          };

          const existsAlready = convosRef.current.some(
            (c) => c.id === m.sender_id
          );
          if (existsAlready) return; // déjà géré par le canal de conv

          // Nouveau patient inconnu → récupérer son nom et l'ajouter
          let name = 'Patient inconnu';
          const { data: pd } = await supabase
            .from('patients')
            .select('first_name, last_name')
            .eq('id', m.sender_id)
            .maybeSingle();

          if (pd) {
            name = `${pd.first_name} ${pd.last_name}`;
          } else {
            const { data: prof } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', m.sender_id)
              .maybeSingle();
            if (prof) name = prof.full_name ?? name;
          }

          const newConvo: Conversation = {
            id:             m.sender_id,
            name,
            avatar:         initials(name),
            lastMessage:    m.content,
            lastTime:       fmtTime(m.created_at, doctorUidRef.current as unknown as 'FR' | 'EN'),
            unread:         1,
            messages:       [],
            conversationId: m.conversation_id,
            isMyPatient:    false,
          };

          setConvos((prev) => {
            // Double-check
            if (prev.some((c) => c.id === m.sender_id)) return prev;
            // Insérer après les patients attitrés
            const myIdx = prev.filter((c) => c.isMyPatient).length;
            const next = [...prev];
            next.splice(myIdx, 0, newConvo);
            return next;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(globalChannel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 4. Auto-scroll ──────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConvo?.messages.length]);

  // ── 5. Close emoji picker on outside click ───────────────────────
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formatBytes = (bytes: number, decimals = 1) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedFile({
          name: file.name,
          size: formatBytes(file.size),
          type: file.type,
          dataUrl: event.target.result as string,
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePaperclipClick = () => {
    if (!filePermission) {
      setShowPermissionModal(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const grantFilePermission = () => {
    try {
      localStorage.setItem('caredify_file_permission', 'true');
    } catch {}
    setFilePermission(true);
    setShowPermissionModal(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 150);
  };

  // ── 5. Envoyer message ──────────────────────────────────────────
  const sendMessage = async () => {
    const textContent = inputText.trim();
    const myUid   = doctorUidRef.current;
    const convo   = convosRef.current.find((c) => c.id === selectedIdRef.current);
    if ((!textContent && !selectedFile) || !convo || !myUid) return;

    let content = textContent;
    if (selectedFile) {
      if (selectedFile.type.startsWith('image/')) {
        content = `[IMAGE:${selectedFile.name}|${selectedFile.dataUrl}]${textContent ? ` ${textContent}` : ''}`;
      } else {
        content = `[FILE:${selectedFile.name}|${selectedFile.size}|${selectedFile.dataUrl}]${textContent ? ` ${textContent}` : ''}`;
      }
    }

    setInputText('');
    setSelectedFile(null);
    const { error } = await supabase.from('messages').insert({
      conversation_id: convo.conversationId,
      sender_id:       myUid,
      receiver_id:     convo.id,
      content,
    });
    if (error) { 
      console.error('Erreur envoi:', error); 
      setInputText(textContent); 
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const markAsRead = async (convo: Conversation) => {
    setConvos((prev) =>
      prev.map((c) => c.id === convo.id ? { ...c, unread: 0 } : c)
    );
    const myUid = doctorUidRef.current;
    if (!myUid) return;
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', convo.conversationId)
      .eq('receiver_id', myUid)
      .eq('is_read', false);
  };

  const filteredConvos = convos.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = convos.reduce((s, c) => s + c.unread, 0);

  // ── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center"
        style={{ backgroundColor: 'var(--cd-bg1)' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--cd-t4)' }} />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex h-full" style={{ backgroundColor: 'var(--cd-bg1)' }}>

      {/* ══════════════════════════════════════════
          Sidebar
      ══════════════════════════════════════════ */}
      <div
        className={`${selectedId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 lg:w-80 flex-shrink-0`}
        style={{ backgroundColor: 'var(--cd-bg2)', borderRight: '1px solid var(--cd-bd)' }}
      >
        {/* Header */}
        <div className="p-4" style={{ borderBottom: '1px solid var(--cd-bd)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base" style={{ color: 'var(--cd-t1)' }}>
              Messages
            </h2>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 text-[10px] rounded-full font-bold"
                style={{ background: '#0EA5E9', color: '#fff' }}>
                {totalUnread} non lu{totalUnread > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Légende */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5">
              <div className="relative w-5 h-5">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#0284c7]" />
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center">
                  <Star className="w-1.5 h-1.5 text-white fill-white" />
                </span>
              </div>
              <span className="text-[10px]" style={{ color: 'var(--cd-t5)' }}>
                {lang === 'FR' ? 'Mes patients' : 'My patients'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#0284c7]" />
              <span className="text-[10px]" style={{ color: 'var(--cd-t5)' }}>
                {lang === 'FR' ? 'Autres patients' : 'Other patients'}
              </span>
            </div>
          </div>

          {/* Recherche */}
          <div className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
            <Search className="w-3.5 h-3.5" style={{ color: 'var(--cd-t5)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'FR' ? 'Rechercher un patient...' : 'Search a patient...'}
              className="bg-transparent text-xs outline-none w-full"
              style={{ color: 'var(--cd-t3)' }}
            />
          </div>
        </div>

        {/* Compteurs */}
        <div className="px-4 py-2 flex items-center gap-2"
          style={{ borderBottom: '1px solid var(--cd-bd)' }}>
          <span className="text-[11px]" style={{ color: 'var(--cd-t5)' }}>
            {convos.filter((c) => c.isMyPatient).length}
            {' '}{lang === 'FR' ? 'patients attitrés' : 'assigned patients'}
          </span>
          <span style={{ color: 'var(--cd-bd)' }}>·</span>
          <span className="text-[11px]" style={{ color: 'var(--cd-t5)' }}>
            {convos.filter((c) => !c.isMyPatient).length}
            {' '}{lang === 'FR' ? 'autres' : 'others'}
          </span>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {filteredConvos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <p className="text-xs" style={{ color: 'var(--cd-t5)' }}>
                {lang === 'FR' ? 'Aucun patient trouvé' : 'No patient found'}
              </p>
            </div>
          ) : (
            filteredConvos.map((convo, idx) => {
              // Séparateur entre patients attitrés et autres
              const prevConvo = filteredConvos[idx - 1];
              const showSeparator =
                idx > 0 &&
                !convo.isMyPatient &&
                prevConvo.isMyPatient;

              return (
                <React.Fragment key={convo.id}>
                  {showSeparator && (
                    <div className="px-4 py-1.5 flex items-center gap-2"
                      style={{ backgroundColor: 'var(--cd-bg1)' }}>
                      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--cd-bd)' }} />
                      <span className="text-[10px] font-medium"
                        style={{ color: 'var(--cd-t5)' }}>
                        {lang === 'FR' ? 'Autres patients' : 'Other patients'}
                      </span>
                      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--cd-bd)' }} />
                    </div>
                  )}

                  <button
                    onClick={() => { setSelectedId(convo.id); markAsRead(convo); }}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors"
                    style={{
                      backgroundColor: selectedId === convo.id ? 'var(--cd-bg3)' : 'transparent',
                      borderBottom:    '1px solid var(--cd-bd2)',
                      borderLeft: selectedId === convo.id
                        ? '2px solid #0EA5E9'
                        : convo.isMyPatient
                          ? '2px solid rgba(251,191,36,0.5)'
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
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#0284c7] flex items-center justify-center text-white text-xs font-bold">
                        {convo.avatar}
                      </div>
                      {/* Étoile patients attitrés */}
                      {convo.isMyPatient && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                          <Star className="w-2.5 h-2.5 text-white fill-white" />
                        </span>
                      )}
                      {/* Point en ligne */}
                      <span
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                        style={{
                          backgroundColor: '#10B981',
                          borderColor:     'var(--cd-bg2)',
                        }}
                      />
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
                          {convo.name}
                        </span>
                        <span className="text-[10px] flex-shrink-0 ml-1"
                          style={{ color: 'var(--cd-t5)' }}>
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
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          Zone de chat
      ══════════════════════════════════════════ */}
      {selectedConvo ? (
        <div className={`${selectedId ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>

          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ backgroundColor: 'var(--cd-bg2)', borderBottom: '1px solid var(--cd-bd)' }}
          >
            <div className="flex items-center gap-3">
              <button className="md:hidden mr-1" style={{ color: 'var(--cd-t4)' }}
                onClick={() => setSelectedId('')}>←</button>

              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#0284c7] flex items-center justify-center text-white text-xs font-bold">
                  {selectedConvo.avatar}
                </div>
                {selectedConvo.isMyPatient && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                    <Star className="w-2.5 h-2.5 text-white fill-white" />
                  </span>
                )}
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#10B981] rounded-full border-2"
                  style={{ borderColor: 'var(--cd-bg2)' }}
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--cd-t1)' }}>
                    {selectedConvo.name}
                  </p>
                  {selectedConvo.isMyPatient ? (
                    <span
                      className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full"
                      style={{
                        backgroundColor: 'rgba(251,191,36,0.15)',
                        color:           '#F59E0B',
                        border:          '1px solid rgba(251,191,36,0.3)',
                      }}
                    >
                      {lang === 'FR' ? 'Mon patient' : 'My patient'}
                    </span>
                  ) : (
                    <span
                      className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full"
                      style={{
                        backgroundColor: 'rgba(14,165,233,0.1)',
                        color:           '#0EA5E9',
                        border:          '1px solid rgba(14,165,233,0.25)',
                      }}
                    >
                      {lang === 'FR' ? 'Patient' : 'Patient'}
                    </span>
                  )}
                </div>
                <p className="text-[#10B981] text-xs">
                  {lang === 'FR' ? 'En ligne' : 'Online'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {[Phone, Video, MoreVertical].map((Icon, i) => (
                <button key={i} className="p-2 rounded-lg transition-colors"
                  style={{ color: 'var(--cd-t4)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--cd-hv)';
                    e.currentTarget.style.color           = 'var(--cd-t1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color           = 'var(--cd-t4)';
                  }}>
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--cd-bd)' }} />
              <span className="text-xs px-2" style={{ color: 'var(--cd-t5)' }}>
                {lang === 'FR' ? "Aujourd'hui" : 'Today'}
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--cd-bd)' }} />
            </div>

            {msgsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--cd-t4)' }} />
              </div>
            ) : selectedConvo.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'var(--cd-bg3)' }}>
                  <Send className="w-5 h-5" style={{ color: 'var(--cd-t5)' }} />
                </div>
                <p className="text-xs text-center" style={{ color: 'var(--cd-t5)' }}>
                  {lang === 'FR'
                    ? `Démarrez votre conversation avec ${selectedConvo.name}`
                    : `Start your conversation with ${selectedConvo.name}`}
                </p>
              </div>
            ) : (
              selectedConvo.messages.map((msg) => (
                <div key={msg.id}
                  className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}>

                  {!msg.isFromMe && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#0284c7] flex items-center justify-center text-white text-[10px] font-bold mr-2 flex-shrink-0 self-end">
                      {selectedConvo.avatar.slice(0, 1)}
                    </div>
                  )}

                  <div
                    className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${msg.isFromMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                    style={{
                      background: msg.isFromMe
                        ? 'linear-gradient(135deg, #0EA5E9, #0284c7)'
                        : 'var(--cd-hv)',
                    }}
                  >
                    {(() => {
                      const imageMatch = msg.content.match(/^\[IMAGE:(.*?)\|(.*?)\](.*)$/s);
                      const fileMatch = msg.content.match(/^\[FILE:(.*?)\|(.*?)\|(.*?)\](.*)$/s);

                      if (imageMatch) {
                        const [_, name, url, text] = imageMatch;
                        return (
                          <div className="flex flex-col gap-2 max-w-full">
                            <div className="relative group overflow-hidden rounded-xl border border-white/10 shadow-md">
                              <img 
                                src={url} 
                                alt={name} 
                                className="max-w-xs max-h-60 object-cover cursor-pointer hover:scale-[1.02] transition-transform duration-200 rounded-xl"
                                onClick={() => {
                                  // Open raw base64 or URL in new tab
                                  const newTab = window.open();
                                  if (newTab) newTab.document.write(`<img src="${url}" style="max-width:100%" />`);
                                }}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 pointer-events-none rounded-xl">
                                <span className="text-white text-xs font-semibold px-2.5 py-1 bg-black/60 rounded-md backdrop-blur-sm">
                                  {lang === 'FR' ? 'Afficher' : 'View'}
                                </span>
                              </div>
                            </div>
                            {text.trim() && (
                              <p className={`text-sm leading-relaxed ${msg.isFromMe ? 'text-white' : ''}`} style={!msg.isFromMe ? { color: 'var(--cd-t1)' } : undefined}>
                                {text}
                              </p>
                            )}
                          </div>
                        );
                      }

                      if (fileMatch) {
                        const [_, name, size, url, text] = fileMatch;
                        return (
                          <div className="flex flex-col gap-2 max-w-full">
                            <a 
                              href={url} 
                              download={name}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                msg.isFromMe
                                  ? 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                                  : 'border-var(--cd-bd) hover:opacity-90'
                              }`}
                              style={!msg.isFromMe ? { backgroundColor: 'var(--cd-bg3)', borderColor: 'var(--cd-bd)' } : undefined}
                            >
                              <div className={`p-2 rounded-lg ${msg.isFromMe ? 'bg-white/10 text-white' : 'bg-[#0EA5E9]/10 text-[#0EA5E9]'}`}>
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-xs font-bold truncate max-w-[120px] sm:max-w-[180px]" style={msg.isFromMe ? { color: '#ffffff' } : { color: 'var(--cd-t1)' }}>
                                  {name}
                                </p>
                                <p className="text-[10px] opacity-70" style={msg.isFromMe ? { color: 'rgba(255,255,255,0.7)' } : { color: 'var(--cd-t4)' }}>
                                  {size}
                                </p>
                              </div>
                              <div className={`p-1.5 rounded-full ${msg.isFromMe ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10'}`}>
                                <Download className="w-3.5 h-3.5" />
                              </div>
                            </a>
                            {text.trim() && (
                              <p className={`text-sm leading-relaxed ${msg.isFromMe ? 'text-white' : ''}`} style={!msg.isFromMe ? { color: 'var(--cd-t1)' } : undefined}>
                                {text}
                              </p>
                            )}
                          </div>
                        );
                      }

                      return (
                        <p
                          className={`text-sm leading-relaxed ${msg.isFromMe ? 'text-white' : ''}`}
                          style={!msg.isFromMe ? { color: 'var(--cd-t1)' } : undefined}
                        >
                          {msg.content}
                        </p>
                      );
                    })()}
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px]"
                        style={
                          msg.isFromMe
                            ? { color: 'rgba(191,219,254,0.7)' }
                            : { color: 'var(--cd-t4)' }
                        }>
                        {msg.timestamp}
                      </span>
                      {msg.isFromMe && (
                        <CheckCheck className="w-3 h-3"
                          style={{
                            color: msg.isRead
                              ? 'rgba(191,219,254,1)'
                              : 'rgba(191,219,254,0.35)',
                          }} />
                      )}
                    </div>
                  </div>

                  {msg.isFromMe && (
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
          <div className="px-4 py-3 relative"
            style={{ backgroundColor: 'var(--cd-bg2)', borderTop: '1px solid var(--cd-bd)' }}>
            
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Selected File Preview Card */}
            {selectedFile && (
              <div className="flex items-center gap-3 p-2 mb-2.5 rounded-xl border border-[#0EA5E9]/35 bg-[#0EA5E9]/5 animate-fadeIn">
                {selectedFile.type.startsWith('image/') ? (
                  <img 
                    src={selectedFile.dataUrl} 
                    alt="Preview" 
                    className="w-10 h-10 object-cover rounded-lg border border-white/10" 
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#0EA5E9]/10 text-[#0EA5E9] flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold truncate text-[var(--cd-t1)]">{selectedFile.name}</p>
                  <p className="text-[10px] text-[var(--cd-t4)]">{selectedFile.size}</p>
                </div>
                <button 
                  onClick={() => setSelectedFile(null)}
                  className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[var(--cd-t4)] hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                style={{
                  position: 'absolute',
                  bottom: '72px',
                  right: '16px',
                  zIndex: 50,
                  borderRadius: '16px',
                  padding: '12px',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                  width: '296px',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'var(--cd-bg3)',
                  border: '1px solid var(--cd-bd)',
                  backdropFilter: 'blur(16px)',
                  animation: 'cd-fadeIn 0.15s ease-out',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid var(--cd-bd)',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cd-t1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Smile style={{ width: '14px', height: '14px', color: '#0EA5E9' }} />
                    {lang === 'FR' ? 'Choisir un émoji' : 'Select Emoji'}
                  </span>
                  <button
                    onClick={() => setShowEmojiPicker(false)}
                    style={{ padding: '4px', borderRadius: '50%', color: 'var(--cd-t4)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <X style={{ width: '14px', height: '14px' }} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px', overflowY: 'auto', maxHeight: '192px', padding: '4px' }}>
                  {[
                    '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇',
                    '🙂','😉','😌','😍','🥰','😘','😗','😙','😚','😋',
                    '😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳',
                    '😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖',
                    '😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯',
                    '😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔',
                    '👋','🤚','🖐️','✋','🖖','👌','🤏','✌️','🤞','🤟',
                    '🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊',
                    '👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪',
                    '🏥','🩺','💊','💉','🩹','🫀','🫁','🧠','🩸','🤒',
                    '🤕','😷','⚕️','❤️','💖','💙','💚','💛','💜','🧡',
                  ].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setInputText((prev) => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      style={{
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease, background-color 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--cd-hv)';
                        e.currentTarget.style.transform = 'scale(1.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ backgroundColor: 'var(--cd-bg3)', border: '1px solid var(--cd-bd)' }}>
              <button 
                onClick={handlePaperclipClick}
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
                ref={emojiButtonRef}
                onClick={() => setShowEmojiPicker((v) => !v)}
                className="p-1 transition-colors"
                style={{ color: showEmojiPicker ? '#0EA5E9' : 'var(--cd-t4)', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#0EA5E9'; }}
                onMouseLeave={(e) => { if (!showEmojiPicker) e.currentTarget.style.color = 'var(--cd-t4)'; }}
              >
                <Smile className="w-4 h-4" />
              </button>
              <button
                onClick={sendMessage}
                disabled={!inputText.trim() && !selectedFile}
                className="p-1.5 rounded-lg transition-all disabled:opacity-40"
                style={{
                  background: (inputText.trim() || selectedFile)
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
        <div className="hidden md:flex flex-1 items-center justify-center"
          style={{ color: 'var(--cd-t4)' }}>
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--cd-bg3)' }}>
              <Send className="w-7 h-7" style={{ color: 'var(--cd-t5)' }} />
            </div>
            <p>
              {lang === 'FR' ? 'Sélectionnez une conversation' : 'Select a conversation'}
            </p>
          </div>
        </div>
      )}

      {/* File access permission modal */}
      {showPermissionModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
            animation: 'cd-fadeIn 0.2s ease-out',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPermissionModal(false); }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '28px 24px',
              borderRadius: '20px',
              boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
              border: '1px solid var(--cd-bd)',
              textAlign: 'center',
              backgroundColor: 'var(--cd-bg3)',
              animation: 'cd-scaleUp 0.2s ease-out',
            }}
          >
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(14,165,233,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(14,165,233,0.3)' }}>
              <Shield style={{ width: '26px', height: '26px', color: '#0EA5E9' }} />
            </div>

            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '10px', color: 'var(--cd-t1)' }}>
              {lang === 'FR' ? "Autorisation d'accès aux fichiers" : 'File Sharing Access Requested'}
            </h3>

            <p style={{ fontSize: '12px', marginBottom: '24px', color: 'var(--cd-t4)', lineHeight: 1.6 }}>
              {lang === 'FR'
                ? "Pour envoyer des rapports d'ECG, des ordonnances ou des images de suivi, Caredify requiert votre permission pour lire les fichiers locaux. Vos documents sont chiffrés et transmis en toute sécurité."
                : 'To send ECG records, prescriptions, or follow-up images, Caredify requires your permission to read local files. Your documents are encrypted and transmitted securely.'}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowPermissionModal(false)}
                style={{
                  padding: '8px 18px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '12px',
                  border: '1px solid var(--cd-bd)',
                  color: 'var(--cd-t3)',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                {lang === 'FR' ? 'Refuser' : 'Deny'}
              </button>

              <button
                onClick={grantFilePermission}
                style={{
                  padding: '8px 22px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#fff',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0EA5E9, #0284c7)',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(14,165,233,0.35)',
                }}
              >
                {lang === 'FR' ? "Autoriser l'accès" : 'Allow Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};