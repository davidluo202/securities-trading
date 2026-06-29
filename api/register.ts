import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 });
const SECRET = process.env.VERIFY_SECRET || 'cmf-otc-client-verify-secret';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, code, token, name, password } = req.body;
  if (!email || !code || !token || !name || !password) return res.status(400).json({ error: '请填写所有必填项' });
  if (password.length < 8) return res.status(400).json({ error: '密码至少8位' });

  // Verify email code
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    if (decoded.email !== email.toLowerCase()) return res.status(400).json({ error: '验证码无效' });
    if (decoded.expires < Date.now()) return res.status(400).json({ error: '验证码已过期' });
    const payload = `${email.toLowerCase()}:${code}:${decoded.expires}`;
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
    if (expected !== decoded.sig) return res.status(400).json({ error: '验证码错误' });
  } catch { return res.status(400).json({ error: '验证失败' }); }

  try {
    const existing = await pool.query('SELECT id FROM portal_users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) return res.status(400).json({ error: '该邮箱已注册，请直接登录' });

    const passwordHash = hashPassword(password);
    await pool.query('INSERT INTO portal_users (email, name, password_hash) VALUES ($1, $2, $3)', [email.toLowerCase(), name, passwordHash]);

    // Create clients record if not exists
    const existingClient = await pool.query('SELECT id FROM clients WHERE email = $1', [email.toLowerCase()]);
    if (existingClient.rows.length === 0) {
      const maxIdRes = await pool.query('SELECT COALESCE(MAX(id), 0) as max_id FROM clients');
      const seq = (parseInt(maxIdRes.rows[0].max_id) || 0) + 1;
      const clientCode = `668${String(seq).padStart(4, '0')}`;
      await pool.query(
        'INSERT INTO clients (code, name, email, status, markup_percent, created_at, updated_at) VALUES ($1, $2, $3, $4, 0.3, NOW(), NOW())',
        [clientCode, name, email.toLowerCase(), '活跃']
      );
    }

    const authSig = crypto.createHmac('sha256', SECRET).update(`${email.toLowerCase()}:${name}:${Date.now()}`).digest('hex');
    const authToken = Buffer.from(JSON.stringify({ email: email.toLowerCase(), name, sig: authSig })).toString('base64');

    return res.json({ success: true, token: authToken, name, email: email.toLowerCase() });
  } catch (err: any) {
    return res.status(500).json({ error: '注册失败' });
  }
}
