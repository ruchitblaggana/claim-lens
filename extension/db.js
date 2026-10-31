/*
 * ClaimLens storage layer — IndexedDB for all research data, chrome.storage.local
 * for extension settings. Schema-versioned with safe upgrade handling.
 *
 * Every write returns a Promise that resolves only after the transaction
 * commits, so callers never claim a save succeeded before it did.
 */
import {
  SCHEMA_VERSION,
  uid,
  nowISO,
  createClaim,
  createEvidence,
  createInvestigation,
  createNote,
  createPageAssociation,
  normalizeUrl,
  isDuplicateClaim,
  validateImport,
  buildExport,
} from './util.js';

const DB_NAME = 'claimlens';
const DB_VERSION = 1;
const STORES = [
  'claims',
  'evidence',
  'investigations',
  'notes',
  'associations',
  'meta',
];

/** @returns {Promise<IDBDatabase>} */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      STORES.forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: 'id' });
          if (name === 'claims') {
            store.createIndex('captured_at', 'captured_at');
            store.createIndex('status', 'status');
          }
          if (name === 'evidence') store.createIndex('claim_id', 'claim_id');
          if (name === 'associations')
            store.createIndex('normalized_url', 'normalized_url');
          if (name === 'notes') {
            store.createIndex('claim_id', 'claim_id');
            store.createIndex('investigation_id', 'investigation_id');
          }
        }
      });
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      // record schema version
      const tx = e.target.transaction;
      if (tx) {
        const meta = tx.objectStore('meta');
        meta.put({ key: 'schema_version', value: SCHEMA_VERSION });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** @returns {Promise<void>} */
function withStore(store, mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const s = tx.objectStore(store);
        let result;
        const r = fn(s);
        if (r instanceof Promise) {
          r.then((v) => (result = v)).catch(reject);
        } else {
          result = r;
        }
        tx.oncomplete = () => {
          db.close();
          resolve(result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error || new Error('Transaction aborted'));
        };
      }),
  );
}

function put(store, value) {
  return withStore(store, 'readwrite', (s) => {
    return new Promise((resolve, reject) => {
      const req = s.put(value);
      req.onsuccess = () => resolve(value);
      req.onerror = () => reject(req.error);
    });
  });
}

