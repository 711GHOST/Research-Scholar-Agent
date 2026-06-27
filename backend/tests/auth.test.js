const request = require('supertest');
const app = require('../src/app');

const validUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
  role: 'Student',
};

describe('Auth API', () => {
  test('registers a new user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('test@example.com');
    // Password must never be returned
    expect(res.body.user.password).toBeUndefined();
  });

  test('rejects registration with an invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects a short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, password: '123' });
    expect(res.status).toBe(400);
  });

  test('prevents duplicate registrations', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('logs in with correct credentials', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('rejects login with wrong password', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  test('blocks a NoSQL operator injection in the email field', async () => {
    // express-mongo-sanitize strips the "$gt" key, so this cannot match all users
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: 'password123' });
    expect([400, 401]).toContain(res.status);
    expect(res.body.token).toBeUndefined();
  });

  test('GET /api/auth/me requires a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me returns the user with a valid token', async () => {
    const reg = await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validUser.email);
  });
});
