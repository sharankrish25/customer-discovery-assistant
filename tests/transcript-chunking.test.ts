import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chunkTranscript, validateTranscript } from '../lib/transcript-chunking';

describe('chunkTranscript', () => {
  it('chunks on paragraph boundaries without exceeding limit', () => {
    const text = [
      'Paragraph one with enough content.',
      'Paragraph two continues the story.',
      'Paragraph three wraps it up.',
    ].join('\n\n');

    const chunks = chunkTranscript(text, 80);

    assert.equal(chunks.length, 2);
    assert.ok(chunks[0].includes('Paragraph one'));
    assert.ok(chunks[0].includes('Paragraph two'));
    assert.ok(chunks[1].includes('Paragraph three'));
    chunks.forEach((chunk) => {
      assert.ok(chunk.length <= 80);
    });
  });

  it('hard wraps single paragraphs that exceed the chunk size', () => {
    const longParagraph = Array.from({ length: 12 }, (_, i) => `word${i}`).join(' ');
    const chunks = chunkTranscript(longParagraph, 20);

    assert.equal(chunks.length > 1, true);
    chunks.forEach((chunk) => {
      assert.ok(chunk.length <= 20);
    });
  });
});

describe('validateTranscript', () => {
  it('rejects empty transcripts', () => {
    const emptyResult = validateTranscript('');
    assert.equal(emptyResult.valid, false);
    assert.equal(emptyResult.error, 'Transcript is empty. No transcript = no output.');
  });

  it('rejects transcripts over the max length', () => {
    const result = validateTranscript('x'.repeat(10), 5);
    assert.equal(result.valid, false);
    assert.match(result.error ?? '', /exceeds maximum length/i);
  });

  it('sanitizes whitespace and returns the cleaned transcript', () => {
    const input = 'Line one\r\nLine two with\ttab';
    const result = validateTranscript(input);

    assert.equal(result.valid, true);
    assert.equal(result.sanitized, 'Line one\nLine two with  tab');
  });
});
