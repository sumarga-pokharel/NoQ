import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.JWT_SECRET = 'integration-test-secret-that-is-long-enough';
process.env.SMTP_HOST = '';
process.env.SMTP_FROM = '';
process.env.TWILIO_ACCOUNT_SID = '';

let mongo;
let app;

before(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri('noq-e2e');
  await mongoose.connect(process.env.MONGO_URI);
  ({ default: app } = await import('../app.js'));
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('NoQ end-to-end API integration', () => {
  let token;
  let replacementToken;
  let provider;
  let service;
  let counter;
  let ticket;

  test('returns structured validation errors', async () => {
    const response = await request(app).post('/api/auth/signup').send({ email: '' }).expect(400);
    assert.equal(response.body.errors.officeName, 'Office name is required');
    assert.equal(response.body.errors.email, 'Email is required');
    assert.equal(response.body.errors.password, 'Password is required');
  });

  test('creates an office account and publishes its setup', async () => {
    const signup = await request(app).post('/api/auth/signup').send({
      officeName: 'Integration Ward Office',
      sector: 'government',
      email: 'integration@example.com',
      phone: '+977 9800000000',
      password: 'InitialPass123!',
    }).expect(201);
    token = signup.body.token;
    provider = signup.body.provider;

    const setup = await request(app).put('/api/provider/setup').set('Authorization', `Bearer ${token}`).send({
      sector: 'government',
      services: [{ name: 'Permit renewal', minutes: 6, prefix: 'P' }],
      requiredDocuments: [{ name: 'Citizenship card', required: true }],
    }).expect(200);
    service = setup.body.services[0];
    assert.equal(setup.body.provider.onboardingComplete, true);
    assert.equal(service.name, 'Permit renewal');
  });

  test('creates a counter and exposes the public office', async () => {
    const created = await request(app).post('/api/counters').set('Authorization', `Bearer ${token}`).send({
      name: 'Counter 1',
      compatibleServices: [service._id],
    }).expect(201);
    counter = created.body.counter;

    const publicOffice = await request(app).get(`/api/public/offices/${provider.slug}`).expect(200);
    assert.equal(publicOffice.body.services.length, 1);
    assert.equal(publicOffice.body.office.requiredDocuments[0].name, 'Citizenship card');
  });

  test('joins, calls, serves, and completes a visitor ticket', async () => {
    const joined = await request(app).post(`/api/public/offices/${provider.slug}/tickets`).send({
      serviceId: service._id,
      priority: true,
      documents: [{ name: 'Citizenship card', confirmed: true }],
      notifyBrowser: false,
      notifySms: false,
    }).expect(201);
    ticket = joined.body.ticket;
    assert.equal(joined.body.position.ahead, 0);

    const called = await request(app).post(`/api/counters/${counter._id}/call-next`).set('Authorization', `Bearer ${token}`).expect(200);
    assert.equal(called.body.ticket.status, 'called');
    assert.equal(called.body.ticket._id, ticket._id);

    const arrived = await request(app).post(`/api/counters/${counter._id}/arrived`).set('Authorization', `Bearer ${token}`).expect(200);
    assert.equal(arrived.body.ticket.status, 'serving');

    const publicStatus = await request(app).get(`/api/public/tickets/${ticket._id}`).expect(200);
    assert.deepEqual(publicStatus.body.nowServing, [ticket.token]);

    const completed = await request(app).post(`/api/counters/${counter._id}/complete`).set('Authorization', `Bearer ${token}`).expect(200);
    assert.equal(completed.body.ticket.status, 'done');

    const dashboard = await request(app).get('/api/tickets/dashboard').set('Authorization', `Bearer ${token}`).expect(200);
    assert.equal(dashboard.body.waitingCount, 0);
    assert.equal(dashboard.body.servedToday, 1);
  });

  test('changes a password and invalidates the previous session', async () => {
    const changed = await request(app).patch('/api/auth/change-password').set('Authorization', `Bearer ${token}`).send({
      currentPassword: 'InitialPass123!',
      newPassword: 'ChangedPass123!',
    }).expect(200);
    replacementToken = changed.body.token;
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${replacementToken}`).expect(200);
  });

  test('resets a password once and invalidates all earlier sessions', async () => {
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: 'integration@example.com' }).expect(200);
    assert.ok(forgot.body.resetUrl, 'test mode should return a development reset URL');
    const resetToken = new URL(forgot.body.resetUrl).pathname.split('/').pop();

    await request(app).post(`/api/auth/reset-password/${resetToken}`).send({ password: 'ResetPass123!' }).expect(200);
    await request(app).post(`/api/auth/reset-password/${resetToken}`).send({ password: 'AnotherPass123!' }).expect(400);
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${replacementToken}`).expect(401);

    const login = await request(app).post('/api/auth/login').send({
      email: 'integration@example.com',
      password: 'ResetPass123!',
    }).expect(200);
    assert.equal(login.body.provider.id, provider.id);
  });
});
