const {
  escapeRegex,
  isBlockedIp,
  assertSafePublicUrl,
  isPdfBuffer,
} = require('../src/utils/security');

describe('security utils', () => {
  test('escapeRegex neutralizes regex metacharacters', () => {
    expect(escapeRegex('a.*b')).toBe('a\\.\\*b');
    expect(escapeRegex('(evil|.*)+')).toBe('\\(evil\\|\\.\\*\\)\\+');
  });

  test('isBlockedIp flags private / loopback / metadata addresses', () => {
    expect(isBlockedIp('127.0.0.1')).toBe(true);
    expect(isBlockedIp('10.0.0.5')).toBe(true);
    expect(isBlockedIp('192.168.1.1')).toBe(true);
    expect(isBlockedIp('172.16.0.1')).toBe(true);
    expect(isBlockedIp('169.254.169.254')).toBe(true); // cloud metadata
    expect(isBlockedIp('::1')).toBe(true);
    // Public addresses are allowed
    expect(isBlockedIp('8.8.8.8')).toBe(false);
    expect(isBlockedIp('1.1.1.1')).toBe(false);
  });

  test('assertSafePublicUrl rejects SSRF targets', async () => {
    await expect(assertSafePublicUrl('http://127.0.0.1/admin')).rejects.toThrow();
    await expect(assertSafePublicUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow();
    await expect(assertSafePublicUrl('http://localhost:5000')).rejects.toThrow();
    await expect(assertSafePublicUrl('file:///etc/passwd')).rejects.toThrow();
    await expect(assertSafePublicUrl('ftp://example.com/x')).rejects.toThrow();
    await expect(assertSafePublicUrl('http://user:pass@example.com')).rejects.toThrow();
  });

  test('assertSafePublicUrl allows a normal public https URL', async () => {
    await expect(assertSafePublicUrl('https://8.8.8.8/file.pdf')).resolves.toBeDefined();
  });

  test('isPdfBuffer only accepts the %PDF- magic header', () => {
    expect(isPdfBuffer(Buffer.from('%PDF-1.7\n...'))).toBe(true);
    expect(isPdfBuffer(Buffer.from('<html></html>'))).toBe(false);
  });
});
