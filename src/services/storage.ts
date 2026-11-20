import { ChantierDb, Site, Worker, Team, Material, MaterialMovement, Equipment, SiteLog, Advance, AttendanceRecord, DailyExpense, ExpenseCategory, CashInflow, CashAudit, RecruitmentLevel, Task, AppLicense } from '../types';

const STORAGE_KEY = 'chantierpro_db_v2';
const LEGACY_STORAGE_KEY = 'chantierpro';

export const RECRUITMENT_LEVELS: { level: RecruitmentLevel; label: string; short: string; badgeColor: string; description: string; expBenchmark: string }[] = [
  {
    level: 'Niveau 1 — Manœuvre / Débutant',
    label: 'Niveau 1 — Manœuvre / Débutant',
    short: 'N1 Manœuvre',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    description: 'Tâches simples d’exécution, manutention, aide aux équipes, préparation des postes.',
    expBenchmark: '0 à 2 ans'
  },
  {
    level: 'Niveau 2 — Ouvrier Professionnel (OP1)',
    label: 'Niveau 2 — Ouvrier Professionnel (OP1)',
    short: 'N2 Pro (OP1)',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    description: 'Exécution autonome des travaux courants du métier sous directives techniques régulières.',
    expBenchmark: '2 à 5 ans'
  },
  {
    level: 'Niveau 3 — Compagnon Professionnel (OP2)',
    label: 'Niveau 3 — Compagnon Professionnel (OP2)',
    short: 'N3 Compagnon (OP2)',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-300',
    description: 'Haute qualification technique, lecture de plans complexes, finitions soignées, autonomie complète.',
    expBenchmark: '5 à 10 ans'
  },
  {
    level: 'Niveau 4 — Maître Ouvrier / Chef d\'Équipe',
    label: 'Niveau 4 — Maître Ouvrier / Chef d\'Équipe',
    short: 'N4 Chef d\'Équipe',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-300',
    description: 'Encadrement d’équipe, organisation du poste de travail, contrôle qualité & sécurité BTP.',
    expBenchmark: '8+ ans'
  }
];

export const CRAFTS_LIST = [
  'Maçonnerie',
  'Coffrage',
  'Ferraillage',
  'Béton armé',
  'Plomberie & Sanitaire',
  'Électricité & Réseaux',
  'Plâtrerie & Faux-plafond',
  'Carrelage & Revêtement',
  'Peinture & Enduit',
  'Menuiserie Bois/Alu',
  'Étanchéité & Isolation',
  'Terrassement & VRD',
  'Chauffage & CVC',
  'Manœuvre & Aide',
  'Chef d’équipe / Conducteur'
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Carburant & Énergie',
  'Petit Outillage & Quincaillerie',
  'Transport & Déchargement',
  'Restauration & Eau',
  'Location Matériel',
  'Entretien & Réparations',
  'Frais Administratifs',
  'Divers & Urgences'
];

export const UNITS_LIST = [
  'sacs',
  'm³',
  'tonnes',
  'kg',
  'barres',
  'palettes',
  'm²',
  'm linéaire',
  'unités',
  'litres',
  'rouleaux'
];

