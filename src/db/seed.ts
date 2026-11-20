// src/db/seed.ts
import { db } from './index.ts';
import { sites, workers, materials, equipment, vectorEmbeddings } from './schema.ts';
import { GoogleGenAI } from '@google/genai';

export async function seedInitialData(aiClient?: GoogleGenAI) {
  try {
    // 1. Check if sites exist
    const existingSites = await db.select().from(sites).limit(1);
    const siteId = 'site-mustapha-alger';

    if (existingSites.length === 0) {
      await db.insert(sites).values({
        id: siteId,
        name: 'CHU Mustapha Pacha — Rénovation Bâtiment A',
        client: 'Direction Générale CHU Mustapha',
        address: 'Place du 1er Mai, Alger Centre',
        radius: 180,
        supervisor: 'Ing. Mounir Belaid',
        budget: 45000000,
        currency: 'DZD',
        status: 'en_cours',
        startDate: '2026-01-15',
        endDate: '2026-12-30',
      });

      // Sample workers
      await db.insert(workers).values([
        {
          id: 'w-1',
          siteId,
          name: 'Ahmed Benali',
          craft: 'Maçon Finisseur',
          rate: 4000,
          rateType: 'jour',
          team: 'Équipe A — Gros Œuvre',
          phone: '0550 12 34 56',
          cin: '160012345678',
          active: true,
          experienceYears: 8,
          recruitmentLevel: 'Niveau 3 — Compagnon Professionnel (OP2)',
        },
        {
          id: 'w-2',
          siteId,
          name: 'Karim Mansouri',
          craft: 'Ferrailleur / Coffreur',
          rate: 4500,
          rateType: 'jour',
          team: 'Équipe A — Gros Œuvre',
          phone: '0661 98 76 54',
          cin: '160098765432',
          active: true,
          experienceYears: 10,
          recruitmentLevel: 'Niveau 4 — Maître Ouvrier / Chef d\'Équipe',
        },
        {
          id: 'w-3',
          siteId,
          name: 'Yacine Khelifi',
          craft: 'Plombier Sanitaire & Chauffage',
          rate: 550,
          rateType: 'heure',
          team: 'Équipe B — Second Œuvre',
          phone: '0770 45 67 89',
          cin: '160045678912',
          active: true,
          experienceYears: 6,
          recruitmentLevel: 'Niveau 3 — Compagnon Professionnel (OP2)',
        },
        {
          id: 'w-4',
          siteId,
          name: 'Sofiane Dahmani',
          craft: 'Électricien BTP & Courants Faibles',
          rate: 500,
          rateType: 'heure',
          team: 'Équipe B — Second Œuvre',
          phone: '0555 33 22 11',
          cin: '160033221144',
          active: true,
          experienceYears: 5,
          recruitmentLevel: 'Niveau 2 — Ouvrier Professionnel (OP1)',
        },
      ]);

      // Sample materials
      await db.insert(materials).values([
        {
          id: 'm-1',
          siteId,
          name: 'Ciment CPJ 42.5 (Sacs 50kg)',
          category: 'Liants & Ciments',
          unit: 'Sacs',
          initStock: 200,
          received: 450,
          consumed: 380,
          minAlert: 50,
        },
        {
          id: 'm-2',
          siteId,
          name: 'Rond à béton FeE500 Diamètre 12mm',
          category: 'Armatures & Aciers',
          unit: 'Tonnes',
          initStock: 5,
          received: 12,
          consumed: 9.5,
          minAlert: 2,
        },
        {
          id: 'm-3',
          siteId,
          name: 'Sable d\'Oued 0/4 criblé',
          category: 'Granulats',
          unit: 'm³',
          initStock: 15,
          received: 60,
          consumed: 54,
          minAlert: 10,
        },
      ]);

      // Sample equipment
      await db.insert(equipment).values([
        {
          id: 'eq-1',
          siteId,
          name: 'Bétonnière thermique 500L Honda',
          category: 'Matériel de bétonnage',
          status: 'operationnel',
          operator: 'Ahmed Benali',
          hoursUsed: 180,
          nextMaintenance: '2026-10-15',
        },
        {
          id: 'eq-2',
          siteId,
          name: 'Mini-pelle Caterpillar 303.5E CR',
          category: 'Terrassement',
          status: 'operationnel',
          operator: 'Brahim Saadi',
          hoursUsed: 420,
          nextMaintenance: '2026-10-20',
        },
      ]);
    }

    // 2. Sample Vector Knowledge Base Documents (if none present and AI client provided)
    const existingVectors = await db.select().from(vectorEmbeddings).limit(1);
    if (existingVectors.length === 0 && aiClient) {
      const documentsToSeed = [
        {
          title: 'Directives Sécurité — Travaux en Hauteur & Échafaudages BTP',
          content: 'Le port du harnais de sécurité à double longe conforme NF EN 361 est strictement obligatoire pour tout travail au-delà de 2 mètres. Vérifier la conformité des plinthes, des garde-corps (lisse à 1.10m, sous-lisse à 0.45m) et des cales de stabilisation avant tout accès.',
          documentType: 'procedure_securite',
        },
        {
          title: 'Spécifications Techniques — Coulage et Cure du Béton Armé',
          content: 'En cas de forte chaleur (> 30°C) ou de sirocco, le coulage doit être réalisé tôt le matin. L\'utilisation d\'un produit de cure par pulvérisation ou le bâchage géotextile humide continu pendant 7 jours est impératif pour éviter les fissures de retrait plastique.',
          documentType: 'fiche_technique',
        },
        {
          title: 'Règlementation Pointage — Prorata d\'une journée de 8 heures',
          content: 'Conformément au code du travail algérien (Loi 90-11) et aux normes de ChantierPro BTP, la journée normale de travail équivaut à 8 heures réelles. Le tarif horaire est égal au tarif journalier divisé par 8. Toute heure d\'absence ou de retard est déduite au taux horaire exact. Les heures supplémentaires au-delà de 8h ouvrent droit aux majorations légales.',
          documentType: 'reglementation',
        },
        {
          title: 'Plan d\'Hygiène et Sécurité (PHS) — Gestion des Déchets & Tri Chantier',
          content: 'Les gravats inertes, chutes de ferraille et emballages plastiques/cartons doivent être collectés dans des bennes distinctes identifiées. Évacuation sous bordereau de suivi vers la décharge contrôlée communale autorisée.',
          documentType: 'securite_environnement',
        },
      ];

      for (const doc of documentsToSeed) {
        try {
          const embedRes = await aiClient.models.embedContent({
            model: 'text-embedding-004',
            contents: `${doc.title}\n\n${doc.content}`,
          });

          const embedding = (embedRes as any).embedding?.values || embedRes.embeddings?.[0]?.values;
          if (embedding && embedding.length > 0) {
            await db.insert(vectorEmbeddings).values({
              siteId,
              documentType: doc.documentType,
              title: doc.title,
              content: doc.content,
              metadata: { isSample: true, seededAt: new Date().toISOString() },
              embedding,
            });
          }
        } catch (e) {
          console.warn(`Could not seed embedding for "${doc.title}":`, e);
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Seeding error:', error);
    return { success: false, error };
  }
}
