/**
 * Shared portal navigation (Home, Application, Logout).
 */
(function (global) {
    function renderPortalNav(options) {
        const opts = options || {};
        const active = opts.activePage || '';
        const session = global.AppData && typeof AppData.getSession === 'function'
            ? AppData.getSession()
            : null;
        const userId = opts.userId || (session ? session.userId : '');
        const jobId = opts.jobId || sessionStorage.getItem('selectedJobId') || '';

        let appHref = 'application-form.html?from=menu';
        if (userId) appHref += '&userId=' + encodeURIComponent(userId);
        if (jobId) appHref += '&jobId=' + encodeURIComponent(jobId);

        return (
            '<nav class="navbar navbar-expand-lg navbar-dark navbar-portal">' +
            '<div class="container">' +
            '<a class="navbar-brand" href="job-post.html"><i class="fas fa-scale-balanced me-2"></i>Law Officers Portal</a>' +
            '<button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#portalNav">' +
            '<span class="navbar-toggler-icon"></span></button>' +
            '<div class="collapse navbar-collapse" id="portalNav">' +
            '<ul class="navbar-nav ms-auto">' +
            '<li class="nav-item"><a class="nav-link' + (active === 'home' ? ' active' : '') + '" href="index.html">Home</a></li>' +
            '<li class="nav-item"><a class="nav-link' + (active === 'application' ? ' active' : '') + '" href="' + appHref + '">Application</a></li>' +
            '<li class="nav-item"><a class="nav-link" href="#" id="portalLogoutBtn">Logout</a></li>' +
            '</ul></div></div></nav>'
        );
    }

    function mountPortalNav(containerId, options) {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = renderPortalNav(options);

        const logoutBtn = document.getElementById('portalLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function (e) {
                e.preventDefault();
                if (global.AppData && typeof AppData.logout === 'function') {
                    AppData.logout();
                }
                global.location.href = 'login.html';
            });
        }
    }

    global.PortalNav = {
        render: renderPortalNav,
        mount: mountPortalNav
    };
})(window);
