import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

function getSecret(): string {
  return process.env.VERIFY_SECRET || 'cmf-sec-verify-secret';
}

function signCode(email: string, code: string, expires: number): string {
  const payload = `${email}:${code}:${expires}`;
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ email, code, expires, sig })).toString('base64');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Please provide a valid email address' });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = Date.now() + 10 * 60 * 1000; // 10 min
  const token = signCode(email, code, expires);

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cmf-otc.com';
  if (!apiKey) {
    console.error('RESEND_API_KEY not configured');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `誠港金融證券交易 <${fromEmail}>`,
        to: [email],
        subject: '驗證碼 - 誠港金融證券交易客戶端',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <p style="color: #334155; font-size: 15px; text-align: center; font-weight: bold; margin-bottom: 24px;">
              CM Financial Securities Trading<br/>誠港金融證券交易
            </p>
            <p style="color: #334155; font-size: 14px;">您好，</p>
            <p style="color: #334155; font-size: 14px;">您正在註冊/登入誠港金融證券交易客戶端，您的驗證碼為：</p>
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #1e40af;">${code}</span>
            </div>
            <p style="color: #64748b; font-size: 13px;">此驗證碼將在10分鐘後失效。如非本人操作，請忽略此郵件。</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
            <p style="color: #475569; font-size: 12px; text-align: center;">
              誠港金融股份有限公司 Canton Mutual Financial Limited<br/>
              此郵件由系統自動發送，請勿直接回覆。
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Resend API error:', response.status, errorData);
      return res.status(500).json({ error: 'Failed to send verification code', detail: errorData });
    }

    return res.status(200).json({ success: true, token });
  } catch (error) {
    console.error('Failed to send email:', error);
    return res.status(500).json({ error: 'Failed to send verification code' });
  }
}
