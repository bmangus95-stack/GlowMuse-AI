// Vercel serverless function. Exchanges an OAuth authorization code (or
// refresh token) for a Pinterest access token. Runs server-side so the
// Pinterest app's client secret never reaches the browser.

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const clientId = process.env.PINTEREST_CLIENT_ID;
  const clientSecret = process.env.PINTEREST_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(500).json({ error: 'Pinterest OAuth is not configured on the server.' });
    return;
  }

  const { grant_type, code, redirect_uri, refresh_token } = req.body ?? {};
  const body = new URLSearchParams();

  if (grant_type === 'authorization_code') {
    if (!code || !redirect_uri) {
      res.status(400).json({ error: 'Missing code or redirect_uri.' });
      return;
    }
    body.set('grant_type', 'authorization_code');
    body.set('code', code);
    body.set('redirect_uri', redirect_uri);
  } else if (grant_type === 'refresh_token') {
    if (!refresh_token) {
      res.status(400).json({ error: 'Missing refresh_token.' });
      return;
    }
    body.set('grant_type', 'refresh_token');
    body.set('refresh_token', refresh_token);
  } else {
    res.status(400).json({ error: 'Invalid grant_type.' });
    return;
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const tokenRes = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok) {
    res.status(tokenRes.status).json({ error: data?.message || 'Pinterest token exchange failed.' });
    return;
  }

  res.status(200).json(data);
}
