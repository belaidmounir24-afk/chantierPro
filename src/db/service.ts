// src/db/service.ts
import { db } from './index.ts';
import {
  sites,
  workers,
  attendance,
  expenses,
  advances,
  materials,
  equipment,
  siteLogs,
  vectorEmbeddings,
  users,
} from './schema.ts';
import { eq, desc, sql } from 'drizzle-orm';
import type { ChantierDb, Site, Worker, DailyExpense, Advance, Material, Equipment, SiteLog, AttendanceRecord } from '../types.ts';

/**
 * Health check & extension verification for PostgreSQL + pgvector
 */
export async function getDbHealth() {
  try {
    const extCheck = await db.execute(sql`SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';`);
    const tablesCount = await db.execute(
      sql`SELECT COUNT(*)::int as count FROM information_schema.tables WHERE table_schema = 'public';`
    );
    const sitesCount = await db.select({ count: sql<number>`count(*)::int` }).from(sites);
    const workersCount = await db.select({ count: sql<number>`count(*)::int` }).from(workers);
    const embeddingsCount = await db.select({ count: sql<number>`count(*)::int` }).from(vectorEmbeddings);

    return {
      status: 'connected',
      engine: 'PostgreSQL (Cloud SQL)',
      pgvector: {
        installed: extCheck.rows.length > 0,
        version: extCheck.rows[0]?.extversion || 'unknown',
      },
      tablesCount: tablesCount.rows[0]?.count || 0,
      counts: {
        sites: sitesCount[0]?.count || 0,
        workers: workersCount[0]?.count || 0,
        embeddings: embeddingsCount[0]?.count || 0,
      },
    };
  } catch (error: any) {
    console.error('Database health check failed:', error);
    return {
      status: 'error',
      engine: 'PostgreSQL (Cloud SQL)',
      error: error?.message || 'Database connection error',
    };
  }
}

/**
 * Get or register a user in PostgreSQL
 */
