// src/mcp/types.ts
/**
 * Model Context Protocol (MCP) Specification Types
 * Reference: https://modelcontextprotocol.io
 */

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      items?: any;
    }>;
    required?: string[];
  };
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface McpServerManifest {
  name: string;
  version: string;
  protocolVersion: string;
  description: string;
  capabilities: {
    tools: {
      listChanged?: boolean;
    };
    resources?: {
      subscribe?: boolean;
      listChanged?: boolean;
    };
    prompts?: {
      listChanged?: boolean;
    };
  };
  serverInfo: {
    name: string;
    version: string;
    environment: string;
    database: string;
    vectorStore: string;
  };
}

export interface McpCallToolRequest {
  name: string;
  arguments: Record<string, any>;
}

export interface McpCallToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: any;
  }>;
  isError?: boolean;
}