function get(store, id) {
  return withStore(store, 'readonly', (s) => {
    return new Promise((resolve, reject) => {
      const req = s.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  });
}

function getAll(store) {
  return withStore(store, 'readonly', (s) => {
    return new Promise((resolve, reject) => {
      const req = s.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  });
}

function remove(store, id) {
  return withStore(store, 'readwrite', (s) => {
    return new Promise((resolve, reject) => {
      const req = s.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  });
}

function clearStore(store) {
  return withStore(store, 'readwrite', (s) => {
    return new Promise((resolve, reject) => {
      const req = s.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  });
}

/* ---------------- Claims ---------------- */

/**
 * Save a new claim from capture input. Checks for duplicates and throws
 * { code: 'DUPLICATE' } if an identical claim already exists.
 * @param {Partial<ClaimRecord>} input
 * @returns {Promise<ClaimRecord>}
 */
async function saveClaim(input) {
  const claim = createClaim(input);
  const existing = await getAll('claims');
  if (existing.some((c) => isDuplicateClaim(c, claim))) {
    const err = new Error('DUPLICATE_CLAIM');
    err.code = 'DUPLICATE_CLAIM';
    throw err;
  }
  await put('claims', claim);
  if (claim.source_url) {
    const assoc = createPageAssociation(normalizeUrl(claim.source_url), claim.id);
    await put('associations', assoc);
  }
  return claim;
}

function updateClaim(id, patch) {
  return get('claims', id).then((c) => {
    if (!c) throw new Error('CLAIM_NOT_FOUND');
    const updated = { ...c, ...patch, id: c.id, updated_at: nowISO() };
    return put('claims', updated).then(() => updated);
  });
}

function getClaim(id) {
  return get('claims', id);
}

function listClaims() {
  return getAll('claims');
}

function deleteClaim(id) {
  return getAll('evidence')
    .then((all) =>
      Promise.all(
        all.filter((e) => e.claim_id === id).map((e) => remove('evidence', e.id)),
      ),
    )
    .then(() =>
      getAll('associations').then((all) =>
        Promise.all(
          all.filter((a) => a.claim_id === id).map((a) => remove('associations', a.id)),
        ),
      ),
    )
    .then(() =>
      getAll('notes').then((all) =>
        Promise.all(
          all.filter((n) => n.claim_id === id).map((n) => remove('notes', n.id)),
        ),
      ),
    )
    .then(() =>
      getAll('investigations').then((all) =>
        Promise.all(
          all
            .filter((inv) => (inv.claim_ids || []).includes(id))
            .map((inv) =>
              put('investigations', {
                ...inv,
                claim_ids: inv.claim_ids.filter((cid) => cid !== id),
                updated_at: nowISO(),
              }),
            ),
        ),
      ),
    )
    .then(() => remove('claims', id));
}

/* ---------------- Evidence ---------------- */

function saveEvidence(claimId, input) {
  const ev = createEvidence(claimId, input);
  return getAll('evidence').then((all) => {
    const order =
      typeof input.order === 'number'
        ? input.order
        : all.filter((e) => e.claim_id === claimId).length;
    ev.order = order;
    return put('evidence', ev).then(() => ev);
  });
}

function updateEvidence(id, patch) {
  return get('evidence', id).then((e) => {
    if (!e) throw new Error('EVIDENCE_NOT_FOUND');
    const updated = { ...e, ...patch, id: e.id, updated_at: nowISO() };
    return put('evidence', updated).then(() => updated);
  });
}

function listEvidenceForClaim(claimId) {
  return getAll('evidence').then((all) =>
    all
      .filter((e) => e.claim_id === claimId)
      .sort((a, b) => (a.order || 0) - (b.order || 0)),
  );
}

function deleteEvidence(id) {
  return remove('evidence', id);
}

/* ---------------- Investigations ---------------- */

function saveInvestigation(input) {
  const inv = createInvestigation(input);
  return put('investigations', inv).then(() => inv);
}

function updateInvestigation(id, patch) {
  return get('investigations', id).then((inv) => {
    if (!inv) throw new Error('INVESTIGATION_NOT_FOUND');
    const updated = { ...inv, ...patch, id: inv.id, updated_at: nowISO() };
    return put('investigations', updated).then(() => updated);
  });
}

function listInvestigations() {
  return getAll('investigations');
}

function getInvestigation(id) {
  return get('investigations', id);
}

function deleteInvestigation(id) {
  return remove('investigations', id);
}

/* ---------------- Notes ---------------- */

function saveNote(input) {
  const n = createNote(input);
  return put('notes', n).then(() => n);
}

function updateNote(id, patch) {
  return get('notes', id).then((n) => {
    if (!n) throw new Error('NOTE_NOT_FOUND');
    const updated = { ...n, ...patch, id: n.id, updated_at: nowISO() };
    return put('notes', updated).then(() => updated);
  });
}

function listNotesForClaim(claimId) {
  return getAll('notes').then((all) =>
    all.filter((n) => n.claim_id === claimId),
  );
}

function listNotesForInvestigation(invId) {
  return getAll('notes').then((all) =>
    all.filter((n) => n.investigation_id === invId),
  );
}

function deleteNote(id) {
  return remove('notes', id);
}

/* ---------------- Page associations ---------------- */

function associationsForUrl(normalized) {
  return getAll('associations').then((all) =>
    all.filter((a) => a.normalized_url === normalized),
  );
}

function claimsForUrl(rawUrl) {
  const n = normalizeUrl(rawUrl);
  return associationsForUrl(n).then((assocs) =>
    Promise.all(assocs.map((a) => get('claims', a.claim_id))).then((claims) =>
      claims.filter(Boolean),
    ),
  );
}

function removeAssociation(id) {
  return remove('associations', id);
}

/* ---------------- Import / Export ---------------- */

async function exportAll() {
  const [claims, evidence, investigations, notes, associations] = await Promise.all([
    getAll('claims'),
    getAll('evidence'),
    getAll('investigations'),
    getAll('notes'),
    getAll('associations'),
  ]);
  return buildExport({ claims, evidence, investigations, notes, associations });
}

/**
 * Import a validated backup. Existing ids are preserved; no silent overwrites —
 * if an id already exists it is skipped (merge mode).
 * @param {any} data
 * @param {{overwrite?:boolean}} opts
 */
async function importData(data, opts) {
  const result = validateImport(data);
  if (!result.ok) {
    const err = new Error('INVALID_IMPORT');
    err.code = 'INVALID_IMPORT';
    err.errors = result.errors;
    throw err;
  }
  const merge = async (store, records) => {
    const existing = await getAll(store);
    const existingIds = new Set(existing.map((r) => r.id));
    for (const r of records) {
      if (!opts || !opts.overwrite) {
        if (existingIds.has(r.id)) continue;
      }
      await put(store, r);
    }
  };
  await merge('claims', result.records.claims);
  await merge('evidence', result.records.evidence);
  await merge('investigations', result.records.investigations);
  await merge('notes', result.records.notes);
  await merge('associations', result.records.associations);
  return {
    claims: result.records.claims.length,
    evidence: result.records.evidence.length,
    investigations: result.records.investigations.length,
    notes: result.records.notes.length,
    associations: result.records.associations.length,
  };
}

async function clearAllData() {
  for (const s of ['claims', 'evidence', 'investigations', 'notes', 'associations']) {
    await clearStore(s);
  }
  return true;
}

/* ---------------- Settings (chrome.storage.local) ---------------- */

const DEFAULT_SETTINGS = {
  capture_surrounding_context: true,
  show_capture_confirmation: true,
  default_evidence_relationship: 'context',
  highlight_on_page: false,
  page_note_for_current: '',
};

function getSettings() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      return resolve({ ...DEFAULT_SETTINGS });
    }
    chrome.storage.local.get('settings', (res) => {
      resolve({ ...DEFAULT_SETTINGS, ...(res && res.settings ? res.settings : {}) });
    });
  });
}

function saveSettings(patch) {
  return getSettings().then((current) => {
    const next = { ...current, ...patch };
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage) return resolve(next);
      chrome.storage.local.set({ settings: next }, () => resolve(next));
    });
  });
}

/* ---------------- Stats ---------------- */

function claimCount() {
  return getAll('claims').then((c) => c.length);
}

async function stats() {
  const [claims, evidence, investigations, notes] = await Promise.all([
    getAll('claims'),
    getAll('evidence'),
    getAll('investigations'),
    getAll('notes'),
  ]);
  return {
    claims: claims.length,
    evidence: evidence.length,
    investigations: investigations.length,
    notes: notes.length,
  };
}

function putClaim(claim) {
  return put('claims', claim).then(() => {
    if (claim.source_url) {
      const assoc = createPageAssociation(normalizeUrl(claim.source_url), claim.id);
      return put('associations', assoc).then(() => claim);
    }
    return claim;
  });
}

export {
  openDB,
  getAll,
  putClaim,
  saveClaim,
  updateClaim,
  getClaim,
  listClaims,
  deleteClaim,
  saveEvidence,
  updateEvidence,
  listEvidenceForClaim,
  deleteEvidence,
  saveInvestigation,
  updateInvestigation,
  listInvestigations,
  getInvestigation,
  deleteInvestigation,
  saveNote,
  updateNote,
  listNotesForClaim,
  listNotesForInvestigation,
  deleteNote,
  associationsForUrl,
  claimsForUrl,
  removeAssociation,
  exportAll,
  importData,
  clearAllData,
  getSettings,
  saveSettings,
  claimCount,
  stats,
  DEFAULT_SETTINGS,
};
