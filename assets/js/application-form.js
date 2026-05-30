/**

 * Application form bootstrap — initializes all tabs and shared modules.

 */

(function (AF) {

    if (window.AppData && typeof AppData.requireAuth === 'function') {

        AppData.requireAuth('login.html');

    }



    function bootstrapForm(applicantRow) {

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



    if (AF.api && typeof AF.api.loadApplicantDetails === 'function'

        && window.LawPortal && typeof LawPortal.apiRequest === 'function') {

        AF.api.loadApplicantDetails(AF.config.userId)

            .then(function (row) {

                bootstrapForm(row);

            })

            .catch(function (err) {

                console.warn('Applicant details:', err && err.message ? err.message : err);

                bootstrapForm(null);

            });

    } else {

        bootstrapForm(null);

    }

})(window.ApplicationForm);

