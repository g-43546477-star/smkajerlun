const { createHmac } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PSS_VISITOR_SALT, VERCEL_ENV } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PSS_VISITOR_SALT || VERCEL_ENV !== 'production') {
    return res.status(503).json({ error: 'Tracker belum diaktifkan.' });
  }
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  try {
    if (req.method === 'POST') {
      const origin = req.headers.origin;
      if (!origin || new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'Forbidden' });
      const ip = req.headers['x-real-ip'];
      if (typeof ip !== 'string' || !ip || ip.length > 64) return res.status(400).json({ error: 'Missing address' });
      if (/bot|crawler|spider|headless/i.test(req.headers['user-agent'] || '')) return res.status(204).end();
      const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const token = createHmac('sha256', PSS_VISITOR_SALT).update(day + '|' + ip).digest('hex');
      const rawCountry = req.headers['x-vercel-ip-country'];
      const country = typeof rawCountry === 'string' && /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : 'ZZ';
      const { error } = await db.rpc('pss_record_visitor', { p_token: token, p_country: country });
      if (error) throw error;
      return res.status(204).end();
    }
    const { data, error } = await db.rpc('pss_visitor_stats');
    if (error) throw error;
    return res.status(200).json(data);
  } catch {
    return res.status(503).json({ error: 'Statistik sementara tidak tersedia.' });
  }
};
