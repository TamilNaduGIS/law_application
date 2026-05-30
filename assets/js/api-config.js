/**
 * API_Base public API URL (secure PHP API under /API_Base/public/api).
 */
(function (global) {
    function resolveApiBase() {
        const path = global.location.pathname.replace(/\\/g, '/');
        const marker = '/law_application';
        const lower = path.toLowerCase();
        const idx = lower.indexOf(marker);

        if (idx !== -1) {
            return global.location.origin + path.substring(0, idx + marker.length) + '/backend/public/api';
        }

        return new URL('backend/public/api', global.location.href).href.replace(/\/$/, '');
    }

    global.LawPortal = global.LawPortal || {};
    global.LawPortal.apiBase = resolveApiBase();
    global.LawPortal.secureApiBase = global.LawPortal.apiBase.replace(/\/api\/?$/, '/');

    global.LawPortal.apiUrl = function (path) {
        const base = global.LawPortal.apiBase.replace(/\/$/, '');
        const segment = String(path || '').replace(/^\//, '');
        return base + '/' + segment;
    };
})(typeof window !== 'undefined' ? window : global);
