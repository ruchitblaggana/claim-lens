/*
 * ClaimLens unit tests — run with: node --test extension/test/util.test.js
 * Pure logic only; no browser APIs required.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as U from '../util.js';

test('createClaim rejects empty text', () => {
  assert.throws(() => U.createClaim({ claim_text: '   ' }), /EMPTY_CLAIM/);
  assert.throws(() => U.createClaim({}), /EMPTY_CLAIM/);
});

test('createClaim preserves original text exactly', () => {
  const raw = '  Coffee\n\nreduces   mortality\tby 12%.  ';
  const c = U.createClaim({ claim_text: raw });
  assert.equal(c.claim_text, raw.trim());
  assert.notEqual(c.claim_text, U.normalizeText(raw));
});

test('createClaim generates unique ids', () => {
  const a = U.createClaim({ claim_text: 'one' });
  const b = U.createClaim({ claim_text: 'one' });
  assert.notEqual(a.id, b.id);
  assert.ok(a.id.length > 8);
});

test('createClaim sets default fields', () => {
  const c = U.createClaim({ claim_text: 'x', source_url: 'https://ex.com/a' });
  assert.equal(c.status, 'unreviewed');
  assert.equal(c.importance, 'normal');
  assert.deepEqual(c.tags, []);
  assert.equal(c.capture_method, 'toolbar');
  assert.ok(c.captured_at);
  assert.ok(c.updated_at);
});

test('normalizeText collapses whitespace without altering words', () => {
  assert.equal(U.normalizeText('  a\n b\t c '), 'a b c');
  assert.equal(U.normalizeText(''), '');
  assert.equal(U.normalizeText(null), '');
});

test('isDuplicateClaim matches same text + url', () => {
  const a = { claim_text: '  Claim ', source_url: 'https://ex.com/a?utm_source=x' };
  const b = { claim_text: 'Claim', source_url: 'https://ex.com/a' };
  assert.ok(U.isDuplicateClaim(a, b));
  const c = { claim_text: 'Other', source_url: 'https://ex.com/a' };
  assert.ok(!U.isDuplicateClaim(a, c));
});

test('normalizeUrl removes tracking params and fragment but keeps article ids', () => {
  assert.equal(
    U.normalizeUrl('https://ex.com/a?utm_source=news&fbclid=abc#section'),
    'https://ex.com/a',
  );
  assert.equal(
    U.normalizeUrl('https://ex.com/article?id=42&utm_campaign=promo'),
    'https://ex.com/article?id=42',
  );
  assert.equal(U.normalizeUrl('https://ex.com/a/'), 'https://ex.com/a');
  assert.equal(U.normalizeUrl('https://ex.com'), 'https://ex.com/');
  assert.equal(U.normalizeUrl('not a url'), 'not a url');
});

test('hostnameOf strips www', () => {
  assert.equal(U.hostnameOf('https://www.example.com/x'), 'example.com');
  assert.equal(U.hostnameOf('garbage'), '');
});

test('escapeHtml escapes untrusted input', () => {
  assert.equal(
    U.escapeHtml('<script>alert("x")</script>'),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
  );
  assert.equal(U.escapeHtml(undefined), '');
});

test('createEvidence requires title and claim id', () => {
  assert.throws(() => U.createEvidence('', { title: 't' }), /MISSING_CLAIM/);
  assert.throws(() => U.createEvidence('cid', {}), /EMPTY_EVIDENCE_TITLE/);
  const e = U.createEvidence('cid', { title: 'Source', relationship: 'supports' });
  assert.equal(e.claim_id, 'cid');
  assert.equal(e.relationship, 'supports');
  assert.equal(e.source_type, 'webpage');
  assert.deepEqual(e.assessment, U.emptyAssessment());
});

test('createInvestigation requires title', () => {
  assert.throws(() => U.createInvestigation({}), /EMPTY_INVESTIGATION_TITLE/);
  const inv = U.createInvestigation({ title: 'Climate claims' });
  assert.deepEqual(inv.claim_ids, []);
  assert.equal(inv.archived, false);
});

test('createNote requires body and validates kind', () => {
  assert.throws(() => U.createNote({}), /EMPTY_NOTE/);
  const n = U.createNote({ body: 'follow up', kind: 'follow_up', claim_id: 'c1' });
  assert.equal(n.kind, 'follow_up');
  assert.equal(n.claim_id, 'c1');
});

test('createPageAssociation requires url and claim id', () => {
  assert.throws(() => U.createPageAssociation('', 'x'), /MISSING_ASSOCIATION_INPUT/);
  assert.throws(() => U.createPageAssociation('u', ''), /MISSING_ASSOCIATION_INPUT/);
});

test('emptyAssessment sets all criteria to unknown', () => {
  const a = U.emptyAssessment();
  U.ASSESSMENT_CRITERIA.forEach((k) => assert.equal(a[k], 'unknown'));
  assert.equal(Object.keys(a).length, U.ASSESSMENT_CRITERIA.length);
});

test('validateImport rejects non-ClaimLens payloads', () => {
  const r = U.validateImport({ claims: [] });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('claimlens')));
});

test('validateImport rejects malformed records', () => {
  const r = U.validateImport({
    app: 'claimlens',
    claims: [{ claim_text: '' }],
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.length > 0);
});

test('validateImport accepts a valid backup and re-ids missing ids', () => {
  const r = U.validateImport({
    app: 'claimlens',
    claims: [{ claim_text: 'A claim', id: 'keep-me' }],
    evidence: [{ title: 'E', claim_id: 'keep-me' }],
    investigations: [{ title: 'Inv' }],
    notes: [{ body: 'note' }],
    associations: [{ normalized_url: 'https://x.com', claim_id: 'keep-me' }],
  });
  assert.equal(r.ok, true);
  assert.equal(r.records.claims[0].id, 'keep-me');
  assert.ok(r.records.evidence[0].id);
  assert.ok(r.records.investigations[0].id);
});

test('searchClaims matches across claims, evidence, notes, investigations', () => {
  const claims = [
    U.createClaim({ claim_text: 'Coffee extends life' }),
    U.createClaim({ claim_text: 'Sun is a star' }),
  ];
  const evidence = [
    U.createEvidence(claims[0].id, { title: 'Lancet study', relationship: 'supports' }),
  ];
  const notes = [U.createNote({ body: 'remember this Lancet finding', claim_id: claims[0].id })];
  const invs = [
    U.createInvestigation({ title: 'Lancet review', claim_ids: [claims[1].id] }),
  ];
  const hit = U.searchClaims('lancet', claims, evidence, invs, notes);
  assert.ok(hit.includes(claims[0].id));
  assert.ok(hit.includes(claims[1].id));
  const none = U.searchClaims('zzzznope', claims, evidence, invs, notes);
  assert.deepEqual(none, []);
  const all = U.searchClaims('', claims, evidence, invs, notes);
  assert.equal(all.length, claims.length);
});

test('filterSortClaims filters by status and sorts', () => {
  const old = U.createClaim({ claim_text: 'old' });
  old.captured_at = '2020-01-01T00:00:00Z';
  const newC = U.createClaim({ claim_text: 'new', status: 'investigating' });
  newC.captured_at = '2024-01-01T00:00:00Z';
  const list = [old, newC];
  const filtered = U.filterSortClaims(list, { status: 'investigating' });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, newC.id);
  const desc = U.filterSortClaims(list, { sort: 'captured_desc' });
  assert.equal(desc[0].id, newC.id);
  const asc = U.filterSortClaims(list, { sort: 'captured_asc' });
  assert.equal(asc[0].id, old.id);
});

test('filterSortClaims filters by tag', () => {
  const a = U.createClaim({ claim_text: 'a', tags: ['climate'] });
  const b = U.createClaim({ claim_text: 'b', tags: ['health'] });
  const out = U.filterSortClaims([a, b], { tag: 'climate' });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, a.id);
});

test('evidenceSummary counts relationships', () => {
  const ev = [
    { relationship: 'supports' },
    { relationship: 'supports' },
    { relationship: 'contradicts' },
    { relationship: 'context' },
  ];
  assert.deepEqual(U.evidenceSummary(ev), {
    supports: 2,
    contradicts: 1,
    context: 1,
    challenges: 0,
    unclear: 0,
  });
});

test('buildExport includes app marker and timestamp', () => {
  const ex = U.buildExport({ claims: [] });
  assert.equal(ex.app, 'claimlens');
  assert.ok(ex.exported_at);
  assert.equal(ex.schema_version, U.SCHEMA_VERSION);
});

test('formatDate and formatDateTime handle bad input', () => {
  assert.equal(U.formatDate(''), '');
  assert.equal(U.formatDate('not-a-date'), '');
  assert.ok(U.formatDate('2024-01-01T00:00:00Z'));
  assert.ok(U.formatDateTime('2024-01-01T00:00:00Z'));
});

test('previewText truncates cleanly', () => {
  assert.equal(U.previewText('short'), 'short');
  const long = 'a'.repeat(200);
  const p = U.previewText(long, 20);
  assert.ok(p.endsWith('…'));
  assert.ok(p.length <= 20);
});

test('daysBetween computes whole days', () => {
  assert.equal(
    U.daysBetween('2024-01-03T00:00:00Z', '2024-01-01T00:00:00Z'),
    2,
  );
});
