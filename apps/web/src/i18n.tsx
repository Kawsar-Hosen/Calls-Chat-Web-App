import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

export const languages = [
  ['bn', 'Bangla', 'বাংলা'], ['en', 'English', 'English'], ['id', 'Indonesian', 'Bahasa Indonesia'],
  ['hi', 'Hindi', 'हिन्दी'], ['ar', 'Arabic', 'العربية'], ['es', 'Spanish', 'Español'], ['pt', 'Portuguese', 'Português'],
] as const;
export type LanguageCode = typeof languages[number][0];

const copy: Record<LanguageCode, Record<string, string>> = {
  en: { messages: 'Messages', contacts: 'Contacts', settings: 'Settings', account: 'Account', notification: 'Notification', darkMode: 'Dark mode', language: 'Language', profile: 'Profile', editProfile: 'Edit profile', uploadPhoto: 'Upload photo', chooseLanguage: 'Choose language', signOut: 'Sign out' },
  bn: { messages: 'বার্তা', contacts: 'যোগাযোগ', settings: 'সেটিংস', account: 'অ্যাকাউন্ট', notification: 'নোটিফিকেশন', darkMode: 'ডার্ক মোড', language: 'ভাষা', profile: 'প্রোফাইল', editProfile: 'প্রোফাইল সম্পাদনা', uploadPhoto: 'ছবি আপলোড', chooseLanguage: 'ভাষা বেছে নিন', signOut: 'সাইন আউট' },
  id: { messages: 'Pesan', contacts: 'Kontak', settings: 'Pengaturan', account: 'Akun', notification: 'Notifikasi', darkMode: 'Mode gelap', language: 'Bahasa', profile: 'Profil', editProfile: 'Edit profil', uploadPhoto: 'Unggah foto', chooseLanguage: 'Pilih bahasa', signOut: 'Keluar' },
  hi: { messages: 'संदेश', contacts: 'संपर्क', settings: 'सेटिंग्स', account: 'खाता', notification: 'सूचनाएं', darkMode: 'डार्क मोड', language: 'भाषा', profile: 'प्रोफ़ाइल', editProfile: 'प्रोफ़ाइल संपादित करें', uploadPhoto: 'फोटो अपलोड करें', chooseLanguage: 'भाषा चुनें', signOut: 'साइन आउट' },
  ar: { messages: 'الرسائل', contacts: 'جهات الاتصال', settings: 'الإعدادات', account: 'الحساب', notification: 'الإشعارات', darkMode: 'الوضع الداكن', language: 'اللغة', profile: 'الملف الشخصي', editProfile: 'تعديل الملف الشخصي', uploadPhoto: 'رفع صورة', chooseLanguage: 'اختر اللغة', signOut: 'تسجيل الخروج' },
  es: { messages: 'Mensajes', contacts: 'Contactos', settings: 'Ajustes', account: 'Cuenta', notification: 'Notificación', darkMode: 'Modo oscuro', language: 'Idioma', profile: 'Perfil', editProfile: 'Editar perfil', uploadPhoto: 'Subir foto', chooseLanguage: 'Elegir idioma', signOut: 'Cerrar sesión' },
  pt: { messages: 'Mensagens', contacts: 'Contatos', settings: 'Configurações', account: 'Conta', notification: 'Notificação', darkMode: 'Modo escuro', language: 'Idioma', profile: 'Perfil', editProfile: 'Editar perfil', uploadPhoto: 'Enviar foto', chooseLanguage: 'Escolher idioma', signOut: 'Sair' },
};

interface LocaleValue { language: LanguageCode; setLanguage: (value: LanguageCode) => void; rtl: boolean; t: (key: string) => string; }
const LocaleContext = createContext<LocaleValue | null>(null);

export function LocaleProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<LanguageCode>(() => (localStorage.getItem('xyteee.language') as LanguageCode) || 'en');
  const setLanguage = (value: LanguageCode) => { setLanguageState(value); localStorage.setItem('xyteee.language', value); };
  const rtl = language === 'ar';
  useEffect(() => { document.documentElement.lang = language; document.documentElement.dir = rtl ? 'rtl' : 'ltr'; }, [language, rtl]);
  const value = useMemo(() => ({ language, setLanguage, rtl, t: (key: string) => copy[language][key] ?? copy.en[key] ?? key }), [language, rtl]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() { const value = useContext(LocaleContext); if (!value) throw new Error('useLocale must be used inside LocaleProvider'); return value; }
