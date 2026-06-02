/**
 * Tab 4: Preview & Submit
 * Integrated with POST /api/application/preview
 */
(function (AF, global) {
    'use strict';

    const utils = AF.utils;
    const config = AF.config;
    const state = AF.state;

    // ─────────────────────────────────────────────────────────────
    // INTERNAL HELPERS
    // ─────────────────────────────────────────────────────────────

    /** Resolve applicant id from config → sessionStorage */
    function getApplicantId() {
        if (config && config.userId) return String(config.userId).trim();
        return String(global.sessionStorage.getItem('applicantId') || '').trim();
    }

    /** Build the preview request body (mirrors pattern in application-form-api.js) */
    function buildPreviewPayload() {
        const applicantId = parseInt(getApplicantId(), 10) || 0;
        const payload = { applicant_id: applicantId };

        // FIX 2: controller reads $data['applicationId'] (camelCase)
        const storedAppId = parseInt(global.sessionStorage.getItem('applicationId'), 10);
        if (!isNaN(storedAppId) && storedAppId > 0) {
            payload.applicationId = storedAppId;
        }

        return payload;
    }

    /** Unwrap the normalised LawPortal response */
    function unwrapApiResult(res) {
        if (!res) return { ok: false, error: 'Empty response from server.' };
        if (res.ok === false || res.error) {
            return { ok: false, error: res.error || res.message || 'Request failed.' };
        }
        return res;
    }

    /** Build full URL for a server-side file path */
    function docUrl(filePath) {
        if (!filePath) return '';
        const p = String(filePath).replace(/\\/g, '/');
        if (/^https?:\/\//i.test(p)) return p;
        let base = '';
        if (global.LawPortal && global.LawPortal.secureApiBase) {
            base = String(global.LawPortal.secureApiBase).replace(/\/?$/, '/');
        } else if (global.LawPortal && global.LawPortal.apiBase) {
            base = String(global.LawPortal.apiBase).replace(/\/api\/?$/, '/').replace(/\/?$/, '/');
        } else {
            const marker = '/law_application';
            const pathname = global.location.pathname.replace(/\\/g, '/');
            const idx = pathname.toLowerCase().indexOf(marker);
            base = idx !== -1
                ? global.location.origin + pathname.substring(0, idx + marker.length) + '/backend/public/'
                : new URL('backend/public/', global.location.href).href.replace(/\/?$/, '/');
        }
        return base + p.replace(/^\//, '');
    }

    function basenameFromPath(path) {
        if (!path) return '';
        const parts = String(path).replace(/\\/g, '/').split('/');
        return parts[parts.length - 1] || '';
    }

    function trimStr(val) {
        return val != null ? String(val).trim() : '';
    }

    function toInputDate(val) {
        if (!val) return '';
        const s = String(val).trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
        const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (m) return m[3] + '-' + m[2] + '-' + m[1];
        return s;
    }

    function pad2(n) {
        return String(n).padStart(2, '0');
    }

    /** Display format for declaration date/time (local). */
    function formatDeclarationDateTime(date) {
        const d = date instanceof Date ? date : new Date();
        if (isNaN(d.getTime())) return '';
        return pad2(d.getDate()) + '-' + pad2(d.getMonth() + 1) + '-' + d.getFullYear()
            + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    }

    function getDeclarationApplicantInfo() {
        let personal = {};
        if (AF.tab1 && typeof AF.tab1.getPersonalFromForm === 'function') {
            personal = AF.tab1.getPersonalFromForm() || {};
        }
        return {
            name: String(personal.advocateName || global.sessionStorage.getItem('advocateName') || '').trim(),
            mobile: String(personal.mobile || global.sessionStorage.getItem('mobile') || '').trim(),
            enrolmentNo: String(personal.enrolmentNo || global.sessionStorage.getItem('enrolmentNo') || '').trim()
        };
    }

    function renderDeclarationApplicantInfo() {
        const mount = document.getElementById('declApplicantInfo');
        if (!mount) return;
        const info = getDeclarationApplicantInfo();
        const esc = utils.escapeHtml;
        mount.innerHTML =
            '<span class="decl-info-line"><strong>Name:</strong> ' + esc(info.name || '—') + '</span>' +
            '<span class="decl-info-line"><strong>Mobile:</strong> ' + esc(info.mobile || '—') + '</span>' +
            '<span class="decl-info-line"><strong>Bar Council No.:</strong> ' + esc(info.enrolmentNo || '—') + '</span>';
    }

    function refreshDeclarationDateTime() {
        const formatted = formatDeclarationDateTime(new Date());
        const declDateEl = document.getElementById('declDate');
        const declDateDisplay = document.getElementById('declDateDisplay');
        if (declDateEl) {
            declDateEl.value = formatted;
        }
        if (declDateDisplay) {
            declDateDisplay.textContent = formatted || '—';
        }
    }

    function showDeclarationToast(message) {
        const text = message != null ? String(message).trim() : '';
        if (!text) {
            return;
        }
        if (AF.utils && typeof AF.utils.showToast === 'function') {
            AF.utils.showToast(text, 'error');
        } else if (global.LawPortal && typeof global.LawPortal.alert === 'function') {
            global.LawPortal.alert({ icon: 'error', title: 'Declaration', text: text });
        } else {
            alert(text);
        }
    }

    function refreshDeclarationFields() {
        refreshDeclarationDateTime();
        renderDeclarationApplicantInfo();
    }

    function getDeclarationSignatureText() {
        const info = getDeclarationApplicantInfo();
        return [info.name, info.mobile, info.enrolmentNo].filter(Boolean).join(' | ');
    }

    const APPLY_POST_URL = 'apply-post.html';
    const SUCCESS_REDIRECT_MS = 3000;

    function isApplicationAlreadySubmittedError(msg) {
        const s = String(msg || '').toLowerCase();
        return s.indexOf('already submitted') !== -1;
    }

    function handleAlreadySubmittedRedirect() {
        global.sessionStorage.setItem('applicationSubmitted', 'true');
        clearSubmitMessage();
        if (window.$) {
            $('#submitConfirmModal').modal('hide');
        }
        global.location.href = APPLY_POST_URL;
    }

    function clearSubmitMessage() {
        const submitMsg = document.getElementById('submitMessage');
        if (!submitMsg) return;
        submitMsg.innerHTML = '';
        submitMsg.hidden = true;
    }

    function showSubmitMessage(html) {
        const submitMsg = document.getElementById('submitMessage');
        if (!submitMsg) return;
        submitMsg.hidden = false;
        submitMsg.innerHTML = html;
    }

    function getDeclarationValidationError() {
        const declCheck = document.getElementById('declarationCheck');
        const declCheck2 = document.getElementById('declarationCheck2');
        const declPlaceEl = document.getElementById('declPlace');
        if (declCheck && !declCheck.checked) {
            return 'Please accept declaration (a).';
        }
        if (declCheck2 && !declCheck2.checked) {
            return 'Please confirm that you have read the 2017 Rules and fulfill the qualification (b).';
        }
        if (declPlaceEl && !declPlaceEl.value.trim()) {
            return 'Please enter Place in the declaration.';
        }
        return '';
    }

    function isDeclarationComplete() {
        return !getDeclarationValidationError();
    }

    function updateDeclarationValidationMessage() {
        if (isDeclarationComplete()) {
            clearSubmitMessage();
        }
    }

    function initDeclarationMessageHandlers() {
        const declCheck = document.getElementById('declarationCheck');
        const declCheck2 = document.getElementById('declarationCheck2');
        const declPlaceEl = document.getElementById('declPlace');

        [declCheck, declCheck2].forEach(function (el) {
            if (!el) return;
            el.addEventListener('change', updateDeclarationValidationMessage);
        });
        if (declPlaceEl) {
            declPlaceEl.addEventListener('input', updateDeclarationValidationMessage);
        }
    }

    function showSubmitSuccessAndRedirect() {
        const progressBar = document.querySelector('#successSubmitModal .success-progress-bar');

        function redirectToApplyPost() {
            global.location.href = APPLY_POST_URL;
        }

        if (!window.$) {
            redirectToApplyPost();
            return;
        }

        const $successModal = $('#successSubmitModal');
        $successModal.off('shown.bs.modal.submitRedirect');
        $successModal.on('shown.bs.modal.submitRedirect', function () {
            $successModal.off('shown.bs.modal.submitRedirect');
            if (progressBar) {
                progressBar.style.animation = 'none';
                progressBar.offsetHeight;
                progressBar.style.animation = '';
            }
            setTimeout(redirectToApplyPost, SUCCESS_REDIRECT_MS);
        });

        $('#submitConfirmModal').modal('hide');
        setTimeout(function () {
            $successModal.modal('show');
        }, 400);
    }

    function normalizePreviewResponse(res) {
        let body = res;
        if (global.SecureAPI && typeof global.SecureAPI.unwrapResponse === 'function') {
            body = global.SecureAPI.unwrapResponse(res) || res;
        } else if (res && res.data !== undefined && !res.personal_info) {
            body = res.data;
        }
        if (!body || typeof body !== 'object') {
            throw new Error('Invalid preview response.');
        }
        if (body.error) {
            throw new Error(body.error);
        }
        if (body.personal_info || body.documents || body.education || body.experience) {
            return body;
        }
        if (body.ok === false) {
            throw new Error(body.error || body.message || 'Preview request failed.');
        }
        return body;
    }

    function latestDocument(docs, type) {
        return (docs || []).filter(function (d) {
            return d.document_type === type && !d.is_deleted;
        }).pop() || null;
    }

    function docPreviewFromPath(path, fileName) {
        if (!path) return null;
        const name = fileName || basenameFromPath(path);
        const url = docUrl(path);
        return {
            name: name,
            url: url,
            isExisting: true,
            isImage: /\.(jpe?g|png|gif|webp)$/i.test(name),
            isPdf: /\.pdf$/i.test(name)
        };
    }

    function isUploadCleared(key) {
        return !!(AF.files && typeof AF.files.isUploadCleared === 'function' && AF.files.isUploadCleared(key));
    }

    /** Prefer live Tab 1 state over API when user removed or replaced a file locally. */
    function resolveEffectivePhotoSource(p, docs) {
        if (isUploadCleared('photo')) {
            return null;
        }
        const preview = state.filePreviews && state.filePreviews.photo;
        if (preview) {
            const src = preview.dataUrl
                || preview.url
                || (AF.files && typeof AF.files.getPreviewMediaUrl === 'function'
                    ? AF.files.getPreviewMediaUrl(preview)
                    : '');
            if (src) {
                return { src: src, name: preview.name || 'Photo' };
            }
        }
        if (AF.files && typeof AF.files.getApplicantUploadMeta === 'function') {
            const meta = AF.files.getApplicantUploadMeta('photo');
            if (meta.path) {
                return {
                    src: docUrl(meta.path),
                    name: meta.fileName || basenameFromPath(meta.path)
                };
            }
        }
        const filteredDocs = AF.files && typeof AF.files.filterDocumentsRespectingClears === 'function'
            ? AF.files.filterDocumentsRespectingClears(docs)
            : docs;
        const photoDoc = latestDocument(filteredDocs, 'PHOTO')
            || (p && p.photo_path && !isUploadCleared('photo')
                ? { file_path: p.photo_path, file_name: basenameFromPath(p.photo_path) }
                : null);
        if (photoDoc && photoDoc.file_path) {
            return { src: docUrl(photoDoc.file_path), name: photoDoc.file_name || basenameFromPath(photoDoc.file_path) };
        }
        return null;
    }

    function setPdfExportLayout(active) {
        const el = document.getElementById('pdfContent');
        if (el) {
            el.classList.toggle('pdf-export-layout', !!active);
        }
    }

    function renderPreviewPhotoBox(photoSource) {
        const photoBox = document.getElementById('pdfApplicantPhotoBox');
        if (!photoBox) {
            return;
        }
        if (!photoSource || !photoSource.src) {
            photoBox.innerHTML = '';
            return;
        }
        const safeSrc = String(photoSource.src).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        photoBox.innerHTML = '<img src="' + safeSrc + '" alt="Applicant Photo">';
    }

    function isSameOriginUrl(url) {
        try {
            const parsed = new URL(url, global.location.href);
            return parsed.origin === global.location.origin;
        } catch (e) {
            return false;
        }
    }

    function canvasFromImageElement(img) {
        if (!img || !img.naturalWidth || !img.naturalHeight) {
            return '';
        }
        try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            return canvas.toDataURL('image/jpeg', 0.92);
        } catch (e) {
            console.warn('[Tab4] canvasFromImageElement:', e);
            return '';
        }
    }

    function captureVisiblePhotoDataUrl() {
        const img = document.querySelector('#pdfApplicantPhotoBox img');
        return canvasFromImageElement(img);
    }

    function waitForImageElement(img) {
        return new Promise(function (resolve) {
            if (!img) {
                resolve(false);
                return;
            }
            if (img.complete && img.naturalWidth > 0) {
                resolve(true);
                return;
            }
            img.onload = function () { resolve(img.naturalWidth > 0); };
            img.onerror = function () { resolve(false); };
        });
    }

    function loadImageViaCanvas(url, useCrossOrigin) {
        return new Promise(function (resolve) {
            const img = new Image();
            if (useCrossOrigin) {
                img.crossOrigin = 'anonymous';
            }
            img.onload = function () {
                resolve(canvasFromImageElement(img));
            };
            img.onerror = function () {
                resolve('');
            };
            const bust = (url.indexOf('?') >= 0 ? '&' : '?') + '_pdf=' + Date.now();
            img.src = url + bust;
        });
    }

    function fetchUrlAsDataUrl(url) {
        return fetch(url, { credentials: 'include' })
            .then(function (res) {
                if (!res.ok) {
                    throw new Error('Fetch failed');
                }
                return res.blob();
            })
            .then(function (blob) {
                return new Promise(function (resolve, reject) {
                    const reader = new FileReader();
                    reader.onload = function () { resolve(reader.result); };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            })
            .catch(function () {
                return '';
            });
    }

    function imageUrlToDataUrl(url) {
        if (!url) {
            return Promise.resolve('');
        }
        if (String(url).indexOf('data:') === 0) {
            return Promise.resolve(url);
        }

        const sameOrigin = isSameOriginUrl(url);
        const fromDom = captureVisiblePhotoDataUrl();
        if (fromDom) {
            return Promise.resolve(fromDom);
        }

        return loadImageViaCanvas(url, !sameOrigin).then(function (dataUrl) {
            if (dataUrl) {
                return dataUrl;
            }
            return fetchUrlAsDataUrl(url);
        });
    }

    async function resolvePhotoDataUrlForPdf(photoSource) {
        if (!photoSource || !photoSource.src) {
            return '';
        }
        let src = String(photoSource.src);
        if (src.indexOf('data:') === 0) {
            return src;
        }

        const preview = state.filePreviews && state.filePreviews.photo;
        if (preview && preview.dataUrl) {
            return preview.dataUrl;
        }

        const visible = captureVisiblePhotoDataUrl();
        if (visible) {
            return visible;
        }

        return imageUrlToDataUrl(src);
    }

    async function embedPhotoForPdf(photoSource) {
        const dataUrl = await resolvePhotoDataUrlForPdf(photoSource);
        if (!dataUrl) {
            renderPreviewPhotoBox(photoSource);
            return '';
        }
        renderPreviewPhotoBox({ src: dataUrl, name: photoSource && photoSource.name });
        const img = document.querySelector('#pdfApplicantPhotoBox img');
        await waitForImageElement(img);
        return dataUrl;
    }

    async function ensurePdfImagesReady(root) {
        if (!root) {
            return;
        }
        const imgs = root.querySelectorAll('img');
        const tasks = [];
        imgs.forEach(function (img) {
            const src = img.getAttribute('src');
            if (!src || src.indexOf('data:') === 0) {
                if (src) {
                    tasks.push(waitForImageElement(img));
                }
                return;
            }
            tasks.push(
                imageUrlToDataUrl(src).then(function (dataUrl) {
                    if (!dataUrl) {
                        return waitForImageElement(img);
                    }
                    img.removeAttribute('crossorigin');
                    img.src = dataUrl;
                    return waitForImageElement(img);
                })
            );
        });
        await Promise.all(tasks);
    }

    /** Format ISO/DD-MM-YYYY date to locale string */
    function fmtDate(val) {
        if (!val) return '—';
        if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
            const d = new Date(val);
            if (!isNaN(d)) return d.toLocaleDateString('en-IN');
        }
        return val;
    }

    /** Render a View-Document button (opens file preview modal) */
    function viewDocBtn(filePath, label) {
        label = label || 'View Document';
        if (!filePath) return '<span class="text-muted small">No document</span>';
        const url = docUrl(filePath);
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filePath);
        const handler = isImage
            ? `openImagePreview('${url}')`
            : `openPdfPreview('${url}')`;
        return `<button class="preview-btn" onclick="${handler}">
                    <i class="bi bi-eye-fill"></i> ${label}
                </button>`;
    }

    // ─────────────────────────────────────────────────────────────
    // API CALL  –  POST /api/application/preview
    // ─────────────────────────────────────────────────────────────

    async function fetchPreviewData() {
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.reject(new Error('LawPortal API client is not loaded.'));
        }

        if (AF.api && typeof AF.api.ensureValidSessionForForm === 'function') {
            const tokenOk = await AF.api.ensureValidSessionForForm();
            if (!tokenOk) {
                return Promise.reject(new Error('Session refresh failed. Showing locally filled data.'));
            }
        }

        const res = await global.LawPortal.apiRequest('application/preview', 'POST', buildPreviewPayload());
        console.log('Preview API response:', res);
        const body = normalizePreviewResponse(res);

        // Cache the applicationId if the server echoes it back
        if (body.application_id) {
            global.sessionStorage.setItem('applicationId', String(body.application_id));
        }

        return body;
    }

    // ─────────────────────────────────────────────────────────────
    // SECTION POPULATORS
    // ─────────────────────────────────────────────────────────────

    function setTextareaValue(el, value) {
        if (!el || el.tagName !== 'TEXTAREA') {
            return;
        }
        el.value = value != null ? String(value).trim() : '';
    }

    function normalizeTab4TextareaValues() {
        const root = document.getElementById('pdfContent');
        if (!root) {
            return;
        }
        root.querySelectorAll('textarea').forEach(function (ta) {
            if (ta.value) {
                ta.value = ta.value.trim();
            }
        });
    }

    function setInputEl(selector, value) {
        const el = document.querySelector(selector);
        if (!el) {
            return;
        }
        if (el.tagName === 'TEXTAREA') {
            setTextareaValue(el, value);
        } else {
            el.value = value != null ? value : '';
        }
    }

    function setSelectEl(elOrSelector, value) {
        const el = elOrSelector instanceof Element
            ? elOrSelector
            : document.querySelector(elOrSelector);
        if (!el || value == null) return;
        const str = String(value);
        let opt = Array.from(el.options).find(o => o.value === str || o.text === str);
        if (!opt) { opt = new Option(str, str); el.appendChild(opt); }
        el.value = str;
    }

    function govtLabelNumber(labelText) {
        const m = String(labelText || '').trim().match(/^(\d+(?:\([a-z]\))?)\./i);
        return m ? m[1] : '';
    }

    function setGovtInputByLabel(labelPrefix, value) {
        const prefix = String(labelPrefix).replace(/\.$/, '');
        document.querySelectorAll('#pdfContent .form-section .govt-row').forEach(function (row) {
            const label = row.querySelector('.govt-label');
            if (!label) {
                return;
            }
            if (govtLabelNumber(label.textContent) !== prefix) {
                return;
            }
            const inp = row.querySelector('input, textarea, select');
            if (!inp) {
                return;
            }
            if (inp.tagName === 'TEXTAREA') {
                setTextareaValue(inp, value);
            } else {
                inp.value = value != null ? value : '';
            }
        });
    }

    function setGovtSelectByLabel(labelPrefix, value) {
        const prefix = String(labelPrefix);
        document.querySelectorAll('.form-section .govt-row').forEach(row => {
            const label = row.querySelector('.govt-label');
            if (label && label.textContent.trim().startsWith(prefix + '.')) {
                const sel = row.querySelector('select');
                if (sel) setSelectEl(sel, value);
            }
        });
    }

    function setGovtTextareaByLabel(labelPrefix, value) {
        const prefix = String(labelPrefix);
        document.querySelectorAll('#pdfContent .form-section .govt-row, #pdfContent .govt-row').forEach(function (row) {
            const label = row.querySelector('.govt-label');
            if (label && label.textContent.trim().startsWith(prefix)) {
                const ta = row.querySelector('textarea');
                if (ta) {
                    setTextareaValue(ta, value);
                }
            }
        });
    }

    function setPdfSectionInput(sectionPrefix, value) {
        const titles = document.querySelectorAll('#pdfContent .section-title');
        for (let i = 0; i < titles.length; i++) {
            const t = titles[i];
            if (!t.textContent.trim().startsWith(sectionPrefix)) continue;
            let el = t.nextElementSibling;
            while (el && el.classList && el.classList.contains('section-title')) {
                el = el.nextElementSibling;
            }
            if (el && el.tagName === 'TEXTAREA') {
                setTextareaValue(el, value);
            } else if (el && el.tagName === 'INPUT') {
                el.value = value != null ? value : '';
            }
            break;
        }
    }

    function isSubmittedHyperlinkPreview() {
        if (config.submittedHyperlinkView) {
            return true;
        }
        return !!(AF.nav && typeof AF.nav.isSubmittedHyperlinkView === 'function' && AF.nav.isSubmittedHyperlinkView());
    }

    function getSubmittedPreviewJobIds() {
        if (!isSubmittedHyperlinkPreview()) {
            return null;
        }
        const raw = String(config.jobId || global.sessionStorage.getItem('selectedJobId') || '').trim();
        if (!raw) {
            return null;
        }
        return raw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    }

    function vacanciesForPostsAppliedLabel() {
        let vacancies = (config.selectedVacancies && config.selectedVacancies.length)
            ? config.selectedVacancies.slice()
            : (global.JobSelection ? JobSelection.enrichSelections(JobSelection.readStoredVacancies()) : []);
        const focusIds = getSubmittedPreviewJobIds();
        if (focusIds && focusIds.length && global.JobSelection && typeof JobSelection.filterSelectionsByJobIds === 'function') {
            vacancies = JobSelection.filterSelectionsByJobIds(vacancies, focusIds);
        }
        return vacancies;
    }

    /** Post line for field 1, e.g. "Government Advocate (Civil Side) : 1A, 5B" */
    function getPostsAppliedForLabel() {
        const vacancies = vacanciesForPostsAppliedLabel();

        if (global.JobSelection && vacancies.length) {
            const lines = JobSelection.formatBannerLines(vacancies);
            if (lines.length) {
                return lines.join('; ');
            }
        }

        const postName = String(config.postName || '').trim();
        const jobIdRaw = isSubmittedHyperlinkPreview()
            ? (getSubmittedPreviewJobIds() || []).join(',')
            : String(config.jobId || '').trim();
        if (postName && jobIdRaw) {
            const ids = jobIdRaw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
            return postName + ' : ' + ids.join(', ');
        }
        if (jobIdRaw && global.JobSelection && typeof JobSelection.enrichSelection === 'function') {
            const fallback = JobSelection.filterSelectionsByJobIds([], jobIdRaw.split(',')[0]);
            if (fallback.length && typeof JobSelection.formatBannerLines === 'function') {
                const lines = JobSelection.formatBannerLines(fallback);
                if (lines.length) {
                    return lines.join('; ');
                }
            }
        }
        return postName || jobIdRaw || '';
    }

    function updatePostAppliedField() {
        const el = document.querySelector(
            '#pdfContent .form-section .govt-row-posts-applied .govt-value textarea,'
            + '#pdfContent .form-section .govt-row:nth-child(1) .govt-value textarea,'
            + '#pdfContent .form-section .govt-row:nth-child(1) .govt-value input'
        );
        if (!el) {
            return;
        }
        const text = getPostsAppliedForLabel();
        if (el.tagName === 'TEXTAREA') {
            setTextareaValue(el, text);
            el.style.height = 'auto';
            el.style.height = Math.max(34, el.scrollHeight) + 'px';
        } else {
            el.value = text != null ? text : '';
        }
    }

    function populatePersonalSection(p, docs, experience) {
        if (!p) return;
        p = p || {};
        docs = docs || [];
        experience = experience || {};

        embedPhotoForPdf(resolveEffectivePhotoSource(p, docs));

        updatePostAppliedField();
        setInputEl('#pdfContent .form-section .govt-row:nth-child(2) .govt-value input', p.applicant_name);
        setInputEl('#pdfContent .form-section .govt-row:nth-child(3) .govt-value input', p.bar_council_enrollement_number);
        setInputEl('#pdfContent .form-section .govt-row:nth-child(4) .govt-value input', p.bar_council_enrollement_number_senior);

        document.querySelectorAll('#pdfContent .form-section .govt-row').forEach(function (row) {
            const label = row.querySelector('.govt-label');
            if (!label) return;
            const text = label.textContent.trim();
            if (text.indexOf('3(b)') !== -1) {
                const dateInp = row.querySelector('input[type="date"], input.govt-input');
                if (dateInp) {
                    dateInp.value = toInputDate(p.date_of_enrollment);
                }
            }
        });

        setGovtInputByLabel('4', p.court_pratice || p.court_practice || p.present_court_of_practice || p.years_of_practice_hcm || '');
        setGovtTextareaByLabel('5.', AF.data && typeof AF.data.getCourtBench === 'function' ? AF.data.getCourtBench() : '');

        const lawOfficer = experience.govt_law_officer_experience === true || experience.govt_law_officer_experience === 'true' || experience.govt_law_officer_experience === 1;
        setGovtTextareaByLabel('6.', lawOfficer ? 'Yes' : 'No');
        setGovtTextareaByLabel('a)', experience.provide_details_if_yes || '');

        setGovtInputByLabel('7', p.father_name);
        setGovtSelectByLabel('8', p.gender);
        setGovtSelectByLabel('9', p.marital_status);

        document.querySelectorAll('#pdfContent .form-section .govt-row').forEach(function (row) {
            const label = row.querySelector('.govt-label');
            if (!label) return;
            const text = label.textContent.trim();
            if (text.indexOf('10(a)') !== -1) {
                const inp = row.querySelector('input[type="date"], input');
                if (inp) inp.value = toInputDate(p.dob);
            }
            if (/10\(b\)/i.test(text) && p.dob) {
                const parts = String(p.dob).split('-');
                const dobDate = parts.length === 3
                    ? (parts[0].length === 4 ? new Date(p.dob) : new Date(parts[2] + '-' + parts[1] + '-' + parts[0]))
                    : null;
                if (dobDate && !isNaN(dobDate)) {
                    const age = Math.floor((Date.now() - dobDate) / (365.25 * 24 * 3600 * 1000));
                    const inp = row.querySelector('input');
                    if (inp) inp.value = age;
                }
            }
        });

        setGovtInputByLabel('11', p.nationality);
        setGovtInputByLabel('12', p.religion);

        document.querySelectorAll('#pdfContent .form-section .govt-row').forEach(function (row) {
            const label = row.querySelector('.govt-label');
            if (label && label.textContent.trim().startsWith('13.')) {
                const sels = row.querySelectorAll('select');
                if (sels[0]) setSelectEl(sels[0], p.community);
                if (sels[1]) setSelectEl(sels[1], p.sub_caste);
            }
        });

        setGovtInputByLabel('14', p.mobile_no);
        setGovtInputByLabel('15', p.phone_number);
        setGovtInputByLabel('16', p.email_id);
        setGovtInputByLabel('17', p.pan_number);

        populatePdfAddressSections(p);
    }

    function populatePdfAddressSections(p) {
        if (!p) return;
        const officeLines = [p.office_address, p.office_district, p.office_pincode].filter(Boolean).join('\n');
        const permLines = [p.permanent_address, p.permanent_district, p.permanent_pincode].filter(Boolean).join('\n');
        setPdfSectionInput('28.', officeLines);
        setPdfSectionInput('29.', permLines);
        populateAddressCard('Office Address', p.office_district, p.office_pincode, p.office_address);
        populateAddressCard('Permanent Address', p.permanent_district, p.permanent_pincode, p.permanent_address);
    }

    function populateAddressCard(headerText, district, pincode, address) {
        document.querySelectorAll('.card-header').forEach(function (h) {
            if (h.textContent.trim() !== headerText) return;
            const body = h.closest('.card') && h.closest('.card').querySelector('.card-body');
            if (!body) return;
            const distSel = body.querySelector('select');
            if (distSel && district) setSelectEl(distSel, district);
            const pincodeInp = body.querySelector('input[id*="pincode"], input[placeholder*="Pincode"]');
            if (pincodeInp) pincodeInp.value = pincode || '';
            const addrTa = body.querySelector('textarea');
            if (addrTa) {
                setTextareaValue(addrTa, address || '');
            }
        });
    }

    function eduExamName(e) {
        return e.qualification_name || e.examination || e.exam || '-';
    }

    function eduBoardName(e) {
        return e.university_name || e.university || e.board || '-';
    }

    function eduSubjectName(e) {
        return e.specialization || e.subject || e.main_subject || '-';
    }

    function populateEducationTable(list) {
        const tbody = document.querySelector('#pdfContent .table-govt tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        const rows = (list || []).filter(function (e) { return !e.is_deleted; });
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No education records found.</td></tr>';
            return;
        }
        rows.forEach(function (e, i) {
            const docPath = e.certificate_path || e.document_path || '';
            tbody.insertAdjacentHTML('beforeend',
                '<tr><td>' + (i + 1) + '</td>' +
                '<td>' + utils.escapeHtml(eduExamName(e)) + '</td>' +
                '<td>' + utils.escapeHtml(String(e.year_of_passing != null ? e.year_of_passing : (e.year || '-'))) + '</td>' +
                '<td>' + utils.escapeHtml(eduBoardName(e)) + '</td>' +
                '<td>' + utils.escapeHtml(e.institution || '-') + '</td>' +
                '<td>' + utils.escapeHtml(eduSubjectName(e)) + '</td>' +
                '<td>' + utils.escapeHtml(String(e.marks_percentage != null ? e.marks_percentage : (e.percentage || '-'))) + '</td>' +
                '<td>' + viewDocBtn(docPath) + '</td></tr>');
        });
    }

    function populateAdditionalQualTable(list) {
        const tables = document.querySelectorAll('#pdfContent .table-govt');
        const tbody = tables[1] && tables[1].querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        const rows = (list || []).filter(function (a) { return !a.is_deleted; });
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No additional qualifications.</td></tr>';
            return;
        }
        rows.forEach(function (a, i) {
            const docPath = a.certificate_path || a.document_path || '';
            tbody.insertAdjacentHTML('beforeend',
                '<tr><td>' + (i + 1) + '</td>' +
                '<td>' + utils.escapeHtml(a.qualification_name || a.examination || a.exam || '-') + '</td>' +
                '<td>' + utils.escapeHtml(String(a.year_of_passing != null ? a.year_of_passing : (a.year || '-'))) + '</td>' +
                '<td>' + utils.escapeHtml(a.board_university || a.university || a.board || '-') + '</td>' +
                '<td>' + utils.escapeHtml(a.institution_name || a.institution || '-') + '</td>' +
                '<td>' + utils.escapeHtml(a.subject_name || a.subject || a.main_subject || '-') + '</td>' +
                '<td>' + utils.escapeHtml(String(a.marks_percentage != null ? a.marks_percentage : (a.percentage || '-'))) + '</td>' +
                '<td>' + viewDocBtn(docPath) + '</td></tr>');
        });
    }

    function populateLawDegreeSection(experience) {
        if (!experience) return;
        const titles = document.querySelectorAll('#pdfContent .section-title');
        for (let i = 0; i < titles.length; i++) {
            if (!titles[i].textContent.trim().startsWith('21.')) continue;
            let el = titles[i].nextElementSibling;
            if (el && el.tagName === 'SELECT') {
                const val = (experience.law_degree_recognized === true || experience.law_degree_recognized === 'true' || experience.law_degree_recognized === 1) ? 'Yes' : 'No';
                setSelectEl(el, val);
            }
            break;
        }
        const tab3Sel = document.getElementById('lawDegreeRecognized') || document.getElementById('lawDegreeRecognized1');
        if (tab3Sel) {
            const val = (experience.law_degree_recognized === true || experience.law_degree_recognized === 'true' || experience.law_degree_recognized === 1) ? 'Yes' : 'No';
            setSelectEl(tab3Sel, val);
        }
    }

    function populateBarPracticeTable(list) {
        const tables = document.querySelectorAll('#pdfContent .table-govt');
        const tbody = tables[2] && tables[2].querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        const rows = (list || []).filter(function (b) { return !b.is_deleted; });
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No bar experience records.</td></tr>';
            return;
        }
        rows.forEach(function (b, i) {
            tbody.insertAdjacentHTML('beforeend',
                '<tr><td>' + (i + 1) + '</td>' +
                '<td>' + utils.escapeHtml(String(b.years_experience != null ? b.years_experience : '-')) + '</td>' +
                '<td>' + utils.escapeHtml(fmtDate(b.from_date)) + '</td>' +
                '<td>' + utils.escapeHtml(fmtDate(b.to_date)) + '</td>' +
                '<td>' + utils.escapeHtml(b.bar_council_name || '-') + '</td>' +
                '<td>' + viewDocBtn(b.supporting_document || '') + '</td></tr>');
        });
    }

    function populateCourtPracticeTable(list) {
        const tables = document.querySelectorAll('#pdfContent .table-govt');
        const tbody = tables[3] && tables[3].querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        const rows = (list || []).filter(function (c) { return !c.is_deleted; });
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No court practice records.</td></tr>';
            return;
        }
        rows.forEach(function (c, i) {
            tbody.insertAdjacentHTML('beforeend',
                '<tr><td>' + (i + 1) + '</td>' +
                '<td>' + utils.escapeHtml(c.court_name || '-') + '</td>' +
                '<td>' + utils.escapeHtml(String(c.years_experience != null ? c.years_experience : '-')) + '</td>' +
                '<td>' + utils.escapeHtml(fmtDate(c.from_date)) + '</td>' +
                '<td>' + utils.escapeHtml(fmtDate(c.to_date)) + '</td>' +
                '<td>' + viewDocBtn(c.practice_document || '') + '</td></tr>');
        });
    }

    /** Match Tab 3 / API citation grouping (7_YEAR → AAG; 5_YEAR / AGP / SGP / GP → AGP). */
    function partitionJudgementCitations(judgements) {
        const aagItems = [];
        const agpItems = [];
        (judgements || []).forEach(function (j) {
            const cat = String(j.category || '').toUpperCase();
            (j.citations || []).forEach(function (c) {
                const citeType = String(c.citation_type || c.citationType || '').toUpperCase();
                const agpCategory = cat === 'AGP' || cat === 'SGP' || cat === 'GP'
                    || cat.indexOf('GOVERNMENT PLEADER') >= 0;
                if (citeType === '5_YEAR' || agpCategory) {
                    agpItems.push(c);
                } else {
                    aagItems.push(c);
                }
            });
        });
        return { aagItems: aagItems, agpItems: agpItems };
    }

    function citationTextFromEntry(entry) {
        if (entry == null) {
            return '';
        }
        if (typeof entry === 'string') {
            return trimStr(entry);
        }
        return trimStr(entry.value != null ? entry.value : entry.case_citation || entry.case_title);
    }

    function citationRowsFromWizardList(list) {
        const rows = [];
        (list || []).forEach(function (entry) {
            const text = citationTextFromEntry(entry);
            if (text) {
                rows.push({ case_citation: text });
            }
        });
        return rows;
    }

    function getJudgementPreviewParts(judgements, tab3Snap) {
        const apiParts = partitionJudgementCitations(judgements || []);
        const aagList = tab3Snap ? tab3Snap.judgmentAAGCitations : state.judgmentAAGCitations;
        const agpList = tab3Snap ? tab3Snap.judgmentAGPCitations : state.judgmentAGPCitations;
        const wizAag = citationRowsFromWizardList(aagList);
        const wizAgp = citationRowsFromWizardList(agpList);
        return {
            aagItems: wizAag.length ? wizAag : apiParts.aagItems,
            agpItems: wizAgp.length ? wizAgp : apiParts.agpItems
        };
    }

    function populateJudgementTables(judgements, tab3Snap) {
        const tables = document.querySelectorAll('#pdfContent .table-govt');
        const aagTbody = tables[4] && tables[4].querySelector('tbody');
        const parts = getJudgementPreviewParts(judgements, tab3Snap);
        const agpMount = document.getElementById('pdfAgpJudgementsMount');
        const agpTbody = (agpMount && agpMount.querySelector('tbody'))
            || (document.getElementById('pdfAgpJudgementsTable') && document.getElementById('pdfAgpJudgementsTable').querySelector('tbody'));

        function fill(tbody, items) {
            if (!tbody) {
                return;
            }
            tbody.innerHTML = '';
            if (!items.length) {
                tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">No judgement records.</td></tr>';
                return;
            }
            items.forEach(function (c, i) {
                tbody.insertAdjacentHTML('beforeend',
                    '<tr><td>' + (i + 1) + '</td>' +
                    '<td>' + utils.escapeHtml(c.case_citation || c.case_title || '-') + '</td></tr>');
            });
        }

        fill(aagTbody, parts.aagItems);
        fill(agpTbody, parts.agpItems);
    }

    function parseYearsFromDisplay(val) {
        if (val == null || val === '') {
            return null;
        }
        const n = parseFloat(String(val).replace(/[^\d.]/g, ''));
        return isNaN(n) ? null : Math.floor(n);
    }

    function mapStateEduForPreview(items) {
        return (items || []).map(function (e) {
            return {
                qualification_name: e.exam,
                year_of_passing: e.year,
                university_name: e.board,
                institution: e.institution,
                specialization: e.special,
                marks_percentage: e.percentage,
                certificate_path: e.certificatePath
            };
        });
    }

    function mapStateAdditionalForPreview(items) {
        return (items || []).map(function (a) {
            return {
                qualification_name: a.exam,
                year_of_passing: a.year,
                board_university: a.board,
                institution_name: a.institution,
                subject_name: a.subject,
                marks_percentage: a.percentage,
                certificate_path: a.certificatePath
            };
        });
    }

    function mapStateBarForPreview(items) {
        return (items || []).filter(function (b) { return !b.is_deleted; }).map(function (b) {
            return {
                years_experience: b.years,
                from_date: b.from,
                to_date: b.to,
                bar_council_name: b.barCouncil,
                supporting_document: b.supporting_document || b.supportingDocument,
                court_type: b.courtType
            };
        });
    }

    function mapStateCourtForPreview(items) {
        return (items || []).filter(function (c) { return !c.is_deleted; }).map(function (c) {
            return {
                court_name: c.courtName,
                years_experience: c.years,
                from_date: c.from,
                to_date: c.to,
                practice_document: c.practice_document || c.practiceDocument
            };
        });
    }

    function buildPersonalPreviewFromWizard() {
        if (!AF.tab1 || typeof AF.tab1.getPersonalFromForm !== 'function') {
            return null;
        }
        const formP = AF.tab1.getPersonalFromForm();
        if (AF.api && typeof AF.api.buildPersonalSavePayload === 'function') {
            return AF.api.buildPersonalSavePayload(formP);
        }
        return {
            applicant_name: formP.advocateName,
            father_name: formP.fatherName,
            bar_council_enrollement_number: formP.enrolmentNo,
            bar_council_enrollement_number_senior: formP.seniorEnrolmentNo,
            date_of_enrollment: formP.enrolmentDate,
            court_pratice: formP.yearsOfPracticeHcm,
            gender: formP.gender,
            marital_status: formP.maritalStatus,
            dob: formP.dob,
            nationality: formP.nationality,
            religion: formP.religion,
            community: formP.community,
            sub_caste: formP.subCaste,
            mobile_no: formP.mobile,
            phone_number: formP.phone,
            email_id: formP.email,
            pan_number: formP.pan,
            office_district: formP.officeDistrict,
            office_pincode: formP.officePincode,
            office_address: formP.officeAddress,
            permanent_district: formP.permanentDistrict,
            permanent_pincode: formP.permanentPincode,
            permanent_address: formP.permanentAddress,
            photo_path: formP.photoPath
        };
    }

    function buildExperiencePreviewFromWizard() {
        if (!AF.api || typeof AF.api.collectExperienceData !== 'function') {
            return {};
        }
        const fd = AF.api.collectExperienceData();
        return {
            law_degree_recognized: fd.law_degree_recognized,
            govt_law_officer_experience: fd.previously_worked,
            provide_details_if_yes: fd.previously_worked_details,
            current_facing_criminal_proceedings: fd.current_proceeding,
            current_criminal_cases_details: fd.current_criminal_details,
            current_criminal_cases_present_status: fd.current_criminal_status,
            current_disciplinary_proceeding_details: fd.current_disciplinary_details,
            current_disciplinary_proceeding_present_status: fd.current_disciplinary_status,
            past_facing_criminal_proceedings: fd.past_proceeding,
            past_criminal_cases_details: fd.past_criminal_details,
            past_criminal_cases_present_status: fd.past_criminal_status,
            past_disciplinary_proceeding_details: fd.past_disciplinary_details,
            past_disciplinary_proceeding_present_status: fd.past_disciplinary_status,
            professional_achievement: fd.has_achievements,
            achievement_remarks: fd.achievement_details,
            achievement_support_document: trimStr(AF.state && AF.state.achievementDocumentPath),
            drafting_experience_years: parseYearsFromDisplay(fd.drafting_years),
            total_bar_experience_years: parseYearsFromDisplay(fd.total_bar_years),
            total_practice_years: parseYearsFromDisplay(fd.high_court_years)
        };
    }

    /** Fill #pdfContent from wizard state (and optional API snapshot). */
    async function populatePreviewPdfFromWizardState(apiData, tab3Snap) {
        apiData = apiData || state.previewApiData || {};
        const personal = apiData.personal_info || buildPersonalPreviewFromWizard();
        const docs = apiData.documents || [];
        const experience = apiData.experience && Object.keys(apiData.experience).length
            ? apiData.experience
            : buildExperiencePreviewFromWizard();

        if (personal) {
            populatePersonalSection(personal, docs, experience);
        }
        populateEducationTable(
            (state.eduItems && state.eduItems.length)
                ? mapStateEduForPreview(state.eduItems)
                : (apiData.education || [])
        );
        populateAdditionalQualTable(
            (state.additionalItems && state.additionalItems.length)
                ? mapStateAdditionalForPreview(state.additionalItems)
                : (apiData.additional_qualification || [])
        );
        populateLawDegreeSection(experience);
        populateBarPracticeTable(
            (state.barItems && state.barItems.length)
                ? mapStateBarForPreview(state.barItems)
                : (apiData.bar_practice || [])
        );
        populateCourtPracticeTable(
            (state.practiceItems && state.practiceItems.length)
                ? mapStateCourtForPreview(state.practiceItems)
                : (apiData.court_practice || [])
        );
        populateJudgementTables(apiData.judgements, tab3Snap);
        populateExperienceDetails(experience, docs);
        updatePostAppliedField();
        normalizeTab4TextareaValues();
        const photoSrc = resolveEffectivePhotoSource(personal, docs);
        return embedPhotoForPdf(photoSrc);
    }

    /** Tab 4 preview PDF block — avoid duplicate IDs shared with Tab 3 (#tab3). */
    function getTab4PreviewRoot() {
        return document.querySelector('#tab4 .preview-wrapper')
            || document.querySelector('#tab4 .application-container')
            || document.getElementById('tab4');
    }

    /** Official preview form is read-only; declaration & submit stay editable until lock. */
    function disableTab4PreviewFields() {
        const root = getTab4PreviewRoot();
        if (!root) {
            return;
        }

        root.classList.add('tab4-preview-readonly');

        root.querySelectorAll('input, select, textarea, button').forEach(function (el) {
            if (el.type === 'hidden') {
                return;
            }
            if (el.classList.contains('preview-btn') || el.classList.contains('doc-view-btn')) {
                el.disabled = false;
                el.removeAttribute('readonly');
                return;
            }

            el.disabled = true;
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.readOnly = true;
            }
        });

        root.querySelectorAll('label').forEach(function (label) {
            if (label.querySelector('input, select, textarea')) {
                label.style.cursor = 'default';
            }
        });
    }

    function isProceedingYes(val) {
        return val === true || val === 'true' || val === 1 || val === '1';
    }

    function initPreviewProceedingToggles() {
        const root = getTab4PreviewRoot();
        if (!root) {
            return;
        }

        function syncProceedingPanel(radio) {
            if (!radio || !radio.classList.contains('tab4-proceeding-radio')) {
                return;
            }
            const targetSel = radio.getAttribute('data-target');
            if (!targetSel) {
                return;
            }
            const det = root.querySelector(targetSel);
            if (!det) {
                return;
            }
            const show = radio.value === 'Yes' && radio.checked;
            if (show) {
                det.style.display = '';
                det.classList.remove('d-none');
            } else if (radio.value === 'No' && radio.checked) {
                det.style.display = 'none';
                det.classList.add('d-none');
            }
        }

        root.querySelectorAll('.tab4-proceeding-radio').forEach(function (radio) {
            if (radio.getAttribute('data-tab4-proceeding-bound') === '1') {
                return;
            }
            radio.setAttribute('data-tab4-proceeding-bound', '1');
            radio.addEventListener('change', function () {
                if (this.checked) {
                    syncProceedingPanel(this);
                }
            });
        });
    }

    /** Tab 4 preview only — unique radio names (Tab 3 uses currentProceeding / pastProceeding). */
    function applyTab4ProceedingPrefill(experience) {
        if (!experience) {
            return;
        }
        const previewRoot = getTab4PreviewRoot();
        if (!previewRoot) {
            return;
        }

        function fillProceeding(yesRadioId, noRadioId, detailsId, fields) {
            const yesRadio = previewRoot.querySelector('#' + yesRadioId);
            const noRadio = previewRoot.querySelector('#' + noRadioId);
            const det = previewRoot.querySelector('#' + detailsId);
            if (!yesRadio || !noRadio) {
                return;
            }
            noRadio.checked = false;
            yesRadio.checked = true;
            if (det) {
                det.style.display = '';
                det.classList.remove('d-none');
            }
            const tas = det ? det.querySelectorAll('textarea') : [];
            fields.forEach(function (val, idx) {
                if (tas[idx]) {
                    setTextareaValue(tas[idx], val != null ? String(val) : '');
                }
            });
        }

        function clearProceeding(yesRadioId, noRadioId, detailsId) {
            const yesRadio = previewRoot.querySelector('#' + yesRadioId);
            const noRadio = previewRoot.querySelector('#' + noRadioId);
            const det = previewRoot.querySelector('#' + detailsId);
            if (yesRadio) {
                yesRadio.checked = false;
            }
            if (noRadio) {
                noRadio.checked = true;
            }
            if (det) {
                det.style.display = 'none';
                det.classList.add('d-none');
            }
        }

        if (isProceedingYes(experience.current_facing_criminal_proceedings)) {
            fillProceeding('tab4CurrentProceedingYes', 'tab4CurrentProceedingNo', 'tab4CurrentProceedingDetails', [
                experience.current_criminal_cases_details,
                experience.current_criminal_cases_present_status,
                experience.current_disciplinary_proceeding_details,
                experience.current_disciplinary_proceeding_present_status
            ]);
        } else {
            clearProceeding('tab4CurrentProceedingYes', 'tab4CurrentProceedingNo', 'tab4CurrentProceedingDetails');
        }

        if (isProceedingYes(experience.past_facing_criminal_proceedings)) {
            fillProceeding('tab4PastProceedingYes', 'tab4PastProceedingNo', 'tab4PastProceedingDetails', [
                experience.past_criminal_cases_details,
                experience.past_criminal_cases_present_status,
                experience.past_disciplinary_proceeding_details,
                experience.past_disciplinary_proceeding_present_status
            ]);
        } else {
            clearProceeding('tab4PastProceedingYes', 'tab4PastProceedingNo', 'tab4PastProceedingDetails');
        }

        initPreviewProceedingToggles();
    }

    function resolveAchievementRemarks(experience) {
        if (!experience) {
            return '';
        }
        if (trimStr(experience.achievement_remarks)) {
            return trimStr(experience.achievement_remarks);
        }
        const pa = experience.professional_achievement;
        if (typeof pa === 'string' && pa.length > 2 && pa !== 'true' && pa !== 'false') {
            return pa;
        }
        return '';
    }

    function hasProfessionalAchievement(experience) {
        if (!experience) {
            return false;
        }
        const pa = experience.professional_achievement;
        if (pa === true || pa === 'true' || pa === 1 || pa === '1') {
            return true;
        }
        if (typeof pa === 'string' && pa.length > 2 && pa !== 'false') {
            return true;
        }
        return !!trimStr(experience.achievement_remarks) || !!trimStr(experience.achievement_support_document);
    }

    function populateAchievementPdfSection(experience, docs) {
        if (!experience) {
            return;
        }
        docs = docs || [];
        const remarks = resolveAchievementRemarks(experience);
        const achDoc = latestDocument(docs, 'ACHIEVEMENT');
        const achPath = trimStr((achDoc && achDoc.file_path) || experience.achievement_support_document || '');
        const titles = document.querySelectorAll('#pdfContent .section-title');
        for (let i = 0; i < titles.length; i++) {
            if (!titles[i].textContent.trim().startsWith('31.')) {
                continue;
            }
            let el = titles[i].nextElementSibling;
            while (el && el.classList && el.classList.contains('section-title')) {
                el = el.nextElementSibling;
            }
            if (el && el.tagName === 'TEXTAREA') {
                setTextareaValue(el, remarks || (hasProfessionalAchievement(experience) ? 'Yes' : ''));
                let next = el.nextElementSibling;
                if (next && next.classList && next.classList.contains('preview-btn')) {
                    next.remove();
                    next = el.nextElementSibling;
                }
                if (next && next.classList && next.classList.contains('pdf-achievement-doc')) {
                    next.remove();
                }
                if (achPath) {
                    el.insertAdjacentHTML('afterend', '<div class="mt-2 pdf-achievement-doc">' + viewDocBtn(achPath, 'View Document') + '</div>');
                }
            }
            break;
        }
    }

    function populateExperienceDetails(experience, docs) {
        if (!experience) return;
        docs = docs || [];

        const draftEl = document.getElementById('draftingYears');
        if (draftEl && experience.drafting_experience_years != null) {
            draftEl.value = String(Math.floor(Number(experience.drafting_experience_years) || 0));
        }
        setPdfSectionInput('26.', experience.drafting_experience_years != null ? String(Math.floor(Number(experience.drafting_experience_years) || 0)) + ' Years' : '');

        const totalBarEl = document.getElementById('totalBarYears');
        if (totalBarEl && experience.total_bar_experience_years != null) {
            totalBarEl.value = String(Math.floor(Number(experience.total_bar_experience_years) || 0)) + ' years';
        }
        const specBarEl = document.getElementById('specificBarYears');
        if (specBarEl && experience.total_practice_years != null) {
            specBarEl.value = String(Math.floor(Number(experience.total_practice_years) || 0)) + ' years';
        }

        const prevWorked = document.getElementById('previousWorked');
        if (prevWorked && experience.govt_law_officer_experience !== undefined) {
            const yes = isProceedingYes(experience.govt_law_officer_experience);
            prevWorked.value = yes ? 'Yes' : 'No';
            if (typeof window.$ === 'function') {
                $(prevWorked).trigger('change');
            }
            const details = document.getElementById('previousWorkedDetails');
            if (details) {
                details.value = experience.provide_details_if_yes || '';
            }
        }

        applyTab4ProceedingPrefill(experience);

        if (hasProfessionalAchievement(experience)) {
            const achSel = document.getElementById('achievmenetWrap');
            const achWrapper = document.getElementById('achievementDetailsWrapper');
            const achTa = document.getElementById('achievementDetails');
            const remarks = resolveAchievementRemarks(experience);
            if (achSel) {
                achSel.value = 'Yes';
                if (typeof window.$ === 'function') {
                    $(achSel).trigger('change');
                }
            }
            if (achWrapper) {
                achWrapper.classList.remove('d-none');
            }
            if (achTa) {
                setTextareaValue(achTa, remarks);
            }
        }

        populateAchievementPdfSection(experience, docs);
    }

    function snapshotTab3WizardState() {
        return {
            barItems: (state.barItems || []).map(function (item) { return Object.assign({}, item); }),
            barSections: (state.barSections || []).slice(),
            practiceItems: (state.practiceItems || []).map(function (item) { return Object.assign({}, item); }),
            practiceSections: (state.practiceSections || []).slice(),
            judgmentAAGCitations: (state.judgmentAAGCitations || []).slice(),
            judgmentAGPCitations: (state.judgmentAGPCitations || []).slice()
        };
    }

    function tab3SnapshotHasUserInput(snap) {
        if (!snap) {
            return false;
        }
        const hasBar = (snap.barItems || []).some(function (b) {
            return trimStr(b.from) || trimStr(b.to) || trimStr(b.barCouncil) || trimStr(b.courtType)
                || trimStr(b.supporting_document) || trimStr(b.supportingDocument);
        });
        const hasPractice = (snap.practiceItems || []).some(function (p) {
            return trimStr(p.courtName) || trimStr(p.from) || trimStr(p.to)
                || trimStr(p.practice_document) || trimStr(p.practiceDocument);
        });
        const aagFilled = (snap.judgmentAAGCitations || []).filter(function (c) {
            const v = c && typeof c === 'object' ? c.value : c;
            return trimStr(v);
        }).length;
        const agpFilled = (snap.judgmentAGPCitations || []).filter(function (c) {
            const v = c && typeof c === 'object' ? c.value : c;
            return trimStr(v);
        }).length;
        return hasBar || hasPractice || aagFilled > 0 || agpFilled > 0;
    }

    function mergeTab3SnapshotWithApiDocuments(snap, data) {
        if (!snap || !data) {
            return snap;
        }
        const barApi = (data.bar_practice || []).filter(function (b) { return !b.is_deleted; });
        const courtApi = (data.court_practice || []).filter(function (c) { return !c.is_deleted; });
        const merged = {
            barItems: (snap.barItems || []).map(function (item, i) {
                const api = barApi[i];
                const docPath = trimStr(
                    item.supporting_document || item.supportingDocument
                    || (api && (api.supporting_document || api.supportingDocument || api.document_path))
                );
                if (!docPath) {
                    return item;
                }
                return Object.assign({}, item, {
                    supporting_document: docPath,
                    supportingDocument: docPath
                });
            }),
            barSections: (snap.barSections || []).slice(),
            practiceItems: (snap.practiceItems || []).map(function (item, i) {
                const api = courtApi[i];
                const docPath = trimStr(
                    item.practice_document || item.practiceDocument
                    || (api && (api.practice_document || api.practiceDocument || api.document_path))
                );
                if (!docPath) {
                    return item;
                }
                return Object.assign({}, item, {
                    practice_document: docPath,
                    practiceDocument: docPath
                });
            }),
            practiceSections: (snap.practiceSections || []).slice(),
            judgmentAAGCitations: snap.judgmentAAGCitations,
            judgmentAGPCitations: snap.judgmentAGPCitations
        };
        merged.barItems.forEach(function (item, i) {
            const docPath = trimStr(item.supporting_document || item.supportingDocument);
            if (docPath) {
                state.filePreviews['bar-' + i] = docPreviewFromPath(docPath);
            }
        });
        merged.practiceItems.forEach(function (item, i) {
            const docPath = trimStr(item.practice_document || item.practiceDocument);
            if (docPath) {
                state.filePreviews['practice-' + i] = docPreviewFromPath(docPath);
            }
        });
        return merged;
    }

    function restoreTab3WizardState(snap) {
        if (!snap) {
            return;
        }
        state.barItems = snap.barItems;
        state.barSections = snap.barSections;
        state.practiceItems = snap.practiceItems;
        state.practiceSections = snap.practiceSections;
        state.judgmentAAGCitations = snap.judgmentAAGCitations;
        state.judgmentAGPCitations = snap.judgmentAGPCitations;
    }

    function applyPreviewDataToState(data) {
        if (!data) return;
        state.previewApiData = data;
        const p = data.personal_info || {};
        let docs = (data.documents || []).filter(function (d) { return !d.is_deleted; });
        if (AF.files && typeof AF.files.filterDocumentsRespectingClears === 'function') {
            docs = AF.files.filterDocumentsRespectingClears(docs);
        }
        if (isUploadCleared('photo') && p.photo_path) {
            p.photo_path = '';
        }
        if (isUploadCleared('enrolmentCert') && p.certificate_path) {
            p.certificate_path = '';
        }
        const exp = data.experience || {};

        const photoDoc = latestDocument(docs, 'PHOTO');
        const certDoc = latestDocument(docs, 'ENROLMENT_CERTIFICATE');
        if (isUploadCleared('photo')) {
            delete state.filePreviews.photo;
        } else if (photoDoc) {
            state.filePreviews.photo = docPreviewFromPath(photoDoc.file_path, photoDoc.file_name);
        } else if (p.photo_path) {
            state.filePreviews.photo = docPreviewFromPath(p.photo_path);
        } else {
            delete state.filePreviews.photo;
        }
        if (isUploadCleared('enrolmentCert')) {
            delete state.filePreviews.enrolmentCert;
        } else if (certDoc) {
            state.filePreviews.enrolmentCert = docPreviewFromPath(certDoc.file_path, certDoc.file_name);
        } else if (p.certificate_path) {
            state.filePreviews.enrolmentCert = docPreviewFromPath(p.certificate_path, p.certificate_name);
        } else {
            delete state.filePreviews.enrolmentCert;
        }

        state.eduItems = (data.education || []).filter(function (e) { return !e.is_deleted; }).map(function (e, i) {
            const path = e.certificate_path || '';
            const fileName = e.certificate_name || e.certificate_file_name || '';
            if (path) state.filePreviews['edu-' + i] = docPreviewFromPath(path, fileName);
            return {
                educationId: parseInt(e.education_id, 10) || 0,
                exam: eduExamName(e),
                year: String(e.year_of_passing != null ? e.year_of_passing : ''),
                board: eduBoardName(e),
                institution: e.institution || '',
                special: eduSubjectName(e),
                percentage: String(e.marks_percentage != null ? e.marks_percentage : ''),
                certificatePath: path,
                certificateFileName: fileName || basenameFromPath(path)
            };
        });

        state.additionalItems = (data.additional_qualification || []).filter(function (a) { return !a.is_deleted; }).map(function (a, i) {
            const path = a.certificate_path || '';
            const fileName = a.certificate_name || a.certificate_file_name || '';
            if (path) state.filePreviews['add-' + i] = docPreviewFromPath(path, fileName);
            return {
                additionalId: parseInt(a.add_qualification_id || a.additional_qualification_id, 10) || 0,
                exam: a.qualification_name || a.examination || '',
                year: String(a.year_of_passing != null ? a.year_of_passing : ''),
                board: a.board_university || a.university || '',
                institution: a.institution_name || a.institution || '',
                subject: a.subject_name || a.subject || '',
                percentage: String(a.marks_percentage != null ? a.marks_percentage : ''),
                certificatePath: path,
                certificateFileName: fileName || basenameFromPath(path)
            };
        });

        state.barItems = (data.bar_practice || []).filter(function (b) { return !b.is_deleted; }).map(function (b, i) {
            const docPath = trimStr(b.supporting_document || b.supportingDocument || b.document_path || '');
            if (docPath) {
                state.filePreviews['bar-' + i] = docPreviewFromPath(docPath, b.document_name || b.file_name);
            }
            return {
                id: parseInt(b.bar_practice_id || b.id, 10) || 0,
                years: String(b.years_experience != null ? b.years_experience : ''),
                from: b.from_date || '',
                to: b.to_date || '',
                barCouncil: b.bar_council_name || '',
                courtType: b.court_type || '',
                supporting_document: docPath,
                supportingDocument: docPath
            };
        });

        state.practiceItems = (data.court_practice || []).filter(function (c) { return !c.is_deleted; }).map(function (c, i) {
            const docPath = trimStr(c.practice_document || c.practiceDocument || c.document_path || '');
            if (docPath) {
                state.filePreviews['practice-' + i] = docPreviewFromPath(docPath, c.document_name || c.file_name);
            }
            return {
                id: parseInt(c.court_practice_id || c.id, 10) || 0,
                courtName: c.court_name || '',
                years: String(c.years_experience != null ? c.years_experience : ''),
                from: c.from_date || '',
                to: c.to_date || '',
                practice_document: docPath,
                practiceDocument: docPath
            };
        });

        const judgementParts = partitionJudgementCitations(data.judgements || []);
        const hasApiAag = judgementParts.aagItems.length > 0;
        const hasApiAgp = judgementParts.agpItems.length > 0;
        if (hasApiAag) {
            state.judgmentAAGCitations = judgementParts.aagItems.map(function (c) {
                return {
                    id: 'cite-api-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                    value: trimStr(c.case_citation || c.case_title)
                };
            }).filter(function (c) { return c.value; });
        }
        if (hasApiAgp) {
            state.judgmentAGPCitations = judgementParts.agpItems.map(function (c) {
                return {
                    id: 'cite-api-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                    value: trimStr(c.case_citation || c.case_title)
                };
            }).filter(function (c) { return c.value; });
        }
        if (!state.judgmentAAGCitations || !state.judgmentAAGCitations.length) {
            state.judgmentAAGCitations = [{ id: 'cite-api-aag-empty', value: '' }];
        }
        if (!state.judgmentAGPCitations || !state.judgmentAGPCitations.length) {
            state.judgmentAGPCitations = [{ id: 'cite-api-agp-empty', value: '' }];
        }

        if (exp.drafting_experience_years != null) {
            const draftEl = document.getElementById('draftingYears');
            if (draftEl) draftEl.value = String(Math.floor(Number(exp.drafting_experience_years) || 0));
        }
        if (exp.total_bar_experience_years != null) {
            const totalBarEl = document.getElementById('totalBarYears');
            if (totalBarEl) totalBarEl.value = String(Math.floor(Number(exp.total_bar_experience_years) || 0)) + ' years';
        }
        if (exp.total_practice_years != null) {
            const specEl = document.getElementById('specificBarYears');
            if (specEl) {
                specEl.value = String(Math.floor(Number(exp.total_practice_years) || 0)) + ' years';
            }
        }

        const achPath = trimStr(exp.achievement_support_document || '');
        if (achPath) {
            state.achievementDocumentPath = achPath;
            state.filePreviews.achievement = docPreviewFromPath(achPath);
        }

        const draftDoc = latestDocument(docs, 'DRAFTING') || latestDocument(docs, 'PETITION');
        const draftPath = (draftDoc && draftDoc.file_path) || exp.drafting_document || exp.petition_document || '';
        if (draftPath) {
            state.filePreviews.drafting = docPreviewFromPath(draftPath, draftDoc && draftDoc.file_name);
        }
    }

    function populateTab3FromPreview(data) {
        if (!data || !AF.tab3 || typeof AF.tab3.populateExperienceData !== 'function') {
            return;
        }
        const experience = Object.assign({}, data.experience || {});
        const achDoc = latestDocument(data.documents || [], 'ACHIEVEMENT');
        if (achDoc && achDoc.file_path && !trimStr(experience.achievement_support_document)) {
            experience.achievement_support_document = achDoc.file_path;
        }
        const wrapped = {
            ok: true,
            0: {
                fn_application_get_experience_details: JSON.stringify({
                    experience: experience,
                    bar_practice: data.bar_practice || [],
                    court_practice: data.court_practice || [],
                    judgements: data.judgements || []
                })
            }
        };
        AF.tab3.populateExperienceData(wrapped);
        AF.state.experienceHydrated = true;
    }

    function hydrateWizardTabsFromPreview(data, options) {
        data = data || state.previewApiData;
        if (!data) {
            return;
        }
        options = options || {};

        /* Tab 1 wizard fields are filled on bootstrap / Tab 1 visit only — do not overwrite uploads when opening preview. */

        if (AF.api && typeof AF.api.applyTab2QualificationsToState === 'function') {
            AF.api.applyTab2QualificationsToState({
                eduItems: AF.state.eduItems || [],
                additionalItems: AF.state.additionalItems || []
            }, { replace: true });
        }

        if (AF.tab2) {
            if (typeof AF.tab2.renderEdu === 'function') {
                AF.tab2.renderEdu();
            }
            if (typeof AF.tab2.renderAdditional === 'function') {
                AF.tab2.renderAdditional();
            }
        }

        /* Full Tab 3 prefill from API (law degree, proceedings, achievements, bar/court, citations, uploads). */
        populateTab3FromPreview(data);

        if (options.tab3Snap) {
            restoreTab3WizardState(options.tab3Snap);
            if (AF.tab3 && typeof AF.tab3.restoreTab3FromState === 'function') {
                AF.tab3.restoreTab3FromState();
            }
        }

        if (AF.files && typeof AF.files.mountAllDocPreviewButtons === 'function') {
            AF.files.mountAllDocPreviewButtons(document.querySelector('.app-container'));
        }
    }

    // DOCUMENT PREVIEW MODAL HANDLERS
    // ─────────────────────────────────────────────────────────────

    window.openPdfPreview = function (url) {
        if (AF.files && typeof AF.files.openPdfPreview === 'function') {
            AF.files.openPdfPreview(url);
            return;
        }
        const resolved = url;
        const iframe = document.querySelector('#pdfPreviewModal iframe');
        const modalEl = document.getElementById('pdfPreviewModal');
        if (iframe) iframe.src = resolved;
        if (modalEl && modalEl.parentElement !== document.body) {
            document.body.appendChild(modalEl);
        }
        if (modalEl && global.bootstrap && global.bootstrap.Modal) {
            global.bootstrap.Modal.getOrCreateInstance(modalEl).show();
        }
    };

    window.openImagePreview = function (url) {
        if (AF.files && typeof AF.files.openImagePreview === 'function') {
            AF.files.openImagePreview(url);
            return;
        }
        const img = document.querySelector('#imagePreviewModal .preview-modal-body img');
        const modalEl = document.getElementById('imagePreviewModal');
        if (img) img.src = url;
        if (modalEl && modalEl.parentElement !== document.body) {
            document.body.appendChild(modalEl);
        }
        if (modalEl && global.bootstrap && global.bootstrap.Modal) {
            global.bootstrap.Modal.getOrCreateInstance(modalEl).show();
        }
    };

    // ─────────────────────────────────────────────────────────────
    // LOADER / ERROR UI
    // ─────────────────────────────────────────────────────────────

    let previewPopulateSeq = 0;

    function getPreviewLoaderHost() {
        return document.querySelector('#tab4 .preview-wrapper')
            || document.querySelector('#tab4 .application-container')
            || document.getElementById('tab4');
    }

    function showPreviewLoader(show, message) {
        if (show) {
            if (utils.showPrefillLoader) {
                utils.showPrefillLoader(message || 'Loading preview…', document.body, { viewport: true });
            }
        } else if (utils.hidePrefillLoader) {
            utils.hidePrefillLoader(document.body, { viewport: true });
        }
    }

    function waitForPreviewPaint() {
        if (utils.waitForPrefillPaint) {
            return utils.waitForPrefillPaint();
        }
        return Promise.resolve();
    }

    function showPreviewError(message, type) {
        type = type || 'danger';
        const el = document.getElementById('submitMessage');
        if (el) {
            el.innerHTML = '<div class="alert alert-' + type + '">' +
                '<i class="bi bi-exclamation-triangle-fill me-2"></i>' + utils.escapeHtml(message) + '</div>';
        }
    }

    /** Sync wizard state and refresh post field; gov form is filled via loadAndPopulatePreview. */
    function generatePreview(options) {
        options = options || {};
        if (config.formMode === 'previewOnly' && config.existingApp?.filePreviews) {
            Object.assign(state.filePreviews, config.existingApp.filePreviews);
        }

        if (!options.skipWizardSync) {
            if (AF.tab2) {
                if (typeof AF.tab2.syncEdu === 'function') AF.tab2.syncEdu();
                if (typeof AF.tab2.syncAdditional === 'function') AF.tab2.syncAdditional();
            }
            if (AF.tab3 && typeof AF.tab3.syncAll === 'function') {
                AF.tab3.syncAll();
            }
        }
        if (AF.files && typeof AF.files.collectLiveFilePreviews === 'function') {
            AF.files.collectLiveFilePreviews();
        }
        if (isUploadCleared('photo')) {
            delete state.filePreviews.photo;
        }
        if (isUploadCleared('enrolmentCert')) {
            delete state.filePreviews.enrolmentCert;
        }

        updatePostAppliedField();

        const previewContent = document.getElementById('previewContent');
        if (previewContent) {
            previewContent.innerHTML = '';
        }

        disableTab4PreviewFields();
    }

    // ─────────────────────────────────────────────────────────────
    // MAIN LOAD ENTRY POINT
    // ─────────────────────────────────────────────────────────────

    async function loadAndPopulatePreview() {
        const seq = ++previewPopulateSeq;
        showPreviewLoader(true, 'Loading preview…');
        let data = null;

        try {
            if (AF.api && typeof AF.api.ensureValidSessionForForm === 'function') {
                showPreviewLoader(true, 'Refreshing session…');
                try {
                    await AF.api.ensureValidSessionForForm();
                } catch (refreshErr) {
                    console.warn('[Tab4] session refresh:', refreshErr && refreshErr.message ? refreshErr.message : refreshErr);
                }
            }

            showPreviewLoader(true, 'Fetching saved application…');
            try {
                data = await fetchPreviewData();
            } catch (err) {
                console.error('[Tab4] fetchPreviewData error:', err);
            }

            if (seq !== previewPopulateSeq) {
                return;
            }

            const tab3Snap = snapshotTab3WizardState();
            const preserveTab3 = tab3SnapshotHasUserInput(tab3Snap);
            const mergedTab3Snap = preserveTab3 && data
                ? mergeTab3SnapshotWithApiDocuments(tab3Snap, data)
                : tab3Snap;

            if (!data) {
                generatePreview();
                await populatePreviewPdfFromWizardState({}, mergedTab3Snap);
                if (AF.tab3 && typeof AF.tab3.restoreTab3FromState === 'function') {
                    AF.tab3.restoreTab3FromState();
                }
                disableTab4PreviewFields();
                await waitForPreviewPaint();
                showPreviewError('Could not load saved data from server. Showing locally filled data instead.', 'warning');
                return;
            }

            showPreviewLoader(true, 'Prefilling preview…');

            applyPreviewDataToState(data);
            if (mergedTab3Snap && preserveTab3) {
                restoreTab3WizardState(mergedTab3Snap);
            }
            generatePreview({ skipWizardSync: true });
            await populatePreviewPdfFromWizardState(data, mergedTab3Snap);
            hydrateWizardTabsFromPreview(data, {
                tab3Snap: preserveTab3 ? mergedTab3Snap : null
            });
            applyTab4ProceedingPrefill(
                (data.experience && Object.keys(data.experience).length)
                    ? data.experience
                    : buildExperiencePreviewFromWizard()
            );
            disableTab4PreviewFields();
            if (AF.nav && typeof AF.nav.applySubmittedHyperlinkView === 'function') {
                AF.nav.applySubmittedHyperlinkView();
            }
            if (AF.files && typeof AF.files.mountAllDocPreviewButtons === 'function') {
                AF.files.mountAllDocPreviewButtons(document.querySelector('.app-container'));
            }
            await waitForPreviewPaint();
        } catch (err) {
            console.error('[Tab4] Error populating preview:', err);
            showPreviewError('An error occurred while rendering the preview. Please try again.');
        } finally {
            if (seq === previewPopulateSeq) {
                showPreviewLoader(false);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // PDF DOWNLOAD
    // ─────────────────────────────────────────────────────────────

    async function downloadPDF() {
        const jsPDFLib = window.jspdf;
        if (!jsPDFLib || !window.html2canvas) {
            alert('PDF libraries not loaded. Please try again.');
            return;
        }
        const element = document.getElementById('pdfContent');
        if (!element) {
            return;
        }

        let personal = state.previewApiData && state.previewApiData.personal_info
            ? state.previewApiData.personal_info
            : null;
        const docs = (state.previewApiData && state.previewApiData.documents) || [];
        if (!personal && AF.tab1 && typeof AF.tab1.getPersonalFromForm === 'function'
            && AF.api && typeof AF.api.buildPersonalSavePayload === 'function') {
            personal = AF.api.buildPersonalSavePayload(AF.tab1.getPersonalFromForm());
        }
        setPdfExportLayout(true);
        let pdfPhotoDataUrl = '';
        try {
            pdfPhotoDataUrl = await embedPhotoForPdf(resolveEffectivePhotoSource(personal, docs));
            await ensurePdfImagesReady(element);
            await new Promise(function (r) { setTimeout(r, 150); });

            const { jsPDF } = jsPDFLib;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: false,
                logging: false,
                scrollY: -window.scrollY,
                backgroundColor: '#ffffff',
                imageTimeout: 15000,
                onclone: function (clonedDoc) {
                    if (!pdfPhotoDataUrl) {
                        return;
                    }
                    const clonedImg = clonedDoc.querySelector('#pdfApplicantPhotoBox img');
                    if (clonedImg) {
                        clonedImg.removeAttribute('crossorigin');
                        clonedImg.src = pdfPhotoDataUrl;
                    }
                }
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdfW = 210;
            const pdfH = 297;
            const margin = 10;
            const contentW = pdfW - margin * 2;
            const imgH = canvas.height * contentW / canvas.width;
            const pageInnerH = pdfH - margin * 2;
            let rendered = 0;
            let page = 0;

            while (rendered < imgH) {
                if (page > 0) {
                    pdf.addPage();
                }
                pdf.addImage(imgData, 'JPEG', margin, margin - rendered, contentW, imgH);
                rendered += pageInnerH;
                page += 1;
            }
            pdf.save('Law-Officers-Application.pdf');
        } finally {
            setPdfExportLayout(false);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // SUBMIT
    // FIX 6: remove AppData.submitApplication (mock), remove duplicate
    //        jQuery click binding; use AF.api layer or graceful fallback.
    // ─────────────────────────────────────────────────────────────

    /** Build submit payload for sp_application_submit */
    function buildSubmitPayload() {
        const applicationId = parseInt(global.sessionStorage.getItem('applicationId'), 10)
            || parseInt(getApplicantId(), 10)
            || 0;
        const selections = global.JobSelection
            ? JobSelection.enrichSelections(JobSelection.readStoredVacancies())
            : [];

        return {
            application_id: applicationId,
            applicationId: applicationId,
            selections: selections.map(function (sel) {
                const court = global.JobSelection
                    ? JobSelection.benchToCourtCode(sel.benchKey)
                    : (String(sel.benchKey).toLowerCase() === 'madurai' ? 'b' : 'a');

                return {
                    post_id: parseInt(sel.postId, 10) || 0,
                    court: court,
                    court_id: sel.courtId
                };
            })
        };
    }

    function initSubmitHandlers() {
        const finalSubmitBtn = document.getElementById('finalSubmitBtn');
        if (!finalSubmitBtn) return;

        finalSubmitBtn.addEventListener('click', function () {
            const declCheck = document.getElementById('declarationCheck');
            const declCheck2 = document.getElementById('declarationCheck2');
            const declPlaceEl = document.getElementById('declPlace');
            const submitMsg = document.getElementById('submitMessage');

            const declErr = getDeclarationValidationError();
            if (declErr) {
                showDeclarationToast(declErr);
                if (declPlaceEl && !declPlaceEl.value.trim()) {
                    declPlaceEl.focus();
                }
                return;
            }

            clearSubmitMessage();

            refreshDeclarationDateTime();
            renderDeclarationApplicantInfo();

            // if (!config.jobId) {
            //     alert('No job selected.');
            //     return;
            // }

            if (global.sessionStorage.getItem('applicationSubmitted') === 'true') {
                handleAlreadySubmittedRedirect();
                return;
            }

            const submitPayload = buildSubmitPayload();
            if (!submitPayload.application_id) {
                showSubmitMessage('<div class="alert alert-danger">Application ID not found. Please save your application first.</div>');
                return;
            }
            if (!submitPayload.selections.length) {
                showSubmitMessage('<div class="alert alert-danger">No vacancy selected. Please choose a post on the Job Posts page.</div>');
                return;
            }

            finalSubmitBtn.disabled = true;

            global.LawPortal.apiRequest(
                'application/submit',
                'POST',
                submitPayload
            )
                .then((res) => {

                    const body = unwrapApiResult(res);

                    if (!body.ok) {
                        const errText = body.error || body.message || 'Submission failed';
                        if (isApplicationAlreadySubmittedError(errText)) {
                            handleAlreadySubmittedRedirect();
                            return;
                        }
                        throw new Error(errText);
                    }

                    global.sessionStorage.setItem('applicationSubmitted', 'true');

                    if (body.application_id) {
                        global.sessionStorage.setItem('applicationId', String(body.application_id));
                    }

                    if (AF.nav && typeof AF.nav.lockSubmittedForm === 'function') {
                        AF.nav.lockSubmittedForm();
                    }

                    clearSubmitMessage();
                    showSubmitSuccessAndRedirect();
                })
                .catch((err) => {
                    console.error('[Tab4] submitApplication error:', err);

                    const errText = err && err.message ? err.message : 'Submission failed';
                    if (isApplicationAlreadySubmittedError(errText)) {
                        handleAlreadySubmittedRedirect();
                        return;
                    }

                    finalSubmitBtn.disabled = false;

                    showSubmitMessage(
                        '<div class="alert alert-danger">' + errText + '</div>'
                    );
                });
        });
    }

    function initPdfDownload() {
        if (window.$) {
            $('#downloadPdfBtn').on('click', () => downloadPDF());
        }
    }

    function initBackToTop() {
        if (!window.$) return;
        $(function () {
            const $btn = $('#backToTopBtn');
            $(window).on('scroll', () => $btn.toggleClass('show', $(window).scrollTop() > 300));
            $btn.on('click', () => $('html, body').animate({ scrollTop: 0 }, 700));
        });
    }

    // ─────────────────────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────────────────────

    function init() {
        clearSubmitMessage();
        refreshDeclarationFields();
        initDeclarationMessageHandlers();
        initSubmitHandlers();
        initPdfDownload();
        initBackToTop();
        initPreviewProceedingToggles();
        disableTab4PreviewFields();

        window.addEventListener('beforeprint', function () {
            const tab4 = document.getElementById('tab4');
            if (tab4 && tab4.classList.contains('active-panel')) {
                setPdfExportLayout(true);
                const personal = state.previewApiData && state.previewApiData.personal_info;
                const docs = (state.previewApiData && state.previewApiData.documents) || [];
                embedPhotoForPdf(resolveEffectivePhotoSource(personal, docs));
            }
        });
        window.addEventListener('afterprint', function () {
            setPdfExportLayout(false);
        });

        const prevBtn = document.getElementById('prevToTab3');
        if (prevBtn) {
            prevBtn.addEventListener('click', function () {
                if (AF.tab3 && typeof AF.tab3.syncAll === 'function') {
                    AF.tab3.syncAll();
                }
                state.tab3NeedsRestore = true;
                AF.nav.switchTab(3);
            });
        }

        // Trigger preview load whenever tab 4 becomes active
        document.addEventListener('af:tabSwitch', e => {
            if (e.detail && e.detail.tab === 4) {
                refreshDeclarationFields();
                loadAndPopulatePreview();
            }
        });

        const tab4Btn = document.querySelector('.main-tab[data-tab="4"]');
        if (tab4Btn) {
            tab4Btn.addEventListener('click', () => {
                refreshDeclarationFields();
                loadAndPopulatePreview();
            });
        }

        function guardSubmitModal(e) {
            refreshDeclarationFields();
            const declErr = getDeclarationValidationError();
            if (!declErr) {
                return;
            }
            if (e && typeof e.preventDefault === 'function') {
                e.preventDefault();
            }
            showDeclarationToast(declErr);
            const declPlaceEl = document.getElementById('declPlace');
            if (declPlaceEl && !declPlaceEl.value.trim()) {
                declPlaceEl.focus();
            }
            return false;
        }

        const submitModalEl = document.getElementById('submitConfirmModal');
        if (submitModalEl) {
            submitModalEl.addEventListener('show.bs.modal', guardSubmitModal);
        }
        if (global.$) {
            global.$('#submitConfirmModal').off('show.bs.modal.declGuard').on('show.bs.modal.declGuard', guardSubmitModal);
        }
    }

    AF.tab4 = {
        init,
        generatePreview,
        loadAndPopulatePreview,
        hydrateWizardTabsFromPreview,
        updatePostAppliedField,
        getPostsAppliedForLabel,
        downloadPDF,
        refreshDeclarationFields,
        getDeclarationSignatureText,
        disableTab4PreviewFields
    };

    // FIX 5: pass `window` as second arg so `global` is defined inside the IIFE
})(window.ApplicationForm, window);