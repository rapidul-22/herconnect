import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import {localSuggestions} from '../shared/places.js';
import {clusterReports} from '../shared/safety.js';
import {publicUser,auth} from '../server/auth.js';
import {reportView,reportInput,safety} from '../server/safety.js';
import {profileInput} from '../server/hiring-rules.js';
process.env.NODE_ENV='test';
test('local address matching works without key, supports Bangla and does not return unrelated places',()=>{
 assert.ok(localSuggestions('Gul').length>=2);assert.ok(localSuggestions('ধান').length);assert.equal(localSuggestions('xxxx-no-place').length,0);
 assert.equal(localSuggestions('G').length,0);assert.ok(localSuggestions('UIU')[0].approximate);
});
test('risk indicators weight severity and recency and private evidence is never projected publicly',()=>{
 const now=Date.now();const rows=Array.from({length:3},()=>({category:'Assault',location:{lat:23.8,lng:90.4,address:'Area'},occurredAt:new Date(now-86400000)}));
 assert.equal(clusterReports(rows,now)[0].level,'High report activity');
 assert.ok(clusterReports(rows.map(r=>({...r,occurredAt:new Date(now-100*86400000)})),now)[0].score<5);
 const r={...rows[0],isAnonymous:true,personDetails:'PRIVATE',witnessNotes:'SECRET',evidence:[{_id:'photo',data:Buffer.from('hidden')}],reporter:{name:'Reporter'}};
 const pub=reportView(r);assert.equal(pub.personDetails,undefined);assert.equal(pub.evidence,undefined);
 const own=reportView(r,true);assert.equal(own.personDetails,'PRIVATE');assert.equal(own.evidence[0].data,undefined);
 const u={emergencyPhone:'01712345678',bloodGroup:'A+'};assert.equal(publicUser(u).emergencyPhone,undefined);assert.equal(publicUser(u,true).bloodGroup,'A+');
});
test('profile updates validate blood group and contact; evidence endpoints require a session',async()=>{
 const app=express();app.use(express.json());const user={_id:'111111111111111111111111',name:'Member',save:async()=>{}};
 app.use((req,res,next)=>{if(req.get('Test-User')){req.user=user;req.session={csrfToken:'token'};}next();});app.use('/auth',auth);app.use(safety);app.use((e,req,res,next)=>res.status(e.status||400).json({error:e.message}));
 const payload={name:'Member',phone:'01712345678',address:'',bloodGroup:'O+',emergencyPhone:'01812345678',isAdmin:true};
 const good=await request(app).patch('/auth/profile').set('Test-User','1').set('X-CSRF-Token','token').send(payload).expect(200);
 assert.equal(good.body.emergencyPhone,payload.emergencyPhone);assert.equal(user.isAdmin,undefined);
 await request(app).patch('/auth/profile').set('Test-User','1').set('X-CSRF-Token','token').send({...payload,bloodGroup:'invalid'}).expect(400);
 await request(app).post('/reports/111111111111111111111111/evidence').expect(401);
 await request(app).get('/reports/111111111111111111111111/evidence/222222222222222222222222').expect(401);
 assert.equal(profileInput.safeParse({displayName:'Professional',skills:['Software Engineering','Marketing'],bio:'Professional services for small businesses and clients.',experienceYears:3,hourlyRate:100000,serviceArea:'Dhaka',available:true,weekdays:[1,2],dayStart:480,dayEnd:1200}).success,true);
});
