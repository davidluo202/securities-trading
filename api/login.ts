import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 });
const SECRET = process.env.VERIFY_SECRET || 'cmf-otc-client-verify-secret';

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const computed = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === computed;
}

function verifyCaptcha(token: string, code: string): boolean {
  if (!token || !code) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const expiry = parseInt(parts[0], 10);
  if (Date.now() > expiry) return false;
  const expected = crypto.createHmac('sha256', SECRET).update(`${code.toLowerCase()}:${expiry}`).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(parts[1]), Buffer.from(expected)); } catch { return false; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, captchaToken, captchaCode } = req.body;
  if (!email || !password) return res.status(400).json({ error: '请输入邮箱和密码' });
  if (!captchaToken || !captchaCode) return res.status(400).json({ error: '请输入验证码' });
  if (!verifyCaptcha(captchaToken, captchaCode)) return res.status(400).json({ error: '验证码错误或已过期' });

  try {
    const result = await pool.query('SELECT id, email, name, password_hash FROM portal_users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) return res.status(401).json({ error: '邮箱或密码错误' });

    const user = result.rows[0];
    if (!verifyPassword(password, user.password_hash)) return res.status(401).json({ error: '邮箱或密码错误' });

    const authSig = crypto.createHmac('sha256', SECRET).update(`${user.email}:${user.name}:${Date.now()}`).digest('hex');
    const token = Buffer.from(JSON.stringify({ email: user.email, name: user.name, sig: authSig })).toString('base64');

    return res.json({ success: true, token, name: user.name, email: user.email });
  } catch (err: any) {
    return res.status(500).json({ error: '登录失败' });
  }
}
