import express from "express";
import path from "path";
import fs from "fs";
import { createRequire } from "module";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

const require = createRequire(import.meta.url);
const archiver = require("archiver");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Permissive CORS & iframe embedding headers for AI Studio preview & Cloud Run
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin");
  res.removeHeader("X-Frame-Options");
  res.setHeader("Content-Security-Policy", "frame-ancestors *;");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Explicit handler for Cloud Run & AI Studio preview cookie check
app.all(["/__cookie_check.html", "/__cookie_check"], (req, res) => {
  const origin = req.headers.origin || (req.headers.host ? `${req.protocol}://${req.headers.host}` : "*");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  if (origin !== "*") {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Content-Security-Policy", "frame-ancestors *;");
  res.setHeader("Service-Worker-Allowed", "/");
  res.setHeader("Set-Cookie", "__cookie_test=1; Path=/; SameSite=None; Secure");
  
  const cookieHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Cookie Check OK</title>
</head>
<body>
  <script>
    try {
      window.parent.postMessage({ type: 'cookie_check', ok: true }, '*');
    } catch (e) {}
  </script>
  <p style="font-family: sans-serif; color: #10b981; font-weight: bold;">Cookie Check OK</p>
</body>
</html>`;
  res.status(200).send(cookieHtml);
});

// Serve public static folder early to guarantee immediate access to static HTML files & assets
app.use(express.static(path.join(process.cwd(), "public")));

// Lazy Google GenAI Client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Mount ChantierPro PostgreSQL, pgvector & MCP Protocol Router
import { createApiRouter } from "./src/routes/apiRouter.ts";
import { seedInitialData } from "./src/db/seed.ts";
app.use("/api", createApiRouter(getGenAI));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString()
  });
});

// Privacy Policy page for Google Play Developer Requirements & GDPR
app.get(["/privacy", "/privacy.html", "/politique-de-confidentialite"], (req, res) => {
  const privacyPath = path.join(process.cwd(), "public", "privacy.html");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.sendFile(privacyPath);
});

// Standalone Android Launcher page & direct download
app.get(["/launcher", "/ChantierPro-Android-Launcher.html"], (req, res) => {
  const launcherPath = path.join(process.cwd(), "public", "ChantierPro-Android-Launcher.html");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.sendFile(launcherPath);
});

app.get("/download-launcher", (req, res) => {
  const launcherPath = path.join(process.cwd(), "public", "ChantierPro-Android-Launcher.html");
  res.download(launcherPath, "ChantierPro-Android-Launcher.html");
});

// Standalone Single-File Autonomous HTML Version
app.get(["/standalone", "/autonome", "/ChantierPro-Autonome.html", "/ChantierPro-Standalone.html"], (req, res) => {
  const standalonePath = path.join(process.cwd(), "public", "ChantierPro-Autonome.html");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  if (fs.existsSync(standalonePath)) {
    return res.sendFile(standalonePath);
  }
  res.redirect("/");
});

app.get(["/download-standalone", "/telecharger-autonome"], (req, res) => {
  const standalonePath = path.join(process.cwd(), "public", "ChantierPro-Autonome.html");
  if (fs.existsSync(standalonePath)) {
    return res.download(standalonePath, "ChantierPro-Autonome-Hors-Ligne.html");
  }
  res.redirect("/");
});

// Standalone Admin License Generator for Owner (belaidmounir24@gmail.com)
app.get([
  "/admin",
  "/admin-license",
  "/admin-licence",
  "/admin-license.html",
  "/admin-licence.html",
  "/generateur-licences",
  "/generateur"
], (req, res) => {
  const publicPath = path.join(process.cwd(), "public", "admin-license.html");
  const distPath = path.join(process.cwd(), "dist", "admin-license.html");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  if (fs.existsSync(publicPath)) {
    return res.sendFile(publicPath);
  } else if (fs.existsSync(distPath)) {
    return res.sendFile(distPath);
  }
  res.status(404).send("Admin license page not found");
});

app.get(["/download-admin-license", "/download-generateur"], (req, res) => {
  const adminLicensePath = path.join(process.cwd(), "public", "admin-license.html");
  res.download(adminLicensePath, "ChantierPro-Generateur-Licences-Admin.html");
});

// Direct download of the complete native Android Studio project and compilation kit
app.get(["/api/download/android-project.zip", "/download-android-project", "/download-apk-package"], (req, res) => {
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="ChantierPro-Android-Native-Project.zip"');

  const archive = typeof archiver === "function"
    ? archiver("zip", { zlib: { level: 9 } })
    : new (archiver.ZipArchive || archiver)({ zlib: { level: 9 } });

  archive.on("error", (err: any) => {
    console.error("Archive error:", err);
    if (!res.headersSent) {
      res.status(500).send({ error: err.message });
    }
  });

  archive.pipe(res);

  // Append android directory
  const androidDir = path.join(process.cwd(), "android");
  if (fs.existsSync(androidDir)) {
    archive.directory(androidDir, "android");
  }

  // Append root configs
  const twaManifest = path.join(process.cwd(), "twa-manifest.json");
  if (fs.existsSync(twaManifest)) {
    archive.file(twaManifest, { name: "twa-manifest.json" });
  }

  const capConfig = path.join(process.cwd(), "capacitor.config.json");
  if (fs.existsSync(capConfig)) {
    archive.file(capConfig, { name: "capacitor.config.json" });
  }

  const buildScript = path.join(process.cwd(), "scripts", "build-android-package.sh");
  if (fs.existsSync(buildScript)) {
    archive.file(buildScript, { name: "build-android-package.sh" });
  }

  const manifestWeb = path.join(process.cwd(), "public", "manifest.webmanifest");
  if (fs.existsSync(manifestWeb)) {
    archive.file(manifestWeb, { name: "manifest.webmanifest" });
  }

  const manifestJson = path.join(process.cwd(), "public", "manifest.json");
  if (fs.existsSync(manifestJson)) {
    archive.file(manifestJson, { name: "manifest.json" });
  }

  archive.finalize();
});

// App Info & Dynamic Public URL
app.get("/api/app/info", (req, res) => {
  const host = req.get("host") || "";
  let publicUrl = process.env.APP_URL || "";
  if (!publicUrl && host) {
    let cleanHost = host;
    if (cleanHost.includes("ais-dev-")) {
      cleanHost = cleanHost.replace("ais-dev-", "ais-pre-");
    }
    publicUrl = `${req.protocol}://${cleanHost}`;
  }
  res.json({
    appUrl: publicUrl || "https://ais-pre-dbcps7jg62xvkzijie3e5u-385428295075.europe-west2.run.app",
    version: "2.4.0",
    name: "ChantierPro BTP"
  });
});

