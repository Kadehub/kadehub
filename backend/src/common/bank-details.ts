import * as fs from 'fs';
import * as path from 'path';

export type BankDetails = {
  bank_name: string;
  account_name: string;
  account_number: string;
  branch: string;
  instructions: string;
};

const FILE = path.join(process.cwd(), 'data', 'platform-bank.json');

function envDefaults(): BankDetails {
  return {
    bank_name: process.env.BANK_NAME || 'SAMPATH BANK PLC',
    account_name: process.env.BANK_ACCOUNT_NAME || 'M D S D SILVA',
    account_number: process.env.BANK_ACCOUNT_NUMBER || '1031 5529 6530',
    branch: process.env.BANK_BRANCH || 'MORATUWA BRANCH',
    instructions:
      process.env.BANK_INSTRUCTIONS ||
      'Transfer the exact amount, then upload a photo or PDF of your bank slip. Use your shop name as the payment reference.',
  };
}

export function isOnepayConfigured(): boolean {
  const dummy = (v?: string) => !v || /^your_/i.test(v);
  return !dummy(process.env.ONEPAY_APP_ID) && !dummy(process.env.ONEPAY_APP_TOKEN) && !dummy(process.env.ONEPAY_HASH_SALT);
}

export function getBankDetails(): BankDetails {
  try {
    if (fs.existsSync(FILE)) {
      const saved = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      return { ...envDefaults(), ...saved };
    }
  } catch { /* use env defaults */ }
  return envDefaults();
}

export function saveBankDetails(dto: Partial<BankDetails>): BankDetails {
  const next = { ...getBankDetails(), ...dto };
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2));
  return next;
}
