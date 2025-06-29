import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import ar from './locales/ar/common.json';
import en from './locales/en/common.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: {
        translation: ar
      },
      en: {
        translation: en
      }
    },
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
