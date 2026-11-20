import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { SupportedLanguage } from '../i18n/types';
import { triggerHaptic } from '../utils/android';
import { Globe, Check, X, TrendingUp, Sparkles, MapPin } from 'lucide-react';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ isOpen, onClose }) => {
  const { language, setLanguage, t, availableLanguages } = useLanguage();

  if (!isOpen) return null;

  const handleSelect = (langCode: SupportedLanguage) => {
    triggerHaptic('medium');
    setLanguage(langCode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">{t('langModal.title', 'Langue & Internationalisation')}</h2>
              <p className="text-xs text-slate-400">
                {t('langModal.desc', 'Sélectionnez la langue pour maximiser les ventes et l’adoption sur chantier.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3 flex-1 overflow-y-auto">
          {availableLanguages.map(item => {
            const isSelected = language === item.code;
            return (
              <div
                key={item.code}
                onClick={() => handleSelect(item.code)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-left relative ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-amber-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl shrink-0 drop-shadow-xs">{item.flag}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-900">{item.nativeName}</span>
                        <span className="text-xs font-semibold text-slate-500">({item.name})</span>
                        {item.dir === 'rtl' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                            RTL
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{item.market}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pt-1">
                    {isSelected ? (
                      <div className="h-6 w-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                        <Check className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-slate-300"></div>
                    )}
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>{item.salesPitch}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span>4 langues stratégiques pour le BTP mondial</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
          >
            {t('common.confirm', 'Valider')}
          </button>
        </div>
      </div>
    </div>
  );
};
