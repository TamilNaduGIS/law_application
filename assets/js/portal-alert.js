/**
 * Portal alert helper — SweetAlert2 with native alert fallback.
 */
(function (global) {
    'use strict';

    const DEFAULT_CONFIRM_COLOR = '#1f3291';

    function showAlert(options) {
        const opts = typeof options === 'string' ? { text: options } : (options || {});
        const title = opts.title || '';
        const text = opts.text || opts.message || '';
        const icon = opts.icon || 'warning';

        if (typeof global.Swal !== 'undefined') {
            return global.Swal.fire({
                icon: icon,
                title: title || undefined,
                text: text,
                confirmButtonText: opts.confirmButtonText || 'OK',
                confirmButtonColor: opts.confirmButtonColor || DEFAULT_CONFIRM_COLOR,
                allowOutsideClick: opts.allowOutsideClick !== false,
                customClass: opts.customClass
            });
        }

        global.alert(text || title);
        return Promise.resolve();
    }

    global.LawPortal = global.LawPortal || {};
    global.LawPortal.alert = showAlert;
})(typeof window !== 'undefined' ? window : global);
