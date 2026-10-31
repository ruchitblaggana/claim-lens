/*
 * ClaimLens popup — quick capture, recent claims, and navigation.
 */
import {
  listClaims,
  claimCount,
} from './db.js';
import {
  previewText,
  hostnameOf,
  formatDate,
  STATUS_LABELS,
  escapeHtml,
} from './util.js';

const app = document.getElementById('app');
let pageInfo = null;
let recentClaims = [];
let query = '';

function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

async function loadPageInfo() {
  pageInfo = await chrome.runtime.sendMessage({ type: 'GET_PAGE_INFO' });
}

async function loadRecent() {
  const all = await listClaims();
  all.sort((a, b) => (a.captured_at > b.captured_at ? -1 : 1));
  recentClaims = all;
}

async function captureAndSave() {
  setBusy(true);
  try {
    const res = await chrome.runtime.sendMessage({ type: 'CAPTURE_AND_SAVE' });
    if (res && res.error) {
      let msg;
      if (res.error === 'NO_SELECTION') {
        msg =
          'No text selected on this page. Select a sentence first, then click capture.';
      } else if (res.error === 'RESTRICTED_PAGE') {
        msg =
          'This browser page is restricted and cannot be read by extensions. Try a normal webpage.';
      } else if (res.error === 'DUPLICATE_CLAIM') {
        msg = 'This claim is already in your library.';
      } else {
        msg = res.error;
      }
      renderAlert('warn', 'Capture not completed', msg);
    } else if (res && res.ok && res.claim) {
      renderAlert('ok', 'Claim saved', 'Open it in the workspace to add evidence.');
      await loadRecent();
      render();
    } else {
      renderAlert('warn', 'Capture failed', 'Unexpected response from the background.');
    }
  } catch (e) {
    renderAlert('warn', 'Capture failed', e && e.message ? e.message : 'Unknown error');
  } finally {
    setBusy(false);
  }
}

function setBusy(busy) {
  const btn = document.getElementById('captureBtn');
  if (btn) {
    btn.disabled = busy;
    btn.textContent = busy ? 'Capturing…' : 'Capture selected text';
  }
}

function renderAlert(kind, title, message) {
  const existing = document.getElementById('alertSlot');
  if (!existing) return;
  const node = h(
    `<div class="alert alert--${kind}"><strong>${escapeHtml(title)}</strong> — ${escapeHtml(message)}</div>`,
  );
  existing.replaceChildren(node);
  if (kind === 'ok') {
    setTimeout(() => {
      const slot = document.getElementById('alertSlot');
      if (slot && slot.firstElementChild === node) slot.replaceChildren();
    }, 5000);
  }
}

function render() {
  const count = recentClaims.length;
  const filtered = query
    ? recentClaims.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.claim_text.toLowerCase().includes(q) ||
          (c.source_title || '').toLowerCase().includes(q) ||
          (c.tags || []).some((t) => t.toLowerCase().includes(q))
        );
      })
    : recentClaims;

  const pageBlock = pageInfo
    ? pageInfo.restricted
      ? `<div class="alert alert--warn"><strong>Restricted page</strong> — extension scripts cannot read this page. Open a normal webpage to capture claims.</div>`
      : `<div class="page-card">
          <div class="title">${escapeHtml(pageInfo.title || 'Untitled page')}</div>
          <div class="url">${escapeHtml(pageInfo.url || '')}</div>
        </div>
        <button id="captureBtn" class="cl-btn cl-btn--lime capture-btn">Capture selected text</button>
        <div id="alertSlot"></div>`
    : `<div class="page-card"><div class="title">Loading page…</div></div>`;

  const items = filtered
    .slice(0, 6)
    .map(
      (c) => `<div class="recent-item" data-id="${c.id}">
        <div class="claim-text">${escapeHtml(previewText(c.claim_text, 140))}</div>
        <div class="meta">
          <span class="status-dot ${c.status}"></span>
          <span>${escapeHtml(STATUS_LABELS[c.status] || c.status)}</span>
          <span>·</span>
          <span>${escapeHtml(formatDate(c.captured_at))}</span>
          ${c.source_url ? `<span>·</span><span>${escapeHtml(hostnameOf(c.source_url))}</span>` : ''}
        </div>
      </div>`,
    )
    .join('');

  app.innerHTML = `
    <div class="popup-header">
      <div class="logo"></div>
      <div>
        <h1>ClaimLens</h1>
        <div class="sub">Read beyond the claim</div>
      </div>
    </div>
    <div class="popup-body cl-scroll">
      ${pageBlock}
      <div class="section-label">
        <span>Recent claims</span>
        <span class="count">${count}</span>
      </div>
      <div class="search-row">
        <input id="search" class="cl-input" placeholder="Search claims…" value="${escapeHtml(query)}" />
      </div>
      ${filtered.length === 0 ? `<div class="empty cl-empty"><h3>No claims yet</h3><p>Select a sentence on any webpage and capture it to begin an investigation.</p></div>` : items}
      ${filtered.length > 0 ? `<div class="recent-item" id="seeAll" style="text-align:center;font-size:12px;color:var(--olive);font-weight:600;cursor:pointer;padding:10px 0;">See all ${count} in workspace →</div>` : ''}
    </div>
    <div class="popup-footer">
      <button class="cl-btn cl-btn--ghost" id="openWorkspace">Workspace</button>
      <button class="cl-btn cl-btn--ghost" id="openOptions">Settings</button>
    </div>
  `;

  const btn = document.getElementById('captureBtn');
  if (btn) btn.addEventListener('click', captureAndSave);
  document.getElementById('openWorkspace').addEventListener('click', () =>
    chrome.runtime.sendMessage({ type: 'OPEN_WORKSPACE' }),
  );
  document.getElementById('openOptions').addEventListener('click', () =>
    chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' }),
  );
  const search = document.getElementById('search');
  if (search) {
    search.addEventListener('input', (e) => {
      query = e.target.value;
      render();
      const s = document.getElementById('search');
      if (s) {
        s.focus();
        s.setSelectionRange(query.length, query.length);
      }
    });
  }
  app.querySelectorAll('.recent-item[data-id]').forEach((el) => {
    el.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'OPEN_WORKSPACE',
      });
      // workspace reads focusClaim from session
      sessionStorage.setItem('claimlens:focusClaim', el.dataset.id);
    });
  });
  const seeAll = document.getElementById('seeAll');
  if (seeAll)
    seeAll.addEventListener('click', () =>
      chrome.runtime.sendMessage({ type: 'OPEN_WORKSPACE' }),
    );
}

// live update when a capture happens in the background while popup is open
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'CLAIM_CAPTURED') {
    loadRecent().then(render);
  }
  if (msg && msg.type === 'CAPTURE_NOTIFICATION') {
    renderAlert('info', msg.title, msg.message);
  }
});

(async () => {
  await Promise.all([loadPageInfo(), loadRecent()]);
  render();
})();
