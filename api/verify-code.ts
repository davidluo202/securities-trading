import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

function getSecret(): string {
  return process.env.VERIFY_SECRET || 'cmf-sec-verify-secret';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, code } = req.body;
  if (!token || !code) {
    return res.status(400).json({ error: 'Missing token or code' });
  }

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    const { email, code: storedCode, expires, sig } = decoded;

    // Check expiry
    if (Date.now() > expires) {
      return res.status(400).json({ error: 'Verification code expired' });
    }

    // Verify signature
    const payload = `${email}:${storedCode}:${expires}`;
    const expectedSig = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
    if (sig !== expectedSig) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    // Check code
    if (code !== storedCode) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Generate a verified token for registration
    const verifiedExpires = Date.now() + 30 * 60 * 1000; // 30 min to complete registration
    const verifiedPayload = `verified:${email}:${verifiedExpires}`;
    const verifiedSig = crypto.createHmac('sha256', getSecret()).update(verifiedPayload).digest('hex');
    const verifiedToken = Buffer.from(JSON.stringify({ email, verified: true, expires: verifiedExpires, sig: verifiedSig })).toString('base64');

    return res.status(200).json({ success: true, email, verifiedToken });
  } catch (error) {
    console.error('Verify code error:', error);
    return res.status(400).json({ error: 'Invalid token format' });
  }
}
