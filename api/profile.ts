import type { VercelRequest, VercelResponse } from '@vercel/node';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

async function ensureColumns() {
  const cols = [
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS surname VARCHAR(50)",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS firstname VARCHAR(50)",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'male'",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS dob DATE",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone_country VARCHAR(10) DEFAULT '+852'",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false",
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
      return res.json({
        success: true,
        surname: client.surname || '',
        firstname: client.firstname || '',
        gender: client.gender || 'male',
        dob: client.dob ? String(client.dob).split('T')[0] : '',
        phone: client.phone || '',
        phoneCountry: client.phone_country || '+852',
        phoneVerified: !!client.phone_verified,
        name: client.name || '',
        nameEn: client.name_en || '',
        email: client.email || '',
        address: client.address || '',
      });
    }

    if (req.method === 'PUT') {
      const b = req.body || {};
      const updates: string[] = [];
      const vals: any[] = [];
      let idx = 1;

      const add = (col: string, val: any) => {
        if (val !== undefined) { updates.push(`${col} = $${idx++}`); vals.push(val); }
      };

      add('surname', b.surname);
      add('firstname', b.firstname);
      add('gender', b.gender);
      add('dob', b.dob || null);
      add('phone', b.phone);
      add('phone_country', b.phoneCountry);
      add('phone_verified', b.phoneVerified);

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
