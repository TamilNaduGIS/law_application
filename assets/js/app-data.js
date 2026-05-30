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
