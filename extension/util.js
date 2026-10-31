/*
 * ClaimLens shared utilities — pure functions used by every extension page,
 * the service worker, and the unit tests. No browser APIs here so the file
 * can be required directly from Node's test runner.
 */

const STATUS_VALUES = [
  'unreviewed',
  'investigating',
  'mixed',
  'supported',
  'contradicted',
  'inconclusive',
  'archived',
];

const STATUS_LABELS = {
  unreviewed: 'Unreviewed',
  investigating: 'Investigating',
  mixed: 'Mixed evidence',
  supported: 'Supported by recorded evidence',
  contradicted: 'Contradicted by recorded evidence',
  inconclusive: 'Inconclusive',
  archived: 'Archived',
};

const RELATIONSHIP_VALUES = [
  'supports',
  'contradicts',
  'context',
  'challenges',
  'unclear',
];

const RELATIONSHIP_LABELS = {
  supports: 'Supports the claim',
  contradicts: 'Contradicts the claim',
  context: 'Provides context',
  challenges: 'Challenges the methodology',
  unclear: 'Unclear relationship',
};

const SOURCE_TYPE_VALUES = [
  'research',
  'report',
  'news',
  'education',
  'primary',
  'statistics',
  'webpage',
  'note',
];

const SOURCE_TYPE_LABELS = {
  research: 'Research article',
  report: 'Official report',
  news: 'News article',
  education: 'Educational resource',
  primary: 'Primary document',
  statistics: 'Statistical report',
  webpage: 'Other webpage',
  note: 'Personal note',
};

const ASSESSMENT_VALUES = ['yes', 'no', 'unknown', 'na'];
const ASSESSMENT_LABELS = {
  yes: 'Yes',
  no: 'No',
  unknown: 'Unknown',
  na: 'Not applicable',
};

const ASSESSMENT_CRITERIA = [
  'primary_source',
  'author_identified',
  'publication_date_visible',
  'references_provided',
  'expertise_documented',
  'conflicts_of_interest',
  'methodology_available',
  'independently_corroborated',
];

const ASSESSMENT_CRITERIA_LABELS = {
  primary_source: 'Primary versus secondary source',
  author_identified: 'Author or organization identified',
  publication_date_visible: 'Publication date visible',
  references_provided: 'Evidence or references provided',
  expertise_documented: 'Relevant expertise documented',
  conflicts_of_interest: 'Potential conflicts of interest',
  methodology_available: 'Methodology available',
  independently_corroborated: 'Claims independently corroborated',
};

const SOURCE_RELATIONSHIP_VALUES = [
  'independent',
  'same_original',
  'syndicated',
  'potentially_related',
  'unknown',
];

const SOURCE_RELATIONSHIP_LABELS = {
  independent: 'Independent corroboration',
  same_original: 'Same original source',
  syndicated: 'Syndicated or repeated content',
  potentially_related: 'Potentially related',
  unknown: 'Relationship unknown',
};

const IMPORTANCE_VALUES = ['low', 'normal', 'high'];
const IMPORTANCE_LABELS = { low: 'Low', normal: 'Normal', high: 'High' };

const NOTE_KIND_VALUES = [
  'general',
  'question',
  'source_observation',
  'counterargument',
  'follow_up',
  'conclusion',
];

const NOTE_KIND_LABELS = {
  general: 'General note',
  question: 'Question for later',
  source_observation: 'Source observation',
  counterargument: 'Counterargument',
  follow_up: 'Follow-up task',
  conclusion: 'Conclusion',
};

const SCHEMA_VERSION = 1;

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'ref',
  'ref_src',
  'ref_url',
  'mc_cid',
  'mc_eid',
  '_hsenc',
  '_hsmi',
  'vero_id',
  'yclid',
  'msclkid',
]);

/**
 * Generate a stable unique id. Uses crypto.randomUUID when present (extension
 * context), falls back to a timestamp + random string for Node tests.
 * @returns {string}
 */
