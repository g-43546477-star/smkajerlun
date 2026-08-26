import { readFile } from 'node:fs/promises';

const supabaseUrl = process.env.SUPABASE_URL || 'https://jykptknzasrrkvtxtvuk.supabase.co';
let anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
if (!anonKey) {
  const cmsSource = await readFile(new URL('../assets/cms.js', import.meta.url), 'utf8');
  anonKey = cmsSource.match(/\bCMS_KEY\s*=\s*['"]([^'"]+)['"]/)?.[1];
}
if (!anonKey) {
  console.error('Supabase public key not found in the environment or public CMS configuration.');
  process.exit(1);
}
const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
const checks = [
  ['website content', '/rest/v1/content_block?select=id&limit=1'],
  ['school directory', '/rest/v1/school_directory?select=id&limit=1'],
  ['download resources', '/rest/v1/resource_file?select=id&limit=1'],
  ['staff', '/rest/v1/staff?select=id&limit=1'],
  ['school calendar scope', '/rest/v1/takwim?select=id,portal&portal=eq.sekolah&limit=1'],
  ['PSS calendar scope', '/rest/v1/takwim?select=id,portal&portal=eq.pss&limit=1'],
  ['school announcement scope', '/rest/v1/pengumuman?select=id,portal&portal=eq.sekolah&limit=1'],
  ['PSS announcement scope', '/rest/v1/pengumuman?select=id,portal&portal=eq.pss&limit=1'],
  ['school program articles', '/rest/v1/achievement?select=id&kategori=eq.sekolah&limit=1'],
  ['PSS books', '/rest/v1/pss_book?select=id&limit=1'],
  ['PSS loans', '/rest/v1/pss_pinjaman?select=id&limit=1'],
  ['PSS suggestions', '/rest/v1/cadangan_buku?select=id&limit=1'],
  ['PSS NILAM', '/rest/v1/nilam_stat?select=id&limit=1'],
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
const auditTable = await fetch(`${supabaseUrl}/rest/v1/admin_audit_log?select=id&limit=1`, { headers });
const auditTableBlocked = [401, 403, 404].includes(auditTable.status);
console.log(`${auditTableBlocked ? 'OK' : 'FAIL'} audit table anonymous access blocked (${auditTable.status})`);
if (!auditTableBlocked) failures.push(`audit table anonymous access: HTTP ${auditTable.status}`);
const auditRpc = await fetch(`${supabaseUrl}/rest/v1/rpc/record_admin_audit`, {
  method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}'
});
const auditRpcBlocked = [401, 403, 404].includes(auditRpc.status);
console.log(`${auditRpcBlocked ? 'OK' : 'FAIL'} audit function anonymous access blocked (${auditRpc.status})`);
if (!auditRpcBlocked) failures.push(`audit function anonymous access: HTTP ${auditRpc.status}`);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Supabase health check passed: ${checks.length + 3} modules`);
