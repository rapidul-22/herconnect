import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../server/app.js';
import { allowedSignupEmail } from '../shared/signup.js';
process.env.NODE_ENV = 'test';

test('signup exact-domain allowlist rejects lookalikes and unsupported domains before storage', async () => {
  for (const email of ['woman@gmail.com', 'woman@herconnect.local', 'woman@herconnect.demo', ' Woman@GMAIL.COM ']) assert.equal(allowedSignupEmail(email), true);
  for (const email of ['woman@yahoo.com', 'woman@gmail.com.evil.test', 'woman@sub.gmail.com', 'woman@herconnect.demo.evil', 'woman@gmailcom', 'woman@@gmail.com']) {
    assert.equal(allowedSignupEmail(email), false);
    await request(app).post('/api/auth/signup').send({ name: 'Test Woman', email, phone: '01712345678', password: 'LongTestPassword123!' }).expect(400);
  }
});
test('guest access to every module data entry point is blocked; session endpoint remains public', async () => {
  for (const path of ['/products', '/products/111111111111111111111111', '/shops/111111111111111111111111', '/hiring/workers', '/reports', '/reports/111111111111111111111111', '/zones/unsafe', '/resources', '/transport/drivers', '/transport/places?q=Dhaka']) {
    const response = await request(app).get('/api' + path).expect(401);
    assert.equal(response.body.error, 'Please sign in to continue.');
  }
  const response = await request(app).get('/api/auth/me').expect(200);
  assert.equal(response.body.user, null);
});
