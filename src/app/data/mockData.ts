export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'M' | 'F';
  condition: string;
  diagnosis: string;
  lastECG: string;
  aiScore: number;
  riskClass: 'Normal' | 'At Risk' | 'Critical';
  heartRate: number;
  bloodPressure: string;
  ejectionFraction: number;
  admissionDate: string;
  phone: string;
  email: string;
  location: [number, number];
  alertStatus: 'Active' | 'Stable' | 'Monitoring';
  riskHistory: { date: string; score: number }[];
  alertTimeline: { time: string; type: string; message: string; severity: 'info' | 'warning' | 'critical' }[];
  avatar: string;
}

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  type: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  isConfirmed: boolean | null;
  severity: 'warning' | 'critical';
  aiScore: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isFromDoctor: boolean;
}

export interface Conversation {
  id: string;
  patientId: string;
  patientName: string;
  patientAvatar: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: Message[];
}

const generateRiskHistory = (baseScore: number): { date: string; score: number }[] => {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  return days.map((day, i) => ({
    date: day,
    score: Math.max(0, Math.min(100, baseScore + (Math.random() - 0.5) * 20 - i * 0.5)),
  }));
};

export const patients: Patient[] = [
  {
    id: 'p1',
    name: 'Jean Dupont',
    age: 67,
    gender: 'M',
    condition: 'Insuffisance cardiaque',
    diagnosis: 'Insuffisance cardiaque congestive NYHA III',
    lastECG: 'il y a 2 min',
    aiScore: 88,
    riskClass: 'Critical',
    heartRate: 112,
    bloodPressure: '158/98',
    ejectionFraction: 28,
    admissionDate: '12 Avr 2026',
    phone: '+33 6 12 34 56 78',
    email: 'jean.dupont@email.fr',
    location: [48.8566, 2.3522],
    alertStatus: 'Active',
    avatar: 'JD',
    riskHistory: generateRiskHistory(88),
    alertTimeline: [
      { time: '14:32', type: 'ECG Anomalie', message: 'Tachycardie ventriculaire détectée', severity: 'critical' },
      { time: '13:15', type: 'IA Score', message: 'Score de risque augmenté de 78 à 88', severity: 'critical' },
      { time: '11:00', type: 'Alerte', message: 'Pression artérielle élevée: 158/98 mmHg', severity: 'warning' },
      { time: '09:20', type: 'Info', message: 'Contrôle matinal effectué', severity: 'info' },
    ],
  },
  {
    id: 'p2',
    name: 'Marie Bernard',
    age: 54,
    gender: 'F',
    condition: 'Fibrillation auriculaire',
    diagnosis: 'FA paroxystique, anticoagulation en cours',
    lastECG: 'il y a 8 min',
    aiScore: 72,
    riskClass: 'At Risk',
    heartRate: 94,
    bloodPressure: '142/88',
    ejectionFraction: 42,
    admissionDate: '18 Avr 2026',
    phone: '+33 6 23 45 67 89',
    email: 'marie.bernard@email.fr',
    location: [48.8706, 2.3522],
    alertStatus: 'Monitoring',
    avatar: 'MB',
    riskHistory: generateRiskHistory(72),
    alertTimeline: [
      { time: '14:05', type: 'ECG', message: 'Arythmie légère enregistrée', severity: 'warning' },
      { time: '10:30', type: 'IA Score', message: 'Score stabilisé à 72', severity: 'warning' },
      { time: '08:45', type: 'Info', message: 'Médicament administré — Bisoprolol 5mg', severity: 'info' },
    ],
  },
  {
    id: 'p3',
    name: 'Ahmed Khalil',
    age: 71,
    gender: 'M',
    condition: 'Cardiomyopathie dilatée',
    diagnosis: 'CMD idiopathique, FEVG 22%',
    lastECG: 'il y a 1 min',
    aiScore: 91,
    riskClass: 'Critical',
    heartRate: 118,
    bloodPressure: '165/102',
    ejectionFraction: 22,
    admissionDate: '08 Avr 2026',
    phone: '+33 6 34 56 78 90',
    email: 'ahmed.khalil@email.fr',
    location: [48.8400, 2.3800],
    alertStatus: 'Active',
    avatar: 'AK',
    riskHistory: generateRiskHistory(91),
    alertTimeline: [
      { time: '14:45', type: 'Critique', message: 'Score AI ≥ 90 — Intervention urgente requise', severity: 'critical' },
      { time: '13:50', type: 'ECG Anomalie', message: 'Bloc de branche gauche détecté', severity: 'critical' },
      { time: '12:20', type: 'Alerte', message: 'Dyspnée sévère signalée par le patient', severity: 'critical' },
      { time: '09:10', type: 'Info', message: 'Échocardiographie programmée pour demain', severity: 'info' },
    ],
  },
  {
    id: 'p4',
    name: 'Sophie Martin',
    age: 45,
    gender: 'F',
    condition: 'Hypertension',
    diagnosis: 'HTA essentielle contrôlée',
    lastECG: 'il y a 22 min',
    aiScore: 28,
    riskClass: 'Normal',
    heartRate: 68,
    bloodPressure: '128/82',
    ejectionFraction: 62,
    admissionDate: '25 Avr 2026',
    phone: '+33 6 45 67 89 01',
    email: 'sophie.martin@email.fr',
    location: [48.8800, 2.3200],
    alertStatus: 'Stable',
    avatar: 'SM',
    riskHistory: generateRiskHistory(28),
    alertTimeline: [
      { time: '11:00', type: 'Info', message: 'Paramètres vitaux dans la norme', severity: 'info' },
      { time: '09:30', type: 'Info', message: 'ECG de routine effectué', severity: 'info' },
    ],
  },
  {
    id: 'p5',
    name: 'Pierre Moreau',
    age: 63,
    gender: 'M',
    condition: 'Angine instable',
    diagnosis: 'Angine instable post-angioplastie',
    lastECG: 'il y a 15 min',
    aiScore: 65,
    riskClass: 'At Risk',
    heartRate: 82,
    bloodPressure: '138/85',
    ejectionFraction: 48,
    admissionDate: '20 Avr 2026',
    phone: '+33 6 56 78 90 12',
    email: 'pierre.moreau@email.fr',
    location: [48.8300, 2.3100],
    alertStatus: 'Monitoring',
    avatar: 'PM',
    riskHistory: generateRiskHistory(65),
    alertTimeline: [
      { time: '13:40', type: 'Alerte', message: 'Douleur thoracique légère rapportée', severity: 'warning' },
      { time: '11:25', type: 'ECG', message: 'Légère déviation ST observée', severity: 'warning' },
      { time: '08:00', type: 'Info', message: 'Aspirine 100mg administrée', severity: 'info' },
    ],
  },
  {
    id: 'p6',
    name: 'Fatima Benali',
    age: 58,
    gender: 'F',
    condition: 'Insuffisance cardiaque',
    diagnosis: 'ICC NYHA II, FEVG préservée',
    lastECG: 'il y a 35 min',
    aiScore: 34,
    riskClass: 'Normal',
    heartRate: 72,
    bloodPressure: '132/78',
    ejectionFraction: 58,
    admissionDate: '22 Avr 2026',
    phone: '+33 6 67 89 01 23',
    email: 'fatima.benali@email.fr',
    location: [48.8650, 2.3900],
    alertStatus: 'Stable',
    avatar: 'FB',
    riskHistory: generateRiskHistory(34),
    alertTimeline: [
      { time: '10:15', type: 'Info', message: 'Contrôle de poids: stable', severity: 'info' },
      { time: '08:30', type: 'Info', message: 'Bonne tolérance à l\'effort', severity: 'info' },
    ],
  },
  {
    id: 'p7',
    name: 'François Lambert',
    age: 76,
    gender: 'M',
    condition: 'Sténose aortique',
    diagnosis: 'Sténose aortique sévère pré-TAVI',
    lastECG: 'il y a 4 min',
    aiScore: 85,
    riskClass: 'Critical',
    heartRate: 108,
    bloodPressure: '152/96',
    ejectionFraction: 32,
    admissionDate: '10 Avr 2026',
    phone: '+33 6 78 90 12 34',
    email: 'francois.lambert@email.fr',
    location: [48.8500, 2.2900],
    alertStatus: 'Active',
    avatar: 'FL',
    riskHistory: generateRiskHistory(85),
    alertTimeline: [
      { time: '14:20', type: 'Critique', message: 'Syncope signalée — Évaluation urgente', severity: 'critical' },
      { time: '12:35', type: 'ECG Anomalie', message: 'PR prolongé détecté', severity: 'critical' },
      { time: '10:50', type: 'Alerte', message: 'Œdème des membres inférieurs aggravé', severity: 'warning' },
    ],
  },
  {
    id: 'p8',
    name: 'Isabelle Petit',
    age: 52,
    gender: 'F',
    condition: 'Bloc auriculo-ventriculaire',
    diagnosis: 'BAV du 2ème degré Mobitz I',
    lastECG: 'il y a 18 min',
    aiScore: 68,
    riskClass: 'At Risk',
    heartRate: 58,
    bloodPressure: '122/75',
    ejectionFraction: 55,
    admissionDate: '21 Avr 2026',
    phone: '+33 6 89 01 23 45',
    email: 'isabelle.petit@email.fr',
    location: [48.8750, 2.4100],
    alertStatus: 'Monitoring',
    avatar: 'IP',
    riskHistory: generateRiskHistory(68),
    alertTimeline: [
      { time: '13:00', type: 'ECG', message: 'Allongement PR progressif noté', severity: 'warning' },
      { time: '11:15', type: 'Info', message: 'Holter ECG 24h en cours', severity: 'info' },
    ],
  },
  {
    id: 'p9',
    name: 'Carlos Santos',
    age: 69,
    gender: 'M',
    condition: 'Post-infarctus',
    diagnosis: 'Post-IDM 6 mois, rééducation cardiaque',
    lastECG: 'il y a 42 min',
    aiScore: 42,
    riskClass: 'Normal',
    heartRate: 64,
    bloodPressure: '125/78',
    ejectionFraction: 52,
    admissionDate: '24 Avr 2026',
    phone: '+33 6 90 12 34 56',
    email: 'carlos.santos@email.fr',
    location: [48.8200, 2.3400],
    alertStatus: 'Stable',
    avatar: 'CS',
    riskHistory: generateRiskHistory(42),
    alertTimeline: [
      { time: '09:45', type: 'Info', message: 'Séance de rééducation complétée', severity: 'info' },
      { time: '08:15', type: 'Info', message: 'Paramètres dans la norme', severity: 'info' },
    ],
  },
  {
    id: 'p10',
    name: 'Nadia Rousseau',
    age: 48,
    gender: 'F',
    condition: 'Péricardite',
    diagnosis: 'Péricardite récidivante sous traitement',
    lastECG: 'il y a 28 min',
    aiScore: 57,
    riskClass: 'At Risk',
    heartRate: 88,
    bloodPressure: '135/84',
    ejectionFraction: 60,
    admissionDate: '23 Avr 2026',
    phone: '+33 6 01 23 45 67',
    email: 'nadia.rousseau@email.fr',
    location: [48.8600, 2.3300],
    alertStatus: 'Monitoring',
    avatar: 'NR',
    riskHistory: generateRiskHistory(57),
    alertTimeline: [
      { time: '12:10', type: 'Alerte', message: 'Douleur péricardique légère', severity: 'warning' },
      { time: '10:00', type: 'Info', message: 'Colchicine administrée', severity: 'info' },
    ],
  },
  {
    id: 'p11',
    name: 'Michel Lefebvre',
    age: 73,
    gender: 'M',
    condition: 'Arythmie ventriculaire',
    diagnosis: 'Tachycardie ventriculaire récidivante',
    lastECG: 'il y a 1 min',
    aiScore: 93,
    riskClass: 'Critical',
    heartRate: 136,
    bloodPressure: '172/108',
    ejectionFraction: 18,
    admissionDate: '07 Avr 2026',
    phone: '+33 6 12 34 56 79',
    email: 'michel.lefebvre@email.fr',
    location: [48.8700, 2.3600],
    alertStatus: 'Active',
    avatar: 'ML',
    riskHistory: generateRiskHistory(93),
    alertTimeline: [
      { time: '14:50', type: 'Critique', message: 'TV non soutenue détectée — Choc ICD déclenché', severity: 'critical' },
      { time: '14:12', type: 'Critique', message: 'Score AI: 93 — Alerte maximale', severity: 'critical' },
      { time: '13:30', type: 'ECG Anomalie', message: 'Ectopie ventriculaire fréquente', severity: 'critical' },
      { time: '11:00', type: 'Info', message: 'Amiodarone IV en cours', severity: 'info' },
    ],
  },
  {
    id: 'p12',
    name: 'Claire Dubois',
    age: 61,
    gender: 'F',
    condition: 'Hypertension',
    diagnosis: 'HTA avec hypertrophie VG légère',
    lastECG: 'il y a 55 min',
    aiScore: 31,
    riskClass: 'Normal',
    heartRate: 70,
    bloodPressure: '130/80',
    ejectionFraction: 64,
    admissionDate: '26 Avr 2026',
    phone: '+33 6 23 45 67 90',
    email: 'claire.dubois@email.fr',
    location: [48.8450, 2.3700],
    alertStatus: 'Stable',
    avatar: 'CD',
    riskHistory: generateRiskHistory(31),
    alertTimeline: [
      { time: '10:30', type: 'Info', message: 'Tension artérielle bien contrôlée', severity: 'info' },
      { time: '09:00', type: 'Info', message: 'Amlodipine 5mg administrée', severity: 'info' },
    ],
  },
];

