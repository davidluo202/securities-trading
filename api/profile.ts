import type { VercelRequest, VercelResponse } from '@vercel/node';
import pg from 'pg';
import * as crypto from 'crypto';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

type BankAccount = {
  id?: string;
  bankName: string;
  bankAccount: string;
  bankAccountType?: string;
  currency: string;
};

function normalizeCurrency(value: any): string {
  const currency = String(value || 'HKD').trim().toUpperCase();
  if (['RMB', 'CNY', 'CNH', '人民幣', '人民币'].includes(currency)) return 'CNY';
  return currency;
}

function normalizeBankAccounts(input: any): BankAccount[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, index) => ({
      id: String(item?.id || `${Date.now()}-${index}`),
      bankName: String(item?.bankName || item?.bank_name || '').trim(),
      bankAccount: String(item?.bankAccount || item?.bank_account || item?.accountNumber || '').trim(),
      bankAccountType: String(item?.bankAccountType || item?.bank_account_type || item?.accountType || 'checking'),
      currency: normalizeCurrency(item?.currency || item?.bankCurrency || item?.bank_currency || 'HKD'),
    }))
    .filter((item) => item.bankName && item.bankAccount);
}

function legacyBankAccounts(client: any): BankAccount[] {
  if (!client?.bank_name || !client?.bank_account) return [];
  return [{
    id: 'legacy',
    bankName: client.bank_name,
    bankAccount: client.bank_account,
    bankAccountType: client.bank_account_type || 'checking',
    currency: normalizeCurrency(client.bank_currency || 'HKD'),
  }];
}

async function ensureColumns() {
  const cols = [
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS surname VARCHAR(50)",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS firstname VARCHAR(50)",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS surname_en VARCHAR(50)",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS firstname_en VARCHAR(50)",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'male'",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS dob DATE",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone_country VARCHAR(10) DEFAULT '+852'",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS bank_accounts JSONB DEFAULT '[]'::jsonb",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS option_combo_preferences JSONB",
  ];
  for (const sql of cols) { try { await pool.query(sql); } catch { /* */ } }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Email');
  if (req.method === 'OPTIONS') return res.status(200).end();

  await ensureColumns();

  // Identify user by email header (testing phase)
  const email = (req.headers['x-user-email'] as string) || (req.query.email as string) || '';
  if (!email) return res.status(400).json({ success: false, error: 'Email required' });

  try {
    const clientRes = await pool.query('SELECT * FROM clients WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
    if (clientRes.rows.length === 0) return res.json({ success: false, error: 'Client not found' });
    const client = clientRes.rows[0];

    if (req.method === 'GET') {
      const bankAccounts = normalizeBankAccounts(client.bank_accounts).length > 0
        ? normalizeBankAccounts(client.bank_accounts)
        : legacyBankAccounts(client);
      return res.json({
        success: true,
        surname: client.surname || '',
        firstname: client.firstname || '',
        surname_en: client.surname_en || '',
        firstname_en: client.firstname_en || '',
        gender: client.gender || 'male',
        data: { id: client.id, client_id: client.id },
        dob: client.dob ? (client.dob instanceof Date ? client.dob.toISOString().split('T')[0] : String(client.dob).split('T')[0]) : '',
        phone: client.phone || '',
        phoneCountry: client.phone_country || '+852',
        phoneVerified: !!client.phone_verified,
        name: client.name || '',
        nameEn: client.name_en || '',
        email: client.email || '',
        address: client.address || '',
        bankAccounts,
        option_combo_preferences: client.option_combo_preferences ? JSON.stringify(client.option_combo_preferences) : null,
      });
    }

    if (req.method === 'PUT') {
      const { action } = req.query;

      // Change password
      if (action === 'password') {
        const { oldPassword, newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) return res.status(400).json({ success: false, error: '新密碼至少6位' });
        const oldHash = crypto.createHash('sha256').update(oldPassword || '').digest('hex');
        const checkRes = await pool.query('SELECT id FROM portal_users WHERE email = $1 AND password_hash = $2', [email, oldHash]);
        if (checkRes.rows.length === 0) return res.status(400).json({ success: false, error: '舊密碼不正確' });
        const newHash = crypto.createHash('sha256').update(newPassword).digest('hex');
        await pool.query('UPDATE portal_users SET password_hash = $1, updated_at = NOW() WHERE email = $2', [newHash, email]);
        return res.json({ success: true });
      }

      const b = req.body || {};
      const updates: string[] = [];
      const vals: any[] = [];
      let idx = 1;

      const add = (col: string, val: any) => {
        if (val !== undefined) { updates.push(`${col} = $${idx++}`); vals.push(val); }
      };

      add('surname', b.surname);
      add('firstname', b.firstname);
      add('surname_en', b.surname_en);
      add('firstname_en', b.firstname_en);
      add('gender', b.gender);
      add('dob', b.dob || null);
      add('phone', b.phone);
      add('phone_country', b.phoneCountry);
      add('phone_verified', b.phoneVerified);

      // option_combo_preferences as JSONB
      if (b.option_combo_preferences !== undefined) {
        updates.push(`option_combo_preferences = $${idx++}::jsonb`);
        vals.push(b.option_combo_preferences || null);
      }

      // bank_accounts as JSONB
      if (b.bankAccounts !== undefined) {
        const bankAccounts = normalizeBankAccounts(b.bankAccounts);
        updates.push(`bank_accounts = $${idx++}::jsonb`);
        vals.push(JSON.stringify(bankAccounts));
        // Sync legacy single-account columns for backward compatibility
        const primary = bankAccounts[0];
        if (primary) {
          add('bank_name', primary.bankName);
          add('bank_account', primary.bankAccount);
          add('bank_account_type', primary.bankAccountType || 'checking');
          add('bank_currency', primary.currency);
        }
      }

      if (b.surname !== undefined || b.firstname !== undefined) {
        const sn = b.surname ?? client.surname ?? '';
        const fn = b.firstname ?? client.firstname ?? '';
        add('name', sn + fn);
      }

      if (updates.length === 0) return res.json({ success: true });

      vals.push(client.id);
      await pool.query(`UPDATE clients SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, vals);
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
