// src/db/schema.ts
import { pgTable, text, serial, integer, doublePrecision, boolean, timestamp, jsonb, customType } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Custom pgvector type for 768-dimensional embeddings (Google Gemini text-embedding-004)
export const pgvector768 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(768)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: unknown): number[] {
    if (typeof value === 'string') {
      return value.replace(/^\[|\]$/g, '').split(',').map(Number);
    }
    return (value as number[]) || [];
  },
});

// Users table linked to Firebase Authentication
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').default('conducteur_travaux'), // 'admin', 'conducteur_travaux', 'chef_chantier', 'pointeur'
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Chantiers (Construction Sites)
export const sites = pgTable('sites', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  client: text('client').default(''),
  address: text('address').default(''),
  radius: integer('radius').default(150),
  supervisor: text('supervisor').default(''),
  budget: doublePrecision('budget').default(0),
  currency: text('currency').default('DZD'),
  status: text('status').default('en_cours').notNull(), // 'en_cours', 'termine', 'en_pause'
  startDate: text('start_date'),
  endDate: text('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Ouvriers (Workers)
export const workers = pgTable('workers', {
  id: text('id').primaryKey(),
  siteId: text('site_id').references(() => sites.id).notNull(),
  name: text('name').notNull(),
  craft: text('craft').notNull(),
  rate: doublePrecision('rate').notNull(),
  rateType: text('rate_type').default('jour').notNull(), // 'jour' | 'heure'
  team: text('team').default('Équipe principale').notNull(),
  phone: text('phone'),
  cin: text('cin'),
  active: boolean('active').default(true).notNull(),
  experienceYears: integer('experience_years').default(0),
  notes: text('notes'),
  recruitmentLevel: text('recruitment_level'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Pointage & Présences (Attendance)
export const attendance = pgTable('attendance', {
  id: text('id').primaryKey(), // composite or uuid, e.g. `${siteId}_${workerId}_${date}`
  siteId: text('site_id').references(() => sites.id).notNull(),
  workerId: text('worker_id').references(() => workers.id).notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  status: text('status').default('P').notNull(), // 'P' | 'R' | 'A' | 'J'
  hSup: doublePrecision('h_sup').default(0).notNull(),
  absenceHours: doublePrecision('absence_hours').default(0).notNull(),
  note: text('note'),
  checkInTime: text('check_in_time'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Dépenses de caisse (Expenses)
export const expenses = pgTable('expenses', {
  id: text('id').primaryKey(),
  siteId: text('site_id').references(() => sites.id).notNull(),
  category: text('category').notNull(),
  amount: doublePrecision('amount').notNull(),
  date: text('date').notNull(),
  beneficiary: text('beneficiary').default(''),
  paymentMethod: text('payment_method').default('Espèces').notNull(),
  invoiceRef: text('invoice_ref'),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Acomptes ouvriers (Advances)
export const advances = pgTable('advances', {
  id: text('id').primaryKey(),
  siteId: text('site_id').references(() => sites.id).notNull(),
  workerId: text('worker_id').references(() => workers.id).notNull(),
  date: text('date').notNull(),
  amount: doublePrecision('amount').notNull(),
  method: text('method').default('Espèces').notNull(),
  note: text('note'),
  approvedBy: text('approved_by'),
  receiptRef: text('receipt_ref'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Stocks & Matériaux (Materials)
export const materials = pgTable('materials', {
  id: text('id').primaryKey(),
  siteId: text('site_id').references(() => sites.id).notNull(),
  name: text('name').notNull(),
  category: text('category').default('Général'),
  unit: text('unit').default('U').notNull(),
  initStock: doublePrecision('init_stock').default(0).notNull(),
  received: doublePrecision('received').default(0).notNull(),
  consumed: doublePrecision('consumed').default(0).notNull(),
  minAlert: doublePrecision('min_alert').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Engins & Équipements (Equipment)
export const equipment = pgTable('equipment', {
  id: text('id').primaryKey(),
  siteId: text('site_id').references(() => sites.id).notNull(),
  name: text('name').notNull(),
  category: text('category').default('Engin de terrassement'),
  status: text('status').default('operationnel').notNull(), // 'operationnel', 'en_panne', 'maintenance'
  operator: text('operator'),
  hoursUsed: doublePrecision('hours_used').default(0),
  nextMaintenance: text('next_maintenance'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Journal de chantier (Site Daily Logs)
export const siteLogs = pgTable('site_logs', {
  id: text('id').primaryKey(), // `${siteId}_${date}`
  siteId: text('site_id').references(() => sites.id).notNull(),
  date: text('date').notNull(),
  weather: text('weather').default('Ensoleillé'),
  temperature: doublePrecision('temperature'),
  workSummary: text('work_summary'),
  incidents: text('incidents'),
  lostHours: doublePrecision('lost_hours').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Vector Embeddings (pgvector pour IA RAG & Model Context Protocol)
export const vectorEmbeddings = pgTable('vector_embeddings', {
  id: serial('id').primaryKey(),
  siteId: text('site_id').references(() => sites.id),
  documentType: text('document_type').notNull(), // 'journal', 'reglementation', 'procedure_securite', 'ouvrier', 'materiau'
  referenceId: text('reference_id'),
  title: text('title').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  embedding: pgvector768('embedding'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const sitesRelations = relations(sites, ({ many }) => ({
  workers: many(workers),
  attendance: many(attendance),
  expenses: many(expenses),
  advances: many(advances),
  materials: many(materials),
  equipment: many(equipment),
  logs: many(siteLogs),
  embeddings: many(vectorEmbeddings),
}));

export const workersRelations = relations(workers, ({ one, many }) => ({
  site: one(sites, {
    fields: [workers.siteId],
    references: [sites.id],
  }),
  attendance: many(attendance),
  advances: many(advances),
}));
