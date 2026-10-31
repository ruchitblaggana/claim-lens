/*
 * ClaimLens workspace controller — view routing, shared state, and rendering.
 * Organized as a single-file app with view modules for library, claim detail,
 * investigations, notes, reading companion, import/export, and developer.
 */
import * as db from './db.js';
import * as U from './util.js';

const app = document.getElementById('app');
const state = {
  view: 'library',
  claims: [],
  evidence: [],
  investigations: [],
  notes: [],
  associations: [],
  query: '',
  filterStatus: 'all',
  filterTag: 'all',
  sortBy: 'captured_desc',
  selectedIds: new Set(),
  focusClaimId: null,
  focusInvestigationId: null,
};

/* ---------- tiny DOM helpers ---------- */
function el(tag, attrs, ...children) {
  const e = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function')
        e.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object')
        Object.assign(e.style, v);
      else e.setAttribute(k, v);
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    e.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return e;
}

function icon(svg) {
  const s = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
  s.setAttribute('width', '16');
  s.setAttribute('height', '16');
  return s;
}

const ICONS = {
  library:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  investigation:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  notes:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
  companion:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  export:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  developer:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  back:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  plus:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  trash:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  edit:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>',
  copy:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
};

/* ---------- data loading ---------- */
async function loadAll() {
  const [claims, evidence, investigations, notes, associations] = await Promise.all([
    db.listClaims(),
    db.getAll('evidence'),
    db.listInvestigations(),
    db.getAll('notes'),
    db.getAll('associations'),
  ]);
  state.claims = claims;
  state.evidence = evidence;
  state.investigations = investigations;
  state.notes = notes;
  state.associations = associations;
}

/* ---------- routing ---------- */
function setView(view, params) {
  state.view = view;
  if (params) {
    if (params.claimId) state.focusClaimId = params.claimId;
    if (params.investigationId) state.focusInvestigationId = params.investigationId;
  }
  state.selectedIds = new Set();
  render();
  window.scrollTo(0, 0);
}

/* ---------- main render ---------- */
function render() {
  const navItems = [
    { id: 'library', label: 'Claim library', icon: ICONS.library },
    { id: 'investigations', label: 'Investigations', icon: ICONS.investigation },
    { id: 'notes', label: 'Notes', icon: ICONS.notes },
    { id: 'companion', label: 'Reading companion', icon: ICONS.companion },
    { id: 'export', label: 'Import / Export', icon: ICONS.export },
    { id: 'developer', label: 'Developer / About', icon: ICONS.developer },
  ];

  const counts = {
    library: state.claims.length,
    investigations: state.investigations.length,
  };

  app.replaceChildren(
    el('div', { class: 'ws-layout' },
      el('aside', { class: 'ws-sidebar' },
        el('div', { class: 'ws-brand' },
          el('div', { class: 'logo' }),
          el('div', null,
            el('h1', null, 'ClaimLens'),
            el('div', { class: 'sub' }, 'Read beyond the claim'),
          ),
        ),
        el('nav', { class: 'ws-nav' },
          ...navItems.map((item) =>
            el('div', {
              class: 'ws-nav-item' + (state.view === item.id ? ' active' : ''),
              onClick: () => setView(item.id),
            },
              icon(item.icon),
              el('span', null, item.label),
              counts[item.id] !== undefined
                ? el('span', { class: 'count' }, String(counts[item.id]))
                : null,
            ),
          ),
        ),
        el('div', { class: 'ws-sidebar-footer' }, 'Local-first · v1.0'),
      ),
      el('div', { class: 'ws-main' }, renderMain()),
    ),
  );
}

function renderMain() {
  switch (state.view) {
    case 'library':
      return renderLibrary();
    case 'claim':
      return renderClaimDetail();
    case 'investigations':
      return renderInvestigations();
    case 'investigation-detail':
      return renderInvestigationDetail();
    case 'notes':
      return renderNotesView();
    case 'companion':
      return renderCompanion();
    case 'export':
      return renderExportView();
    case 'developer':
      return renderDeveloper();
    default:
      return renderLibrary();
  }
}

function topbar(title) {
  return el('div', { class: 'ws-topbar' },
    el('div', { class: 'page-title' }, title),
    el('div', { class: 'search' },
      icon(ICONS.search),
      el('input', {
        type: 'text',
        placeholder: 'Search claims, evidence, notes…',
        value: state.query,
        oninput: (e) => {
          state.query = e.target.value;
          if (state.view === 'library') renderLibraryContent();
        },
      }),
    ),
  );
}

function content(child) {
  return el('div', { class: 'ws-content' }, child);
}

/* ---------- LIBRARY VIEW ---------- */
function renderLibrary() {
  const main = el('div', { class: 'ws-main' });
  main.append(topbar('Claim library'));
  const contentEl = el('div', { class: 'ws-content', id: 'libraryContent' });
  main.append(contentEl);
  renderLibraryInto(contentEl);
  return main;
}

function renderLibraryContent() {
  const c = document.getElementById('libraryContent');
  if (c) renderLibraryInto(c);
}

