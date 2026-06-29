import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import pg from 'pg';
const { Pool } = pg;

const RAILWAY_URL = 'postgresql://postgres:XCBgJFsPbtJgiaCGaKgQXxnnhTJzyusL@switchyard.proxy.rlwy.net:45054/railway';
const pool = new Pool({ connectionString: process.env.DATABASE_URL || RAILWAY_URL, ssl: { rejectUnauthorized: false }, max: 3 });
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

  const { email, code, token, newPassword } = req.body;
  if (!email || !code || !token || !newPassword) return res.status(400).json({ error: '请填写所有字段' });
  if (newPassword.length < 8) return res.status(400).json({ error: '密码至少8位' });

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
    if (existing.rows.length === 0) return res.status(400).json({ error: '该邮箱未注册' });

    const passwordHash = hashPassword(newPassword);
    await pool.query('UPDATE portal_users SET password_hash = $1, updated_at = NOW() WHERE email = $2', [passwordHash, email.toLowerCase()]);

    return res.json({ success: true, message: '密码已重置' });
  } catch (err: any) {
    return res.status(500).json({ error: '重置失败' });
  }
}
