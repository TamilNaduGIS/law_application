window.PortalNav = window.PortalNav || {
    mount: function () { },
    render: function () { }
};

/**
 * Shared state, utilities, navigation, and list infrastructure for the application form.
 */
window.ApplicationForm = (function () {
    const params = new URLSearchParams(window.location.search);
    const previewView = params.get('previewView') === '1' || params.get('readonly') === '1';

    function isSubmittedHyperlinkView() {
        if (params.get('previewView') !== '1') return false;
        if (params.get('submitted') === '1') return true;
        if (sessionStorage.getItem('applicationSubmitted') === 'true') return true;
        return !!params.get('jobId');
    }
    const jobId = params.get('jobId') || sessionStorage.getItem('selectedJobId') || '';
    if (jobId) {
        sessionStorage.setItem('selectedJobId', jobId);
    }
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
    const readOnlyView = previewView
        || sessionStorage.getItem('applicationSubmitted') === 'true';
    const postName = sessionStorage.getItem('selectedPost') || '—';

    function getStoredVacancies() {
        if (window.JobSelection) {
            return JobSelection.enrichSelections(JobSelection.readStoredVacancies());
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
        filePreviews: {},
        experienceHydrated: false
    };

    const tabs = {
        1: document.getElementById('tab1'),
        2: document.getElementById('tab2'),
        3: document.getElementById('tab3'),
        4: document.getElementById('tab4')
    };
    const tabButtons = document.querySelectorAll('.main-tab');

    const FILE_NAME_MAX_LEN = 20;
    const FILE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
    const FILE_UPLOAD_MAX_MB = 5;
    const PHOTO_UPLOAD_ACCEPT = '.jpg,.jpeg,.png';
    const CERT_UPLOAD_ACCEPT = '.pdf,.jpg,.jpeg,.png';
    const PHOTO_EXT_REGEX = /\.(jpe?g|png)$/i;
    const CERT_EXT_REGEX = /\.(jpe?g|png|pdf)$/i;

    function resolveUploadKind(input) {
        if (!input) return 'certificate';
        if (input.id === 'photoUpload') return 'photo';
        if (input.getAttribute('data-upload-kind') === 'photo') return 'photo';
        return 'certificate';
    }

    function validateUploadFile(file, kind) {
        if (!file) {
            return { ok: false, message: 'No file selected.' };
        }
        const isPhoto = kind === 'photo';
        const name = String(file.name || '');
        const extOk = isPhoto
            ? PHOTO_EXT_REGEX.test(name)
            : CERT_EXT_REGEX.test(name);
        const mime = String(file.type || '').toLowerCase();
        const mimeOk = isPhoto
            ? (mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/jpg')
            : (mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/jpg' || mime === 'application/pdf');
        if (!extOk && !mimeOk) {
            return {
                ok: false,
                message: isPhoto
                    ? 'Photo must be JPG or PNG only (maximum ' + FILE_UPLOAD_MAX_MB + ' MB).'
                    : 'Only JPG, JPEG, PNG or PDF files are allowed (maximum ' + FILE_UPLOAD_MAX_MB + ' MB).'
            };
        }
        if (file.size > FILE_UPLOAD_MAX_BYTES) {
            return {
                ok: false,
                message: 'File size must not exceed ' + FILE_UPLOAD_MAX_MB + ' MB.'
            };
        }
        return { ok: true };
    }

    function validateUploadFiles(files, kind) {
        if (!files || !files.length) {
            return { ok: true };
        }
        for (let i = 0; i < files.length; i++) {
            const check = validateUploadFile(files[i], kind);
            if (!check.ok) {
                return check;
            }
        }
        return { ok: true };
    }

    function getUploadHint(kind) {
        if (kind === 'photo') {
            return 'Allowed formats: JPG, JPEG, PNG only. Maximum file size: ' + FILE_UPLOAD_MAX_MB + ' MB.';
        }
        return 'Allowed formats: JPG, JPEG, PNG or PDF only. Maximum file size: ' + FILE_UPLOAD_MAX_MB + ' MB.';
    }

    function getUploadHintHtml(kind) {
        return '<p class="upload-field-hint small mb-2">' + escapeHtml(getUploadHint(kind)) + '</p>';
    }

    function findUploadFieldRoot(input) {
        if (!input) return null;
        const strip = input.closest('.cert-upload-strip');
        if (strip) {
            return strip.closest('.list-item') || strip.closest('.field-row') || strip;
        }
        const custom = input.closest('.custom-file-upload');
        if (custom) {
            return custom.closest('.field-row') || custom.closest('.list-item') || custom.parentElement;
        }
        const compact = input.closest('.compact-upload-wrapper');
        if (compact) {
            return compact.closest('#enrolmentCertUploadMount')
                || compact.closest('.field-row')
                || compact.parentElement;
        }
        const box = input.closest('.compact-upload-box, .practice-upload-box, .edu-upload-box, .add-upload-box');
        if (box) {
            return box.closest('.list-item') || box.closest('.field-row') || box.parentElement;
        }
        return input.closest('.field-row')
            || input.closest('.list-item')
            || null;
    }

    function findOrCreateUploadErrorEl(root) {
        if (!root) return null;
        let el = root.querySelector('.upload-field-error');
        if (!el) {
            el = document.createElement('p');
            el.className = 'upload-field-error small mb-2';
            el.setAttribute('role', 'alert');
            el.hidden = true;
            const hint = root.querySelector('.upload-field-hint');
            if (hint && hint.parentNode) {
                hint.parentNode.insertBefore(el, hint.nextSibling);
            } else {
                root.insertBefore(el, root.firstChild);
            }
        }
        return el;
    }

    function setUploadFieldError(input, message) {
        const text = message != null ? String(message).trim() : '';
        if (!text) return;
        const root = findUploadFieldRoot(input);
        const el = findOrCreateUploadErrorEl(root);
        if (el) {
            el.textContent = text;
            el.hidden = false;
            el.style.display = 'block';
            el.classList.add('is-visible');
            if (root) root.classList.add('has-upload-error');
        }
    }

    function clearUploadFieldError(input) {
        if (!input) return;
        const scopes = [];
        const root = findUploadFieldRoot(input);
        if (root) scopes.push(root);
        ['.cert-upload-strip', '.field-row', '.list-item', '#enrolmentCertUploadMount'].forEach(function (sel) {
            const el = input.closest(sel);
            if (el && scopes.indexOf(el) === -1) scopes.push(el);
        });
        scopes.forEach(function (scope) {
            scope.querySelectorAll('.upload-field-error').forEach(function (errEl) {
                errEl.textContent = '';
                errEl.hidden = true;
                errEl.classList.remove('is-visible');
                errEl.style.display = 'none';
            });
            scope.classList.remove('has-upload-error');
        });
    }

    function buildFileUploadSelectedPanelHtml() {
        return (
            '<div class="upload-selected-panel" hidden>' +
            '<div class="upload-selected-inner">' +
            '<span class="upload-selected-thumb" aria-hidden="true"><i class="bi bi-file-earmark-check-fill"></i></span>' +
            '<div class="upload-selected-meta">' +
            '<span class="upload-file-name" title=""></span>' +
            '<button type="button" class="upload-replace-trigger btn btn-link btn-sm p-0">Replace file</button>' +
            '</div>' +
            '<button type="button" class="upload-file-remove-btn" hidden aria-label="Remove file" title="Remove file">' +
            '<i class="bi bi-x-lg"></i></button>' +
            '</div></div>'
        );
    }

    function ensureSelectedPanel(host) {
        if (!host || host.querySelector('.upload-selected-panel')) {
            return;
        }
        host.insertAdjacentHTML('beforeend', buildFileUploadSelectedPanelHtml());
    }

    function wrapElementInPickPanel(host, element) {
        if (!host || !element || host.querySelector('.upload-pick-panel')) {
            return;
        }
        const pick = document.createElement('div');
        pick.className = 'upload-pick-panel';
        element.parentNode.insertBefore(pick, element);
        pick.appendChild(element);
    }

    function ensureUploadHostForInput(input) {
        if (!input) {
            return null;
        }
        let host = input.closest('.file-upload-host');
        if (host) {
            ensureSelectedPanel(host);
            return host;
        }

        const compactWrap = input.closest('.compact-upload-wrapper');
        if (compactWrap) {
            host = compactWrap;
            host.classList.add('file-upload-host');
            const label = host.querySelector('label.compact-upload-card');
            if (label) {
                wrapElementInPickPanel(host, label);
            }
            ensureSelectedPanel(host);
            return host;
        }

        const strip = input.closest('.cert-upload-strip');
        if (strip) {
            host = strip;
            host.classList.add('file-upload-host');
            const label = strip.querySelector('label.edu-upload-box, label.add-upload-box');
            if (label) {
                wrapElementInPickPanel(host, label);
            }
            ensureSelectedPanel(host);
            return host;
        }

        const custom = input.closest('.custom-file-upload');
        if (custom) {
            host = custom;
            host.classList.add('file-upload-host');
            const btn = custom.querySelector('.btn-upload-file');
            if (btn) {
                wrapElementInPickPanel(host, btn);
            }
            ensureSelectedPanel(host);
            return host;
        }

        const box = input.closest('.compact-upload-box, .practice-upload-box');
        if (box) {
            host = box.closest('.file-upload-host');
            if (!host) {
                host = document.createElement('div');
                host.className = 'file-upload-host tab3-file-upload-host';
                const parent = box.parentNode;
                if (parent) {
                    parent.insertBefore(host, box);
                    const pick = document.createElement('div');
                    pick.className = 'upload-pick-panel';
                    host.appendChild(pick);
                    pick.appendChild(box);
                    ensureSelectedPanel(host);
                }
            } else {
                ensureSelectedPanel(host);
            }
            return host;
        }

        return null;
    }

    function isUploadHostLocked(host) {
        if (!host) {
            return false;
        }
        if (host.classList.contains('prefilled-locked')) {
            return true;
        }
        const lockedAncestor = host.closest('.prefilled-locked');
        return !!lockedAncestor;
    }

    /**
     * Show selected-file panel (filename only; Replace file → ❌ to clear).
     * @param {Object} [options] replaceReady — show ❌ immediately (saved/server file)
     */
    function showFileUploadSelected(input, fileName, options) {
        options = options || {};
        if (!input || !fileName) {
            return;
        }
        const host = ensureUploadHostForInput(input);
        if (!host) {
            return;
        }

        const pick = host.querySelector('.upload-pick-panel');
        const panel = host.querySelector('.upload-selected-panel');
        const nameEl = host.querySelector('.upload-file-name');
        const removeBtn = host.querySelector('.upload-file-remove-btn');
        const replaceTrig = host.querySelector('.upload-replace-trigger');
        const thumb = host.querySelector('.upload-selected-thumb');
        const locked = isUploadHostLocked(host);

        if (nameEl) {
            nameEl.textContent = truncateFileName(fileName, 48);
            nameEl.title = fileName;
        }
        if (thumb) {
            if (options.thumbnailHtml) {
                thumb.innerHTML = options.thumbnailHtml;
            } else if (options.isPhoto) {
                thumb.innerHTML = '<i class="bi bi-person-badge-fill"></i>';
            } else {
                thumb.innerHTML = '<i class="bi bi-file-earmark-check-fill"></i>';
            }
        }

        if (pick) {
            pick.hidden = false;
            pick.style.display = '';
        }
        if (panel) {
            panel.hidden = false;
        }
        host.classList.add('has-upload');
        host.classList.remove('replace-ready');

        if (pick) {
            pick.hidden = true;
            pick.style.display = 'none';
        }

        if (removeBtn) {
            removeBtn.hidden = true;
        }
        if (replaceTrig) {
            replaceTrig.hidden = locked || !!options.hideReplace;
        }

        if (options.replaceReady && !locked) {
            host.classList.add('replace-ready');
            if (removeBtn) {
                removeBtn.hidden = false;
            }
            if (replaceTrig) {
                replaceTrig.hidden = true;
            }
        }

        const custom = input.closest('.custom-file-upload');
        if (custom) {
            custom.classList.add('has-file');
            const textEl = custom.querySelector('.upload-btn-text');
            if (textEl && options.keepButtonLabel) {
                textEl.textContent = truncateFileName(fileName);
                textEl.title = fileName;
            }
        }
    }

    function clearFileUpload(input, options) {
        options = options || {};
        if (!input) {
            return;
        }
        const host = options.host || ensureUploadHostForInput(input);
        const previewKey = resolvePreviewKey(input);
        if (previewKey) {
            delete state.filePreviews[previewKey];
        }

        input.value = '';
        input.disabled = false;

        if (host) {
            const pick = host.querySelector('.upload-pick-panel');
            const panel = host.querySelector('.upload-selected-panel');
            const removeBtn = host.querySelector('.upload-file-remove-btn');
            const replaceTrig = host.querySelector('.upload-replace-trigger');
            const thumb = host.querySelector('.upload-selected-thumb');

            if (pick) {
                pick.hidden = false;
                pick.style.display = '';
            }
            if (panel) {
                panel.hidden = true;
            }
            host.classList.remove('has-upload', 'replace-ready');
            if (removeBtn) {
                removeBtn.hidden = true;
            }
            if (replaceTrig) {
                replaceTrig.hidden = isUploadHostLocked(host);
            }
            if (thumb && !host.closest('.compact-upload-wrapper')) {
                thumb.innerHTML = '<i class="bi bi-file-earmark-check-fill"></i>';
            }
        }

        const custom = input.closest('.custom-file-upload');
        if (custom) {
            custom.classList.remove('has-file');
            const btn = custom.querySelector('.btn-upload-file');
            const textEl = custom.querySelector('.upload-btn-text');
            const defaultLabel = custom.getAttribute('data-default') || 'Upload';
            if (textEl) {
                textEl.textContent = defaultLabel;
                textEl.title = '';
            }
            const iconEl = btn && btn.querySelector('i');
            if (iconEl) {
                iconEl.className = 'fas fa-file-upload me-1';
            }
        }

        const listItem = input.closest('.list-item, .edu-card, .add-card, .bar-item, .practice-item');
        if (listItem) {
            listItem.removeAttribute('data-cert-name');
            if (typeof window.jQuery !== 'undefined') {
                const $item = window.jQuery(listItem);
                $item.removeData('supporting-document');
                $item.removeData('practice-document');
            }
        }

        clearUploadFieldError(input);

        if (typeof options.onClear === 'function') {
            options.onClear(input, host);
        }
        input.dispatchEvent(new CustomEvent('file-upload-cleared', { bubbles: true }));
    }

    function enhanceFileUploadHosts(root) {
        const scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll('input[type="file"]').forEach(function (input) {
            if (!isApplicationFormFileInput(input)) {
                return;
            }
            ensureUploadHostForInput(input);
        });
    }

    let uploadReplacementUiBound = false;

    function initUploadReplacementUi() {
        enhanceFileUploadHosts(document);
        if (uploadReplacementUiBound) {
            return;
        }
        uploadReplacementUiBound = true;

        document.addEventListener('click', function (e) {
            const replaceTrig = e.target.closest('.upload-replace-trigger');
            if (replaceTrig) {
                e.preventDefault();
                const host = replaceTrig.closest('.file-upload-host');
                if (!host || isUploadHostLocked(host)) {
                    return;
                }
                host.classList.add('replace-ready');
                replaceTrig.hidden = true;
                const removeBtn = host.querySelector('.upload-file-remove-btn');
                if (removeBtn) {
                    removeBtn.hidden = false;
                }
                return;
            }

            const removeBtn = e.target.closest('.upload-file-remove-btn');
            if (!removeBtn) {
                return;
            }
            e.preventDefault();
            const host = removeBtn.closest('.file-upload-host');
            if (!host || isUploadHostLocked(host)) {
                return;
            }
            const input = host.querySelector('input[type="file"]');
            if (input && !input.disabled) {
                clearFileUpload(input);
            }
        });
    }

    /**
     * Validate selected file(s) and show/clear inline error immediately.
     * @returns {boolean} true if valid or empty
     */
    function validateFileInputUi(input) {
        if (!input || input.type !== 'file') {
            return true;
        }
        if (!input.files || !input.files.length) {
            clearUploadFieldError(input);
            return true;
        }
        const kind = resolveUploadKind(input);
        const check = validateUploadFiles(input.files, kind);
        if (!check.ok) {
            showUploadValidationError(check.message, input);
            input.value = '';
            return false;
        }
        clearUploadFieldError(input);
        const displayName = input.files.length === 1
            ? input.files[0].name
            : input.files.length + ' file(s) selected';
        let thumbnailHtml = null;
        if (kind === 'photo' && input.files[0]) {
            thumbnailHtml = '<img src="' + URL.createObjectURL(input.files[0]) + '" class="preview-upload-thumb" alt="">';
        }
        showFileUploadSelected(input, displayName, {
            isPhoto: kind === 'photo',
            thumbnailHtml: thumbnailHtml
        });
        return true;
    }

    function buildCompactUploadHtml(options) {
        const opts = options || {};
        const inputId = opts.inputId || 'fileUpload';
        const title = opts.title || 'Upload file';
        const subtitle = opts.subtitle || '';
        const hint = opts.hint != null ? opts.hint : getUploadHint(opts.kind || 'certificate');
        const accept = opts.accept || (opts.kind === 'photo' ? PHOTO_UPLOAD_ACCEPT : CERT_UPLOAD_ACCEPT);
        const iconClass = opts.iconClass || 'bi bi-file-earmark-arrow-up-fill';
        const extraWrapClass = opts.wrapperClass ? ' ' + opts.wrapperClass : '';
        const hintHtml = '<p class="upload-field-hint small mb-2">' + escapeHtml(hint) + '</p>';
        const errorHtml = '<p class="upload-field-error small mb-2" role="alert" hidden></p>';
        return (
            hintHtml +
            errorHtml +
            '<div class="compact-upload-wrapper tab1-compact-upload file-upload-host' + extraWrapClass + '">' +
            '<input type="file" id="' + escapeHtml(inputId) + '" class="d-none" accept="' + escapeHtml(accept) + '">' +
            '<div class="upload-pick-panel">' +
            '<label for="' + escapeHtml(inputId) + '" class="compact-upload-card">' +
            '<div class="compact-upload-content">' +
            '<div class="upload-icon-wrapper"><i class="' + escapeHtml(iconClass) + ' upload-main-icon"></i></div>' +
            '<div class="upload-text-area">' +
            '<div class="upload-title">' + escapeHtml(title) + '</div>' +
            '<div class="upload-subtitle">' + escapeHtml(subtitle) + '</div>' +
            '</div>' +
            '<div class="upload-action-btn"><i class="bi bi-cloud-arrow-up-fill me-1"></i> Choose</div>' +
            '</div></label></div>' +
            buildFileUploadSelectedPanelHtml() +
            '</div>'
        );
    }

    function isApplicationFormFileInput(input) {
        if (!input || input.type !== 'file') {
            return false;
        }
        return !!input.closest('.form-panel, .main-section, #tab1, #tab2, #tab3, #tab4');
    }

    function applyFileInputRules(input) {
        if (!input || input.type !== 'file') {
            return;
        }
        const kind = resolveUploadKind(input);
        input.setAttribute('data-upload-kind', kind);
        input.setAttribute('accept', kind === 'photo' ? PHOTO_UPLOAD_ACCEPT : CERT_UPLOAD_ACCEPT);
    }

    function refreshFileUploadRules(root) {
        const scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll('input[type="file"]').forEach(applyFileInputRules);
    }

    let globalFileValidationBound = false;

    function initAllFileUploadValidation() {
        refreshFileUploadRules(document);
        if (globalFileValidationBound) {
            return;
        }
        globalFileValidationBound = true;
        function onFileInputEvent(e) {
            const input = e.target;
            if (!isApplicationFormFileInput(input)) {
                return;
            }
            validateFileInputUi(input);
        }
        document.addEventListener('change', onFileInputEvent, true);
        document.addEventListener('input', onFileInputEvent, true);
    }

    function showUploadValidationError(message, input) {
        const text = message || 'Invalid file.';
        if (input) {
            setUploadFieldError(input, text);
            return;
        }
        if (window.LawPortal && typeof window.LawPortal.alert === 'function') {
            window.LawPortal.alert({ icon: 'error', title: 'Invalid file', text: text });
            return;
        }
        showToast(text, 'error');
    }
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

    function buildFileUploadHtml(inputId, defaultLabel, savedFileName, extraClass, accept, multiple, isExisting, uploadHint) {
        const display = savedFileName ? truncateFileName(savedFileName) : defaultLabel;
        const hasFile = savedFileName ? ' has-file' : '';
        const multi = multiple ? ' multiple' : '';
        const resolvedAccept = accept || CERT_UPLOAD_ACCEPT;
        const resolvedHint = uploadHint != null ? uploadHint : getUploadHint('certificate');
        const acceptAttr = ' accept="' + resolvedAccept + '"';
        const cls = extraClass ? ' ' + extraClass : '';
        const iconClass = isExisting ? 'bi bi-pencil-square' : 'fas fa-file-upload';
        const hintHtml = resolvedHint
            ? '<p class="upload-field-hint small mb-2">' + escapeHtml(resolvedHint) + '</p>'
            : '';
        const errorHtml = '<p class="upload-field-error small mb-2" role="alert" hidden></p>';
        return (
            hintHtml +
            errorHtml +
            '<div class="custom-file-upload file-upload-host' + hasFile + '" data-default="' + escapeHtml(defaultLabel) + '">' +
            '<input type="file" id="' + inputId + '" class="file-input-hidden' + cls + '"' + acceptAttr + multi + '>' +
            '<div class="upload-pick-panel">' +
            '<button type="button" class="btn btn-outline-primary btn-upload-file btn-upload-file-sm w-100">' +
            '<i class="' + iconClass + ' me-1"></i><span class="upload-btn-text" title="' + escapeHtml(savedFileName || '') + '">' + escapeHtml(display) + '</span>' +
            '</button></div>' +
            buildFileUploadSelectedPanelHtml() +
            '</div>'
        );
    }

    function buildViewDocButtonHtml(url, label) {
        if (!url) return '';
        const safeUrl = String(url).replace(/\\/g, '/').replace(/'/g, '%27');
        const isImage = /\.(jpe?g|png|gif|webp)$/i.test(safeUrl);
        const handler = isImage ? 'openImagePreview' : 'openPdfPreview';
        const text = escapeHtml(label || 'View Document');
        return (
            '<div class="doc-view-wrap mt-1">' +
            '<button type="button" class="preview-btn doc-view-btn" onclick="' + handler + '(\'' + safeUrl + '\')">' +
            '<i class="bi bi-eye-fill"></i> ' + text +
            '</button></div>'
        );
    }

    function appendViewDocButton(host, preview, label) {
        if (!host || !preview || !preview.url) return;
        const existing = host.querySelector('.doc-view-wrap');
        if (existing) existing.remove();
        host.insertAdjacentHTML('beforeend', buildViewDocButtonHtml(preview.url, label || preview.name || 'View Document'));
    }

    function mountAllDocPreviewButtons(root) {
        root = root || document.querySelector('.app-container');
        if (!root) return;

        root.querySelectorAll('.doc-view-wrap').forEach(function (el) {
            el.remove();
        });

        const previews = state.filePreviews || {};

        if (previews.photo && previews.photo.url) {
            const photoInput = document.getElementById('photoUpload');
            const host = photoInput && photoInput.closest('.compact-upload-wrapper');
            if (host) appendViewDocButton(host, previews.photo, 'View Photo');
        }

        if (previews.enrolmentCert && previews.enrolmentCert.url) {
            const certMount = document.getElementById('enrolmentCertUploadMount');
            const certInput = document.getElementById('enrolmentCertUpload');
            const host = certMount || (certInput && certInput.closest('.file-upload-host'));
            if (host) appendViewDocButton(host, previews.enrolmentCert, 'View Certificate');
        }

        Object.keys(previews).forEach(function (key) {
            const preview = previews[key];
            if (!preview || !preview.url) return;

            let host = null;
            if (key.indexOf('edu-') === 0) {
                const idx = parseInt(key.slice(4), 10);
                const rows = root.querySelectorAll('#eduListContainer .list-item');
                if (!isNaN(idx) && rows[idx]) host = rows[idx].querySelector('.cert-upload-strip') || rows[idx];
            } else if (key.indexOf('add-') === 0) {
                const idx = parseInt(key.slice(4), 10);
                const rows = root.querySelectorAll('#additionalListContainer .list-item');
                if (!isNaN(idx) && rows[idx]) host = rows[idx].querySelector('.cert-upload-strip') || rows[idx];
            } else if (key.indexOf('bar-') === 0) {
                const idx = parseInt(key.slice(4), 10);
                const items = root.querySelectorAll('#barExpContainer .bar-item');
                if (!isNaN(idx) && items[idx]) host = items[idx].querySelector('.cert-upload-strip, .file-upload-host') || items[idx];
            } else if (key.indexOf('practice-') === 0) {
                const idx = parseInt(key.slice(9), 10);
                const items = root.querySelectorAll('#courtPracticeContainer .practice-item');
                if (!isNaN(idx) && items[idx]) host = items[idx].querySelector('.cert-upload-strip, .file-upload-host') || items[idx];
            } else if (key === 'drafting') {
                host = document.getElementById('draftingUploadMount')
                    || (document.getElementById('draftingUpload') && document.getElementById('draftingUpload').closest('.file-upload-host'));
            }

            if (host) appendViewDocButton(host, preview);
        });
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
            ensureUploadHostForInput(input);

            input.addEventListener('change', function () {
                const previewKey = resolvePreviewKey(input);
                if (input.files && input.files.length) {
                    if (!validateFileInputUi(input)) {
                        return;
                    }
                    if (previewKey === 'drafting') storeFilesPreview('drafting', input.files);
                    else if (previewKey && input.files.length > 1) storeFilesPreview(previewKey, input.files);
                    else if (previewKey) storeFilePreview(previewKey, input.files[0]);
                    const listItem = input.closest('.list-item');
                    if (listItem) {
                        listItem.setAttribute('data-cert-name', input.files[0].name);
                        if (listItem.closest('#eduListContainer') && AF.tab2) AF.tab2.syncEdu();
                        else if (listItem.closest('#additionalListContainer') && AF.tab2) AF.tab2.syncAdditional();
                        else if (listItem.closest('#barExpContainer') && AF.tab3) AF.tab3.syncBar();
                        else if (listItem.closest('#courtPracticeContainer') && AF.tab3) AF.tab3.syncPractice();
                        else if (listItem.closest('#judgmentAAGContainer') && AF.tab3) AF.tab3.syncJudgmentAAG();
                        else if (listItem.closest('#judgmentAGPContainer') && AF.tab3) AF.tab3.syncJudgmentAGP();
                    }
                } else {
                    clearFileUpload(input);
                }
            });

            wrap.addEventListener('file-upload-cleared', function () {
                const previewKey = resolvePreviewKey(input);
                if (previewKey) delete state.filePreviews[previewKey];
            });

            if (wrap.classList.contains('has-file')) {
                const savedLabel = (textEl.getAttribute('title') || textEl.textContent || '').trim();
                if (savedLabel && savedLabel !== defaultLabel) {
                    showFileUploadSelected(input, savedLabel, { replaceReady: true });
                }
            }
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
                    ? JobSelection.enrichSelection({ jobId: id, postName: postName })
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

        let postsHtml = '';
        let courtHtml = '';

        if (selections.length === 1) {
            const postLines = window.JobSelection
                ? JobSelection.formatBannerLines(selections)
                : [postName + ' : ' + jobIdsLabel];
            postLines.forEach(function (line) {
                postsHtml += '<div class="job-banner-post-line">' + escapeHtml(line) + '</div>';
            });
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
        } else if (selections.length > 1) {
            selections.forEach(function (s) {
                const line = window.JobSelection
                    ? JobSelection.formatSelectionLine(s)
                    : ((s.postName || s.jobId) + ' — ' + (s.courtBench || '') + ' (' + (s.jobId || '') + ')');
                postsHtml += '<div class="job-banner-post-line">' + escapeHtml(line) + '</div>';
            });
        } else {
            const fallbackLine = (postName || 'Post') + ' : ' + jobIdsLabel;
            postsHtml = '<div class="job-banner-post-line">' + escapeHtml(fallbackLine) + '</div>';
        }

        jobBanner.innerHTML =
            '<div class="job-banner-inner">' +
            '<div class="job-banner-posts">' + postsHtml + '</div>' +
            '<div class="job-banner-meta-sub">Job ID: <strong>' + escapeHtml(jobIdsLabel) + '</strong> · User Id: <strong>' + escapeHtml(userId) + '</strong></div>' +
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
                e.preventDefault();
                e.stopPropagation();
                handleRemove({ target: btn, preventDefault: function () {}, stopPropagation: function () {} });
            });
        });
    }

    // function renderList(containerId, items, renderItemFn, type) {
    //     const container = document.getElementById(containerId);
    //     if (!container) return;
    //     container.innerHTML = '';
    //     items.forEach(function (item, idx) {
    //         const div = document.createElement('div');
    //         div.className = 'list-item';
    //         if (item.certificateFileName) div.setAttribute('data-cert-name', item.certificateFileName);
    //         div.innerHTML = renderItemFn(item, idx, type);
    //         container.appendChild(div);
    //     });
    //     attachRemoveEvents(type);
    //     attachSyncEvents(type);
    //     initFileUploadButtons(container);
    // }

    // function attachRemoveEvents(type) {
    //     document.querySelectorAll('.remove-item[data-type="' + type + '"]').forEach(function (btn) {
    //         btn.onclick = handleRemove;
    //     });
    // }

    // function attachSyncEvents(type) {
    //     const map = {
    //         edu: '#eduListContainer input',
    //         add: '#additionalListContainer input',
    //         bar: '#barExpContainer input',
    //         practice: '#courtPracticeContainer input',
    //         judgmentAAG: '#judgmentAAGContainer input',
    //         judgmentAGP: '#judgmentAGPContainer input'
    //     };
    //     const sel = map[type];
    //     if (!sel) return;
    //     const syncMap = {
    //         edu: function () { AF.tab2.syncEdu(); },
    //         add: function () { AF.tab2.syncAdditional(); },
    //         bar: function () { AF.tab3.syncBar(); },
    //         practice: function () { AF.tab3.syncPractice(); },
    //         judgmentAAG: function () { AF.tab3.syncJudgmentAAG(); },
    //         judgmentAGP: function () { AF.tab3.syncJudgmentAGP(); }
    //     };
    //     document.querySelectorAll(sel).forEach(function (inp) {
    //         inp.onchange = syncMap[type];
    //     });
    // }
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
        initFileUploadButtons(container);
        refreshFileUploadRules(container);
    }

    let listRemoveInProgress = false;

    function handleRemove(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        if (listRemoveInProgress) return;

        const btn = (e && e.target && e.target.closest)
            ? e.target.closest('.remove-item')
            : (e && e.target) || null;
        if (!btn) return;

        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const type = btn.getAttribute('data-type');
        if (!type || isNaN(idx) || idx < 0) return;

        if ((type === 'edu' || type === 'add') && AF.tab2 && typeof AF.tab2.removeRow === 'function') {
            listRemoveInProgress = true;
            try {
                AF.tab2.removeRow(type, idx, btn);
            } finally {
                listRemoveInProgress = false;
            }
            return;
        }

        const lists = {
            edu: state.eduItems,
            add: state.additionalItems,
            bar: state.barItems,
            practice: state.practiceItems,
            judgmentAAG: state.judgmentAAGItems,
            judgmentAGP: state.judgmentAGPItems
        };

        if (!lists[type] || idx >= lists[type].length) {
            return;
        }

        listRemoveInProgress = true;
        try {
            lists[type].splice(idx, 1);
            reindexFilePreviewsAfterRemove(type, idx);
            renderAll();
        } finally {
            listRemoveInProgress = false;
        }
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
        if (isSubmittedHyperlinkView()) tabId = 4;
        Object.values(tabs).forEach(function (t) { if (t) t.classList.remove('active-panel'); });
        if (tabs[tabId]) tabs[tabId].classList.add('active-panel');
        if (isSubmittedHyperlinkView()) {
            applySubmittedHyperlinkView();
            tabId = 4;
        }
        tabButtons.forEach(function (btn) {
            const id = parseInt(btn.getAttribute('data-tab'), 10);
            btn.classList.toggle('active', id === tabId);
        });
        if (tabId === 2 && AF.api && typeof AF.api.onQualificationsTabActivated === 'function') {
            AF.api.onQualificationsTabActivated().catch(function (err) {
                console.warn('Qualifications tab load:', err && err.message ? err.message : err);
            });
        }
        if (tabId === 3 && AF.tab3 && typeof AF.tab3.loadExperienceData === 'function' && !state.experienceHydrated) {
            AF.tab3.loadExperienceData().then(function () {
                if (AF.files && typeof AF.files.mountAllDocPreviewButtons === 'function') {
                    AF.files.mountAllDocPreviewButtons(document.querySelector('.app-container'));
                }
            }).catch(function (err) {
                console.warn('Experience tab load:', err && err.message ? err.message : err);
            });
        }
        if (tabId === 4 && AF.tab4) {
            if (typeof AF.tab4.loadAndPopulatePreview === 'function') {
                AF.tab4.loadAndPopulatePreview();
            } else if (typeof AF.tab4.generatePreview === 'function') {
                AF.tab4.generatePreview();
            }
        }
        document.dispatchEvent(new CustomEvent('af:tabSwitch', { detail: { tab: tabId } }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function bindTabButtons() {
        tabButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (isSubmittedHyperlinkView()) {
                    switchTab(4);
                    return;
                }
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
            signature: (AF.tab4 && typeof AF.tab4.getDeclarationSignatureText === 'function')
                ? AF.tab4.getDeclarationSignatureText()
                : '',
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
        if (app.declPlace) {
            const el = document.getElementById('declPlace');
            if (el) el.value = app.declPlace;
        }
        if (AF.tab4 && typeof AF.tab4.refreshDeclarationFields === 'function') {
            AF.tab4.refreshDeclarationFields();
        }
        if (app.itAssessee) {
            const el = document.getElementById('itAssessee');
            if (el) el.value = app.itAssessee;
        }
        if (app.specificBarYears) {
            const el = document.getElementById('specificBarYears');
            if (el) el.value = app.specificBarYears;
        }
        const personalForFiles = app.personal || {};
        const serverPhotoPath = String(personalForFiles.photoPath || '').trim();
        const serverCertPath = String(personalForFiles.enrolmentCertPath || '').trim();

        if (app.filePreviews) {
            Object.keys(app.filePreviews).forEach(function (k) {
                if (k === 'photo' && !serverPhotoPath) return;
                if (k === 'enrolmentCert' && !serverCertPath) return;
                state.filePreviews[k] = app.filePreviews[k];
            });
        }
        if (!serverPhotoPath) {
            delete state.filePreviews.photo;
        } else if (state.filePreviews.photo && state.filePreviews.photo.name && !state.filePreviews.photo.isExisting) {
            AF.tab1.setPhotoFileLabel(state.filePreviews.photo.name);
        }
        if (!serverCertPath) {
            delete state.filePreviews.enrolmentCert;
        }
        renderAll();
        mountJobBanner();
        if (AF.files && typeof AF.files.mountAllDocPreviewButtons === 'function') {
            AF.files.mountAllDocPreviewButtons(document.querySelector('.app-container'));
        }
    }

    function isFormLockAllowedControl(el) {
        if (!el || !el.tagName) return false;
        if (el.classList && el.classList.contains('main-tab')) return true;
        if (el.id === 'homeApplyPostLink' || el.id === 'logoutLink') return true;
        if (el.classList && (el.classList.contains('logout-btn') || el.classList.contains('top-menu-btn'))) {
            return true;
        }
        return false;
    }

    function lockSubmittedForm() {
        global.sessionStorage.setItem('applicationSubmitted', 'true');

        const appRoot = document.querySelector('.app-container');
        if (appRoot) {
            appRoot.classList.add('application-locked');
        }

        const scope = appRoot || document;
        scope.querySelectorAll('input, select, textarea, button').forEach(function (el) {
            if (isFormLockAllowedControl(el)) return;
            el.disabled = true;
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.readOnly = true;
            }
        });

        scope.querySelectorAll(
            'a, label, .add-btn, .remove-item, .btn-upload-file, .upload-replace-trigger, ' +
            '.upload-file-remove-btn, .compact-upload-card, .upload-pick-panel, ' +
            '.upload-action-btn, .custom-file-upload, .list-item button, .edu-card button'
        ).forEach(function (el) {
            if (isFormLockAllowedControl(el)) return;
            if (el.classList && (el.classList.contains('preview-btn') || el.classList.contains('doc-view-btn'))) return;
            if (el.tagName === 'A' && (el.id === 'homeApplyPostLink' || el.id === 'logoutLink')) return;
            el.setAttribute('aria-disabled', 'true');
            el.style.pointerEvents = 'none';
            el.tabIndex = -1;
        });

        scope.querySelectorAll('.preview-btn, .doc-view-btn').forEach(function (el) {
            el.disabled = false;
            el.removeAttribute('aria-disabled');
            el.style.pointerEvents = 'auto';
            el.tabIndex = 0;
        });

        scope.querySelectorAll('.submit-wrapper, .submit-btn, #submitConfirmModal, #finalSubmitBtn').forEach(function (el) {
            if (el) el.style.display = 'none';
        });
        if (isSubmittedHyperlinkView()) {
            scope.querySelectorAll('.declaration-box').forEach(function (el) {
                if (el) el.style.display = 'none';
            });
        }

        scope.querySelectorAll('[id^="nextToTab"], [id^="prevToTab"]').forEach(function (el) {
            if (!isFormLockAllowedControl(el)) {
                el.style.display = 'none';
            }
        });

        document.body.classList.add('application-form-readonly');

        const jobBanner = document.getElementById('jobContextBanner');
        if (jobBanner && !jobBanner.querySelector('.submitted-readonly-alert')) {
            jobBanner.insertAdjacentHTML(
                'afterbegin',
                '<div class="alert alert-info submitted-readonly-alert mb-2">Application already submitted. Form is view-only.</div>'
            );
        }
    }

    /** apply-post Application ID link after successful submit: tab 4 preview only. */
    function applySubmittedHyperlinkView() {
        if (!isSubmittedHyperlinkView()) return;

        document.body.classList.add('submitted-hyperlink-preview');

        const wizardNav = document.querySelector('.main-tab-container');
        if (wizardNav) wizardNav.style.display = 'none';

        [1, 2, 3].forEach(function (n) {
            if (tabs[n]) {
                tabs[n].style.setProperty('display', 'none', 'important');
                tabs[n].classList.remove('active-panel');
            }
        });

        tabButtons.forEach(function (btn) {
            const t = parseInt(btn.getAttribute('data-tab'), 10);
            if (t !== 4) {
                btn.classList.add('hidden-tab');
                btn.style.setProperty('display', 'none', 'important');
            } else {
                btn.classList.remove('hidden-tab');
                btn.style.removeProperty('display');
                btn.classList.add('active');
            }
        });

        const declBox = document.querySelector('.declaration-box');
        const submitWrap = document.querySelector('.submit-wrapper');
        const prev4 = document.getElementById('prevToTab3');
        const submitMsg = document.getElementById('submitMessage');
        const submitModal = document.getElementById('submitConfirmModal');
        if (declBox) declBox.style.setProperty('display', 'none', 'important');
        if (submitWrap) submitWrap.style.setProperty('display', 'none', 'important');
        if (prev4) prev4.style.setProperty('display', 'none', 'important');
        if (submitMsg) submitMsg.style.setProperty('display', 'none', 'important');
        if (submitModal) submitModal.style.setProperty('display', 'none', 'important');

        if (tabs[4]) {
            tabs[4].style.setProperty('display', 'block', 'important');
            tabs[4].classList.add('active-panel', 'readonly-mode');
        }
    }

    function applyPrefilledHyperlinkView() {
        applySubmittedHyperlinkView();
    }

    function applyFormMode() {
        const wizardNav = document.querySelector('.main-tab-container');
        const btnNext1 = document.getElementById('nextToTab2');
        const declBox = document.querySelector('.declaration-box');
        const finalBtn = document.getElementById('finalSubmitBtn');
        const prev4 = document.getElementById('prevToTab3');

        if (isSubmittedHyperlinkView()) {
            applySubmittedHyperlinkView();
            if (tabs[4] && AF.tab4 && typeof AF.tab4.loadAndPopulatePreview === 'function') {
                AF.tab4.loadAndPopulatePreview();
            } else if (tabs[4] && AF.tab4 && typeof AF.tab4.generatePreview === 'function') {
                AF.tab4.generatePreview();
            }
            return;
        }

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
            readOnlyView: readOnlyView,
            previewView: previewView,
            submittedHyperlinkView: isSubmittedHyperlinkView(),
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
            isValidPincode: function (val) {
                const pin = String(val || '').replace(/\D/g, '').slice(0, 6);
                return /^[1-9][0-9]{5}$/.test(pin);
            },
            normalizePincode: function (val) {
                return String(val || '').replace(/\D/g, '').slice(0, 6);
            },
            pv: function (val) { return escapeHtml(val || '—'); },
            previewFieldRow: function (label, value) {
                return '<tr><th>' + escapeHtml(label) + '</th><td>' + escapeHtml(value || '—') + '</td></tr>';
            },
            previewTable: function (rows) {
                return '<table class="table table-sm preview-table mb-0"><tbody>' + rows + '</tbody></table>';
            }
        },
        files: {
            FILE_UPLOAD_MAX_BYTES: FILE_UPLOAD_MAX_BYTES,
            FILE_UPLOAD_MAX_MB: FILE_UPLOAD_MAX_MB,
            PHOTO_UPLOAD_ACCEPT: PHOTO_UPLOAD_ACCEPT,
            CERT_UPLOAD_ACCEPT: CERT_UPLOAD_ACCEPT,
            validateUploadFile: validateUploadFile,
            validateUploadFiles: validateUploadFiles,
            resolveUploadKind: resolveUploadKind,
            getUploadHint: getUploadHint,
            getUploadHintHtml: getUploadHintHtml,
            showUploadValidationError: showUploadValidationError,
            setUploadFieldError: setUploadFieldError,
            clearUploadFieldError: clearUploadFieldError,
            validateFileInputUi: validateFileInputUi,
            applyFileInputRules: applyFileInputRules,
            refreshFileUploadRules: refreshFileUploadRules,
            initAllFileUploadValidation: initAllFileUploadValidation,
            buildFileUploadSelectedPanelHtml: buildFileUploadSelectedPanelHtml,
            ensureUploadHostForInput: ensureUploadHostForInput,
            showFileUploadSelected: showFileUploadSelected,
            clearFileUpload: clearFileUpload,
            enhanceFileUploadHosts: enhanceFileUploadHosts,
            initUploadReplacementUi: initUploadReplacementUi,
            buildFileUploadHtml: buildFileUploadHtml,
            buildCompactUploadHtml: buildCompactUploadHtml,
            initFileUploadButtons: initFileUploadButtons,
            storeFilePreview: storeFilePreview,
            storeFilesPreview: storeFilesPreview,
            collectLiveFilePreviews: collectLiveFilePreviews,
            mountAllDocPreviewButtons: mountAllDocPreviewButtons,
            buildViewDocButtonHtml: buildViewDocButtonHtml,
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
            handleRemove: handleRemove,
            reindexFilePreviewsAfterRemove: reindexFilePreviewsAfterRemove,
            initListDelegations: initListDelegations
        },
        nav: {
            switchTab: switchTab,
            bindTabButtons: bindTabButtons,
            lockSubmittedForm: lockSubmittedForm,
            applySubmittedHyperlinkView: applySubmittedHyperlinkView,
            applyPrefilledHyperlinkView: applyPrefilledHyperlinkView,
            applyFormMode: applyFormMode,
            isSubmittedHyperlinkView: isSubmittedHyperlinkView
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

    if (isSubmittedHyperlinkView()) {
        applySubmittedHyperlinkView();
    }

    return AF;
})();
