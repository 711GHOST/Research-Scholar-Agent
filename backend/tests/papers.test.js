// Mock the AI service client so analysis is deterministic and offline.
jest.mock('../src/services/aiClient', () => ({
  analyzePaper: jest.fn(),
  chat: jest.fn(),
}));

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

  test('uploads a valid PDF into GridFS', async () => {
    const res = await request(app)
      .post('/api/papers/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PDF_BYTES, 'sample.pdf');

    expect(res.status).toBe(201);
    expect(res.body.paper.title).toBe('sample');
    expect(res.body.paper.status).toBe('uploaded');
    // Stored in GridFS, not on disk
    expect(res.body.paper.fileId).toBeTruthy();
    expect(res.body.paper.filePath).toBeUndefined();
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
    // The PDF was read back out of GridFS and sent to the AI service.
    expect(aiClient.analyzePaper).toHaveBeenCalledTimes(1);
    const sentContent = aiClient.analyzePaper.mock.calls[0][0].fileContent;
    expect(Buffer.from(sentContent, 'base64').equals(PDF_BYTES)).toBe(true);
    expect(res.body.summary.relatedWorkSuggestions[0].title).toBe('Survey X');

    const view = await request(app)
      .get(`/api/papers/${paperId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(view.body.paper.status).toBe('analyzed');
    expect(view.body.paper.summary).not.toBeNull();
  });

  test('delete removes the paper (and its GridFS file)', async () => {
    const upload = await request(app)
      .post('/api/papers/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PDF_BYTES, 'gone.pdf');
    const paperId = upload.body.paper._id;

    const del = await request(app)
      .delete(`/api/papers/${paperId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const view = await request(app)
      .get(`/api/papers/${paperId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(view.status).toBe(404);
  });

  test("a user cannot read another user's paper", async () => {
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
  });
});
