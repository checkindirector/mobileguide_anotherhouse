// Reports are private local artifacts, excluded from Git and Vercel uploads.
const fs = require('node:fs/promises');
const path = require('node:path');
const { previousWeek } = require('../lib/weekly-report.cjs');
(async () => {
  if (!process.env.ANALYTICS_REPORT_TOKEN) throw new Error('missing_credentials');
  const range = previousWeek();
  const response = await fetch('https://anotherhouse-guide.vercel.app/api/analytics-report?' + new URLSearchParams(range), {
    headers: { Authorization: `Bearer ${process.env.ANALYTICS_REPORT_TOKEN}` }, signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`report_http_${response.status}`);
  const report = await response.json();
  const date = new Date(Date.parse(range.from) + 9 * 3600000).toISOString().slice(0, 10);
  const directory = path.join(__dirname, '..', 'reports', 'concierge-weekly');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, `${date}.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ saved: path.join(directory, `${date}.json`), current: report.current, complete: report.complete, previousComplete: report.previousComplete }));
})().catch(error => { console.error(`Report not generated (${error.message}). No zero/fictional figures substituted.`); process.exitCode = 1; });
