const supabaseUrl = process.env.SUPABASE_URL || 'https://jykptknzasrrkvtxtvuk.supabase.co';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
if (!anonKey) {
  console.error('SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY is required for health checks.');
  process.exit(1);
}
const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
const checks = [
  ['website content', '/rest/v1/content_block?select=id&limit=1'],
  ['school directory', '/rest/v1/school_directory?select=id&limit=1'],
  ['staff', '/rest/v1/staff?select=id&limit=1'],
  ['calendar', '/rest/v1/takwim?select=id&limit=1'],
  ['announcements', '/rest/v1/pengumuman?select=id&limit=1'],
  ['PSS books', '/rest/v1/pss_book?select=id&limit=1'],
  ['PSS loans', '/rest/v1/pss_pinjaman?select=id&limit=1'],
  ['PSS suggestions', '/rest/v1/cadangan_buku?select=id&limit=1'],
  ['PSS NILAM', '/rest/v1/nilam_stat?select=id&limit=1'],
  ['activity gallery', '/rest/v1/gallery_item?select=id&limit=1'],
  ['public booking view', '/rest/v1/tempahan_awam?select=bilik&limit=1']
];
const failures = [];
for (const [label, path] of checks) {
  const response = await fetch(`${supabaseUrl}${path}`, { headers });
  console.log(`${response.ok ? 'OK' : 'FAIL'} ${label} (${response.status})`);
  if (!response.ok) failures.push(`${label}: HTTP ${response.status}`);
}
const clinic = await fetch(`${supabaseUrl}/rest/v1/rpc/klinik_cari`, {
  method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_ic: '123' })
});
const clinicBlocked = [401, 403, 404].includes(clinic.status);
console.log(`${clinicBlocked ? 'OK' : 'FAIL'} clinic RPC anonymous access blocked (${clinic.status})`);
if (!clinicBlocked) failures.push(`clinic RPC anonymous access: HTTP ${clinic.status}`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Supabase health check passed: ${checks.length + 1} modules`);
