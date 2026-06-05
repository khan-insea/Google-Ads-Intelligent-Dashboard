import dotenv from 'dotenv';
dotenv.config();

export default function handler(req: any, res: any) {
  // Return Method Not Allowed if method is GET or anything other than POST
  if (req.method === 'GET') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: 'Method Not Allowed'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method Not Allowed'
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const isProduction = process.env.NODE_ENV === 'production';

  // Check if system environment variables are configured
  if (!adminEmail || !adminPassword) {
    if (isProduction) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi cấu hình hệ thống: Thiếu ADMIN_EMAIL hoặc ADMIN_PASSWORD trong Vercel Environment Variables.'
      });
    }
  }

  const { email, password } = req.body || {};
  const finalEmail = adminEmail || 'ads.a96agency@gmail.com';
  const finalPassword = adminPassword || '123456';

  if (email === finalEmail && password === finalPassword) {
    return res.status(200).json({
      success: true,
      token: 'mock_jwt_session_token_a96_agency_2026',
      user: {
        email,
        role: 'admin',
        name: 'A96 Agency Admin'
      }
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Sai email hoặc mật khẩu'
  });
}
