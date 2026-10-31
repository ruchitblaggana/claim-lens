/*
 * ClaimLens content script — injected on user action (activeTab / scripting).
 * Responsibilities:
 *  - show a transient capture confirmation toast
 *  - answer "GET_CONTEXT" messages from the popup/workspace with current selection
 *  - provide a lightweight reading-companion overlay listing claims saved
 *    from the current page (opened on demand via "OPEN_COMPANION")
 * The script does NOT auto-scan pages, add persistent banners, or modify
 * page content. All actions are user-initiated.
 */

(function () {
  const ROOT_ID = 'claimlens-root';
  let companionOpen = false;

  function ensureRoot() {
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = ROOT_ID;
      root.style.cssText =
        'all:initial;position:fixed;z-index:2147483647;pointer-events:none;' +
        'top:0;left:0;width:0;height:0;';
      document.documentElement.appendChild(root);
    }
    return root;
  }

  function showToast(title, message) {
    const root = ensureRoot();
    const toast = document.createElement('div');
    toast.style.cssText =
      'position:fixed;bottom:20px;right:20px;max-width:320px;' +
      'background:#202522;color:#F6F4EC;font-family:Inter,Segoe UI,system-ui,sans-serif;' +
      'font-size:13px;line-height:1.5;padding:12px 16px;border-radius:8px;' +
      'box-shadow:0 6px 20px rgba(32,37,34,0.25);pointer-events:auto;' +
      'opacity:0;transform:translateY(8px);transition:opacity .2s ease, transform .2s ease;';
    const t = document.createElement('div');
    t.textContent = title;
    t.style.cssText = 'font-weight:600;margin-bottom:2px;';
    const m = document.createElement('div');
    m.textContent = message;
    m.style.cssText = 'opacity:0.85;';
    toast.appendChild(t);
    toast.appendChild(m);
    root.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  function getSelectionContext() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return { text: '', context: '' };
    const text = sel.toString().trim();
    let context = '';
    if (sel.anchorNode && sel.anchorNode.parentElement) {
      const el = sel.anchorNode.parentElement;
      const range = sel.getRangeAt(0);
      const full = el.textContent || '';
      const start = Math.max(0, range.startOffset - 140);
      const end = Math.min(full.length, range.endOffset + 140);
      context = full.slice(start, end).trim();
    }
    return { text, context, title: document.title, url: location.href };
  }

  function buildCompanion(claims) {
    const root = ensureRoot();
    const panel = document.createElement('div');
    panel.style.cssText =
      'position:fixed;top:16px;right:16px;width:360px;max-height:70vh;' +
      'background:#F6F4EC;color:#202522;font-family:Inter,Segoe UI,system-ui,sans-serif;' +
      'font-size:13px;line-height:1.5;padding:0;border-radius:8px;' +
      'box-shadow:0 10px 30px rgba(32,37,34,0.2);pointer-events:auto;' +
      'border:1px solid #DCDDD3;overflow:hidden;display:flex;flex-direction:column;';
    const header = document.createElement('div');
    header.style.cssText =
      'padding:12px 14px;border-bottom:1px solid #DCDDD3;display:flex;' +
      'justify-content:space-between;align-items:center;background:#202522;color:#F6F4EC;';
    const title = document.createElement('strong');
    title.textContent = 'ClaimLens — this page';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText =
      'background:none;border:none;color:#F6F4EC;cursor:pointer;font-size:16px;padding:0 4px;';
    closeBtn.onclick = () => {
      panel.remove();
      companionOpen = false;
    };
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const body = document.createElement('div');
    body.style.cssText = 'padding:10px 14px;overflow:auto;';
    if (!claims.length) {
      const empty = document.createElement('div');
      empty.textContent =
        'No saved claims from this page yet. Select a sentence and use the ClaimLens toolbar or right-click menu to capture one.';
      empty.style.cssText = 'color:#6D7470;padding:12px 0;';
      body.appendChild(empty);
    } else {
      claims.forEach((c) => {
        const item = document.createElement('div');
        item.style.cssText =
          'padding:10px 0;border-bottom:1px solid #ECECE2;';
        const txt = document.createElement('div');
        txt.textContent = c.claim_text;
        txt.style.cssText =
          'font-family:Georgia,serif;font-size:14px;margin-bottom:4px;';
        const meta = document.createElement('div');
        meta.style.cssText =
          'font-size:11px;color:#6D7470;font-family:monospace;';
        meta.textContent =
          (c.status || 'unreviewed') + ' · ' + new Date(c.captured_at).toLocaleDateString();
        const open = document.createElement('a');
        open.textContent = 'Open in workspace →';
        open.style.cssText = 'display:inline-block;margin-top:6px;font-size:12px;';
        open.href = '#';
        open.onclick = (ev) => {
          ev.preventDefault();
          chrome.runtime.sendMessage({
            type: 'OPEN_CLAIM',
            claimId: c.id,
          });
        };
        item.appendChild(txt);
        item.appendChild(meta);
        item.appendChild(open);
        body.appendChild(item);
      });
    }
    panel.appendChild(body);
    root.appendChild(panel);
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'SHOW_TOAST') {
      showToast(msg.title || 'ClaimLens', msg.message || '');
      sendResponse({ ok: true });
      return false;
    }
    if (msg.type === 'GET_CONTEXT') {
      sendResponse(getSelectionContext());
      return false;
    }
    if (msg.type === 'OPEN_COMPANION') {
      if (companionOpen) return false;
      companionOpen = true;
      buildCompanion(msg.claims || []);
      sendResponse({ ok: true });
      return false;
    }
    if (msg.type === 'PING_CONTENT') {
      sendResponse({ ok: true, url: location.href });
      return false;
    }
    return false;
  });

  // signal that the content script is alive
  chrome.runtime.sendMessage({ type: 'CONTENT_READY', url: location.href }).catch(() => {});
})();
