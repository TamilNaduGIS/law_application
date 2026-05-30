/**
 * Encrypted API helper (matches API_Base contract: AES payload + Bearer + optional CSRF).
 * Requires: crypto-js.js, LawPortal.apiBase / LawPortal.secureApiBase (see assets/js/api-config.js).
 */
(function () {
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

    /**
     * @param {string} url
     * @param {string} method
     * @param {object|null} data - Encrypted as JSON body when encryption_key is set (POST).
     * @param {object} [extraHeaders] - Optional extra request headers (e.g. X-APP-KEY).
     */
    request: async function (url, method, data, extraHeaders) {
      const token = localStorage.getItem('access_token');
      const encryptionKey = sessionStorage.getItem('encryption_key');
      const csrfToken = sessionStorage.getItem('csrf_token') || '';

      let payload = null;
      let requestUrl = url;
      let requestBody = null;

      if (data && encryptionKey && typeof data === 'object' && Object.keys(data).length > 0) {
        payload = SecureAPI.encrypt(JSON.stringify(data), encryptionKey);
      }

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

      if (method === 'GET' && payload) {
        const urlParams = new URLSearchParams();
        urlParams.append('payload', payload);
        requestUrl = url + (url.indexOf('?') >= 0 ? '&' : '?') + urlParams.toString();
      } else if (payload) {
        requestBody = JSON.stringify({ payload: payload });
      } else if (data && method !== 'GET') {
        requestBody = JSON.stringify(data);
      }

      let response = await fetch(requestUrl, {
        method: method,
        credentials: 'include',
        headers: headers,
        body: requestBody
      });

      if (response.status === 401) {
        const base = getSecureApiBase();
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken && base) {
          try {
            const refreshRes = await fetch(base + 'api/refresh', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: refreshToken })
            });
            if (refreshRes.ok) {
              const refreshResult = await refreshRes.json();
              if (refreshResult.access_token) {
                localStorage.setItem('access_token', refreshResult.access_token);
              }
              if (refreshResult.refresh_token) {
                localStorage.setItem('refresh_token', refreshResult.refresh_token);
              }
              headers['Authorization'] = 'Bearer ' + (refreshResult.access_token || localStorage.getItem('access_token'));
              let retryUrl = url;
              let retryBody = requestBody;
              if (method === 'GET' && payload) {
                const urlParams = new URLSearchParams();
                urlParams.append('payload', payload);
                retryUrl = url + (url.indexOf('?') >= 0 ? '&' : '?') + urlParams.toString();
              }
              response = await fetch(retryUrl, { method: method, credentials: 'include', headers: headers, body: retryBody });
            }
          } catch (e) {
            console.error(e);
          }
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