function uid() {
  const c = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : null;
  if (c) return c;
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  );
}

function nowISO() {
  return new Date().toISOString();
}

/**
 * Normalize whitespace without altering the captured statement's wording.
 * @param {string} s
 * @returns {string}
 */
function normalizeText(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Produce a single-line display preview of captured text.
 * @param {string} text
 * @param {number} max
 */
function previewText(text, max) {
  const n = normalizeText(text);
  if (!n) return '';
  if (n.length <= (max || 120)) return n;
  return n.slice(0, (max || 120) - 1).trimEnd() + '…';
}

/**
 * Decide whether two captures are likely duplicates: same source and same
 * normalized claim text.
 * @param {{claim_text?:string, source_url?:string}} a
 * @param {{claim_text?:string, source_url?:string}} b
 */
function isDuplicateClaim(a, b) {
  if (!a || !b) return false;
  if (normalizeText(a.claim_text) !== normalizeText(b.claim_text)) return false;
  return normalizeUrl(a.source_url) === normalizeUrl(b.source_url);
}

/**
 * Normalize a URL for page-association matching while preserving query
 * parameters that may identify distinct articles. Only known tracking
 * parameters and the fragment are removed.
 * @param {string} url
 * @returns {string}
 */
function normalizeUrl(url) {
  if (typeof url !== 'string' || !url) return '';
  let u;
  try {
    u = new URL(url);
  } catch {
    return url.trim();
  }
  const params = u.searchParams;
  TRACKING_PARAMS.forEach((p) => params.delete(p));
  const search = params.toString();
  let path = u.pathname.replace(/\/+$/, '');
  if (!path) path = '/';
  return u.origin + path + (search ? '?' + search : '');
}

/**
 * Compute a plain hostname for display from a URL string.
 * @param {string} url
 */
function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Escape a string for safe interpolation into HTML text content or attribute
 * values. Captured page text is untrusted.
 * @param {string} s
 */
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format an ISO timestamp for compact display.
 * @param {string} iso
 */
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Days between two ISO strings (positive when a is later). */
function daysBetween(a, b) {
  const da = new Date(a).getTime();
  const dbb = new Date(b).getTime();
  if (Number.isNaN(da) || Number.isNaN(dbb)) return 0;
  return Math.round((da - dbb) / 86400000);
}

/**
 * Build a claim record from raw capture input. Does not write to storage.
 * @param {Partial<ClaimRecord>} input
 * @returns {ClaimRecord}
 */
function createClaim(input) {
  const raw = input && input.claim_text ? String(input.claim_text) : '';
  const text = raw.trim();
  if (!text) {
    const err = new Error('EMPTY_CLAIM');
    err.code = 'EMPTY_CLAIM';
    throw err;
  }
  const ts = nowISO();
  return {
    id: uid(),
    schema_version: SCHEMA_VERSION,
    claim_text: text,
    display_text: '',
    source_title: input.source_title ? String(input.source_title) : '',
    source_url: input.source_url ? String(input.source_url) : '',
    context: input.context ? String(input.context) : '',
    note: input.note ? String(input.note) : '',
    capture_method: input.capture_method || 'toolbar',
    captured_at: input.captured_at || ts,
    updated_at: ts,
    status:
      input.status && STATUS_VALUES.includes(input.status) ? input.status : 'unreviewed',
    importance:
      input.importance && IMPORTANCE_VALUES.includes(input.importance)
        ? input.importance
        : 'normal',
    tags: Array.isArray(input.tags) ? input.tags.slice() : [],
    research_question: '',
    scope: '',
    ambiguities: '',
  };
}

/**
 * Build an evidence record.
 * @param {string} claimId
 * @param {Partial<EvidenceRecord>} input
 */
function createEvidence(claimId, input) {
  if (!claimId) throw new Error('MISSING_CLAIM');
  const title = (input && input.title ? String(input.title) : '').trim();
  if (!title) {
    const err = new Error('EMPTY_EVIDENCE_TITLE');
    err.code = 'EMPTY_EVIDENCE_TITLE';
    throw err;
  }
  const ts = nowISO();
  return {
    id: uid(),
    claim_id: claimId,
    schema_version: SCHEMA_VERSION,
    title,
    url: input.url ? String(input.url) : '',
    publisher: input.publisher ? String(input.publisher) : '',
    excerpt: input.excerpt ? String(input.excerpt) : '',
    relationship:
      input.relationship && RELATIONSHIP_VALUES.includes(input.relationship)
        ? input.relationship
        : 'context',
    source_type:
      input.source_type && SOURCE_TYPE_VALUES.includes(input.source_type)
        ? input.source_type
        : 'webpage',
    assessment: emptyAssessment(),
    assessment_note: '',
    date_accessed: input.date_accessed || ts,
    publication_date: input.publication_date || '',
    limitations: input.limitations ? String(input.limitations) : '',
    note: input.note ? String(input.note) : '',
    order: typeof input.order === 'number' ? input.order : 0,
    created_at: ts,
    updated_at: ts,
  };
}

function emptyAssessment() {
  const a = {};
  ASSESSMENT_CRITERIA.forEach((k) => (a[k] = 'unknown'));
  return a;
}

/**
 * Build an investigation record.
 * @param {Partial<InvestigationRecord>} input
 */
function createInvestigation(input) {
  const title = (input && input.title ? String(input.title) : '').trim();
  if (!title) {
    const err = new Error('EMPTY_INVESTIGATION_TITLE');
    err.code = 'EMPTY_INVESTIGATION_TITLE';
    throw err;
  }
  const ts = nowISO();
  return {
    id: uid(),
    schema_version: SCHEMA_VERSION,
    title,
    research_question: input.research_question || '',
    description: input.description || '',
    claim_ids: Array.isArray(input.claim_ids) ? input.claim_ids.slice() : [],
    notes: '',
    open_questions: '',
    assessment: '',
    archived: false,
    created_at: ts,
    updated_at: ts,
  };
}

/**
 * Build a note record.
 * @param {Partial<NoteRecord>} input
 */
function createNote(input) {
  const body = (input && input.body ? String(input.body) : '').trim();
  if (!body) {
    const err = new Error('EMPTY_NOTE');
    err.code = 'EMPTY_NOTE';
    throw err;
  }
  const ts = nowISO();
  return {
    id: uid(),
    schema_version: SCHEMA_VERSION,
    body,
    kind:
      input.kind && NOTE_KIND_VALUES.includes(input.kind) ? input.kind : 'general',
    tags: Array.isArray(input.tags) ? input.tags.slice() : [],
    claim_id: input.claim_id || null,
    evidence_id: input.evidence_id || null,
    investigation_id: input.investigation_id || null,
    created_at: ts,
    updated_at: ts,
  };
}

/**
 * Build a page-association record.
 * @param {string} normalizedUrl
 * @param {string} claimId
 */
function createPageAssociation(normalizedUrl, claimId) {
  if (!normalizedUrl || !claimId) throw new Error('MISSING_ASSOCIATION_INPUT');
  return {
    id: uid(),
    normalized_url: normalizedUrl,
    claim_id: claimId,
    created_at: nowISO(),
  };
}

/**
 * Validate an imported backup object. Returns { ok, errors, records }.
 * Imported records are re-id'd only if missing; existing ids are kept.
 * @param {any} data
 */
function validateImport(data) {
  const errors = [];
  const records = {
    claims: [],
    evidence: [],
    investigations: [],
    notes: [],
    associations: [],
  };
  if (!data || typeof data !== 'object') {
    return { ok: false, errors: ['Import file is not a valid JSON object.'], records };
  }
  if (data.app !== 'claimlens') {
    errors.push('Missing app marker "claimlens".');
  }
  const sections = ['claims', 'evidence', 'investigations', 'notes', 'associations'];
  sections.forEach((sec) => {
    if (data[sec] !== undefined && !Array.isArray(data[sec])) {
      errors.push(`Section "${sec}" must be an array.`);
    }
  });
  if (errors.length) return { ok: false, errors, records };

  const seenClaimIds = new Set();
  (data.claims || []).forEach((c, i) => {
    if (!c || typeof c !== 'object') return errors.push(`claims[${i}]: not an object`);
    if (!c.claim_text || !String(c.claim_text).trim())
      return errors.push(`claims[${i}]: missing claim_text`);
    const id = c.id || uid();
    seenClaimIds.add(id);
    records.claims.push({
      ...c,
      id,
      claim_text: String(c.claim_text),
      schema_version: SCHEMA_VERSION,
      updated_at: c.updated_at || nowISO(),
    });
  });

  (data.evidence || []).forEach((e, i) => {
    if (!e || typeof e !== 'object') return errors.push(`evidence[${i}]: not an object`);
    if (!e.title || !String(e.title).trim())
      return errors.push(`evidence[${i}]: missing title`);
    if (!e.claim_id) return errors.push(`evidence[${i}]: missing claim_id`);
    records.evidence.push({
      ...e,
      id: e.id || uid(),
      schema_version: SCHEMA_VERSION,
      updated_at: e.updated_at || nowISO(),
    });
  });

  (data.investigations || []).forEach((inv, i) => {
    if (!inv || typeof inv !== 'object')
      return errors.push(`investigations[${i}]: not an object`);
    if (!inv.title || !String(inv.title).trim())
      return errors.push(`investigations[${i}]: missing title`);
    records.investigations.push({
      ...inv,
      id: inv.id || uid(),
      schema_version: SCHEMA_VERSION,
      updated_at: inv.updated_at || nowISO(),
    });
  });

  (data.notes || []).forEach((n, i) => {
    if (!n || typeof n !== 'object') return errors.push(`notes[${i}]: not an object`);
    if (!n.body || !String(n.body).trim())
      return errors.push(`notes[${i}]: missing body`);
    records.notes.push({
      ...n,
      id: n.id || uid(),
      schema_version: SCHEMA_VERSION,
      updated_at: n.updated_at || nowISO(),
    });
  });

  (data.associations || []).forEach((a, i) => {
    if (!a || typeof a !== 'object')
      return errors.push(`associations[${i}]: not an object`);
    if (!a.normalized_url || !a.claim_id)
      return errors.push(`associations[${i}]: missing url or claim_id`);
    records.associations.push({ ...a, id: a.id || uid() });
  });

  return { ok: errors.length === 0, errors, records };
}

/**
 * Search across claims/evidence/investigations/notes by a query string.
 * Returns claim ids matching the query (union of text fields).
 * @param {string} query
 * @param {ClaimRecord[]} claims
 * @param {EvidenceRecord[]} evidence
 * @param {InvestigationRecord[]} investigations
 * @param {NoteRecord[]} notes
 */
function searchClaims(query, claims, evidence, investigations, notes) {
  const q = normalizeText(query).toLowerCase();
  if (!q) return claims.map((c) => c.id);
  const matches = new Set();
  claims.forEach((c) => {
    const hay = [
      c.claim_text,
      c.display_text,
      c.note,
      c.source_title,
      c.source_url,
      c.research_question,
      c.scope,
      c.ambiguities,
      (c.tags || []).join(' '),
    ]
      .join(' ')
      .toLowerCase();
    if (hay.includes(q)) matches.add(c.id);
  });
  evidence.forEach((e) => {
    if (matches.has(e.claim_id)) return;
    const hay = [e.title, e.url, e.publisher, e.excerpt, e.note, e.limitations]
      .join(' ')
      .toLowerCase();
    if (hay.includes(q)) matches.add(e.claim_id);
  });
  investigations.forEach((inv) => {
    const hay = [inv.title, inv.research_question, inv.description, inv.assessment]
      .join(' ')
      .toLowerCase();
    if (hay.includes(q)) {
      (inv.claim_ids || []).forEach((cid) => matches.add(cid));
    }
  });
  notes.forEach((n) => {
    if (n.claim_id && matches.has(n.claim_id)) return;
    if (n.claim_id && n.body.toLowerCase().includes(q)) matches.add(n.claim_id);
  });
  return Array.from(matches);
}

/**
 * Filter and sort a list of claims.
 * @param {ClaimRecord[]} claims
 * @param {{status?:string, tag?:string, from?:string, to?:string, sort?:string, archived?:boolean}} opts
 */
function filterSortClaims(claims, opts) {
  opts = opts || {};
  let out = claims.slice();
  if (opts.archived === false) {
    out = out.filter((c) => c.status !== 'archived');
  }
  if (opts.status && opts.status !== 'all') {
    out = out.filter((c) => c.status === opts.status);
  }
  if (opts.tag && opts.tag !== 'all') {
    out = out.filter((c) => (c.tags || []).includes(opts.tag));
  }
  if (opts.from) {
    out = out.filter((c) => c.captured_at >= opts.from);
  }
  if (opts.to) {
    out = out.filter((c) => c.captured_at <= opts.to);
  }
  const sort = opts.sort || 'captured_desc';
  out.sort((a, b) => {
    switch (sort) {
      case 'captured_asc':
        return a.captured_at < b.captured_at ? -1 : 1;
      case 'updated_desc':
        return a.updated_at > b.updated_at ? -1 : 1;
      case 'updated_asc':
        return a.updated_at < b.updated_at ? -1 : 1;
      case 'evidence_desc': {
        return (b._evidence_count || 0) - (a._evidence_count || 0);
      }
      default:
        return a.captured_at > b.captured_at ? -1 : 1;
    }
  });
  return out;
}

/**
 * Summarize evidence by relationship.
 * @param {EvidenceRecord[]} evidence
 */
function evidenceSummary(evidence) {
  const summary = { supports: 0, contradicts: 0, context: 0, challenges: 0, unclear: 0 };
  evidence.forEach((e) => {
    if (summary[e.relationship] !== undefined) summary[e.relationship] += 1;
  });
  return summary;
}

/** Build a full export payload. */
function buildExport(payload) {
  return {
    app: 'claimlens',
    schema_version: SCHEMA_VERSION,
    exported_at: nowISO(),
    ...payload,
  };
}

export {
  STATUS_VALUES,
  STATUS_LABELS,
  RELATIONSHIP_VALUES,
  RELATIONSHIP_LABELS,
  SOURCE_TYPE_VALUES,
  SOURCE_TYPE_LABELS,
  ASSESSMENT_VALUES,
  ASSESSMENT_LABELS,
  ASSESSMENT_CRITERIA,
  ASSESSMENT_CRITERIA_LABELS,
  SOURCE_RELATIONSHIP_VALUES,
  SOURCE_RELATIONSHIP_LABELS,
  IMPORTANCE_VALUES,
  IMPORTANCE_LABELS,
  NOTE_KIND_VALUES,
  NOTE_KIND_LABELS,
  SCHEMA_VERSION,
  TRACKING_PARAMS,
  uid,
  nowISO,
  normalizeText,
  previewText,
  isDuplicateClaim,
  normalizeUrl,
  hostnameOf,
  escapeHtml,
  formatDate,
  formatDateTime,
  daysBetween,
  createClaim,
  createEvidence,
  createInvestigation,
  createNote,
  createPageAssociation,
  emptyAssessment,
  validateImport,
  searchClaims,
  filterSortClaims,
  evidenceSummary,
  buildExport,
};
