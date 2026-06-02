window.PortalNav = window.PortalNav || {
    mount: function () { },
    render: function () { }
};

/**
 * Shared state, utilities, navigation, and list infrastructure for the application form.
 */
window.ApplicationForm = (function () {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('jobId') || sessionStorage.getItem('selectedJobId') || '';
    const session = window.AppData && typeof AppData.getSession === 'function'
        ? AppData.getSession()
        : null;
    const userId = (session && session.userId)
        || sessionStorage.getItem('applicantId')
        || '';
    const existingApp = window.AppData && typeof AppData.getApplication === 'function'
        ? AppData.getApplication(userId, jobId)
        : null;
    const formMode = 'full';
    const postName = sessionStorage.getItem('selectedPost') || '—';

    function getStoredVacancies() {
        if (window.JobSelection) {
            return JobSelection.readStoredVacancies();
        }
        return [];
    }

    const state = {
        eduItems: [],
        additionalItems: [],
        barItems: [],
        practiceItems: [{
            court: '',
            years: '',
            from: '',
            to: '',
            status: ''
        }],
        judgmentAAGItems: [{
            caseNo: '',
            caseDetails: '',
            judgment: '',
            remarks: ''
        }],
        judgmentAGPItems: [],
        filePreviews: {}
    };

    const tabs = {
        1: document.getElementById('tab1'),
        2: document.getElementById('tab2'),
        3: document.getElementById('tab3'),
        4: document.getElementById('tab4')
    };
    const tabButtons = document.querySelectorAll('.main-tab');

    const FILE_NAME_MAX_LEN = 20;

    function formatDateForInput(val) {
        if (val === undefined || val === null || val === '') {
            return '';
        }
        const s = String(val).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            return s;
        }
        return '';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function (m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    function showToast(message, variant) {
        const text = message != null ? String(message).trim() : '';
        if (!text) return;

        const kind = variant === 'error' ? 'danger' : 'success';
        let container = document.getElementById('appToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'appToastContainer';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '11000';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-atomic', 'true');
            document.body.appendChild(container);
        }

        const toastEl = document.createElement('div');
        toastEl.className = 'toast align-items-center border-0 text-bg-' + kind;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');

        const flex = document.createElement('div');
        flex.className = 'd-flex';

        const body = document.createElement('div');
        body.className = 'toast-body';
        body.textContent = text;

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn-close btn-close-white me-2 m-auto';
        closeBtn.setAttribute('data-bs-dismiss', 'toast');
        closeBtn.setAttribute('aria-label', 'Close');

        flex.appendChild(body);
        flex.appendChild(closeBtn);
        toastEl.appendChild(flex);
        container.appendChild(toastEl);

        if (window.bootstrap && typeof window.bootstrap.Toast === 'function') {
            const toast = new window.bootstrap.Toast(toastEl, { delay: 3500 });
            toastEl.addEventListener('hidden.bs.toast', function () {
                toastEl.remove();
            });
            toast.show();
            return;
        }

        toastEl.classList.add('show');
        setTimeout(function () {
            toastEl.remove();
        }, 3500);
    }

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
            delete state.filePreviews[key];
            return;
        }
        const reader = new FileReader();
        reader.onload = function () {
            state.filePreviews[key] = {
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
            state.filePreviews[key] = [];
            return;
        }
        state.filePreviews[key] = [];
        Array.from(fileList).forEach(function (file, i) {
            const reader = new FileReader();
            reader.onload = function () {
                state.filePreviews[key][i] = {
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
        if (input.id === 'enrolmentCertUpload') return 'enrolmentCert';
        if (input.id === 'draftingUpload') return 'drafting';
        let m = input.id.match(/^edu-cert-(\d+)$/);
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
        const enrolCert = document.getElementById('enrolmentCertUpload');
        if (enrolCert && enrolCert.files && enrolCert.files[0]) storeFilePreview('enrolmentCert', enrolCert.files[0]);
        const drafting = document.getElementById('draftingUpload');
        if (drafting && drafting.files && drafting.files.length) storeFilesPreview('drafting', drafting.files);
        document.querySelectorAll('#eduListContainer .list-item').forEach(function (item, idx) {
            const fi = item.querySelector('.certificateUpload');
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
                        if (listItem.closest('#eduListContainer')) AF.tab2.syncEdu();
                        else if (listItem.closest('#additionalListContainer')) AF.tab2.syncAdditional();
                        else if (listItem.closest('#barExpContainer')) AF.tab3.syncBar();
                        else if (listItem.closest('#courtPracticeContainer')) AF.tab3.syncPractice();
                        else if (listItem.closest('#judgmentAAGContainer')) AF.tab3.syncJudgmentAAG();
                        else if (listItem.closest('#judgmentAGPContainer')) AF.tab3.syncJudgmentAGP();
                    }
                } else {
                    if (previewKey) delete state.filePreviews[previewKey];
                    textEl.textContent = defaultLabel;
                    textEl.title = '';
                    wrap.classList.remove('has-file');
                }
            });
        });
    }

    function getCourtBench() {
        const el = document.getElementById('courtBenchSelect');
        return el ? el.value : (sessionStorage.getItem('courtBench') || 'High Court');
    }

    function mountJobBanner() {
        const jobBanner = document.getElementById('jobContextBanner');
        if (!jobBanner) return;

        let selections = getStoredVacancies();
        if (!selections.length && jobId) {
            selections = jobId.split(',').map(function (part) {
                const id = part.trim();
                if (!id) return null;
                return window.JobSelection
                    ? JobSelection.normalizeSelection({ jobId: id })
                    : { jobId: id, postName: postName, courtBench: sessionStorage.getItem('courtBench') || 'High Court' };
            }).filter(Boolean);
        }

        if (!selections.length && !jobId) {
            jobBanner.innerHTML = 'No job selected. Choose a post on <a href="apply-post.html">Job Posts</a> and click Apply.';
            return;
        }

        const jobIdsLabel = window.JobSelection
            ? JobSelection.joinJobIds(selections)
            : jobId;
        const postLines = window.JobSelection
            ? JobSelection.formatBannerLines(selections)
            : [postName + ' : ' + jobIdsLabel];

        let postsHtml = '';
        postLines.forEach(function (line) {
            postsHtml += '<div class="job-banner-post-line">' + escapeHtml(line) + '</div>';
        });

        let courtHtml = '';
        if (selections.length === 1) {
            const savedBench = selections[0].courtBench
                || (existingApp && existingApp.courtBench)
                || sessionStorage.getItem('courtBench')
                || 'High Court';
            const benchOpts = ['High Court', 'Madurai Bench'];
            let optsHtml = '';
            benchOpts.forEach(function (opt) {
                optsHtml += '<option value="' + escapeHtml(opt) + '"' + (savedBench === opt ? ' selected' : '') + '>' + escapeHtml(opt) + '</option>';
            });
            courtHtml =
                '<div class="job-banner-court"><label for="courtBenchSelect" class="job-banner-court-label">Court</label>' +
                '<select id="courtBenchSelect" class="form-select form-select-sm court-bench-select"' + (formMode === 'previewOnly' ? ' disabled' : '') + '>' + optsHtml + '</select></div>';
        } else {
            courtHtml = '<div class="job-banner-court-list">' + selections.map(function (s) {
                return '<span class="job-banner-court-item"><strong>' + escapeHtml(s.jobId) + '</strong> — ' + escapeHtml(s.courtBench || '') + '</span>';
            }).join(' · ') + '</div>';
        }

        jobBanner.innerHTML =
            '<div class="job-banner-inner">' +
            '<div class="job-banner-posts">' + postsHtml + '</div>' +
            '<div class="job-banner-meta-sub">Job ID: <strong>' + escapeHtml(jobIdsLabel) + '</strong> · User: <strong>' + escapeHtml(userId) + '</strong></div>' +
            courtHtml +
            '</div>';

        const sel = document.getElementById('courtBenchSelect');
        if (sel && formMode !== 'previewOnly') {
            sel.onchange = function () {
                sessionStorage.setItem('courtBench', sel.value);
                saveDraft();
            };
        }
    }

    const LIST_CONTAINER_IDS = {
        edu: 'eduListContainer',
        add: 'additionalListContainer',
        bar: 'barExpContainer',
        practice: 'courtPracticeContainer',
        judgmentAAG: 'judgmentAAGContainer',
        judgmentAGP: 'judgmentAGPContainer'
    };

    function getListSyncHandler(type) {
        const syncMap = {
            edu: function () { if (AF.tab2) AF.tab2.syncEdu(); },
            add: function () { if (AF.tab2) AF.tab2.syncAdditional(); },
            bar: function () { if (AF.tab3) AF.tab3.syncBar(); },
            practice: function () { if (AF.tab3) AF.tab3.syncPractice(); },
            judgmentAAG: function () { if (AF.tab3) AF.tab3.syncJudgmentAAG(); },
            judgmentAGP: function () { if (AF.tab3) AF.tab3.syncJudgmentAGP(); }
        };
        return syncMap[type] || null;
    }

    /** One delegated listener per list container — safe across renderList re-renders. */
    function initListDelegations() {
        Object.keys(LIST_CONTAINER_IDS).forEach(function (type) {
            const containerId = LIST_CONTAINER_IDS[type];
            const container = document.getElementById(containerId);
            if (!container || container.getAttribute('data-delegation-bound') === '1') {
                return;
            }
            container.setAttribute('data-delegation-bound', '1');

            const syncFn = getListSyncHandler(type);
            if (syncFn) {
                container.addEventListener('change', function (e) {
                    if (!e.target || !e.target.matches('input, select, textarea')) return;
                    syncFn();
                });
            }

            container.addEventListener('click', function (e) {
                const btn = e.target.closest('.remove-item[data-type="' + type + '"]');
                if (!btn || !container.contains(btn)) return;
                handleRemove({ target: btn });
            });
        });
    }

    function renderList(containerId, items, renderItemFn, type) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        items.forEach(function (item, idx) {
            const div = document.createElement('div');
            div.className = 'list-item';
            if (item.certificateFileName) {
                div.setAttribute('data-cert-name', item.certificateFileName);
            } else if (item.certificatePath) {
                const pathName = String(item.certificatePath).split(/[/\\]/).pop();
                if (pathName) div.setAttribute('data-cert-name', pathName);
            }
            if (item.certificatePath) {
                div.setAttribute('data-cert-path', item.certificatePath);
            }
            if (item.educationId) {
                div.setAttribute('data-education-id', String(item.educationId));
            }
            if (item.additionalId) {
                div.setAttribute('data-additional-id', String(item.additionalId));
            }
            div.innerHTML = renderItemFn(item, idx, type);
            container.appendChild(div);
        });
        if (container.querySelector('.custom-file-upload')) {
            initFileUploadButtons(container);
        }
    }

    function handleRemove(e) {
        const btn = e.target.closest('.remove-item') || e.target;
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const type = btn.getAttribute('data-type');
        const lists = {
            edu: state.eduItems,
            add: state.additionalItems,
            bar: state.barItems,
            practice: state.practiceItems,
            judgmentAAG: state.judgmentAAGItems,
            judgmentAGP: state.judgmentAGPItems
        };

        if (type === 'edu' && AF.tab2) {
            if (typeof AF.tab2.snapshotEduFilesFromDom === 'function') AF.tab2.snapshotEduFilesFromDom();
            AF.tab2.syncEdu();
        } else if (type === 'add' && AF.tab2) {
            if (typeof AF.tab2.snapshotAdditionalFilesFromDom === 'function') AF.tab2.snapshotAdditionalFilesFromDom();
            AF.tab2.syncAdditional();
        }

        const removedItem = lists[type] && !isNaN(idx) ? lists[type][idx] : null;

        function finishRemove() {
            if (lists[type]) lists[type].splice(idx, 1);
            reindexFilePreviewsAfterRemove(type, idx);
            renderAll();
        }

        function refreshTab2AfterServerDelete() {
            const successMessage = type === 'add'
                ? 'Additional qualification deleted successfully.'
                : 'Educational qualification deleted successfully.';

            if ((type === 'edu' || type === 'add')
                && AF.api
                && typeof AF.api.refreshTab2QualificationsFromApi === 'function') {
                return AF.api.refreshTab2QualificationsFromApi()
                    .then(function () {
                        showToast(successMessage, 'success');
                    })
                    .catch(function (err) {
                        console.warn('Tab2 refresh after delete:', err && err.message ? err.message : err);
                        finishRemove();
                    });
            }
            finishRemove();
            showToast(successMessage, 'success');
            return Promise.resolve();
        }

        if (type === 'edu' && removedItem) {
            const rowEl = btn.closest('.list-item');
            const educationId = parseInt(removedItem.educationId, 10)
                || parseInt(rowEl && rowEl.getAttribute('data-education-id'), 10)
                || 0;
            if (educationId > 0 && AF.api && typeof AF.api.deleteEducationRecord === 'function') {
                AF.api.deleteEducationRecord(educationId)
                    .then(refreshTab2AfterServerDelete)
                    .catch(function (err) {
                        alert(err && err.message ? err.message : 'Failed to delete educational qualification.');
                    });
                return;
            }
        }

        if (type === 'add' && removedItem) {
            const rowEl = btn.closest('.list-item');
            const additionalId = parseInt(removedItem.additionalId, 10)
                || parseInt(rowEl && rowEl.getAttribute('data-additional-id'), 10)
                || 0;
            if (additionalId > 0 && AF.api && typeof AF.api.deleteAdditionalQualificationRecord === 'function') {
                AF.api.deleteAdditionalQualificationRecord(additionalId)
                    .then(refreshTab2AfterServerDelete)
                    .catch(function (err) {
                        alert(err && err.message ? err.message : 'Failed to delete additional qualification.');
                    });
                return;
            }
        }

        finishRemove();
    }

    function reindexFilePreviewsAfterRemove(type, removedIdx) {
        const prefixMap = {
            edu: 'edu-',
            add: 'add-',
            bar: 'bar-',
            practice: 'practice-'
        };
        const prefix = prefixMap[type];
        if (!prefix || !state.filePreviews) return;

        const keys = Object.keys(state.filePreviews).filter(function (k) {
            return k.indexOf(prefix) === 0;
        }).sort(function (a, b) {
            return parseInt(a.slice(prefix.length), 10) - parseInt(b.slice(prefix.length), 10);
        });

        const next = {};
        keys.forEach(function (key) {
            const i = parseInt(key.slice(prefix.length), 10);
            if (i < removedIdx) {
                next[key] = state.filePreviews[key];
            } else if (i > removedIdx) {
                next[prefix + (i - 1)] = state.filePreviews[key];
            }
        });

        keys.forEach(function (key) { delete state.filePreviews[key]; });
        Object.keys(next).forEach(function (key) {
            state.filePreviews[key] = next[key];
        });
    }


    function renderAll() {
        if (AF.tab2) {
            AF.tab2.renderEdu();
            AF.tab2.renderAdditional();
        }
        if (AF.tab3) {
            AF.tab3.renderBar();
            AF.tab3.renderPractice();
            AF.tab3.renderJudgmentAAG();
            AF.tab3.renderJudgmentAGP();
        }
    }

    function switchTab(tabId) {
        Object.values(tabs).forEach(function (t) { if (t) t.classList.remove('active-panel'); });
        if (tabs[tabId]) tabs[tabId].classList.add('active-panel');
        tabButtons.forEach(function (btn) {
            const id = parseInt(btn.getAttribute('data-tab'), 10);
            btn.classList.toggle('active', id === tabId);
        });
        if (tabId === 2 && AF.api && typeof AF.api.onQualificationsTabActivated === 'function') {
            AF.api.onQualificationsTabActivated().catch(function (err) {
                console.warn('Qualifications tab load:', err && err.message ? err.message : err);
            });
        }
        if (tabId === 4 && AF.tab4) AF.tab4.generatePreview();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function bindTabButtons() {
        tabButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                switchTab(parseInt(this.getAttribute('data-tab'), 10));
            });
        });
    }

    function collectApplicationPayload() {
        AF.tab2.syncEdu();
        AF.tab2.syncAdditional();
        AF.tab3.syncBar();
        AF.tab3.syncPractice();
        AF.tab3.syncJudgmentAAG();
        AF.tab3.syncJudgmentAGP();
        collectLiveFilePreviews();
        const lawDegEl = document.getElementById('lawDegreeRecognized') || document.getElementById('lawDegreeRecognized1');
        return {
            personal: AF.tab1.getPersonalFromForm(),
            courtBench: getCourtBench(),
            lawDegreeRecognized: lawDegEl ? lawDegEl.value : '',
            eduItems: state.eduItems.slice(),
            additionalItems: state.additionalItems.slice(),
            barItems: state.barItems.slice(),
            practiceItems: state.practiceItems.slice(),
            judgmentAAGItems: state.judgmentAAGItems.slice(),
            judgmentAGPItems: state.judgmentAGPItems.slice(),
            draftingYears: document.getElementById('draftingYears') ? document.getElementById('draftingYears').value : '',
            itAssessee: document.getElementById('itAssessee') ? document.getElementById('itAssessee').value : '',
            declDate: document.getElementById('declDate') ? document.getElementById('declDate').value : '',
            declPlace: document.getElementById('declPlace') ? document.getElementById('declPlace').value : '',
            signature: document.getElementById('signature') ? document.getElementById('signature').value : '',
            postName: postName,
            filePreviews: JSON.parse(JSON.stringify(state.filePreviews))
        };
    }

    function saveDraft() {
        if (!jobId || formMode === 'previewOnly') return;
        AppData.saveApplication(userId, jobId, collectApplicationPayload(), 'draft');
        AppData.updateUserProfile(userId, AF.tab1.getPersonalFromForm());
    }

    function loadApplicationData(app) {
        if (!app) return;
        if (app.personal) AF.tab1.fillPersonal(app.personal);
        const lawDegEl = document.getElementById('lawDegreeRecognized') || document.getElementById('lawDegreeRecognized1');
        if (app.lawDegreeRecognized && lawDegEl) lawDegEl.value = app.lawDegreeRecognized;
        if (app.eduItems) state.eduItems = app.eduItems.slice();
        if (app.additionalItems) state.additionalItems = app.additionalItems.slice();
        if (app.barItems) state.barItems = app.barItems.slice();
        if (app.practiceItems) state.practiceItems = app.practiceItems.slice();
        if (app.judgmentAAGItems) state.judgmentAAGItems = app.judgmentAAGItems.slice();
        if (app.judgmentAGPItems) state.judgmentAGPItems = app.judgmentAGPItems.slice();
        if (app.draftingYears) {
            const el = document.getElementById('draftingYears');
            if (el) el.value = app.draftingYears;
        }
        if (app.declDate) {
            const el = document.getElementById('declDate');
            if (el) el.value = app.declDate;
        }
        if (app.declPlace) {
            const el = document.getElementById('declPlace');
            if (el) el.value = app.declPlace;
        }
        if (app.signature) {
            const el = document.getElementById('signature');
            if (el) el.value = app.signature;
        }
        if (app.itAssessee) {
            const el = document.getElementById('itAssessee');
            if (el) el.value = app.itAssessee;
        }
        if (app.specificBarYears) {
            const el = document.getElementById('specificBarYears');
            if (el) el.value = app.specificBarYears;
        }
        if (app.filePreviews) {
            Object.keys(app.filePreviews).forEach(function (k) {
                state.filePreviews[k] = app.filePreviews[k];
            });
        }
        if (state.filePreviews.photo && state.filePreviews.photo.name) AF.tab1.setPhotoFileLabel(state.filePreviews.photo.name);
        if (AF.tab1.mountEnrolmentCertUpload) AF.tab1.mountEnrolmentCertUpload();
        renderAll();
        mountJobBanner();
    }

    function applyFormMode() {
        const wizardNav = document.querySelector('.main-tab-container');
        const btnNext1 = document.getElementById('nextToTab2');
        const declBox = document.querySelector('.declaration-box');
        const finalBtn = document.getElementById('finalSubmitBtn');
        const prev4 = document.getElementById('prevToTab3');

        if (formMode === 'tab1Only') {
            tabButtons.forEach(function (btn) {
                const t = parseInt(btn.getAttribute('data-tab'), 10);
                if (t !== 1) btn.classList.add('hidden-tab');
            });
            if (btnNext1) btnNext1.style.display = 'none';
            tabs[1].querySelectorAll('input, select, textarea').forEach(function (el) {
                if (el.id !== 'enrolmentNo' && el.id !== 'seniorEnrolmentNo') {
                    el.setAttribute('readonly', 'readonly');
                }
            });
            switchTab(1);
            return;
        }

        if (formMode === 'previewOnly') {
            if (wizardNav) wizardNav.style.display = 'none';
            [1, 2, 3].forEach(function (n) {
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
                AF.tab4.generatePreview();
            }
            return;
        }

        switchTab(1);
    }

    const AF = {
        config: {
            userId: userId,
            jobId: jobId,
            formMode: formMode,
            postName: postName,
            existingApp: existingApp,
            selectedVacancies: getStoredVacancies()
        },
        state: state,
        tabs: tabs,
        utils: {
            escapeHtml: escapeHtml,
            showToast: showToast,
            formatDateForInput: formatDateForInput,
            truncateFileName: truncateFileName,
            pv: function (val) { return escapeHtml(val || '—'); },
            previewFieldRow: function (label, value) {
                return '<tr><th>' + escapeHtml(label) + '</th><td>' + escapeHtml(value || '—') + '</td></tr>';
            },
            previewTable: function (rows) {
                return '<table class="table table-sm preview-table mb-0"><tbody>' + rows + '</tbody></table>';
            }
        },
        files: {
            buildFileUploadHtml: buildFileUploadHtml,
            initFileUploadButtons: initFileUploadButtons,
            storeFilePreview: storeFilePreview,
            storeFilesPreview: storeFilesPreview,
            collectLiveFilePreviews: collectLiveFilePreviews,
            renderDocPreview: function (p) {
                if (!p) return '<span class="text-muted small">No file uploaded</span>';
                if (Array.isArray(p)) {
                    if (!p.length) return '<span class="text-muted small">No file uploaded</span>';
                    return '<div class="preview-doc-list">' + p.map(function (f) { return AF.files.renderDocPreview(f); }).join('') + '</div>';
                }
                if (!p.dataUrl) return '<span class="text-muted small">' + AF.utils.pv(p.name) + '</span>';
                if (p.isImage) {
                    return '<div class="preview-doc preview-doc-image"><img src="' + p.dataUrl + '" alt="' + AF.utils.pv(p.name) + '"><p class="small text-muted mb-0">' + AF.utils.pv(p.name) + '</p></div>';
                }
                if (p.isPdf) {
                    return '<div class="preview-doc preview-doc-pdf"><iframe src="' + p.dataUrl + '" title="' + AF.utils.pv(p.name) + '"></iframe><p class="small text-muted mb-0">' + AF.utils.pv(p.name) + '</p></div>';
                }
                return '<div class="preview-doc preview-doc-file"><a href="' + p.dataUrl + '" download="' + AF.utils.pv(p.name) + '"><i class="fas fa-file-alt me-1"></i>' + AF.utils.pv(p.name) + '</a></div>';
            }
        },
        lists: {
            renderList: renderList,
            renderAll: renderAll,
            handleRemove: handleRemove,
            initListDelegations: initListDelegations
        },
        nav: {
            switchTab: switchTab,
            bindTabButtons: bindTabButtons
        },
        data: {
            getCourtBench: getCourtBench,
            collectApplicationPayload: collectApplicationPayload,
            saveDraft: saveDraft,
            loadApplicationData: loadApplicationData,
            applyFormMode: applyFormMode,
            mountJobBanner: mountJobBanner
        },
        tab1: null,
        tab2: null,
        tab3: null,
        tab4: null
    };
    
    initListDelegations();

    return AF;
})();
