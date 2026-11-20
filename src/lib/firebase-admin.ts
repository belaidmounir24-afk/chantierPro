import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'node:fs';
import path from 'node:path';

let projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'extended-nature-h2sm5';
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (data.projectId) {
      projectId = data.projectId;
    }
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json in firebase-admin:', e);
}

if (!getApps().length) {
  initializeApp({
    projectId,
  });
}

export const adminAuth = getAuth();
