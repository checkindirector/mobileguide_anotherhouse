// Generate private credentials, never print them or pass them as CLI arguments.
const { randomBytes } = require('node:crypto');
const { writeFileSync, existsSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const file = '.env.reporting.local';
if (existsSync(file)) { console.error('Refusing to overwrite existing reporting credentials.'); process.exit(1); }
const values = { ANALYTICS_REPORT_TOKEN: randomBytes(32).toString('hex'), CRON_SECRET: randomBytes(32).toString('hex'), TELEMETRY_ENABLED: 'true' };
// Generated credentials are Git/Vercel ignored; do not add this file to either.
writeFileSync(file, Object.entries(values).map(([k,v])=>`${k}=${v}`).join('\n')+'\n', {mode:0o600,flag:'wx'});
for (const [name, value] of Object.entries(values)) {
  const result = spawnSync('npx', ['--yes', 'vercel', 'env', 'add', name, 'production', '--force', '--sensitive', '--global-config', '.vercel/auth-local'], {shell:process.platform==='win32',input:value,encoding:'utf8'});
  if (result.status !== 0) { console.error(`Setting ${name} failed. Private local credentials preserved; no values printed.`); process.exit(1); }
  console.log(`${name}: stored as Sensitive on Vercel`);
}
