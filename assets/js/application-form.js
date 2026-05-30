window.PortalNav = window.PortalNav || {
    mount: function(){},
    render: function(){}
};

// window.onerror = function(msg, url, line) {
//     console.log('JS ERROR:', msg, 'LINE:', line);
// };


window.AppData = {
    getSession: () => ({
        userId: 'TEMP001'
    }),

    getApplication: () => null,
    getPersonalProfile: () => null,
    saveApplication: () => {},
    updateUserProfile: () => {}
};

/**
 * Application form: full apply flow, menu tab-1 view, submitted preview-only view.
 */
(function () {
    const params = new URLSearchParams(window.location.search);
    const from = params.get('from') || 'apply';
    const jobId = params.get('jobId') || sessionStorage.getItem('selectedJobId');
    const userIdParam = params.get('userId');

    // const session = AppData.getSession();
    // if (!session) {
    //     window.location.href = 'login.html?return=' + encodeURIComponent('application-form.html' + window.location.search);
    //     return;
    // }
    // if (userIdParam && userIdParam !== session.userId) {
    //     alert('Session mismatch. Please log in again.');
    //     AppData.logout();
    //     window.location.href = 'login.html';
    //     return;
    // }

    // const userId = session.userId;
    // const job = jobId ? AppData.getJobById(jobId) : null;
    // const postName = job ? job.postName : (sessionStorage.getItem('selectedPost') || '—');
    // const existingApp = jobId ? AppData.getApplication(userId, jobId) : null;
    // const isSubmitted = existingApp && existingApp.status === 'submitted';

    // let formMode = 'full';
    // if (from === 'menu') {
    //     formMode = isSubmitted ? 'previewOnly' : 'tab1Only';
    // } else if (isSubmitted) {
    //     formMode = 'previewOnly';
    // }



    const session = {};
    const userId = 'TEMP001';
    const existingApp = null;
    const formMode = 'full';




    PortalNav.mount('portalNavMount', { activePage: 'application', userId: userId, jobId: jobId });

    const jobBanner = document.getElementById('jobContextBanner');
    const modeNotice = document.getElementById('modeNotice');
    const filePreviews = {};

    function getCourtBench() {
        const el = document.getElementById('courtBenchSelect');
        return el ? el.value : (sessionStorage.getItem('courtBench') || 'High Court');
    }

    function mountJobBanner() {
        if (!jobBanner) return;
        if (!jobId) {
            jobBanner.innerHTML = 'No job selected. Choose a post on <a href="apply-post.html">Job Posts</a> and click Apply.';
            return;
        }
        const savedBench = (existingApp && existingApp.courtBench) || sessionStorage.getItem('courtBench') || 'High Court';
        const benchOpts = ['High Court', 'Madurai Bench'];
        let optsHtml = '';
        benchOpts.forEach(function (opt) {
            optsHtml += '<option value="' + escapeHtml(opt) + '"' + (savedBench === opt ? ' selected' : '') + '>' + escapeHtml(opt) + '</option>';
        });
        jobBanner.innerHTML =
            '<div class="job-banner-inner">' +
            '<div class="job-banner-meta">Post: <strong>' + escapeHtml(postName) + '</strong> · Job ID: <strong>' + jobId + '</strong> · User: <strong>' + escapeHtml(userId) + '</strong></div>' +
            '<div class="job-banner-court"><label for="courtBenchSelect" class="job-banner-court-label">Court</label>' +
            '<select id="courtBenchSelect" class="form-select form-select-sm court-bench-select"' + (formMode === 'previewOnly' ? ' disabled' : '') + '>' + optsHtml + '</select></div></div>';
        const sel = document.getElementById('courtBenchSelect');
        if (sel && formMode !== 'previewOnly') {
            sel.addEventListener('change', function () {
                sessionStorage.setItem('courtBench', sel.value);
                saveDraft();
            });
        }
    }
    // if (modeNotice) {
    //     if (formMode === 'tab1Only') {
    //         modeNotice.textContent = 'Profile view: Personal & Professional details from your registered account. Use Apply on a job post to complete the full application.';
    //         modeNotice.style.display = 'block';
    //     } else if (formMode === 'previewOnly') {
    //         modeNotice.textContent = 'Submitted application — preview only.';
    //         modeNotice.style.display = 'block';
    //     }
    // }

    let eduItems = [];
    let additionalItems = [];
    let barItems = [];
    // let practiceItems = [];
    // let judgmentAAGItems = [];
    // let judgmentAGPItems = [];

    let judgmentAAGItems = [{
    caseNo: '',
    caseDetails: '',
    judgment: '',
    remarks: ''
}];

let practiceItems = [{
    court: '',
    years: '',
    from: '',
    to: '',
    status: ''
}];

let judgmentAGPItems = [];

    const tabs = {
        1: document.getElementById('tab1'),
        2: document.getElementById('tab2'),
        3: document.getElementById('tab3'),
        4: document.getElementById('tab4')
    };
    const tabButtons = document.querySelectorAll('.main-tab');

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function (m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    const FILE_NAME_MAX_LEN = 20;

    function truncateFileName(name, maxLen) {
        maxLen = maxLen || FILE_NAME_MAX_LEN;
        if (!name) return '';
        if (name.length <= maxLen) return name;
        const dot = name.lastIndexOf('.');
        const ext = dot > 0 ? name.slice(dot) : '';
        const baseLen = Math.max(4, maxLen - ext.length - 3);
        return name.slice(0, baseLen) + '...' + ext;
    }

    function getFileLabelText(input, defaultLabel) {
        if (!input || !input.files || !input.files.length) return defaultLabel;
        if (input.files.length === 1) return truncateFileName(input.files[0].name);
        return truncateFileName(input.files[0].name) + ' (+' + (input.files.length - 1) + ')';
    }

    function storeFilePreview(key, file) {
        if (!file) {
            delete filePreviews[key];
            return;
        }
        const reader = new FileReader();
        reader.onload = function () {
            filePreviews[key] = {
                name: file.name,
                type: file.type || '',
                dataUrl: reader.result,
                isImage: (file.type || '').indexOf('image/') === 0,
                isPdf: file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
            };
        };
        reader.readAsDataURL(file);
    }

    function storeFilesPreview(key, fileList) {
        if (!fileList || !fileList.length) {
            filePreviews[key] = [];
            return;
        }
        filePreviews[key] = [];
        Array.from(fileList).forEach(function (file, i) {
            const reader = new FileReader();
            reader.onload = function () {
                filePreviews[key][i] = {
                    name: file.name,
                    type: file.type || '',
                    dataUrl: reader.result,
                    isImage: (file.type || '').indexOf('image/') === 0,
                    isPdf: file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
                };
            };
            reader.readAsDataURL(file);
        });
    }

    function resolvePreviewKey(input) {
        if (!input || !input.id) return null;
        if (input.id === 'photoUpload') return 'photo';
        if (input.id === 'draftingUpload') return 'drafting';
        const m = input.id.match(/^edu-cert-(\d+)$/);
        if (m) return 'edu-' + m[1];
        m = input.id.match(/^add-cert-(\d+)$/);
        if (m) return 'add-' + m[1];
        m = input.id.match(/^bar-doc-(\d+)$/);
        if (m) return 'bar-' + m[1];
        m = input.id.match(/^practice-doc-(\d+)$/);
        if (m) return 'practice-' + m[1];
        m = input.id.match(/^judgment-doc-(\d+)-(.+)$/);
        if (m) return 'judgment-' + m[1] + '-' + m[2];
        return null;
    }

    function collectLiveFilePreviews() {
        const photo = document.getElementById('photoUpload');
        if (photo && photo.files && photo.files[0]) storeFilePreview('photo', photo.files[0]);
        const drafting = document.getElementById('draftingUpload');
        if (drafting && drafting.files && drafting.files.length) storeFilesPreview('drafting', drafting.files);
        document.querySelectorAll('#eduListContainer .list-item').forEach(function (item, idx) {
            const fi = item.querySelector('.edu-cert-file');
            if (fi && fi.files && fi.files[0]) storeFilePreview('edu-' + idx, fi.files[0]);
        });
        document.querySelectorAll('#additionalListContainer .list-item').forEach(function (item, idx) {
            const fi = item.querySelector('.add-cert-file');
            if (fi && fi.files && fi.files.length) storeFilesPreview('add-' + idx, fi.files);
        });
        document.querySelectorAll('#barExpContainer .list-item').forEach(function (item, idx) {
            const fi = item.querySelector('.bar-doc-file');
            if (fi && fi.files && fi.files.length) storeFilesPreview('bar-' + idx, fi.files);
        });
        document.querySelectorAll('#courtPracticeContainer .list-item').forEach(function (item, idx) {
            const fi = item.querySelector('.practice-doc-file');
            if (fi && fi.files && fi.files.length) storeFilesPreview('practice-' + idx, fi.files);
        });
        ['judgmentAAG', 'judgmentAGP'].forEach(function (type) {
            document.querySelectorAll('#' + (type === 'judgmentAAG' ? 'judgmentAAG' : 'judgmentAGP') + 'Container .list-item').forEach(function (item, idx) {
                const fi = item.querySelector('.judgment-doc-file');
                if (fi && fi.files && fi.files.length) storeFilesPreview('judgment-' + idx + '-' + type, fi.files);
            });
        });
    }

    function pv(val) {
        return escapeHtml(val || '—');
    }

    function previewFieldRow(label, value) {
        return '<tr><th>' + escapeHtml(label) + '</th><td>' + pv(value) + '</td></tr>';
    }

    function previewTable(rows) {
        return '<table class="table table-sm preview-table mb-0"><tbody>' + rows + '</tbody></table>';
    }

    function renderDocPreview(p) {
        if (!p) return '<span class="text-muted small">No file uploaded</span>';
        if (Array.isArray(p)) {
            if (!p.length) return '<span class="text-muted small">No file uploaded</span>';
            return '<div class="preview-doc-list">' + p.map(function (f) { return renderDocPreview(f); }).join('') + '</div>';
        }
        if (!p.dataUrl) return '<span class="text-muted small">' + pv(p.name) + '</span>';
        if (p.isImage) {
            return '<div class="preview-doc preview-doc-image"><img src="' + p.dataUrl + '" alt="' + pv(p.name) + '"><p class="small text-muted mb-0">' + pv(p.name) + '</p></div>';
        }
        if (p.isPdf) {
            return '<div class="preview-doc preview-doc-pdf"><iframe src="' + p.dataUrl + '" title="' + pv(p.name) + '"></iframe><p class="small text-muted mb-0">' + pv(p.name) + '</p></div>';
        }
        return '<div class="preview-doc preview-doc-file"><a href="' + p.dataUrl + '" download="' + pv(p.name) + '"><i class="fas fa-file-alt me-1"></i>' + pv(p.name) + '</a></div>';
    }

    function buildFileUploadHtml(inputId, defaultLabel, savedFileName, extraClass, accept, multiple) {
        const display = savedFileName ? truncateFileName(savedFileName) : defaultLabel;
        const hasFile = savedFileName ? ' has-file' : '';
        const multi = multiple ? ' multiple' : '';
        const acceptAttr = accept ? ' accept="' + accept + '"' : '';
        const cls = extraClass ? ' ' + extraClass : '';
        return (
            '<div class="custom-file-upload' + hasFile + '" data-default="' + escapeHtml(defaultLabel) + '">' +
            '<input type="file" id="' + inputId + '" class="file-input-hidden' + cls + '"' + acceptAttr + multi + '>' +
            '<button type="button" class="btn btn-outline-primary btn-upload-file btn-upload-file-sm w-100">' +
            '<i class="fas fa-file-upload me-1"></i><span class="upload-btn-text" title="' + escapeHtml(savedFileName || '') + '">' + escapeHtml(display) + '</span>' +
            '</button></div>'
        );
    }

    function initFileUploadButtons(root) {
        const nodes = root && root.querySelectorAll
            ? (root.classList && root.classList.contains('custom-file-upload')
                ? [root]
                : root.querySelectorAll('.custom-file-upload'))
            : document.querySelectorAll('.custom-file-upload');

        nodes.forEach(function (wrap) {
            if (wrap.getAttribute('data-upload-init') === '1') return;
            wrap.setAttribute('data-upload-init', '1');
            const input = wrap.querySelector('.file-input-hidden');
            const btn = wrap.querySelector('.btn-upload-file');
            const textEl = wrap.querySelector('.upload-btn-text');
            const defaultLabel = wrap.getAttribute('data-default') || 'Upload';
            if (!input || !btn || !textEl) return;

            btn.addEventListener('click', function () { input.click(); });
            input.addEventListener('change', function () {
                const previewKey = resolvePreviewKey(input);
                if (input.files && input.files.length) {
                    textEl.textContent = getFileLabelText(input, defaultLabel);
                    textEl.title = Array.from(input.files).map(function (f) { return f.name; }).join(', ');
                    wrap.classList.add('has-file');
                    if (previewKey === 'drafting') storeFilesPreview('drafting', input.files);
                    else if (previewKey && input.files.length > 1) storeFilesPreview(previewKey, input.files);
                    else if (previewKey) storeFilePreview(previewKey, input.files[0]);
                    const listItem = input.closest('.list-item');
                    if (listItem) {
                        listItem.setAttribute('data-cert-name', input.files[0].name);
                        if (listItem.closest('#eduListContainer')) syncEdu();
                        else if (listItem.closest('#additionalListContainer')) syncAdditional();
                        else if (listItem.closest('#barExpContainer')) syncBar();
                        else if (listItem.closest('#courtPracticeContainer')) syncPractice();
                        else if (listItem.closest('#judgmentAAGContainer')) syncJudgmentAAG();
                        else if (listItem.closest('#judgmentAGPContainer')) syncJudgmentAGP();
                    }
                } else {
                    if (previewKey) delete filePreviews[previewKey];
                    textEl.textContent = defaultLabel;
                    textEl.title = '';
                    wrap.classList.remove('has-file');
                }
            });
        });
    }

    function setVal(id, value) {
        const el = document.getElementById(id);
        if (!el || value == null || value === '') return;
        el.value = value;
    }

    function getPersonalFromForm() {
        return {
            advocateName: document.getElementById('advocateName').value.trim(),
            enrolmentNo: document.getElementById('enrolmentNo').value.trim(),
            fatherName: document.getElementById('fatherName').value.trim(),
            gender: document.getElementById('gender').value,
            maritalStatus: document.getElementById('maritalStatus').value,
            dob: document.getElementById('dob').value,
            nationality: document.getElementById('nationality').value.trim(),
            religion: document.getElementById('religion').value.trim(),
            community: document.getElementById('community').value,
            mobile: document.getElementById('mobile').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            email: document.getElementById('email').value.trim(),
            pan: document.getElementById('pan').value.trim(),
            district: document.getElementById('district').value.trim(),
            pincode: document.getElementById('pincode').value.trim(),
            officeAddress: document.getElementById('officeAddress').value.trim(),
            permanentAddress: document.getElementById('permanentAddress').value.trim(),
            photoFileName: getPhotoFileName()
        };
    }

    function getPhotoFileName() {
        const photoInput = document.getElementById('photoUpload');
        if (photoInput && photoInput.files && photoInput.files[0]) return photoInput.files[0].name;
        const wrap = photoInput?.closest('.custom-file-upload');
        if (wrap && wrap.classList.contains('has-file')) {
            const text = wrap.querySelector('.upload-btn-text');
            return (text && text.title) ? text.title : '';
        }
        return '';
    }

    function fillPersonal(data) {
        if (!data) return;
        setVal('advocateName', data.advocateName);
        setVal('enrolmentNo', data.enrolmentNo);
        setVal('fatherName', data.fatherName);
        if (data.gender) document.getElementById('gender').value = data.gender;
        if (data.maritalStatus) document.getElementById('maritalStatus').value = data.maritalStatus;
        setVal('dob', data.dob);
        setVal('nationality', data.nationality);
        setVal('religion', data.religion);
        if (data.community) document.getElementById('community').value = data.community;
        setVal('mobile', data.mobile);
        setVal('phone', data.phone);
        setVal('email', data.email);
        setVal('pan', data.pan);
        setVal('district', data.district);
        setVal('pincode', data.pincode);
        setVal('officeAddress', data.officeAddress);
        setVal('permanentAddress', data.permanentAddress);
        if (data.photoFileName) setPhotoFileLabel(data.photoFileName);
    }

    function setPhotoFileLabel(fileName) {
        const wrap = document.querySelector('#photoUpload')?.closest('.custom-file-upload');
        if (!wrap) return;
        const textEl = wrap.querySelector('.upload-btn-text');
        if (textEl) {
            textEl.textContent = truncateFileName(fileName);
            textEl.title = fileName;
            wrap.classList.add('has-file');
        }
    }

    function loadApplicationData(app) {
        if (!app) return;
        if (app.personal) fillPersonal(app.personal);
        if (app.lawDegreeRecognized) document.getElementById('lawDegreeRecognized').value = app.lawDegreeRecognized;
        eduItems = app.eduItems ? app.eduItems.slice() : [];
        additionalItems = app.additionalItems ? app.additionalItems.slice() : [];
        barItems = app.barItems ? app.barItems.slice() : [];
        practiceItems = app.practiceItems ? app.practiceItems.slice() : [];
        judgmentAAGItems = app.judgmentAAGItems ? app.judgmentAAGItems.slice() : [];
        judgmentAGPItems = app.judgmentAGPItems ? app.judgmentAGPItems.slice() : [];
        setVal('draftingYears', app.draftingYears);
        if (app.declDate) setVal('declDate', app.declDate);
        if (app.declPlace) setVal('declPlace', app.declPlace);
        if (app.signature) setVal('signature', app.signature);
        if (app.itAssessee) setVal('itAssessee', app.itAssessee);
        if (app.filePreviews) {
            Object.keys(app.filePreviews).forEach(function (k) {
                filePreviews[k] = app.filePreviews[k];
            });
        }
        if (filePreviews.photo && filePreviews.photo.name) setPhotoFileLabel(filePreviews.photo.name);
        renderAll();
        mountJobBanner();
    }

    function collectApplicationPayload() {
        syncEdu();
        syncAdditional();
        syncBar();
        syncPractice();
        syncJudgmentAAG();
        syncJudgmentAGP();
        collectLiveFilePreviews();
        return {
            personal: getPersonalFromForm(),
            courtBench: getCourtBench(),
            lawDegreeRecognized: document.getElementById('lawDegreeRecognized').value,
            eduItems: eduItems.slice(),
            additionalItems: additionalItems.slice(),
            barItems: barItems.slice(),
            practiceItems: practiceItems.slice(),
            judgmentAAGItems: judgmentAAGItems.slice(),
            judgmentAGPItems: judgmentAGPItems.slice(),
            draftingYears: document.getElementById('draftingYears').value,
            itAssessee: document.getElementById('itAssessee').value,
            declDate: document.getElementById('declDate').value,
            declPlace: document.getElementById('declPlace').value,
            signature: document.getElementById('signature') ? document.getElementById('signature').value : '',
            postName: postName,
            filePreviews: JSON.parse(JSON.stringify(filePreviews))
        };
    }

    function saveDraft() {
        if (!jobId || formMode === 'previewOnly') return;
        AppData.saveApplication(userId, jobId, collectApplicationPayload(), 'draft');
        AppData.updateUserProfile(userId, getPersonalFromForm());
    }

    function prefillTab1FromDb() {
        const profile = AppData.getPersonalProfile(userId);
        fillPersonal(profile);
        if (existingApp && existingApp.personal) fillPersonal(existingApp.personal);
    }

    function applyFormMode() {
        const wizardNav = document.querySelector('.main-tab-container');
        const btnNext1 = document.getElementById('nextToTab2');
        const declBox = document.querySelector('.declaration-box');
        const finalBtn = document.getElementById('finalSubmitBtn');
        const prev4 = document.getElementById('prevToTab3');

        if (formMode === 'tab1Only') {
            tabButtons.forEach((btn) => {
                const t = parseInt(btn.getAttribute('data-tab'), 10);
                if (t !== 1) btn.classList.add('hidden-tab');
            });
            if (btnNext1) btnNext1.style.display = 'none';
            tabs[1].querySelectorAll('input, select, textarea').forEach((el) => {
                if (el.id !== 'enrolmentNo') el.setAttribute('readonly', 'readonly');
            });
            switchTab(1);
            return;
        }

        if (formMode === 'previewOnly') {
            if (wizardNav) wizardNav.style.display = 'none';
            [1, 2, 3].forEach((n) => {
                if (tabs[n]) tabs[n].style.display = 'none';
            });
            if (declBox) declBox.style.display = 'none';
            if (finalBtn) finalBtn.style.display = 'none';
            if (prev4) prev4.style.display = 'none';
            tabs[4].classList.add('readonly-mode');
            tabs[4].classList.add('active-panel');
            if (!existingApp) {
                document.getElementById('previewContent').innerHTML =
                    '<p class="alert alert-warning">No submitted application found for this post. Complete and submit via <strong>Apply</strong> on Job Posts.</p>';
            } else {
                loadApplicationData(existingApp);
                generatePreview();
            }
            return;
        }

        switchTab(1);
    }

    function switchTab(tabId) {
        Object.values(tabs).forEach((t) => t && t.classList.remove('active-panel'));
        if (tabs[tabId]) tabs[tabId].classList.add('active-panel');
        tabButtons.forEach((btn) => {
            const id = parseInt(btn.getAttribute('data-tab'), 10);
            btn.classList.toggle('active', id === tabId);
        });
        if (tabId === 4) generatePreview();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderList(containerId, items, renderItemFn, type) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        items.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'list-item';
            if (item.certificateFileName) div.setAttribute('data-cert-name', item.certificateFileName);
            div.innerHTML = renderItemFn(item, idx, type);
            container.appendChild(div);
        });
        attachRemoveEvents(type);
        attachSyncEvents(type);
        initFileUploadButtons(container);
    }

    // function renderEduItem(item, idx) {
    //     return (
    //         '<button type="button" class="remove-item" data-idx="' + idx + '" data-type="edu">Remove</button>' +
    //         '<div class="row g-2">' +
    //         '<div class="col-md-4"><label class="form-label small">Examination</label><input class="form-control edu-exam" value="' + escapeHtml(item.exam || '') + '"></div>' +
    //         '<div class="col-md-1"><label class="form-label small">Year of Passing</label><input class="form-control edu-year" value="' + escapeHtml(item.year || '') + '"></div>' +
    //         '<div class="col-md-3"><label class="form-label small">University/Board</label><input class="form-control edu-board" value="' + escapeHtml(item.board || '') + '"></div>' +
    //         '<div class="col-md-3"><label class="form-label small">Institution</label><input class="form-control edu-inst" value="' + escapeHtml(item.institution || '') + '"></div>' +
    //         '<div class="col-md-1"><label class="form-label small">% Marks</label><input class="form-control edu-perc" value="' + escapeHtml(item.percentage || '') + '"></div></div>' +
    //         '<div class="col-md-6 field-row"><label class="form-label">Upload Certificate (PDF/DOC)</label><input type="file" class="form-control" id="certificateUpload" multiple accept=".pdf,.doc,.docx"></div>'
            
    //     );
    // }


//     function renderEduItem(item, idx) {

//     return (

//         '<div class="edu-card">' +

//         '<button type="button" style="position:initial !important" class="edu-remove-btn remove-item" data-idx="' + idx + '" data-type="edu">' +
//         '<i class="bi bi-x-circle-fill me-1"></i> Remove</button>' +

//         '<div class="row g-2 clear-both">' +

//         '<div class="col-md-2">' +
//         '<label class="edu-label"><i class="bi bi-journal-bookmark-fill"></i>Examination</label>' +
//         '<input class="form-control edu-input edu-exam" value="' + escapeHtml(item.exam || '') + '">' +
//         '</div>' +

//         '<div class="col-md-2">' +
//         '<label class="edu-label"><i class="bi bi-calendar-event-fill"></i>Year</label>' +
//         '<input type="date" class="form-control edu-input edu-year" value="' + escapeHtml(item.year || '') + '">' +
//         '</div>' +

//         '<div class="col-md-3">' +
//         '<label class="edu-label"><i class="bi bi-building-fill"></i>University</label>' +
//         '<input class="form-control edu-input edu-board" value="' + escapeHtml(item.board || '') + '">' +
//         '</div>' +

//         '<div class="col-md-2">' +
//         '<label class="edu-label"><i class="bi bi-bank2"></i>Institution</label>' +
//         '<input class="form-control edu-input edu-inst" value="' + escapeHtml(item.institution || '') + '">' +
//         '</div>' +

//         '<div class="col-md-2">' +
//         '<label class="edu-label"><i class="bi bi-bank2"></i>Main Subject/special</label>' +
//         '<input class="form-control edu-input edu-inst" value="' + escapeHtml(item.special || '') + '">' +
//         '</div>' +

//         '<div class="col-md-1">' +
//         '<label class="edu-label"><i class="bi bi-percent"></i>Marks</label>' +
//         '<input class="form-control edu-input edu-perc" value="' + escapeHtml(item.percentage || '') + '">' +
//         '</div>' +

//         '</div>' +

//         '<div class="edu-upload-box mt-3">' +

//         '<input type="file" ' +
//         'class="edu-upload-input certificateUpload" ' +
//         'multiple accept=".pdf,.doc,.docx">' +

//         '<div class="edu-upload-content">' +

//         '<div class="edu-upload-left">' +

//         '<div class="edu-upload-icon">' +
//         '<i class="bi bi-file-earmark-arrow-up-fill"></i>' +
//         '</div>' +

//         '<div>' +
//         '<div class="edu-upload-title">Upload Certificate</div>' +
//         '<div class="edu-upload-subtitle">PDF, DOC, DOCX supported</div>' +
//         '</div>' +

//         '</div>' +

//         '<div class="edu-upload-btn">' +
//         '<i class="bi bi-cloud-upload-fill"></i>' +
//         'Choose' +
//         '</div>' +

//         '</div>' +

//         '</div>' +

//         '</div>'

//     );

// }


// education qualification 


function renderEduItem(item, idx) {

    /* =========================================
       AUTO EXAMINATION NAME
    ========================================= */

    let defaultExam = '';

    if(idx === 0){
        defaultExam = '10th';
    }
    else if(idx === 1){
        defaultExam = '12th';
    }
    else{
        defaultExam = 'LL.B';
    }

    return (

        '<div class="edu-card">' +

        /* =========================================
           CARD HEADER
        ========================================= */

        '<div class="d-flex justify-content-between align-items-center mb-3">' +

            '<div class="edu-card-number">' +
                '<span class="edu-count-badge">' +
                    (idx + 1) +
                '</span>' +
                ' Educational Qualification' +
            '</div>' +

            '<button type="button" style="position:initial !important" class="edu-remove-btn remove-item" data-idx="' + idx + '" data-type="edu">' +
                '<i class="bi bi-x-circle-fill me-1"></i> Remove' +
            '</button>' +

        '</div>' +

        /* =========================================
           FORM ROW
        ========================================= */

        '<div class="row g-2 clear-both">' +

        /* EXAMINATION */

        '<div class="col-md-2">' +

            '<label class="edu-label">' +
                '<i class="bi bi-journal-bookmark-fill"></i>' +
                'Examination' +
            '</label>' +

            '<input ' +
            'class="form-control edu-input edu-exam" ' +
            'value="' + escapeHtml(item.exam || defaultExam) + '">' +

        '</div>' +

        /* YEAR */

        '<div class="col-md-2">' +

            '<label class="edu-label">' +
                '<i class="bi bi-calendar-event-fill"></i>' +
                'Year' +
            '</label>' +

            '<input ' +
            'type="date" ' +
            'class="form-control edu-input edu-year" ' +
            'value="' + escapeHtml(item.year || '') + '">' +

        '</div>' +

        /* UNIVERSITY */

        '<div class="col-md-3">' +

            '<label class="edu-label">' +
                '<i class="bi bi-building-fill"></i>' +
                'University' +
            '</label>' +

            '<input ' +
            'class="form-control edu-input edu-board" ' +
            'value="' + escapeHtml(item.board || '') + '">' +

        '</div>' +

        /* INSTITUTION */

        '<div class="col-md-2">' +

            '<label class="edu-label">' +
                '<i class="bi bi-bank2"></i>' +
                'Institution' +
            '</label>' +

            '<input ' +
            'class="form-control edu-input edu-inst" ' +
            'value="' + escapeHtml(item.institution || '') + '">' +

        '</div>' +

        /* MAIN SUBJECT */

        '<div class="col-md-2">' +

            '<label class="edu-label">' +
                '<i class="bi bi-book-half"></i>' +
                'Main Subject/special' +
            '</label>' +

            '<input ' +
            'class="form-control edu-input edu-special" ' +
            'value="' + escapeHtml(item.special || '') + '">' +

        '</div>' +

        /* MARKS */

        '<div class="col-md-1">' +

            '<label class="edu-label">' +
                '<i class="bi bi-percent"></i>' +
                'Marks' +
            '</label>' +

            '<input ' +
            'class="form-control edu-input edu-perc" ' +
            'value="' + escapeHtml(item.percentage || '') + '">' +

        '</div>' +

        '</div>' +

        /* =========================================
           UPLOAD BOX
        ========================================= */

        '<div class="edu-upload-box mt-3">' +

            '<input type="file" ' +
            'class="edu-upload-input certificateUpload" ' +
            'multiple accept=".pdf,.doc,.docx">' +

            '<div class="edu-upload-content">' +

                '<div class="edu-upload-left">' +

                    '<div class="edu-upload-icon">' +
                        '<i class="bi bi-file-earmark-arrow-up-fill"></i>' +
                    '</div>' +

                    '<div>' +

                        '<div class="edu-upload-title">' +
                            'Upload Certificate' +
                        '</div>' +

                        '<div class="edu-upload-subtitle">' +
                            'PDF, DOC, DOCX supported' +
                        '</div>' +

                    '</div>' +

                '</div>' +

                '<div class="edu-upload-btn">' +

                    '<i class="bi bi-cloud-upload-fill"></i>' +

                    'Choose' +

                '</div>' +

            '</div>' +

        '</div>' +

        '</div>'

    );

}


// education qualification







// qulification educatiuon upload

$(document).on('change', '.certificateUpload', function () {

    let fileCount = this.files.length;

    let uploadTitle = $(this)
        .closest('.edu-upload-box')
        .find('.edu-upload-title');

    if(fileCount > 0){

        uploadTitle.html(
            '<i class="bi bi-check-circle-fill text-success me-1"></i>' +
            fileCount + ' file(s) selected'
        );

    }

});

// qualification education upload



    // function renderAddItem(item, idx) {
    //     return (
    //         '<button type="button" class="remove-item" data-idx="' + idx + '" data-type="add">Remove</button>' +
    //         '<div class="row g-2">' +
    //         '<div class="col-md-3"><label class="form-label small">Examination</label><input class="form-control add-exam" value="' + escapeHtml(item.exam || '') + '"></div>' +
    //         '<div class="col-md-2"><label class="form-label small">Year</label><input class="form-control add-year" value="' + escapeHtml(item.year || '') + '"></div>' +
    //         '<div class="col-md-3"><label class="form-label small">Board</label><input class="form-control add-board" value="' + escapeHtml(item.board || '') + '"></div>' +
    //         '<div class="col-md-2"><label class="form-label small">Subject</label><input class="form-control add-subject" value="' + escapeHtml(item.subject || '') + '"></div>' +
    //         '<div class="col-md-2"><label class="form-label small">%</label><input class="form-control add-perc" value="' + escapeHtml(item.percentage || '') + '"></div></div>' +
    //         '<div class="col-12 mt-2">' + buildFileUploadHtml('add-cert-' + idx, 'Upload Certificate', item.certificateFileName, 'add-cert-file', '.pdf,.doc,.docx', true) + '</div>'
    //     );
    // }


//     function renderAddItem(item, idx) {

//     return (

//         '<div class="add-card">' +

//         '<button type="button" class="add-remove-btn remove-item align-center" data-idx="' + idx + '" data-type="add">' +
//         '<i class="bi bi-x-lg"></i>' +
//         '</button>' +

//         '<div class="row g-2">' +

//         '<div class="col-md-3">' +
//         '<label class="add-label">' +
//         '<i class="bi bi-journal-bookmark-fill"></i>' +
//         'Examination</label>' +
//         '<input class="form-control add-input add-exam" value="' + escapeHtml(item.exam || '') + '">' +
//         '</div>' +

//         '<div class="col-md-2">' +
//         '<label class="add-label">' +
//         '<i class="bi bi-calendar-event-fill"></i>' +
//         'Year</label>' +
//         '<input class="form-control add-input add-year" value="' + escapeHtml(item.year || '') + '">' +
//         '</div>' +

//         '<div class="col-md-3">' +
//         '<label class="add-label">' +
//         '<i class="bi bi-building-fill"></i>' +
//         'Board</label>' +
//         '<input class="form-control add-input add-board" value="' + escapeHtml(item.board || '') + '">' +
//         '</div>' +

//         '<div class="col-md-3">' +
//         '<label class="add-label">' +
//         '<i class="bi bi-bank2"></i>' +
//         'Institution</label>' +
//         '<input class="form-control add-input add-board" value="' + escapeHtml(item.board || '') + '">' +
//         '</div>' +

        

//         '<div class="col-md-2">' +
//         '<label class="add-label">' +
//         '<i class="bi bi-book-half"></i>' +
//         'Subject</label>' +
//         '<input class="form-control add-input add-subject" value="' + escapeHtml(item.subject || '') + '">' +
//         '</div>' +

//         '<div class="col-md-2">' +
//         '<label class="add-label">' +
//         '<i class="bi bi-percent"></i>' +
//         'Marks</label>' +
//         '<input class="form-control add-input add-perc" value="' + escapeHtml(item.percentage || '') + '">' +
//         '</div>' +

//         '</div>' +

//         '<div class="add-upload-box">' +

//         '<input type="file" ' +
//         'class="add-upload-input add-cert-file" ' +
//         'multiple accept=".pdf,.doc,.docx">' +

//         '<div class="add-upload-content">' +

//         '<div class="add-upload-left">' +

//         '<div class="add-upload-icon">' +
//         '<i class="bi bi-file-earmark-arrow-up-fill"></i>' +
//         '</div>' +

//         '<div>' +
//         '<div class="add-upload-title">Upload Certificate</div>' +
//         '<div class="add-upload-subtitle">PDF, DOC, DOCX supported</div>' +
//         '</div>' +

//         '</div>' +

//         '<div class="add-upload-btn">' +
//         '<i class="bi bi-cloud-upload-fill"></i>' +
//         'Choose' +
//         '</div>' +

//         '</div>' +

//         '</div>' +

//         '</div>'

//     );

// }


function renderAddItem(item, idx) {

    return (

        '<div class="add-card">' +

        /* =========================================
           CARD HEADER WITH NUMBERING
        ========================================= */

        '<div class="d-flex justify-content-between align-items-center mb-3">' +

            '<div class="edu-card-number">' +

                '<span class="edu-count-badge">' +

                    (idx + 1) +

                '</span>' +

                ' Additional Qualification' +

            '</div>' +

            '<button type="button" class="add-remove-btn remove-item align-center" data-idx="' + idx + '" data-type="add">' +
                '<i class="bi bi-x-lg"></i>' +
            '</button>' +

        '</div>' +

        /* =========================================
           FORM ROW
        ========================================= */

        '<div class="row g-2">' +

        '<div class="col-md-3">' +
        '<label class="add-label">' +
        '<i class="bi bi-journal-bookmark-fill"></i>' +
        'Examination</label>' +
        '<input class="form-control add-input add-exam" value="' + escapeHtml(item.exam || '') + '">' +
        '</div>' +

        '<div class="col-md-2">' +
        '<label class="add-label">' +
        '<i class="bi bi-calendar-event-fill"></i>' +
        'Year</label>' +
        '<input class="form-control add-input add-year" value="' + escapeHtml(item.year || '') + '">' +
        '</div>' +

        '<div class="col-md-3">' +
        '<label class="add-label">' +
        '<i class="bi bi-building-fill"></i>' +
        'Board</label>' +
        '<input class="form-control add-input add-board" value="' + escapeHtml(item.board || '') + '">' +
        '</div>' +

        '<div class="col-md-3">' +
        '<label class="add-label">' +
        '<i class="bi bi-bank2"></i>' +
        'Institution</label>' +
        '<input class="form-control add-input add-board" value="' + escapeHtml(item.board || '') + '">' +
        '</div>' +

        '<div class="col-md-2">' +
        '<label class="add-label">' +
        '<i class="bi bi-book-half"></i>' +
        'Subject</label>' +
        '<input class="form-control add-input add-subject" value="' + escapeHtml(item.subject || '') + '">' +
        '</div>' +

        '<div class="col-md-2">' +
        '<label class="add-label">' +
        '<i class="bi bi-percent"></i>' +
        'Marks</label>' +
        '<input class="form-control add-input add-perc" value="' + escapeHtml(item.percentage || '') + '">' +
        '</div>' +

        '</div>' +

        /* =========================================
           UPLOAD SECTION
        ========================================= */

        '<div class="add-upload-box">' +

        '<input type="file" ' +
        'class="add-upload-input add-cert-file" ' +
        'multiple accept=".pdf,.doc,.docx">' +

        '<div class="add-upload-content">' +

        '<div class="add-upload-left">' +

        '<div class="add-upload-icon">' +
        '<i class="bi bi-file-earmark-arrow-up-fill"></i>' +
        '</div>' +

        '<div>' +
        '<div class="add-upload-title">Upload Certificate</div>' +
        '<div class="add-upload-subtitle">PDF, DOC, DOCX supported</div>' +
        '</div>' +

        '</div>' +

        '<div class="add-upload-btn">' +
        '<i class="bi bi-cloud-upload-fill"></i>' +
        'Choose' +
        '</div>' +

        '</div>' +

        '</div>' +

        '</div>'

    );

}



$(document).on('change', '.add-cert-file', function () {

    let fileCount = this.files.length;

    let title = $(this)
        .closest('.add-upload-box')
        .find('.add-upload-title');

    if(fileCount > 0){

        title.html(
            '<i class="bi bi-check-circle-fill text-success me-1"></i>' +
            fileCount + ' file(s) selected'
        );

    }

});

    // function renderBarItem(item, idx) {
    //     return (
    //         '<button type="button" class="remove-item" data-idx="' + idx + '" data-type="bar">Remove</button>' +
    //         '<div class="row g-2">' +
    //         '<div class="col-md-2"><label class="form-label small">Years</label><input class="form-control bar-years" value="' + escapeHtml(item.years || '') + '"></div>' +
    //         '<div class="col-md-2"><label class="form-label small">From</label><input class="form-control bar-from" value="' + escapeHtml(item.from || '') + '"></div>' +
    //         '<div class="col-md-2"><label class="form-label small">To</label><input class="form-control bar-to" value="' + escapeHtml(item.to || '') + '"></div>' +
    //         '<div class="col-md-6"><label class="form-label small">Bar Council</label><input class="form-control bar-council" value="' + escapeHtml(item.barCouncil || '') + '"></div></div>' +
    //         '<div class="col-12 mt-2">' + buildFileUploadHtml('bar-doc-' + idx, 'Upload Documents', item.documentFileName, 'bar-doc-file', '.pdf,.doc,.docx', true) + '</div>'
    //     );
    // }

    function renderBarItem(item, idx) {

    return `

    <div class="premium-bar-card list-item">

        <!-- REMOVE BUTTON -->

        <button type="button"
                class="bar-remove-btn remove-item d-flex justify-content-center align-items-center"
                data-idx="${idx}"
                data-type="bar">

            <i class="bi bi-trash3-fill"></i>

        </button>

        <!-- HEADER -->

        <div class="bar-card-header">

            <div class="bar-icon-wrap">

                <i class="bi bi-briefcase-fill"></i>

            </div>

            <div>

                <div class="bar-title">

                    Bar Practice Experience

                </div>

                <div class="bar-subtitle">

                    Advocate Practice & Council Details

                </div>

            </div>

        </div>

        <!-- FORM -->

        <div class="row g-2 mt-1">

            <!-- YEARS -->

            <div class="col-md-2">

                <label class="premium-label">

                    <i class="bi bi-calendar2-check-fill"></i>

                    Years

                </label>

                <input type="text"
                       class="form-control premium-input bar-years"
                       value="${escapeHtml(item.years || '')}"
                       placeholder="Years">

            </div>

            <!-- FROM -->

            <div class="col-md-2">

                <label class="premium-label">

                    <i class="bi bi-calendar-event-fill"></i>

                    From

                </label>

                <input type="date"
                       class="form-control premium-input bar-from"
                       value="${escapeHtml(item.from || '')}"
                       placeholder="From">

            </div>

            <!-- TO -->

            <div class="col-md-2">

                <label class="premium-label">

                    <i class="bi bi-calendar-range-fill"></i>

                    To

                </label>

                <input type="date"
                       class="form-control premium-input bar-to"
                       value="${escapeHtml(item.to || '')}"
                       placeholder="To">

            </div>

            <!-- BAR COUNCIL -->

            <div class="col-md-6">

                <label class="premium-label">

                    <i class="bi bi-bank2"></i>

                    Name of the Bar Council

                </label>

                <input type="text"
                       class="form-control premium-input bar-council"
                       value="${escapeHtml(item.barCouncil || '')}"
                       placeholder="Enter Bar Council Name">

            </div>

        </div>

        <!-- FILE UPLOAD -->

        <div class="mt-3">

            <div class="compact-upload-box">

                <div class="upload-left">

                    <div class="upload-file-icon">

                        <i class="bi bi-cloud-arrow-up-fill"></i>

                    </div>

                    <div>

                        <div class="upload-title">

                            Upload Supporting Documents

                        </div>

                        <div class="upload-subtitle">

                            PDF / DOC / DOCX

                        </div>

                    </div>

                </div>

                <div class="upload-right">

                    ${buildFileUploadHtml(
                        'bar-doc-' + idx,
                        'Choose Files',
                        item.documentFileName,
                        'bar-doc-file',
                        '.pdf,.doc,.docx',
                        true
                    )}

                </div>

            </div>

        </div>

    </div>

    `;
}

    // function renderPracticeItem(item, idx) {
    //     return (
    //         '<button type="button" class="remove-item" data-idx="' + idx + '" data-type="practice">Remove</button>' +
    //         '<div class="row g-2">' +
    //         '<div class="col-md-4"><label class="form-label small">Court</label><input class="form-control practice-court" value="' + escapeHtml(item.courtName || '') + '"></div>' +
    //         '<div class="col-md-2"><label class="form-label small">Years</label><input class="form-control practice-years" value="' + escapeHtml(item.years || '') + '"></div>' +
    //         '<div class="col-md-2"><label class="form-label small">From</label><input class="form-control practice-from" value="' + escapeHtml(item.from || '') + '"></div>' +
    //         '<div class="col-md-2"><label class="form-label small">To</label><input class="form-control practice-to" value="' + escapeHtml(item.to || '') + '"></div></div>' +
    //         '<div class="col-12 mt-2">' + buildFileUploadHtml('practice-doc-' + idx, 'Upload Documents', item.documentFileName, 'practice-doc-file', '.pdf,.doc,.docx', true) + '</div>'
    //     );
    // }


    function renderPracticeItem(item, idx) {

    return `

    <div class="premium-practice-card list-item">

        <!-- REMOVE BUTTON -->

        <button type="button"
                class="practice-remove-btn remove-item"
                data-idx="${idx}"
                data-type="practice">

            <i class="bi bi-trash3-fill"></i>

        </button>

        <!-- HEADER -->

        <div class="practice-card-header">

            <div class="practice-icon-wrap">

                <i class="bi bi-building-fill-check"></i>

            </div>

            <div>

                <div class="practice-title">

                    Court Practice Experience

                </div>

                <div class="practice-subtitle">

                    Court Details & Professional Practice Timeline

                </div>

            </div>

        </div>

        <!-- FORM -->

        <div class="row g-2 mt-1">

            <!-- COURT -->

            <div class="col-md-4">

                <label class="practice-label">

                    <i class="bi bi-bank"></i>

                    Court Name

                </label>

                <input type="text"
                       class="form-control practice-input practice-court"
                       value="${escapeHtml(item.courtName || '')}"
                       placeholder="Enter Court Name">

            </div>

            <!-- YEARS -->

            <div class="col-md-2">

                <label class="practice-label">

                    <i class="bi bi-calendar2-check-fill"></i>

                    Years

                </label>

                <input type="text"
                       class="form-control practice-input practice-years"
                       value="${escapeHtml(item.years || '')}"
                       placeholder="Years">

            </div>

            <!-- FROM -->

            <div class="col-md-2">

                <label class="practice-label">

                    <i class="bi bi-calendar-event-fill"></i>

                    From

                </label>

                <input type="text"
                       class="form-control practice-input practice-from"
                       value="${escapeHtml(item.from || '')}"
                       placeholder="From">

            </div>

            <!-- TO -->

            <div class="col-md-2">

                <label class="practice-label">

                    <i class="bi bi-calendar-range-fill"></i>

                    To

                </label>

                <input type="text"
                       class="form-control practice-input practice-to"
                       value="${escapeHtml(item.to || '')}"
                       placeholder="To">

            </div>

            <!-- STATUS -->

           

        </div>

        <!-- FILE UPLOAD -->

        <div class="mt-3">

            <div class="practice-upload-box">

                <div class="practice-upload-left">

                    <div class="practice-upload-icon">

                        <i class="bi bi-cloud-arrow-up-fill"></i>

                    </div>

                    <div>

                        <div class="practice-upload-title">

                            Upload Practice Documents

                        </div>

                        <div class="practice-upload-subtitle">

                            Experience Certificates / Supporting Files

                        </div>

                    </div>

                </div>

                <div class="practice-upload-right">

                    ${buildFileUploadHtml(
                        'practice-doc-' + idx,
                        'Choose Files',
                        item.documentFileName,
                        'practice-doc-file',
                        '.pdf,.doc,.docx',
                        true
                    )}

                </div>

            </div>

        </div>

    </div>

    `;
}

    // function renderJudgmentItem(item, idx, type) {
    //     return (
    //         '<button type="button" class="remove-item" data-idx="' + idx + '" data-type="' + type + '">Remove</button>' +
    //         '<div class="row g-2">' +
    //         '<div class="col-md-3"><label class="form-label small">Case No.</label><input class="form-control j-case" value="' + escapeHtml(item.caseNo || '') + '"></div>' +
    //         '<div class="col-md-3"><label class="form-label small">Case details</label><input class="form-control j-details" value="' + escapeHtml(item.caseDetails || '') + '"></div>' +
    //         '<div class="col-md-3"><label class="form-label small">Judgment</label><input class="form-control j-judgment" value="' + escapeHtml(item.judgment || '') + '"></div>' +
    //         '<div class="col-md-3"><label class="form-label small">Remarks</label><input class="form-control j-remarks" value="' + escapeHtml(item.remarks || '') + '"></div></div>' +
    //         '<div class="col-12 mt-2">' + buildFileUploadHtml('judgment-doc-' + idx + '-' + type, 'Upload Judgement', item.documentFileName, 'judgment-doc-file', '.pdf,.doc,.docx', true) + '</div>'
    //     );
    // }


//     function renderJudgmentItem(item, idx, type) {

//     return `

//     <div class="premium-judgment-card list-item">

//         <!-- REMOVE BUTTON -->

//         <button type="button"
//                 class="judgment-remove-btn remove-item d-flex justify-content-center align-items-center"
//                 data-idx="${idx}"
//                 data-type="${type}">

//             <i class="bi bi-trash3-fill"></i>

//         </button>

//         <!-- HEADER -->

//         <div class="judgment-header">

//             <div class="judgment-icon-wrap">

//                 <i class="bi bi-journal-richtext"></i>

//             </div>

//             <div>

//                 <div class="judgment-title">

//                     Judgment / Case Information

//                 </div>

//                 <div class="judgment-subtitle">

//                     Legal Case Details & Supporting Judgments

//                 </div>

//             </div>

//         </div>

//         <!-- FORM -->

//         <div class="row g-2 mt-1">

//             <!-- CASE NO -->

//             <div class="col-md-3">

//                 <label class="judgment-label">

//                     <i class="bi bi-hash"></i>

//                     Case No citation

//                 </label>

//                 <input type="text"
//                        class="form-control judgment-input j-case"
//                        value="${escapeHtml(item.caseNo || '')}"
//                        placeholder="Enter Case citation">

//             </div>


//         <!-- ADD MORE CITATION -->

// <div class="col-md-1 d-flex align-items-end">

//     <button type="button"
//             class="btn btn-sm btn-primary addCitationBtn"
//             data-idx="${idx}">

//         <i class="bi bi-plus-circle"></i>

//     </button>

// </div>

// </div>

// <!-- MULTIPLE CITATIONS -->

// <div class="extraCitationWrapper mt-2"></div>

// <!-- CASE DETAILS -->

//             <!-- CASE DETAILS -->

//             <!-- <div class="col-md-3">

//                 <label class="judgment-label">

//                     <i class="bi bi-file-earmark-text-fill"></i>

//                     Case Details

//                 </label>

//                 <input type="text"
//                        class="form-control judgment-input j-details"
//                        value="${escapeHtml(item.caseDetails || '')}"
//                        placeholder="Enter Case Details">

//             </div> --!>

//             <!-- JUDGMENT -->

//            <!--  <div class="col-md-3">

//                 <label class="judgment-label">

//                     <i class="bi bi-scale"></i>

//                     Judgment

//                 </label>

//                 <input type="text"
//                        class="form-control judgment-input j-judgment"
//                        value="${escapeHtml(item.judgment || '')}"
//                        placeholder="Judgment Summary">

//             </div> --!>

//             <!-- REMARKS -->

//             <!-- <div class="col-md-3">

//                 <label class="judgment-label">

//                     <i class="bi bi-chat-left-text-fill"></i>

//                     Remarks

//                 </label>

//                 <input type="text"
//                        class="form-control judgment-input j-remarks"
//                        value="${escapeHtml(item.remarks || '')}"
//                        placeholder="Additional Remarks">

//             </div> --!>

//         </div>

//         <!-- STATUS INFO -->

//        <!--  <div class="judgment-info-row">

            
//             <div class="judgment-doc-type">

//                 <i class="bi bi-file-earmark-pdf-fill"></i>

//                 PDF / DOC / DOCX Supported

//             </div>

//         </div> --!>

//         <!-- FILE UPLOAD -->

//         <div class="mt-3 d-none">

//             <div class="judgment-upload-box">

//                 <div class="judgment-upload-left">

//                     <div class="judgment-upload-icon">

//                         <i class="bi bi-cloud-arrow-up-fill"></i>

//                     </div>

//                     <div>

//                         <div class="judgment-upload-title">

//                             Upload Judgment Documents

//                         </div>

//                         <div class="judgment-upload-subtitle">

//                             Court Orders / Judgments / Supporting Files

//                         </div>

//                     </div>

//                 </div>

//                 <div class="judgment-upload-right">

//                     ${buildFileUploadHtml(
//                         'judgment-doc-' + idx + '-' + type,
//                         'Choose Files',
//                         item.documentFileName,
//                         'judgment-doc-file',
//                         '.pdf,.doc,.docx',
//                         true
//                     )}

//                 </div>

//             </div>

//         </div>

//     </div>

//     `;
// }





function renderJudgmentItem(item, idx, type) {

    return `

    <div class="premium-judgment-card list-item">

        <!-- REMOVE CARD -->

        <button type="button"
                class="judgment-remove-btn remove-item d-flex justify-content-center align-items-center"
                data-idx="${idx}"
                data-type="${type}">

            <i class="bi bi-trash3-fill"></i>

        </button>

        <!-- HEADER -->

        <div class="judgment-header">

            <div class="judgment-icon-wrap">

                <i class="bi bi-journal-richtext"></i>

            </div>

            <div>

                <div class="judgment-title">

                    Judgment / Case Information

                </div>

                <div class="judgment-subtitle">

                    Legal Case Details & Supporting Judgments

                </div>

            </div>

        </div>

        <!-- MAIN FORM -->

        <div class="row g-2 mt-1">

            <!-- CASE CITATION -->

            <div class="col-md-10">

                <label class="judgment-label">

                    <i class="bi bi-hash"></i>

                    Case No Citation

                </label>

                <input type="text"
                       class="form-control judgment-input j-case"
                       value="${escapeHtml(item.caseNo || '')}"
                       placeholder="Enter Case Citation">

            </div>

            <!-- ADD BUTTON -->

            <div class="col-md-2 d-flex align-items-end">

                <button type="button"
                        class="btn btn-primary w-100 addCitationBtn">

                    <i class="bi bi-plus-circle me-1"></i>

                    Add More

                </button>

            </div>

        </div>

        <!-- EXTRA CITATIONS -->

        <div class="extraCitationWrapper mt-2"></div>

        <!-- FILE UPLOAD -->

        <div class="mt-3 d-none">

            <div class="judgment-upload-box">

                <div class="judgment-upload-left">

                    <div class="judgment-upload-icon">

                        <i class="bi bi-cloud-arrow-up-fill"></i>

                    </div>

                    <div>

                        <div class="judgment-upload-title">

                            Upload Judgment Documents

                        </div>

                        <div class="judgment-upload-subtitle">

                            Court Orders / Judgments / Supporting Files

                        </div>

                    </div>

                </div>

                <div class="judgment-upload-right">

                    ${buildFileUploadHtml(
                        'judgment-doc-' + idx + '-' + type,
                        'Choose Files',
                        item.documentFileName,
                        'judgment-doc-file',
                        '.pdf,.doc,.docx',
                        true
                    )}

                </div>

            </div>

        </div>

    </div>

    `;
}




    function renderEdu() { renderList('eduListContainer', eduItems, renderEduItem, 'edu'); }
    function renderAdditional() { renderList('additionalListContainer', additionalItems, renderAddItem, 'add'); }
    function renderBar() { renderList('barExpContainer', barItems, renderBarItem, 'bar'); calculateTotalBarYears(); }
    function renderPractice() { renderList('courtPracticeContainer', practiceItems, renderPracticeItem, 'practice'); }
    function renderJudgmentAAG() { renderList('judgmentAAGContainer', judgmentAAGItems, (it, i) => renderJudgmentItem(it, i, 'judgmentAAG'), 'judgmentAAG'); }
    function renderJudgmentAGP() { renderList('judgmentAGPContainer', judgmentAGPItems, (it, i) => renderJudgmentItem(it, i, 'judgmentAGP'), 'judgmentAGP'); }

    function attachRemoveEvents(type) {
        document.querySelectorAll('.remove-item[data-type="' + type + '"]').forEach((btn) => {
            btn.onclick = handleRemove;
        });
    }
    function attachSyncEvents(type) {
        const map = { edu: '#eduListContainer input', add: '#additionalListContainer input', bar: '#barExpContainer input', practice: '#courtPracticeContainer input', judgmentAAG: '#judgmentAAGContainer input', judgmentAGP: '#judgmentAGPContainer input' };
        const sel = map[type];
        if (!sel) return;
        document.querySelectorAll(sel).forEach((inp) => {
            inp.onchange = { edu: syncEdu, add: syncAdditional, bar: syncBar, practice: syncPractice, judgmentAAG: syncJudgmentAAG, judgmentAGP: syncJudgmentAGP }[type];
        });
    }

    function syncEdu() {
        eduItems = [];
        document.querySelectorAll('#eduListContainer .list-item').forEach((item) => {
            const fileInput = item.querySelector('.edu-cert-file');
            let certName = item.getAttribute('data-cert-name') || '';
            if (fileInput && fileInput.files && fileInput.files[0]) certName = fileInput.files[0].name;
            eduItems.push({
                exam: item.querySelector('.edu-exam')?.value,
                year: item.querySelector('.edu-year')?.value,
                board: item.querySelector('.edu-board')?.value,
                institution: item.querySelector('.edu-inst')?.value,
                percentage: item.querySelector('.edu-perc')?.value,
                certificateFileName: certName
            });
        });
    }
    function syncAdditional() {
        additionalItems = [];
        document.querySelectorAll('#additionalListContainer .list-item').forEach((item) => {
            additionalItems.push({
                exam: item.querySelector('.add-exam')?.value,
                year: item.querySelector('.add-year')?.value,
                board: item.querySelector('.add-board')?.value,
                subject: item.querySelector('.add-subject')?.value,
                percentage: item.querySelector('.add-perc')?.value
            });
        });
    }
    function syncBar() {
        barItems = [];
        document.querySelectorAll('#barExpContainer .list-item').forEach((item) => {
            barItems.push({
                years: item.querySelector('.bar-years')?.value,
                from: item.querySelector('.bar-from')?.value,
                to: item.querySelector('.bar-to')?.value,
                barCouncil: item.querySelector('.bar-council')?.value
            });
        });
        calculateTotalBarYears();
    }
    function syncPractice() {
        practiceItems = [];
        document.querySelectorAll('#courtPracticeContainer .list-item').forEach((item) => {
            practiceItems.push({
                courtName: item.querySelector('.practice-court')?.value,
                years: item.querySelector('.practice-years')?.value,
                from: item.querySelector('.practice-from')?.value,
                to: item.querySelector('.practice-to')?.value
            });
        });
    }
    function syncJudgmentAAG() {
        judgmentAAGItems = [];
        document.querySelectorAll('#judgmentAAGContainer .list-item').forEach((item) => {
            judgmentAAGItems.push({
                caseNo: item.querySelector('.j-case')?.value,
                caseDetails: item.querySelector('.j-details')?.value,
                judgment: item.querySelector('.j-judgment')?.value,
                remarks: item.querySelector('.j-remarks')?.value
            });
        });
    }
    function syncJudgmentAGP() {
        judgmentAGPItems = [];
        document.querySelectorAll('#judgmentAGPContainer .list-item').forEach((item) => {
            judgmentAGPItems.push({
                caseNo: item.querySelector('.j-case')?.value,
                caseDetails: item.querySelector('.j-details')?.value,
                judgment: item.querySelector('.j-judgment')?.value,
                remarks: item.querySelector('.j-remarks')?.value
            });
        });
    }

    function handleRemove(e) {
        const btn = e.target;
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const type = btn.getAttribute('data-type');
        const lists = { edu: eduItems, add: additionalItems, bar: barItems, practice: practiceItems, judgmentAAG: judgmentAAGItems, judgmentAGP: judgmentAGPItems };
        if (lists[type]) lists[type].splice(idx, 1);
        renderAll();
    }

    function calculateTotalBarYears() {
        let total = 0;
        barItems.forEach((b) => {
            const y = parseInt(b.years, 10);
            if (!isNaN(y)) total += y;
        });
        const el = document.getElementById('totalBarYears');
        if (el) el.value = total ? total + ' years' : '';
    }

    function renderAll() {
        renderEdu();
        renderAdditional();
        renderBar();
        renderPractice();
        renderJudgmentAAG();
        renderJudgmentAGP();
    }

    function generatePreview() {
        if (formMode === 'previewOnly' && existingApp && existingApp.filePreviews) {
            Object.keys(existingApp.filePreviews).forEach(function (k) {
                filePreviews[k] = existingApp.filePreviews[k];
            });
        }
        syncEdu();
        syncAdditional();
        syncBar();
        syncPractice();
        syncJudgmentAAG();
        syncJudgmentAGP();
        collectLiveFilePreviews();

        const p = getPersonalFromForm();
        const lawDeg = document.getElementById('lawDegreeRecognized').value;
        const itAss = document.getElementById('itAssessee').value;
        const draftY = document.getElementById('draftingYears').value;
        const totalBar = document.getElementById('totalBarYears').value;
        const court = getCourtBench();
        let html = '';

        html += '<div class="preview-card"><h4>Application Context</h4>';
        html += previewTable(
            previewFieldRow('Post', postName) +
            previewFieldRow('Job ID', jobId) +
            previewFieldRow('Court', court) +
            previewFieldRow('User ID', userId)
        ) + '</div>';

        html += '<div class="preview-card"><h4>Personal & Professional Information</h4>';
        html += previewTable(
            previewFieldRow('Name of Advocate', p.advocateName) +
            previewFieldRow('Bar Council Enrolment No.', p.enrolmentNo) +
            previewFieldRow("Father's Name", p.fatherName) +
            previewFieldRow('Gender', p.gender) +
            previewFieldRow('Marital Status', p.maritalStatus) +
            previewFieldRow('Date of Birth', p.dob) +
            previewFieldRow('Nationality', p.nationality) +
            previewFieldRow('Religion', p.religion) +
            previewFieldRow('Community', p.community) +
            previewFieldRow('Mobile', p.mobile) +
            previewFieldRow('Phone', p.phone) +
            previewFieldRow('Email', p.email) +
            previewFieldRow('PAN', p.pan) +
            previewFieldRow('District', p.district) +
            previewFieldRow('Pincode', p.pincode) +
            previewFieldRow('Office Address', p.officeAddress) +
            previewFieldRow('Permanent Address', p.permanentAddress)
        );
        html += '<div class="preview-upload-block"><span class="preview-upload-label">Photo</span>' + renderDocPreview(filePreviews.photo) + '</div></div>';

        html += '<div class="preview-card"><h4>Educational Qualification</h4>';
        if (!eduItems.length) {
            html += '<p class="text-muted mb-0">None</p>';
        } else {
            eduItems.forEach(function (e, i) {
                html += '<div class="preview-sub-item"><div class="preview-sub-title">Entry ' + (i + 1) + '</div>';
                html += previewTable(
                    previewFieldRow('Examination', e.exam) +
                    previewFieldRow('Year of Passing', e.year) +
                    previewFieldRow('University/Board', e.board) +
                    previewFieldRow('Institution', e.institution) +
                    previewFieldRow('% Marks', e.percentage)
                );
                html += '<div class="preview-upload-block"><span class="preview-upload-label">Certificate</span>' + renderDocPreview(filePreviews['edu-' + i]) + '</div></div>';
            });
        }
        html += '</div>';

        html += '<div class="preview-card"><h4>Additional Qualification</h4>';
        if (!additionalItems.length) {
            html += '<p class="text-muted mb-0">None</p>';
        } else {
            additionalItems.forEach(function (a, i) {
                html += '<div class="preview-sub-item"><div class="preview-sub-title">Entry ' + (i + 1) + '</div>';
                html += previewTable(
                    previewFieldRow('Examination', a.exam) +
                    previewFieldRow('Year', a.year) +
                    previewFieldRow('Board', a.board) +
                    previewFieldRow('Subject', a.subject) +
                    previewFieldRow('% Marks', a.percentage)
                );
                html += '<div class="preview-upload-block"><span class="preview-upload-label">Certificate</span>' + renderDocPreview(filePreviews['add-' + i]) + '</div></div>';
            });
        }
        html += '</div>';

        html += '<div class="preview-card"><h4>Experience Details</h4>';
        html += previewTable(previewFieldRow('Law Degree recognized by Bar Council of India', lawDeg));
        html += '<h5 class="preview-subheading">Total Bar Experience</h5>';
        if (!barItems.length) {
            html += '<p class="text-muted">None</p>';
        } else {
            barItems.forEach(function (b, i) {
                html += '<div class="preview-sub-item"><div class="preview-sub-title">Entry ' + (i + 1) + '</div>';
                html += previewTable(
                    previewFieldRow('Years', b.years) +
                    previewFieldRow('From', b.from) +
                    previewFieldRow('To', b.to) +
                    previewFieldRow('Bar Council', b.barCouncil)
                );
                html += '<div class="preview-upload-block"><span class="preview-upload-label">Documents</span>' + renderDocPreview(filePreviews['bar-' + i]) + '</div></div>';
            });
        }
        html += previewTable(previewFieldRow('Total Years (Auto)', totalBar));
        html += '<h5 class="preview-subheading">Practice in High Court / Madurai Bench</h5>';
        if (!practiceItems.length) {
            html += '<p class="text-muted">None</p>';
        } else {
            practiceItems.forEach(function (pr, i) {
                html += '<div class="preview-sub-item"><div class="preview-sub-title">Entry ' + (i + 1) + '</div>';
                html += previewTable(
                    previewFieldRow('Court', pr.courtName) +
                    previewFieldRow('Years', pr.years) +
                    previewFieldRow('From', pr.from) +
                    previewFieldRow('To', pr.to)
                );
                html += '<div class="preview-upload-block"><span class="preview-upload-label">Documents</span>' + renderDocPreview(filePreviews['practice-' + i]) + '</div></div>';
            });
        }
        html += '<h5 class="preview-subheading">Judgements (AAG / SGP / GP — last 7 years)</h5>';
        if (!judgmentAAGItems.length) {
            html += '<p class="text-muted">None</p>';
        } else {
            judgmentAAGItems.forEach(function (j, i) {
                html += '<div class="preview-sub-item"><div class="preview-sub-title">Entry ' + (i + 1) + '</div>';
                html += previewTable(
                    previewFieldRow('Case No.', j.caseNo) +
                    previewFieldRow('Case details', j.caseDetails) +
                    previewFieldRow('Judgment', j.judgment) +
                    previewFieldRow('Remarks', j.remarks)
                );
                html += '<div class="preview-upload-block"><span class="preview-upload-label">Judgement file</span>' + renderDocPreview(filePreviews['judgment-' + i + '-judgmentAAG']) + '</div></div>';
            });
        }
        html += '<h5 class="preview-subheading">Additional Government Pleader (last 5 years)</h5>';
        if (!judgmentAGPItems.length) {
            html += '<p class="text-muted">None</p>';
        } else {
            judgmentAGPItems.forEach(function (j, i) {
                html += '<div class="preview-sub-item"><div class="preview-sub-title">Entry ' + (i + 1) + '</div>';
                html += previewTable(
                    previewFieldRow('Case No.', j.caseNo) +
                    previewFieldRow('Case details', j.caseDetails) +
                    previewFieldRow('Judgment', j.judgment) +
                    previewFieldRow('Remarks', j.remarks)
                );
                html += '<div class="preview-upload-block"><span class="preview-upload-label">Judgement file</span>' + renderDocPreview(filePreviews['judgment-' + i + '-judgmentAGP']) + '</div></div>';
            });
        }
        html += '<h5 class="preview-subheading">Drafting Experience</h5>';
        html += previewTable(previewFieldRow('No. of Years', draftY));
        html += '<div class="preview-upload-block"><span class="preview-upload-label">Petitions</span>' + renderDocPreview(filePreviews.drafting) + '</div>';
        html += previewTable(previewFieldRow('Whether IT Assessee', itAss));
        html += '</div>';

        html += '<div class="preview-card"><h4>Declaration</h4>';
        html += previewTable(
            previewFieldRow('Date', document.getElementById('declDate').value) +
            previewFieldRow('Place', document.getElementById('declPlace').value)
        ) + '</div>';

        if (existingApp && existingApp.submittedAt) {
            html += '<p class="alert alert-success mt-2">Submitted on ' + new Date(existingApp.submittedAt).toLocaleString() + '</p>';
        }
        document.getElementById('previewContent').innerHTML = html;
    }


    function validateStep1() {
        const p = getPersonalFromForm();
        if (!p.advocateName || !p.enrolmentNo || !p.mobile || !p.email) {
            alert('Please fill mandatory fields: Name, Enrolment No, Mobile, Email');
            return false;
        }
        return true;
    }

    // tabButtons.forEach((btn) => {
    //     btn.addEventListener('click', () => {
    //         if (formMode !== 'full') return;
    //         switchTab(parseInt(btn.getAttribute('data-tab'), 10));
    //     });
    // });


    tabButtons.forEach((btn) => {

    btn.addEventListener('click', function () {

        const tabId = parseInt(
            this.getAttribute('data-tab'),
            10
        );

        switchTab(tabId);

    });

});



    document.getElementById('nextToTab2').addEventListener('click', () => {
        if (!validateStep1()) return;
        saveDraft();
        switchTab(2);
    });
    document.getElementById('prevToTab1').addEventListener('click', () => switchTab(1));
    document.getElementById('nextToTab3').addEventListener('click', () => { saveDraft(); switchTab(3); });
    document.getElementById('prevToTab2').addEventListener('click', () => switchTab(2));
    document.getElementById('nextToTab4').addEventListener('click', () => { saveDraft(); generatePreview(); switchTab(4); });
    document.getElementById('prevToTab3').addEventListener('click', () => switchTab(3));

    document.getElementById('addEduBtn').addEventListener('click', () => { eduItems.push({}); renderEdu(); });
    document.getElementById('addAdditionalBtn').addEventListener('click', () => { additionalItems.push({}); renderAdditional(); });
    document.getElementById('addBarExpBtn').addEventListener('click', () => { barItems.push({}); renderBar(); });
    document.getElementById('addPracticeBtn').addEventListener('click', () => { practiceItems.push({}); renderPractice(); });
    document.getElementById('addJudgmentAAGBtn').addEventListener('click', () => { judgmentAAGItems.push({}); renderJudgmentAAG(); });
    // document.getElementById('addJudgmentAGPBtn').addEventListener('click', () => { judgmentAGPItems.push({}); renderJudgmentAGP(); });


    /* =========================================
ADD JUDGMENT
========================================= */

document.getElementById('addJudgmentAGPBtn').addEventListener('click', () => {

    judgmentAGPItems.push({

        caseNo: ''

    });

    renderJudgmentAGP();

});


/* =========================================
DEFAULT FIRST CARD
========================================= */

if (judgmentAGPItems.length === 0) {

    judgmentAGPItems.push({

        caseNo: ''

    });

    renderJudgmentAGP();

}


    document.getElementById('finalSubmitBtn').addEventListener('click', () => {
        if (!document.getElementById('declarationCheck').checked) {
            document.getElementById('submitMessage').innerHTML = '<div class="alert alert-danger">Please accept the declaration.</div>';
            return;
        }
        if (!jobId) {
            alert('No job selected.');
            return;
        }
        const payload = collectApplicationPayload();
        const ref = AppData.submitApplication(userId, jobId, payload);
        AppData.updateUserProfile(userId, payload.personal);
        document.getElementById('submitMessage').innerHTML =
            '<div class="alert alert-success">Application submitted! Reference: ' + (ref.id || '—') + '</div>';
        setTimeout(() => { window.location.href = 'job-post.html'; }, 2500);
    });

    if (formMode === 'full') {
        if (existingApp && existingApp.status === 'draft') {
            loadApplicationData(existingApp);
        } else {
            prefillTab1FromDb();
            if (!eduItems.length) {

    /* =========================================
       DEFAULT 10TH
    ========================================= */

    eduItems.push({

        exam: '10th',
        year: '',
        board: '',
        institution: '',
        special: '',
        percentage: ''

    });

    /* =========================================
       DEFAULT 12TH
    ========================================= */

    eduItems.push({

        exam: '12th',
        year: '',
        board: '',
        institution: '',
        special: '',
        percentage: ''

    });

}
            // if (!eduItems.length) eduItems.push({ exam: 'LL.B', year: '2017', board: 'University of Madras', institution: 'Law College', percentage: '72' });
            if (!barItems.length) barItems.push({ years: '8', from: '2017', to: '2025', barCouncil: 'Bar Council of Tamil Nadu' });
            renderAll();
        }
    } else if (formMode === 'tab1Only') {
        prefillTab1FromDb();
    } else if (formMode === 'previewOnly') {
        loadApplicationData(existingApp);
    }

    mountJobBanner();
    initFileUploadButtons(document);
    // applyFormMode();
    switchTab(1);
})();



