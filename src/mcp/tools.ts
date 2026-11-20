// src/mcp/tools.ts
import type { McpTool, McpCallToolResponse } from './types.ts';
import { db } from '../db/index.ts';
import { sites, workers, attendance, expenses, materials, equipment, siteLogs, vectorEmbeddings } from '../db/schema.ts';
import { eq, sql } from 'drizzle-orm';
import { GoogleGenAI } from '@google/genai';
import { searchVectorEmbeddings, insertVectorEmbedding, getDbHealth } from '../db/service.ts';

// Tools catalog exposed via MCP
export const MCP_TOOLS: McpTool[] = [
  {
    name: 'get_site_summary',
    description: 'Récupère une synthèse complète d\'un chantier BTP : budget, effectif ouvriers, alertes stocks et météo.',
    inputSchema: {
      type: 'object',
      properties: {
        siteId: {
          type: 'string',
          description: 'Identifiant unique du chantier (ex: site-alger-centre ou laisser vide pour le premier chantier)',
        },
      },
    },
  },
  {
    name: 'calculate_workforce_payroll',
    description: 'Calcule la masse salariale et les heures réelles travaillées d\'un chantier au prorata strict (base légale 8h/j) avec heures sup et déductions.',
    inputSchema: {
      type: 'object',
      properties: {
        siteId: {
          type: 'string',
          description: 'Identifiant du chantier',
        },
        monthPrefix: {
          type: 'string',
          description: 'Mois au format YYYY-MM (ex: 2026-10)',
        },
      },
      required: ['siteId'],
    },
  },
  {
    name: 'search_vector_knowledge',
    description: 'Effectue une recherche sémantique vectorielle pgvector sur la mémoire du chantier (procédures de sécurité, fiches techniques, incidents passés, notes de chantier).',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Question ou concept recherché (ex: consignes de sécurité coffrage, dalle béton fissure)',
        },
        siteId: {
          type: 'string',
          description: 'Identifiant du chantier (optionnel pour recherche globale)',
        },
        limit: {
          type: 'number',
          description: 'Nombre maximum de résultats (défaut: 4)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'index_site_document',
    description: 'Vectorise un document ou une note de chantier avec l\'API Google Gemini et l\'enregistre dans la table pgvector de PostgreSQL.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titre du document ou de la procédure',
        },
        content: {
          type: 'string',
          description: 'Texte complet du document à indexer',
        },
        documentType: {
          type: 'string',
          description: 'Type de document (ex: procedure_securite, fiche_technique, journal_chantier)',
        },
        siteId: {
          type: 'string',
          description: 'Identifiant du chantier associé (optionnel)',
        },
      },
      required: ['title', 'content', 'documentType'],
    },
  },
  {
    name: 'record_site_expense',
    description: 'Enregistre une nouvelle dépense de caisse pour un chantier directement dans PostgreSQL.',
    inputSchema: {
      type: 'object',
      properties: {
        siteId: {
          type: 'string',
          description: 'Identifiant du chantier',
        },
        category: {
          type: 'string',
          description: 'Catégorie de la dépense (ex: Carburant, Quincaillerie, Transport, Restauration)',
        },
        amount: {
          type: 'number',
          description: 'Montant en devises (DZD)',
        },
        beneficiary: {
          type: 'string',
          description: 'Bénéficiaire ou fournisseur',
        },
        paymentMethod: {
          type: 'string',
          description: 'Mode de paiement (Espèces, Virement, Chèque)',
        },
        note: {
          type: 'string',
          description: 'Détails ou motif de la dépense',
        },
      },
      required: ['siteId', 'category', 'amount'],
    },
  },
  {
    name: 'check_equipment_maintenance',
    description: 'Inspecte le parc matériel et liste les engins dont la maintenance ou vidange est imminente ou dépassée.',
    inputSchema: {
      type: 'object',
      properties: {
        siteId: {
          type: 'string',
          description: 'Identifiant du chantier',
        },
      },
      required: ['siteId'],
    },
  },
  {
    name: 'get_database_health',
    description: 'Vérifie l\'état de la base de données PostgreSQL, de l\'extension pgvector et des tables.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

/**
 * Execute an MCP Tool by name
 */
export async function executeMcpTool(
  toolName: string,
  args: Record<string, any>,
  aiClient?: GoogleGenAI
): Promise<McpCallToolResponse> {
  try {
    switch (toolName) {
      case 'get_database_health': {
        const health = await getDbHealth();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(health, null, 2),
            },
          ],
        };
      }

      case 'get_site_summary': {
        let siteId = args.siteId;
        if (!siteId) {
          const allSites = await db.select().from(sites).limit(1);
          if (allSites.length === 0) {
            return {
              content: [{ type: 'text', text: 'Aucun chantier trouvé dans la base de données.' }],
            };
          }
          siteId = allSites[0].id;
        }

        const site = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
        if (site.length === 0) {
          return {
            content: [{ type: 'text', text: `Chantier introuvable avec l'ID ${siteId}` }],
            isError: true,
          };
        }

        const siteWorkers = await db.select().from(workers).where(eq(workers.siteId, siteId));
        const siteMaterials = await db.select().from(materials).where(eq(materials.siteId, siteId));
        const siteEquipment = await db.select().from(equipment).where(eq(equipment.siteId, siteId));
        const siteExpenses = await db.select().from(expenses).where(eq(expenses.siteId, siteId));

        const totalExpenses = siteExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const lowStockMaterials = siteMaterials.filter((m) => {
          const remaining = (m.received || 0) - (m.consumed || 0);
          return m.minAlert ? remaining <= m.minAlert : remaining <= 0;
        });

        const summary = {
          site: site[0],
          totalWorkers: siteWorkers.length,
          activeWorkers: siteWorkers.filter((w) => w.active).length,
          totalExpensesAmount: totalExpenses,
          budgetRemaining: (site[0].budget || 0) - totalExpenses,
          lowStockAlerts: lowStockMaterials.length,
          lowStockList: lowStockMaterials.map((m) => ({
            name: m.name,
            remaining: (m.received || 0) - (m.consumed || 0),
            unit: m.unit,
            minAlert: m.minAlert,
          })),
          equipmentCount: siteEquipment.length,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      }

      case 'calculate_workforce_payroll': {
        const { siteId, monthPrefix = new Date().toISOString().slice(0, 7) } = args;
        const siteWorkers = await db.select().from(workers).where(eq(workers.siteId, siteId));
        const attRows = await db.select().from(attendance).where(eq(attendance.siteId, siteId));

        const monthRows = attRows.filter((r) => r.date.startsWith(monthPrefix));

        let totalGross = 0;
        let totalHoursAll = 0;
        let totalOvertimeAll = 0;

        const workersPayroll = siteWorkers.map((w) => {
          const wRows = monthRows.filter((r) => r.workerId === w.id);
          const tarifJournalier = w.rate || 0;
          const tarifHoraire = w.rateType === 'heure' ? tarifJournalier : tarifJournalier / 8;

          let workerHours = 0;
          let workerOvertime = 0;

          wRows.forEach((r) => {
            const hSup = r.hSup || 0;
            const absence = r.absenceHours || 0;
            if (r.status === 'P') {
              workerHours += Math.max(0, 8 - absence) + hSup;
            } else if (r.status === 'R') {
              const effAbs = absence > 0 ? absence : 1;
              workerHours += Math.max(0, 8 - effAbs) + hSup;
            } else if (r.status === 'J') {
              workerHours += 8 + hSup;
            } else if (r.status === 'A') {
              if (absence > 0 && absence < 8) {
                workerHours += Math.max(0, 8 - absence) + hSup;
              } else {
                workerHours += hSup;
              }
            }
            workerOvertime += hSup;
          });

          const gross = Math.round(workerHours * tarifHoraire);
          totalGross += gross;
          totalHoursAll += workerHours;
          totalOvertimeAll += workerOvertime;

          return {
            workerId: w.id,
            name: w.name,
            craft: w.craft,
            team: w.team,
            rate: w.rate,
            rateType: w.rateType,
            tarifHoraire: Math.round(tarifHoraire),
            totalHours: workerHours,
            overtimeHours: workerOvertime,
            grossSalary: gross,
          };
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  siteId,
                  month: monthPrefix,
                  workforceCount: siteWorkers.length,
                  totalHoursAll,
                  totalOvertimeAll,
                  totalPayrollGross: totalGross,
                  workers: workersPayroll,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'search_vector_knowledge': {
        const { query, siteId, limit = 4 } = args;
        if (!aiClient) {
          throw new Error('Client Google GenAI non configuré.');
        }

        // Generate query embedding via Gemini
        const embedResponse = await aiClient.models.embedContent({
          model: 'text-embedding-004',
          contents: query,
        });

        const embedding = (embedResponse as any).embedding?.values || embedResponse.embeddings?.[0]?.values;
        if (!embedding || embedding.length === 0) {
          throw new Error('Impossible de générer le vecteur pour la requête.');
        }

        const results = await searchVectorEmbeddings(embedding, siteId, limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'index_site_document': {
        const { title, content, documentType, siteId } = args;
        if (!aiClient) {
          throw new Error('Client Google GenAI non configuré.');
        }

        const textToEmbed = `${title}\n\n${content}`;
        const embedResponse = await aiClient.models.embedContent({
          model: 'text-embedding-004',
          contents: textToEmbed,
        });

        const embedding = (embedResponse as any).embedding?.values || embedResponse.embeddings?.[0]?.values;
        if (!embedding || embedding.length === 0) {
          throw new Error('Échec de la vectorisation du document.');
        }

        const saved = await insertVectorEmbedding({
          siteId,
          documentType,
          title,
          content,
          metadata: { indexedAt: new Date().toISOString(), length: content.length },
          embedding,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Document vectorisé et inséré avec succès dans pgvector.',
                  documentId: saved.id,
                  title: saved.title,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'record_site_expense': {
        const { siteId, category, amount, beneficiary = '', paymentMethod = 'Espèces', note = '' } = args;
        const newId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const today = new Date().toISOString().slice(0, 10);

        const saved = await db
          .insert(expenses)
          .values({
            id: newId,
            siteId,
            category,
            amount: Number(amount),
            date: today,
            beneficiary,
            paymentMethod,
            note,
          })
          .returning();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Dépense enregistrée avec succès dans PostgreSQL.',
                  expense: saved[0],
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'check_equipment_maintenance': {
        const { siteId } = args;
        const siteEq = await db.select().from(equipment).where(eq(equipment.siteId, siteId));

        const alerts = siteEq.map((e) => {
          const hours = e.hoursUsed || 0;
          const nextHours = 250; // standard 250h revision cycle
          const remaining = nextHours - (hours % nextHours);
          const isUrgent = remaining <= 20;

          return {
            id: e.id,
            name: e.name,
            category: e.category,
            status: e.status,
            hoursUsed: hours,
            hoursUntilService: remaining,
            urgent: isUrgent,
            nextMaintenanceDate: e.nextMaintenance || 'Non planifiée',
          };
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(alerts, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Outil MCP inconnu: ${toolName}` }],
          isError: true,
        };
    }
  } catch (error: any) {
    console.error(`MCP Tool Execution Error (${toolName}):`, error);
    return {
      content: [{ type: 'text', text: `Erreur: ${error?.message || 'Erreur d\'exécution'}` }],
      isError: true,
    };
  }
}
