/**
 * File store (GridFS)
 * Stores paper PDFs inside MongoDB via GridFS instead of the local filesystem,
 * so files survive redeploys/restarts on ephemeral hosts (Render free tier,
 * etc.) with no disk or third-party object storage required.
 */

const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');

const BUCKET = 'pdfs';

function bucket() {
  if (!mongoose.connection?.db) {
    throw new Error('Database connection is not ready');
  }
  return new GridFSBucket(mongoose.connection.db, { bucketName: BUCKET });
}

/** Store a PDF buffer and resolve with its GridFS file id. */
function storePdf(buffer, filename) {
  return new Promise((resolve, reject) => {
    const stream = bucket().openUploadStream(filename || 'paper.pdf', {
      contentType: 'application/pdf',
    });
    stream.on('error', reject);
    stream.on('finish', () => resolve(stream.id));
    stream.end(buffer);
  });
}

/** Load a stored PDF back into a Buffer. */
function getPdf(fileId) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = bucket().openDownloadStream(new ObjectId(fileId));
    stream.on('data', (c) => chunks.push(c));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/** Delete a stored PDF (best-effort). */
async function deletePdf(fileId) {
  try {
    await bucket().delete(new ObjectId(fileId));
  } catch (e) {
    // Missing file is fine; log anything else.
    if (!/FileNotFound/i.test(e.message || '')) {
      console.warn('deletePdf failed:', e.message);
    }
  }
}

module.exports = { storePdf, getPdf, deletePdf };
