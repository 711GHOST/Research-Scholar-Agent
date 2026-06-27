// Mock the AI client so chat is deterministic and offline.
jest.mock('../src/services/aiClient', () => ({
  analyzePaper: jest.fn(),
  chat: jest.fn().mockResolvedValue({ response: 'Here is a summary.' }),
}));

const request = require('supertest');
const app = require('../src/app');
const aiClient = require('../src/services/aiClient');

async function getToken() {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Chat User',
    email: 'chat@example.com',
    password: 'password123',
  });
  return res.body.token;
}

describe('Chat API', () => {
  let token;
  beforeEach(async () => {
    token = await getToken();
    aiClient.chat.mockClear();
  });

  test('requires authentication', async () => {
    const res = await request(app).post('/api/chat').send({ message: 'hi' });
    expect(res.status).toBe(401);
  });

  test('accepts a first message with sessionId: null (regression)', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Summarize my latest paper', sessionId: null });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.sessionId).toBeTruthy();
    expect(res.body.message).toBe('Here is a summary.');
  });

  test('continues an existing session', async () => {
    const first = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'first', sessionId: null });
    const sessionId = first.body.sessionId;

    const second = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'second', sessionId });

    expect(second.status).toBe(200);
    expect(second.body.sessionId).toBe(sessionId);
    // user+assistant from both turns
    expect(second.body.messages.length).toBe(4);
  });

  test('rejects a missing message', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId: null });
    expect(res.status).toBe(400);
  });

  test('rejects a non-string sessionId', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'hi', sessionId: 12345 });
    expect(res.status).toBe(400);
  });
});
