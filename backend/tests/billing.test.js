const request = require('supertest');
const app = require('../src/app');

async function getToken() {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Billing User',
    email: 'billing@example.com',
    password: 'password123',
  });
  return res.body.token;
}

describe('Billing / subscription API (mock mode)', () => {
  let token;
  beforeEach(async () => {
    token = await getToken();
  });

  test('lists plans and reports mock payment mode', async () => {
    const res = await request(app)
      .get('/api/billing/plans')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.plans.map((p) => p.id)).toEqual(
      expect.arrayContaining(['free', 'pro', 'team'])
    );
    expect(res.body.paymentsConfigured).toBe(false);
    expect(res.body.subscription.plan).toBe('free');
  });

  test('checkout creates a mock order for a paid plan', async () => {
    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'pro' });
    expect(res.status).toBe(200);
    expect(res.body.mock).toBe(true);
    expect(res.body.orderId).toMatch(/^mock_order_/);
    expect(res.body.amount).toBe(49900);
  });

  test('rejects checkout for the free plan', async () => {
    const res = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'free' });
    expect(res.status).toBe(400);
  });

  test('verifies a mock payment and activates the subscription', async () => {
    const order = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'pro' });

    const res = await request(app)
      .post('/api/billing/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'pro', orderId: order.body.orderId, paymentId: 'mock_pay_1' });

    expect(res.status).toBe(200);
    expect(res.body.user.subscription.plan).toBe('pro');
    expect(res.body.user.subscription.status).toBe('active');
    expect(new Date(res.body.user.subscription.currentPeriodEnd).getTime()).toBeGreaterThan(Date.now());
  });

  test('rejects verification with an invalid order id', async () => {
    const res = await request(app)
      .post('/api/billing/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'pro', orderId: 'not_a_mock_order', paymentId: 'x' });
    expect(res.status).toBe(400);
  });

  test('cancel downgrades back to free', async () => {
    const order = await request(app)
      .post('/api/billing/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'pro' });
    await request(app)
      .post('/api/billing/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'pro', orderId: order.body.orderId, paymentId: 'mock_pay_1' });

    const res = await request(app)
      .post('/api/billing/cancel')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.subscription.plan).toBe('free');
  });

  test('billing routes require authentication', async () => {
    const res = await request(app).get('/api/billing/plans');
    expect(res.status).toBe(401);
  });
});
