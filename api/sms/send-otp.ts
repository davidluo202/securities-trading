import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

function getSecret(): string {
  return process.env.VERIFY_SECRET || 'cmf-sec-verify-secret';
}

function signCode(phone: string, code: string, expires: number): string {
  const payload = `${phone}:${code}:${expires}`;
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ phone, code, expires, sig })).toString('base64');
}

const RISK_WARNING = '\n\n诚港金融CMF从来不会通过短信索取客户的登录信息（用户名+密码）、验证码以及其他有关的交易详情，一旦你发现有短讯向你索取或提供短信内的链接，请马上退出，不予理会。';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone } = req.body;
  if (!phone || typeof phone !== 'string' || !/^\+\d{7,15}$/.test(phone)) {
    return res.status(400).json({ error: 'Please provide a valid phone number with country code' });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = Date.now() + 10 * 60 * 1000; // 10 min
  const token = signCode(phone, code, expires);

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || !messagingServiceSid) {
    console.error('Twilio credentials not configured');
    return res.status(500).json({ error: 'SMS service not configured' });
  }

  const messageBody = `CMFinancial Notification\n您的驗證碼為：${code}，10分鐘內有效。${RISK_WARNING}`;

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          MessagingServiceSid: messagingServiceSid,
          To: phone,
          Body: messageBody,
        }).toString(),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Twilio API error:', response.status, errorData);
      return res.status(500).json({ error: 'Failed to send SMS', detail: errorData });
    }

    return res.status(200).json({ success: true, token });
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return res.status(500).json({ error: 'Failed to send SMS' });
  }
}
