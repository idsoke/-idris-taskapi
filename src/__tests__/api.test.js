const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');

afterAll(async () => {
  await pool.end();
});

describe('GET /health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('POST /auth/register', () => {
  it('registers a new user and returns token', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: `test_${Date.now()}@example.com`, password: 'password123' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email');
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'nopassword@example.com' });

    expect(res.statusCode).toBe(400);
  });

  it('returns 409 on duplicate email', async () => {
    const email = `dup_${Date.now()}@example.com`;
    await request(app).post('/auth/register').send({ email, password: 'pass123' });

    const res = await request(app)
      .post('/auth/register')
      .send({ email, password: 'pass123' });

    expect(res.statusCode).toBe(409);
  });
});

describe('POST /auth/login', () => {
  it('returns token with correct credentials', async () => {
    const email = `login_${Date.now()}@example.com`;
    await request(app).post('/auth/register').send({ email, password: 'mypassword' });

    const res = await request(app)
      .post('/auth/login')
      .send({ email, password: 'mypassword' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('returns 401 on wrong password', async () => {
    const email = `wrong_${Date.now()}@example.com`;
    await request(app).post('/auth/register').send({ email, password: 'correct' });

    const res = await request(app)
      .post('/auth/login')
      .send({ email, password: 'wrongpassword' });

    expect(res.statusCode).toBe(401);
  });
});
