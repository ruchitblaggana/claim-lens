/*
 * ClaimLens background service worker (Manifest V3).
 * Handles context-menu creation, selection capture via injected script,
 * keyboard commands, and message routing. Persists claims directly to
 * IndexedDB so captures survive service-worker and browser restarts.
 */
import { saveClaim, saveSettings, getSettings } from './db.js';

const CONTEXT_MENU_ID = 'claimlens-save-selection';

function restrictedUrl(url) {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('https://chrome.google.com/webstore') ||
    url.startsWith('https://microsoftedge.microsoft.com/addons')
  );
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Save selection to ClaimLens',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;
  const text = (info.selectionText || '').trim();
  if (!text) {
    notifyBadge('No text selected', 'Select a sentence first, then right-click.');
    return;
  }
  saveSelectionToClaim(text, tab, 'context_menu', '');
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-workspace') {
    chrome.tabs.create({ url: chrome.runtime.getURL('workspace.html') });
    return;
  }
  if (command === 'capture-selection') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || restrictedUrl(tab.url)) {
      notifyBadge('Cannot capture here', 'This browser page is restricted.');
      return;
    }
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const sel = window.getSelection();
          const text = sel ? sel.toString().trim() : '';
          let context = '';
          if (sel && sel.rangeCount && sel.anchorNode && sel.anchorNode.parentElement) {
            const el = sel.anchorNode.parentElement;
            const range = sel.getRangeAt(0);
            const full = el.textContent || '';
            const start = Math.max(0, range.startOffset - 140);
            const end = Math.min(full.length, range.endOffset + 140);
            context = full.slice(start, end).trim();
          }
          return { text, context };
        },
      });
      if (!result || !result.text) {
        notifyBadge(
          'No text selected',
          'Select a sentence on the page, then press the shortcut again.',
        );
        return;
      }
      await saveSelectionToClaim(result.text, tab, 'shortcut', result.context);
    } catch (e) {
      notifyBadge(
        'Capture failed',
        e && e.message ? e.message : 'Could not read the selection.',
      );
    }
  }
});

/**
 * Inject a script into the active tab to read the current selection.
 * The popup calls this via message when it cannot read the selection directly.
 */
async function captureActiveTabSelection() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return { error: 'No active tab.' };
  if (restrictedUrl(tab.url)) return { error: 'RESTRICTED_PAGE', url: tab.url };
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const sel = window.getSelection();
        const text = sel ? sel.toString().trim() : '';
        let context = '';
        if (sel && sel.rangeCount && sel.anchorNode && sel.anchorNode.parentElement) {
          const el = sel.anchorNode.parentElement;
          const range = sel.getRangeAt(0);
          const full = el.textContent || '';
          const start = Math.max(0, range.startOffset - 140);
          const end = Math.min(full.length, range.endOffset + 140);
          context = full.slice(start, end).trim();
        }
        return { text, context, title: document.title, url: location.href };
      },
    });
    if (!res || !res.result) return { error: 'Could not read selection.' };
    return res.result;
  } catch (e) {
    return { error: e && e.message ? e.message : 'Injection failed.' };
  }
}

async function saveSelectionToClaim(text, tab, method, context) {
  const tabTitle = tab && tab.title ? tab.title : '';
  const tabUrl = tab && tab.url ? tab.url : '';
  try {
    const claim = await saveClaim({
      claim_text: text,
      source_title: tabTitle,
      source_url: tabUrl,
      context: context || '',
      capture_method: method,
    });
    const settings = await getSettings();
    if (settings.show_capture_confirmation !== false) {
      notifyBadge('Claim saved', 'Open ClaimLens to add evidence.');
    }
    chrome.runtime
      .sendMessage({ type: 'CLAIM_CAPTURED', claim })
      .catch(() => {});
    return claim;
  } catch (e) {
    if (e && e.code === 'DUPLICATE_CLAIM') {
      notifyBadge('Already saved', 'This claim is already in your library.');
    } else {
      notifyBadge(
        'Save failed',
        e && e.message ? e.message : 'Could not save the claim.',
      );
    }
    throw e;
  }
}

function notifyBadge(title, message) {
  try {
    chrome.action.setBadgeText({ text: '•' });
    chrome.action.setBadgeBackgroundColor({ color: '#D8F36A' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 4000);
  } catch {
    /* ignore */
  }
  chrome.runtime
    .sendMessage({ type: 'CAPTURE_NOTIFICATION', title, message })
    .catch(() => {});
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'CAPTURE_ACTIVE_TAB') {
    captureActiveTabSelection().then(sendResponse).catch((e) =>
      sendResponse({ error: e && e.message ? e.message : 'failed' }),
    );
    return true;
  }
  if (msg.type === 'CAPTURE_AND_SAVE') {
    captureActiveTabSelection()
      .then(async (res) => {
        if (res.error) return sendResponse(res);
        if (!res.text) return sendResponse({ error: 'NO_SELECTION' });
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const claim = await saveSelectionToClaim(
          res.text,
          tab || { url: res.url, title: res.title },
          'toolbar',
          res.context,
        );
        sendResponse({ ok: true, claim });
      })
      .catch((e) =>
        sendResponse({
          error: e && e.code ? e.code : e && e.message ? e.message : 'failed',
        }),
      );
    return true;
  }
  if (msg.type === 'OPEN_WORKSPACE') {
    chrome.tabs.create({ url: chrome.runtime.getURL('workspace.html') });
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return false;
  }
  if (msg.type === 'GET_PAGE_INFO') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!tab) return sendResponse({ error: 'no tab' });
      sendResponse({
        url: tab.url,
        title: tab.title,
        restricted: restrictedUrl(tab.url),
      });
    });
    return true;
  }
  return false;
});
