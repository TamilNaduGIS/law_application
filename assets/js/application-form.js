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
        return AF.tab4.loadAndPopulatePreview().catch(function (err) {
            console.warn('Submitted application hydrate:', err && err.message ? err.message : err);
        });
    }

    function populateWizardState(applicantRow, tab2Data, existingApp) {
        const formMode = AF.config.formMode;

        if (applicantRow) {
            AF.state.applicantRowCache = applicantRow;
        }

        if (tab2Data && AF.api && typeof AF.api.applyTab2QualificationsToState === 'function') {
            AF.api.applyTab2QualificationsToState(tab2Data, { replace: true });
        }

        function afterTab1Hydrate() {
            if (applicantRow && AF.api && typeof AF.api.mapToApplicationPayload === 'function') {
                const payload = AF.api.mapToApplicationPayload(applicantRow);
                if (payload && payload.specificBarYears) {
                    const el = document.getElementById('specificBarYears');
                    if (el) {
                        el.value = payload.specificBarYears;
                    }
                }
            }
            if (applicantRow && AF.tab1 && typeof AF.tab1.applySavedApplicantUploads === 'function') {
                const personal = AF.api && typeof AF.api.mapRowToPersonal === 'function'
                    ? AF.api.mapRowToPersonal(applicantRow)
                    : null;
                AF.tab1.applySavedApplicantUploads(personal);
            }
            if (AF.lists && typeof AF.lists.renderAll === 'function') {
                AF.lists.renderAll();
            }
        }

        if (formMode === 'full') {
            if (existingApp && existingApp.status === 'draft') {
                AF.data.loadApplicationData(existingApp);
                return Promise.resolve();
            }
            if (applicantRow && AF.tab1 && typeof AF.tab1.hydrateFromApplicantRow === 'function') {
                return AF.tab1.hydrateFromApplicantRow(applicantRow).then(afterTab1Hydrate);
            }
            if (applicantRow && AF.api && typeof AF.api.mapToApplicationPayload === 'function') {
                const payload = AF.api.mapToApplicationPayload(applicantRow);
                if (payload) {
                    AF.data.loadApplicationData(payload);
                } else {
                    AF.tab1.prefillTab1FromSession();
                    afterTab1Hydrate();
                }
                return Promise.resolve();
            }
            AF.tab1.prefillTab1FromSession();
            afterTab1Hydrate();
            return Promise.resolve();
        }

        if (formMode === 'tab1Only') {
            if (applicantRow && AF.tab1 && typeof AF.tab1.hydrateFromApplicantRow === 'function') {
                return AF.tab1.hydrateFromApplicantRow(applicantRow);
            }
            if (applicantRow && AF.api) {
                const payload = AF.api.mapToApplicationPayload(applicantRow);
                if (payload && payload.personal) {
                    AF.tab1.fillPersonal(payload.personal);
                }
            } else {
                AF.tab1.prefillTab1FromSession();
            }
            return Promise.resolve();
        }

        if (formMode === 'previewOnly') {
            AF.data.loadApplicationData(existingApp);
        }
        return Promise.resolve();
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

        AF.nav.bindTabButtons();

        AF.data.mountJobBanner();
        AF.files.initFileUploadButtons(document);
        if (typeof AF.files.initAllFileUploadValidation === 'function') {
            AF.files.initAllFileUploadValidation();
        }
        if (typeof AF.files.initUploadReplacementUi === 'function') {
            AF.files.initUploadReplacementUi();
        }

        const existingApp = AF.config.existingApp;
        const formMode = AF.config.formMode;

        /* Show Tab 1 before binding so fields are visible and paint correctly. */
        if (!AF.config.readOnlyView) {
            if (AF.nav && typeof AF.nav.applyFormMode === 'function') {
                AF.nav.applyFormMode();
            } else if (AF.nav && typeof AF.nav.switchTab === 'function') {
                AF.nav.switchTab(1);
            }
        }

        const hydrateTab1Promise = populateWizardState(applicantRow, tab2Data, existingApp);
        const tab1PaintPromise = hydrateTab1Promise && typeof hydrateTab1Promise.then === 'function'
            ? hydrateTab1Promise
            : Promise.resolve();

        const preloadExperiencePromise = tab1PaintPromise.then(function () {
            if (AF.config.readOnlyView || !AF.tab3 || typeof AF.tab3.loadExperienceData !== 'function') {
                return null;
            }
            const apId = parseInt(global.sessionStorage.getItem('applicationId'), 10)
                || parseInt(AF.config.userId, 10)
                || 0;
            if (!apId) {
                return null;
            }
            return AF.tab3.loadExperienceData().catch(function (err) {
                console.warn('[Form] Experience preload:', err && err.message ? err.message : err);
                return null;
            });
        });

        preloadExperiencePromise.finally(function () {
        hydrateSubmittedApplicationView().finally(function () {
            return tab1PaintPromise.finally(function () {
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
                        return AF.tab4.loadAndPopulatePreview().finally(function () {
                            AF.nav.applySubmittedHyperlinkView();
                            hideBootstrapLoader();
                        });
                    }
                }
                hideBootstrapLoader();
            });
        });
        });
    }

    function showBootstrapLoader(message) {
        if (AF.utils && typeof AF.utils.showPrefillLoader === 'function') {
            AF.utils.showPrefillLoader(message || 'Loading application…', document.body, { viewport: true });
        }
    }

    function hideBootstrapLoader() {
        if (AF.utils && typeof AF.utils.hidePrefillLoader === 'function') {
            AF.utils.hidePrefillLoader(document.body, { viewport: true });
        }
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

        showBootstrapLoader('Preparing secure session…');

        const ensureReady = (AF.api && typeof AF.api.ensureSessionReady === 'function')
            ? AF.api.ensureSessionReady()
            : (AF.api && typeof AF.api.ensureSessionTokens === 'function')
                ? AF.api.ensureSessionTokens()
                : Promise.resolve();

        ensureReady
            .then(function () {
                showBootstrapLoader('Loading your saved application…');
                return AF.api.loadApplicantDetails(applicantId).then(function (detailsRow) {
                    const tab2Promise = loadTab2
                        ? AF.api.loadTab2Qualifications(applicantId)
                        : Promise.resolve(null);
                    return tab2Promise.then(function (tab2Data) {
                        const selectionsPromise = (AF.api && typeof AF.api.loadVacancySelections === 'function')
                            ? AF.api.loadVacancySelections(applicantId)
                            : Promise.resolve(null);
                        return selectionsPromise.then(function (selectionsResult) {
                            return [detailsRow, tab2Data, selectionsResult];
                        });
                    });
                });
            })
            .then(function (results) {
                if (results[2] && results[2].submitted) {
                    window.sessionStorage.setItem('applicationSubmitted', 'true');
                    AF.config.readOnlyView = true;
                }
                showBootstrapLoader('Prefilling Tab 1…');
                bootstrapForm(results[0], results[1]);
            })
            .catch(function (err) {
                console.warn('Application form load:', err && err.message ? err.message : err);
                showBootstrapLoader('Preparing form…');
                bootstrapForm(null);
            });
    }

    startForm();
})(window.ApplicationForm);
