/*
 * ClaimLens options page — settings, export/import, data deletion, privacy.
 */
import {
  getSettings,
  saveSettings,
  exportAll,
  importData,
  clearAllData,
  stats,
} from './db.js';
import {
  RELATIONSHIP_VALUES,
  RELATIONSHIP_LABELS,
  validateImport,
  escapeHtml,
} from './util.js';

const app = document.getElementById('app');

function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function render(settings, stat) {
  app.innerHTML = `
    <div class="opts-header">
      <div class="logo"></div>
      <div>
        <h1>ClaimLens Settings</h1>
        <div class="sub">Local-first · no account · no backend</div>
      </div>
    </div>

    <div class="opts-section">
      <h2>Capture behavior</h2>
      <div class="desc">Control how claims are captured from webpages.</div>
      <div class="setting-row">
        <div>
          <div class="label">Capture surrounding context</div>
          <div class="help">Include a snippet of text around the selection to help relocate the passage later.</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="setContext" ${settings.capture_surrounding_context ? 'checked' : ''} />
          <span class="track"></span>
        </label>
      </div>
      <div class="setting-row">
        <div>
          <div class="label">Show capture confirmation</div>
          <div class="help">Briefly highlight the toolbar badge and show a toast when a claim is saved.</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="setConfirm" ${settings.show_capture_confirmation ? 'checked' : ''} />
          <span class="track"></span>
        </label>
      </div>
      <div class="setting-row">
        <div>
          <div class="label">Highlight captured passages on page</div>
          <div class="help">Attempt to re-highlight saved passages when you revisit a page. Off by default; may require extra permission on some sites.</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="setHighlight" ${settings.highlight_on_page ? 'checked' : ''} />
          <span class="track"></span>
        </label>
      </div>
    </div>

    <div class="opts-section">
      <h2>Default evidence classification</h2>
      <div class="desc">The relationship assigned to new evidence by default. You can change it on each piece of evidence.</div>
      <select id="setDefaultRel" class="cl-select" style="max-width:320px;">
        ${RELATIONSHIP_VALUES.map(
          (r) => `<option value="${r}" ${settings.default_evidence_relationship === r ? 'selected' : ''}>${RELATIONSHIP_LABELS[r]}</option>`,
        ).join('')}
      </select>
    </div>

    <div class="opts-section">
      <h2>Keyboard shortcuts</h2>
      <div class="desc">Customize in your browser's extension shortcuts settings.</div>
      <div class="setting-row">
        <div>
          <div class="label">Capture selected text</div>
          <div class="help">Captures the current selection as a new claim.</div>
        </div>
        <span class="kbd">Alt+Shift+C</span>
      </div>
      <div class="setting-row">
        <div>
          <div class="label">Open workspace</div>
          <div class="help">Opens the full investigation library in a new tab.</div>
        </div>
        <span class="kbd">Alt+Shift+L</span>
      </div>
    </div>

    <div class="opts-section">
      <h2>Your data</h2>
      <div class="desc">All research data is stored locally in this browser. Nothing is sent to any server.</div>
      <div class="setting-row" style="border-top:0;padding-top:0;">
        <div>
          <div class="label">Library summary</div>
          <div class="help cl-mono" id="statsLine">Claims: ${stat.claims} · Evidence: ${stat.evidence} · Investigations: ${stat.investigations} · Notes: ${stat.notes}</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
        <button class="cl-btn" id="exportBtn">Export all data (JSON)</button>
        <button class="cl-btn cl-btn--ghost" id="importBtn">Import backup…</button>
        <input type="file" id="importFile" accept="application/json,.json" style="display:none;" />
      </div>
      <div id="importPreview" style="margin-top:14px;"></div>
    </div>

    <div class="opts-section danger-zone">
      <h2 style="color:var(--contradict);">Danger zone</h2>
      <div class="desc">Permanently delete all ClaimLens data from this browser. This cannot be undone — export a backup first.</div>
      <button class="cl-btn cl-btn--danger" id="deleteBtn">Delete all data</button>
      <div id="deleteConfirm" style="margin-top:12px;display:none;">
        <div class="alert alert--warn" style="margin-bottom:10px;"><strong>Are you sure?</strong> Every claim, piece of evidence, investigation, and note will be permanently removed.</div>
        <div style="display:flex;gap:8px;">
          <button class="cl-btn cl-btn--danger" id="deleteYes">Yes, delete everything</button>
          <button class="cl-btn cl-btn--ghost" id="deleteNo">Cancel</button>
        </div>
      </div>
    </div>

    <div class="opts-section">
      <h2>Privacy</h2>
      <div class="desc">ClaimLens is private by design. It works entirely on your device.</div>
      <ul class="privacy-list">
        <li>No analytics, telemetry, or tracking — nothing is sent to third parties.</li>
        <li>No account, no login, no remote database.</li>
        <li>No AI service and no automatic upload of captured text.</li>
        <li>No background scraping of webpages — capture only happens when you initiate it.</li>
        <li>No automatic reading of passwords, form inputs, or private fields.</li>
        <li>Claim text, evidence, notes, and investigations are stored in IndexedDB on this device.</li>
        <li>Deleting a claim also deletes its evidence and page associations. Notes attached to that claim are removed too.</li>
      </ul>
    </div>
  `;

  const bind = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      const v = el.type === 'checkbox' ? el.checked : el.value;
      saveSettings({ [key]: v });
    });
  };
  bind('setContext', 'capture_surrounding_context');
  bind('setConfirm', 'show_capture_confirmation');
  bind('setHighlight', 'highlight_on_page');
  bind('setDefaultRel', 'default_evidence_relationship');

  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('importBtn').addEventListener('click', () =>
    document.getElementById('importFile').click(),
  );
  document.getElementById('importFile').addEventListener('change', onImportFile);
  document.getElementById('deleteBtn').addEventListener('click', () => {
    document.getElementById('deleteConfirm').style.display = 'block';
  });
  document.getElementById('deleteNo').addEventListener('click', () => {
    document.getElementById('deleteConfirm').style.display = 'none';
  });
  document.getElementById('deleteYes').addEventListener('click', deleteAll);
}

