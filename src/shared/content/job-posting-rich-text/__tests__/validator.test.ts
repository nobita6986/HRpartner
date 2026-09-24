/**
 * Unit tests for the JobPosting rich-text validator.
 *
 * Covers AC-03/04/05 (OD-P1A-01..03) — fail-closed on:
 *   - unsupported nodes/marks
 *   - oversize / over-node / over-depth payloads
 *   - unsafe link URLs (javascript:, data:, file:, protocol-relative, http://)
 *   - unknown contentSchemaVersion
 *
 * Pure (no DB). Runs in the unit lane.
 */

import { describe, it, expect } from 'vitest';
import {
  validateRichText,
  validateRichTextField,
  validateSchemaVersion,
  isValidationFailure,
  JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
} from '@/src/shared/content/job-posting-rich-text';

function doc(...children: unknown[]): unknown {
  return { type: 'doc', content: children };
}

describe('job-posting-rich-text/validator — schema version', () => {
  it('accepts schemaVersion=1', () => {
    const r = validateSchemaVersion(JOB_POSTING_RICH_TEXT_SCHEMA_VERSION);
    expect(r.ok).toBe(true);
  });

  it('rejects unknown schemaVersion', () => {
    const r = validateSchemaVersion(2);
    expect(isValidationFailure(r)).toBe(true);
    if (isValidationFailure(r)) {
      expect(r.code).toBe('SCHEMA_VERSION_MISMATCH');
    }
  });

  it('rejects missing schemaVersion', () => {
    const r = validateRichText(null, doc({ type: 'paragraph' }));
    expect(isValidationFailure(r)).toBe(true);
    if (isValidationFailure(r)) {
      expect(r.code).toBe('SCHEMA_VERSION_MISMATCH');
    }
  });
});

describe('job-posting-rich-text/validator — node allowlist', () => {
  it('accepts the canonical doc with paragraph+text', () => {
    const r = validateRichTextField(doc({ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }));
    expect(r.ok).toBe(true);
  });

  it('rejects image node', () => {
    const payload = doc({
      type: 'paragraph',
      content: [{ type: 'image', attrs: { src: 'https://x.test/y.png' } }],
    });
    const r = validateRichTextField(payload);
    expect(isValidationFailure(r)).toBe(true);
    if (isValidationFailure(r)) expect(r.code).toBe('UNSUPPORTED_NODE');
  });

  it('rejects iframe node', () => {
    const payload = doc({ type: 'paragraph', content: [{ type: 'iframe', attrs: { src: 'https://x.test' } }] });
    const r = validateRichTextField(payload);
    expect(isValidationFailure(r)).toBe(true);
  });

  it('rejects video node', () => {
    const payload = doc({ type: 'paragraph', content: [{ type: 'video' }] });
    const r = validateRichTextField(payload);
    expect(isValidationFailure(r)).toBe(true);
  });

  it('rejects code/codeBlock nodes', () => {
    expect(isValidationFailure(validateRichTextField(doc({ type: 'paragraph', content: [{ type: 'code' }] })))).toBe(true);
    expect(isValidationFailure(validateRichTextField(doc({ type: 'paragraph', content: [{ type: 'codeBlock' }] })))).toBe(true);
  });

  it('rejects blockquote/strike/underline nodes', () => {
    for (const banned of ['blockquote', 'strike', 'underline']) {
      const payload = doc({ type: 'paragraph', content: [{ type: banned }] });
      expect(isValidationFailure(validateRichTextField(payload))).toBe(true);
    }
  });

  it('rejects heading with disallowed level', () => {
    const payload = doc({
      type: 'heading',
      attrs: { level: 4 },
      content: [{ type: 'text', text: 'H4' }],
    });
    const r = validateRichTextField(payload);
    expect(isValidationFailure(r)).toBe(true);
    if (isValidationFailure(r)) expect(r.code).toBe('INVALID_HEADING_LEVEL');
  });

  it('accepts heading level 2 and 3', () => {
    for (const level of [2, 3]) {
      const payload = doc({ type: 'heading', attrs: { level }, content: [{ type: 'text', text: 'x' }] });
      expect(validateRichTextField(payload).ok).toBe(true);
    }
  });
});

describe('job-posting-rich-text/validator — mark allowlist', () => {
  it('accepts bold/italic/link marks on text nodes', () => {
    const payload = doc({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'a', marks: [{ type: 'bold' }] },
        { type: 'text', text: 'b', marks: [{ type: 'italic' }] },
        { type: 'text', text: 'c', marks: [{ type: 'link', attrs: { href: 'https://hrp.vn' } }] },
      ],
    });
    expect(validateRichTextField(payload).ok).toBe(true);
  });

  it('rejects code mark', () => {
    const payload = doc({
      type: 'paragraph',
      content: [{ type: 'text', text: 'x', marks: [{ type: 'code' }] }],
    });
    const r = validateRichTextField(payload);
    expect(isValidationFailure(r)).toBe(true);
    if (isValidationFailure(r)) expect(r.code).toBe('UNSUPPORTED_MARK');
  });

  it('rejects strike mark', () => {
    const payload = doc({
      type: 'paragraph',
      content: [{ type: 'text', text: 'x', marks: [{ type: 'strike' }] }],
    });
    expect(isValidationFailure(validateRichTextField(payload))).toBe(true);
  });
});

