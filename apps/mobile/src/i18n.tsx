import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import * as SecureStore from 'expo-secure-store';
import { I18nManager } from 'react-native';

export const languages = [
  { code: 'bn', label: 'Bangla', nativeLabel: 'বাংলা' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
] as const;

export type LanguageCode = typeof languages[number]['code'];
const LANGUAGE_KEY = 'xyteee.language';
const rtlLanguages = new Set<LanguageCode>(['ar']);

const translations: Record<LanguageCode, Record<string, string>> = {
  en: { messages: 'Messages', contacts: 'Contacts', settings: 'Settings', profile: 'Profile', account: 'ACCOUNT', notification: 'Notification', notifications: 'Notifications', darkMode: 'Dark mode', language: 'Language', editProfile: 'Edit profile', uploadPhoto: 'Upload photo', saveChanges: 'Save changes', signOut: 'Sign out', appearance: 'Appearance', connected: 'Connected', offline: 'Offline', search: 'Search', chooseLanguage: 'Choose language', online: 'Online now', noFriends: 'No friends yet' },
  bn: { messages: 'বার্তা', contacts: 'যোগাযোগ', settings: 'সেটিংস', profile: 'প্রোফাইল', account: 'অ্যাকাউন্ট', notification: 'নোটিফিকেশন', notifications: 'নোটিফিকেশন', darkMode: 'ডার্ক মোড', language: 'ভাষা', editProfile: 'প্রোফাইল সম্পাদনা', uploadPhoto: 'ছবি আপলোড', saveChanges: 'পরিবর্তন সংরক্ষণ', signOut: 'সাইন আউট', appearance: 'দেখানোর ধরন', connected: 'সংযুক্ত', offline: 'অফলাইন', search: 'খুঁজুন', chooseLanguage: 'ভাষা বেছে নিন', online: 'এখন অনলাইন', noFriends: 'এখনও কোনো বন্ধু নেই' },
  id: { messages: 'Pesan', contacts: 'Kontak', settings: 'Pengaturan', profile: 'Profil', account: 'AKUN', notification: 'Notifikasi', notifications: 'Notifikasi', darkMode: 'Mode gelap', language: 'Bahasa', editProfile: 'Edit profil', uploadPhoto: 'Unggah foto', saveChanges: 'Simpan perubahan', signOut: 'Keluar', appearance: 'Tampilan', connected: 'Terhubung', offline: 'Offline', search: 'Cari', chooseLanguage: 'Pilih bahasa', online: 'Sedang online', noFriends: 'Belum ada teman' },
  hi: { messages: 'संदेश', contacts: 'संपर्क', settings: 'सेटिंग्स', profile: 'प्रोफ़ाइल', account: 'खाता', notification: 'सूचनाएं', notifications: 'सूचनाएं', darkMode: 'डार्क मोड', language: 'भाषा', editProfile: 'प्रोफ़ाइल संपादित करें', uploadPhoto: 'फोटो अपलोड करें', saveChanges: 'परिवर्तन सहेजें', signOut: 'साइन आउट', appearance: 'दिखावट', connected: 'कनेक्टेड', offline: 'ऑफ़लाइन', search: 'खोजें', chooseLanguage: 'भाषा चुनें', online: 'अभी ऑनलाइन', noFriends: 'अभी कोई मित्र नहीं' },
  ar: { messages: 'الرسائل', contacts: 'جهات الاتصال', settings: 'الإعدادات', profile: 'الملف الشخصي', account: 'الحساب', notification: 'الإشعارات', notifications: 'الإشعارات', darkMode: 'الوضع الداكن', language: 'اللغة', editProfile: 'تعديل الملف الشخصي', uploadPhoto: 'رفع صورة', saveChanges: 'حفظ التغييرات', signOut: 'تسجيل الخروج', appearance: 'المظهر', connected: 'متصل', offline: 'غير متصل', search: 'بحث', chooseLanguage: 'اختر اللغة', online: 'متصل الآن', noFriends: 'لا يوجد أصدقاء بعد' },
  es: { messages: 'Mensajes', contacts: 'Contactos', settings: 'Ajustes', profile: 'Perfil', account: 'CUENTA', notification: 'Notificación', notifications: 'Notificaciones', darkMode: 'Modo oscuro', language: 'Idioma', editProfile: 'Editar perfil', uploadPhoto: 'Subir foto', saveChanges: 'Guardar cambios', signOut: 'Cerrar sesión', appearance: 'Apariencia', connected: 'Conectado', offline: 'Desconectado', search: 'Buscar', chooseLanguage: 'Elegir idioma', online: 'En línea ahora', noFriends: 'Aún no hay amigos' },
  pt: { messages: 'Mensagens', contacts: 'Contatos', settings: 'Configurações', profile: 'Perfil', account: 'CONTA', notification: 'Notificação', notifications: 'Notificações', darkMode: 'Modo escuro', language: 'Idioma', editProfile: 'Editar perfil', uploadPhoto: 'Enviar foto', saveChanges: 'Salvar alterações', signOut: 'Sair', appearance: 'Aparência', connected: 'Conectado', offline: 'Offline', search: 'Buscar', chooseLanguage: 'Escolher idioma', online: 'Online agora', noFriends: 'Ainda não há amigos' },
};

interface I18nValue { language: LanguageCode; setLanguage: (language: LanguageCode) => void; isRTL: boolean; t: (key: string) => string; }
const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<LanguageCode>('en');
  useEffect(() => { void SecureStore.getItemAsync(LANGUAGE_KEY).then((saved) => { if (languages.some((item) => item.code === saved)) setLanguageState(saved as LanguageCode); }); }, []);
  const setLanguage = (next: LanguageCode) => { setLanguageState(next); void SecureStore.setItemAsync(LANGUAGE_KEY, next); };
  const isRTL = rtlLanguages.has(language);
  useEffect(() => { I18nManager.allowRTL(isRTL); I18nManager.forceRTL(isRTL); }, [isRTL]);
  const value = useMemo(() => ({ language, setLanguage, isRTL, t: (key: string) => translations[language][key] ?? translations.en[key] ?? key }), [language, isRTL]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
