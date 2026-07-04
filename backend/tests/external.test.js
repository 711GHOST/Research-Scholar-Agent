// Mock the PDF downloader (network/SSRF behavior is unit-tested in security.test.js)
// while keeping escapeRegex/isPdfBuffer real for the rest of the app.
jest.mock('../src/utils/security', () => {
  const actual = jest.requireActual('../src/utils/security');
  return { ...actual, downloadPdfSafely: jest.fn() };
});
jest.mock('../src/services/aiClient', () => ({
  analyzePaper: jest.fn().mockResolvedValue({
    sections: {},
    keywords: [],
    topics: [],
    researchGaps: [],
    researchQuestions: [],
    relatedWorkSuggestions: [],
    processingTime: 0,
    aiModel: 'test',
  }),
  chat: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/app');
const security = require('../src/utils/security');

const PDF_BYTES = Buffer.from('%PDF-1.4\nimported paper\n%%EOF');

async function getToken() {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Importer',
    email: 'importer@example.com',
    password: 'password123',
  });
  return res.body.token;
}

describe('External import API', () => {
  let token;

  beforeEach(async () => {
    token = await getToken();
    security.downloadPdfSafely.mockReset();
  });

  test('requires authentication', async () => {
    const res = await request(app).post('/api/external/import').send({ pdfUrl: 'x' });
    expect(res.status).toBe(401);
  });

  test('rejects import without a PDF URL', async () => {
    const res = await request(app)
      .post('/api/external/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'No URL paper' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/url is required/i);
    expect(security.downloadPdfSafely).not.toHaveBeenCalled();
  });

  test('returns a clean 400 when the download is blocked (e.g. SSRF)', async () => {
    security.downloadPdfSafely.mockRejectedValue(new Error('Host resolves to a private address'));
    const res = await request(app)
      .post('/api/external/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Evil', pdfUrl: 'http://10.0.0.1/x.pdf' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/could not import/i);
  });

  test('imports an open-access PDF and creates a paper', async () => {
    security.downloadPdfSafely.mockResolvedValue(PDF_BYTES);
    const res = await request(app)
      .post('/api/external/import')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Great Open Paper',
        authors: ['Ada Lovelace'],
        pdfUrl: 'https://arxiv.org/pdf/1234.5678.pdf',
        year: 2023,
        venue: 'NeurIPS',
        topic: 'machine learning',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.paper.title).toBe('Great Open Paper');
    expect(res.body.paper.topic).toBe('machine learning');
    expect(res.body.paper.fileId).toBeTruthy(); // stored in GridFS
    expect(security.downloadPdfSafely).toHaveBeenCalledWith('https://arxiv.org/pdf/1234.5678.pdf');

    // It should now appear in the user's library
    const list = await request(app)
      .get('/api/papers')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.papers.length).toBe(1);
  });
});
