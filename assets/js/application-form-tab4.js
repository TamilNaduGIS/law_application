/**
 * Tab 4: Preview & Submit
 */
(function (AF) {
    const utils = AF.utils;
    const config = AF.config;
    const state = AF.state;

    function generatePreview() {
        if (config.formMode === 'previewOnly' && config.existingApp && config.existingApp.filePreviews) {
            Object.keys(config.existingApp.filePreviews).forEach(function (k) {
                state.filePreviews[k] = config.existingApp.filePreviews[k];
            });
        }
        AF.tab2.syncEdu();
        AF.tab2.syncAdditional();
        AF.tab3.syncBar();
        AF.tab3.syncPractice();
        AF.tab3.syncJudgmentAAG();
        AF.tab3.syncJudgmentAGP();
        AF.files.collectLiveFilePreviews();

        const p = AF.tab1.getPersonalFromForm();
        const lawDegEl = document.getElementById('lawDegreeRecognized') || document.getElementById('lawDegreeRecognized1');
        const lawDeg = lawDegEl ? lawDegEl.value : '';
        const itAssEl = document.getElementById('itAssessee');
        const itAss = itAssEl ? itAssEl.value : '';
        const draftYEl = document.getElementById('draftingYears');
        const draftY = draftYEl ? draftYEl.value : '';
        const totalBarEl = document.getElementById('totalBarYears');
        const totalBar = totalBarEl ? totalBarEl.value : '';
        const court = AF.data.getCourtBench();
        let html = '';

        html += '<div class="preview-card"><h4>Application Context</h4>';
        html += utils.previewTable(
            utils.previewFieldRow('Post', config.postName) +
            utils.previewFieldRow('Job ID', config.jobId) +
            utils.previewFieldRow('Court', court) +
            utils.previewFieldRow('User ID', config.userId)
        ) + '</div>';

        html += '<div class="preview-card"><h4>Personal & Professional Information</h4>';
        html += utils.previewTable(
            utils.previewFieldRow('Name of Advocate', p.advocateName) +
            utils.previewFieldRow('Bar Council Enrolment No.', p.enrolmentNo) +
            utils.previewFieldRow('Bar Council Enrolment No. (Senior)', p.seniorEnrolmentNo) +
            utils.previewFieldRow('Date of Enrolment', p.enrolmentDate) +
            utils.previewFieldRow("Father's Name", p.fatherName) +
            utils.previewFieldRow('Gender', p.gender) +
            utils.previewFieldRow('Marital Status', p.maritalStatus) +
            utils.previewFieldRow('Date of Birth', p.dob) +
            utils.previewFieldRow('Nationality', p.nationality) +
            utils.previewFieldRow('Religion', p.religion) +
            utils.previewFieldRow('Community', p.community) +
            utils.previewFieldRow('Mobile', p.mobile) +
            utils.previewFieldRow('Phone', p.phone) +
            utils.previewFieldRow('Email', p.email) +
            utils.previewFieldRow('PAN', p.pan) +
            utils.previewFieldRow('District', p.district) +
            utils.previewFieldRow('Pincode', p.pincode) +
            utils.previewFieldRow('Office Address', p.officeAddress) +
            utils.previewFieldRow('Permanent Address', p.permanentAddress)
        );
        html += '<div class="preview-upload-block"><span class="preview-upload-label">Photo</span>' +
            AF.files.renderDocPreview(state.filePreviews.photo) + '</div>';
        html += '<div class="preview-upload-block"><span class="preview-upload-label">Enrolment Certificate</span>' +
            AF.files.renderDocPreview(state.filePreviews.enrolmentCert) + '</div></div>';

        html += '<div class="preview-card"><h4>Educational Qualification</h4>';
        if (!state.eduItems.length) {
            html += '<p class="text-muted mb-0">None</p>';
        } else {
            state.eduItems.forEach(function (e, i) {
                html += '<div class="preview-sub-item"><div class="preview-sub-title">Entry ' + (i + 1) + '</div>';
                html += utils.previewTable(
                    utils.previewFieldRow('Examination', e.exam) +
                    utils.previewFieldRow('Year of Passing', e.year) +
                    utils.previewFieldRow('University/Board', e.board) +
                    utils.previewFieldRow('Institution', e.institution) +
                    utils.previewFieldRow('% Marks', e.percentage)
                );
                html += '<div class="preview-upload-block"><span class="preview-upload-label">Certificate</span>' +
                    AF.files.renderDocPreview(state.filePreviews['edu-' + i]) + '</div></div>';
            });
        }
        html += '</div>';

        html += '<div class="preview-card"><h4>Additional Qualification</h4>';
        if (!state.additionalItems.length) {
            html += '<p class="text-muted mb-0">None</p>';
        } else {
            state.additionalItems.forEach(function (a, i) {
                html += '<div class="preview-sub-item"><div class="preview-sub-title">Entry ' + (i + 1) + '</div>';
                html += utils.previewTable(
                    utils.previewFieldRow('Examination', a.exam) +
                    utils.previewFieldRow('Year', a.year) +
                    utils.previewFieldRow('Board', a.board) +
                    utils.previewFieldRow('Institution', a.institution) +
                    utils.previewFieldRow('Subject', a.subject) +
                    utils.previewFieldRow('% Marks', a.percentage)
                );
                html += '<div class="preview-upload-block"><span class="preview-upload-label">Certificate</span>' +
                    AF.files.renderDocPreview(state.filePreviews['add-' + i]) + '</div></div>';
            });
        }
        html += '</div>';

        html += '<div class="preview-card"><h4>Experience Details</h4>';
        html += utils.previewTable(utils.previewFieldRow('Law Degree recognized by Bar Council of India', lawDeg));
        html += '<h5 class="preview-subheading">Total Bar Experience</h5>';
        if (!state.barItems.length) {
            html += '<p class="text-muted">None</p>';
        } else {
            state.barItems.forEach(function (b, i) {
                html += '<div class="preview-sub-item"><div class="preview-sub-title">Entry ' + (i + 1) + '</div>';
                html += utils.previewTable(
                    utils.previewFieldRow('Years', b.years) +
                    utils.previewFieldRow('From', b.from) +
                    utils.previewFieldRow('To', b.to) +
                    utils.previewFieldRow('Bar Council', b.barCouncil)
                );
                html += '<div class="preview-upload-block"><span class="preview-upload-label">Documents</span>' +
                    AF.files.renderDocPreview(state.filePreviews['bar-' + i]) + '</div></div>';
            });
        }
        html += utils.previewTable(utils.previewFieldRow('Total Years (Auto)', totalBar));
        html += '<h5 class="preview-subheading">Practice in High Court / Madurai Bench</h5>';
        if (!state.practiceItems.length) {
            html += '<p class="text-muted">None</p>';
        } else {
            state.practiceItems.forEach(function (pr, i) {
                html += '<div class="preview-sub-item"><div class="preview-sub-title">Entry ' + (i + 1) + '</div>';
                html += utils.previewTable(
                    utils.previewFieldRow('Court', pr.courtName || pr.court) +
                    utils.previewFieldRow('Years', pr.years) +
                    utils.previewFieldRow('From', pr.from) +
                    utils.previewFieldRow('To', pr.to)
                );
                html += '<div class="preview-upload-block"><span class="preview-upload-label">Documents</span>' +
                    AF.files.renderDocPreview(state.filePreviews['practice-' + i]) + '</div></div>';
            });
        }
        html += '<h5 class="preview-subheading">Judgements (AAG / SGP / GP — last 7 years)</h5>';
        if (!state.judgmentAAGItems.length) {
            html += '<p class="text-muted">None</p>';
        } else {
            state.judgmentAAGItems.forEach(function (j, i) {
                html += '<div class="preview-sub-item"><div class="preview-sub-title">Entry ' + (i + 1) + '</div>';
                html += utils.previewTable(
                    utils.previewFieldRow('Case No.', j.caseNo) +
                    utils.previewFieldRow('Case details', j.caseDetails) +
                    utils.previewFieldRow('Judgment', j.judgment) +
                    utils.previewFieldRow('Remarks', j.remarks)
                );
                html += '<div class="preview-upload-block"><span class="preview-upload-label">Judgement file</span>' +
                    AF.files.renderDocPreview(state.filePreviews['judgment-' + i + '-judgmentAAG']) + '</div></div>';
            });
        }
        html += '<h5 class="preview-subheading">Additional Government Pleader (last 5 years)</h5>';
        if (!state.judgmentAGPItems.length) {
            html += '<p class="text-muted">None</p>';
        } else {
            state.judgmentAGPItems.forEach(function (j, i) {
                html += '<div class="preview-sub-item"><div class="preview-sub-title">Entry ' + (i + 1) + '</div>';
                html += utils.previewTable(
                    utils.previewFieldRow('Case No.', j.caseNo) +
                    utils.previewFieldRow('Case details', j.caseDetails) +
                    utils.previewFieldRow('Judgment', j.judgment) +
                    utils.previewFieldRow('Remarks', j.remarks)
                );
                html += '<div class="preview-upload-block"><span class="preview-upload-label">Judgement file</span>' +
                    AF.files.renderDocPreview(state.filePreviews['judgment-' + i + '-judgmentAGP']) + '</div></div>';
            });
        }
        html += '<h5 class="preview-subheading">Drafting Experience</h5>';
        html += utils.previewTable(utils.previewFieldRow('No. of Years', draftY));
        html += '<div class="preview-upload-block"><span class="preview-upload-label">Petitions</span>' +
            AF.files.renderDocPreview(state.filePreviews.drafting) + '</div>';
        html += utils.previewTable(utils.previewFieldRow('Whether IT Assessee', itAss));
        html += '</div>';

        const declDateEl = document.getElementById('declDate');
        const declPlaceEl = document.getElementById('declPlace');
        html += '<div class="preview-card"><h4>Declaration</h4>';
        html += utils.previewTable(
            utils.previewFieldRow('Date', declDateEl ? declDateEl.value : '') +
            utils.previewFieldRow('Place', declPlaceEl ? declPlaceEl.value : '')
        ) + '</div>';

        if (config.existingApp && config.existingApp.submittedAt) {
            html += '<p class="alert alert-success mt-2">Submitted on ' +
                new Date(config.existingApp.submittedAt).toLocaleString() + '</p>';
        }

        const previewContent = document.getElementById('previewContent');
        if (previewContent) previewContent.innerHTML = html;
    }

    async function downloadPDF() {
        const jsPDFLib = window.jspdf;
        if (!jsPDFLib || !window.html2canvas) return;
        const { jsPDF } = jsPDFLib;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const element = document.getElementById('pdfContent');
        if (!element) return;

        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            scrollY: -window.scrollY
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdfWidth = 210;
        const pdfHeight = 297;
        const imgWidth = pdfWidth;
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save('Law-Officers-Application.pdf');
    }

    function initSubmitHandlers() {
        const finalSubmitBtn = document.getElementById('finalSubmitBtn');
        if (finalSubmitBtn) {
            finalSubmitBtn.addEventListener('click', function () {
                const declCheck = document.getElementById('declarationCheck');
                const submitMessage = document.getElementById('submitMessage');
                if (declCheck && !declCheck.checked) {
                    if (submitMessage) {
                        submitMessage.innerHTML = '<div class="alert alert-danger">Please accept the declaration.</div>';
                    }
                    return;
                }
                if (!config.jobId) {
                    alert('No job selected.');
                    return;
                }
                const payload = AF.data.collectApplicationPayload();
                const ref = AppData.submitApplication(config.userId, config.jobId, payload);
                AppData.updateUserProfile(config.userId, payload.personal);
                if (submitMessage) {
                    submitMessage.innerHTML =
                        '<div class="alert alert-success">Application submitted! Reference: ' + (ref.id || '—') + '</div>';
                }
            });
        }

        $('#finalSubmitBtn').click(function () {
            $('#submitConfirmModal').modal('hide');
            setTimeout(function () {
                $('#successSubmitModal').modal('show');
            }, 400);
            setTimeout(function () {
                window.location.href = 'view-submission.html';
            }, 3000);
        });
    }

    function initPdfDownload() {
        $('#downloadPdfBtn').on('click', function () {
            downloadPDF();
        });
    }

    function initBackToTop() {
        $(function () {
            const $btn = $('#backToTopBtn');
            $(window).on('scroll', function () {
                if ($(this).scrollTop() > 300) {
                    $btn.addClass('show');
                } else {
                    $btn.removeClass('show');
                }
            });
            $btn.on('click', function () {
                $('html, body').animate({ scrollTop: 0 }, 700);
            });
        });
    }

    function init() {
        initSubmitHandlers();
        initPdfDownload();
        initBackToTop();

        const prevBtn = document.getElementById('prevToTab3');
        if (prevBtn) prevBtn.addEventListener('click', function () { AF.nav.switchTab(3); });
    }

    AF.tab4 = {
        init: init,
        generatePreview: generatePreview,
        downloadPDF: downloadPDF
    };
})(window.ApplicationForm);