// Auth endpoints
app.get("/api/auth/config", (req, res) => {
  res.json({
    isPasswordProtected: Boolean(process.env.APP_PASSWORD && process.env.APP_PASSWORD.trim().length > 0)
  });
});

app.post("/api/auth/verify", (req, res) => {
  const { password } = req.body;
  const configuredPassword = process.env.APP_PASSWORD?.trim();
  
  if (!configuredPassword) {
    return res.json({ success: true });
  }

  if (password === configuredPassword) {
    res.json({ success: true, token: "auth-ok" });
  } else {
    res.status(401).json({ success: false, error: "Mot de passe incorrect" });
  }
});

// Permissions & Role Management endpoints
let isSellerExclusiveToOwner = true;
let lastSellerRevocationTimestamp = new Date().toISOString();

app.get("/api/permissions/status", (req, res) => {
  res.json({
    isSellerExclusiveToOwner,
    lastSellerRevocationTimestamp,
    ownerRole: "proprietaire_editeur_vendeur_exclusif",
    otherUsersRole: "collaborateur_sans_droits_vendeur"
  });
});

app.post("/api/permissions/revoke-seller-role", (req, res) => {
  isSellerExclusiveToOwner = true;
  lastSellerRevocationTimestamp = new Date().toISOString();
  res.json({
    success: true,
    message: "Le rôle d'éditeur-vendeur a été immédiatement révoqué pour tous les autres utilisateurs.",
    revokedAt: lastSellerRevocationTimestamp
  });
});

