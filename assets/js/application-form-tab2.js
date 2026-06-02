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

    function getDocUploadHintHtml() {
        if (AF.files && typeof AF.files.getUploadHintHtml === 'function') {
            return AF.files.getUploadHintHtml('certificate');
        }
        return '<p class="upload-field-hint small mb-2">Allowed formats: JPG, JPEG, PNG or PDF only. Maximum file size: 5 MB.</p>';
    }

    function getDocUploadAccept() {
        return (AF.files && AF.files.CERT_UPLOAD_ACCEPT) || '.pdf,.jpg,.jpeg,.png';
    }

    function getSelectedPanelHtml() {
        if (AF.files && typeof AF.files.buildFileUploadSelectedPanelHtml === 'function') {
            return AF.files.buildFileUploadSelectedPanelHtml();
        }
        return '';
    }

    function renderCertUploadBlock(inputClass) {
        return (
            '<div class="cert-upload-strip file-upload-host">' +
            getDocUploadHintHtml() +
            '<p class="upload-field-error small mb-2" role="alert" hidden></p>' +
            '<div class="upload-pick-panel">' +
            '<label class="edu-upload-box edu-upload-compact" role="button" tabindex="0">' +
            '<input type="file" class="edu-upload-input ' + inputClass + '" accept="' + getDocUploadAccept() + '">' +
            '<div class="edu-upload-content">' +
            '<span class="edu-upload-icon"><i class="bi bi-file-earmark-arrow-up-fill"></i></span>' +
            '<span class="edu-upload-title">Certificate</span>' +
            '<span class="edu-upload-btn"><i class="bi bi-cloud-upload-fill"></i>Choose</span>' +
            '</div></label></div>' +
            getSelectedPanelHtml() +
            '</div>'
        );
    }

    function renderAddCertUploadBlock() {
        return (
            '<div class="cert-upload-strip file-upload-host">' +
            getDocUploadHintHtml() +
            '<p class="upload-field-error small mb-2" role="alert" hidden></p>' +
            '<div class="upload-pick-panel">' +
            '<label class="add-upload-box add-upload-compact" role="button" tabindex="0">' +
            '<input type="file" class="add-upload-input add-cert-file" accept="' + getDocUploadAccept() + '">' +
            '<div class="add-upload-content">' +
            '<span class="add-upload-icon"><i class="bi bi-file-earmark-arrow-up-fill"></i></span>' +
            '<span class="add-upload-title">Certificate</span>' +
            '<span class="add-upload-btn"><i class="bi bi-cloud-upload-fill"></i>Choose</span>' +
            '</div></label></div>' +
            getSelectedPanelHtml() +
            '</div>'
        );
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
            '<button type="button" class="edu-remove-btn remove-item" data-idx="' + idx + '" data-type="edu" aria-label="Remove qualification">' +
            '<i class="bi bi-x-circle-fill me-1"></i> Remove</button></div>' +
            '<div class="row g-2 clear-both">' +
            '<div class="col-md-2"><label class="edu-label"><i class="bi bi-journal-bookmark-fill"></i>Examination</label>' +
            '<input class="form-control edu-input edu-exam" value="' + escapeHtml(item.exam || defaultExam) + '"></div>' +
            '<div class="col-md-2"><label class="edu-label"><i class="bi bi-calendar-event-fill"></i>Year of Passing</label>' +
            '<input type="text" class="form-control edu-input edu-year" maxlength="4" inputmode="numeric" autocomplete="off" placeholder="YYYY" value="' + escapeHtml(formatYearForInput(item.year)) + '"></div>' +
            '<div class="col-md-3"><label class="edu-label"><i class="bi bi-building-fill"></i>Board / University</label>' +
            '<input class="form-control edu-input edu-board" value="' + escapeHtml(item.board || '') + '"></div>' +
            '<div class="col-md-2"><label class="edu-label"><i class="bi bi-bank2"></i>Institution</label>' +
            '<input class="form-control edu-input edu-inst" value="' + escapeHtml(item.institution || '') + '"></div>' +
            '<div class="col-md-2"><label class="edu-label"><i class="bi bi-book-half"></i>Main Subject/special</label>' +
            '<input class="form-control edu-input edu-special" value="' + escapeHtml(item.special || '') + '"></div>' +
            '<div class="col-md-1"><label class="edu-label"><i class="bi bi-percent"></i>Marks (%)</label>' +
            '<input type="text" class="form-control edu-input edu-perc" maxlength="3" inputmode="numeric" autocomplete="off" placeholder="0–100" value="' + escapeHtml(normalizeMarksForDisplay(item.percentage)) + '"></div></div>' +
            renderCertUploadBlock('certificateUpload') +
            '</div>'
        );
    }

    function renderAddItem(item, idx) {
        return (
            '<div class="add-card">' +
            '<div class="d-flex justify-content-between align-items-center mb-3">' +
            '<div class="edu-card-number"><span class="edu-count-badge">' + (idx + 1) + '</span> Additional Qualification</div>' +
            '<button type="button" class="add-remove-btn remove-item align-center" data-idx="' + idx + '" data-type="add" aria-label="Remove qualification">' +
            '<i class="bi bi-x-lg"></i></button></div>' +
            '<div class="row g-2">' +
            '<div class="col-md-3"><label class="add-label"><i class="bi bi-journal-bookmark-fill"></i>Examination</label>' +
            '<input class="form-control add-input add-exam" value="' + escapeHtml(item.exam || '') + '"></div>' +
            '<div class="col-md-2"><label class="add-label"><i class="bi bi-calendar-event-fill"></i>Year of Passing</label>' +
            '<input type="text" class="form-control add-input add-year" maxlength="4" inputmode="numeric" autocomplete="off" placeholder="YYYY" value="' + escapeHtml(formatYearForInput(item.year)) + '"></div>' +
            '<div class="col-md-3"><label class="add-label"><i class="bi bi-building-fill"></i>Board / University</label>' +
            '<input class="form-control add-input add-board" value="' + escapeHtml(item.board || '') + '"></div>' +
            '<div class="col-md-3"><label class="add-label"><i class="bi bi-bank2"></i>Institution</label>' +
            '<input class="form-control add-input add-inst" value="' + escapeHtml(item.institution || '') + '"></div>' +
            '<div class="col-md-2"><label class="add-label"><i class="bi bi-book-half"></i>Subject</label>' +
            '<input class="form-control add-input add-subject" value="' + escapeHtml(item.subject || '') + '"></div>' +
            '<div class="col-md-2"><label class="add-label"><i class="bi bi-percent"></i>Marks (%)</label>' +
            '<input type="text" class="form-control add-input add-perc" maxlength="3" inputmode="numeric" autocomplete="off" placeholder="0–100" value="' + escapeHtml(normalizeMarksForDisplay(item.percentage)) + '"></div></div>' +
            renderAddCertUploadBlock() +
            '</div>'
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
            const fileInput = row.querySelector('.certificateUpload');
            if (fileInput && AF.files && typeof AF.files.showFileUploadSelected === 'function') {
                const hasServerFile = !!(item && item.certificatePath);
                AF.files.showFileUploadSelected(fileInput, label, { replaceReady: hasServerFile });
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
            const fileInput = row.querySelector('.add-cert-file');
            if (fileInput && AF.files && typeof AF.files.showFileUploadSelected === 'function') {
                const hasServerFile = !!(item && item.certificatePath);
                AF.files.showFileUploadSelected(fileInput, label, { replaceReady: hasServerFile });
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
            const yearEl = item.querySelector('.edu-year');
            const percEl = item.querySelector('.edu-perc');
            AF.state.eduItems.push({
                educationId: prev.educationId || parseInt(item.getAttribute('data-education-id'), 10) || 0,
                exam: item.querySelector('.edu-exam') && item.querySelector('.edu-exam').value,
                year: yearEl ? normalizeYearInput(yearEl.value) : '',
                board: item.querySelector('.edu-board') && item.querySelector('.edu-board').value,
                institution: item.querySelector('.edu-inst') && item.querySelector('.edu-inst').value,
                special: item.querySelector('.edu-special') && item.querySelector('.edu-special').value,
                percentage: percEl ? normalizeMarksInput(percEl.value) : '',
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
            const addYearEl = item.querySelector('.add-year');
            const addPercEl = item.querySelector('.add-perc');
            AF.state.additionalItems.push({
                additionalId: prev.additionalId || parseInt(item.getAttribute('data-additional-id'), 10) || 0,
                exam: item.querySelector('.add-exam') && item.querySelector('.add-exam').value,
                year: addYearEl ? normalizeYearInput(addYearEl.value) : '',
                board: item.querySelector('.add-board') && item.querySelector('.add-board').value,
                institution: item.querySelector('.add-inst') && item.querySelector('.add-inst').value,
                subject: item.querySelector('.add-subject') && item.querySelector('.add-subject').value,
                percentage: addPercEl ? normalizeMarksInput(addPercEl.value) : '',
                certificatePath: prev.certificatePath || item.getAttribute('data-cert-path') || '',
                certificateFileName: certName,
                isDeleted: false
            });
        });
    }

    function renderEdu() {
        AF.lists.renderList('eduListContainer', AF.state.eduItems, renderEduItem, 'edu');
        if (AF.files && typeof AF.files.enhanceFileUploadHosts === 'function') {
            AF.files.enhanceFileUploadHosts(document.getElementById('eduListContainer'));
        }
        restoreEduCertificateUi();
        if (AF.files && typeof AF.files.refreshFileUploadRules === 'function') {
            AF.files.refreshFileUploadRules(document.getElementById('eduListContainer'));
        }
    }

    function renderAdditional() {
        AF.lists.renderList('additionalListContainer', AF.state.additionalItems, renderAddItem, 'add');
        if (AF.files && typeof AF.files.enhanceFileUploadHosts === 'function') {
            AF.files.enhanceFileUploadHosts(document.getElementById('additionalListContainer'));
        }
        restoreAdditionalCertificateUi();
        if (AF.files && typeof AF.files.refreshFileUploadRules === 'function') {
            AF.files.refreshFileUploadRules(document.getElementById('additionalListContainer'));
        }
    }

    function onCertUploadCleared(e) {
        const input = e.target;
        if (!input || input.type !== 'file') {
            return;
        }
        const row = input.closest('.list-item');
        if (!row) {
            return;
        }
        if (input.classList.contains('certificateUpload')) {
            const rows = document.querySelectorAll('#eduListContainer .list-item');
            const idx = Array.prototype.indexOf.call(rows, row);
            if (idx >= 0 && AF.state.eduItems && AF.state.eduItems[idx]) {
                AF.state.eduItems[idx].certificateFileName = '';
                AF.state.eduItems[idx].certificatePath = '';
            }
            if (idx >= 0 && AF.state.filePreviews) {
                delete AF.state.filePreviews['edu-' + idx];
            }
            syncEdu();
        } else if (input.classList.contains('add-cert-file')) {
            const rows = document.querySelectorAll('#additionalListContainer .list-item');
            const idx = Array.prototype.indexOf.call(rows, row);
            if (idx >= 0 && AF.state.additionalItems && AF.state.additionalItems[idx]) {
                AF.state.additionalItems[idx].certificateFileName = '';
                AF.state.additionalItems[idx].certificatePath = '';
            }
            if (idx >= 0 && AF.state.filePreviews) {
                delete AF.state.filePreviews['add-' + idx];
            }
            syncAdditional();
        }
    }

    function initUploadHandlers() {
        if (!document._tab2CertClearBound) {
            document._tab2CertClearBound = true;
            document.addEventListener('file-upload-cleared', onCertUploadCleared);
        }

        const eduContainer = document.getElementById('eduListContainer');
        if (eduContainer && eduContainer.getAttribute('data-cert-ui-bound') !== '1') {
            eduContainer.setAttribute('data-cert-ui-bound', '1');
            eduContainer.addEventListener('change', function (e) {
                if (!e.target.classList.contains('certificateUpload')) return;
                if (AF.files && typeof AF.files.validateFileInputUi === 'function') {
                    if (!AF.files.validateFileInputUi(e.target)) {
                        return;
                    }
                }
                const row = e.target.closest('.list-item');
                const rows = document.querySelectorAll('#eduListContainer .list-item');
                const idx = row ? Array.prototype.indexOf.call(rows, row) : -1;
                const fileCount = e.target.files ? e.target.files.length : 0;
                if (idx >= 0 && fileCount > 0 && AF.files && typeof AF.files.storeFilePreview === 'function') {
                    AF.files.storeFilePreview('edu-' + idx, e.target.files[0]);
                }
                if (row && fileCount > 0) {
                    const label = fileCount === 1 ? e.target.files[0].name : fileCount + ' file(s) selected';
                    row.setAttribute('data-cert-name', label);
                }
                syncEdu();
            });
        }

        const addContainer = document.getElementById('additionalListContainer');
        if (addContainer && addContainer.getAttribute('data-cert-ui-bound') !== '1') {
            addContainer.setAttribute('data-cert-ui-bound', '1');
            addContainer.addEventListener('change', function (e) {
                if (!e.target.classList.contains('add-cert-file')) return;
                if (AF.files && typeof AF.files.validateFileInputUi === 'function') {
                    if (!AF.files.validateFileInputUi(e.target)) {
                        return;
                    }
                }
                const row = e.target.closest('.list-item');
                const rows = document.querySelectorAll('#additionalListContainer .list-item');
                const idx = row ? Array.prototype.indexOf.call(rows, row) : -1;
                const fileCount = e.target.files ? e.target.files.length : 0;
                if (idx >= 0 && fileCount > 0 && AF.files && typeof AF.files.storeFilesPreview === 'function') {
                    AF.files.storeFilesPreview('add-' + idx, e.target.files);
                }
                if (row && fileCount > 0) {
                    const label = fileCount === 1 ? e.target.files[0].name : fileCount + ' file(s) selected';
                    row.setAttribute('data-cert-name', label);
                }
                syncAdditional();
            });
        }
    }

    function ensureDefaultEduItems() {
        if (!AF.state.eduItems) {
            AF.state.eduItems = [];
        }
        if (!AF.state.eduItems.length) {
            AF.state.eduItems = [
                { exam: '10th', year: '', board: '', institution: '', special: '', percentage: '' },
                { exam: '12th', year: '', board: '', institution: '', special: '', percentage: '' }
            ];
        }
    }

    function bindCompactUploadKeyboard(container) {
        if (!container || container.getAttribute('data-upload-keybound') === '1') {
            return;
        }
        container.setAttribute('data-upload-keybound', '1');
        container.addEventListener('keydown', function (e) {
            const label = e.target.closest('.edu-upload-compact, .add-upload-compact');
            if (!label || (e.key !== 'Enter' && e.key !== ' ')) {
                return;
            }
            e.preventDefault();
            const input = label.querySelector('input[type="file"]');
            if (input) {
                input.click();
            }
        });
    }

    function trimVal(value) {
        return value != null ? String(value).trim() : '';
    }

    function showTab2Toast(message) {
        const text = message != null ? String(message).trim() : '';
        if (!text) return;
        if (AF.utils && typeof AF.utils.showToast === 'function') {
            AF.utils.showToast(text, 'error');
            return;
        }
        if (window.LawPortal && typeof window.LawPortal.alert === 'function') {
            window.LawPortal.alert({ icon: 'error', title: 'Validation', text: text });
            return;
        }
        alert(text);
    }

    function normalizeYearInput(val) {
        return String(val != null ? val : '').replace(/\D/g, '').slice(0, 4);
    }

    function normalizeMarksInput(val) {
        let s = String(val != null ? val : '').replace(/\D/g, '').slice(0, 3);
        if (s !== '' && parseInt(s, 10) > 100) {
            s = '100';
        }
        return s;
    }

    function normalizeMarksForDisplay(val) {
        const s = trimVal(val);
        if (!s) return '';
        return normalizeMarksInput(s);
    }

    function parseYearOfPassing(val) {
        const s = normalizeYearInput(trimVal(val));
        if (!/^\d{4}$/.test(s)) return null;
        return parseInt(s, 10);
    }

    function isValidMarks(val) {
        const s = normalizeMarksInput(trimVal(val));
        if (!s || !/^\d{1,3}$/.test(s)) return false;
        const n = parseInt(s, 10);
        return n >= 0 && n <= 100;
    }

    function markFieldInvalid(input, invalid) {
        if (!input) return;
        input.classList.toggle('is-invalid', !!invalid);
    }

    function validateYearInput(input, showToastOnError) {
        if (!input) return true;
        const currentYear = new Date().getFullYear();
        const raw = normalizeYearInput(input.value);
        if (input.value !== raw) {
            input.value = raw;
        }
        if (!raw) {
            markFieldInvalid(input, true);
            if (showToastOnError) {
                showTab2Toast('Please enter the year of passing (4 digits, e.g. 2018).');
            }
            return false;
        }
        if (raw.length < 4) {
            markFieldInvalid(input, true);
            if (showToastOnError) {
                showTab2Toast('Year of passing must be exactly 4 digits (e.g. 2018).');
            }
            return false;
        }
        const year = parseInt(raw, 10);
        const invalid = year < 1950 || year > currentYear;
        markFieldInvalid(input, invalid);
        if (invalid && showToastOnError) {
            showTab2Toast('Year of passing must be between 1950 and ' + currentYear + '.');
        }
        return !invalid;
    }

    function validateMarksInput(input, showToastOnError) {
        if (!input) return true;
        const raw = normalizeMarksInput(input.value);
        if (input.value !== raw) {
            input.value = raw;
        }
        const invalid = !isValidMarks(raw);
        markFieldInvalid(input, invalid);
        if (invalid && showToastOnError) {
            if (!raw) {
                showTab2Toast('Please enter marks (0 to 100, up to 3 digits).');
            } else {
                showTab2Toast('Marks must be a whole number from 0 to 100.');
            }
        }
        return !invalid;
    }

    function bindTab2FieldValidation(container) {
        if (!container || container.getAttribute('data-field-validation-bound') === '1') {
            return;
        }
        container.setAttribute('data-field-validation-bound', '1');
        container.addEventListener('blur', function (e) {
            const t = e.target;
            if (!t || !t.classList) return;
            if (t.classList.contains('edu-year') || t.classList.contains('add-year')) {
                validateYearInput(t, true);
            } else if (t.classList.contains('edu-perc') || t.classList.contains('add-perc')) {
                validateMarksInput(t, true);
            }
        }, true);
        container.addEventListener('input', function (e) {
            const t = e.target;
            if (!t || !t.classList) return;
            if (t.classList.contains('edu-year') || t.classList.contains('add-year')) {
                const v = normalizeYearInput(t.value);
                if (t.value !== v) t.value = v;
                markFieldInvalid(t, false);
            } else if (t.classList.contains('edu-perc') || t.classList.contains('add-perc')) {
                const v = normalizeMarksInput(t.value);
                if (t.value !== v) t.value = v;
                markFieldInvalid(t, false);
            }
        });
        container.addEventListener('keypress', function (e) {
            const t = e.target;
            if (!t || !t.classList) return;
            if (t.classList.contains('edu-year') || t.classList.contains('add-year')
                || t.classList.contains('edu-perc') || t.classList.contains('add-perc')) {
                if (e.key && e.key.length === 1 && !/\d/.test(e.key)) {
                    e.preventDefault();
                }
            }
        });
    }

    function deleteSavedEducationRow(removed, rowEl) {
        const educationId = parseInt(removed && removed.educationId, 10)
            || parseInt(rowEl && rowEl.getAttribute('data-education-id'), 10)
            || 0;
        if (educationId > 0 && AF.api && typeof AF.api.deleteEducationRecord === 'function') {
            AF.api.deleteEducationRecord(educationId).catch(function (err) {
                showTab2Toast(err && err.message ? err.message : 'Failed to delete educational qualification on server.');
            });
        }
    }

    function deleteSavedAdditionalRow(removed, rowEl) {
        const additionalId = parseInt(removed && removed.additionalId, 10)
            || parseInt(rowEl && rowEl.getAttribute('data-additional-id'), 10)
            || 0;
        if (additionalId > 0 && AF.api && typeof AF.api.deleteAdditionalQualificationRecord === 'function') {
            AF.api.deleteAdditionalQualificationRecord(additionalId).catch(function (err) {
                showTab2Toast(err && err.message ? err.message : 'Failed to delete additional qualification on server.');
            });
        }
    }

    /**
     * Remove one Tab 2 row (education or additional). UI updates immediately; server delete runs in background.
     */
    function removeRow(type, idx, btn) {
        const index = parseInt(idx, 10);
        if (isNaN(index) || index < 0) {
            return false;
        }

        const rowEl = btn && btn.closest ? btn.closest('.list-item') : null;

        if (type === 'edu') {
            snapshotEduFilesFromDom();
            syncEdu();
            const items = AF.state.eduItems || [];
            if (index >= items.length) {
                return false;
            }
            const removed = items[index];
            items.splice(index, 1);
            if (AF.lists && typeof AF.lists.reindexFilePreviewsAfterRemove === 'function') {
                AF.lists.reindexFilePreviewsAfterRemove('edu', index);
            }
            renderEdu();
            deleteSavedEducationRow(removed, rowEl);
            return true;
        }

        if (type === 'add') {
            snapshotAdditionalFilesFromDom();
            syncAdditional();
            const items = AF.state.additionalItems || [];
            if (index >= items.length) {
                return false;
            }
            const removed = items[index];
            items.splice(index, 1);
            if (AF.lists && typeof AF.lists.reindexFilePreviewsAfterRemove === 'function') {
                AF.lists.reindexFilePreviewsAfterRemove('add', index);
            }
            renderAdditional();
            deleteSavedAdditionalRow(removed, rowEl);
            return true;
        }

        return false;
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

        const applicantId = parseInt(sessionStorage.getItem('applicantId'), 10);

        if (!applicantId) {
            showTab2Toast('Applicant ID is missing. Please log in again.');
            return false;
        }

        const eduItems = AF.state.eduItems || [];
        if (!eduItems.length) {
            showTab2Toast('Please add at least one educational qualification.');
            return false;
        }

        const currentYear = new Date().getFullYear();

        for (let i = 0; i < eduItems.length; i++) {
            const item = eduItems[i];
            const rowLabel = 'Educational qualification #' + (i + 1);

            if (!trimVal(item.exam)) {
                showTab2Toast(rowLabel + ': Please enter the examination passed.');
                scrollToEduRow(i);
                return false;
            }

            if (!trimVal(item.year)) {
                showTab2Toast(rowLabel + ': Please enter the year of passing (4 digits).');
                scrollToEduRow(i);
                return false;
            }
            const year = parseYearOfPassing(item.year);
            if (year === null) {
                showTab2Toast(rowLabel + ': Year of passing must be exactly 4 digits (e.g. 2018).');
                scrollToEduRow(i);
                return false;
            }
            if (year < 1950 || year > currentYear) {
                showTab2Toast(rowLabel + ': Year of passing must be between 1950 and ' + currentYear + '.');
                scrollToEduRow(i);
                return false;
            }

            if (!trimVal(item.board)) {
                showTab2Toast(rowLabel + ': Please enter the board / university.');
                scrollToEduRow(i);
                return false;
            }

            if (!trimVal(item.institution)) {
                showTab2Toast(rowLabel + ': Please enter the institution name.');
                scrollToEduRow(i);
                return false;
            }

            if (!trimVal(item.special)) {
                showTab2Toast(rowLabel + ': Please enter the main subject / specialization.');
                scrollToEduRow(i);
                return false;
            }

            if (!trimVal(item.percentage)) {
                showTab2Toast(rowLabel + ': Please enter marks (0 to 100).');
                scrollToEduRow(i);
                return false;
            }
            if (!isValidMarks(item.percentage)) {
                showTab2Toast(rowLabel + ': Marks must be a whole number from 0 to 100 (up to 3 digits).');
                scrollToEduRow(i);
                return false;
            }

            if (!hasEduCertificate(item, i)) {
                showTab2Toast(rowLabel + ': Please upload the certificate (JPG, PNG, or PDF, max 5 MB).');
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
                showTab2Toast(addLabel + ': Please enter the examination passed.');
                scrollToAdditionalRow(j);
                return false;
            }

            if (!trimVal(add.year)) {
                showTab2Toast(addLabel + ': Please enter the year of passing (4 digits).');
                scrollToAdditionalRow(j);
                return false;
            }
            const addYear = parseYearOfPassing(add.year);
            if (addYear === null) {
                showTab2Toast(addLabel + ': Year of passing must be exactly 4 digits (e.g. 2018).');
                scrollToAdditionalRow(j);
                return false;
            }
            if (addYear < 1950 || addYear > currentYear) {
                showTab2Toast(addLabel + ': Year of passing must be between 1950 and ' + currentYear + '.');
                scrollToAdditionalRow(j);
                return false;
            }

            if (!trimVal(add.board)) {
                showTab2Toast(addLabel + ': Please enter the board / university.');
                scrollToAdditionalRow(j);
                return false;
            }

            if (!trimVal(add.institution)) {
                showTab2Toast(addLabel + ': Please enter the institution name.');
                scrollToAdditionalRow(j);
                return false;
            }

            if (!trimVal(add.subject)) {
                showTab2Toast(addLabel + ': Please enter the subject.');
                scrollToAdditionalRow(j);
                return false;
            }

            if (!trimVal(add.percentage)) {
                showTab2Toast(addLabel + ': Please enter marks (0 to 100).');
                scrollToAdditionalRow(j);
                return false;
            }
            if (!isValidMarks(add.percentage)) {
                showTab2Toast(addLabel + ': Marks must be a whole number from 0 to 100 (up to 3 digits).');
                scrollToAdditionalRow(j);
                return false;
            }

            if (!hasAdditionalCertificate(add, j)) {
                showTab2Toast(addLabel + ': Please upload the certificate (JPG, PNG, or PDF, max 5 MB).');
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
        ensureDefaultEduItems();
        renderEdu();
        renderAdditional();

        bindCompactUploadKeyboard(document.getElementById('eduListContainer'));
        bindCompactUploadKeyboard(document.getElementById('additionalListContainer'));
        bindTab2FieldValidation(document.getElementById('tab2'));

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
                showTab2Toast(err && err.message ? err.message : 'Failed to save qualifications. Please try again.');
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
        validateStep2: validateStep2,
        ensureDefaultEduItems: ensureDefaultEduItems,
        removeRow: removeRow
    };
})(window.ApplicationForm);
