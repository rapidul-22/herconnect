import { spawnSync } from 'node:child_process';
if(process.env.NODE_ENV==='production') throw new Error('Demo seeding is disabled in production.');
if(!process.env.DEMO_PASSWORD || process.env.DEMO_PASSWORD.length<12) throw new Error('Set DEMO_PASSWORD to at least 12 characters.');
for(const file of ['server/seed.js','server/seed-hiring.js','server/seed-safety.js','server/seed-transport.js']) {
 const result=spawnSync(process.execPath,[file],{stdio:'inherit',env:process.env});
 if(result.status!==0) process.exit(result.status || 1);
}
console.log('Demo hub ready. Existing records and passwords were retained. Switch to demo mode where shown.');