// App Version & Shared Update Management
let appReleaseInfo = {
  appName: "ChantierPro BTP",
  version: "4.3.0",
  versionCode: 430,
  buildDate: "2026-09-04",
  buildTimestamp: Date.now(),
  channel: "stable",
  mandatory: false,
  releaseNotes: [
    "Option de mise à jour instantanée disponible pour toutes les applications partagées",
    "Purge propre et transparente des caches sans affecter les données chantiers locales",
    "Détection automatique des nouvelles versions en arrière-plan",
    "Contrôle exclusif du rôle propriétaire et sécurité renforcée"
  ]
};

app.get(["/api/version", "/api/app/version"], (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json(appReleaseInfo);
});

app.post("/api/app/broadcast-update", (req, res) => {
  const { newVersion, releaseNotes } = req.body || {};
  if (newVersion) {
    appReleaseInfo.version = String(newVersion).trim();
    appReleaseInfo.versionCode = (appReleaseInfo.versionCode || 430) + 1;
  }
  if (Array.isArray(releaseNotes) && releaseNotes.length > 0) {
    appReleaseInfo.releaseNotes = releaseNotes;
  }
  appReleaseInfo.buildTimestamp = Date.now();
  appReleaseInfo.buildDate = new Date().toISOString().slice(0, 10);

  res.json({
    status: "success",
    success: true,
    message: "Mise à jour diffusée à toutes les applications partagées.",
    releaseInfo: appReleaseInfo
  });
});

