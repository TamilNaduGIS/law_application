/**
 * Application form bootstrap — initializes all tabs and shared modules.
 */
(function (AF) {
    if (window.AppData && typeof AppData.requireAuth === 'function') {
        AppData.requireAuth('login.html');
    }
    function initAuthenticatedTopbar() {
        const label = sessionStorage.getItem('advocateName')
            || sessionStorage.getItem('enrolmentNo')
            || sessionStorage.getItem('mobile')
            || 'Applicant';
        const userEl = document.getElementById('userDisplayName');
        if (userEl && userEl.textContent === 'Applicant') {
            userEl.textContent = label;
        }

        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', function (e) {
                e.preventDefault();
                if (window.AppData && typeof AppData.logout === 'function') {
                    AppData.logout();
                }
                window.location.href = 'index.html';
            });
        }
    }

    initAuthenticatedTopbar();

    let bootstrapDone = false;

    function bootstrapForm(applicantRow, tab2Data, selectionsResult) {
        if (bootstrapDone) return;
        bootstrapDone = true;

        const isSubmitted = !!(selectionsResult && selectionsResult.submitted)
            || global.sessionStorage.getItem('applicationSubmitted') === 'true';

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

        if (isSubmitted && AF.nav && typeof AF.nav.lockSubmittedForm === 'function') {
            AF.config.isSubmitted = true;
            AF.nav.lockSubmittedForm();
        }

        AF.nav.switchTab(1);
    }

    function startForm() {
        const applicantId = AF.config.userId;
        const loadApplicant = AF.api && typeof AF.api.loadApplicantDetails === 'function'
            && window.LawPortal && typeof LawPortal.apiRequest === 'function';
        const loadTab2 = AF.api && typeof AF.api.loadTab2Qualifications === 'function';
        const loadSelections = AF.api && typeof AF.api.loadVacancySelections === 'function';

        if (!loadApplicant) {
            bootstrapForm(null);
            return;
        }

        const applicantChain = AF.api.loadApplicantDetails(applicantId).then(function (row) {
            if (!loadSelections) {
                return { row: row, selections: null };
            }
            return AF.api.loadVacancySelections(applicantId).then(function (selections) {
                return { row: row, selections: selections };
            });
        });

        const tasks = [applicantChain];
        if (loadTab2) {
            tasks.push(AF.api.loadTab2Qualifications(applicantId));
        }

        Promise.all(tasks)
            .then(function (results) {
                const applicantBundle = results[0] || {};
                bootstrapForm(applicantBundle.row, results[1], applicantBundle.selections);
            })
            .catch(function (err) {
                console.warn('Application form load:', err && err.message ? err.message : err);
                bootstrapForm(null);
            });
    }

    startForm();
})(window.ApplicationForm);