function renderLibraryInto(container) {
  container.replaceChildren();

  // compute evidence counts per claim
  const evCounts = {};
  state.evidence.forEach((e) => {
    evCounts[e.claim_id] = (evCounts[e.claim_id] || 0) + 1;
  });

  let claims = state.claims.map((c) => ({
    ...c,
    _evidence_count: evCounts[c.id] || 0,
  }));

  // search
  if (state.query) {
    const q = state.query.toLowerCase();
    claims = claims.filter((c) => {
      const hay = [
        c.claim_text, c.display_text, c.note, c.source_title,
        c.source_url, c.research_question, (c.tags || []).join(' '),
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  // filter + sort
  claims = U.filterSortClaims(claims, {
    status: state.filterStatus,
    tag: state.filterTag,
    sort: state.sortBy,
    archived: false,
  });

  // filters bar
  const allTags = [...new Set(state.claims.flatMap((c) => c.tags || []))].sort();

  const filters = el('div', { class: 'filters-bar' },
    el('span', { class: 'label' }, 'Status'),
    el('select', {
      onchange: (e) => { state.filterStatus = e.target.value; renderLibraryContent(); },
    },
      el('option', { value: 'all' }, 'All statuses'),
      ...U.STATUS_VALUES.map((s) =>
        el('option', { value: s, selected: state.filterStatus === s }, U.STATUS_LABELS[s]),
      ),
    ),
    el('span', { class: 'label' }, 'Tag'),
    el('select', {
      onchange: (e) => { state.filterTag = e.target.value; renderLibraryContent(); },
    },
      el('option', { value: 'all' }, 'All tags'),
      ...allTags.map((t) =>
        el('option', { value: t, selected: state.filterTag === t }, t),
      ),
    ),
    el('span', { class: 'label' }, 'Sort'),
    el('select', {
      onchange: (e) => { state.sortBy = e.target.value; renderLibraryContent(); },
    },
      el('option', { value: 'captured_desc' }, 'Newest capture'),
      el('option', { value: 'captured_asc' }, 'Oldest capture'),
      el('option', { value: 'updated_desc' }, 'Recently modified'),
      el('option', { value: 'evidence_desc' }, 'Most evidence'),
    ),
  );
  container.append(filters);

  // bulk bar
  if (state.selectedIds.size > 0) {
    container.append(
      el('div', { class: 'bulk-bar' },
        el('span', null, `${state.selectedIds.size} selected`),
        el('button', {
          onClick: async () => {
            for (const id of state.selectedIds) {
              await db.updateClaim(id, { status: 'archived' });
            }
            state.selectedIds = new Set();
            await loadAll();
            renderLibraryContent();
          },
        }, 'Archive'),
        el('button', {
          class: 'danger',
          onClick: () => doBulkDelete(),
        }, 'Delete'),
        el('button', {
          onClick: () => { state.selectedIds = new Set(); renderLibraryContent(); },
          style: { background: 'transparent', color: 'var(--paper)' },
        }, 'Clear'),
      ),
    );
  }

  if (claims.length === 0) {
    container.append(
      el('div', { class: 'ws-empty' },
        el('div', { class: 'icon-circle' }, icon(ICONS.library)),
        el('h2', null, state.query ? 'No matching claims' : 'No claims yet'),
        el('p', null,
          state.query
            ? 'Try a different search term or clear filters.'
            : 'Select a sentence on any webpage, then use the ClaimLens toolbar or right-click "Save selection to ClaimLens" to capture your first claim.',
        ),
      ),
    );
    return;
  }

  const list = el('div', { class: 'claim-list' });
  claims.forEach((c) => {
    const evList = state.evidence.filter((e) => e.claim_id === c.id);
    const summary = U.evidenceSummary(evList);

    list.append(
      el('div', {
        class: 'claim-card',
        onClick: (e) => {
          if (e.target.tagName === 'INPUT') return;
          setView('claim', { claimId: c.id });
        },
      },
        el('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '10px' } },
          el('input', {
            type: 'checkbox',
            checked: state.selectedIds.has(c.id),
            style: { marginTop: '4px', flexShrink: '0' },
            onClick: (e) => e.stopPropagation(),
            onChange: (e) => {
              if (e.target.checked) state.selectedIds.add(c.id);
              else state.selectedIds.delete(c.id);
              renderLibraryContent();
            },
          }),
          el('div', { style: { flex: '1', minWidth: '0' } },
            el('div', { class: 'source-marker' },
              el('span', { class: 'dot' }),
              el('span', null, c.source_title ? U.hostnameOf(c.source_url) || c.source_title : 'No source'),
              el('span', null, '·'),
              el('span', null, U.formatDate(c.captured_at)),
            ),
            el('div', { class: 'claim-text' }, U.previewText(c.claim_text, 200)),
            el('div', { class: 'bottom-row' },
              el('span', { class: 'cl-chip cl-chip--status' }, U.STATUS_LABELS[c.status] || c.status),
              el('div', { class: 'evidence-indicators' },
                summary.supports > 0 ? el('span', { class: 'evidence-ind supports' }, `${summary.supports} supporting`) : null,
                summary.contradicts > 0 ? el('span', { class: 'evidence-ind contradicts' }, `${summary.contradicts} contradicting`) : null,
                summary.context > 0 ? el('span', { class: 'evidence-ind context' }, `${summary.context} context`) : null,
                evList.length === 0 ? el('span', { style: { fontSize: '11px', color: 'var(--slate)', fontFamily: 'var(--font-mono)' } }, 'No evidence yet') : null,
              ),
              c.importance === 'high'
                ? el('span', { class: 'importance-flag', style: { color: 'var(--contradict)' } }, 'High importance')
                : c.importance === 'low'
                  ? el('span', { class: 'importance-flag' }, 'Low')
                  : null,
            ),
            (c.tags || []).length > 0
              ? el('div', { style: { marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                  ...c.tags.map((t) => el('span', { class: 'cl-tag' }, t)),
                )
              : null,
          ),
        ),
      ),
    );
  });
  container.append(list);
}

async function doBulkDelete() {
  if (!confirm(`Delete ${state.selectedIds.size} claims and all their evidence? This cannot be undone.`)) return;
  for (const id of state.selectedIds) {
    await db.deleteClaim(id);
  }
  state.selectedIds = new Set();
  await loadAll();
  renderLibraryContent();
}

/* ---------- CLAIM DETAIL VIEW ---------- */
function renderClaimDetail() {
  const main = el('div', { class: 'ws-main' });
  const claim = state.claims.find((c) => c.id === state.focusClaimId);
  if (!claim) {
    main.append(topbar('Claim not found'), content(
      el('div', { class: 'ws-empty' },
        el('h2', null, 'Claim not found'),
        el('p', null, 'It may have been deleted.'),
        el('button', { class: 'cl-btn', onClick: () => setView('library') }, 'Back to library'),
      ),
    ));
    return main;
  }
  main.append(topbar('Claim investigation'));
  main.append(content(renderClaimDetailBody(claim)));
  return main;
}

function renderClaimDetailBody(claim) {
  const wrap = el('div', null);

  wrap.append(
    el('button', {
      class: 'detail-back',
      onClick: () => setView('library'),
    }, icon(ICONS.back), 'Back to library'),
  );

  // Header with highlighted claim
  const header = el('div', { class: 'detail-header' },
    el('div', { class: 'detail-claim cl-highlight' }, claim.claim_text),
    el('div', { class: 'detail-meta' },
      el('span', null, `Captured ${U.formatDateTime(claim.captured_at)}`),
      el('span', null, `· via ${claim.capture_method}`),
      claim.source_url
        ? el('span', null, '· Source: ', el('a', { href: claim.source_url, target: '_blank', rel: 'noopener' }, U.hostnameOf(claim.source_url)))
        : null,
      claim.source_title ? el('span', null, `· ${claim.source_title}`) : null,
    ),
  );
  wrap.append(header);

  // Claim section
  wrap.append(renderClaimSection(claim));

  // Evidence section
  wrap.append(renderEvidenceSection(claim));

  // Assessment section
  wrap.append(renderAssessmentSection(claim));

  return wrap;
}

function renderClaimSection(claim) {
  const section = el('div', { class: 'detail-section' },
    el('h3', null, el('span', { class: 'accent' }), 'Claim'),
  );

  const grid = el('div', { class: 'detail-grid' });

  // Status
  grid.append(
    el('div', { class: 'cl-field' },
      el('label', { class: 'cl-label' }, 'Investigation status'),
      el('select', {
        class: 'cl-select',
        onchange: (e) => updateClaimField(claim, 'status', e.target.value),
      },
        ...U.STATUS_VALUES.map((s) =>
          el('option', { value: s, selected: claim.status === s }, U.STATUS_LABELS[s]),
        ),
      ),
    ),
  );

  // Importance
  grid.append(
    el('div', { class: 'cl-field' },
      el('label', { class: 'cl-label' }, 'Importance'),
      el('select', {
        class: 'cl-select',
        onchange: (e) => updateClaimField(claim, 'importance', e.target.value),
      },
        ...U.IMPORTANCE_VALUES.map((s) =>
          el('option', { value: s, selected: claim.importance === s }, U.IMPORTANCE_LABELS[s]),
        ),
      ),
    ),
  );

  // Research question
  grid.append(
    el('div', { class: 'cl-field' },
      el('label', { class: 'cl-label' }, 'Research question'),
      el('input', {
        class: 'cl-input',
        value: claim.research_question || '',
        placeholder: 'What specific claim are you investigating?',
        oninput: (e) => updateClaimField(claim, 'research_question', e.target.value, true),
      }),
    ),
  );

  // Tags
  grid.append(
    el('div', { class: 'cl-field' },
      el('label', { class: 'cl-label' }, 'Tags'),
      renderTagsInput(claim),
    ),
  );

  // Scope
  grid.append(
    el('div', { class: 'cl-field' },
      el('label', { class: 'cl-label' }, 'Scope and context'),
      el('textarea', {
        class: 'cl-textarea',
        placeholder: 'What does the claim mean? What scope does it cover?',
        oninput: (e) => updateClaimField(claim, 'scope', e.target.value, true),
      }, claim.scope || ''),
    ),
  );

  // Ambiguities
  grid.append(
    el('div', { class: 'cl-field' },
      el('label', { class: 'cl-label' }, 'Known ambiguities'),
      el('textarea', {
        class: 'cl-textarea',
        placeholder: 'Terms or phrasings that are unclear or could be interpreted differently.',
        oninput: (e) => updateClaimField(claim, 'ambiguities', e.target.value, true),
      }, claim.ambiguities || ''),
    ),
  );

  // Notes
  grid.append(
    el('div', { class: 'cl-field' },
      el('label', { class: 'cl-label' }, 'Notes'),
      el('textarea', {
        class: 'cl-textarea',
        placeholder: 'Your observations about this claim…',
        oninput: (e) => updateClaimField(claim, 'note', e.target.value, true),
      }, claim.note || ''),
    ),
  );

  // Context
  if (claim.context) {
    grid.append(
      el('div', { class: 'cl-field' },
        el('label', { class: 'cl-label' }, 'Surrounding context (captured)'),
        el('div', {
          class: 'cl-serif',
          style: {
            fontSize: '13px', color: 'var(--slate)', padding: '10px',
            background: 'var(--paper-2)', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
          },
        }, claim.context),
      ),
    );
  }

  // Actions row
  grid.append(
    el('div', { class: 'cl-field', style: { gridColumn: '1 / -1' } },
      el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
        el('button', {
          class: 'cl-btn cl-btn--ghost cl-btn--sm',
          onClick: () => duplicateClaim(claim),
        }, icon(ICONS.copy), 'Duplicate'),
        el('button', {
          class: 'cl-btn cl-btn--ghost cl-btn--sm',
          onClick: () => exportClaimReport(claim),
        }, icon(ICONS.export), 'Export report'),
        el('button', {
          class: 'cl-btn cl-btn--danger cl-btn--sm',
          onClick: () => deleteClaimConfirm(claim),
        }, icon(ICONS.trash), 'Delete claim'),
      ),
    ),
  );

  section.append(grid);
  return section;
}

let saveTimers = {};
function updateClaimField(claim, field, value, debounce) {
  claim[field] = value;
  const statusEl = document.getElementById('saveStatus_' + claim.id);
  if (statusEl) {
    statusEl.textContent = 'Unsaved changes…';
    statusEl.className = 'save-status dirty';
  }
  if (debounce) {
    if (saveTimers[claim.id]) clearTimeout(saveTimers[claim.id]);
    saveTimers[claim.id] = setTimeout(() => persistClaim(claim), 800);
  } else {
    persistClaim(claim);
  }
}

async function persistClaim(claim) {
  await db.updateClaim(claim.id, {
    status: claim.status,
    importance: claim.importance,
    research_question: claim.research_question,
    scope: claim.scope,
    ambiguities: claim.ambiguities,
    note: claim.note,
    tags: claim.tags,
  });
  const statusEl = document.getElementById('saveStatus_' + claim.id);
  if (statusEl) {
    statusEl.textContent = 'Saved ' + new Date().toLocaleTimeString();
    statusEl.className = 'save-status saved';
  }
}

function renderTagsInput(claim) {
  const wrap = el('div', { class: 'tags-input' });
  (claim.tags || []).forEach((t) => {
    wrap.append(
      el('span', { class: 'tag-pill' }, t,
        el('button', {
          onClick: () => {
            claim.tags = (claim.tags || []).filter((x) => x !== t);
            persistClaim(claim);
            rerenderDetail();
          },
        }, '×'),
      ),
    );
  });
  const input = el('input', {
    type: 'text',
    placeholder: 'Add tag…',
    onkeydown: (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        e.preventDefault();
        const v = e.target.value.trim();
        claim.tags = [...(claim.tags || []), v];
        e.target.value = '';
        persistClaim(claim);
        rerenderDetail();
      }
    },
  });
  wrap.append(input);
  return wrap;
}

function rerenderDetail() {
  const main = document.querySelector('.ws-main');
  if (!main) return;
  const claim = state.claims.find((c) => c.id === state.focusClaimId);
  if (!claim) return;
  main.replaceChildren(topbar('Claim investigation'), content(renderClaimDetailBody(claim)));
}

async function duplicateClaim(claim) {
  const copy = U.createClaim({
    claim_text: claim.claim_text,
    source_title: claim.source_title,
    source_url: claim.source_url,
    context: claim.context,
    note: claim.note,
    tags: claim.tags,
    capture_method: 'duplicate',
  });
  copy.status = claim.status;
  copy.importance = claim.importance;
  copy.research_question = claim.research_question;
  copy.scope = claim.scope;
  copy.ambiguities = claim.ambiguities;
  await db.putClaim(copy);
  await loadAll();
  setView('claim', { claimId: copy.id });
}

async function exportClaimReport(claim) {
  const evidence = await db.listEvidenceForClaim(claim.id);
  const report = U.buildExport({
    claims: [claim],
    evidence,
    investigations: [],
    notes: [],
    associations: [],
  });
  report.report_type = 'single_claim';
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `claimlens-claim-${claim.id.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function deleteClaimConfirm(claim) {
  if (!confirm('Delete this claim and all its evidence? This cannot be undone.')) return;
  await db.deleteClaim(claim.id);
  await loadAll();
  setView('library');
}

/* ---------- EVIDENCE SECTION ---------- */
let showAddEvidence = false;

function renderEvidenceSection(claim) {
  const section = el('div', { class: 'detail-section' },
    el('h3', null, el('span', { class: 'accent' }), 'Evidence'),
  );

  const evList = state.evidence.filter((e) => e.claim_id === claim.id);
  const grouped = {
    supports: evList.filter((e) => e.relationship === 'supports'),
    contradicts: evList.filter((e) => e.relationship === 'contradicts'),
    context: evList.filter((e) => e.relationship === 'context' || e.relationship === 'challenges'),
    unclear: evList.filter((e) => e.relationship === 'unclear'),
  };

  const order = [
    ['supports', 'Supporting evidence', 'support'],
    ['contradicts', 'Contradicting evidence', 'contradict'],
    ['context', 'Contextual & methodological', 'neutral'],
    ['unclear', 'Unclear relationship', 'neutral'],
  ];

  order.forEach(([key, label, chipClass]) => {
    const items = grouped[key];
    if (items.length === 0) return;
    section.append(
      el('div', {
        style: { fontSize: '12px', fontWeight: '600', margin: '14px 0 6px', color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.04em' },
      },
        el('span', { class: `cl-chip cl-chip--${chipClass}` }, U.RELATIONSHIP_LABELS[items[0].relationship] || label),
        ` (${items.length})`,
      ),
    );
    items.forEach((ev) => section.append(renderEvidenceItem(ev, claim)));
  });

  if (evList.length === 0) {
    section.append(
      el('p', { style: { color: 'var(--slate)', fontSize: '13px', margin: '0 0 12px' } },
        'No evidence recorded yet. Add sources that support, contradict, or provide context for this claim.',
      ),
    );
  }

  // Add evidence button / form
  if (showAddEvidence) {
    section.append(renderAddEvidenceForm(claim));
  } else {
    section.append(
      el('button', {
        class: 'cl-btn cl-btn--lime cl-btn--sm',
        style: { marginTop: '10px' },
        onClick: () => { showAddEvidence = true; rerenderDetail(); },
      }, icon(ICONS.plus), 'Add evidence'),
    );
  }

  return section;
}

function renderEvidenceItem(ev, claim) {
  const item = el('div', { class: `evidence-item ${ev.relationship}` },
    el('div', { class: 'ev-title' }, ev.title),
    el('div', { class: 'ev-meta' },
      el('span', { class: `cl-chip cl-chip--${ev.relationship === 'supports' ? 'support' : ev.relationship === 'contradicts' ? 'contradict' : 'neutral'}` }, U.RELATIONSHIP_LABELS[ev.relationship]),
      ev.publisher ? el('span', null, ev.publisher) : null,
      el('span', null, `Accessed ${U.formatDate(ev.date_accessed)}`),
      ev.publication_date ? el('span', null, `Published ${U.formatDate(ev.publication_date)}`) : null,
    ),
  );

  if (ev.url) {
    item.append(
      el('div', { style: { marginTop: '4px' } },
        el('a', { href: ev.url, target: '_blank', rel: 'noopener', style: { fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--neutral)' } }, ev.url),
      ),
    );
  }

  if (ev.excerpt) {
    item.append(el('div', { class: 'ev-excerpt' }, ev.excerpt));
  }

  if (ev.limitations) {
    item.append(
      el('div', { style: { fontSize: '12px', color: 'var(--slate)', marginTop: '6px', fontStyle: 'italic' } },
        'Limitations: ', ev.limitations,
      ),
    );
  }

  if (ev.note) {
    item.append(
      el('div', { style: { fontSize: '12px', color: 'var(--slate)', marginTop: '6px' } },
        ev.note,
      ),
    );
  }

  // Source quality assessment
  const criteria = U.ASSESSMENT_CRITERIA.filter((k) => ev.assessment && ev.assessment[k] && ev.assessment[k] !== 'unknown');
  if (criteria.length > 0 || ev.assessment_note) {
    const assessEl = el('div', {
      style: { marginTop: '8px', padding: '8px 10px', background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '11.5px' },
    },
      el('div', { style: { fontWeight: '600', marginBottom: '4px', color: 'var(--slate)' } }, 'Source quality assessment'),
      ...criteria.map((k) =>
        el('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '2px 0' } },
          el('span', null, U.ASSESSMENT_CRITERIA_LABELS[k]),
          el('span', { class: `cl-chip cl-chip--${ev.assessment[k] === 'yes' ? 'support' : ev.assessment[k] === 'no' ? 'contradict' : 'neutral'}` }, U.ASSESSMENT_LABELS[ev.assessment[k]]),
        ),
      ),
      ev.assessment_note
        ? el('div', { style: { marginTop: '4px', color: 'var(--slate)', fontStyle: 'italic' } }, ev.assessment_note)
        : null,
    );
    item.append(assessEl);
  }

  // Actions
  item.append(
    el('div', { class: 'ev-actions' },
      el('button', {
        class: 'cl-btn cl-btn--ghost cl-btn--sm',
        onClick: () => openEvidenceEditor(ev, claim),
      }, icon(ICONS.edit), 'Edit'),
      el('button', {
        class: 'cl-btn cl-btn--ghost cl-btn--sm',
        onClick: async () => {
          if (!confirm('Delete this evidence record?')) return;
          await db.deleteEvidence(ev.id);
          await loadAll();
          rerenderDetail();
        },
      }, icon(ICONS.trash), 'Delete'),
    ),
  );

  return item;
}

function renderAddEvidenceForm(claim) {
  const form = el('div', { class: 'add-evidence-form' });
  form.append(el('div', { style: { fontWeight: '600', fontSize: '13px', marginBottom: '10px' } }, 'New evidence'));

  const titleI = el('input', { class: 'cl-input', placeholder: 'Evidence title *' });
  const urlI = el('input', { class: 'cl-input', placeholder: 'Source URL' });
  const pubI = el('input', { class: 'cl-input', placeholder: 'Publisher or source name' });
  const relS = el('select', { class: 'cl-select' },
    ...U.RELATIONSHIP_VALUES.map((r) => el('option', { value: r }, U.RELATIONSHIP_LABELS[r])),
  );
  const typeS = el('select', { class: 'cl-select' },
    ...U.SOURCE_TYPE_VALUES.map((t) => el('option', { value: t }, U.SOURCE_TYPE_LABELS[t])),
  );
  const excerptT = el('textarea', { class: 'cl-textarea', placeholder: 'Relevant excerpt from the source' });
  const limitationsT = el('textarea', { class: 'cl-textarea', placeholder: 'Limitations, possible bias, or missing context (optional)' });
  const noteT = el('textarea', { class: 'cl-textarea', placeholder: 'Your notes on this evidence' });
  const pubDateI = el('input', { class: 'cl-input', type: 'date', placeholder: 'Publication date' });

  form.append(
    el('div', { class: 'row' },
      el('div', null, el('label', { class: 'cl-label' }, 'Title *'), titleI),
      el('div', null, el('label', { class: 'cl-label' }, 'URL'), urlI),
    ),
    el('div', { class: 'row' },
      el('div', null, el('label', { class: 'cl-label' }, 'Publisher'), pubI),
      el('div', null, el('label', { class: 'cl-label' }, 'Relationship'), relS),
    ),
    el('div', { class: 'row' },
      el('div', null, el('label', { class: 'cl-label' }, 'Source type'), typeS),
      el('div', null, el('label', { class: 'cl-label' }, 'Publication date'), pubDateI),
    ),
    el('div', { class: 'cl-field' }, el('label', { class: 'cl-label' }, 'Excerpt'), excerptT),
    el('div', { class: 'cl-field' }, el('label', { class: 'cl-label' }, 'Limitations'), limitationsT),
    el('div', { class: 'cl-field' }, el('label', { class: 'cl-label' }, 'Notes'), noteT),
  );

  // Source assessment quick criteria
  form.append(el('div', { style: { fontWeight: '600', fontSize: '12px', margin: '10px 0 6px', color: 'var(--slate)' } }, 'Source quality assessment (optional)'));
  const assessment = U.emptyAssessment();
  const criteriaWrap = el('div', { class: 'criteria-grid' });
  U.ASSESSMENT_CRITERIA.forEach((k) => {
    const sel = el('select', { class: 'cl-select', style: { width: 'auto', fontSize: '11px' } },
      ...U.ASSESSMENT_VALUES.map((v) => el('option', { value: v, selected: v === 'unknown' }, U.ASSESSMENT_LABELS[v])),
    );
    sel.addEventListener('change', () => { assessment[k] = sel.value; });
    criteriaWrap.append(
      el('div', { class: 'criteria-row' },
        el('span', null, U.ASSESSMENT_CRITERIA_LABELS[k]),
        sel,
      ),
    );
  });
  form.append(criteriaWrap);

  const assessNoteI = el('input', { class: 'cl-input', placeholder: 'Note explaining your assessment (optional)' });
  form.append(el('div', { class: 'cl-field', style: { marginTop: '10px' } }, assessNoteI));

  form.append(
    el('div', { style: { display: 'flex', gap: '8px', marginTop: '12px' } },
      el('button', {
        class: 'cl-btn cl-btn--lime cl-btn--sm',
        onClick: async () => {
          if (!titleI.value.trim()) { alert('Title is required.'); return; }
          try {
            await db.saveEvidence(claim.id, {
              title: titleI.value,
              url: urlI.value,
              publisher: pubI.value,
              relationship: relS.value,
              source_type: typeS.value,
              excerpt: excerptT.value,
              limitations: limitationsT.value,
              note: noteT.value,
              publication_date: pubDateI.value || '',
              assessment,
              assessment_note: assessNoteI.value,
            });
            showAddEvidence = false;
            await loadAll();
            rerenderDetail();
          } catch (e) {
            alert('Failed to save evidence: ' + e.message);
          }
        },
      }, icon(ICONS.check), 'Save evidence'),
      el('button', {
        class: 'cl-btn cl-btn--ghost cl-btn--sm',
        onClick: () => { showAddEvidence = false; rerenderDetail(); },
      }, 'Cancel'),
    ),
  );

  return form;
}

function openEvidenceEditor(ev, claim) {
  const overlay = el('div', { class: 'modal-overlay' });
  const modal = el('div', { class: 'modal' });
  modal.append(
    el('div', { class: 'modal-header' },
      el('h3', null, 'Edit evidence'),
      el('button', { class: 'close', onClick: () => overlay.remove() }, '×'),
    ),
  );
  const body = el('div', { class: 'modal-body' });

  const titleI = el('input', { class: 'cl-input', value: ev.title });
  const urlI = el('input', { class: 'cl-input', value: ev.url });
  const pubI = el('input', { class: 'cl-input', value: ev.publisher });
  const relS = el('select', { class: 'cl-select' },
    ...U.RELATIONSHIP_VALUES.map((r) => el('option', { value: r, selected: r === ev.relationship }, U.RELATIONSHIP_LABELS[r])),
  );
  const typeS = el('select', { class: 'cl-select' },
    ...U.SOURCE_TYPE_VALUES.map((t) => el('option', { value: t, selected: t === ev.source_type }, U.SOURCE_TYPE_LABELS[t])),
  );
  const excerptT = el('textarea', { class: 'cl-textarea' }, ev.excerpt || '');
  const limitationsT = el('textarea', { class: 'cl-textarea' }, ev.limitations || '');
  const noteT = el('textarea', { class: 'cl-textarea' }, ev.note || '');
  const pubDateI = el('input', { class: 'cl-input', type: 'date', value: ev.publication_date || '' });

  body.append(
    el('div', { class: 'cl-field' }, el('label', { class: 'cl-label' }, 'Title'), titleI),
    el('div', { class: 'cl-field' }, el('label', { class: 'cl-label' }, 'URL'), urlI),
    el('div', { class: 'row', style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
      el('div', { class: 'cl-field' }, el('label', { class: 'cl-label' }, 'Publisher'), pubI),
      el('div', { class: 'cl-field' }, el('label', { class: 'cl-label' }, 'Relationship'), relS),
    ),
    el('div', { class: 'cl-field' }, el('label', { class: 'cl-label' }, 'Source type'), typeS),
    el('div', { class: 'cl-field' }, el('label', { class: 'cl-label' }, 'Publication date'), pubDateI),
    el('div', { class: 'cl-field' }, el('label', { class: 'cl-label' }, 'Excerpt'), excerptT),
    el('div', { class: 'cl-field' }, el('label', { class: 'cl-label' }, 'Limitations'), limitationsT),
    el('div', { class: 'cl-field' }, el('label', { class: 'cl-label' }, 'Notes'), noteT),
  );

  // assessment
  const assessment = { ...ev.assessment };
  body.append(el('div', { style: { fontWeight: '600', fontSize: '12px', margin: '10px 0 6px', color: 'var(--slate)' } }, 'Source quality assessment'));
  const cg = el('div', { class: 'criteria-grid' });
  U.ASSESSMENT_CRITERIA.forEach((k) => {
    const sel = el('select', { class: 'cl-select', style: { width: 'auto', fontSize: '11px' } },
      ...U.ASSESSMENT_VALUES.map((v) => el('option', { value: v, selected: v === assessment[k] }, U.ASSESSMENT_LABELS[v])),
    );
    sel.addEventListener('change', () => { assessment[k] = sel.value; });
    cg.append(el('div', { class: 'criteria-row' }, el('span', null, U.ASSESSMENT_CRITERIA_LABELS[k]), sel));
  });
  body.append(cg);
  const assessNoteI = el('input', { class: 'cl-input', value: ev.assessment_note || '', placeholder: 'Assessment note' });
  body.append(el('div', { class: 'cl-field', style: { marginTop: '10px' } }, assessNoteI));

  body.append(
    el('div', { style: { display: 'flex', gap: '8px', marginTop: '16px' } },
      el('button', {
        class: 'cl-btn cl-btn--lime',
        onClick: async () => {
          await db.updateEvidence(ev.id, {
            title: titleI.value,
            url: urlI.value,
            publisher: pubI.value,
            relationship: relS.value,
            source_type: typeS.value,
            excerpt: excerptT.value,
            limitations: limitationsT.value,
            note: noteT.value,
            publication_date: pubDateI.value,
            assessment,
            assessment_note: assessNoteI.value,
          });
          overlay.remove();
          await loadAll();
          rerenderDetail();
        },
      }, icon(ICONS.check), 'Save changes'),
      el('button', { class: 'cl-btn cl-btn--ghost', onClick: () => overlay.remove() }, 'Cancel'),
    ),
  );
  modal.append(body);
  overlay.append(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.append(overlay);
}

/* ---------- ASSESSMENT SECTION ---------- */
function renderAssessmentSection(claim) {
  const section = el('div', { class: 'detail-section' },
    el('h3', null, el('span', { class: 'accent' }), 'Assessment'),
    el('p', {
      style: { fontSize: '12.5px', color: 'var(--slate)', marginBottom: '14px' },
    },
      'Record your own conclusion based on the evidence you have collected. This is your assessment — ClaimLens does not generate conclusions automatically.',
    ),
  );

  // We store assessment fields on the claim via a separate object
  // We use claim.assessment_data (JSON string) for backward compat
  let assessment = claim.assessment_data;
  try { assessment = JSON.parse(assessment || '{}'); } catch { assessment = {}; }
  if (!assessment || typeof assessment !== 'object') assessment = {};

  const saveAssessment = () => {
    claim.assessment_data = JSON.stringify(assessment);
    db.updateClaim(claim.id, { assessment_data: claim.assessment_data });
  };

  const fields = [
    ['suggestion', 'What the available evidence suggests', 'textarea'],
    ['most_relevant', 'Which sources are most relevant', 'textarea'],
    ['independent', 'Whether the evidence is independent', 'textarea'],
    ['counterarguments', 'Important counterarguments', 'textarea'],
    ['unresolved', 'Unresolved questions', 'textarea'],
    ['additional_needed', 'What additional evidence would be useful', 'textarea'],
    ['final', 'Final assessment', 'textarea'],
  ];

  fields.forEach(([key, label]) => {
    section.append(
      el('div', { class: 'cl-field' },
        el('label', { class: 'cl-label' }, label),
        el('textarea', {
          class: 'cl-textarea',
          placeholder: 'Your assessment…',
          oninput: (e) => { assessment[key] = e.target.value; },
          onblur: saveAssessment,
        }, assessment[key] || ''),
      ),
    );
  });

  // Assessment date
  section.append(
    el('div', { class: 'cl-field' },
      el('label', { class: 'cl-label' }, 'Date of assessment'),
      el('input', {
        class: 'cl-input',
        type: 'date',
        value: assessment.date || '',
        oninput: (e) => { assessment.date = e.target.value; },
        onblur: saveAssessment,
      }),
    ),
  );

  return section;
}

/* ---------- INVESTIGATIONS VIEW ---------- */
function renderInvestigations() {
  const main = el('div', { class: 'ws-main' });
  main.append(topbar('Investigations'));
  const c = el('div', { class: 'ws-content' });

  // New investigation button
  c.append(
    el('div', { style: { marginBottom: '20px' } },
      el('button', {
        class: 'cl-btn cl-btn--lime',
        onClick: () => openInvestigationEditor(),
      }, icon(ICONS.plus), 'New investigation'),
    ),
  );

  if (state.investigations.length === 0) {
    c.append(
      el('div', { class: 'ws-empty' },
        el('div', { class: 'icon-circle' }, icon(ICONS.investigation)),
        el('h2', null, 'No investigations yet'),
        el('p', null, 'Group related claims into an investigation to compare evidence and build a conclusion across multiple sources.'),
      ),
    );
  } else {
    state.investigations
      .sort((a, b) => (a.updated_at > b.updated_at ? -1 : 1))
      .forEach((inv) => {
        const linkedClaims = (inv.claim_ids || [])
          .map((id) => state.claims.find((c) => c.id === id))
          .filter(Boolean);
        c.append(
          el('div', {
            class: 'inv-card',
            onClick: () => setView('investigation-detail', { investigationId: inv.id }),
          },
            el('h3', null, inv.title),
            inv.research_question
              ? el('div', { class: 'inv-q' }, inv.research_question)
              : null,
            el('div', { class: 'inv-meta' },
              el('span', null, `${linkedClaims.length} claims`),
              el('span', null, `Created ${U.formatDate(inv.created_at)}`),
              el('span', null, `Modified ${U.formatDate(inv.updated_at)}`),
              inv.archived ? el('span', { class: 'cl-chip cl-chip--status' }, 'Archived') : null,
            ),
          ),
        );
      });
  }

  main.append(c);
  return main;
}

function openInvestigationEditor(existing) {
  const overlay = el('div', { class: 'modal-overlay' });
  const modal = el('div', { class: 'modal' });
  modal.append(
    el('div', { class: 'modal-header' },
      el('h3', null, existing ? 'Edit investigation' : 'New investigation'),
      el('button', { class: 'close', onClick: () => overlay.remove() }, '×'),
    ),
  );
  const body = el('div', { class: 'modal-body' });
  const titleI = el('input', { class: 'cl-input', value: existing ? existing.title : '', placeholder: 'Investigation title *' });
  const qI = el('input', { class: 'cl-input', value: existing ? existing.research_question : '', placeholder: 'Research question' });
  const descT = el('textarea', { class: 'cl-textarea' }, existing ? existing.description || '' : '');

  body.append(
    el('div', { class: 'cl-field' }, el('label', { class: 'cl-label' }, 'Title *'), titleI),
    el('div', { class: 'cl-field' }, el('label', { class: 'cl-label' }, 'Research question'), qI),
    el('div', { class: 'cl-field' }, el('label', { class: 'cl-label' }, 'Description'), descT),
  );

  // claim linker
  if (existing) {
    body.append(el('div', { class: 'cl-label', style: { marginBottom: '6px' } }, 'Linked claims'));
    const list = el('div', null);
    const renderLinks = () => {
      list.replaceChildren();
      state.claims.forEach((c) => {
        const checked = (existing.claim_ids || []).includes(c.id);
        list.append(
          el('label', {
            style: { display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '6px 0', fontSize: '13px', cursor: 'pointer' },
          },
            el('input', {
              type: 'checkbox',
              checked,
              onChange: async (e) => {
                if (e.target.checked) {
                  existing.claim_ids = [...(existing.claim_ids || []), c.id];
                } else {
                  existing.claim_ids = (existing.claim_ids || []).filter((id) => id !== c.id);
                }
                await db.updateInvestigation(existing.id, { claim_ids: existing.claim_ids });
                await loadAll();
              },
            }),
            el('div', { style: { flex: '1' } },
              el('div', { class: 'cl-serif', style: { fontSize: '13px' } }, U.previewText(c.claim_text, 100)),
              el('div', { class: 'cl-mono', style: { fontSize: '10px', color: 'var(--slate)' } }, U.STATUS_LABELS[c.status]),
            ),
          ),
        );
      });
    };
    renderLinks();
    body.append(list);
  }

  body.append(
    el('div', { style: { display: 'flex', gap: '8px', marginTop: '16px' } },
      el('button', {
        class: 'cl-btn cl-btn--lime',
        onClick: async () => {
          if (!titleI.value.trim()) { alert('Title is required.'); return; }
          if (existing) {
            await db.updateInvestigation(existing.id, {
              title: titleI.value,
              research_question: qI.value,
              description: descT.value,
            });
          } else {
            await db.saveInvestigation({
              title: titleI.value,
              research_question: qI.value,
              description: descT.value,
            });
          }
          overlay.remove();
          await loadAll();
          render();
        },
      }, icon(ICONS.check), existing ? 'Save changes' : 'Create investigation'),
      el('button', { class: 'cl-btn cl-btn--ghost', onClick: () => overlay.remove() }, 'Cancel'),
    ),
  );
  modal.append(body);
  overlay.append(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.append(overlay);
}

function renderInvestigationDetail() {
  const main = el('div', { class: 'ws-main' });
  const inv = state.investigations.find((i) => i.id === state.focusInvestigationId);
  if (!inv) {
    main.append(topbar('Investigation not found'), content(
      el('div', { class: 'ws-empty' },
        el('h2', null, 'Investigation not found'),
        el('button', { class: 'cl-btn', onClick: () => setView('investigations') }, 'Back to investigations'),
      ),
    ));
    return main;
  }

  const linkedClaims = (inv.claim_ids || [])
    .map((id) => state.claims.find((c) => c.id === id))
    .filter(Boolean);

  const c = el('div', { class: 'ws-content' });
  c.append(
    el('button', { class: 'detail-back', onClick: () => setView('investigations') }, icon(ICONS.back), 'Back to investigations'),
    el('div', { class: 'detail-header' },
      el('h2', { style: { fontSize: '24px', marginBottom: '8px' } }, inv.title),
      inv.research_question
        ? el('div', { class: 'cl-serif', style: { fontSize: '16px', color: '#3a3f3b', marginBottom: '8px' } }, inv.research_question)
        : null,
      el('div', { class: 'detail-meta' },
        el('span', null, `${linkedClaims.length} linked claims`),
        el('span', null, `Created ${U.formatDate(inv.created_at)}`),
        el('span', null, `Modified ${U.formatDate(inv.updated_at)}`),
      ),
    ),
  );

  // Actions
  c.append(
    el('div', { style: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' } },
      el('button', { class: 'cl-btn cl-btn--ghost cl-btn--sm', onClick: () => openInvestigationEditor(inv) }, icon(ICONS.edit), 'Edit'),
      el('button', {
        class: 'cl-btn cl-btn--ghost cl-btn--sm',
        onClick: async () => {
          const copy = U.createInvestigation({
            title: inv.title + ' (copy)',
            research_question: inv.research_question,
            description: inv.description,
            claim_ids: inv.claim_ids,
          });
          await db.saveInvestigation(copy);
          await loadAll();
          setView('investigations');
        },
      }, icon(ICONS.copy), 'Duplicate'),
      el('button', {
        class: 'cl-btn cl-btn--ghost cl-btn--sm',
        onClick: async () => {
          await db.updateInvestigation(inv.id, { archived: !inv.archived });
          await loadAll();
          render();
        },
      }, inv.archived ? 'Restore' : 'Archive'),
      el('button', {
        class: 'cl-btn cl-btn--ghost cl-btn--sm',
        onClick: () => exportInvestigation(inv),
      }, icon(ICONS.export), 'Export'),
      el('button', {
        class: 'cl-btn cl-btn--danger cl-btn--sm',
        onClick: async () => {
          if (!confirm('Delete this investigation? Linked claims will not be deleted.')) return;
          await db.deleteInvestigation(inv.id);
          await loadAll();
          setView('investigations');
        },
      }, icon(ICONS.trash), 'Delete'),
    ),
  );

  // Description
  if (inv.description) {
    c.append(
      el('div', { class: 'detail-section' },
        el('h3', null, el('span', { class: 'accent' }), 'Description'),
        el('p', { class: 'cl-serif', style: { fontSize: '14px', lineHeight: '1.6' } }, inv.description),
      ),
    );
  }

  // Linked claims
  c.append(
    el('div', { class: 'detail-section' },
      el('h3', null, el('span', { class: 'accent' }), 'Linked claims'),
      linkedClaims.length === 0
        ? el('p', { style: { color: 'var(--slate)', fontSize: '13px' } }, 'No claims linked yet. Click Edit to link claims from your library.')
        : el('div', { class: 'claim-list' },
            ...linkedClaims.map((cl) => {
              const evList = state.evidence.filter((e) => e.claim_id === cl.id);
              const summary = U.evidenceSummary(evList);
              return el('div', {
                class: 'claim-card',
                onClick: () => setView('claim', { claimId: cl.id }),
              },
                el('div', { class: 'source-marker' },
                  el('span', { class: 'dot' }),
                  el('span', null, U.STATUS_LABELS[cl.status]),
                ),
                el('div', { class: 'claim-text' }, U.previewText(cl.claim_text, 160)),
                el('div', { class: 'bottom-row' },
                  summary.supports > 0 ? el('span', { class: 'evidence-ind supports' }, `${summary.supports} supporting`) : null,
                  summary.contradicts > 0 ? el('span', { class: 'evidence-ind contradicts' }, `${summary.contradicts} contradicting`) : null,
                ),
              );
            }),
          ),
    ),
  );

  // Notes and assessment
  c.append(
    el('div', { class: 'detail-section' },
      el('h3', null, el('span', { class: 'accent' }), 'Research notes'),
      el('textarea', {
        class: 'cl-textarea',
        style: { minHeight: '100px' },
        placeholder: 'Notes for this investigation…',
        oninput: (e) => { inv.notes = e.target.value; },
        onblur: () => db.updateInvestigation(inv.id, { notes: inv.notes }),
      }, inv.notes || ''),
    ),
    el('div', { class: 'detail-section' },
      el('h3', null, el('span', { class: 'accent' }), 'Open questions'),
      el('textarea', {
        class: 'cl-textarea',
        placeholder: 'Questions that remain open…',
        oninput: (e) => { inv.open_questions = e.target.value; },
        onblur: () => db.updateInvestigation(inv.id, { open_questions: inv.open_questions }),
      }, inv.open_questions || ''),
    ),
    el('div', { class: 'detail-section' },
      el('h3', null, el('span', { class: 'accent' }), 'Current assessment'),
      el('p', { style: { fontSize: '12.5px', color: 'var(--slate)', marginBottom: '10px' } }, 'Your own conclusion based on the linked claims and evidence. ClaimLens does not generate this automatically.'),
      el('textarea', {
        class: 'cl-textarea',
        style: { minHeight: '120px' },
        placeholder: 'Your assessment…',
        oninput: (e) => { inv.assessment = e.target.value; },
        onblur: () => db.updateInvestigation(inv.id, { assessment: inv.assessment }),
      }, inv.assessment || ''),
    ),
  );

  main.append(topbar(inv.title), c);
  return main;
}

async function exportInvestigation(inv) {
  const linkedClaims = (inv.claim_ids || [])
    .map((id) => state.claims.find((c) => c.id === id))
    .filter(Boolean);
  const evidence = [];
  for (const cl of linkedClaims) {
    const ev = await db.listEvidenceForClaim(cl.id);
    evidence.push(...ev);
  }
  const report = U.buildExport({
    claims: linkedClaims,
    evidence,
    investigations: [inv],
    notes: [],
    associations: [],
  });
  report.report_type = 'investigation';
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `claimlens-investigation-${inv.id.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- NOTES VIEW ---------- */
function renderNotesView() {
  const main = el('div', { class: 'ws-main' });
  main.append(topbar('Notes'));
  const c = el('div', { class: 'ws-content' });

  c.append(
    el('p', { style: { color: 'var(--slate)', fontSize: '13px', marginBottom: '16px' } },
      'Notes can be attached to a claim, evidence, investigation, or saved independently. Use them for questions, counterarguments, and follow-up tasks.',
    ),
    el('button', {
      class: 'cl-btn cl-btn--lime cl-btn--sm',
      style: { marginBottom: '16px' },
      onClick: () => openNoteEditor(),
    }, icon(ICONS.plus), 'Add note'),
  );

  // Load all notes from all claims
  const allNotes = [];
  state.claims.forEach((cl) => {
    // notes are loaded lazily; we show claim notes inline in detail view
    // For the notes view we show a summary of where notes exist
  });

  c.append(
    el('div', { class: 'companion-info' },
      'Notes are managed within each claim and investigation. Open a claim or investigation to add and edit notes attached to it. Standalone notes can be created with "Add note".',
    ),
  );

  // Standalone note creation + list will use chrome.storage.local for simplicity
  // since notes without parent records are lightweight
  const noteStoreKey = 'claimlens_standalone_notes';

  chrome.storage.local.get(noteStoreKey, (res) => {
    const notes = res[noteStoreKey] || [];
    if (notes.length === 0) {
      c.append(
        el('div', { class: 'ws-empty' },
          el('div', { class: 'icon-circle' }, icon(ICONS.notes)),
          el('h2', null, 'No standalone notes'),
          el('p', null, 'Standalone notes are saved in this browser. Notes attached to claims or investigations appear in their detail views.'),
        ),
      );
      return;
    }
    notes.sort((a, b) => (a.updated_at > b.updated_at ? -1 : 1));
    notes.forEach((n) => {
      c.append(
        el('div', { class: 'note-item' },
          el('div', { class: 'note-body' }, n.body),
          el('div', { class: 'note-meta' },
            el('span', { class: `cl-chip cl-chip--neutral` }, U.NOTE_KIND_LABELS[n.kind] || 'General'),
            el('span', null, U.formatDateTime(n.updated_at),
            ),
            (n.tags || []).map((t) => el('span', { class: 'cl-tag' }, t)),
            el('button', {
              class: 'cl-btn cl-btn--ghost cl-btn--sm',
              style: { marginLeft: 'auto' },
              onClick: () => openNoteEditor(n),
            }, icon(ICONS.edit), 'Edit'),
            el('button', {
              class: 'cl-btn cl-btn--danger cl-btn--sm',
              onClick: () => {
                const updated = notes.filter((x) => x.id !== n.id);
                chrome.storage.local.set({ [noteStoreKey]: updated }, () => {
                  render();
                });
              },
            }, icon(ICONS.trash), 'Delete'),
          ),
        ),
      );
    });
  });

  main.append(c);
  return main;
}

function openNoteEditor(existing) {
  const overlay = el('div', { class: 'modal-overlay' });
  const modal = el('div', { class: 'modal' });
  modal.append(
    el('div', { class: 'modal-header' },
      el('h3', null, existing ? 'Edit note' : 'New note'),
      el('button', { class: 'close', onClick: () => overlay.remove() }, '×'),
    ),
  );
  const body = el('div', { class: 'modal-body' });
  const bodyT = el('textarea', { class: 'cl-textarea', style: { minHeight: '120px' }, placeholder: 'Write your note…' }, existing ? existing.body : '');
  const kindS = el('select', { class: 'cl-select' },
    ...U.NOTE_KIND_VALUES.map((k) => el('option', { value: k, selected: existing && existing.kind === k }, U.NOTE_KIND_LABELS[k])),
  );
  const tagsI = el('input', { class: 'cl-input', value: existing ? (existing.tags || []).join(', ') : '', placeholder: 'Tags (comma-separated)' });

  body.append(
    el('div', { class: 'cl-field' }, el('label', { class: 'cl-label' }, 'Note'), bodyT),
    el('div', { class: 'cl-field' }, el('label', { class: 'cl-label' }, 'Kind'), kindS),
    el('div', { class: 'cl-field' }, el('label', { class: 'cl-label' }, 'Tags'), tagsI),
    el('div', { style: { display: 'flex', gap: '8px' } },
      el('button', {
        class: 'cl-btn cl-btn--lime',
        onClick: () => {
          if (!bodyT.value.trim()) { alert('Note cannot be empty.'); return; }
          const note = {
            id: existing ? existing.id : U.uid(),
            body: bodyT.value,
            kind: kindS.value,
            tags: tagsI.value.split(',').map((t) => t.trim()).filter(Boolean),
            updated_at: U.nowISO(),
            created_at: existing ? existing.created_at : U.nowISO(),
          };
          const key = 'claimlens_standalone_notes';
          chrome.storage.local.get(key, (res) => {
            const notes = res[key] || [];
            const idx = notes.findIndex((n) => n.id === note.id);
            if (idx >= 0) notes[idx] = note;
            else notes.push(note);
            chrome.storage.local.set({ [key]: notes }, () => {
              overlay.remove();
              render();
            });
          });
        },
      }, icon(ICONS.check), 'Save note'),
      el('button', { class: 'cl-btn cl-btn--ghost', onClick: () => overlay.remove() }, 'Cancel'),
    ),
  );
  modal.append(body);
  overlay.append(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.append(overlay);
}

/* ---------- READING COMPANION VIEW ---------- */
function renderCompanion() {
  const main = el('div', { class: 'ws-main' });
  main.append(topbar('Reading companion'));
  const c = el('div', { class: 'ws-content' });

  c.append(
    el('p', { style: { color: 'var(--slate)', fontSize: '13px', marginBottom: '16px', maxWidth: '620px' } },
      'The reading companion shows claims you have saved from the current webpage. Open it while browsing to see which passages you have already investigated.',
    ),
  );

  const info = el('div', { id: 'companionInfo' });
  c.append(info);

  // Get current tab info via background
  chrome.runtime.sendMessage({ type: 'GET_PAGE_INFO' }, async (pageInfo) => {
    if (!pageInfo || pageInfo.error) {
      info.append(
        el('div', { class: 'companion-info' }, 'Could not detect the current page. Open a webpage in this window to use the reading companion.'),
      );
      return;
    }
    if (pageInfo.restricted) {
      info.append(
        el('div', { class: 'companion-info' }, 'This is a restricted browser page. The reading companion works on normal webpages.'),
      );
      return;
    }
    const normalized = U.normalizeUrl(pageInfo.url);
    const claims = await db.claimsForUrl(pageInfo.url);
    info.append(
      el('div', { class: 'companion-info' },
        el('strong', null, 'Current page: '),
        pageInfo.title || 'Untitled',
        el('br'),
        el('span', { class: 'cl-mono', style: { fontSize: '11px' } }, pageInfo.url),
        el('br'),
        el('span', null, `${claims.length} claim${claims.length === 1 ? '' : 's'} saved from this page.`),
      ),
    );

    if (claims.length > 0) {
      const list = el('div', { class: 'claim-list', style: { marginTop: '16px' } });
      claims.forEach((cl) => {
        list.append(
          el('div', {
            class: 'claim-card',
            onClick: () => setView('claim', { claimId: cl.id }),
          },
            el('div', { class: 'source-marker' },
              el('span', { class: 'dot' }),
              el('span', null, U.STATUS_LABELS[cl.status]),
              el('span', null, '·'),
              el('span', null, U.formatDate(cl.captured_at)),
            ),
            el('div', { class: 'claim-text' }, U.previewText(cl.claim_text, 200)),
          ),
        );
      });
      c.append(list);
    } else {
      c.append(
        el('div', { class: 'ws-empty' },
          el('div', { class: 'icon-circle' }, icon(ICONS.companion)),
          el('h2', null, 'No claims from this page'),
          el('p', null, 'Select a sentence on this page, then use the ClaimLens toolbar or right-click menu to capture it.'),
        ),
      );
    }

    // Page note
    c.append(
      el('div', { class: 'detail-section', style: { marginTop: '20px' } },
        el('h3', null, el('span', { class: 'accent' }), 'Page note'),
        el('textarea', {
          class: 'cl-textarea',
          placeholder: 'Add a note about this page…',
          id: 'pageNote',
        }),
        el('button', {
          class: 'cl-btn cl-btn--lime cl-btn--sm',
          style: { marginTop: '8px' },
          onClick: () => {
            const note = document.getElementById('pageNote').value;
            if (!note.trim()) return;
            const key = 'claimlens_page_notes';
            chrome.storage.local.get(key, (res) => {
              const notes = res[key] || {};
              notes[normalized] = { note, updated_at: U.nowISO() };
              chrome.storage.local.set({ [key]: notes }, () => {
                alert('Page note saved.');
              });
            });
          },
        }, 'Save page note'),
      ),
    );

    // Load existing page note
    const key = 'claimlens_page_notes';
    chrome.storage.local.get(key, (res) => {
      const notes = res[key] || {};
      if (notes[normalized]) {
        const ta = document.getElementById('pageNote');
        if (ta) ta.value = notes[normalized].note;
      }
    });
  });

  main.append(c);
  return main;
}

/* ---------- IMPORT/EXPORT VIEW ---------- */
function renderExportView() {
  const main = el('div', { class: 'ws-main' });
  main.append(topbar('Import / Export'));
  const c = el('div', { class: 'ws-content' });

  c.append(
    el('div', { class: 'detail-section' },
      el('h3', null, el('span', { class: 'accent' }), 'Export'),
      el('p', { style: { fontSize: '13px', color: 'var(--slate)', marginBottom: '14px' } }, 'Download all your claims, evidence, investigations, notes, and page associations as a JSON backup file.'),
      el('button', {
        class: 'cl-btn cl-btn--lime',
        onClick: async () => {
          const data = await db.exportAll();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `claimlens-backup-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
        },
      }, icon(ICONS.export), 'Export all data'),
    ),
    el('div', { class: 'detail-section' },
      el('h3', null, el('span', { class: 'accent' }), 'Import'),
      el('p', { style: { fontSize: '13px', color: 'var(--slate)', marginBottom: '14px' } }, 'Import a ClaimLens backup file. Existing records with the same id will be skipped — your current data will not be overwritten.'),
      el('input', {
        type: 'file',
        accept: 'application/json,.json',
        id: 'importFile',
        style: { marginBottom: '10px' },
      }),
      el('div', { id: 'importPreview' }),
    ),
  );

  // wire up import
  setTimeout(() => {
    const input = document.getElementById('importFile');
    if (!input) return;
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        document.getElementById('importPreview').replaceChildren(
          el('div', { class: 'alert alert--warn', style: { padding: '10px', borderRadius: 'var(--radius)', fontSize: '13px' } }, 'File is not valid JSON.'),
        );
        return;
      }
      const result = U.validateImport(parsed);
      const preview = document.getElementById('importPreview');
      if (result.ok) {
        const r = result.records;
        preview.replaceChildren(
          el('div', { class: 'alert alert--info', style: { padding: '10px', borderRadius: 'var(--radius)', fontSize: '13px', marginBottom: '8px' } },
            `Ready to import: ${r.claims.length} claims, ${r.evidence.length} evidence, ${r.investigations.length} investigations, ${r.notes.length} notes. Existing records will be skipped.`,
          ),
          el('button', {
            class: 'cl-btn cl-btn--lime cl-btn--sm',
            onClick: async () => {
              try {
                const counts = await db.importData(parsed, { overwrite: false });
                preview.replaceChildren(
                  el('div', { class: 'alert alert--ok', style: { padding: '10px', borderRadius: 'var(--radius)', fontSize: '13px' } },
                    `Import complete. Added ${counts.claims} claims, ${counts.evidence} evidence, ${counts.investigations} investigations.`,
                  ),
                );
                await loadAll();
                render();
              } catch (err) {
                preview.replaceChildren(
                  el('div', { class: 'alert alert--warn', style: { padding: '10px', borderRadius: 'var(--radius)', fontSize: '13px' } },
                    'Import failed: ', err.message,
                  ),
                );
              }
            },
          }, icon(ICONS.check), 'Confirm import'),
        );
      } else {
        preview.replaceChildren(
          el('div', { class: 'alert alert--warn', style: { padding: '10px', borderRadius: 'var(--radius)', fontSize: '13px' } },
            el('strong', null, 'Invalid backup file'),
            el('ul', { style: { margin: '6px 0 0', paddingLeft: '18px' } },
              ...result.errors.map((err) => el('li', null, err)),
            ),
          ),
        );
      }
    });
  }, 50);

  main.append(c);
  return main;
}

/* ---------- DEVELOPER VIEW ---------- */
function renderDeveloper() {
  const main = el('div', { class: 'ws-main' });
  main.append(topbar('Developer / About'));
  const c = el('div', { class: 'ws-content' });

  c.append(
    el('div', { class: 'dev-hero' },
      el('h2', null, 'Ruchit Blaggana'),
      el('div', { class: 'tagline' }, 'Creator of ClaimLens · Read beyond the claim'),
      el('div', { class: 'bio' },
        'Computer Science student at Delhi Public School, Vasant Kunj, New Delhi. Currently in Grade 12, planning to study Computer Science at university in the USA, Canada, or Australia. ClaimLens was built to encourage careful reading, evidence organization, and critical thinking — skills that matter more than ever in an age of information overload.',
      ),
    ),
  );

  // Academic record
  c.append(
    el('div', { class: 'dev-section' },
      el('h3', null, el('span', { class: 'num' }, '01'), 'About the Developer'),
      el('p', { style: { fontSize: '13.5px', lineHeight: '1.6' } },
        'Ruchit Blaggana is a Grade 12 student at Delhi Public School, Vasant Kunj, New Delhi, pursuing Computer Science as his intended major. He is exploring university opportunities in the United States, Canada, and Australia.',
      ),
      el('table', { class: 'grade-table', style: { marginTop: '16px' } },
        el('thead', null,
          el('tr', null, el('th', null, 'Grade'), el('th', null, 'Result')),
        ),
        el('tbody', null,
          el('tr', null, el('td', null, 'Grade 9'), el('td', { class: 'cl-mono' }, '93.2%')),
          el('tr', null, el('td', null, 'Grade 10'), el('td', { class: 'cl-mono' }, '94.4%')),
          el('tr', null, el('td', null, 'Grade 11'), el('td', { class: 'cl-mono' }, '80.4%')),
          el('tr', null, el('td', null, 'Grade 12'), el('td', { class: 'cl-mono' }, 'Pursuing')),
        ),
      ),
    ),
  );

  // Technical experience
  c.append(
    el('div', { class: 'dev-section' },
      el('h3', null, el('span', { class: 'num' }, '02'), 'Technical Experience'),
      el('div', { style: { marginBottom: '16px' } },
        el('h4', { style: { fontSize: '14px', marginBottom: '6px' } }, 'Smart Hat for the Visually Impaired'),
        el('p', { style: { fontSize: '13.5px', lineHeight: '1.6' } },
          'Ruchit completed a summer program in Artificial Intelligence, Machine Learning, and Robotics at IIT Delhi through Rancho Labs. He designed and developed a smart hat using Arduino Uno and ultrasonic sensor technology to detect overhead obstacles and provide alerts to the wearer. The project demonstrates hardware programming, sensor integration, rapid prototyping, and human-centered problem-solving.',
        ),
      ),
    ),
  );

  // Research and innovation
  c.append(
    el('div', { class: 'dev-section' },
      el('h3', null, el('span', { class: 'num' }, '03'), 'Research and Innovation'),
      el('ul', { class: 'dev-list' },
        el('li', null, 'Co-development of an innovative instrument for which a patent application has been filed and is pending review.'),
        el('li', null, 'Data compilation and research assistance for a dentistry-related article currently under publication.'),
      ),
      el('p', { style: { fontSize: '12px', color: 'var(--slate)', marginTop: '10px', fontStyle: 'italic' } },
        'Patent and publication details are intentionally omitted as they are pending.',
      ),
    ),
  );

  // Academic achievements
  c.append(
    el('div', { class: 'dev-section' },
      el('h3', null, el('span', { class: 'num' }, '04'), 'Academic Achievements'),
      el('ul', { class: 'dev-list' },
        el('li', null, 'Scholar Badge of Excellence received consistently throughout school.'),
        el('li', null, 'Gold Medal for Academic Excellence in Grade 11.'),
        el('li', null, 'Regional Rank 3 and School Rank 1 in Vigyan Vidyarthi Manthan.'),
        el('li', null, 'Second prize in a national-level photography competition.'),
        el('li', null, 'Certificate of Recognition in a World Environment Day global quiz.'),
        el('li', null, 'Certificate of Distinction in the CMS Environmental Quiz Competition.'),
        el('li', null, 'Contribution to the winning team at the Inter-School Luminaire Competition, which received the Rolling Trophy.'),
        el('li', null, 'Bronze medal in the Inter-School Swimming Competition, 2024.'),
      ),
    ),
  );

  // Leadership and community
  c.append(
    el('div', { class: 'dev-section' },
      el('h3', null, el('span', { class: 'num' }, '05'), 'Leadership and Community Impact'),
      el('p', { style: { fontSize: '13.5px', lineHeight: '1.6', marginBottom: '12px' } },
        'As Secretary of the Interact Club, Ruchit led outreach, fundraising, volunteer coordination, and social impact initiatives, supported by a Letter of Recommendation from the club.',
      ),
      el('ul', { class: 'dev-list' },
        el('li', null, 'Fundraising activities supporting orphanages, elderly care, and social welfare.'),
        el('li', null, 'Financial literacy workshop designed and conducted for government-school students.'),
        el('li', null, 'Paper recycling and textile sustainability initiatives.'),
        el('li', null, 'Volunteering at Earth Saviours Foundation — supporting homeless and elderly residents through caregiving, reading sessions, medicine distribution, and day-to-day assistance.'),
      ),
    ),
  );

  // Why ClaimLens
  c.append(
    el('div', { class: 'dev-section' },
      el('h3', null, el('span', { class: 'num' }, '06'), 'Why ClaimLens Was Built'),
      el('p', { style: { fontSize: '14px', lineHeight: '1.7', class: 'cl-serif' } },
        'The internet presents millions of claims, statistics, and arguments every day. The challenge is not finding information — it is determining what the available evidence actually supports. ClaimLens was built to help readers move from passive consumption to structured investigation: capturing claims with their source context, organizing supporting and contradicting evidence, and building traceable, user-authored conclusions. It is an evidence organization and critical-reading tool, not an automated truth detector. The user always makes the final assessment.',
      ),
    ),
  );

  main.append(c);
  return main;
}

/* ---------- init ---------- */
async function init() {
  await loadAll();

  // check for focus claim from popup
  const focusClaim = sessionStorage.getItem('claimlens:focusClaim');
  if (focusClaim) {
    sessionStorage.removeItem('claimlens:focusClaim');
    state.focusClaimId = focusClaim;
    state.view = 'claim';
  }

  // listen for live captures
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'CLAIM_CAPTURED') {
      loadAll().then(() => {
        if (state.view === 'library') renderLibraryContent();
      });
    }
  });

  render();
}

init();