export const WEATHER_OPTIONS = [
  'Ensoleillé',
  'Dégagé',
  'Nuageux',
  'Pluie',
  'Vent fort',
  'Canicule',
  'Orage',
  'Neige'
] as const;

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function generateSeedData(): ChantierDb {
  const s1 = 'site_1';
  const s2 = 'site_2';

  const sites: Site[] = [
    {
      id: s1,
      name: 'Résidence Les Oliviers — R+3',
      client: 'Promotion Immobilière SARL El-Boustan',
      address: 'Lotissement N°14, Zone Ouest, Blida',
      radius: 200,
      supervisor: 'Ing. Mourad Khelifi',
      startDate: '2026-02-01',
      budget: 85000000,
      currency: 'DZD',
      status: 'en_cours'
    },
    {
      id: s2,
      name: 'Centre Commercial Al-Manar — R+2',
      client: 'Groupe Commercial Al-Manar',
      address: 'Boulevard Central, Alger',
      radius: 300,
      supervisor: 'Ing. Sarah Haddad',
      startDate: '2026-04-15',
      budget: 140000000,
      currency: 'DZD',
      status: 'en_cours'
    }
  ];

  const teams: Team[] = [
    { id: 't1', siteId: s1, name: 'Équipe A — Gros Œuvre', leader: 'Karim Benali' },
    { id: 't2', siteId: s1, name: 'Équipe B — Second Œuvre', leader: 'Sofiane Haddad' },
    { id: 't3', siteId: s1, name: 'Équipe C — Finitions & Fluides', leader: 'Mourad Bouzid' },
    { id: 't4', siteId: s2, name: 'Équipe Alpha — Fondations', leader: 'Rachid Ziani' }
  ];

  const workers: Worker[] = [
    {
      id: 'w_1',
      site: s1,
      name: 'Karim Benali',
      craft: 'Coffrage',
      rate: 3200,
      rateType: 'jour',
      team: 'Équipe A — Gros Œuvre',
      phone: '06 61 24 55 10',
      cin: '09182371',
      active: true,
      recruitmentLevel: 'Niveau 4 — Maître Ouvrier / Chef d\'Équipe',
      experienceYears: 10,
      skills: ['Coffrage traditionnel & banches', 'Lecture de plans BA', 'Implantation théodolite', 'Sécurité travail en hauteur'],
      certifications: ['CACES R482', 'Habilitation Travaux Hauteur', 'SST'],
      evaluationScore: 4.9,
      aiEvaluationSummary: 'Chef d\'équipe de référence. Excellent meneur d\'hommes, rigueur extrême sur les niveaux et aplombs.',
      hireDate: '2025-01-10',
      emergencyContact: '06 50 11 22 33 (Épouse)'
    },
    {
      id: 'w_2',
      site: s1,
      name: 'Yacine Moussaoui',
      craft: 'Ferraillage',
      rate: 2900,
      rateType: 'jour',
      team: 'Équipe A — Gros Œuvre',
      phone: '06 70 12 33 44',
      cin: '10928374',
      active: true,
      recruitmentLevel: 'Niveau 3 — Compagnon Professionnel (OP2)',
      experienceYears: 6,
      skills: ['Façonnage aciers HA', 'Ligature rapide', 'Pose d\'armatures poteaux/poutres/radier', 'Lecture nomenclature aciers'],
      certifications: ['Habilitation Port EPI'],
      evaluationScore: 4.6,
      aiEvaluationSummary: 'Compagnon ferrailleur très rapide et autonome. Parfait respect des recouvrements et enrobages.',
      hireDate: '2025-02-01',
      emergencyContact: '06 72 00 11 22 (Frère)'
    },
    {
      id: 'w_3',
      site: s1,
      name: 'Sofiane Haddad',
      craft: 'Maçonnerie',
      rate: 2800,
      rateType: 'jour',
      team: 'Équipe B — Second Œuvre',
      phone: '05 55 98 76 12',
      cin: '08127364',
      active: true,
      recruitmentLevel: 'Niveau 3 — Compagnon Professionnel (OP2)',
      experienceYears: 7,
      skills: ['Maçonnerie brique/parpaing', 'Enduits traditionnels bâtard', 'Pose linteaux & prélinteaux'],
      certifications: ['Montage Échafaudage R408'],
      evaluationScore: 4.7,
      aiEvaluationSummary: 'Maçon rigoureux, rendement élevé sur cloisons et murs porteurs avec joints réguliers.',
      hireDate: '2025-02-15'
    },
    {
      id: 'w_4',
      site: s1,
      name: 'Mourad Bouzid',
      craft: 'Plomberie & Sanitaire',
      rate: 3500,
      rateType: 'jour',
      team: 'Équipe C — Finitions & Fluides',
      phone: '06 63 44 88 90',
      cin: '12837461',
      active: true,
      recruitmentLevel: 'Niveau 4 — Maître Ouvrier / Chef d\'Équipe',
      experienceYears: 12,
      skills: ['Réseaux multicouche/PPR/Cuivre', 'Évacuations EU/EV/EP', 'Colonnes montantes', 'Essais pression & étanchéité'],
      certifications: ['Soudure Brasage Fort', 'Sécurité Gaz'],
      evaluationScore: 4.8,
      aiEvaluationSummary: 'Expert fluides et sanitaires, autonome sur les schémas techniques et raccordements complexes.',
      hireDate: '2025-03-01'
    },
    {
      id: 'w_5',
      site: s1,
      name: 'Amine Cherif',
      craft: 'Électricité & Réseaux',
      rate: 3400,
      rateType: 'jour',
      team: 'Équipe C — Finitions & Fluides',
      phone: '07 71 82 93 04',
      cin: '11928374',
      active: true,
      recruitmentLevel: 'Niveau 3 — Compagnon Professionnel (OP2)',
      experienceYears: 5,
      skills: ['Tirage câbles & goulottes', 'Câblage tableaux TGBT', 'Mise à la terre', 'Domotique & interphonie'],
      certifications: ['Habilitation Électrique B2V / BR / BC', 'SST'],
      evaluationScore: 4.7,
      aiEvaluationSummary: 'Électricien très qualifié, méthodique sur l\'équilibrage des phases et la mise en conformité.',
      hireDate: '2025-03-10'
    },
    {
      id: 'w_6',
      site: s1,
      name: 'Rachid Ziani',
      craft: 'Peinture & Enduit',
      rate: 2600,
      rateType: 'jour',
      team: 'Équipe B — Second Œuvre',
      phone: '05 40 11 22 33',
      cin: '07123984',
      active: true,
      recruitmentLevel: 'Niveau 2 — Ouvrier Professionnel (OP1)',
      experienceYears: 4,
      skills: ['Ratissage enduit fin', 'Peinture airless et rouleau', 'Ponçage girafes', 'Protection chantier'],
      certifications: ['Utilisation Nacelle'],
      evaluationScore: 4.4,
      aiEvaluationSummary: 'Bon finisseur, finitions soignées et préparation impeccable des supports.',
      hireDate: '2025-03-20'
    },
    {
      id: 'w_7',
      site: s1,
      name: 'Bilal Guendouz',
      craft: 'Carrelage & Revêtement',
      rate: 3000,
      rateType: 'jour',
      team: 'Équipe B — Second Œuvre',
      phone: '06 52 33 44 55',
      cin: '10293847',
      active: true,
      recruitmentLevel: 'Niveau 3 — Compagnon Professionnel (OP2)',
      experienceYears: 6,
      skills: ['Pose carrelage grand format', 'Faïence murale & calepinage', 'Chapes fluides & pentes douches'],
      certifications: ['Découpe laser & disqueuse sécurisée'],
      evaluationScore: 4.6,
      aiEvaluationSummary: 'Carreleur précis, respect minutieux du calepinage et des niveaux au laser.',
      hireDate: '2025-04-01'
    },
    {
      id: 'w_8',
      site: s1,
      name: 'Hassan Belkacem',
      craft: 'Manœuvre & Aide',
      rate: 2000,
      rateType: 'jour',
      team: 'Équipe A — Gros Œuvre',
      phone: '07 90 44 55 66',
      cin: '13948572',
      active: true,
      recruitmentLevel: 'Niveau 1 — Manœuvre / Débutant',
      experienceYears: 1,
      skills: ['Approvisionnement postes de travail', 'Gâchage mortier bétonnière', 'Nettoyage & tri des déchets chantier'],
      certifications: ['Sensibilisation Sécurité BTP'],
      evaluationScore: 4.2,
      aiEvaluationSummary: 'Manœuvre dynamique, ponctuel et volontaire avec bon potentiel d\'évolution vers la maçonnerie.',
      hireDate: '2025-04-05'
    }
  ];

  const todayStr = getTodayDateString();
  const currentMonth = todayStr.slice(0, 7);

  // Generate historical attendance for current month
  const attendance: Record<string, Record<string, AttendanceRecord[]>> = {
    [s1]: {
      [todayStr]: [
        { workerId: 'w_1', status: 'P', hSup: 2 },
        { workerId: 'w_2', status: 'P', hSup: 1.5 },
        { workerId: 'w_3', status: 'P', hSup: 0 },
        { workerId: 'w_4', status: 'R', hSup: 0 },
        { workerId: 'w_5', status: 'P', hSup: 3 },
        { workerId: 'w_6', status: 'A', hSup: 0, note: 'Maladie justifiée' },
        { workerId: 'w_7', status: 'P', hSup: 0 },
        { workerId: 'w_8', status: 'J', hSup: 0, note: 'Déplacement autorisé' }
      ]
    }
  };

  // Populate some sample past days for the matrix
  const now = new Date();
  const dayOfMonth = now.getDate();
  for (let d = 1; d < Math.min(dayOfMonth, 10); d++) {
    const dStr = `${currentMonth}-${String(d).padStart(2, '0')}`;
    attendance[s1][dStr] = workers.map((w, idx) => {
      let st: 'P' | 'R' | 'A' | 'J' = 'P';
      if ((idx + d) % 9 === 0) st = 'A';
      else if ((idx + d) % 7 === 0) st = 'R';
      else if ((idx + d) % 11 === 0) st = 'J';
      return {
        workerId: w.id,
        status: st,
        hSup: st === 'P' && (idx % 2 === 0) ? 1.5 : 0
      };
    });
  }

  const advances: Advance[] = [
    { id: 'adv_1', site: s1, workerId: 'w_1', date: `${currentMonth}-05`, amount: 15000, method: 'Espèces', note: 'Acompte début de mois' },
    { id: 'adv_2', site: s1, workerId: 'w_3', date: `${currentMonth}-10`, amount: 20000, method: 'Virement', note: 'Acompte familial' },
    { id: 'adv_3', site: s1, workerId: 'w_5', date: `${currentMonth}-12`, amount: 12000, method: 'Espèces', note: 'Avance transport' },
    { id: 'adv_4', site: s1, workerId: 'w_2', date: `${currentMonth}-15`, amount: 10000, method: 'Espèces', note: 'Frais médicaux' }
  ];

  const expenses: DailyExpense[] = [
    {
      id: 'exp_1',
      site: s1,
      date: todayStr,
      category: 'Carburant & Énergie',
      amount: 6500,
      paymentMethod: 'Espèces (Caisse)',
      beneficiary: 'Station Service Naftal Blida',
      receiptRef: 'TKT-8921',
      paidBy: 'Ing. Mourad Khelifi',
      note: 'Gasoil pour groupe électrogène et dumper de chantier'
    },
    {
      id: 'exp_2',
      site: s1,
      date: todayStr,
      category: 'Restauration & Eau',
      amount: 2800,
      paymentMethod: 'Espèces (Caisse)',
      beneficiary: 'Superette El-Amel',
      receiptRef: 'BON-442',
      paidBy: 'Karim Benali',
      note: 'Packs eau minérale fraîche et rafraîchissements équipe'
    },
    {
      id: 'exp_3',
      site: s1,
      date: `${currentMonth}-08`,
      category: 'Petit Outillage & Quincaillerie',
      amount: 14500,
      paymentMethod: 'Espèces (Caisse)',
      beneficiary: 'Quincaillerie Centrale BTP',
      receiptRef: 'FAC-2026-108',
      paidBy: 'Sofiane Haddad',
      note: 'Disques tronçonneuse Ø230, mèches béton, gants et corde nylon'
    },
    {
      id: 'exp_4',
      site: s1,
      date: `${currentMonth}-05`,
      category: 'Transport & Déchargement',
      amount: 8000,
      paymentMethod: 'Espèces (Caisse)',
      beneficiary: 'Transporteur SARL Rapide',
      receiptRef: 'BON-094',
      paidBy: 'Ing. Mourad Khelifi',
      note: 'Déchargement manuel camion briques et échafaudages'
    }
  ];

  const materials: Material[] = [
    { id: 'mat_1', site: s1, name: 'Ciment CPJ 42.5', unit: 'sacs', initStock: 150, received: 600, consumed: 480, minAlert: 50, unitPrice: 650, category: 'Liants' },
    { id: 'mat_2', site: s1, name: 'Sable concassé 0/4', unit: 'm³', initStock: 20, received: 85, consumed: 70, minAlert: 15, unitPrice: 3200, category: 'Granulats' },
    { id: 'mat_3', site: s1, name: 'Gravier 8/15', unit: 'm³', initStock: 15, received: 90, consumed: 72, minAlert: 15, unitPrice: 2800, category: 'Granulats' },
    { id: 'mat_4', site: s1, name: 'Acier HA FeE500 Ø12', unit: 'tonnes', initStock: 2, received: 12, consumed: 8.5, minAlert: 3, unitPrice: 135000, category: 'Armatures' },
    { id: 'mat_5', site: s1, name: 'Acier HA FeE500 Ø16', unit: 'tonnes', initStock: 1.5, received: 10, consumed: 7.2, minAlert: 2, unitPrice: 135000, category: 'Armatures' },
    { id: 'mat_6', site: s1, name: 'Briques creuses 8 trous', unit: 'unités', initStock: 500, received: 3500, consumed: 2800, minAlert: 600, unitPrice: 42, category: 'Maçonnerie' },
    { id: 'mat_7', site: s1, name: 'Plâtre de construction', unit: 'sacs', initStock: 30, received: 120, consumed: 110, minAlert: 25, unitPrice: 450, category: 'Finition' }
  ];

  const equipment: Equipment[] = [
    { id: 'eq_1', site: s1, name: 'Pelle Hydraulique CAT 320D', brand: 'Caterpillar', hours: 1420, fuel: 180, maintDue: 250, lastMaintHours: 1250, status: 'ok' },
    { id: 'eq_2', site: s1, name: 'Bétonnière thermique 350L', brand: 'IMER', hours: 480, fuel: 45, maintDue: 100, lastMaintHours: 400, status: 'ok' },
    { id: 'eq_3', site: s1, name: 'Groupe électrogène 60 kVA', brand: 'SDMO', hours: 735, fuel: 110, maintDue: 200, lastMaintHours: 600, status: 'ok' },
    { id: 'eq_4', site: s1, name: 'Dumper tout terrain 4x4', brand: 'AUSA', hours: 890, fuel: 65, maintDue: 150, lastMaintHours: 750, status: 'a_reviser' },
    { id: 'eq_5', site: s1, name: 'Vibreur à béton d’aiguille', brand: 'Wacker Neuson', hours: 140, fuel: 15, maintDue: 50, lastMaintHours: 100, status: 'ok' }
  ];

  const logs: SiteLog[] = [
    {
      id: 'log_1',
      site: s1,
      date: todayStr,
      temp: 24,
      weather: 'Ensoleillé',
      lostHours: 0,
      note: 'Coulage de la dalle R+3 Zone B achevé avec succès (45 m³ béton B25 pompé). Début ferraillage des raidisseurs verticaux.',
      incidents: 'R.A.S. Port des EPI vérifié à 08h00. Visite du bureau de contrôle CTC validée.',
      signedBy: 'Ing. Mourad Khelifi'
    },
    {
      id: 'log_2',
      site: s1,
      date: `${currentMonth}-08`,
      temp: 18,
      weather: 'Pluie',
      lostHours: 3.5,
      note: 'Intempéries fortes de 09h30 à 13h00. Évacuation des postes extérieurs et repli sur maçonnerie intérieure R+1.',
      incidents: 'Légère infiltration dans le sous-sol temporaire, pompe de relevage mise en service sans dommage.',
      signedBy: 'Karim Benali'
    }
  ];

  const tasks: Task[] = [
    {
      id: 'task_1',
      siteId: s1,
      title: 'Ferraillage semelles filantes',
      description: 'Mise en place armatures semelles selon plan BA 04',
      status: 'EN_COURS',
      assignees: ['w_1', 'w_2'],
      startDate: todayStr,
      endDate: `${currentMonth}-25`,
      priority: 'HAUTE',
      budget: 150000,
      progress: 45,
      materialsRequired: [{ materialId: 'mat_4', quantity: 2 }],
      photos: [],
      subtasks: [
        { id: 'sub_1', title: 'Découpe des barres', completed: true },
        { id: 'sub_2', title: 'Façonnage et ligature', completed: false }
      ],
      clientApproval: 'PENDING'
    },
    {
      id: 'task_2',
      siteId: s1,
      title: 'Coulage béton de propreté',
      description: 'Béton dosé à 150 kg/m³',
      status: 'COMPLETEE',
      assignees: ['w_8'],
      startDate: `${currentMonth}-01`,
      endDate: `${currentMonth}-02`,
      priority: 'MOYENNE',
      progress: 100,
      photos: [],
      clientApproval: 'APPROVED'
    }
  ];

  const cashInflows: CashInflow[] = [
    {
      id: 'inf_1',
      site: s1,
      date: `${currentMonth}-01`,
      amount: 150000,
      source: 'Trésorerie Centrale (Direction SARL)',
      paymentMethod: 'Virement',
      reference: 'VIR-2026-0811',
      receivedBy: 'Ing. Mourad Khelifi',
      note: 'Dotation mensuelle initiale caisse de chantier'
    },
    {
      id: 'inf_2',
      site: s1,
      date: `${currentMonth}-12`,
      amount: 50000,
      source: 'Règlement Avance Client Privé',
      paymentMethod: 'Espèces',
      reference: 'REC-0923',
      receivedBy: 'Ing. Mourad Khelifi',
      note: 'Réapprovisionnement caisse pour acomptes et urgences'
    }
  ];

  const cashAudits: CashAudit[] = [
    {
      id: 'aud_1',
      site: s1,
      date: `${currentMonth}-10`,
      theoreticalBalance: 121000,
      countedPhysicalCash: 121000,
      difference: 0,
      auditedBy: 'Ing. Mourad Khelifi',
      notes: 'Arrêté de caisse intermédiaire conforme. Aucune anomalie constatée.',
      status: 'conforme'
    }
  ];

  const materialMovements: MaterialMovement[] = [
    {
      id: 'mov_1',
      site: s1,
      materialId: 'mat_1',
      type: 'reception',
      quantity: 300,
      date: `${currentMonth}-02`,
      bonRef: 'BL-LFRG-4492',
      note: 'Livraison Cimenterie Lafarge Oggaz - Camion remorque 16-102-14'
    },
    {
      id: 'mov_2',
      site: s1,
      materialId: 'mat_1',
      type: 'consommation',
      quantity: 180,
      date: `${currentMonth}-05`,
      bonRef: 'BS-014',
      note: 'Coulage semelles filantes et amorces poteaux Bloc B'
    },
    {
      id: 'mov_3',
      site: s1,
      materialId: 'mat_1',
      type: 'reception',
      quantity: 300,
      date: `${currentMonth}-09`,
      bonRef: 'BL-MEFT-1088',
      note: 'Livraison Cimenterie Meftah - Déchargement au quai de stockage'
    },
    {
      id: 'mov_4',
      site: s1,
      materialId: 'mat_1',
      type: 'consommation',
      quantity: 300,
      date: `${currentMonth}-12`,
      bonRef: 'BS-029',
      note: 'Coulage dalle haute sous-sol & voiles périphériques étanches'
    },
    {
      id: 'mov_5',
      site: s1,
      materialId: 'mat_2',
      type: 'reception',
      quantity: 45,
      date: `${currentMonth}-03`,
      bonRef: 'BL-CSM-552',
      note: 'Sable concassé 0/4 Carrière Sidi Moussa (semi-remorque)'
    },
    {
      id: 'mov_6',
      site: s1,
      materialId: 'mat_2',
      type: 'consommation',
      quantity: 40,
      date: `${currentMonth}-07`,
      bonRef: 'BS-019',
      note: 'Bétonnage semelles et mortier de calage préfabriqués'
    },
    {
      id: 'mov_7',
      site: s1,
      materialId: 'mat_2',
      type: 'reception',
      quantity: 40,
      date: `${currentMonth}-11`,
      bonRef: 'BL-CSM-588',
      note: 'Sable 0/4 pour mortier de maçonnerie RDC'
    },
    {
      id: 'mov_8',
      site: s1,
      materialId: 'mat_2',
      type: 'consommation',
      quantity: 30,
      date: `${currentMonth}-14`,
      bonRef: 'BS-033',
      note: 'Mortier de pose briques et enduit sous-couche'
    },
    {
      id: 'mov_9',
      site: s1,
      materialId: 'mat_4',
      type: 'reception',
      quantity: 6,
      date: `${currentMonth}-01`,
      bonRef: 'BL-MET-881',
      note: 'Acier HA FeE500 Ø12 - Fardeaux 12m certifiés CTC'
    },
    {
      id: 'mov_10',
      site: s1,
      materialId: 'mat_4',
      type: 'consommation',
      quantity: 4.5,
      date: `${currentMonth}-06`,
      bonRef: 'BS-017',
      note: 'Ferraillage cages d’armatures semelles et longrines'
    },
    {
      id: 'mov_11',
      site: s1,
      materialId: 'mat_4',
      type: 'reception',
      quantity: 6,
      date: `${currentMonth}-10`,
      bonRef: 'BL-MET-914',
      note: 'Acier Ø12 approvisionnement poteaux et poutres RDC'
    },
    {
      id: 'mov_12',
      site: s1,
      materialId: 'mat_4',
      type: 'consommation',
      quantity: 4,
      date: `${currentMonth}-13`,
      bonRef: 'BS-031',
      note: 'Façonnage étriers, cadres et armatures poteaux verticaux'
    },
    {
      id: 'mov_13',
      site: s1,
      materialId: 'mat_6',
      type: 'reception',
      quantity: 2000,
      date: `${currentMonth}-04`,
      bonRef: 'BL-BRQ-309',
      note: 'Briques creuses 8 trous - Palette filmée Briqueterie El-Binaa'
    },
    {
      id: 'mov_14',
      site: s1,
      materialId: 'mat_6',
      type: 'consommation',
      quantity: 1600,
      date: `${currentMonth}-08`,
      bonRef: 'BS-022',
      note: 'Maçonnerie double cloison sous-sol et gaines techniques'
    },
    {
      id: 'mov_15',
      site: s1,
      materialId: 'mat_6',
      type: 'reception',
      quantity: 1500,
      date: `${currentMonth}-12`,
      bonRef: 'BL-BRQ-344',
      note: 'Palette complémentaire briques 8 trous pour RDC'
    },
    {
      id: 'mov_16',
      site: s1,
      materialId: 'mat_6',
      type: 'consommation',
      quantity: 1200,
      date: `${currentMonth}-15`,
      bonRef: 'BS-036',
      note: 'Élévation des murs de distribution RDC'
    }
  ];

  return {
    sites,
    activeSite: s1,
    workers,
    teams,
    attendance,
    advances,
    expenses,
    cashInflows,
    cashAudits,
    materials,
    materialMovements,
    equipment,
    logs,
    tasks,
    seq: { site: 2, w: 8, t: 4, a: 4, exp: 4, inf: 2, aud: 1, m: 7, e: 5, l: 2, task: 2, mov: 16 },
    currency: 'DZD'
  };
}

