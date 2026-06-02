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

    function hydrateSubmittedApplicationView() {
        if (!AF.config.readOnlyView || !AF.tab4 || typeof AF.tab4.loadAndPopulatePreview !== 'function') {
            return Promise.resolve();
        }
        return AF.tab4.loadAndPopulatePreview().then(function () {
            if (typeof AF.tab4.hydrateWizardTabsFromPreview === 'function') {
                AF.tab4.hydrateWizardTabsFromPreview();
            }
        }).catch(function (err) {
            console.warn('Submitted application hydrate:', err && err.message ? err.message : err);
        });
    }

    function bootstrapForm(applicantRow, tab2Data) {
        if (bootstrapDone) return;
        bootstrapDone = true;

        PortalNav.mount('portalNavMount', {
            activePage: 'application',
            userId: AF.config.userId,
            jobId: AF.config.jobId
        });

        AF.tab1.init();
        AF.tab2.init();
        AF.tab3.init();
        AF.tab4.init();

        if (tab2Data && AF.api && typeof AF.api.applyTab2QualificationsToState === 'function') {
            AF.api.applyTab2QualificationsToState(tab2Data, { replace: true });
        }

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
        if (typeof AF.files.initAllFileUploadValidation === 'function') {
            AF.files.initAllFileUploadValidation();
        }
        if (typeof AF.files.initUploadReplacementUi === 'function') {
            AF.files.initUploadReplacementUi();
        }

        hydrateSubmittedApplicationView().finally(function () {
            if (AF.config.readOnlyView && AF.nav && typeof AF.nav.lockSubmittedForm === 'function') {
                AF.nav.lockSubmittedForm();
            }
            if (AF.files && typeof AF.files.mountAllDocPreviewButtons === 'function') {
                AF.files.mountAllDocPreviewButtons(document.querySelector('.app-container'));
            }
            if (AF.nav && typeof AF.nav.isSubmittedHyperlinkView === 'function') {
                AF.config.submittedHyperlinkView = AF.nav.isSubmittedHyperlinkView();
            }
            if (AF.config.submittedHyperlinkView && AF.nav && typeof AF.nav.applySubmittedHyperlinkView === 'function') {
                AF.nav.applySubmittedHyperlinkView();
                if (AF.tab4 && typeof AF.tab4.loadAndPopulatePreview === 'function') {
                    AF.tab4.loadAndPopulatePreview().finally(function () {
                        AF.nav.applySubmittedHyperlinkView();
                    });
                }
            } else if (AF.nav && typeof AF.nav.applyFormMode === 'function') {
                AF.nav.applyFormMode();
            } else {
                AF.nav.switchTab(1);
            }
        });
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

        const applicantPromise = AF.api.loadApplicantDetails(applicantId);
        const tab2Promise = loadTab2
            ? AF.api.loadTab2Qualifications(applicantId)
            : Promise.resolve(null);
        const selectionsPromise = (AF.api && typeof AF.api.loadVacancySelections === 'function')
            ? AF.api.loadVacancySelections(applicantId)
            : Promise.resolve(null);

        Promise.all([applicantPromise, tab2Promise, selectionsPromise])
            .then(function (results) {
                if (results[2] && results[2].submitted) {
                    global.sessionStorage.setItem('applicationSubmitted', 'true');
                    AF.config.readOnlyView = true;
                }
                bootstrapForm(results[0], results[1]);
            })
            .catch(function (err) {
                console.warn('Application form load:', err && err.message ? err.message : err);
                bootstrapForm(null);
            });
    }

    startForm();
})(window.ApplicationForm);
