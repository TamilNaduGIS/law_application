/**
 * Tab 2: Qualifications (Educational & Additional)
 */
(function (AF) {
    const escapeHtml = AF.utils.escapeHtml;

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
            '<input type="date" class="form-control edu-input edu-year" value="' + escapeHtml(item.year || '') + '"></div>' +
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
            '<input class="form-control add-input add-year" value="' + escapeHtml(item.year || '') + '"></div>' +
            '<div class="col-md-3"><label class="add-label"><i class="bi bi-building-fill"></i>Board</label>' +
            '<input class="form-control add-input add-board" value="' + escapeHtml(item.board || '') + '"></div>' +
            '<div class="col-md-3"><label class="add-label"><i class="bi bi-bank2"></i>Institution</label>' +
            '<input class="form-control add-input add-board" value="' + escapeHtml(item.board || '') + '"></div>' +
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

    function syncEdu() {
        AF.state.eduItems = [];
        document.querySelectorAll('#eduListContainer .list-item').forEach(function (item) {
            const fileInput = item.querySelector('.edu-cert-file');
            let certName = item.getAttribute('data-cert-name') || '';
            if (fileInput && fileInput.files && fileInput.files[0]) certName = fileInput.files[0].name;
            AF.state.eduItems.push({
                exam: item.querySelector('.edu-exam') && item.querySelector('.edu-exam').value,
                year: item.querySelector('.edu-year') && item.querySelector('.edu-year').value,
                board: item.querySelector('.edu-board') && item.querySelector('.edu-board').value,
                institution: item.querySelector('.edu-inst') && item.querySelector('.edu-inst').value,
                special: item.querySelector('.edu-special') && item.querySelector('.edu-special').value,
                percentage: item.querySelector('.edu-perc') && item.querySelector('.edu-perc').value,
                certificateFileName: certName
            });
        });
    }

    function syncAdditional() {
        AF.state.additionalItems = [];
        document.querySelectorAll('#additionalListContainer .list-item').forEach(function (item) {
            AF.state.additionalItems.push({
                exam: item.querySelector('.add-exam') && item.querySelector('.add-exam').value,
                year: item.querySelector('.add-year') && item.querySelector('.add-year').value,
                board: item.querySelector('.add-board') && item.querySelector('.add-board').value,
                subject: item.querySelector('.add-subject') && item.querySelector('.add-subject').value,
                percentage: item.querySelector('.add-perc') && item.querySelector('.add-perc').value
            });
        });
    }

    function renderEdu() {
        AF.lists.renderList('eduListContainer', AF.state.eduItems, renderEduItem, 'edu');
    }

    function renderAdditional() {
        AF.lists.renderList('additionalListContainer', AF.state.additionalItems, renderAddItem, 'add');
    }

    function initUploadHandlers() {
        $(document).on('change', '.certificateUpload', function () {
            const fileCount = this.files.length;
            const uploadTitle = $(this).closest('.edu-upload-box').find('.edu-upload-title');
            if (fileCount > 0) {
                uploadTitle.html('<i class="bi bi-check-circle-fill text-success me-1"></i>' + fileCount + ' file(s) selected');
            }
        });

        $(document).on('change', '.add-cert-file', function () {
            const fileCount = this.files.length;
            const title = $(this).closest('.add-upload-box').find('.add-upload-title');
            if (fileCount > 0) {
                title.html('<i class="bi bi-check-circle-fill text-success me-1"></i>' + fileCount + ' file(s) selected');
            }
        });
    }

    function initDefaultEduItems() {
        if (!AF.state.eduItems.length) {
            AF.state.eduItems.push({
                exam: '10th', year: '', board: '', institution: '', special: '', percentage: ''
            });
            AF.state.eduItems.push({
                exam: '12th', year: '', board: '', institution: '', special: '', percentage: ''
            });
        }
    }

    function init() {
        initUploadHandlers();
        initDefaultEduItems();

        const addEduBtn = document.getElementById('addEduBtn');
        if (addEduBtn) {
            addEduBtn.addEventListener('click', function () {
                AF.state.eduItems.push({});
                renderEdu();
            });
        }

        const addAdditionalBtn = document.getElementById('addAdditionalBtn');
        if (addAdditionalBtn) {
            addAdditionalBtn.addEventListener('click', function () {
                AF.state.additionalItems.push({});
                renderAdditional();
            });
        }

        const prevBtn = document.getElementById('prevToTab1');
        if (prevBtn) prevBtn.addEventListener('click', function () { AF.nav.switchTab(1); });

        const nextBtn = document.getElementById('nextToTab3');
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                AF.data.saveDraft();
                AF.nav.switchTab(3);
            });
        }
    }

    AF.tab2 = {
        init: init,
        renderEdu: renderEdu,
        renderAdditional: renderAdditional,
        syncEdu: syncEdu,
        syncAdditional: syncAdditional
    };
})(window.ApplicationForm);
