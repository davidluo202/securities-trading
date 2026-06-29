import type { VercelRequest, VercelResponse } from '@vercel/node';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Ensure source_system column exists
  try { await pool.query(`ALTER TABLE fund_transactions ADD COLUMN IF NOT EXISTS source_system VARCHAR(20) DEFAULT 'OTC'`); } catch(_) {}

  try {
    // POST - create deposit/withdraw from securities system
    if (req.method === 'POST') {
      const { clientId, type, amount, currency, bankName, receiptUrl, remarks } = req.body;
      if (!clientId || !type || !amount) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      // Generate tx_code: SEC-DEP/WDR-YYMMDD-clientSuffix-seq
      const clientRes = await pool.query('SELECT code FROM clients WHERE id = $1', [clientId]);
      const clientCode = clientRes.rows[0]?.code || '0000';
      const clientSuffix = clientCode.slice(-4);
      const now = new Date();
      const yy = String(now.getFullYear()).slice(2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const prefix = type === 'deposit' ? 'DEP' : 'WDR';
      const seqRes = await pool.query(
        `SELECT COUNT(*) as cnt FROM fund_transactions WHERE tx_code LIKE $1`,
        [`${prefix}-${yy}${mm}${dd}-${clientSuffix}%`]
      );
      const seq = String(parseInt(seqRes.rows[0].cnt) + 1).padStart(2, '0');
      const txCode = `${prefix}-${yy}${mm}${dd}-${clientSuffix}-${seq}`;

      const result = await pool.query(
        `INSERT INTO fund_transactions (tx_code, client_id, type, amount, currency, bank_name, receipt_url, remarks, status, source_system)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 'SEC')
         RETURNING *`,
        [txCode, clientId, type, amount, currency || 'HKD', bankName || '', receiptUrl || '', remarks || '']
      );

      return res.json({ success: true, data: result.rows[0] });
    }

    // GET - list fund transactions for a client (from securities system)
    if (req.method === 'GET') {
      const { client_id } = req.query;
      let query = `
        SELECT ft.*, c.name as client_name, c.code as client_code
        FROM fund_transactions ft
        LEFT JOIN clients c ON c.id = ft.client_id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (client_id) {
        params.push(parseInt(client_id as string));
        query += ` AND ft.client_id = $${params.length}`;
      }
      query += ' ORDER BY ft.created_at DESC LIMIT 50';

      const result = await pool.query(query, params);
      return res.json({ success: true, data: result.rows });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
