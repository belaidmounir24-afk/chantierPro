// src/mcp/server.ts
import type { McpServerManifest, McpCallToolRequest, McpCallToolResponse, McpResource, McpPrompt } from './types.ts';
import { MCP_TOOLS, executeMcpTool } from './tools.ts';
import { GoogleGenAI } from '@google/genai';

export const CHANTIER_PRO_MCP_MANIFEST: McpServerManifest = {
  name: 'chantierpro-btp-mcp-server',
  version: '2.5.0',
  protocolVersion: '2024-11-05',
  description: 'Serveur Model Context Protocol (MCP) pour la gestion intelligente de chantier BTP : pointage, paie, pgvector RAG et matériel.',
  capabilities: {
    tools: {
      listChanged: true,
    },
    resources: {
      subscribe: false,
      listChanged: false,
    },
    prompts: {
      listChanged: false,
    },
  },
  serverInfo: {
    name: 'ChantierPro Enterprise MCP',
    version: '2.5.0',
    environment: 'Node.js Express / Cloud Run',
    database: 'PostgreSQL 16 (Cloud SQL)',
    vectorStore: 'pgvector (768 dimensions - Gemini text-embedding-004)',
  },
};

export const CHANTIER_PRO_MCP_RESOURCES: McpResource[] = [
  {
    uri: 'chantierpro://schema/database',
    name: 'PostgreSQL Schema Drizzle',
    description: 'Structure relationnelle complète des tables et clés étrangères de ChantierPro.',
    mimeType: 'application/json',
  },
  {
    uri: 'chantierpro://regulations/algerian-labor-code',
    name: 'Code du Travail & Règle des 8h/j',
    description: 'Règles de calcul du salaire au prorata horaire sur base de 8 heures par jour, heures supplémentaires et acomptes.',
    mimeType: 'text/markdown',
  },
];

export const CHANTIER_PRO_MCP_PROMPTS: McpPrompt[] = [
  {
    name: 'audit_chantier_360',
    description: 'Génère un audit exécutif d\'un chantier en utilisant les outils MCP de pointage, caisse et matériaux.',
    arguments: [
      {
        name: 'siteId',
        description: 'Identifiant du chantier',
        required: true,
      },
    ],
  },
  {
    name: 'recherche_procedure_technique',
    description: 'Interroge la mémoire vectorielle pgvector pour trouver les règles de coulage, cure ou sécurité applicables.',
    arguments: [
      {
        name: 'query',
        description: 'Question technique BTP',
        required: true,
      },
    ],
  },
];

export async function handleMcpToolCall(
  request: McpCallToolRequest,
  aiClient?: GoogleGenAI
): Promise<McpCallToolResponse> {
  return await executeMcpTool(request.name, request.arguments || {}, aiClient);
}
