/**
 * Tab 2: Qualifications (Educational & Additional)
 */
(function (AF) {
    const escapeHtml = AF.utils.escapeHtml;
    let initDone = false;
    let tab2Saving = false;

    function formatYearForInput(year) {
        const y = parseYearOfPassing(year);
        return y !== null ? String(y) : '';
    }

    function renderEduItem(item, idx) {
        let defaultExam = '';
        if (idx === 0) defaultExam = '10th';
        else if (idx === 1) defaultExam = '12th';
        else defaultExam = 'LL.B';

        return (
            '<div class="edu-card">' +
            '<div class="d-flex justify-content-between align-items-center mb-3">' +
            '<div class="edu-card-number"><span class="edu-count-badge">' + (idx + 1) + '</span> Educational Qualification</div>' +
            '<button type="button" style="position:initial !important" class="edu-remove-btn remove-item" data-idx="' + idx + '" data-type="edu">' +
            '<i class="bi bi-x-circle-fill me-1"></i> Remove</button></div>' +
            '<div class="row g-2 clear-both">' +
            '<div class="col-md-2"><label class="edu-label"><i class="bi bi-journal-bookmark-fill"></i>Examination</label>' +
            '<input class="form-control edu-input edu-exam" value="' + escapeHtml(item.exam || defaultExam) + '"></div>' +
            '<div class="col-md-2"><label class="edu-label"><i class="bi bi-calendar-event-fill"></i>Year</label>' +
            '<input type="number" class="form-control edu-input edu-year" min="1950" max="' + new Date().getFullYear() + '" placeholder="YYYY" value="' + escapeHtml(formatYearForInput(item.year)) + '"></div>' +
            '<div class="col-md-3"><label class="edu-label"><i class="bi bi-building-fill"></i>University</label>' +
            '<input class="form-control edu-input edu-board" value="' + escapeHtml(item.board || '') + '"></div>' +
            '<div class="col-md-2"><label class="edu-label"><i class="bi bi-bank2"></i>Institution</label>' +
            '<input class="form-control edu-input edu-inst" value="' + escapeHtml(item.institution || '') + '"></div>' +
            '<div class="col-md-2"><label class="edu-label"><i class="bi bi-book-half"></i>Main Subject/special</label>' +
            '<input class="form-control edu-input edu-special" value="' + escapeHtml(item.special || '') + '"></div>' +
            '<div class="col-md-1"><label class="edu-label"><i class="bi bi-percent"></i>Marks</label>' +
            '<input class="form-control edu-input edu-perc" value="' + escapeHtml(item.percentage || '') + '"></div></div>' +
            '<div class="edu-upload-box mt-3">' +
            '<input type="file" class="edu-upload-input certificateUpload" multiple accept=".pdf,.doc,.docx">' +
            '<div class="edu-upload-content"><div class="edu-upload-left">' +
            '<div class="edu-upload-icon"><i class="bi bi-file-earmark-arrow-up-fill"></i></div>' +
            '<div><div class="edu-upload-title">Upload Certificate</div>' +
            '<div class="edu-upload-subtitle">PDF, DOC, DOCX supported</div></div></div>' +
            '<div class="edu-upload-btn"><i class="bi bi-cloud-upload-fill"></i>Choose</div></div></div></div>'
        );
    }

    function renderAddItem(item, idx) {
        return (
            '<div class="add-card">' +
            '<div class="d-flex justify-content-between align-items-center mb-3">' +
            '<div class="edu-card-number"><span class="edu-count-badge">' + (idx + 1) + '</span> Additional Qualification</div>' +
            '<button type="button" class="add-remove-btn remove-item align-center" data-idx="' + idx + '" data-type="add">' +
            '<i class="bi bi-x-lg"></i></button></div>' +
            '<div class="row g-2">' +
            '<div class="col-md-3"><label class="add-label"><i class="bi bi-journal-bookmark-fill"></i>Examination</label>' +
            '<input class="form-control add-input add-exam" value="' + escapeHtml(item.exam || '') + '"></div>' +
            '<div class="col-md-2"><label class="add-label"><i class="bi bi-calendar-event-fill"></i>Year</label>' +
            '<input type="number" class="form-control add-input add-year" min="1950" max="' + new Date().getFullYear() + '" placeholder="YYYY" value="' + escapeHtml(formatYearForInput(item.year)) + '"></div>' +
            '<div class="col-md-3"><label class="add-label"><i class="bi bi-building-fill"></i>Board</label>' +
            '<input class="form-control add-input add-board" value="' + escapeHtml(item.board || '') + '"></div>' +
            '<div class="col-md-3"><label class="add-label"><i class="bi bi-bank2"></i>Institution</label>' +
            '<input class="form-control add-input add-inst" value="' + escapeHtml(item.institution || '') + '"></div>' +
            '<div class="col-md-2"><label class="add-label"><i class="bi bi-book-half"></i>Subject</label>' +
            '<input class="form-control add-input add-subject" value="' + escapeHtml(item.subject || '') + '"></div>' +
            '<div class="col-md-2"><label class="add-label"><i class="bi bi-percent"></i>Marks</label>' +
            '<input class="form-control add-input add-perc" value="' + escapeHtml(item.percentage || '') + '"></div></div>' +
            '<div class="add-upload-box">' +
            '<input type="file" class="add-upload-input add-cert-file" multiple accept=".pdf,.doc,.docx">' +
            '<div class="add-upload-content"><div class="add-upload-left">' +
            '<div class="add-upload-icon"><i class="bi bi-file-earmark-arrow-up-fill"></i></div>' +
            '<div><div class="add-upload-title">Upload Certificate</div>' +
            '<div class="add-upload-subtitle">PDF, DOC, DOCX supported</div></div></div>' +
            '<div class="add-upload-btn"><i class="bi bi-cloud-upload-fill"></i>Choose</div></div></div></div>'
        );
    }

    function snapshotEduFilesFromDom() {
        document.querySelectorAll('#eduListContainer .list-item').forEach(function (item, idx) {
            const fi = item.querySelector('.certificateUpload');
            if (fi && fi.files && fi.files[0] && AF.files && typeof AF.files.storeFilePreview === 'function') {
                AF.files.storeFilePreview('edu-' + idx, fi.files[0]);
            }
        });
    }

    function snapshotAdditionalFilesFromDom() {
        document.querySelectorAll('#additionalListContainer .list-item').forEach(function (item, idx) {
            const fi = item.querySelector('.add-cert-file');
            if (fi && fi.files && fi.files.length && AF.files && typeof AF.files.storeFilesPreview === 'function') {
                AF.files.storeFilesPreview('add-' + idx, fi.files);
            }
        });
    }

    function restoreEduCertificateUi() {
        document.querySelectorAll('#eduListContainer .list-item').forEach(function (row, idx) {
            const item = (AF.state.eduItems || [])[idx];
            const preview = AF.state.filePreviews && AF.state.filePreviews['edu-' + idx];
            const label = (item && item.certificateFileName)
                || (preview && preview.name)
                || row.getAttribute('data-cert-name');
            if (!label) return;
            row.setAttribute('data-cert-name', label);
            const uploadTitle = row.querySelector('.edu-upload-title');
            if (uploadTitle) {
                uploadTitle.innerHTML = '<i class="bi bi-check-circle-fill text-success me-1"></i>' + escapeHtml(label);
            }
        });
    }

    function restoreAdditionalCertificateUi() {
        document.querySelectorAll('#additionalListContainer .list-item').forEach(function (row, idx) {
            const item = (AF.state.additionalItems || [])[idx];
            const preview = AF.state.filePreviews && AF.state.filePreviews['add-' + idx];
            let label = (item && item.certificateFileName) || row.getAttribute('data-cert-name');
            if (!label && preview) {
                if (Array.isArray(preview) && preview.length) {
                    label = preview.length === 1 ? preview[0].name : preview.length + ' file(s) selected';
                } else if (preview.name) {
                    label = preview.name;
                }
            }
            if (!label) return;
            row.setAttribute('data-cert-name', label);
            const uploadTitle = row.querySelector('.add-upload-title');
            if (uploadTitle) {
                uploadTitle.innerHTML = '<i class="bi bi-check-circle-fill text-success me-1"></i>' + escapeHtml(label);
            }
        });
    }

    function syncEdu() {
        const previous = AF.state.eduItems || [];
        AF.state.eduItems = [];
        document.querySelectorAll('#eduListContainer .list-item').forEach(function (item, idx) {
            const prev = previous[idx] || {};
            const previewKey = 'edu-' + idx;
            const preview = AF.state.filePreviews && AF.state.filePreviews[previewKey];
            const fileInput = item.querySelector('.certificateUpload');
            let certName = item.getAttribute('data-cert-name') || prev.certificateFileName || '';
            if (fileInput && fileInput.files && fileInput.files[0]) {
                certName = fileInput.files[0].name;
                if (AF.files && typeof AF.files.storeFilePreview === 'function') {
                    AF.files.storeFilePreview(previewKey, fileInput.files[0]);
                }
            } else if (!certName && preview && preview.name) {
                certName = preview.name;
            }
            AF.state.eduItems.push({
                educationId: prev.educationId || parseInt(item.getAttribute('data-education-id'), 10) || 0,
                exam: item.querySelector('.edu-exam') && item.querySelector('.edu-exam').value,
                year: item.querySelector('.edu-year') && item.querySelector('.edu-year').value,
                board: item.querySelector('.edu-board') && item.querySelector('.edu-board').value,
                institution: item.querySelector('.edu-inst') && item.querySelector('.edu-inst').value,
                special: item.querySelector('.edu-special') && item.querySelector('.edu-special').value,
                percentage: item.querySelector('.edu-perc') && item.querySelector('.edu-perc').value,
                certificatePath: prev.certificatePath || item.getAttribute('data-cert-path') || '',
                certificateFileName: certName,
                isDeleted: false
            });
        });
    }

    function syncAdditional() {
        const previous = AF.state.additionalItems || [];
        AF.state.additionalItems = [];
        document.querySelectorAll('#additionalListContainer .list-item').forEach(function (item, idx) {
            const prev = previous[idx] || {};
            const previewKey = 'add-' + idx;
            const preview = AF.state.filePreviews && AF.state.filePreviews[previewKey];
            const fileInput = item.querySelector('.add-cert-file');
            let certName = item.getAttribute('data-cert-name') || prev.certificateFileName || '';
            if (fileInput && fileInput.files && fileInput.files.length) {
                certName = fileInput.files.length === 1
                    ? fileInput.files[0].name
                    : fileInput.files.length + ' file(s) selected';
                if (AF.files && typeof AF.files.storeFilesPreview === 'function') {
                    AF.files.storeFilesPreview(previewKey, fileInput.files);
                }
            } else if (!certName && preview) {
                if (Array.isArray(preview) && preview.length) {
                    certName = preview.length === 1 ? preview[0].name : preview.length + ' file(s) selected';
                } else if (preview.name) {
                    certName = preview.name;
                }
            }
            AF.state.additionalItems.push({
                additionalId: prev.additionalId || parseInt(item.getAttribute('data-additional-id'), 10) || 0,
                exam: item.querySelector('.add-exam') && item.querySelector('.add-exam').value,
                year: item.querySelector('.add-year') && item.querySelector('.add-year').value,
                board: item.querySelector('.add-board') && item.querySelector('.add-board').value,
                institution: item.querySelector('.add-inst') && item.querySelector('.add-inst').value,
                subject: item.querySelector('.add-subject') && item.querySelector('.add-subject').value,
                percentage: item.querySelector('.add-perc') && item.querySelector('.add-perc').value,
                certificatePath: prev.certificatePath || item.getAttribute('data-cert-path') || '',
                certificateFileName: certName,
                isDeleted: false
            });
        });
    }

    function renderEdu() {
        AF.lists.renderList('eduListContainer', AF.state.eduItems, renderEduItem, 'edu');
        restoreEduCertificateUi();
    }

    function renderAdditional() {
        AF.lists.renderList('additionalListContainer', AF.state.additionalItems, renderAddItem, 'add');
        restoreAdditionalCertificateUi();
    }

    function initUploadHandlers() {
        const eduContainer = document.getElementById('eduListContainer');
        if (eduContainer && eduContainer.getAttribute('data-cert-ui-bound') !== '1') {
            eduContainer.setAttribute('data-cert-ui-bound', '1');
            eduContainer.addEventListener('change', function (e) {
                if (!e.target.classList.contains('certificateUpload')) return;
                const row = e.target.closest('.list-item');
                const rows = document.querySelectorAll('#eduListContainer .list-item');
                const idx = row ? Array.prototype.indexOf.call(rows, row) : -1;
                const fileCount = e.target.files ? e.target.files.length : 0;
                const box = e.target.closest('.edu-upload-box');
                const uploadTitle = box ? box.querySelector('.edu-upload-title') : null;
                if (idx >= 0 && fileCount > 0 && AF.files && typeof AF.files.storeFilePreview === 'function') {
                    AF.files.storeFilePreview('edu-' + idx, e.target.files[0]);
                }
                if (uploadTitle && fileCount > 0) {
                    const label = fileCount === 1 ? e.target.files[0].name : fileCount + ' file(s) selected';
                    uploadTitle.innerHTML = '<i class="bi bi-check-circle-fill text-success me-1"></i>' + escapeHtml(label);
                    if (row) row.setAttribute('data-cert-name', label);
                }
                syncEdu();
            });
        }

        const addContainer = document.getElementById('additionalListContainer');
        if (addContainer && addContainer.getAttribute('data-cert-ui-bound') !== '1') {
            addContainer.setAttribute('data-cert-ui-bound', '1');
            addContainer.addEventListener('change', function (e) {
                if (!e.target.classList.contains('add-cert-file')) return;
                const row = e.target.closest('.list-item');
                const rows = document.querySelectorAll('#additionalListContainer .list-item');
                const idx = row ? Array.prototype.indexOf.call(rows, row) : -1;
                const fileCount = e.target.files ? e.target.files.length : 0;
                const box = e.target.closest('.add-upload-box');
                const title = box ? box.querySelector('.add-upload-title') : null;
                if (idx >= 0 && fileCount > 0 && AF.files && typeof AF.files.storeFilesPreview === 'function') {
                    AF.files.storeFilesPreview('add-' + idx, e.target.files);
                }
                if (title && fileCount > 0) {
                    const label = fileCount === 1 ? e.target.files[0].name : fileCount + ' file(s) selected';
                    title.innerHTML = '<i class="bi bi-check-circle-fill text-success me-1"></i>' + escapeHtml(label);
                    if (row) row.setAttribute('data-cert-name', label);
                }
                syncAdditional();
            });
        }
    }

    function initDefaultEduItems() {
        if (AF.state.eduItems && AF.state.eduItems.length) {
            return;
        }
        if (!AF.state.eduItems.length) {
            AF.state.eduItems.push({
                exam: '10th', year: '', board: '', institution: '', special: '', percentage: ''
            });
            AF.state.eduItems.push({
                exam: '12th', year: '', board: '', institution: '', special: '', percentage: ''
            });
        }
    }

    function trimVal(value) {
        return value != null ? String(value).trim() : '';
    }

    function parseYearOfPassing(val) {
        const s = trimVal(val);
        if (!s) return null;
        const iso = s.match(/^(\d{4})-\d{2}-\d{2}/);
        if (iso) return parseInt(iso[1], 10);
        const yearOnly = s.match(/^(\d{4})$/);
        if (yearOnly) return parseInt(yearOnly[1], 10);
        const d = new Date(s);
        if (!isNaN(d.getTime())) return d.getFullYear();
        return null;
    }

    function isValidMarks(val) {
        const n = parseFloat(String(val || '').replace(/[^\d.]/g, ''));
        return !isNaN(n) && n >= 0 && n <= 100;
    }

    function hasEduCertificate(item, idx) {
        if (trimVal(item.certificatePath)) return true;
        const rows = document.querySelectorAll('#eduListContainer .list-item');
        const row = rows[idx];
        if (!row) return false;
        const input = row.querySelector('.certificateUpload');
        if (input && input.files && input.files[0]) return true;
        const preview = AF.state.filePreviews && AF.state.filePreviews['edu-' + idx];
        return !!(preview && preview.name);
    }

    function scrollToEduRow(idx) {
        const rows = document.querySelectorAll('#eduListContainer .list-item');
        if (rows[idx]) {
            rows[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function scrollToAdditionalRow(idx) {
        const rows = document.querySelectorAll('#additionalListContainer .list-item');
        if (rows[idx]) {
            rows[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function hasAdditionalCertificate(item, idx) {
        if (trimVal(item.certificatePath)) return true;
        const rows = document.querySelectorAll('#additionalListContainer .list-item');
        const row = rows[idx];
        if (!row) return false;
        const input = row.querySelector('.add-cert-file');
        if (input && input.files && input.files[0]) return true;
        const preview = AF.state.filePreviews && AF.state.filePreviews['add-' + idx];
        return !!(preview && preview.name);
    }

    function isAdditionalRowStarted(item) {
        return !!(
            trimVal(item.exam)
            || trimVal(item.year)
            || trimVal(item.board)
            || trimVal(item.institution)
            || trimVal(item.subject)
            || trimVal(item.percentage)
        );
    }

    function validateStep2() {
        syncEdu();
        syncAdditional();

        const applicantId = AF.api && typeof AF.api.requireApplicantId === 'function'
            ? parseInt(sessionStorage.getItem('applicantId'), 10)
            : 0;
        if (!applicantId) {
            alert('Applicant ID is missing. Please log in again.');
            return false;
        }

        const eduItems = AF.state.eduItems || [];
        if (!eduItems.length) {
            alert('Please add at least one educational qualification.');
            return false;
        }

        const currentYear = new Date().getFullYear();

        for (let i = 0; i < eduItems.length; i++) {
            const item = eduItems[i];
            const rowLabel = 'Educational qualification #' + (i + 1);

            if (!trimVal(item.exam)) {
                alert(rowLabel + ': Please enter the examination passed.');
                scrollToEduRow(i);
                return false;
            }

            const year = parseYearOfPassing(item.year);
            if (year === null) {
                alert(rowLabel + ': Please enter a valid year of passing.');
                scrollToEduRow(i);
                return false;
            }
            if (year < 1950 || year > currentYear) {
                alert(rowLabel + ': Year of passing must be between 1950 and ' + currentYear + '.');
                scrollToEduRow(i);
                return false;
            }

            if (!trimVal(item.board)) {
                alert(rowLabel + ': Please enter the university / board.');
                scrollToEduRow(i);
                return false;
            }

            if (!trimVal(item.institution)) {
                alert(rowLabel + ': Please enter the institution name.');
                scrollToEduRow(i);
                return false;
            }

            if (!trimVal(item.special)) {
                alert(rowLabel + ': Please enter the main subject / specialization.');
                scrollToEduRow(i);
                return false;
            }

            if (!isValidMarks(item.percentage)) {
                alert(rowLabel + ': Please enter marks between 0 and 100.');
                scrollToEduRow(i);
                return false;
            }

            if (!hasEduCertificate(item, i)) {
                alert(rowLabel + ': Please upload the certificate (PDF, DOC, or DOCX).');
                scrollToEduRow(i);
                return false;
            }
        }

        const additionalItems = AF.state.additionalItems || [];
        for (let j = 0; j < additionalItems.length; j++) {
            const add = additionalItems[j];
            if (!isAdditionalRowStarted(add)) {
                continue;
            }

            const addLabel = 'Additional qualification #' + (j + 1);

            if (!trimVal(add.exam)) {
                alert(addLabel + ': Please enter the examination passed.');
                scrollToAdditionalRow(j);
                return false;
            }

            const addYear = parseYearOfPassing(add.year);
            if (addYear === null) {
                alert(addLabel + ': Please enter a valid year of passing.');
                scrollToAdditionalRow(j);
                return false;
            }
            if (addYear < 1950 || addYear > currentYear) {
                alert(addLabel + ': Year of passing must be between 1950 and ' + currentYear + '.');
                scrollToAdditionalRow(j);
                return false;
            }

            if (!trimVal(add.board)) {
                alert(addLabel + ': Please enter the board.');
                scrollToAdditionalRow(j);
                return false;
            }

            if (!trimVal(add.institution)) {
                alert(addLabel + ': Please enter the institution name.');
                scrollToAdditionalRow(j);
                return false;
            }

            if (!trimVal(add.subject)) {
                alert(addLabel + ': Please enter the subject.');
                scrollToAdditionalRow(j);
                return false;
            }

            if (!isValidMarks(add.percentage)) {
                alert(addLabel + ': Please enter marks between 0 and 100.');
                scrollToAdditionalRow(j);
                return false;
            }

            if (!hasAdditionalCertificate(add, j)) {
                alert(addLabel + ': Please upload the certificate (PDF, DOC, or DOCX).');
                scrollToAdditionalRow(j);
                return false;
            }
        }

        return true;
    }

    function init() {
        if (initDone) return;
        initDone = true;

        initUploadHandlers();
        initDefaultEduItems();

        const addEduBtn = document.getElementById('addEduBtn');
        if (addEduBtn) {
            addEduBtn.addEventListener('click', function () {
                snapshotEduFilesFromDom();
                syncEdu();
                AF.state.eduItems.push({});
                renderEdu();
                restoreEduCertificateUi();
            });
        }

        const addAdditionalBtn = document.getElementById('addAdditionalBtn');
        if (addAdditionalBtn) {
            addAdditionalBtn.addEventListener('click', function () {
                snapshotAdditionalFilesFromDom();
                syncAdditional();
                AF.state.additionalItems.push({});
                renderAdditional();
                restoreAdditionalCertificateUi();
            });
        }

        const prevBtn = document.getElementById('prevToTab1');
        if (prevBtn) prevBtn.addEventListener('click', function () { AF.nav.switchTab(1); });

        const nextBtn = document.getElementById('nextToTab3');
        if (nextBtn) {
            nextBtn.addEventListener('click', onNextToTab3);
        }
    }

    function onNextToTab3() {
        if (tab2Saving) return;
        if (!validateStep2()) return;

        tab2Saving = true;
        const nextBtn = document.getElementById('nextToTab3');
        const saveFn = AF.api && typeof AF.api.saveTab2WithCertificates === 'function'
            ? AF.api.saveTab2WithCertificates()
            : Promise.resolve();

        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.textContent = 'Saving...';
        }

        saveFn
            .then(function () {
                AF.data.saveDraft();
                AF.nav.switchTab(3);
            })
            .catch(function (err) {
                alert(err && err.message ? err.message : 'Failed to save qualifications. Please try again.');
            })
            .finally(function () {
                tab2Saving = false;
                if (nextBtn) {
                    nextBtn.disabled = false;
                    nextBtn.textContent = 'Save and Continue';
                }
            });
    }

    AF.tab2 = {
        init: init,
        renderEdu: renderEdu,
        renderAdditional: renderAdditional,
        syncEdu: syncEdu,
        syncAdditional: syncAdditional,
        snapshotEduFilesFromDom: snapshotEduFilesFromDom,
        snapshotAdditionalFilesFromDom: snapshotAdditionalFilesFromDom,
        validateStep2: validateStep2
    };
})(window.ApplicationForm);