export const alerts: Alert[] = [
  {
    id: 'a1', patientId: 'p11', patientName: 'Michel Lefebvre',
    type: 'Tachycardie ventriculaire',
    message: 'TV non soutenue détectée, FC 136bpm. Choc ICD déclenché automatiquement.',
    timestamp: 'il y a 2 min', isRead: false, isConfirmed: null, severity: 'critical', aiScore: 93,
  },
  {
    id: 'a2', patientId: 'p3', patientName: 'Ahmed Khalil',
    type: 'Score AI Critique',
    message: 'Score de risque IA atteint 91/100. Bloc de branche gauche nouveau détecté.',
    timestamp: 'il y a 5 min', isRead: false, isConfirmed: null, severity: 'critical', aiScore: 91,
  },
  {
    id: 'a3', patientId: 'p1', patientName: 'Jean Dupont',
    type: 'Arythmie',
    message: 'Tachycardie sinusale persistante à 112bpm. FEVG 28% — surveillance rapprochée.',
    timestamp: 'il y a 8 min', isRead: false, isConfirmed: null, severity: 'critical', aiScore: 88,
  },
  {
    id: 'a4', patientId: 'p7', patientName: 'François Lambert',
    type: 'Syncope',
    message: 'Épisode de syncope signalé par l\'infirmière. Évaluation urgente requise.',
    timestamp: 'il y a 12 min', isRead: false, isConfirmed: null, severity: 'critical', aiScore: 85,
  },
  {
    id: 'a5', patientId: 'p2', patientName: 'Marie Bernard',
    type: 'Fibrillation auriculaire',
    message: 'Récidive de FA détectée. FC irrégulière entre 88 et 110bpm.',
    timestamp: 'il y a 18 min', isRead: true, isConfirmed: null, severity: 'warning', aiScore: 72,
  },
  {
    id: 'a6', patientId: 'p8', patientName: 'Isabelle Petit',
    type: 'BAV progressif',
    message: 'Allongement progressif du PR. Bloc du 2ème degré confirmé.',
    timestamp: 'il y a 24 min', isRead: true, isConfirmed: null, severity: 'warning', aiScore: 68,
  },
  {
    id: 'a7', patientId: 'p5', patientName: 'Pierre Moreau',
    type: 'Douleur thoracique',
    message: 'Patient signale douleur thoracique légère (3/10). ECG: légère déviation ST.',
    timestamp: 'il y a 31 min', isRead: true, isConfirmed: true, severity: 'warning', aiScore: 65,
  },
  {
    id: 'a8', patientId: 'p10', patientName: 'Nadia Rousseau',
    type: 'Péricardite',
    message: 'Douleur péricardique légère. Pas de signe de tamponnade.',
    timestamp: 'il y a 45 min', isRead: true, isConfirmed: null, severity: 'warning', aiScore: 57,
  },
];

