import * as fs from 'fs';
import * as path from 'path';

export type PlatformCompany = {
  legal_name: string;
  trading_name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  vat_number: string;
  registration_number: string;
  logo_url: string;
  vat_rate: number;
};

const FILE = path.join(process.cwd(), 'data', 'platform-company.json');

function envDefaults(): PlatformCompany {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kadehub.com';
  return {
    legal_name: process.env.PLATFORM_LEGAL_NAME || 'KadeHub (Pvt) Ltd',
    trading_name: process.env.PLATFORM_COMPANY_NAME || 'KadeHub',
    address: process.env.PLATFORM_ADDRESS || 'No. 45, Galle Road',
    city: process.env.PLATFORM_CITY || 'Colombo',
    country: process.env.PLATFORM_COUNTRY || 'Sri Lanka',
    phone: process.env.PLATFORM_PHONE || '+94 11 234 5678',
    email: process.env.PLATFORM_EMAIL || process.env.SUPER_ADMIN_EMAIL || 'official.kadehub@gmail.com',
    website: process.env.PLATFORM_WEBSITE || 'www.kadehub.com',
    vat_number: process.env.PLATFORM_VAT_NUMBER || '',
    registration_number: process.env.PLATFORM_REG_NUMBER || '',
    logo_url: process.env.PLATFORM_LOGO_URL || `${appUrl.replace(/\/$/, '')}/logo-primary.png`,
    vat_rate: parseFloat(process.env.PLATFORM_VAT_RATE || '0'),
  };
}

export function getPlatformCompany(): PlatformCompany {
  try {
    if (fs.existsSync(FILE)) {
      const saved = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      return { ...envDefaults(), ...saved };
    }
  } catch { /* use env defaults */ }
  return envDefaults();
}

export function savePlatformCompany(dto: Partial<PlatformCompany>): PlatformCompany {
  const next = { ...getPlatformCompany(), ...dto };
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2));
  return next;
}