async function exportData() {
  const data = await exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `claimlens-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

let pendingImport = null;

async function onImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    renderImportPreview({ ok: false, errors: ['File is not valid JSON.'] });
    return;
  }
  const result = validateImport(parsed);
  pendingImport = { result, raw: parsed };
  renderImportPreview(result);
}

function renderImportPreview(result) {
  const slot = document.getElementById('importPreview');
  if (result.ok) {
    const r = result.records;
    slot.innerHTML = `
      <div class="alert alert--info">
        <strong>Ready to import</strong> — ${r.claims.length} claims, ${r.evidence.length} evidence, ${r.investigations.length} investigations, ${r.notes.length} notes, ${r.associations.length} associations.
        Existing records with the same id will be skipped (no overwrites).
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button class="cl-btn" id="confirmImport">Confirm import</button>
        <button class="cl-btn cl-btn--ghost" id="cancelImport">Cancel</button>
      </div>`;
    document.getElementById('confirmImport').addEventListener('click', confirmImport);
    document.getElementById('cancelImport').addEventListener('click', () => {
      pendingImport = null;
      slot.replaceChildren();
    });
  } else {
    slot.innerHTML = `<div class="alert alert--warn"><strong>Invalid backup</strong><ul style="margin:6px 0 0;padding-left:18px;">${result.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul></div>`;
  }
}

async function confirmImport() {
  if (!pendingImport) return;
  try {
    const counts = await importData(pendingImport.raw, { overwrite: false });
    document.getElementById('importPreview').innerHTML =
      `<div class="alert alert--ok"><strong>Import complete</strong> — added ${counts.claims} claims, ${counts.evidence} evidence, ${counts.investigations} investigations, ${counts.notes} notes.</div>`;
    pendingImport = null;
    const stat = await stats();
    render(await getSettings(), stat);
  } catch (e) {
    document.getElementById('importPreview').innerHTML =
      `<div class="alert alert--warn"><strong>Import failed</strong> — ${escapeHtml(e.message)}</div>`;
  }
}

async function deleteAll() {
  await clearAllData();
  document.getElementById('deleteConfirm').innerHTML =
    '<div class="alert alert--ok"><strong>All data deleted.</strong> Your library is now empty.</div>';
  const stat = await stats();
  render(await getSettings(), stat);
}

(async () => {
  const [settings, stat] = await Promise.all([getSettings(), stats()]);
  render(settings, stat);
})();