export const conversations: Conversation[] = [
  {
    id: 'c1', patientId: 'p1', patientName: 'Jean Dupont', patientAvatar: 'JD',
    lastMessage: 'Je ressens des palpitations depuis ce matin',
    lastTime: '14:35', unread: 2,
    messages: [
      { id: 'm1', senderId: 'p1', senderName: 'Jean Dupont', content: 'Bonjour Docteur, je me sens moins bien aujourd\'hui.', timestamp: '09:15', isFromDoctor: false },
      { id: 'm2', senderId: 'doctor', senderName: 'Dr. Moreau', content: 'Bonjour M. Dupont. Décrivez-moi vos symptômes s\'il vous plaît.', timestamp: '09:20', isFromDoctor: true },
      { id: 'm3', senderId: 'p1', senderName: 'Jean Dupont', content: 'J\'ai des difficultés à respirer quand je monte les escaliers. Et j\'ai les chevilles gonflées.', timestamp: '09:25', isFromDoctor: false },
      { id: 'm4', senderId: 'doctor', senderName: 'Dr. Moreau', content: 'Merci pour ces informations. Je vais ajuster votre traitement. Restez au repos et évitez tout effort. Je vous examine cet après-midi.', timestamp: '09:30', isFromDoctor: true },
      { id: 'm5', senderId: 'p1', senderName: 'Jean Dupont', content: 'Merci Docteur. Je ressens des palpitations depuis ce matin', timestamp: '14:35', isFromDoctor: false },
    ],
  },
  {
    id: 'c2', patientId: 'p3', patientName: 'Ahmed Khalil', patientAvatar: 'AK',
    lastMessage: 'D\'accord docteur, je reste tranquille.',
    lastTime: '13:52', unread: 0,
    messages: [
      { id: 'm6', senderId: 'doctor', senderName: 'Dr. Moreau', content: 'Bonjour M. Khalil. Votre score de risque est très élevé aujourd\'hui. Comment vous sentez-vous?', timestamp: '11:00', isFromDoctor: true },
      { id: 'm7', senderId: 'p3', senderName: 'Ahmed Khalil', content: 'J\'ai du mal à respirer et je me sens très fatigué.', timestamp: '11:10', isFromDoctor: false },
      { id: 'm8', senderId: 'doctor', senderName: 'Dr. Moreau', content: 'C\'est préoccupant. Je viens vous voir dans 30 minutes. Ne bougez pas du lit.', timestamp: '11:12', isFromDoctor: true },
      { id: 'm9', senderId: 'p3', senderName: 'Ahmed Khalil', content: 'D\'accord docteur, je reste tranquille.', timestamp: '13:52', isFromDoctor: false },
    ],
  },
  {
    id: 'c3', patientId: 'p2', patientName: 'Marie Bernard', patientAvatar: 'MB',
    lastMessage: 'J\'ai pris mes médicaments ce matin.',
    lastTime: '12:20', unread: 1,
    messages: [
      { id: 'm10', senderId: 'p2', senderName: 'Marie Bernard', content: 'Bonjour Docteur, est-ce que je peux prendre une douche aujourd\'hui?', timestamp: '08:30', isFromDoctor: false },
      { id: 'm11', senderId: 'doctor', senderName: 'Dr. Moreau', content: 'Oui, mais une douche tiède courte uniquement. Pas de bain.', timestamp: '08:45', isFromDoctor: true },
      { id: 'm12', senderId: 'p2', senderName: 'Marie Bernard', content: 'J\'ai pris mes médicaments ce matin.', timestamp: '12:20', isFromDoctor: false },
    ],
  },
  {
    id: 'c4', patientId: 'p7', patientName: 'François Lambert', patientAvatar: 'FL',
    lastMessage: 'Je me sens un peu mieux maintenant.',
    lastTime: '14:25', unread: 0,
    messages: [
      { id: 'm13', senderId: 'p7', senderName: 'François Lambert', content: 'Docteur, j\'ai fait un malaise tout à l\'heure.', timestamp: '14:22', isFromDoctor: false },
      { id: 'm14', senderId: 'doctor', senderName: 'Dr. Moreau', content: 'Je suis au courant. L\'équipe infirmière est avec vous. Je viens immédiatement.', timestamp: '14:23', isFromDoctor: true },
      { id: 'm15', senderId: 'p7', senderName: 'François Lambert', content: 'Je me sens un peu mieux maintenant.', timestamp: '14:25', isFromDoctor: false },
    ],
  },
  {
    id: 'c5', patientId: 'p4', patientName: 'Sophie Martin', patientAvatar: 'SM',
    lastMessage: 'Merci pour les informations !',
    lastTime: '11:30', unread: 0,
    messages: [
      { id: 'm16', senderId: 'doctor', senderName: 'Dr. Moreau', content: 'Bonjour Mme Martin. Vos résultats d\'aujourd\'hui sont très bons!', timestamp: '11:00', isFromDoctor: true },
      { id: 'm17', senderId: 'p4', senderName: 'Sophie Martin', content: 'Merci pour les informations !', timestamp: '11:30', isFromDoctor: false },
    ],
  },
];