export function sanitizeDb(data: any): ChantierDb {
  const seed = generateSeedData();
  if (!data || typeof data !== 'object') {
    return seed;
  }

  // Ensure valid sites array
  let sites: Site[] = Array.isArray(data.sites) && data.sites.length > 0 ? data.sites : seed.sites;
  // Ensure valid active site
  let activeSite = data.activeSite;
  if (!sites.some(s => s.id === activeSite)) {
    activeSite = sites[0]?.id || seed.sites[0].id;
  }

  return {
    sites,
    activeSite,
    workers: Array.isArray(data.workers) ? data.workers : seed.workers,
    teams: Array.isArray(data.teams) ? data.teams : seed.teams,
    attendance: data.attendance && typeof data.attendance === 'object' ? data.attendance : {},
    advances: Array.isArray(data.advances) ? data.advances : [],
    expenses: Array.isArray(data.expenses) ? data.expenses : [],
    cashInflows: Array.isArray(data.cashInflows) ? data.cashInflows : [],
    cashAudits: Array.isArray(data.cashAudits) ? data.cashAudits : [],
    materials: Array.isArray(data.materials) ? data.materials : seed.materials,
    materialMovements:
      Array.isArray(data.materialMovements) && data.materialMovements.length > 0
        ? data.materialMovements
        : seed.materialMovements || [],
    equipment: Array.isArray(data.equipment) ? data.equipment : seed.equipment,
    maintenanceRecords: Array.isArray(data.maintenanceRecords) ? data.maintenanceRecords : [],
    logs: Array.isArray(data.logs) ? data.logs : [],
    tasks: Array.isArray(data.tasks) ? data.tasks : seed.tasks,
    invitations: Array.isArray(data.invitations) ? data.invitations : [],
    seq: data.seq && typeof data.seq === 'object' ? { ...seed.seq, ...data.seq } : seed.seq,
    currency: typeof data.currency === 'string' && data.currency ? data.currency : 'DZD',
    license: data.license && typeof data.license === 'object' ? data.license : undefined
  };
}

