// Mock the AI service client so analysis is deterministic and offline.
jest.mock('../src/services/aiClient', () => ({
  analyzePaper: jest.fn(),
  chat: jest.fn(),
}));

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../src/app');
const aiClient = require('../src/services/aiClient');

const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj\n<< >>\nendobj\ntrailer\n<< >>\n%%EOF');

async function registerAndLogin() {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Paper Owner',
    email: 'owner@example.com',
    password: 'password123',
  });
  return res.body.token;
}

describe('Papers API', () => {
  let token;

  beforeEach(async () => {
    token = await registerAndLogin();
    aiClient.analyzePaper.mockReset();
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/api/papers');
    expect(res.status).toBe(401);
  });

  test('uploads a valid PDF', async () => {
    const res = await request(app)
      .post('/api/papers/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PDF_BYTES, 'sample.pdf');

    expect(res.status).toBe(201);
    expect(res.body.paper.title).toBe('sample');
    expect(res.body.paper.status).toBe('uploaded');

    // cleanup the file written to /uploads
    if (res.body.paper.filePath && fs.existsSync(res.body.paper.filePath)) {
      fs.unlinkSync(res.body.paper.filePath);
    }
  });

  test('rejects a non-PDF disguised with a .pdf name', async () => {
    const res = await request(app)
      .post('/api/papers/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('totally not a pdf'), {
        filename: 'fake.pdf',
        contentType: 'application/pdf',
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not a valid pdf/i);
  });

  test('analyze stores a structured summary returned by the AI service', async () => {
    aiClient.analyzePaper.mockResolvedValue({
      sections: { abstract: 'A short summary.' },
      keywords: [{ word: 'learning', frequency: 5, importance: 1 }],
      topics: [{ topic: 'deep learning', confidence: 0.8 }],
      researchGaps: [{ gap: 'Needs more data', reasoning: 'small set', priority: 'high' }],
      researchQuestions: [{ question: 'How to scale?', category: 'methodology' }],
      relatedWorkSuggestions: [{ title: 'Survey X', authors: ['A. B.'], reason: 'related' }],
      processingTime: 1.2,
      aiModel: 'test-model',
    });

    const upload = await request(app)
      .post('/api/papers/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PDF_BYTES, 'paper.pdf');
    const paperId = upload.body.paper._id;

    const res = await request(app)
      .post(`/api/papers/${paperId}/analyze`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(aiClient.analyzePaper).toHaveBeenCalledTimes(1);
    expect(res.body.summary.relatedWorkSuggestions[0].title).toBe('Survey X');

    const view = await request(app)
      .get(`/api/papers/${paperId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(view.body.paper.status).toBe('analyzed');
    expect(view.body.paper.summary).not.toBeNull();

    const fp = upload.body.paper.filePath;
    if (fp && fs.existsSync(fp)) fs.unlinkSync(fp);
  });

  test('a user cannot read another user\'s paper', async () => {
    const upload = await request(app)
      .post('/api/papers/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PDF_BYTES, 'mine.pdf');
    const paperId = upload.body.paper._id;

    const otherToken = (
      await request(app).post('/api/auth/register').send({
        name: 'Other',
        email: 'other@example.com',
        password: 'password123',
      })
    ).body.token;

    const res = await request(app)
      .get(`/api/papers/${paperId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);

    const fp = upload.body.paper.filePath;
    if (fp && fs.existsSync(fp)) fs.unlinkSync(fp);
  });
});
