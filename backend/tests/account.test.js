const request = require('supertest');
const app = require('../src/app');

async function getToken(email = 'acct@example.com') {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Account User',
    email,
    password: 'password123',
  });
  return res.body.token;
}

describe('Account / profile API', () => {
  let token;
  beforeEach(async () => {
    token = await getToken();
  });

  test('updates profile fields and clears phoneVerified on phone change', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated Name',
        phone: '+919876543210',
        profile: { institution: 'IIT Mandi', researchDomain: 'NLP', bio: 'Researcher' },
      });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Updated Name');
    expect(res.body.user.phone).toBe('+919876543210');
    expect(res.body.user.phoneVerified).toBe(false);
    expect(res.body.user.profile.institution).toBe('IIT Mandi');
  });

  test('rejects an invalid phone number', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: 'not-a-number' });
    expect(res.status).toBe(400);
  });

  test('verifies a new email via OTP (dev mode returns the code)', async () => {
    const reqOtp = await request(app)
      .post('/api/auth/otp/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ channel: 'email', target: 'verified@example.com' });
    expect(reqOtp.status).toBe(200);
    expect(reqOtp.body.delivery).toBe('dev');
    expect(reqOtp.body.devCode).toMatch(/^\d{6}$/);

    const verify = await request(app)
      .post('/api/auth/otp/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ channel: 'email', code: reqOtp.body.devCode });
    expect(verify.status).toBe(200);
    expect(verify.body.user.email).toBe('verified@example.com');
    expect(verify.body.user.emailVerified).toBe(true);
  });

  test('rejects an incorrect OTP code', async () => {
    await request(app)
      .post('/api/auth/otp/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ channel: 'phone', target: '+919876500000' });

    const verify = await request(app)
      .post('/api/auth/otp/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ channel: 'phone', code: '000000' });
    expect(verify.status).toBe(400);
  });

  test('blocks verifying an email already used by another account', async () => {
    await getToken('taken@example.com'); // second user owns this email
    const res = await request(app)
      .post('/api/auth/otp/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ channel: 'email', target: 'taken@example.com' });
    expect(res.status).toBe(409);
  });

  test('profile routes require authentication', async () => {
    const res = await request(app).put('/api/auth/profile').send({ name: 'x' });
    expect(res.status).toBe(401);
  });
});
