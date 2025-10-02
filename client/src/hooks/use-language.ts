import { useState, useEffect } from 'react';
import { Language, getTranslation } from '@/lib/translations';

export function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'en' || saved === 'es') ? saved : 'es';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'es' ? 'en' : 'es');
  };

  const t = (key: keyof typeof import('@/lib/translations').translations.es) => {
    return getTranslation(language, key);
  };

  return { language, toggleLanguage, t };
}
