/**
 * Encrypted API helper (matches API_Base contract: AES payload + Bearer + optional CSRF).
 * Requires: crypto-js.js, LawPortal.apiBase / LawPortal.secureApiBase (see assets/js/api-config.js).
 */
(function () {
  /** Single in-flight refresh — parallel 401s must not each call /api/refresh (rotation invalidates duplicates). */
  let refreshInFlight = null;
  let refreshLoaderDepth = 0;
  let loginRedirectScheduled = false;
  const AUTH_LOADER_ID = 'af-auth-refresh-loader';
  const REFRESH_LOADER_MSG = 'Refreshing session…';

  function buildAuthLoaderHtml(message) {
    const text = message != null ? String(message) : REFRESH_LOADER_MSG;
    return (
      '<div class="af-prefill-loader-inner" role="status" aria-live="polite">' +
      '<div class="spinner-border text-primary af-prefill-spinner" role="presentation"></div>' +
      '<p class="af-prefill-loader-text mb-0">' + text.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
      }) + '</p>' +
      '</div>'
    );
  }

  function showRefreshLoader(message) {
    refreshLoaderDepth += 1;
    if (refreshLoaderDepth > 1) {
      return;
    }
    const msg = message || REFRESH_LOADER_MSG;
    let loader = document.getElementById(AUTH_LOADER_ID);
    if (!loader) {
      loader = document.createElement('div');
      loader.id = AUTH_LOADER_ID;
      loader.className = 'af-prefill-loader af-prefill-loader--viewport af-prefill-loader--auth';
      loader.setAttribute('aria-busy', 'true');
      loader.innerHTML = buildAuthLoaderHtml(msg);
      document.body.appendChild(loader);
    } else {
      const msgEl = loader.querySelector('.af-prefill-loader-text');
      if (msgEl) {
        msgEl.textContent = msg;
      }
      loader.hidden = false;
    }
  }

  function hideRefreshLoader() {
    if (refreshLoaderDepth <= 0) {
      return;
    }
    refreshLoaderDepth -= 1;
    if (refreshLoaderDepth > 0) {
      return;
    }
    const loader = document.getElementById(AUTH_LOADER_ID);
    if (loader) {
      loader.remove();
    }
  }

  async function waitForRefreshIfInFlight() {
    if (refreshInFlight) {
      await refreshInFlight;
    }
  }

  function clearAuthStorage() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('encryption_key');
    sessionStorage.removeItem('csrf_token');
  }

  function isApplicationFormPage() {
    const path = String(window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
    return path.indexOf('application-form') >= 0;
  }

  /** On the multi-tab application form, never hard-redirect mid-fill — use local preview / retry. */
  function shouldSoftFailAuth() {
    return isApplicationFormPage();
  }

  function scheduleLoginRedirect(force) {
    if (!force && shouldSoftFailAuth()) {
      return;
    }
    if (loginRedirectScheduled) {
      return;
    }
    loginRedirectScheduled = true;
    clearAuthStorage();
    const path = window.location.pathname.split('/').pop() || 'application-form.html';
    const returnTo = encodeURIComponent(path + window.location.search);
    window.location.href = 'login.html?return=' + returnTo;
  }

  function getLoginPageUrl() {
    const path = window.location.pathname.split('/').pop() || 'login.html';
    const returnTo = encodeURIComponent(path + window.location.search);
    return 'login.html?return=' + returnTo;
  }

  function getSecureApiBase() {
    if (window.LawPortal && window.LawPortal.secureApiBase) {
      return String(window.LawPortal.secureApiBase).replace(/\/?$/, '/');
    }
    if (window.LawPortal && window.LawPortal.apiBase) {
      return String(window.LawPortal.apiBase).replace(/\/api\/?$/, '/').replace(/\/?$/, '/');
    }
    const path = window.location.pathname.replace(/\\/g, '/');
    const marker = '/law_application';
    const idx = path.toLowerCase().indexOf(marker);
    if (idx !== -1) {
      return window.location.origin + path.substring(0, idx + marker.length) + '/backend/public/';
    }
    return new URL('backend/public/', window.location.href).href.replace(/\/?$/, '/');
  }

  function isRefreshEndpoint(url) {
    return /\/api\/refresh(?:\?|$)/i.test(String(url || ''));
  }

  /** Seconds before JWT exp to treat access token as stale (refresh before API burst). */
  const ACCESS_EXPIRY_BUFFER_SEC = 60;

  function parseJwtPayload(token) {
    if (!token || typeof token !== 'string') {
      return null;
    }
    try {
      const parts = token.split('.');
      if (parts.length < 2) {
        return null;
      }
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '==='.slice((base64.length + 3) % 4);
      const json = atob(padded);
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  function isAccessTokenExpired(bufferSec) {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return true;
    }
    const payload = parseJwtPayload(token);
    if (!payload || payload.exp == null) {
      return true;
    }
    if (payload.type === 'refresh') {
      return true;
    }
    const buffer = bufferSec != null ? bufferSec : ACCESS_EXPIRY_BUFFER_SEC;
    return payload.exp * 1000 <= Date.now() + buffer * 1000;
  }

  /**
   * Refresh access token once; concurrent callers share the same promise.
   * @returns {Promise<boolean>} true when a usable access_token is available
   */
  async function refreshAccessToken() {
    if (refreshInFlight) {
      return refreshInFlight;
    }

    const refreshToken = localStorage.getItem('refresh_token');
    const base = getSecureApiBase();
    if (!refreshToken || !base) {
      return false;
    }

    showRefreshLoader();

    refreshInFlight = (async function () {
      try {
        const refreshRes = await fetch(base + 'api/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (!refreshRes.ok) {
          if ((refreshRes.status === 401 || refreshRes.status === 403) && !shouldSoftFailAuth()) {
            scheduleLoginRedirect(true);
          }
          return false;
        }

        const refreshResult = await refreshRes.json();
        if (refreshResult.access_token) {
          localStorage.setItem('access_token', refreshResult.access_token);
        }
        if (refreshResult.refresh_token) {
          localStorage.setItem('refresh_token', refreshResult.refresh_token);
        }
        return !!localStorage.getItem('access_token');
      } catch (e) {
        console.error('SecureAPI: token refresh failed', e);
        return false;
      } finally {
        refreshInFlight = null;
        hideRefreshLoader();
      }
    })();

    return refreshInFlight;
  }

  /**
   * Refresh when access is missing/expired so protected APIs (details, getTOKENS) are not sent with a dead token.
   * @returns {Promise<boolean>}
   */
  async function ensureAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    const accessToken = localStorage.getItem('access_token');

    if (!accessToken) {
      if (!refreshToken) {
        return false;
      }
      return refreshAccessToken();
    }

    if (isAccessTokenExpired()) {
      if (!refreshToken) {
        return false;
      }
      return refreshAccessToken();
    }

    return true;
  }

  /**
   * First load in this tab: one refresh to align access jti with server session, then expiry-based refresh only.
   */
  async function prepareSessionAuth() {
    const refreshToken = localStorage.getItem('refresh_token');
    const synced = sessionStorage.getItem('af_tokens_synced') === '1';
    if (refreshToken && !synced) {
      const ok = await refreshAccessToken();
      if (ok) {
        sessionStorage.setItem('af_tokens_synced', '1');
      }
      return ok;
    }
    return ensureAccessToken();
  }

  window.SecureAPI = {
    encrypt: function (data, key) {
      const iv = CryptoJS.lib.WordArray.random(16);
      const encrypted = CryptoJS.AES.encrypt(data, CryptoJS.enc.Hex.parse(key), {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      const combined = iv.concat(encrypted.ciphertext);
      return CryptoJS.enc.Base64.stringify(combined);
    },

    decrypt: function (base64Data, key) {
      const encrypted = CryptoJS.enc.Base64.parse(base64Data);
      const iv = CryptoJS.lib.WordArray.create(encrypted.words.slice(0, 4), 16);
      const ciphertext = CryptoJS.lib.WordArray.create(
        encrypted.words.slice(4),
        encrypted.sigBytes - 16
      );
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: ciphertext },
        CryptoJS.enc.Hex.parse(key),
        { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
      );
      return decrypted.toString(CryptoJS.enc.Utf8);
    },

    /** Prefer decrypted payload; fall back to plaintext `data` when decrypt fails (dev / key mismatch). */
    unwrapResponse: function (result) {
      if (!result || typeof result !== 'object') return result;
      if (result.payload && sessionStorage.getItem('encryption_key')) {
        try {
          const key = sessionStorage.getItem('encryption_key');
          const decrypted = SecureAPI.decrypt(result.payload, key);
          if (decrypted) return JSON.parse(decrypted);
        } catch (e) {
          console.warn('SecureAPI: using plaintext response.data fallback', e);
        }
      }
      if (result.data !== undefined && result.data !== null) {
        if (typeof result.data === 'object' && !Array.isArray(result.data)) {
          return result.data;
        }
        return { data: result.data, total_count: result.total_count };
      }
      return result;
    },

    refreshAccessToken: refreshAccessToken,
    ensureAccessToken: ensureAccessToken,
    prepareSessionAuth: prepareSessionAuth,
    isAccessTokenExpired: isAccessTokenExpired,
    shouldSoftFailAuth: shouldSoftFailAuth,
    clearAuthStorage: clearAuthStorage,
    scheduleLoginRedirect: scheduleLoginRedirect,
    getLoginPageUrl: getLoginPageUrl,

    /**
     * @param {string} url
     * @param {string} method
     * @param {object|null} data - Encrypted as JSON body when encryption_key is set (POST).
     * @param {object} [extraHeaders] - Optional extra request headers (e.g. X-APP-KEY).
     */
    request: async function (url, method, data, extraHeaders) {
      const encryptionKey = sessionStorage.getItem('encryption_key');
      const csrfToken = sessionStorage.getItem('csrf_token') || '';

      let payload = null;
      let requestUrl = url;
      let requestBody = null;

      if (data && encryptionKey && typeof data === 'object' && Object.keys(data).length > 0) {
        payload = SecureAPI.encrypt(JSON.stringify(data), encryptionKey);
      }

      function buildHeaders() {
        const token = localStorage.getItem('access_token');
        const headers = {
          'Content-Type': 'application/json',
          Authorization: token ? 'Bearer ' + token : '',
          'X-CSRF-Token': csrfToken
        };
        if (extraHeaders && typeof extraHeaders === 'object') {
          Object.keys(extraHeaders).forEach(function (k) {
            const v = extraHeaders[k];
            if (v !== undefined && v !== null && String(v) !== '') {
              headers[k] = v;
            }
          });
        }
        return headers;
      }

      async function performFetch(headers) {
        let fetchUrl = requestUrl;
        let fetchBody = requestBody;

        if (method === 'GET' && payload) {
          const urlParams = new URLSearchParams();
          urlParams.append('payload', payload);
          fetchUrl = url + (url.indexOf('?') >= 0 ? '&' : '?') + urlParams.toString();
        } else if (payload) {
          fetchBody = JSON.stringify({ payload: payload });
        } else if (data && method !== 'GET') {
          fetchBody = JSON.stringify(data);
        }

        return fetch(fetchUrl, {
          method: method,
          credentials: 'include',
          headers: headers,
          body: fetchBody
        });
      }

      if (payload) {
        requestBody = JSON.stringify({ payload: payload });
      } else if (data && method !== 'GET') {
        requestBody = JSON.stringify(data);
      }

      await waitForRefreshIfInFlight();

      let headers = buildHeaders();
      let response = await performFetch(headers);

      if (response.status === 401 && !isRefreshEndpoint(url)) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          headers = buildHeaders();
          response = await performFetch(headers);
        } else if (!localStorage.getItem('access_token') && !shouldSoftFailAuth()) {
          scheduleLoginRedirect(true);
        }
      }

      const result = await response.json();
      const unwrapped = SecureAPI.unwrapResponse(result);

      if (!response.ok && unwrapped && !unwrapped.error) {
        return Object.assign({ ok: false }, unwrapped, {
          error: unwrapped.message || 'Request failed.'
        });
      }

      return unwrapped;
    }
  };
})();
