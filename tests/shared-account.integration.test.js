import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { app } from '../server/app.js';
import { User, initModels } from '../server/models.js';
import { WorkerProfile, initHiringModels } from '../server/hiring-models.js';
import { SafetyReport, initSafetyModels } from '../server/safety-models.js';
import { DriverProfile, initTransportModels } from '../server/transport-models.js';
process.env.NODE_ENV = 'test';
test('one member session owns shop, worker, safety and driver profiles without separate signups', async () => {
 let repl;
 try {
  repl=await MongoMemoryReplSet.create({replSet:{count:1}});
  await mongoose.connect(repl.getUri('shared_account_tests'));
  await Promise.all([initModels(),initHiringModels(),initSafetyModels(),initTransportModels()]);
  const agent=request.agent(app);
  const signup=await agent.post('/api/auth/signup').send({name:'One Member',email:'one@herconnect.demo',phone:'01712345678',password:'LongTestPassword123!'}).expect(201);
  const user=signup.body.user, csrf=signup.body.csrfToken;
  const write=(method,path,body)=>agent[method]('/api'+path).set('X-CSRF-Token',csrf).send(body);
  await write('post','/seller/apply',{name:'One member shop',city:'Dhaka',story:'A fictional shop application to verify shared account access.'}).expect(201);
  await write('put','/hiring/mine',{displayName:'One Member',skills:['Cleaning'],bio:'A fictional household service profile for this test.',experienceYears:2,hourlyRate:20000,serviceArea:'Dhaka',available:true,weekdays:[0,1,2,3,4,5,6],dayStart:0,dayEnd:1440}).expect(201);
  await write('post','/reports',{category:'Harassment',description:'A fictional report used to verify shared account access.',location:{address:'Test landmark',lat:23.81,lng:90.41},occurredAt:new Date(Date.now()-3600000).toISOString(),isAnonymous:true,requestKey:crypto.randomUUID()}).expect(201);
  await write('put','/transport/driver',{displayName:'One Member',bio:'Fictional driving service for shared account verification.',vehicleType:'Car',vehicleNumber:'DEMO-123',licenseNumber:'DEMO-PRIVATE'}).expect(200);
  for(const path of ['/orders','/hiring/bookings','/transport/rides']) await agent.get('/api'+path).expect(200);
  const me=(await agent.get('/api/auth/me').expect(200)).body.user;
  assert.equal(me._id,user._id);assert.equal(await User.countDocuments(),1);assert.equal(me.shop.status,'pending');
  const worker=await WorkerProfile.findOne({user:user._id}),driver=await DriverProfile.findOne({user:user._id});
  assert.equal(worker.status,'pending');assert.equal(driver.status,'pending');
  assert.equal(await SafetyReport.countDocuments({reporter:user._id}),1);
  await agent.get('/api/transport/admin/drivers').expect(403);
  assert.equal(me.isAdmin,false);
 } finally { await mongoose.disconnect();await repl?.stop(); }
});
