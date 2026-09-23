import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { roadQuote, addressSuggestions, routeModes } from '../server/transport-routing.js';
import { transport } from '../server/transport.js';
import { TransportRide as Ride } from '../server/transport-models.js';
import { mockRoadProvider } from './helpers/road-provider.js';
process.env.NODE_ENV = 'test';
test('road distance drives fare, coordinate conversion, travel modes, Bangladesh suggestions and cached estimates', async t => {
 const fetch = mockRoadProvider(t);
 const a={lat:23.815,lng:90.415}, b={lat:23.825,lng:90.415};
 const quote = await roadQuote(a,b,'Car');
 assert.equal(quote.fare,14000);
 assert.deepEqual(quote.fareBreakdown,{base:8000,perKm:3000,distanceMeters:2000,distanceCharge:6000,rounding:0});
 await assert.rejects(roadQuote(a,b,'Rickshaw'),{status:400}); assert.equal(quote.distanceKm,2); assert.equal(quote.durationMinutes,8);
 assert.deepEqual(quote.route[0][0],[a.lat,a.lng]); assert.equal(quote.route[0].length,3);
 await roadQuote(a,b,'Car'); assert.equal(fetch.mock.calls.length,1);
 assert.deepEqual(routeModes,{Car:'drive',CNG:'drive',Motorbike:'motorcycle',Rickshaw:'bicycle'});
 const suggestions=await addressSuggestions('Dhanmondi');
 assert.equal(suggestions[0].lng,90.376);
 const url=new URL(fetch.mock.calls.at(-1).arguments[0]); assert.equal(url.searchParams.get('filter'),'countrycode:bd');
});
test('provider failure and missing key never fall back to a straight-line ride', async t => {
 const original=process.env.GEOAPIFY_API_KEY;
 t.after(()=>{if(original===undefined) delete process.env.GEOAPIFY_API_KEY;else process.env.GEOAPIFY_API_KEY=original;});
 delete process.env.GEOAPIFY_API_KEY;
 await assert.rejects(roadQuote({lat:23.83,lng:90.41},{lat:23.84,lng:90.41},'Car'),{status:503});
 process.env.GEOAPIFY_API_KEY='secret';
 const fetch=t.mock.method(globalThis,'fetch',async()=>({ok:false}));
 await assert.rejects(roadQuote({lat:23.83,lng:90.41},{lat:23.84,lng:90.41},'Car'),e=>e.status===503&&!e.message.includes('secret'));
 fetch.mock.mockImplementation(async()=>({ok:true,json:async()=>({features:[]})}));
 await assert.rejects(roadQuote({lat:23.83,lng:90.41},{lat:23.84,lng:90.41},'Car'),{status:422});
 fetch.mock.mockImplementation(async()=>({ok:true,json:async()=>({features:[{properties:{distance:2000,time:480},geometry:{type:'MultiLineString',coordinates:[[[NaN,23.83],[90.41,23.84]]]}}]})}));
 await assert.rejects(roadQuote({lat:23.83,lng:90.41},{lat:23.84,lng:90.41},'Car'),{status:502});
});
test('API requires a session, validates searches, and rejects changed/missing fare before assignment', async t => {
 mockRoadProvider(t);
 t.mock.method(Ride,'findOne',()=>({lean:async()=>null}));
 const app=express(); app.use(express.json(),(req,res,next)=>{
  if(req.get('X-Test-User')) {req.user={_id:'111111111111111111111111'};req.session={csrfToken:'test'};} next();
 }); app.use(transport); app.use((e,req,res,next)=>res.status(e.status||400).json({error:e.message}));
 await request(app).get('/places?q=Dhaka').expect(401);
 await request(app).get('/places?q=x').set('X-Test-User','yes').expect(400);
 await request(app).get('/places?q=Dh').set('X-Test-User','yes').expect(200);
 await request(app).post('/estimate').set('X-Test-User','yes').set('X-CSRF-Token','test').send({pickup:{lat:23.835,lng:90.415,address:'Pickup point'},dropoff:{lat:23.845,lng:90.415,address:'Dropoff point'},vehicleType:'Rickshaw'}).expect(400);
 const body={pickup:{lat:23.835,lng:90.415,address:'Pickup point'},dropoff:{lat:23.845,lng:90.415,address:'Dropoff point'},vehicleType:'Car',requestKey:crypto.randomUUID()};
 for(const quotedFare of [undefined,1]) {
  const response=await request(app).post('/rides').set('X-Test-User','yes').set('X-CSRF-Token','test').send({...body,quotedFare});
  assert.equal(response.status,409);
 }
});
