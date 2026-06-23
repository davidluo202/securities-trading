import type { VercelRequest, VercelResponse } from '@vercel/node';

const RISK_WARNING = '\n\n诚港金融CMF从来不会通过短信索取客户的登录信息（用户名+密码）、验证码以及其他有关的交易详情，一旦你发现有短讯向你索取或提供短信内的链接，请马上退出，不予理会。';

type TemplateKey =
  | 'login_success'
  | 'deposit_submitted'
  | 'deposit_confirmed'
  | 'withdrawal_submitted'
  | 'withdrawal_confirmed'
  | 'order_submitted'
  | 'order_filled'
  | 'statement_ready';

const templates: Record<TemplateKey, string> = {
  login_success: '您已成功登入，IP: {ip}, 地區: {region}, 時間: {time}',
  deposit_submitted: '您的入金申請 {amount} {currency} 已提交，等待確認',
  deposit_confirmed: '您的入金 {amount} {currency} 已到賬',
  withdrawal_submitted: '您的出金申請 {amount} {currency} 已提交',
  withdrawal_confirmed: '您的出金 {amount} {currency} 已完成',
  order_submitted: '您的{side}訂單已提交：{symbol} x{quantity}',
  order_filled: '您的{side}訂單已成交：{symbol} x{quantity} @ {price}',
  statement_ready: '您的{period}結單已生成，請登入系統查看',
};

function renderTemplate(tpl: string, data: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? `{${key}}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phone, template, data } = req.body;
  if (!phone || typeof phone !== 'string' || !/^\+\d{7,15}$/.test(phone)) {
    return res.status(400).json({ error: 'Please provide a valid phone number with country code' });
  }
  if (!template || !(template in templates)) {
    return res.status(400).json({ error: 'Invalid template', validTemplates: Object.keys(templates) });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || !messagingServiceSid) {
    console.error('Twilio credentials not configured');
    return res.status(500).json({ error: 'SMS service not configured' });
  }

  const content = renderTemplate(templates[template as TemplateKey], data || {});
  const messageBody = `CMFinancial Notification\n${content}${RISK_WARNING}`;

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

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to send notification SMS:', error);
    return res.status(500).json({ error: 'Failed to send SMS' });
  }
}