export const hospitalLocations = [
  { id: 'h1', name: 'Hôpital Lariboisière', location: [48.8794, 2.3569] as [number, number], type: 'hospital' },
  { id: 'h2', name: 'Hôpital Saint-Louis', location: [48.8720, 2.3640] as [number, number], type: 'hospital' },
  { id: 'h3', name: 'Hôpital Bichat', location: [48.8975, 2.3331] as [number, number], type: 'hospital' },
  { id: 'h4', name: 'CHU Necker', location: [48.8474, 2.3178] as [number, number], type: 'hospital' },
];

export const aedLocations = [
  { id: 'aed1', name: 'DAE — Gare du Nord', location: [48.8809, 2.3553] as [number, number], type: 'aed' },
  { id: 'aed2', name: 'DAE — Centre Pompidou', location: [48.8606, 2.3522] as [number, number], type: 'aed' },
  { id: 'aed3', name: 'DAE — Tour Eiffel', location: [48.8584, 2.2945] as [number, number], type: 'aed' },
  { id: 'aed4', name: 'DAE — Opéra Garnier', location: [48.8719, 2.3316] as [number, number], type: 'aed' },
  { id: 'aed5', name: 'DAE — Place de la Bastille', location: [48.8533, 2.3692] as [number, number], type: 'aed' },
];
