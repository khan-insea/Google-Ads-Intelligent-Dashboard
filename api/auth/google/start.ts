import dotenv from 'dotenv';

dotenv.config();

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const host = req.headers.host || 'google-ads-intelligent-dashboard.vercel.app';
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const fallbackRedirectUri = `${protocol}://${host}/api/auth/google/callback`;
  const redirectUri = process.env.GOOGLE_ADS_REDIRECT_URI || fallbackRedirectUri;

  const state = req.query.state || '';

  if (!clientId) {
    let mockAuthUrl = `${protocol}://${host}/api/auth/google/mock-consent?redirect_uri=${encodeURIComponent(redirectUri)}`;
    if (state) {
      mockAuthUrl += `&state=${encodeURIComponent(String(state))}`;
    }
    return res.status(200).json({ url: mockAuthUrl });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/adwords',
    access_type: 'offline',
    prompt: 'consent'
  });

  if (state) {
    params.append('state', String(state));
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return res.status(200).json({ url: authUrl });
}
