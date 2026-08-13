export interface Country {
  name: string;
  flag: string;
  code: string;
}

const POPULAR: Country[] = [
  { name: 'Bangladesh', flag: '🇧🇩', code: '+880' },
  { name: 'India', flag: '🇮🇳', code: '+91' },
  { name: 'United States', flag: '🇺🇸', code: '+1' },
  { name: 'Indonesia', flag: '🇮🇩', code: '+62' },
  { name: 'Pakistan', flag: '🇵🇰', code: '+92' },
  { name: 'United Kingdom', flag: '🇬🇧', code: '+44' },
  { name: 'Saudi Arabia', flag: '🇸🇦', code: '+966' },
  { name: 'United Arab Emirates', flag: '🇦🇪', code: '+971' },
  { name: 'Nigeria', flag: '🇳🇬', code: '+234' },
  { name: 'Egypt', flag: '🇪🇬', code: '+20' },
  { name: 'Turkey', flag: '🇹🇷', code: '+90' },
  { name: 'Vietnam', flag: '🇻🇳', code: '+84' },
];

const OTHERS: Country[] = [
  { name: 'Afghanistan', flag: '🇦🇫', code: '+93' },
  { name: 'Algeria', flag: '🇩🇿', code: '+213' },
  { name: 'Argentina', flag: '🇦🇷', code: '+54' },
  { name: 'Australia', flag: '🇦🇺', code: '+61' },
  { name: 'Austria', flag: '🇦🇹', code: '+43' },
  { name: 'Bahrain', flag: '🇧🇭', code: '+973' },
  { name: 'Belgium', flag: '🇧🇪', code: '+32' },
  { name: 'Brazil', flag: '🇧🇷', code: '+55' },
  { name: 'Cambodia', flag: '🇰🇭', code: '+855' },
  { name: 'Cameroon', flag: '🇨🇲', code: '+237' },
  { name: 'Canada', flag: '🇨🇦', code: '+1' },
  { name: 'China', flag: '🇨🇳', code: '+86' },
  { name: 'Colombia', flag: '🇨🇴', code: '+57' },
  { name: 'Croatia', flag: '🇭🇷', code: '+385' },
  { name: 'Czech Republic', flag: '🇨🇿', code: '+420' },
  { name: 'Denmark', flag: '🇩🇰', code: '+45' },
  { name: 'Ethiopia', flag: '🇪🇹', code: '+251' },
  { name: 'Finland', flag: '🇫🇮', code: '+358' },
  { name: 'France', flag: '🇫🇷', code: '+33' },
  { name: 'Germany', flag: '🇩🇪', code: '+49' },
  { name: 'Ghana', flag: '🇬🇭', code: '+233' },
  { name: 'Greece', flag: '🇬🇷', code: '+30' },
  { name: 'Hong Kong', flag: '🇭🇰', code: '+852' },
  { name: 'Hungary', flag: '🇭🇺', code: '+36' },
  { name: 'Iraq', flag: '🇮🇶', code: '+964' },
  { name: 'Ireland', flag: '🇮🇪', code: '+353' },
  { name: 'Israel', flag: '🇮🇱', code: '+972' },
  { name: 'Italy', flag: '🇮🇹', code: '+39' },
  { name: 'Japan', flag: '🇯🇵', code: '+81' },
  { name: 'Jordan', flag: '🇯🇴', code: '+962' },
  { name: 'Kazakhstan', flag: '🇰🇿', code: '+7' },
  { name: 'Kenya', flag: '🇰🇪', code: '+254' },
  { name: 'Kuwait', flag: '🇰🇼', code: '+965' },
  { name: 'Lebanon', flag: '🇱🇧', code: '+961' },
  { name: 'Libya', flag: '🇱🇾', code: '+218' },
  { name: 'Malaysia', flag: '🇲🇾', code: '+60' },
  { name: 'Mexico', flag: '🇲🇽', code: '+52' },
  { name: 'Morocco', flag: '🇲🇦', code: '+212' },
  { name: 'Myanmar', flag: '🇲🇲', code: '+95' },
  { name: 'Nepal', flag: '🇳🇵', code: '+977' },
  { name: 'Netherlands', flag: '🇳🇱', code: '+31' },
  { name: 'New Zealand', flag: '🇳🇿', code: '+64' },
  { name: 'North Korea', flag: '🇰🇵', code: '+850' },
  { name: 'Norway', flag: '🇳🇴', code: '+47' },
  { name: 'Oman', flag: '🇴🇲', code: '+968' },
  { name: 'Peru', flag: '🇵🇪', code: '+51' },
  { name: 'Philippines', flag: '🇵🇭', code: '+63' },
  { name: 'Poland', flag: '🇵🇱', code: '+48' },
  { name: 'Portugal', flag: '🇵🇹', code: '+351' },
  { name: 'Qatar', flag: '🇶🇦', code: '+974' },
  { name: 'Romania', flag: '🇷🇴', code: '+40' },
  { name: 'Russia', flag: '🇷🇺', code: '+7' },
  { name: 'Senegal', flag: '🇸🇳', code: '+221' },
  { name: 'Singapore', flag: '🇸🇬', code: '+65' },
  { name: 'Slovakia', flag: '🇸🇰', code: '+421' },
  { name: 'South Africa', flag: '🇿🇦', code: '+27' },
  { name: 'South Korea', flag: '🇰🇷', code: '+82' },
  { name: 'Spain', flag: '🇪🇸', code: '+34' },
  { name: 'Sri Lanka', flag: '🇱🇰', code: '+94' },
  { name: 'Sudan', flag: '🇸🇩', code: '+249' },
  { name: 'Sweden', flag: '🇸🇪', code: '+46' },
  { name: 'Switzerland', flag: '🇨🇭', code: '+41' },
  { name: 'Syria', flag: '🇸🇾', code: '+963' },
  { name: 'Taiwan', flag: '🇹🇼', code: '+886' },
  { name: 'Tanzania', flag: '🇹🇿', code: '+255' },
  { name: 'Thailand', flag: '🇹🇭', code: '+66' },
  { name: 'Tunisia', flag: '🇹🇳', code: '+216' },
  { name: 'Uganda', flag: '🇺🇬', code: '+256' },
  { name: 'Ukraine', flag: '🇺🇦', code: '+380' },
  { name: 'Uzbekistan', flag: '🇺🇿', code: '+998' },
  { name: 'Yemen', flag: '🇾🇪', code: '+967' },
];

export const COUNTRIES: Country[] = [...POPULAR, ...OTHERS];

export function searchCountries(query: string): { popular: Country[]; all: Country[] } {
  const q = query.trim().toLowerCase();
  if (!q) return { popular: POPULAR, all: OTHERS };
  const matches = COUNTRIES.filter((country) => country.name.toLowerCase().includes(q) || country.code.includes(q));
  return { popular: matches.filter((country) => POPULAR.includes(country)), all: matches.filter((country) => !POPULAR.includes(country)) };
}

export function findCountryByCode(code: string | null | undefined): Country | null {
  if (!code) return null;
  return COUNTRIES.find((country) => country.code === code.replace(/\s/g, '')) ?? null;
}

export function formatPhone(phoneCode: string | null | undefined, phone: string | null | undefined): string {
  if (!phone) return '';
  return `${phoneCode ?? ''}${phone}`;
}