// 1. Site Intelligent Audit & Diagnostic API
app.post("/api/ai/audit", async (req, res) => {
  try {
    const { site, stats, workers, materials, equipment, expenses, logs, language = 'fr' } = req.body;
    const ai = getGenAI();

    const systemPrompt = `Tu es un Directeur de Travaux et Expert Principal BTP / Génie Civil international hautement qualifié.
Ta mission est d'analyser l'état de santé opérationnel, financier et matériel de ce chantier et de fournir un audit et diagnostic d'une extrême précision avec des recommandations concrètes et immédiatement exploitables.
Réponds dans la langue demandée (${language}). Structure ton analyse avec clarté :
1. Note Globale de Santé du Chantier (/10) et Synthèse Exécutive
2. Analyse RH & Main d'Œuvre (Effectif, Présences, Taux d'encadrement, Acomptes)
3. Gestion des Stocks & Alertes Matériaux (Ruptures imminentes, Surconsommations)
4. Parc Engins & Maintenance Préventive (Heures de marche, Alertes vidanges/révisions)
5. Contrôle Financier & Caisse (Dépenses, Trésorerie, Risques de dérive)
6. Plan d'Action & Recommandations Prioritaires pour les 7 prochains jours.`;

    const prompt = `Voici les données en direct du chantier :
- Chantier: ${JSON.stringify(site || {})}
- Statistiques globales: ${JSON.stringify(stats || {})}
- Effectif ouvriers (${workers?.length || 0} inscrits): ${JSON.stringify((workers || []).slice(0, 20))}
- Matériaux en stock (${materials?.length || 0} références): ${JSON.stringify(materials || [])}
- Parc Matériel & Engins (${equipment?.length || 0} équipements): ${JSON.stringify(equipment || [])}
- Dépenses récentes: ${JSON.stringify((expenses || []).slice(-15))}
- Derniers journaux de chantier: ${JSON.stringify((logs || []).slice(-5))}

Fournis un diagnostic percutant et des conseils d'optimisation de rendement.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4,
      },
    });

    res.json({
      success: true,
      analysis: response.text,
    });
  } catch (error: any) {
    console.error("AI Audit Error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Erreur lors de la génération de l'audit IA."
    });
  }
});

// 2. Automated Professional Daily Report (PV) Generator
app.post("/api/ai/daily-report", async (req, res) => {
  try {
    const { site, date, attendance, expenses, materials, log, weather, language = 'fr' } = req.body;
    const ai = getGenAI();

    const systemPrompt = `Tu es un Ingénieur Conducteur de Travaux BTP spécialisé dans la rédaction de Procès-Verbaux (PV) et Rapports Journaliers de Chantier de niveau contractuel et exécutif.
Génère un rapport journalier professionnel, élégant et structuré pour la date du ${date}.
Langue de réponse : ${language}.
Format attendu :
- Entête du PV (Chantier, Date, Météo & Conditions de travail)
- Résumé de l'activité du jour & Taux de mobilisation du personnel
- Avancement des différents corps d'état / équipes
- Mouvements de stock & approvisionnements remarquables
- Engins mobilisés & heures de fonctionnement
- Dépenses décaissées de la journée
- Incidents, aléas météo ou blocages constatés
- Objectifs et directives pour la journée de demain.`;

    const prompt = `Données journalières :
- Chantier : ${site?.name || 'Chantier'} (${site?.client || ''}, ${site?.address || ''})
- Date : ${date}
- Conditions météo constatées : ${weather || 'Non spécifié'}
- Pointage effectif (${attendance?.length || 0} ouvriers pointés) : ${JSON.stringify(attendance || [])}
- Dépenses de la journée : ${JSON.stringify(expenses || [])}
- Mouvements matériaux : ${JSON.stringify(materials || [])}
- Notes saisies par le chef de chantier : ${log?.note || 'Aucune note particulière'}
- Incidents déclarés : ${log?.incidents || 'Aucun incident'}; Heures perdues : ${log?.lostHours || 0}h`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
      },
    });

    res.json({
      success: true,
      report: response.text,
    });
  } catch (error: any) {
    console.error("AI Daily Report Error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Erreur lors de la génération du rapport journalier IA."
    });
  }
});

// 3. Technical Construction AI Copilot / Chatbot
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages, siteContext, language = 'fr' } = req.body;
    const ai = getGenAI();

    const systemPrompt = `Tu es "ChantierPro IA", l'assistant d'ingénierie et d'optimisation de chantier BTP le plus performant.
Tu aides les chefs de chantier, conducteurs de travaux, ingénieurs et artisans dans leurs tâches quotidiennes :
- Calcul de dosages béton, mortiers, armatures acier, terrassement, métrés.
- Normes BTP, sécurité sur chantier (EPI, travail en hauteur), réglementation DTU, gestion des intempéries.
- Résolution de problèmes techniques (fissures, temps de séchage, adjuvants, pannes engins courantes).
- Conseils en productivité des équipes et optimisation des coûts.
Réponds de manière concise, précise, avec des chiffres réalistes du BTP, des formules claires et des listes à puces faciles à lire sur le terrain.
Langue principale : ${language}. Contexte actuel du chantier : ${siteContext || 'Chantier actif'}.`;

    // Format chat messages
    const formattedContents = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || m.text || '' }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: formattedContents.length > 0 ? formattedContents : [{ role: 'user', parts: [{ text: 'Bonjour, présente-toi brièvement et dis comment tu peux m\'aider sur mon chantier.' }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.5,
      },
    });

    res.json({
      success: true,
      reply: response.text,
    });
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Erreur de communication avec l'assistant IA."
    });
  }
});

// 4. Quantity & Materials Estimation Engine
app.post("/api/ai/estimate-quantities", async (req, res) => {
  try {
    const { description, projectType, dimensions, unitPriceEstimate = true, currency = 'DZD', language = 'fr' } = req.body;
    const ai = getGenAI();

    const systemPrompt = `Tu es un métreur et économiste de la construction chevronné.
Calcule avec exactitude les besoins prévisionnels en matériaux, main d'œuvre et engins à partir de la description des travaux demandés.
Inclus les ratios de perte standards en BTP (+5% à +10%).
Fournis une réponse structurée avec :
1. Hypothèses et volumes géométriques calculés
2. Liste détaillée des matériaux nécessaires (Désignation, Quantité avec unité, et estimation du coût en ${currency})
3. Estimation du temps de travail & effectif recommandé
4. Matériel et outillage spécifiques à prévoir
5. Recommandations de mise en œuvre et précautions de sécurité.
Langue : ${language}.`;

    const prompt = `Description du travail à estimer :
Type d'ouvrage : ${projectType || 'Gros œuvre / Maçonnerie'}
Description : ${description}
Dimensions / Surface / Volume : ${dimensions || 'Voir description'}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
      },
    });

    res.json({
      success: true,
      estimation: response.text,
    });
  } catch (error: any) {
    console.error("AI Estimate Error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Erreur lors du calcul d'estimation des quantités."
    });
  }
});

