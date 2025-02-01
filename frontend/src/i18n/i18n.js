import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import language files
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';

const resources = {
    en: {
        translation: enTranslations
    },
    es: {
        translation: esTranslations
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en', // default language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n; 