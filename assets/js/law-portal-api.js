/**
 * Law portal API client — API_Base + SecureAPI (plaintext before login, encrypted after).
 */
(function (global) {
    'use strict';

    function normalizeResponse(result) {
        if (result === null || result === undefined) {
            return { ok: false, error: 'Invalid response from server.' };
        }

        if (Array.isArray(result)) {
            return { ok: true, data: result };
        }

        if (typeof result !== 'object') {
            return { ok: false, error: 'Invalid response from server.' };
        }

        if (result.ok === true || result.ok === false) {
            return result;
        }

        if (result.error) {
            return Object.assign({ ok: false }, result);
        }

        if (result.session || result.message || result.applicant_id !== undefined) {
            return Object.assign({ ok: true }, result);
        }

        return Object.assign({ ok: true }, result);
    }

    function saveAuthSession(session) {
        if (!session || typeof session !== 'object') {
            return;
        }

        if (session.access_token) {
            global.localStorage.setItem('access_token', session.access_token);
        }
        if (session.refresh_token) {
            global.localStorage.setItem('refresh_token', session.refresh_token);
        }
        if (session.encryption_key) {
            global.sessionStorage.setItem('encryption_key', session.encryption_key);
        }
        if (session.csrf_token) {
            global.sessionStorage.setItem('csrf_token', session.csrf_token);
        }

        global.sessionStorage.setItem('isLoggedIn', 'true');
        global.sessionStorage.setItem('applicantId', String(session.applicant_id || ''));
        global.sessionStorage.setItem('enrolmentNo', session.enrollment_no || session.enrolmentNo || '');
        global.sessionStorage.setItem('mobile', session.mobile || '');
    }

    function apiRequest(path, method, data) {
        const url = global.LawPortal.apiUrl(path);
        const m = (method || 'GET').toUpperCase();

        if (!global.SecureAPI || typeof global.SecureAPI.request !== 'function') {
            return Promise.reject(new Error('SecureAPI is not loaded.'));
        }

        return global.SecureAPI.request(url, m, data || null)
            .then(function (result) {
                return normalizeResponse(result);
            });
    }

    function loadCaptcha() {
        const url = global.LawPortal.apiUrl('captcha');
        return fetch(url, { method: 'GET', credentials: 'include' })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                const captcha = data.captcha || data;
                const image = captcha.image || captcha.datauri || data.image || '';
                const token = captcha.token || data.token || '';
                return { image: image, token: token };
            });
    }

    function bindCaptchaUi(imageSelector, tokenSelector, refreshSelector) {
        const $img = imageSelector ? $(imageSelector) : $('#captchaImage');
        const $token = tokenSelector ? $(tokenSelector) : $('#captchaToken');
        const $refresh = refreshSelector ? $(refreshSelector) : $('#captchaImage, .captcha-refresh');

        function refresh() {
            loadCaptcha()
                .then(function (c) {
                    if ($img.length && c.image) {
                        $img.attr('src', c.image);
                    }
                    if ($token.length) {
                        $token.val(c.token);
                    }
                })
                .catch(function (err) {
                    console.error('CAPTCHA load failed', err);
                });
        }

        refresh();
        $img.off('click.captcha').on('click.captcha', refresh);
        $refresh.off('click.captcha').on('click.captcha', refresh);

        return { refresh: refresh };
    }

    global.LawPortal = global.LawPortal || {};
    global.LawPortal.normalizeResponse = normalizeResponse;
    global.LawPortal.saveAuthSession = saveAuthSession;
    global.LawPortal.apiRequest = apiRequest;
    global.LawPortal.loadCaptcha = loadCaptcha;
    global.LawPortal.bindCaptchaUi = bindCaptchaUi;

    /**
     * jQuery-compatible deferred for legacy login/sign-up code.
     */
    global.LawPortal.apiAjax = function (path, method, data) {
        const deferred = $.Deferred();

        apiRequest(path, method, data)
            .then(function (res) {
                if (res && res.ok) {
                    deferred.resolve(res);
                } else {
                    deferred.reject({
                        responseJSON: res,
                        status: 400
                    });
                }
            })
            .catch(function (err) {
                deferred.reject({
                    responseJSON: { ok: false, error: err.message || 'Request failed.' },
                    status: 0
                });
            });

        return deferred.promise();
    };
})(typeof window !== 'undefined' ? window : global);