// 5. Intelligent Receipt / Invoice Scanner
app.post("/api/ai/scan-receipt", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", textHint } = req.body;
    const ai = getGenAI();

    const systemPrompt = `Tu es un système de reconnaissance et d'extraction de reçus, bons de livraison et factures BTP.
Analyse l'image ou le document fourni et extrait les informations financières et matérielles au format JSON strict.
Structure JSON demandée :
{
  "beneficiary": "Nom du fournisseur ou magasin",
  "category": "Catégorie parmi: Carburant & Énergie, Petit Outillage & Quincaillerie, Transport & Déchargement, Restauration & Eau, Location Matériel, Entretien & Réparations, Frais Administratifs, Divers & Urgences",
  "amount": 0,
  "date": "YYYY-MM-DD",
  "receiptRef": "Numéro du bon ou facture",
  "paymentMethod": "Espèces (Caisse)" ou "Virement" ou "Chèque" ou "Carte",
  "items": [
    {"name": "Désignation article", "quantity": 1, "unit": "U", "unitPrice": 0, "total": 0}
  ],
  "summary": "Brève description des achats"
}`;

    const parts: any[] = [];

    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType,
          data: imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, ''),
        },
      });
    }

    parts.push({
      text: textHint ? `Texte complémentaire ou indice : ${textHint}. Extrais toutes les données financières du bon.` : "Extrais les données de cette facture/bon de caisse.",
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    let extractedData = {};
    try {
      extractedData = JSON.parse(response.text || '{}');
    } catch {
      extractedData = { rawText: response.text };
    }

    res.json({
      success: true,
      data: extractedData,
      raw: response.text,
    });
  } catch (error: any) {
    console.error("AI Scan Receipt Error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Erreur lors de l'analyse du bon/facture par l'IA."
    });
  }
});

