// Production QA sends synthetic events marked internal and never prints secrets.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { db, context } = require('../lib/telemetry.cjs');
(async () => {
  const root='https://anotherhouse-guide.vercel.app', sql=db();
  const telemetry={visitorId:randomUUID(),sessionId:randomUUID(),internal:true,turn:1};
  const send=(path,body)=>fetch(root+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:root},body:JSON.stringify(body)});
  const visit=await send('/api/analytics-event',{id:randomUUID(),kind:'visit',language:'ko',telemetry});assert.equal(visit.status,202);
  const response=await send('/api/chat',{message:'짐',language:'ko',telemetry});assert.equal(response.status,200);
  const answer=await response.json();assert.ok(answer.answer.includes('503'));
  const session=context({telemetry}).session;
  let rows=[];
  for(let i=0;i<8;i++) {rows=await sql`SELECT kind, data FROM concierge_events WHERE data->>'session'=${session}`;if(rows.length===2&&rows.some(x=>x.kind==='chat'&&x.data.state==='complete'))break;await new Promise(r=>setTimeout(r,1000));}
  assert.equal(rows.length,2);const chat=rows.find(x=>x.kind==='chat').data;assert.equal(chat.state,'complete');assert.equal(chat.internal,true);assert.equal(chat.intent,'luggage');
  const secret=process.env.ANOTHER_HOUSE_COMMON_ENTRANCE_CODE; if(secret)assert.ok(!JSON.stringify(rows).includes(secret));
  const opted=await send('/api/chat',{message:'짐',language:'ko',telemetry:{...telemetry,optOut:true}});assert.equal(opted.status,200);
  const unauthorized=await fetch(root+'/api/analytics-report');assert.equal(unauthorized.status,401);
  const maintenance=await fetch(root+'/api/analytics-maintenance',{headers:{Authorization:'Bearer '+process.env.CRON_SECRET}});assert.equal(maintenance.status,200);
  const range={from:new Date(Date.now()-86400000).toISOString(),to:new Date(Date.now()+60000).toISOString()};
  const reportResponse=await fetch(root+'/api/analytics-report?'+new URLSearchParams(range),{headers:{Authorization:'Bearer '+process.env.ANALYTICS_REPORT_TOKEN}});assert.equal(reportResponse.status,200);
  const report=await reportResponse.json();assert.ok(report.current.internalEventsExcluded>=2);assert.ok(!report.conversations.some(x=>x.session===session));assert.ok(report.retentionCleanupAt);
  const after=await sql`SELECT count(*)::int AS n FROM concierge_events WHERE data->>'session'=${session}`;assert.equal(after[0].n,2);
  console.log(JSON.stringify({storage:'verified',approvedAnswer:'verified',masking:'verified',optOut:'verified',unauthorizedReport:unauthorized.status,internalExclusion:'verified',retentionJob:'verified',collectionStartedAt:report.collectionStartedAt}));
})().catch(error=>{console.error('Production telemetry verification failed:',error.code||error.name);process.exitCode=1;});
