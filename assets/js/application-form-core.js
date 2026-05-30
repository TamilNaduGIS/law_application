window.PortalNav = window.PortalNav || {
    mount: function () {},
    render: function () {}
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

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function (m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
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

    function buildFileUploadHtml(inputId, defaultLabel, savedFileName, extraClass, accept, multiple, isExisting) {
        const display = savedFileName ? truncateFileName(savedFileName) : defaultLabel;
        const hasFile = savedFileName ? ' has-file' : '';
        const multi = multiple ? ' multiple' : '';
        const acceptAttr = accept ? ' accept="' + accept + '"' : '';
        const cls = extraClass ? ' ' + extraClass : '';
        const iconClass = isExisting ? 'bi bi-pencil-square' : 'fas fa-file-upload';
        return (
            '<div class="custom-file-upload' + hasFile + '" data-default="' + escapeHtml(defaultLabel) + '">' +
            '<input type="file" id="' + inputId + '" class="file-input-hidden' + cls + '"' + acceptAttr + multi + '>' +
            '<button type="button" class="btn btn-outline-primary btn-upload-file btn-upload-file-sm w-100">' +
            '<i class="' + iconClass + ' me-1"></i><span class="upload-btn-text" title="' + escapeHtml(savedFileName || '') + '">' + escapeHtml(display) + '</span>' +
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
                    const iconEl = btn.querySelector('i');
                    if (iconEl) {
                        iconEl.className = 'bi bi-pencil-square me-1';
                    }
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
            sel.addEventListener('change', function () {
                sessionStorage.setItem('courtBench', sel.value);
                saveDraft();
            });
        }
    }

    function renderList(containerId, items, renderItemFn, type) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        items.forEach(function (item, idx) {
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

    function attachRemoveEvents(type) {
        document.querySelectorAll('.remove-item[data-type="' + type + '"]').forEach(function (btn) {
            btn.onclick = handleRemove;
        });
    }

    function attachSyncEvents(type) {
        const map = {
            edu: '#eduListContainer input',
            add: '#additionalListContainer input',
            bar: '#barExpContainer input',
            practice: '#courtPracticeContainer input',
            judgmentAAG: '#judgmentAAGContainer input',
            judgmentAGP: '#judgmentAGPContainer input'
        };
        const sel = map[type];
        if (!sel) return;
        const syncMap = {
            edu: function () { AF.tab2.syncEdu(); },
            add: function () { AF.tab2.syncAdditional(); },
            bar: function () { AF.tab3.syncBar(); },
            practice: function () { AF.tab3.syncPractice(); },
            judgmentAAG: function () { AF.tab3.syncJudgmentAAG(); },
            judgmentAGP: function () { AF.tab3.syncJudgmentAGP(); }
        };
        document.querySelectorAll(sel).forEach(function (inp) {
            inp.onchange = syncMap[type];
        });
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
        if (lists[type]) lists[type].splice(idx, 1);
        renderAll();
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
        if (state.filePreviews.photo && state.filePreviews.photo.name && !state.filePreviews.photo.isExisting) {
            AF.tab1.setPhotoFileLabel(state.filePreviews.photo.name);
        } else if (window.sessionStorage.getItem('photoPath') && AF.tab1.showExistingPhoto) {
            AF.tab1.showExistingPhoto(
                window.sessionStorage.getItem('photoPath'),
                window.sessionStorage.getItem('photoName')
            );
        } else if (state.filePreviews.photo && state.filePreviews.photo.name) {
            AF.tab1.setPhotoFileLabel(state.filePreviews.photo.name);
        }
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
                const src = p.dataUrl || p.url || '';
                if (!src) return '<span class="text-muted small">' + AF.utils.pv(p.name) + '</span>';
                if (p.isImage) {
                    return '<div class="preview-doc preview-doc-image"><img src="' + src + '" alt="' + AF.utils.pv(p.name) + '"><p class="small text-muted mb-0">' + AF.utils.pv(p.name) + '</p></div>';
                }
                if (p.isPdf) {
                    return '<div class="preview-doc preview-doc-pdf"><iframe src="' + src + '" title="' + AF.utils.pv(p.name) + '"></iframe><p class="small text-muted mb-0">' + AF.utils.pv(p.name) + '</p></div>';
                }
                return '<div class="preview-doc preview-doc-file"><a href="' + src + '" download="' + AF.utils.pv(p.name) + '" target="_blank" rel="noopener"><i class="fas fa-file-alt me-1"></i>' + AF.utils.pv(p.name) + '</a></div>';
            }
        },
        lists: {
            renderList: renderList,
            renderAll: renderAll,
            handleRemove: handleRemove
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

    return AF;
})();
