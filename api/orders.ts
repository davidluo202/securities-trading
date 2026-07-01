import type { VercelRequest, VercelResponse } from '@vercel/node';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sec_orders (
      id SERIAL PRIMARY KEY,
      order_ref VARCHAR(50) NOT NULL UNIQUE,
      client_email VARCHAR(200),
      client_id INTEGER,
      symbol VARCHAR(20) NOT NULL,
      name VARCHAR(100),
      side VARCHAR(10) NOT NULL,
      order_type VARCHAR(20) DEFAULT 'LIMIT',
      quantity INTEGER NOT NULL,
      price NUMERIC(18,4) NOT NULL,
      amount NUMERIC(18,2),
      status VARCHAR(30) DEFAULT 'pending_review',
      is_paper BOOLEAN DEFAULT FALSE,
      short_sell BOOLEAN DEFAULT FALSE,
      remarks TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

function getUserFromToken(token: string): { email: string; name: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    if (!decoded.email || !decoded.sig) return null;
    return { email: decoded.email, name: decoded.name };
  } catch { return null; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  await ensureTable();

  const authHeader = req.headers.authorization;
  const user = authHeader?.startsWith('Bearer ') ? getUserFromToken(authHeader.slice(7)) : null;

  try {
    // GET - list orders (by email or all for OMS)
    if (req.method === 'GET') {
      const { email, status: statusFilter, all } = req.query;
      const conditions: string[] = [];
      const vals: any[] = [];
      let idx = 1;

      if (email) {
        conditions.push(`client_email = $${idx++}`);
        vals.push(email);
      } else if (user && !all) {
        conditions.push(`client_email = $${idx++}`);
        vals.push(user.email);
      }

      if (statusFilter && statusFilter !== 'all') {
        conditions.push(`status = $${idx++}`);
        vals.push(statusFilter);
      }

      const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      const result = await pool.query(
        `SELECT * FROM sec_orders ${where} ORDER BY created_at DESC LIMIT 200`,
        vals
      );
      return res.json({ success: true, data: result.rows });
    }

    // POST - create order
    if (req.method === 'POST') {
      const { symbol, name, side, orderType, quantity, price, isPaper, shortSell, remarks } = req.body;
      if (!symbol || !side || !quantity || !price) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      const email = user?.email || req.body.email || '';
      const amount = quantity * price;

      // Generate order ref: EXTH/EXTU-YYMMDD-NNNNNN
      const now = new Date();
      const yy = String(now.getFullYear()).slice(2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const prefix = symbol.endsWith('.HK') ? 'EXTH' : 'EXTU';
      const dateStr = `${yy}${mm}${dd}`;

      // Get next sequence number
      const seqRes = await pool.query(
        `SELECT order_ref FROM sec_orders WHERE order_ref LIKE $1 ORDER BY order_ref DESC LIMIT 1`,
        [`${prefix}-${dateStr}-%`]
      );
      let seq = 1;
      if (seqRes.rows[0]) {
        const lastSeq = parseInt(seqRes.rows[0].order_ref.split('-').pop()) || 0;
        seq = lastSeq + 1;
      }
      const orderRef = `${prefix}-${dateStr}-${String(seq).padStart(6, '0')}`;

      // Find client_id by email
      let clientId = null;
      if (email) {
        const clientRes = await pool.query('SELECT id FROM clients WHERE email = $1 LIMIT 1', [email]);
        clientId = clientRes.rows[0]?.id || null;
      }

      const result = await pool.query(
        `INSERT INTO sec_orders (order_ref, client_email, client_id, symbol, name, side, order_type, quantity, price, amount, status, is_paper, short_sell, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [orderRef, email, clientId, symbol, name || '', side, orderType || 'LIMIT', quantity, price, amount, 'pending_review', isPaper || false, shortSell || false, remarks || '']
      );

      return res.json({ success: true, data: result.rows[0] });
    }

    // PUT - update order status
    if (req.method === 'PUT') {
      const { id, orderRef, status: newStatus } = req.body;
      if (!newStatus) return res.status(400).json({ success: false, error: 'status required' });

      const condition = id ? 'id = $1' : 'order_ref = $1';
      const val = id || orderRef;

      const result = await pool.query(
        `UPDATE sec_orders SET status = $2, updated_at = NOW() WHERE ${condition} RETURNING *`,
        [val, newStatus]
      );
      if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Order not found' });
      return res.json({ success: true, data: result.rows[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('Orders API error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
