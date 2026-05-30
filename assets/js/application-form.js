/**
 * Application form bootstrap — initializes all tabs and shared modules.
 */
(function (AF) {
    if (window.LawPortal && typeof window.LawPortal.bindHeaderUser === 'function') {
        window.LawPortal.bindHeaderUser();
    } else {
        const el = document.getElementById('userDisplayName');
        if (el) {
            el.textContent = sessionStorage.getItem('advocateName')
                || sessionStorage.getItem('enrolmentNo')
                || sessionStorage.getItem('mobile')
                || 'Applicant';
        }
    }

    PortalNav.mount('portalNavMount', {
        activePage: 'application',
        userId: AF.config.userId,
        jobId: AF.config.jobId
    });

    AF.tab1.init();
    AF.tab2.init();
    AF.tab3.init();
    AF.tab4.init();

    AF.nav.bindTabButtons();

    const formMode = AF.config.formMode;
    const existingApp = AF.config.existingApp;

    if (formMode === 'full') {
        if (existingApp && existingApp.status === 'draft') {
            AF.data.loadApplicationData(existingApp);
        } else {
            AF.tab1.prefillTab1FromDb();
            AF.lists.renderAll();
        }
    } else if (formMode === 'tab1Only') {
        AF.tab1.prefillTab1FromDb();
    } else if (formMode === 'previewOnly') {
        AF.data.loadApplicationData(existingApp);
    }

    AF.data.mountJobBanner();
    AF.files.initFileUploadButtons(document);
    AF.nav.switchTab(1);
})(window.ApplicationForm);
