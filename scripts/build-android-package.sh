#!/bin/bash
# ==============================================================================
# Script de Génération et Compilation ChantierPro Android (.APK & .AAB)
# ID du Package : com.chantierpro.btp.app
# Compatible : Google Play Store, Amazon Appstore, Installation Directe APK
# ==============================================================================

set -e

echo "🏗️  CHANTIERPRO — GÉNÉRATION DU PACKAGE ANDROID NATIF"
echo "=========================================================="
echo "URL de Production : https://ais-pre-dbcps7jg62xvkzijie3e5u-385428295075.europe-west2.run.app"
echo "Package ID        : com.chantierpro.btp.app"
echo ""

# ------------------------------------------------------------------------------
# MÉTHODE 1 : BUBBLEWRAP TWA (Officiel Google - Recommandé pour Play Store & Amazon)
# ------------------------------------------------------------------------------
echo "👉 OPTION 1 : Compilation directe via Bubblewrap CLI (TWA Officiel Google)"
echo "   1. Installez Bubblewrap si ce n'est pas fait : npm install -g @bubblewrap/cli"
echo "   2. Dans ce dossier, lancez simplement :"
echo "      bubblewrap build --manifest=twa-manifest.json"
echo "   -> Résultat : app-release-signed.apk et app-release-bundle.aab générés !"
echo ""

# ------------------------------------------------------------------------------
# MÉTHODE 2 : ANDROID STUDIO & GRADLE (Projet Natif Inclus)
# ------------------------------------------------------------------------------
echo "👉 OPTION 2 : Compilation via Android Studio ou Gradle"
echo "   Le projet complet se trouve dans le dossier ./android"
echo "   1. Ouvrez le dossier 'android' dans Android Studio"
echo "   2. Menu 'Build' -> 'Build Bundle(s) / APK(s)' -> 'Build APK(s)'"
echo "   Ou en ligne de commande :"
echo "      cd android && ./gradlew assembleRelease"
echo ""

# ------------------------------------------------------------------------------
# MÉTHODE 3 : CAPACITOR 6
# ------------------------------------------------------------------------------
echo "👉 OPTION 3 : Via Capacitor 6"
echo "   npm install @capacitor/core @capacitor/cli @capacitor/android"
echo "   npx cap add android"
echo "   npx cap sync"
echo "   npx cap open android"
echo ""

# ------------------------------------------------------------------------------
# MÉTHODE 4 : CLOUD INSTANTANÉ (PWABUILDER - 0 Installation requise)
# ------------------------------------------------------------------------------
echo "👉 OPTION 4 : Compilation Cloud Gratuite en 1 Clic (PWABuilder / WebIntoApp)"
echo "   1. Rendez-vous sur : https://www.pwabuilder.com/reportcard?url=https://ais-pre-dbcps7jg62xvkzijie3e5u-385428295075.europe-west2.run.app"
echo "   2. Cliquez sur 'Package for Stores' -> 'Android'"
echo "   3. Téléchargez directement votre .apk et votre .aab signés prêts à être installés ou publiés !"
echo "=========================================================="
