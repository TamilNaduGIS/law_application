/**
 * Portal session helpers (auth state in sessionStorage / localStorage tokens).
 * Application and profile data use the API — not a client-side DB.
 */
(function (global) {
    'use strict';

    try {
        global.localStorage.removeItem('lawRecruitmentDB');
        global.sessionStorage.removeItem('lawRecruitmentSession');
    } catch (e) { /* ignore */ }

    const SESSION_KEYS = [
        'isLoggedIn', 'applicantId', 'enrolmentNo', 'mobile', 'userId', 'advocateName',
        'encryption_key', 'csrf_token', 'selectedPost', 'selectedJobId', 'courtBench',
        'selectedVacancies', 'tempAadhaar', 'applicantAadhaar'
    ];

    function isAuthenticated() {
        return !!global.localStorage.getItem('access_token')
            && global.sessionStorage.getItem('isLoggedIn') === 'true';
    }

    const APPLY_POST_URL = 'apply-post.html';
    const LOGIN_URL = 'login.html';
    const ALREADY_LOGGED_IN_MESSAGE = 'You are already logged in. Redirecting to Apply Post page.';

    function redirectAuthenticatedUser(options) {
        if (!isAuthenticated()) {
            return false;
        }

        const opts = options || {};
        const target = opts.target || APPLY_POST_URL;
        const message = opts.message || ALREADY_LOGGED_IN_MESSAGE;
        const delayMs = typeof opts.delayMs === 'number' ? opts.delayMs : 1600;

        function go() {
            global.location.replace(target);
        }

        if (opts.showToast === false) {
            go();
            return true;
        }

        if (typeof global.Swal !== 'undefined') {
            global.Swal.fire({
                icon: 'info',
                title: 'Already logged in',
                text: message,
                timer: delayMs,
                showConfirmButton: false,
                allowOutsideClick: false
            });
            setTimeout(go, delayMs);
            return true;
        }

        if (global.LawPortal && typeof global.LawPortal.alert === 'function') {
            global.LawPortal.alert({
                icon: 'info',
                title: 'Already logged in',
                text: message
            });
            setTimeout(go, delayMs);
            return true;
        }

        go();
        return true;
    }

    const AppData = {
        getSession() {
            if (!this.isLoggedIn()) {
                return null;
            }
            const applicantId = global.sessionStorage.getItem('applicantId') || '';
            const legacyUserId = global.sessionStorage.getItem('userId') || '';
            return {
                applicantId: applicantId,
                userId: applicantId || legacyUserId,
                enrolmentNo: global.sessionStorage.getItem('enrolmentNo') || '',
                mobile: global.sessionStorage.getItem('mobile') || '',
                advocateName: global.sessionStorage.getItem('advocateName') || ''
            };
        },

        isLoggedIn() {
            return isAuthenticated();
        },

        logout() {
            global.localStorage.removeItem('access_token');
            global.localStorage.removeItem('refresh_token');
            SESSION_KEYS.forEach(function (key) {
                global.sessionStorage.removeItem(key);
            });
        },

        navigateToLogin(options) {
            if (this.isLoggedIn()) {
                redirectAuthenticatedUser(options);
                return;
            }
            const opts = options || {};
            global.location.href = opts.loginUrl || LOGIN_URL;
        },

        redirectIfAuthenticated(options) {
            return redirectAuthenticatedUser(options);
        },

        requireGuestForLogin(options) {
            return !redirectAuthenticatedUser(options);
        },

        requireAuth(loginUrl) {
            if (this.isLoggedIn()) {
                return this.getSession();
            }
            const dest = loginUrl || 'login.html';
            const returnTo = encodeURIComponent(
                global.location.pathname.split('/').pop() + global.location.search
            );
            global.location.href = dest + (dest.includes('?') ? '&' : '?') + 'return=' + returnTo;
            return null;
        },

        /** Session fields for tab 1 prefill until profile API is wired. */
        getPersonalProfile() {
            const session = this.getSession();
            if (!session) {
                return null;
            }
            return {
                enrolmentNo: session.enrolmentNo,
                mobile: session.mobile,
                advocateName: session.advocateName || ''
            };
        },

        getApplication() {
            return null;
        },

        saveApplication() {
            /* persisted via API when available */
        },

        updateUserProfile() {
            /* persisted via API when available */
        },

        submitApplication(userId, jobId, payload) {
            return {
                id: 'pending',
                userId: userId,
                jobId: jobId,
                status: 'submitted',
                payload: payload
            };
        }
    };

    global.AppData = AppData;
})(typeof window !== 'undefined' ? window : global);

/* Back to top (pages that include this script and #backToTopBtn) */
(function () {
    const backToTopBtn = document.getElementById('backToTopBtn');
    if (!backToTopBtn) {
        return;
    }

    window.addEventListener('scroll', function () {
        if (window.scrollY > 250) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });

    backToTopBtn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
})();