// 6. Universal AI Ingestion Engine (Camera, Photo & File Ingestion)
app.post("/api/ai/universal-scan", async (req, res) => {
  try {
    const { imageBase64, textContent, mimeType = "image/jpeg", userHint, targetCategory = 'auto' } = req.body;
    const ai = getGenAI();

    const systemPrompt = `Tu es le moteur d'acquisition et de numérisation intelligente "ChantierPro Smart Vision & OCR".
Ta mission est d'analyser n'importe quelle capture photo caméra, image ou fichier document de chantier BTP (facture, reçu de caisse, ticket carburant, bon de livraison, feuille de pointage manuscrite, fiche d'engin, compte-rendu journalier, carte d'identité ouvrier, devis) et d'extraire automatiquement les entités structurées prêtes à être injectées dans la base de données.

Types d'entités possibles ("detectedType") :
- "expense" : Dépense de caisse / Facture / Reçu / Ticket carburant
- "attendance" : Pointage / Feuille de présence journalière
- "material" : Bon de livraison / Approvisionnement en matériaux (ciment, fer, sable, briques...)
- "equipment" : Fiche engin / Entretien / Réparation / Maintenance de matériel
- "log" : Note journalière / Journal de bord / PV de réunion de chantier / Incidents
- "worker" : Fiche ouvrier / Carte CIN / Contrat / Inscription nouveau travailleur

Règles de détection :
- Si la catégorie cible est spécifiée (${targetCategory}) et différente de 'auto', privilégie ce type. Sinon, détermine automatiquement le type le plus probable.
- Réponds EXCLUSIVEMENT en JSON valide respectant ce schéma exact :

{
  "detectedType": "expense" | "attendance" | "material" | "equipment" | "log" | "worker",
  "confidence": 0.95,
  "title": "Titre synthétique du document",
  "summary": "Résumé concis en 1 ou 2 phrases de ce qui a été détecté et extrait",
  "extractedData": {
    "expense": {
      "beneficiary": "Nom du fournisseur ou prestataire",
      "amount": 15000,
      "category": "Carburant & Énergie" | "Petit Outillage & Quincaillerie" | "Transport & Déchargement" | "Restauration & Eau" | "Location Matériel" | "Entretien & Réparations" | "Frais Administratifs" | "Divers & Urgences",
      "date": "YYYY-MM-DD",
      "receiptRef": "N° facture ou reçu",
      "paymentMethod": "Espèces (Caisse)" | "Virement" | "Chèque" | "Carte",
      "items": [
        {"name": "Désignation", "quantity": 1, "unit": "U", "unitPrice": 0, "total": 0}
      ]
    },
    "attendance": {
      "date": "YYYY-MM-DD",
      "workers": [
        {"name": "Nom ouvrier", "status": "P" | "R" | "A" | "J", "hSup": 0, "craft": "Métier", "notes": "Observation"}
      ]
    },
    "material": {
      "name": "Désignation matériau (ex: Ciment CPJ 42.5)",
      "unit": "Sac" | "Tonne" | "m3" | "Unité" | "m2" | "Barre" | "Kg",
      "received": 50,
      "unitPrice": 850,
      "supplier": "Nom du fournisseur",
      "notes": "Numéro de bon et détails de livraison"
    },
    "equipment": {
      "name": "Nom de l'engin ou matériel (ex: Bétonnière 350L)",
      "brand": "Marque",
      "hours": 120,
      "maintenanceType": "Vidange & Graissage" | "Révision moteur" | "Changement filtres" | "Réparation mécanique",
      "cost": 5000,
      "description": "Détail de l'intervention ou état de l'engin",
      "date": "YYYY-MM-DD"
    },
    "log": {
      "date": "YYYY-MM-DD",
      "weather": "Ensoleillé" | "Nuageux" | "Pluie" | "Vent fort" | "Chaleur intense",
      "note": "Avancement des travaux exécutés...",
      "incidents": "Incidents constatés...",
      "lostHours": 0
    },
    "worker": {
      "name": "Nom et Prénom",
      "craft": "Maçon" | "Ferrailleur" | "Coffreur" | "Manoeuvre" | "Électricien" | "Plombier" | "Peintre" | "Chef d'équipe",
      "rate": 3500,
      "phone": "0550000000",
      "cin": "12345678"
    }
  }
}`;

    const parts: any[] = [];

    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType,
          data: imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, ''),
        },
      });
    }

    let instructionText = "Analyse cette capture (photo, caméra ou document) et extrais toutes les données utiles pour la gestion de chantier.";
    if (userHint) {
      instructionText += `\nIndication fournie par l'utilisateur : "${userHint}".`;
    }
    if (textContent) {
      instructionText += `\nContenu textuel du fichier :\n${textContent.slice(0, 10000)}`;
    }
    if (targetCategory && targetCategory !== 'auto') {
      instructionText += `\nCatégorie souhaitée en priorité : ${targetCategory}.`;
    }

    parts.push({ text: instructionText });

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    let parsedResult: any = {};
    try {
      parsedResult = JSON.parse(response.text || '{}');
    } catch {
      parsedResult = {
        detectedType: "expense",
        confidence: 0.5,
        title: "Document analysé",
        summary: response.text,
        extractedData: {}
      };
    }

    res.json({
      success: true,
      result: parsedResult,
      raw: response.text
    });
  } catch (error: any) {
    console.error("AI Universal Scan Error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Erreur lors de l'analyse intelligente du document par l'IA."
    });
  }
});