export async function getOrCreateDbUser(uid: string, email: string, displayName?: string) {
  const result = await db
    .insert(users)
    .values({
      uid,
      email,
      displayName: displayName || null,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
        displayName: displayName || null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return result[0];
}

/**
 * Save / sync an entire ChantierDb state into PostgreSQL
 */
export async function syncStateToPostgres(localDb: ChantierDb) {
  try {
    // 1. Sites
    if (localDb.sites && localDb.sites.length > 0) {
      for (const site of localDb.sites) {
        await db
          .insert(sites)
          .values({
            id: site.id,
            name: site.name,
            client: site.client || '',
            address: site.address || '',
            radius: site.radius || 150,
            supervisor: site.supervisor || '',
            budget: site.budget || 0,
            currency: site.currency || 'DZD',
            status: site.status || 'en_cours',
            startDate: site.startDate || null,
            endDate: site.endDate || null,
          })
          .onConflictDoUpdate({
            target: sites.id,
            set: {
              name: site.name,
              client: site.client || '',
              address: site.address || '',
              radius: site.radius || 150,
              supervisor: site.supervisor || '',
              budget: site.budget || 0,
              currency: site.currency || 'DZD',
              status: site.status || 'en_cours',
              startDate: site.startDate || null,
              endDate: site.endDate || null,
            },
          });
      }
    }

    // 2. Workers
    if (localDb.workers && localDb.workers.length > 0) {
      for (const w of localDb.workers) {
        await db
          .insert(workers)
          .values({
            id: w.id,
            siteId: w.site,
            name: w.name,
            craft: w.craft,
            rate: w.rate,
            rateType: w.rateType,
            team: w.team || 'Équipe principale',
            phone: w.phone || null,
            cin: w.cin || null,
            active: w.active !== false,
            experienceYears: w.experienceYears || 0,
            notes: w.notes || null,
            recruitmentLevel: w.recruitmentLevel || null,
          })
          .onConflictDoUpdate({
            target: workers.id,
            set: {
              name: w.name,
              craft: w.craft,
              rate: w.rate,
              rateType: w.rateType,
              team: w.team || 'Équipe principale',
              phone: w.phone || null,
              cin: w.cin || null,
              active: w.active !== false,
              experienceYears: w.experienceYears || 0,
              notes: w.notes || null,
              recruitmentLevel: w.recruitmentLevel || null,
            },
          });
      }
    }

    // 3. Attendance
    if (localDb.attendance) {
      for (const [siteId, dates] of Object.entries(localDb.attendance)) {
        for (const [dateStr, records] of Object.entries(dates)) {
          for (const rec of records) {
            const attId = `${siteId}_${rec.workerId}_${dateStr}`;
            await db
              .insert(attendance)
              .values({
                id: attId,
                siteId,
                workerId: rec.workerId,
                date: dateStr,
                status: rec.status,
                hSup: rec.hSup || 0,
                absenceHours: rec.absenceHours || 0,
                note: rec.note || null,
                checkInTime: rec.checkInTime || null,
              })
              .onConflictDoUpdate({
                target: attendance.id,
                set: {
                  status: rec.status,
                  hSup: rec.hSup || 0,
                  absenceHours: rec.absenceHours || 0,
                  note: rec.note || null,
                  checkInTime: rec.checkInTime || null,
                },
              });
          }
        }
      }
    }

    // 4. Expenses
    if (localDb.expenses && localDb.expenses.length > 0) {
      for (const exp of localDb.expenses) {
        await db
          .insert(expenses)
          .values({
            id: exp.id,
            siteId: exp.site,
            category: exp.category,
            amount: exp.amount,
            date: exp.date,
            beneficiary: exp.beneficiary || '',
            paymentMethod: exp.paymentMethod || 'Espèces',
            invoiceRef: (exp as any).invoiceRef || exp.receiptRef || null,
            note: exp.note || null,
          })
          .onConflictDoUpdate({
            target: expenses.id,
            set: {
              category: exp.category,
              amount: exp.amount,
              date: exp.date,
              beneficiary: exp.beneficiary || '',
              paymentMethod: exp.paymentMethod || 'Espèces',
              invoiceRef: (exp as any).invoiceRef || exp.receiptRef || null,
              note: exp.note || null,
            },
          });
      }
    }

    // 5. Advances
    if (localDb.advances && localDb.advances.length > 0) {
      for (const adv of localDb.advances) {
        await db
          .insert(advances)
          .values({
            id: adv.id,
            siteId: adv.site,
            workerId: adv.workerId,
            date: adv.date,
            amount: adv.amount,
            method: adv.method || 'Espèces',
            note: adv.note || null,
            approvedBy: adv.approvedBy || null,
            receiptRef: adv.receiptRef || null,
          })
          .onConflictDoUpdate({
            target: advances.id,
            set: {
              amount: adv.amount,
              date: adv.date,
              method: adv.method || 'Espèces',
              note: adv.note || null,
              approvedBy: adv.approvedBy || null,
              receiptRef: adv.receiptRef || null,
            },
          });
      }
    }

    // 6. Materials
    if (localDb.materials && localDb.materials.length > 0) {
      for (const mat of localDb.materials) {
        await db
          .insert(materials)
          .values({
            id: mat.id,
            siteId: mat.site,
            name: mat.name,
            category: mat.category || 'Général',
            unit: mat.unit,
            initStock: mat.initStock || 0,
            received: mat.received || 0,
            consumed: mat.consumed || 0,
            minAlert: mat.minAlert || 0,
          })
          .onConflictDoUpdate({
            target: materials.id,
            set: {
              name: mat.name,
              category: mat.category || 'Général',
              unit: mat.unit,
              initStock: mat.initStock || 0,
              received: mat.received || 0,
              consumed: mat.consumed || 0,
              minAlert: mat.minAlert || 0,
            },
          });
      }
    }

    // 7. Equipment
    if (localDb.equipment && localDb.equipment.length > 0) {
      for (const eqItem of localDb.equipment) {
        await db
          .insert(equipment)
          .values({
            id: eqItem.id,
            siteId: eqItem.site,
            name: eqItem.name,
            category: (eqItem as any).category || 'Engin',
            status: eqItem.status || 'operationnel',
            operator: (eqItem as any).operator || null,
            hoursUsed: (eqItem as any).hoursUsed ?? eqItem.hours ?? 0,
            nextMaintenance: (eqItem as any).nextMaintenance || eqItem.nextMaintenanceDate || null,
          })
          .onConflictDoUpdate({
            target: equipment.id,
            set: {
              name: eqItem.name,
              category: (eqItem as any).category || 'Engin',
              status: eqItem.status || 'operationnel',
              operator: (eqItem as any).operator || null,
              hoursUsed: (eqItem as any).hoursUsed ?? eqItem.hours ?? 0,
              nextMaintenance: (eqItem as any).nextMaintenance || eqItem.nextMaintenanceDate || null,
            },
          });
      }
    }

    // 8. Site Logs
    if (localDb.logs && localDb.logs.length > 0) {
      for (const log of localDb.logs) {
        await db
          .insert(siteLogs)
          .values({
            id: log.id,
            siteId: log.site,
            date: log.date,
            weather: log.weather || 'Ensoleillé',
            temperature: typeof log.temp === 'number' ? log.temp : log.temp ? parseFloat(String(log.temp)) : null,
            workSummary: log.note || null,
            incidents: log.incidents || null,
            lostHours: typeof log.lostHours === 'number' ? log.lostHours : log.lostHours ? parseFloat(String(log.lostHours)) : 0,
          })
          .onConflictDoUpdate({
            target: siteLogs.id,
            set: {
              date: log.date,
              weather: log.weather || 'Ensoleillé',
              temperature: typeof log.temp === 'number' ? log.temp : log.temp ? parseFloat(String(log.temp)) : null,
              workSummary: log.note || null,
              incidents: log.incidents || null,
              lostHours: typeof log.lostHours === 'number' ? log.lostHours : log.lostHours ? parseFloat(String(log.lostHours)) : 0,
            },
          });
      }
    }

    return { success: true, timestamp: new Date().toISOString() };
  } catch (error: any) {
    console.error('Failed to sync state to PostgreSQL:', error);
    throw new Error('Erreur de synchronisation PostgreSQL: ' + error.message, { cause: error });
  }
}

/**
 * Pull the entire database state from PostgreSQL
 */
export async function pullStateFromPostgres(): Promise<Partial<ChantierDb>> {
  const dbSites = await db.select().from(sites);
  const dbWorkers = await db.select().from(workers);
  const dbAttendance = await db.select().from(attendance);
  const dbExpenses = await db.select().from(expenses);
  const dbAdvances = await db.select().from(advances);
  const dbMaterials = await db.select().from(materials);
  const dbEquipment = await db.select().from(equipment);
  const dbLogs = await db.select().from(siteLogs);

  // Group attendance by siteId -> date -> records
  const attendanceMap: Record<string, Record<string, AttendanceRecord[]>> = {};
  for (const row of dbAttendance) {
    if (!attendanceMap[row.siteId]) attendanceMap[row.siteId] = {};
    if (!attendanceMap[row.siteId][row.date]) attendanceMap[row.siteId][row.date] = [];

    attendanceMap[row.siteId][row.date].push({
      workerId: row.workerId,
      status: row.status as any,
      hSup: row.hSup,
      absenceHours: row.absenceHours,
      note: row.note || undefined,
      checkInTime: row.checkInTime || undefined,
    });
  }

  return {
    sites: dbSites.map((s) => ({
      id: s.id,
      name: s.name,
      client: s.client || '',
      address: s.address || '',
      radius: s.radius || 150,
      supervisor: s.supervisor || '',
      budget: s.budget || 0,
      currency: s.currency || 'DZD',
      status: s.status as any,
      startDate: s.startDate || undefined,
      endDate: s.endDate || undefined,
    })),
    workers: dbWorkers.map((w) => ({
      id: w.id,
      site: w.siteId,
      name: w.name,
      craft: w.craft,
      rate: w.rate,
      rateType: w.rateType as any,
      team: w.team,
      phone: w.phone || undefined,
      cin: w.cin || undefined,
      active: w.active,
      experienceYears: w.experienceYears || undefined,
      notes: w.notes || undefined,
      recruitmentLevel: w.recruitmentLevel as any,
    })),
    attendance: attendanceMap,
    expenses: dbExpenses.map((e) => ({
      id: e.id,
      site: e.siteId,
      category: e.category as any,
      amount: e.amount,
      date: e.date,
      beneficiary: e.beneficiary || undefined,
      paymentMethod: e.paymentMethod as any,
      invoiceRef: e.invoiceRef || undefined,
      note: e.note || undefined,
    })),
    advances: dbAdvances.map((a) => ({
      id: a.id,
      site: a.siteId,
      workerId: a.workerId,
      date: a.date,
      amount: a.amount,
      method: a.method as any,
      note: a.note || undefined,
      approvedBy: a.approvedBy || undefined,
      receiptRef: a.receiptRef || undefined,
    })),
    materials: dbMaterials.map((m) => ({
      id: m.id,
      site: m.siteId,
      name: m.name,
      category: m.category || 'Général',
      unit: m.unit,
      initStock: m.initStock,
      received: m.received,
      consumed: m.consumed,
      minAlert: m.minAlert || undefined,
    })),
    materialMovements: [],
    equipment: dbEquipment.map((eqItem) => ({
      id: eqItem.id,
      site: eqItem.siteId,
      name: eqItem.name,
      hours: eqItem.hoursUsed || 0,
      fuel: 100,
      maintDue: 250,
      status: (eqItem.status === 'en_panne' ? 'en_panne' : eqItem.status === 'maintenance' ? 'a_reviser' : 'ok') as any,
      nextMaintenanceDate: eqItem.nextMaintenance || undefined,
    })),
    logs: dbLogs.map((l) => ({
      id: l.id,
      site: l.siteId,
      date: l.date,
      weather: (['Ensoleillé', 'Dégagé', 'Nuageux', 'Pluie', 'Vent fort', 'Canicule', 'Orage', 'Neige'].includes(l.weather || '') ? l.weather : 'Ensoleillé') as any,
      temp: l.temperature !== null ? Number(l.temperature) : 22,
      note: l.workSummary || '',
      incidents: l.incidents || '',
      lostHours: Number(l.lostHours) || 0,
    })),
  };
}

/**
 * pgvector semantic search using cosine distance (<=>)
 */
export async function searchVectorEmbeddings(
  queryVector: number[],
  siteId?: string,
  limit: number = 5
) {
  try {
    const vectorString = `[${queryVector.join(',')}]`;

    let query;
    if (siteId) {
      query = sql`
        SELECT 
          id, 
          site_id as "siteId", 
          document_type as "documentType", 
          reference_id as "referenceId", 
          title, 
          content, 
          metadata, 
          1 - (embedding <=> ${vectorString}::vector) as similarity
        FROM vector_embeddings
        WHERE (site_id = ${siteId} OR site_id IS NULL)
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${vectorString}::vector ASC
        LIMIT ${limit};
      `;
    } else {
      query = sql`
        SELECT 
          id, 
          site_id as "siteId", 
          document_type as "documentType", 
          reference_id as "referenceId", 
          title, 
          content, 
          metadata, 
          1 - (embedding <=> ${vectorString}::vector) as similarity
        FROM vector_embeddings
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> ${vectorString}::vector ASC
        LIMIT ${limit};
      `;
    }

    const result = await db.execute(query);
    return result.rows;
  } catch (error: any) {
    console.error('Vector search failed in pgvector:', error);
    throw new Error('Erreur de recherche vectorielle: ' + error.message, { cause: error });
  }
}

/**
 * Insert or update a document embedding in pgvector
 */
export async function insertVectorEmbedding(data: {
  siteId?: string;
  documentType: string;
  referenceId?: string;
  title: string;
  content: string;
  metadata?: any;
  embedding: number[];
}) {
  const result = await db
    .insert(vectorEmbeddings)
    .values({
      siteId: data.siteId || null,
      documentType: data.documentType,
      referenceId: data.referenceId || null,
      title: data.title,
      content: data.content,
      metadata: data.metadata || {},
      embedding: data.embedding,
    })
    .returning();

  return result[0];
}
