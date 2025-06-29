import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: "en", // default language
    fallbackLng: "en",
    debug: false,

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },

    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },

    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },

    resources: {
      en: {
        common: {
          loading: "Loading...",
          error: "Error",
          success: "Success",
        },
      },
      fr: {
        common: {
          loading: "Chargement...",
          error: "Erreur",
          success: "Succès",
        },
      },
      ar: {
        common: {
          loading: "جاري التحميل...",
          error: "خطأ",
          success: "نجح",
        },
      },
    },
  });

export default i18n;
