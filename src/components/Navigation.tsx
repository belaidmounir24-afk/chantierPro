import React from 'react';
import { TabType } from '../types';
import { ClipboardCheck, Users, Boxes, BookOpen, BarChart3, HandCoins, Search, Sparkles, CheckSquare, Lock } from 'lucide-react';
import { triggerHaptic } from '../utils/android';
import { useLanguage } from '../i18n/LanguageContext';

interface NavigationProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenSearch?: () => void;
  badgeCounts?: {
    dueMaintenance?: number;
    lowStock?: number;
  };
  isExpired?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  onOpenSearch,
  badgeCounts,
  isExpired
}) => {
  const { t } = useLanguage();

  const tabs: { id: TabType; icon: React.ReactNode; label: string; mobileLabel: string; badge?: number; isAi?: boolean }[] = [
    {
      id: 'dash',
      icon: <ClipboardCheck className="h-4.5 w-4.5 md:h-5 md:w-5" />,
      label: t('nav.attendance', 'Présence'),
      mobileLabel: t('nav.attendance.mobile', 'Pointage')
    },
    {
      id: 'tasks',
      icon: <CheckSquare className="h-4.5 w-4.5 md:h-5 md:w-5" />,
      label: 'Tâches',
      mobileLabel: 'Tâches'
    },
    {
      id: 'team',
      icon: <Users className="h-4.5 w-4.5 md:h-5 md:w-5" />,
      label: t('nav.payroll', 'Personnel & Paie'),
      mobileLabel: t('nav.payroll.mobile', 'Paie')
    },
    {
      id: 'caisse',
      icon: <HandCoins className="h-4.5 w-4.5 md:h-5 md:w-5" />,
      label: t('nav.expenses', 'Caisse & Dépenses'),
      mobileLabel: t('nav.expenses.mobile', 'Caisse')
    },
    {
      id: 'mat',
      icon: <Boxes className="h-4.5 w-4.5 md:h-5 md:w-5" />,
      label: t('nav.materials', 'Matériaux & Engins'),
      mobileLabel: t('nav.materials.mobile', 'Stock'),
      badge: (badgeCounts?.dueMaintenance || 0) + (badgeCounts?.lowStock || 0)
    },
    {
      id: 'log',
      icon: <BookOpen className="h-4.5 w-4.5 md:h-5 md:w-5" />,
      label: t('nav.dailyLog', 'Journal de Bord'),
      mobileLabel: t('nav.dailyLog.mobile', 'Journal')
    },
    {
      id: 'rep',
      icon: <BarChart3 className="h-4.5 w-4.5 md:h-5 md:w-5" />,
      label: t('nav.reports', 'Rapports & PV'),
      mobileLabel: t('nav.reports.mobile', 'Rapports')
    },
    {
      id: 'ai',
      icon: <Sparkles className="h-4.5 w-4.5 md:h-5 md:w-5 text-amber-500 animate-pulse" />,
      label: t('nav.ai', 'IA & Performance'),
      mobileLabel: t('nav.ai.mobile', 'IA Chantier'),
      isAi: true
    }
  ];

  const handleTabClick = (tabId: TabType) => {
    triggerHaptic('light');
    onSelectTab(tabId);
  };

  return (
    <>
      {/* Desktop & Tablet Navigation (Sub-header) with Global Search Bar */}
      <nav className="hidden md:block bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-[73px] z-20 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-1 overflow-x-auto py-0">
              {tabs.map(tab => {
                const isActive = currentTab === tab.id;
                const isTabLocked = isExpired && tab.id !== 'dash';

                return (
                  <button
                    key={tab.id}
                    id={`nav-desktop-${tab.id}`}
                    type="button"
                    onClick={() => handleTabClick(tab.id)}
                    className={`flex items-center gap-2 px-4 lg:px-5 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all relative cursor-pointer shrink-0 ${
                      isActive
                        ? isTabLocked
                          ? 'border-rose-500 text-rose-800 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/30 font-black'
                          : 'border-amber-500 text-slate-900 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-500/10 font-black'
                        : isTabLocked
                          ? 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 opacity-80'
                          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className={isActive ? (isTabLocked ? 'text-rose-500' : 'text-amber-600 dark:text-amber-400') : 'text-slate-400 dark:text-slate-500'}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                    {isTabLocked ? (
                      <span className="ml-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Verrouillé</span>
                      </span>
                    ) : tab.badge && tab.badge > 0 ? (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                        {tab.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Global Search Quick Trigger Bar */}
            {onOpenSearch && (
              <div className="flex items-center py-2 shrink-0">
                <button
                  type="button"
                  id="nav-global-search-btn"
                  onClick={() => {
                    triggerHaptic('light');
                    onOpenSearch();
                  }}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200/90 dark:hover:bg-slate-700/80 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-all text-xs font-semibold group cursor-pointer shadow-2xs"
                  title="Recherche globale rapide (Ouvriers, Matériaux, Engins, Caisse, Chantiers)"
                >
                  <Search className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform shrink-0" />
                  <span className="hidden lg:inline text-slate-600 dark:text-slate-300 font-medium">
                    {t('search.quickPrompt', 'Rechercher ouvrier, matériel, engin...')}
                  </span>
                  <span className="lg:hidden text-slate-600 dark:text-slate-300 font-medium">
                    {t('common.search', 'Rechercher...')}
                  </span>
                  <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
                    <span>⌘/Ctrl</span> K
                  </kbd>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Android & Mobile Floating Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-2xl px-1 py-1.5 safe-bottom">
        <div className="flex items-center justify-around">
          {tabs.map(tab => {
            const isActive = currentTab === tab.id;
            const isTabLocked = isExpired && tab.id !== 'dash';

            return (
              <button
                key={tab.id}
                id={`nav-mobile-${tab.id}`}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[10px] font-bold transition-all relative active:scale-95 ${
                  isActive
                    ? isTabLocked
                      ? 'text-rose-400 font-extrabold bg-rose-950/50 border border-rose-500/30'
                      : 'text-amber-400 font-extrabold bg-slate-800/80 shadow-inner'
                    : isTabLocked
                      ? 'text-slate-500 hover:text-slate-400 opacity-70'
                      : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  {tab.icon}
                  {isTabLocked ? (
                    <span className="absolute -top-1 -right-2 h-3.5 w-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center border border-slate-900">
                      <Lock className="w-2 h-2" />
                    </span>
                  ) : tab.badge && tab.badge > 0 ? (
                    <span className="absolute -top-1 -right-2 h-3.5 w-3.5 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-extrabold">
                      {tab.badge}
                    </span>
                  ) : null}
                </div>
                <span className="mt-0.5 leading-tight text-center truncate max-w-full text-[10px]">
                  {tab.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};


