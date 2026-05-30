/**
 * Application form bootstrap — initializes all tabs and shared modules.
 */
(function (AF) {
    if (window.AppData && typeof AppData.requireAuth === 'function') {
        AppData.requireAuth('login.html');
    }

    let bootstrapDone = false;

    function bootstrapForm(applicantRow, tab2Data) {
        if (bootstrapDone) return;
        bootstrapDone = true;

        PortalNav.mount('portalNavMount', {
            activePage: 'application',
            userId: AF.config.userId,
            jobId: AF.config.jobId
        });

        if (tab2Data && AF.api && typeof AF.api.applyTab2QualificationsToState === 'function') {
            AF.api.applyTab2QualificationsToState(tab2Data, { replace: true });
        }

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
            } else if (applicantRow && AF.api && typeof AF.api.mapToApplicationPayload === 'function') {
                const payload = AF.api.mapToApplicationPayload(applicantRow);
                if (payload) {
                    AF.data.loadApplicationData(payload);
                } else {
                    AF.tab1.prefillTab1FromSession();
                    AF.lists.renderAll();
                }
            } else {
                AF.tab1.prefillTab1FromSession();
                AF.lists.renderAll();
            }
        } else if (formMode === 'tab1Only') {
            if (applicantRow && AF.api) {
                const payload = AF.api.mapToApplicationPayload(applicantRow);
                if (payload && payload.personal) AF.tab1.fillPersonal(payload.personal);
            } else {
                AF.tab1.prefillTab1FromSession();
            }
        } else if (formMode === 'previewOnly') {
            AF.data.loadApplicationData(existingApp);
        }

        AF.data.mountJobBanner();
        AF.files.initFileUploadButtons(document);
        AF.nav.switchTab(1);
    }

    function startForm() {
        const applicantId = AF.config.userId;
        const loadApplicant = AF.api && typeof AF.api.loadApplicantDetails === 'function'
            && window.LawPortal && typeof LawPortal.apiRequest === 'function';
        const loadTab2 = AF.api && typeof AF.api.loadTab2Qualifications === 'function';

        if (!loadApplicant) {
            bootstrapForm(null);
            return;
        }

        const tasks = [AF.api.loadApplicantDetails(applicantId)];
        if (loadTab2) {
            tasks.push(AF.api.loadTab2Qualifications(applicantId));
        }

        Promise.all(tasks)
            .then(function (results) {
                bootstrapForm(results[0], results[1]);
            })
            .catch(function (err) {
                console.warn('Application form load:', err && err.message ? err.message : err);
                bootstrapForm(null);
            });
    }

    startForm();
})(window.ApplicationForm);
