import dotenv from 'dotenv';

dotenv.config();

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const redirectUri = req.query.redirect_uri || '/api/auth/google/callback';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Google Sign-In - Google Ads API Approval</title>
      <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght=400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
      </style>
    </head>
    <body class="bg-slate-50 min-h-screen flex items-center justify-center p-4">
      <div class="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 border border-slate-100">
        <!-- Google Brand -->
        <div class="flex justify-between items-center mb-6">
          <div class="flex items-center gap-1.5 font-bold text-xl text-slate-800">
            <span class="text-blue-600">G</span>
            <span class="text-red-500">o</span>
            <span class="text-yellow-500">o</span>
            <span class="text-blue-500">g</span>
            <span class="text-green-500">l</span>
            <span class="text-red-500">e</span>
          </div>
          <span class="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">OAuth Simulator</span>
        </div>

        <h2 class="text-xl font-bold text-slate-900 mb-2">Yêu cầu quyền truy cập tài khoản</h2>
        <p class="text-sm text-slate-500 mb-6">
          Ứng dụng <strong class="text-slate-800">A96 Google Ads Dashboard</strong> muốn truy cập dữ liệu trong Tài khoản Google của bạn.
        </p>

        <!-- Scopes -->
        <div class="space-y-4 mb-8">
          <div class="flex gap-3 items-start p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div class="text-xl mt-0.5">📊</div>
            <div>
              <p class="text-sm font-semibold text-slate-800">Quản lý và báo cáo Google Ads</p>
              <p class="text-xs text-slate-500">Cho phép ứng dụng tải dữ liệu chiến dịch, xem hiệu suất click, chuyển đổi và thống kê nhóm quảng cáo.</p>
            </div>
          </div>
        </div>

        <!-- Dev Note -->
        <p class="text-[11px] text-slate-400 mb-6 bg-yellow-50 text-yellow-800 border border-yellow-105 p-2.5 rounded">
          💡 <strong>Gợi ý:</strong> Bạn đang ở chế độ giả lập vì chưa thiết lập GOOGLE_ADS_CLIENT_ID trong file .env. Bấm Chấp nhận để kích hoạt kết nối tài khoản demo lập tức!
        </p>

        <!-- Actions -->
        <div class="flex gap-3">
          <button onclick="window.close()" class="flex-1 py-2.5 border border-slate-205 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition cursor-pointer">
            Hủy bỏ
          </button>
          <a href="${redirectUri}?code=mock_code_831_294_1188" class="flex-grow text-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold py-2.5 transition cursor-pointer">
            Cho phép
          </a>
        </div>
      </div>
    </body>
    </html>
  `);
}
