// src/routes/apiRouter.ts
import { Router } from 'express';
import { getDbHealth, syncStateToPostgres, pullStateFromPostgres, searchVectorEmbeddings, insertVectorEmbedding } from '../db/service.ts';
import { seedInitialData } from '../db/seed.ts';
import { CHANTIER_PRO_MCP_MANIFEST, CHANTIER_PRO_MCP_RESOURCES, CHANTIER_PRO_MCP_PROMPTS, handleMcpToolCall } from '../mcp/server.ts';
import { MCP_TOOLS } from '../mcp/tools.ts';
import { GoogleGenAI } from '@google/genai';
import { optionalAuth } from '../middleware/auth.ts';

export function createApiRouter(getGenAI: () => GoogleGenAI) {
  const router = Router();

  // 1. Database & pgvector Health
  router.get('/db/health', async (req, res) => {
    try {
      const health = await getDbHealth();
      res.json(health);
    } catch (error: any) {
      res.status(500).json({ status: 'error', error: error?.message });
    }
  });

  // 2. Database Seeding
  router.post('/db/seed', async (req, res) => {
    try {
      let aiClient: GoogleGenAI | undefined;
      try {
        aiClient = getGenAI();
      } catch {
        // AI client optional for seeding basic tables
      }
      const result = await seedInitialData(aiClient);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message });
    }
  });

  // 3. PostgreSQL Sync
  router.post('/db/sync', optionalAuth, async (req, res) => {
    try {
      const { localDb } = req.body;
      if (localDb) {
        await syncStateToPostgres(localDb);
      }
      const remoteDb = await pullStateFromPostgres();
      res.json({
        success: true,
        syncedAt: new Date().toISOString(),
        remoteDb,
      });
    } catch (error: any) {
      console.error('API DB Sync error:', error);
      res.status(500).json({ success: false, error: error?.message });
    }
  });

  router.get('/db/state', optionalAuth, async (req, res) => {
    try {
      const state = await pullStateFromPostgres();
      res.json({ success: true, data: state });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message });
    }
  });

  // 4. Model Context Protocol (MCP) Endpoints
  router.get('/mcp/manifest', (req, res) => {
    res.json(CHANTIER_PRO_MCP_MANIFEST);
  });

  router.get('/mcp/tools', (req, res) => {
    res.json({ tools: MCP_TOOLS });
  });

  router.get('/mcp/resources', (req, res) => {
    res.json({ resources: CHANTIER_PRO_MCP_RESOURCES });
  });

  router.get('/mcp/prompts', (req, res) => {
    res.json({ prompts: CHANTIER_PRO_MCP_PROMPTS });
  });

  router.post('/mcp/call', async (req, res) => {
    try {
      const { name, arguments: toolArgs } = req.body;
      if (!name) {
        return res.status(400).json({ isError: true, content: [{ type: 'text', text: 'Nom d\'outil manquant.' }] });
      }

      let aiClient: GoogleGenAI | undefined;
      try {
        aiClient = getGenAI();
      } catch {
        // May be needed for vector search
      }

      const result = await handleMcpToolCall({ name, arguments: toolArgs || {} }, aiClient);
      res.json(result);
    } catch (error: any) {
      console.error('MCP Call Error:', error);
      res.status(500).json({
        isError: true,
        content: [{ type: 'text', text: error?.message || 'Erreur d\'exécution de l\'outil MCP.' }],
      });
    }
  });

  // 5. pgvector Semantic Search & Indexing
  router.post('/vectors/search', async (req, res) => {
    try {
      const { query, siteId, limit = 5 } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Paramètre "query" requis.' });
      }

      const ai = getGenAI();
      const embedResponse = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: query,
      });

      const embedding = (embedResponse as any).embedding?.values || embedResponse.embeddings?.[0]?.values;
      if (!embedding || embedding.length === 0) {
        return res.status(500).json({ error: 'Échec de génération du vecteur de recherche.' });
      }

      const results = await searchVectorEmbeddings(embedding, siteId, limit);
      res.json({ success: true, query, results });
    } catch (error: any) {
      console.error('Vector Search Error:', error);
      res.status(500).json({ error: error?.message || 'Erreur lors de la recherche vectorielle.' });
    }
  });

  router.post('/vectors/index', async (req, res) => {
    try {
      const { title, content, documentType, siteId, metadata } = req.body;
      if (!title || !content || !documentType) {
        return res.status(400).json({ error: 'Champs title, content et documentType obligatoires.' });
      }

      const ai = getGenAI();
      const textToEmbed = `${title}\n\n${content}`;
      const embedResponse = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: textToEmbed,
      });

      const embedding = (embedResponse as any).embedding?.values || embedResponse.embeddings?.[0]?.values;
      if (!embedding || embedding.length === 0) {
        return res.status(500).json({ error: 'Échec de génération du vecteur du document.' });
      }

      const saved = await insertVectorEmbedding({
        siteId,
        documentType,
        title,
        content,
        metadata: metadata || {},
        embedding,
      });

      res.json({ success: true, document: saved });
    } catch (error: any) {
      console.error('Vector Indexing Error:', error);
      res.status(500).json({ error: error?.message || 'Erreur d\'indexation vectorielle.' });
    }
  });

  // 6. Intelligent AI Copilot with MCP Tools & pgvector Integration
  router.post('/ai/copilot', async (req, res) => {
    try {
      const { message, siteId, history = [], language = 'fr' } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message requis.' });
      }

      const ai = getGenAI();

      // First: check if semantic vector search is relevant
      let vectorContextText = '';
      try {
        const embedResponse = await ai.models.embedContent({
          model: 'text-embedding-004',
          contents: message,
        });
        const queryVector = (embedResponse as any).embedding?.values || embedResponse.embeddings?.[0]?.values;
        if (queryVector && queryVector.length > 0) {
          const matchedVectors = await searchVectorEmbeddings(queryVector, siteId, 3);
          if (matchedVectors.length > 0) {
            vectorContextText = `\n\n[CONTEXTE DE CONNAISSANCE CHANTIER RETROUVÉ VIA PGVECTOR] :\n` +
              matchedVectors.map((v: any) => `- [${v.documentType}] ${v.title} : ${v.content} (Score similarité: ${Math.round((v.similarity || 0) * 100)}%)`).join('\n');
          }
        }
      } catch (e) {
        console.warn('Vector context extraction skipped:', e);
      }

      // Second: check site summary tool to provide real-time metrics
      let siteSummaryText = '';
      try {
        const siteToolRes = await handleMcpToolCall({ name: 'get_site_summary', arguments: { siteId } });
        if (siteToolRes.content[0]?.text) {
          siteSummaryText = `\n\n[MÉTRIQUES RÉELLES DU CHANTIER DEPUIS POSTGRESQL] :\n${siteToolRes.content[0].text}`;
        }
      } catch (e) {
        console.warn('Site summary tool skipped:', e);
      }

      const systemPrompt = `Tu es l'Assistant IA Principal & Copilote ChantierPro BTP, connecté à une base PostgreSQL avec pgvector et propulsé par le protocole MCP (Model Context Protocol).
Tu assistes les conducteurs de travaux, ingénieurs et chefs de chantier en Algérie et à l'international.
Règles strictes :
1. Tu réponds de façon professionnelle, concise et technique (vocabulaire BTP : coffrage, ferraillage, coulage, PV de chantier, pointage).
2. Base salariale : la journée normale est strictement de 8 heures (prorata horaire = tarif journalier ÷ 8h).
3. Utilise les données réelles fournies dans le contexte ci-dessous pour formuler des réponses précises et chiffrées.
4. Réponds dans la langue demandée (${language}).`;

      const prompt = `Question / Requête de l'utilisateur :
"${message}"

${vectorContextText}
${siteSummaryText}

Formule une réponse experte, précise et actionnable. Si des actions opérationnelles ou des alertes sont identifiées, mentionne-les avec clarté.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.3,
        },
      });

      res.json({
        success: true,
        reply: response.text,
        mcpContextIncluded: Boolean(vectorContextText || siteSummaryText),
      });
    } catch (error: any) {
      console.error('AI Copilot Error:', error);
      res.status(500).json({ error: error?.message || 'Erreur du Copilote IA.' });
    }
  });

  return router;
}