describe('job-posting-rich-text/validator — link URL policy', () => {
  function withLink(href: string): unknown {
    return doc({
      type: 'paragraph',
      content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href } }] }],
    });
  }

  it('accepts https link', () => {
    expect(validateRichTextField(withLink('https://hrp.vn/jobs')).ok).toBe(true);
  });

  it('rejects javascript: scheme', () => {
    const r = validateRichTextField(withLink('javascript:alert(1)'));
    expect(isValidationFailure(r)).toBe(true);
    if (isValidationFailure(r)) expect(r.code).toBe('INVALID_LINK_URL');
  });

  it('rejects data: scheme', () => {
    const r = validateRichTextField(withLink('data:text/html,<script>alert(1)</script>'));
    expect(isValidationFailure(r)).toBe(true);
  });

  it('rejects file: scheme', () => {
    const r = validateRichTextField(withLink('file:///etc/passwd'));
    expect(isValidationFailure(r)).toBe(true);
  });

  it('rejects protocol-relative //', () => {
    const r = validateRichTextField(withLink('//example.com/x'));
    expect(isValidationFailure(r)).toBe(true);
  });

  it('rejects http://', () => {
    const r = validateRichTextField(withLink('http://hrp.vn'));
    expect(isValidationFailure(r)).toBe(true);
  });

  it('rejects link URLs > 2048 bytes', () => {
    const longHref = 'https://hrp.vn/?' + 'a'.repeat(2100);
    const r = validateRichTextField(withLink(longHref));
    expect(isValidationFailure(r)).toBe(true);
    if (isValidationFailure(r)) expect(r.code).toBe('INVALID_LINK_URL');
  });

  it('rejects missing href', () => {
    const payload = doc({
      type: 'paragraph',
      content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: {} }] }],
    });
    const r = validateRichTextField(payload);
    expect(isValidationFailure(r)).toBe(true);
  });
});

describe('job-posting-rich-text/validator — limits', () => {
  it('rejects payload larger than 64 KiB', () => {
    const padding = 'x'.repeat(64 * 1024); // 64 KiB of x
    const payload = doc({ type: 'paragraph', content: [{ type: 'text', text: padding }] });
    const r = validateRichTextField(payload);
    expect(isValidationFailure(r)).toBe(true);
    if (isValidationFailure(r)) expect(r.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('rejects payloads with more than 1000 nodes', () => {
    const children = Array.from({ length: 1000 }, () => ({ type: 'paragraph' as const }));
    const payload = doc(...children, { type: 'paragraph' }); // 1001 paragraphs
    const r = validateRichTextField(payload);
    expect(isValidationFailure(r)).toBe(true);
    if (isValidationFailure(r)) expect(r.code).toBe('TOO_MANY_NODES');
  });

  it('rejects depth greater than 16', () => {
    // Build 17-deep nested bulletList
    let leaf: unknown = { type: 'paragraph' };
    for (let i = 0; i < 17; i += 1) {
      leaf = { type: 'bulletList', content: [leaf] };
    }
    const payload = doc(leaf);
    const r = validateRichTextField(payload);
    expect(isValidationFailure(r)).toBe(true);
    if (isValidationFailure(r)) expect(r.code).toBe('DEPTH_EXCEEDED');
  });
});

describe('job-posting-rich-text/validator — top-level shape', () => {
  it('rejects non-object payload', () => {
    expect(isValidationFailure(validateRichTextField('hello'))).toBe(true);
    expect(isValidationFailure(validateRichTextField(null))).toBe(true);
    expect(isValidationFailure(validateRichTextField(42))).toBe(true);
  });

  it('rejects doc root of wrong type', () => {
    const payload = { type: 'paragraph', content: [] };
    expect(isValidationFailure(validateRichTextField(payload))).toBe(true);
  });
});

describe('job-posting-rich-text/validator — combined version+field', () => {
  it('accepts canonical valid doc with schemaVersion=1', () => {
    const payload = doc({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Xem tại ', marks: [] },
        { type: 'text', text: 'HRP', marks: [{ type: 'bold' }] },
      ],
    });
    const r = validateRichText(1, payload);
    expect(r.ok).toBe(true);
  });

  it('reports schemaVersion mismatch before field errors', () => {
    const r = validateRichText(99, { type: 'paragraph' });
    expect(isValidationFailure(r)).toBe(true);
    if (isValidationFailure(r)) expect(r.code).toBe('SCHEMA_VERSION_MISMATCH');
  });
});
