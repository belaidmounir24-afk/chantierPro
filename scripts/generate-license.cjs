#!/usr/bin/env node
/**
 * ChantierPro - Private Key Generator for Publisher / Owner (belaidmounir24@gmail.com)
 * Usage:
 *   node scripts/generate-license.cjs [1y|2y|3y] [Client_Name]
 * Examples:
 *   node scripts/generate-license.cjs 1y "SARL BatiPro"
 *   node scripts/generate-license.cjs 2y "Entreprise Travaux"
 *   node scripts/generate-license.cjs 3y "Karim Benali"
 */

const SALT = 'CHANTIERPRO_2026_BTP_SECURE_SALT';
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function computeChecksum(prefix, seed) {
  const combined = `${prefix}_${seed}_${SALT}`;
  const hash = simpleHash(combined);
  let res = '';
  let temp = hash;
  for (let i = 0; i < 4; i++) {
    const index = temp % CHARS.length;
    res += CHARS[index];
    temp = Math.floor(temp / CHARS.length) + (i * 7);
  }
  return res;
}

function generateCompactKey(plan = '1y', clientRef = 'CLIENT') {
  let prefix = 'CP1Y';
  let planName = 'Abonnement 1 An (50 €) — Valide 365 jours';
  let days = 365;

  const p = String(plan).toLowerCase();
  if (p === '2y' || p === '2' || p === '2ans' || p === '2_years') {
    prefix = 'CP2Y';
    planName = 'Abonnement 2 Ans (80 €) — Valide 730 jours';
    days = 730;
  } else if (p === '3y' || p === '3' || p === '3ans' || p === '3_years') {
    prefix = 'CP3Y';
    planName = 'Abonnement 3 Ans (100 €) — Valide 1095 jours (Meilleure Offre)';
    days = 1095;
  }

  const cleanRef = clientRef.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'BTP';
  let seed = '';
  if (cleanRef.length >= 2) {
    const c1 = CHARS.includes(cleanRef[0]) ? cleanRef[0] : CHARS[Math.floor(Math.random() * CHARS.length)];
    const c2 = CHARS.includes(cleanRef[1]) ? cleanRef[1] : CHARS[Math.floor(Math.random() * CHARS.length)];
    const r1 = CHARS[Math.floor(Math.random() * CHARS.length)];
    const r2 = CHARS[Math.floor(Math.random() * CHARS.length)];
    seed = `${c1}${c2}${r1}${r2}`;
  } else {
    for (let i = 0; i < 4; i++) {
      seed += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
  }

  const checksum = computeChecksum(prefix, seed);
  return {
    key: `${prefix}-${seed}-${checksum}`,
    planName,
    days,
    prefix
  };
}

// CLI arguments
const planArg = process.argv[2] || '1y';
const clientArg = process.argv[3] || 'Client BTP';

const result = generateCompactKey(planArg, clientArg);

console.log('\n======================================================');
console.log('🏗️  CHANTIERPRO — GÉNÉRATEUR DE LICENCES ADMIN');
console.log('🔒  Réservé exclusivement à belaidmounir24@gmail.com');
console.log('======================================================');
console.log(`Formule:    ${result.planName}`);
console.log(`Client:     ${clientArg}`);
console.log(`Validité:   ${result.days} jours`);
console.log(`Clé unique: ${result.key}`);
console.log('======================================================\n');

