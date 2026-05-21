import React, { createContext, useContext, useState } from 'react';

export type Lang = 'FR' | 'EN';

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'FR',
  setLang: () => {},
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      return (localStorage.getItem('caredify_lang') as Lang) || 'FR';
    } catch {
      return 'FR';
    }
  });

  const setLang = (l: Lang) => {
    try {
      localStorage.setItem('caredify_lang', l);
    } catch { /* ignore */ }
    setLangState(l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => useContext(LanguageContext);
