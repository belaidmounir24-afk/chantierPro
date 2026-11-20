import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLanguage, LanguageInfo, SUPPORTED_LANGUAGES } from './types';
import { translations } from './translations';

interface LanguageContextType {
  language: SupportedLanguage;
  languageInfo: LanguageInfo;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, defaultText?: string) => string;
  isRTL: boolean;
  dir: 'ltr' | 'rtl';
  availableLanguages: LanguageInfo[];
}

const STORAGE_KEY = 'chantierpro_language';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage;
      if (saved && ['fr', 'en', 'ar', 'es'].includes(saved)) {
        return saved;
      }
      // Auto-detect browser language
      const browserLang = navigator.language.slice(0, 2).toLowerCase();
      if (browserLang === 'ar') return 'ar';
      if (browserLang === 'es') return 'es';
      if (browserLang === 'en') return 'en';
      return 'fr';
    } catch {
      return 'fr';
    }
  });

  const languageInfo = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];
  const isRTL = languageInfo.dir === 'rtl';
  const dir = languageInfo.dir;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
      document.documentElement.dir = dir;
      document.documentElement.lang = language;
      if (isRTL) {
        document.documentElement.classList.add('rtl');
      } else {
        document.documentElement.classList.remove('rtl');
      }
    } catch {
      // ignore
    }
  }, [language, dir, isRTL]);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
  };

  const t = (key: string, defaultText?: string): string => {
    const langDict = translations[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to French if not found in current language
    const frDict = translations.fr;
    if (frDict && frDict[key]) {
      return frDict[key];
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        languageInfo,
        setLanguage,
        t,
        isRTL,
        dir,
        availableLanguages: SUPPORTED_LANGUAGES
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