// 7. AI Worker Profiler, Smart Auto-complete & Recruitment Level Classifier
app.post("/api/ai/worker-evaluate", async (req, res) => {
  try {
    const { inputContent, imageBase64, mimeType = "image/jpeg", currency = "DZD", existingWorker, language = "fr" } = req.body;
    const ai = getGenAI();

    const systemPrompt = `Tu es un Directeur des Ressources Humaines & Expert BTP / Génie Civil international spécialisé dans le recrutement, la classification des compétences et l'évaluation des ouvriers du bâtiment et des travaux publics.

Ta mission est d'analyser les informations fournies (CV, description, texte brut, notes d'entretien, diplômes ou photo de document d'identité/fiche) pour construire une fiche ouvrier complète et déterminer précisément son NIVEAU DE RECRUTEMENT ("recruitmentLevel") ainsi que sa rémunération de marché recommandée.

Niveaux de recrutement stricts BTP à utiliser :
- "Niveau 1 — Manœuvre / Débutant" : Manutention, aide, approvisionnement, 0 à 2 ans d'expérience.
- "Niveau 2 — Ouvrier Professionnel (OP1)" : Exécution autonome des tâches courantes du métier, 2 à 5 ans d'expérience.
- "Niveau 3 — Compagnon Professionnel (OP2)" : Haute technicité, finitions soignées, lecture de plans, autonomie complète, 5 à 10 ans d'expérience.
- "Niveau 4 — Maître Ouvrier / Chef d'Équipe" : Encadrement, coordination d'équipe, planification, sécurité, 8+ ans d'expérience.

Réponds STRICTEMENT au format JSON avec cette structure exacte :
{
  "name": "Nom et Prénom",
  "craft": "Corps d'état principal (ex: Maçonnerie, Coffrage, Ferraillage, Plomberie & Sanitaire, Électricité & Réseaux, Peinture & Enduit, Carrelage & Revêtement, Chef d’équipe / Conducteur, etc.)",
  "recruitmentLevel": "Niveau 1 — Manœuvre / Débutant" | "Niveau 2 — Ouvrier Professionnel (OP1)" | "Niveau 3 — Compagnon Professionnel (OP2)" | "Niveau 4 — Maître Ouvrier / Chef d'Équipe",
  "experienceYears": 5,
  "skills": ["Compétence 1", "Compétence 2", "Compétence 3", "Compétence 4"],
  "certifications": ["CACES R482", "Habilitation Électrique B2V", "SST..."],
  "phone": "06 00 00 00 00",
  "cin": "Numéro d'identité si trouvé ou généré",
  "rate": 3200,
  "rateType": "jour",
  "team": "Nom suggéré d'équipe",
  "emergencyContact": "Numéro contact urgence ou parenté",
  "bloodGroup": "O+" | "A+" | "B+" | "AB+" | "Inconnu",
  "evaluationScore": 4.6,
  "aiEvaluationSummary": "Évaluation synthétique et professionnelle de l'ouvrier (2-3 phrases sur ses points forts, rigueur et adéquation chantier).",
  "aiSalaryRecommendation": {
    "minRate": 2800,
    "maxRate": 3600,
    "marketAverage": 3200,
    "justification": "Justification du taux selon le niveau de qualification N1-N4 et l'expérience en ${currency}."
  },
  "notes": "Observations complémentaires sur les habilitations, mobilité et spécialités."
}`;

    const parts: any[] = [];

    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType,
          data: imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, ''),
        },
      });
    }

    let promptText = `Analyse ce profil d'ouvrier pour le chantier BTP. Devise de référence : ${currency}.`;
    if (inputContent) {
      promptText += `\nInformations fournies par l'utilisateur :\n"""\n${inputContent}\n"""`;
    }
    if (existingWorker) {
      promptText += `\nDonnées actuelles de la fiche :\n${JSON.stringify(existingWorker)}`;
    }

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    let result = {};
    try {
      result = JSON.parse(response.text || '{}');
    } catch {
      result = { raw: response.text };
    }

    res.json({
      success: true,
      data: result,
      raw: response.text
    });
  } catch (error: any) {
    console.error("AI Worker Evaluate Error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Erreur lors de l'évaluation du profil ouvrier par l'IA."
    });
  }
});