export const StorageService = {
  load(): ChantierDb {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return sanitizeDb(parsed);
      }

      // Check legacy key if available
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        const sanitized = sanitizeDb(parsed);
        this.save(sanitized);
        return sanitized;
      }

      // Default seed
      const seed = generateSeedData();
      this.save(seed);
      return seed;
    } catch (e) {
      console.error('Failed to load ChantierPro database from localStorage', e);
      const seed = generateSeedData();
      try {
        this.save(seed);
      } catch {}
      return seed;
    }
  },

  save(db: ChantierDb): void {
    try {
      const sanitized = sanitizeDb(db);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      // Also sync to legacy key for backwards compatibility
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(sanitized));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  },

  reset(): ChantierDb {
    const seed = generateSeedData();
    this.save(seed);
    return seed;
  },

  createEmptyDb(currency: string = 'DZD', existingLicense?: AppLicense): ChantierDb {
    const today = getTodayDateString();
    const activeCurrency = currency || 'DZD';
    const currentStored = this.load();
    const preservedLicense = existingLicense || currentStored?.license;

    const defaultSite: Site = {
      id: 'site_1',
      name: 'Mon Premier Chantier',
      client: 'Nouveau Client BTP',
      address: 'Zone d\'activité',
      radius: 200,
      supervisor: 'Chef de Chantier',
      startDate: today,
      budget: 0,
      currency: activeCurrency,
      status: 'en_cours'
    };
    const emptyDb: ChantierDb = {
      sites: [defaultSite],
      activeSite: defaultSite.id,
      workers: [],
      teams: [{ id: 't1', siteId: defaultSite.id, name: 'Équipe Générale' }],
      attendance: {},
      advances: [],
      expenses: [],
      cashInflows: [],
      cashAudits: [],
      materials: [],
      materialMovements: [],
      equipment: [],
      maintenanceRecords: [],
      logs: [],
      tasks: [],
      seq: { site: 1, w: 0, t: 1, a: 0, exp: 0, inf: 0, aud: 0, m: 0, e: 0, l: 0, task: 0 },
      currency: activeCurrency,
      ...(preservedLicense ? { license: preservedLicense } : {})
    };
    this.save(emptyDb);
    return emptyDb;
  },

  exportJSON(db: ChantierDb): string {
    const sanitized = sanitizeDb(db);
    return JSON.stringify(sanitized, null, 2);
  },

  importJSON(jsonString: string): ChantierDb {
    const parsed = JSON.parse(jsonString);
    const sanitized = sanitizeDb(parsed);
    this.save(sanitized);
    return sanitized;
  }
};
