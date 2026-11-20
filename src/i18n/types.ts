export type SupportedLanguage = 'fr' | 'en' | 'ar' | 'es';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  market: string;
  salesPitch: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  {
    code: 'fr',
    name: 'Français',
    nativeName: 'Français',
    flag: '🇫🇷',
    dir: 'ltr',
    market: 'France, Belgique, Suisse, Maghreb, Afrique Francophone',
    salesPitch: 'Marché historique de premier plan pour les PME & artisans BTP francophones'
  },
  {
    code: 'ar',
    name: 'Arabe (العربية)',
    nativeName: 'العربية',
    flag: '🇸🇦',
    dir: 'rtl',
    market: 'Golfe (Arabie Saoudite, Dubaï, Qatar), Maghreb (Algérie, Maroc, Tunisie), Égypte',
    salesPitch: 'Mégaprojets de construction au Moyen-Orient & Maghreb (Support RTL natif complet)'
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    dir: 'ltr',
    market: 'International, USA, UK, Canada, Australia, Global SaaS & GCC expat engineers',
    salesPitch: 'Langue de référence internationale pour les ventes SaaS B2B et multinationales'
  },
  {
    code: 'es',
    name: 'Espagnol',
    nativeName: 'Español',
    flag: '🇪🇸',
    dir: 'ltr',
    market: 'Espagne, Mexique, Colombie, Argentine, Chili, USA construction market',
    salesPitch: 'Marché hispanique ultra-dynamique avec une adoption massive mobile sur chantier'
  }
];