// application profile upload starts



const photoInput = document.getElementById('photoUpload');

photoInput.addEventListener('change', function () {

    const file = this.files[0];

    if(file){

        const imageURL = URL.createObjectURL(file);

        // Show filename
        document.querySelector('.upload-subtitle').innerHTML = `
            <i class="bi bi-check-circle-fill text-success me-1"></i>
            ${file.name}
        `;

        // Replace icon with image preview
        document.querySelector('.upload-icon-wrapper').innerHTML = `
            <img src="${imageURL}" 
                 class="preview-upload-image"
                 alt="Preview">
        `;

    }

});


// application profile upload ends





/* =========================================
FINAL SUBMIT FLOW
========================================= */

$('#finalSubmitBtn').click(function(){

    $('#submitConfirmModal').modal('hide');

    setTimeout(function(){

        $('#successSubmitModal').modal('show');

    },400);

    setTimeout(function(){

        window.location.href = 'view-submission.html';

    },3000);

});



/* =========================================
SHOW / HIDE TEXTAREA
========================================= */

$('#lawOfficerServing').on('change', function () {

    const selectedValue = $(this).val();

    if (selectedValue === 'Yes') {

        $('#lawOfficerRemarksWrapper')
            .removeClass('d-none')
            .hide()
            .fadeIn(250);

    } else {

        $('#lawOfficerRemarksWrapper')
            .fadeOut(200, function () {

                $(this).addClass('d-none');

                $('#lawOfficerRemarks').val('');

            });

    }

});