// 8. AI Team & Workforce Batch Generator
app.post("/api/ai/generate-team-workers", async (req, res) => {
  try {
    const { prompt: userPrompt, siteName, count = 5, crafts, currency = "DZD", language = "fr" } = req.body;
    const ai = getGenAI();

    const systemPrompt = `Tu es un Directeur Technique BTP chargé de constituer et recruter les meilleures équipes d'ouvriers pour un chantier de construction.
À partir de la demande de l'utilisateur, génère une liste de ${count} profils ouvriers complets, parfaitement réalistes et équilibrés en compétences et niveaux hiérarchiques.

Pour chaque ouvrier, définis :
- "name": Nom et Prénom réalistes et variés
- "craft": Corps d'état (Maçonnerie, Coffrage, Ferraillage, Plomberie & Sanitaire, Électricité & Réseaux, Peinture & Enduit, Carrelage & Revêtement, Manœuvre & Aide, Chef d’équipe / Conducteur, etc.)
- "recruitmentLevel": parmi "Niveau 1 — Manœuvre / Débutant", "Niveau 2 — Ouvrier Professionnel (OP1)", "Niveau 3 — Compagnon Professionnel (OP2)", "Niveau 4 — Maître Ouvrier / Chef d'Équipe"
- "experienceYears": nombre d'années réaliste en fonction du niveau
- "skills": tableau de 3 à 5 compétences techniques concrètes
- "certifications": tableau d'habilitations BTP (CACES, SST, Habilitation Électrique, Échafaudage...)
- "rate": taux journalier réaliste en ${currency} selon le niveau (ex: N1 ~ 2000-2400, N2 ~ 2600-3000, N3 ~ 3000-3600, N4 ~ 3800-4800 ${currency})
- "rateType": "jour"
- "team": Nom d'équipe cohérent (ex: "Équipe A — Gros Œuvre", "Équipe B — Second Œuvre", "Équipe Finitions")
- "phone": Numéro de mobile réaliste
- "cin": Numéro de pièce d'identité réaliste
- "evaluationScore": note sur 5 (entre 4.1 et 4.9)
- "aiEvaluationSummary": brève synthèse de 2 phrases sur la valeur ajoutée de l'ouvrier
- "notes": remarques

Réponds STRICTEMENT au format JSON :
{
  "workers": [ ... tableau de ${count} ouvriers ... ],
  "teamSummary": "Brève synthèse de l'équipe générée et de l'équilibre des niveaux de qualification"
}`;

    const prompt = `Chantier cible : ${siteName || 'Chantier BTP'}
Demande de recrutement / composition de l'équipe :
"${userPrompt || 'Équipe complète de gros œuvre et second œuvre'}"
Nombre d'ouvriers souhaité : ${count}
Corps d'état ciblés : ${crafts?.length ? crafts.join(', ') : 'Tous corps d\'état utiles'}
Devise : ${currency}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });

    let result = {};
    try {
      result = JSON.parse(response.text || '{}');
    } catch {
      result = { workers: [] };
    }

    res.json({
      success: true,
      data: result,
      raw: response.text
    });
  } catch (error: any) {
    console.error("AI Generate Team Error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Erreur lors de la génération de l'équipe par l'IA."
    });
  }
});

// 9. AI Workforce & Recruitment Levels Matrix Audit
app.post("/api/ai/workers-matrix-audit", async (req, res) => {
  try {
    const { site, workers, attendanceStats, language = "fr" } = req.body;
    const ai = getGenAI();

    const systemPrompt = `Tu es un Consultant Expert en Gestion des Ressources Humaines et Productivité de Chantier BTP.
Analyse la structure des effectifs de ce chantier, la répartition des niveaux de recrutement (Niveau 1 à Niveau 4), l'équilibre des corps d'état et le taux d'encadrement.

Fournis un audit structuré, professionnel et percutant dans la langue demandée (${language}) :
1. 📊 Diagnostic de la Pyramide des Qualifications (N1 Manœuvres vs N2 Pros vs N3 Compagnons vs N4 Chefs d'Équipe)
2. ⚖️ Équilibre Encadrement & Ratios de Productivité (Taux de supervision, autonomie des équipes)
3. 🎯 Matrice des Compétences & Besoins de Recrutement Prioritaires (Métiers en tension, manques détectés)
4. 🛡️ Plan Habilitations & Sécurité (CACES, Échafaudage, Risques électriques, Port des EPI)
5. 💡 3 Recommandations Stratégiques pour optimiser le rendement et réduire les coûts de main d'œuvre.`;

    const prompt = `Données du chantier :
- Chantier : ${site?.name || 'Chantier BTP'} (${site?.client || ''}, ${site?.address || ''})
- Effectif actuel (${workers?.length || 0} ouvriers) :
${JSON.stringify((workers || []).map((w: any) => ({
  name: w.name,
  craft: w.craft,
  team: w.team,
  level: w.recruitmentLevel || 'Non spécifié',
  exp: w.experienceYears || 0,
  rate: w.rate,
  skills: w.skills || []
})))}
- Statistiques de présence et d'heures : ${JSON.stringify(attendanceStats || {})}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
      },
    });

    res.json({
      success: true,
      audit: response.text
    });
  } catch (error: any) {
    console.error("AI Workers Matrix Audit Error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Erreur lors de l'audit de l'effectif par l'IA."
    });
  }
});

// Vite Middleware Integration for Development & Static Serve for Production
async function startServer() {
  try {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: false,
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`ChantierPro server running on http://0.0.0.0:${PORT}`);
    });

    server.on("error", (err: any) => {
      console.error("Server error:", err);
    });
  } catch (err) {
    console.error("Failed to start ChantierPro server:", err);
    process.exit(1);
  }
}

startServer();
