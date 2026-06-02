/**
 * Tab 4: Preview & Submit
 * Integrated with POST /api/application/preview
 */
(function (AF, global) {
    'use strict';

    const utils  = AF.utils;
    const config = AF.config;
    const state  = AF.state;

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
        const applicantId  = parseInt(getApplicantId(), 10) || 0;
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
        const declDateEl = document.getElementById('declDate');
        if (declDateEl) {
            declDateEl.value = formatDeclarationDateTime(new Date());
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

    function isDeclarationComplete() {
        const declCheck = document.getElementById('declarationCheck');
        const declCheck2 = document.getElementById('declarationCheck2');
        const declPlaceEl = document.getElementById('declPlace');
        const checksOk = (!declCheck || declCheck.checked) && (!declCheck2 || declCheck2.checked);
        const placeOk = !declPlaceEl || declPlaceEl.value.trim().length > 0;
        return checksOk && placeOk;
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
        const url      = docUrl(filePath);
        const isImage  = /\.(jpg|jpeg|png|gif|webp)$/i.test(filePath);
        const handler  = isImage
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
        // FIX 3: use AF.api.ensureSessionTokens (the private fn is not in scope here)
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.reject(new Error('LawPortal API client is not loaded.'));
        }

        await AF.api.ensureSessionTokens();

        // FIX 1: LawPortal.apiUrl() prepends apiBase + '/' so path must NOT start with '/'
        const res  = await global.LawPortal.apiRequest('application/preview', 'POST', buildPreviewPayload());
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

    function setInputEl(selector, value) {
        const el = document.querySelector(selector);
        if (el) el.value = value != null ? value : '';
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

    function setGovtInputByLabel(labelPrefix, value) {
        const prefix = String(labelPrefix);
        document.querySelectorAll('.form-section .govt-row').forEach(row => {
            const label = row.querySelector('.govt-label');
            if (label && label.textContent.trim().startsWith(prefix + '.')) {
                const inp = row.querySelector('input, textarea');
                if (inp) inp.value = value != null ? value : '';
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
                if (ta) ta.value = value != null ? value : '';
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
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
                el.value = value != null ? value : '';
            }
            break;
        }
    }

    function populatePersonalSection(p, docs, experience) {
        if (!p) return;
        p = p || {};
        docs = docs || [];
        experience = experience || {};

        const photoDoc = latestDocument(docs, 'PHOTO') || (p.photo_path ? { file_path: p.photo_path, file_name: basenameFromPath(p.photo_path) } : null);
        const photoBox = document.querySelector('#pdfContent .form-header .text-end div');
        if (photoBox && photoDoc && photoDoc.file_path) {
            photoBox.innerHTML = '<img src="' + docUrl(photoDoc.file_path) + '" alt="Applicant Photo" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'">';
        }

        setInputEl('#pdfContent .form-section .govt-row:nth-child(1) .govt-value input', config.postName || '');
        setInputEl('#pdfContent .form-section .govt-row:nth-child(2) .govt-value input', p.applicant_name);
        setInputEl('#pdfContent .form-section .govt-row:nth-child(3) .govt-value input', p.bar_council_enrollement_number);
        setInputEl('#pdfContent .form-section .govt-row:nth-child(4) .govt-value input', p.bar_council_enrollement_number_senior);

        document.querySelectorAll('#pdfContent .form-section .govt-row').forEach(function (row) {
            const label = row.querySelector('.govt-label');
            if (!label) return;
            const text = label.textContent.trim();
            if (text.indexOf('3(b)') !== -1) {
                const dateInp = row.querySelector('input[type="date"]');
                if (dateInp) dateInp.value = toInputDate(p.date_of_enrollment);
                const certDoc = latestDocument(docs, 'ENROLMENT_CERTIFICATE') || (p.certificate_path ? { file_path: p.certificate_path } : null);
                if (certDoc && certDoc.file_path && !row.querySelector('.preview-btn')) {
                    const col = row.querySelector('.col-md-6:last-child') || row;
                    col.insertAdjacentHTML('beforeend', '<div class="mt-1">' + viewDocBtn(certDoc.file_path, 'View Certificate') + '</div>');
                }
            }
        });

        setGovtInputByLabel('4', p.court_pratice || p.court_practice || p.years_of_practice_hcm || '');
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
            if (addrTa) addrTa.value = address || '';
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

    function populateJudgementTables(judgements) {
        const tables = document.querySelectorAll('#pdfContent .table-govt');
        const aagTbody = tables[4] && tables[4].querySelector('tbody');
        const aagItems = [];
        const agpItems = [];
        (judgements || []).forEach(function (j) {
            if (j.category === 'AAG') (j.citations || []).forEach(function (c) { aagItems.push(c); });
            else if (j.category === 'AGP') (j.citations || []).forEach(function (c) { agpItems.push(c); });
        });

        function fill(tbody, items) {
            if (!tbody) return;
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

        fill(aagTbody, aagItems);

        if (agpItems.length) {
            let agpSection = document.getElementById('pdfAgpJudgementsMount');
            if (!agpSection && aagTbody) {
                agpSection = document.createElement('div');
                agpSection.id = 'pdfAgpJudgementsMount';
                agpSection.innerHTML = '<div class="section-title">25(b). Additional Government Pleader (last 5 years)</div>' +
                    '<div class="table-wrapper"><table class="table-govt"><thead><tr><th>Sl.No</th><th>Case Citation</th></tr></thead><tbody></tbody></table></div>';
                const aagWrap = tables[4] && tables[4].closest('.table-wrapper');
                if (aagWrap && aagWrap.parentNode) aagWrap.parentNode.insertBefore(agpSection, aagWrap.nextSibling);
            }
            const agpTbody = agpSection && agpSection.querySelector('tbody');
            fill(agpTbody, agpItems);
        }
    }

    function populateExperienceDetails(experience, docs) {
        if (!experience) return;
        docs = docs || [];

        const draftEl = document.getElementById('draftingYears');
        if (draftEl) draftEl.value = experience.drafting_experience_years != null ? experience.drafting_experience_years : '';
        setPdfSectionInput('26.', experience.drafting_experience_years != null ? String(experience.drafting_experience_years) + ' Years' : '');

        const totalBarEl = document.getElementById('totalBarYears');
        if (totalBarEl && experience.total_bar_experience_years != null) {
            totalBarEl.value = String(experience.total_bar_experience_years) + ' years';
        }

        const lawOfficerEl = document.getElementById('lawOfficerServing');
        if (lawOfficerEl) {
            const yes = experience.govt_law_officer_experience === true || experience.govt_law_officer_experience === 'true' || experience.govt_law_officer_experience === 1;
            lawOfficerEl.value = yes ? 'Yes' : 'No';
            const remarks = document.getElementById('lawOfficerRemarks');
            if (remarks) remarks.value = experience.provide_details_if_yes || '';
        }

        function fillProceeding(yesRadioId, detailsId, fields) {
            const radio = document.getElementById(yesRadioId);
            if (!radio) return;
            radio.checked = true;
            const det = document.getElementById(detailsId);
            if (det) {
                det.style.display = '';
                det.classList.remove('d-none');
            }
            const tas = det ? det.querySelectorAll('textarea') : [];
            fields.forEach(function (val, idx) { if (tas[idx]) tas[idx].value = val || ''; });
        }

        if (experience.current_facing_criminal_proceedings) {
            fillProceeding('currentProceedingYes', 'currentProceedingDetails', [
                experience.current_criminal_cases_details,
                experience.current_criminal_cases_present_status,
                experience.current_disciplinary_proceeding_details,
                experience.current_disciplinary_proceeding_present_status
            ]);
        }

        if (experience.past_facing_criminal_proceedings) {
            fillProceeding('pastProceedingYes', 'pastProceedingDetails', [
                experience.past_criminal_cases_details,
                experience.past_criminal_cases_present_status,
                experience.past_disciplinary_proceeding_details,
                experience.past_disciplinary_proceeding_present_status
            ]);
        }

        const hasAch = experience.professional_achievement && experience.professional_achievement !== 'false' && experience.professional_achievement !== false;
        if (hasAch) {
            const achSel = document.getElementById('achievmenetWrap');
            const achWrapper = document.getElementById('achievementDetailsWrapper');
            const achTa = document.getElementById('achievementDetails');
            if (achSel) achSel.value = 'Yes';
            if (achWrapper) achWrapper.classList.remove('d-none');
            if (achTa) achTa.value = experience.achievement_remarks || '';
        }

        const achDoc = latestDocument(docs, 'ACHIEVEMENT');
        const achPath = (achDoc && achDoc.file_path) || experience.achievement_support_document || '';
        if (achPath) {
            const achFilesWrap = document.getElementById('achievementDetailsWrapper');
            if (achFilesWrap && !achFilesWrap.querySelector('.preview-btn')) {
                achFilesWrap.insertAdjacentHTML('beforeend', '<div class="mt-2">' + viewDocBtn(achPath, 'View Achievement Document') + '</div>');
            }
        }
    }

    function applyPreviewDataToState(data) {
        if (!data) return;
        state.previewApiData = data;
        const p = data.personal_info || {};
        const docs = (data.documents || []).filter(function (d) { return !d.is_deleted; });
        const exp = data.experience || {};

        const photoDoc = latestDocument(docs, 'PHOTO');
        const certDoc = latestDocument(docs, 'ENROLMENT_CERTIFICATE');
        if (photoDoc) state.filePreviews.photo = docPreviewFromPath(photoDoc.file_path, photoDoc.file_name);
        else if (p.photo_path) state.filePreviews.photo = docPreviewFromPath(p.photo_path);
        if (certDoc) state.filePreviews.enrolmentCert = docPreviewFromPath(certDoc.file_path, certDoc.file_name);
        else if (p.certificate_path) state.filePreviews.enrolmentCert = docPreviewFromPath(p.certificate_path, p.certificate_name);

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
            if (b.supporting_document) state.filePreviews['bar-' + i] = docPreviewFromPath(b.supporting_document);
            return {
                id: parseInt(b.bar_practice_id || b.id, 10) || 0,
                years: String(b.years_experience != null ? b.years_experience : ''),
                from: b.from_date || '',
                to: b.to_date || '',
                barCouncil: b.bar_council_name || '',
                courtType: b.court_type || ''
            };
        });

        state.practiceItems = (data.court_practice || []).filter(function (c) { return !c.is_deleted; }).map(function (c, i) {
            if (c.practice_document) state.filePreviews['practice-' + i] = docPreviewFromPath(c.practice_document);
            return {
                courtName: c.court_name || '',
                years: String(c.years_experience != null ? c.years_experience : ''),
                from: c.from_date || '',
                to: c.to_date || ''
            };
        });

        state.judgmentAAGItems = [];
        state.judgmentAGPItems = [];
        (data.judgements || []).forEach(function (j) {
            (j.citations || []).forEach(function (c) {
                const item = {
                    caseNo: '',
                    caseDetails: c.case_citation || '',
                    judgment: c.case_title || '',
                    remarks: c.citation_type || ''
                };
                if (j.category === 'AAG') state.judgmentAAGItems.push(item);
                else if (j.category === 'AGP') state.judgmentAGPItems.push(item);
            });
        });

        if (exp.drafting_experience_years != null) {
            const draftEl = document.getElementById('draftingYears');
            if (draftEl) draftEl.value = exp.drafting_experience_years;
        }
        if (exp.total_bar_experience_years != null) {
            const totalBarEl = document.getElementById('totalBarYears');
            if (totalBarEl) totalBarEl.value = String(exp.total_bar_experience_years) + ' years';
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
        const wrapped = {
            ok: true,
            0: {
                fn_application_get_experience_details: JSON.stringify({
                    experience: data.experience || {},
                    bar_practice: data.bar_practice || [],
                    court_practice: data.court_practice || [],
                    judgements: data.judgements || []
                })
            }
        };
        AF.tab3.populateExperienceData(wrapped);
        AF.state.experienceHydrated = true;
    }

    function hydrateWizardTabsFromPreview(data) {
        data = data || state.previewApiData;
        if (!data) return;

        applyPreviewDataToState(data);

        if (AF.api && typeof AF.api.mapPreviewPersonalToForm === 'function' && AF.tab1 && AF.tab1.fillPersonal) {
            AF.tab1.fillPersonal(AF.api.mapPreviewPersonalToForm(data.personal_info || {}, data.documents || []));
        }

        if (AF.api && typeof AF.api.applyTab2QualificationsToState === 'function') {
            AF.api.applyTab2QualificationsToState({
                eduItems: AF.state.eduItems || [],
                additionalItems: AF.state.additionalItems || []
            }, { replace: true });
        }

        populateTab3FromPreview(data);

        if (AF.lists && typeof AF.lists.renderAll === 'function') {
            AF.lists.renderAll();
        }

        if (AF.files && typeof AF.files.mountAllDocPreviewButtons === 'function') {
            AF.files.mountAllDocPreviewButtons(document.querySelector('.app-container'));
        }
    }

    // DOCUMENT PREVIEW MODAL HANDLERS
    // ─────────────────────────────────────────────────────────────

    window.openPdfPreview = function (url) {
        const iframe   = document.querySelector('#filePreviewModal .file-preview-frame, #pdfPreviewModal iframe');
        const modalEl  = document.getElementById('filePreviewModal') || document.getElementById('pdfPreviewModal');
        if (iframe) iframe.src = url;
        if (modalEl && window.$) $(modalEl).modal('show');
    };

    window.openImagePreview = function (url) {
        const img     = document.querySelector('#imagePreviewModal .preview-modal-body img');
        const modalEl = document.getElementById('imagePreviewModal');
        if (img) img.src = url;
        if (modalEl && window.$) $(modalEl).modal('show');
    };

    // ─────────────────────────────────────────────────────────────
    // LOADER / ERROR UI
    // ─────────────────────────────────────────────────────────────

    function showPreviewLoader(show) {
        const container = document.querySelector('#tab4 .application-container');
        if (!container) return;
        let loader = document.getElementById('previewApiLoader');
        if (show) {
            if (!loader) {
                loader = document.createElement('div');
                loader.id = 'previewApiLoader';
                loader.style.cssText = 'position:absolute;inset:0;background:rgba(255,255,255,.75);' +
                    'display:flex;align-items:center;justify-content:center;z-index:100;border-radius:8px;';
                loader.innerHTML = '<div class="spinner-border text-primary" role="status">' +
                    '<span class="visually-hidden">Loading…</span></div>';
                container.style.position = 'relative';
                container.appendChild(loader);
            }
        } else if (loader) {
            loader.remove();
        }
    }

    function showPreviewError(message, type) {
        type = type || 'danger';
        const el = document.getElementById('previewContent');
        if (el) {
            el.innerHTML = `<div class="alert alert-${type}">` +
                `<i class="bi bi-exclamation-triangle-fill me-2"></i>${message}</div>`;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // LEGACY PREVIEW  (#previewContent card summary, form-state based)
    // FIX 7: guard every AF.tab2/tab3 call so it doesn't crash when
    //        those modules aren't loaded or the state arrays are empty.
    // ─────────────────────────────────────────────────────────────

    function generatePreview() {
        if (config.formMode === 'previewOnly' && config.existingApp?.filePreviews) {
            Object.assign(state.filePreviews, config.existingApp.filePreviews);
        }

        if (AF.tab2) {
            if (typeof AF.tab2.syncEdu        === 'function') AF.tab2.syncEdu();
            if (typeof AF.tab2.syncAdditional === 'function') AF.tab2.syncAdditional();
        }
        if (AF.tab3) {
            if (typeof AF.tab3.syncBar         === 'function') AF.tab3.syncBar();
            if (typeof AF.tab3.syncPractice    === 'function') AF.tab3.syncPractice();
            if (typeof AF.tab3.syncJudgmentAAG === 'function') AF.tab3.syncJudgmentAAG();
            if (typeof AF.tab3.syncJudgmentAGP === 'function') AF.tab3.syncJudgmentAGP();
        }
        if (AF.files && typeof AF.files.collectLiveFilePreviews === 'function') {
            AF.files.collectLiveFilePreviews();
        }

        const p          = AF.tab1 && typeof AF.tab1.getPersonalFromForm === 'function'
                            ? AF.tab1.getPersonalFromForm() : {};
        if (state.previewApiData && state.previewApiData.personal_info) {
            const apiP = state.previewApiData.personal_info;
            p.advocateName = p.advocateName || apiP.applicant_name || '';
            p.enrolmentNo = p.enrolmentNo || apiP.bar_council_enrollement_number || '';
            p.seniorEnrolmentNo = p.seniorEnrolmentNo || apiP.bar_council_enrollement_number_senior || '';
            p.enrolmentDate = p.enrolmentDate || apiP.date_of_enrollment || '';
            p.fatherName = p.fatherName || apiP.father_name || '';
            p.gender = p.gender || apiP.gender || '';
            p.dob = p.dob || apiP.dob || '';
            p.nationality = p.nationality || apiP.nationality || '';
            p.religion = p.religion || apiP.religion || '';
            p.community = p.community || apiP.community || '';
            p.subCaste = p.subCaste || apiP.sub_caste || '';
            p.yearsOfPracticeHcm = p.yearsOfPracticeHcm || apiP.court_pratice || apiP.court_practice || '';
            p.mobile = p.mobile || String(apiP.mobile_no || '');
            p.phone = p.phone || String(apiP.phone_number || '');
            p.email = p.email || apiP.email_id || '';
            p.pan = p.pan || apiP.pan_number || '';
            p.officeDistrict = p.officeDistrict || apiP.office_district || '';
            p.officePincode = p.officePincode || String(apiP.office_pincode || '');
            p.officeAddress = p.officeAddress || apiP.office_address || '';
            p.permanentDistrict = p.permanentDistrict || apiP.permanent_district || '';
            p.permanentPincode = p.permanentPincode || String(apiP.permanent_pincode || '');
            p.permanentAddress = p.permanentAddress || apiP.permanent_address || '';
        }
        const lawDegEl   = document.getElementById('lawDegreeRecognized') || document.getElementById('lawDegreeRecognized1');
        const itAssEl    = document.getElementById('itAssessee');
        const draftYEl   = document.getElementById('draftingYears');
        const totalBarEl = document.getElementById('totalBarYears');
        const court      = AF.data && typeof AF.data.getCourtBench === 'function' ? AF.data.getCourtBench() : '';
        const fp         = state.filePreviews || {};

        let html = '';

        html += '<div class="preview-card"><h4>Application Context</h4>';
        html += utils.previewTable(
            utils.previewFieldRow('Post',    config.postName) +
            utils.previewFieldRow('Job ID',  config.jobId) +
            utils.previewFieldRow('Court',   court) +
            utils.previewFieldRow('User ID', config.userId)
        ) + '</div>';

        html += '<div class="preview-card"><h4>Personal & Professional Information</h4>';
        html += utils.previewTable(
            utils.previewFieldRow('Name of Advocate',                    p.advocateName) +
            utils.previewFieldRow('Bar Council Enrolment No.',           p.enrolmentNo) +
            utils.previewFieldRow('Bar Council Enrolment No. (Senior)',  p.seniorEnrolmentNo) +
            utils.previewFieldRow('Date of Enrolment',                   p.enrolmentDate) +
            utils.previewFieldRow("Father's Name",                       p.fatherName) +
            utils.previewFieldRow('Gender',                              p.gender) +
            utils.previewFieldRow('Marital Status',                      p.maritalStatus) +
            utils.previewFieldRow('Date of Birth',                       p.dob) +
            utils.previewFieldRow('Nationality',                         p.nationality) +
            utils.previewFieldRow('Religion',                            p.religion) +
            utils.previewFieldRow('Community',                           p.community) +
            utils.previewFieldRow('Sub Caste',                           p.subCaste) +
            utils.previewFieldRow('Present Court of practice',           p.yearsOfPracticeHcm) +
            utils.previewFieldRow('Mobile',                              p.mobile) +
            utils.previewFieldRow('Phone',                               p.phone) +
            utils.previewFieldRow('Email',                               p.email) +
            utils.previewFieldRow('PAN',                                 p.pan) +
            utils.previewFieldRow('Office District',                     p.officeDistrict || p.district) +
            utils.previewFieldRow('Office Pincode',                      p.officePincode || p.pincode) +
            utils.previewFieldRow('Office Address',                      p.officeAddress) +
            utils.previewFieldRow('Permanent District',                  p.permanentDistrict) +
            utils.previewFieldRow('Permanent Pincode',                   p.permanentPincode) +
            utils.previewFieldRow('Permanent Address',                   p.permanentAddress)
        );
        html += '<div class="preview-upload-block"><span class="preview-upload-label">Photo</span>' +
            AF.files.renderDocPreview(fp.photo) + '</div>';
        html += '<div class="preview-upload-block"><span class="preview-upload-label">Enrolment Certificate</span>' +
            AF.files.renderDocPreview(fp.enrolmentCert) + '</div></div>';

        html += '<div class="preview-card"><h4>Educational Qualification</h4>';
        const eduItems = state.eduItems || [];
        if (!eduItems.length) {
            html += '<p class="text-muted mb-0">None</p>';
        } else {
            eduItems.forEach((e, i) => {
                html += `<div class="preview-sub-item"><div class="preview-sub-title">Entry ${i + 1}</div>`;
                html += utils.previewTable(
                    utils.previewFieldRow('Examination',    e.exam) +
                    utils.previewFieldRow('Year of Passing', e.year) +
                    utils.previewFieldRow('University/Board', e.board) +
                    utils.previewFieldRow('Institution',    e.institution) +
                    utils.previewFieldRow('% Marks',        e.percentage)
                );
                html += '<div class="preview-upload-block"><span class="preview-upload-label">Certificate</span>' +
                    AF.files.renderDocPreview(fp[`edu-${i}`]) + '</div></div>';
            });
        }
        html += '</div>';

        html += '<div class="preview-card"><h4>Additional Qualification</h4>';
        const addItems = state.additionalItems || [];
        if (!addItems.length) {
            html += '<p class="text-muted mb-0">None</p>';
        } else {
            addItems.forEach((a, i) => {
                html += `<div class="preview-sub-item"><div class="preview-sub-title">Entry ${i + 1}</div>`;
                html += utils.previewTable(
                    utils.previewFieldRow('Examination', a.exam) +
                    utils.previewFieldRow('Year',        a.year) +
                    utils.previewFieldRow('Board',       a.board) +
                    utils.previewFieldRow('Institution', a.institution) +
                    utils.previewFieldRow('Subject',     a.subject) +
                    utils.previewFieldRow('% Marks',     a.percentage)
                );
                html += '<div class="preview-upload-block"><span class="preview-upload-label">Certificate</span>' +
                    AF.files.renderDocPreview(fp[`add-${i}`]) + '</div></div>';
            });
        }
        html += '</div>';

        html += '<div class="preview-card"><h4>Experience Details</h4>';
        const apiExp = state.previewApiData && state.previewApiData.experience;
        const lawDegVal = lawDegEl ? lawDegEl.value : (apiExp && apiExp.law_degree_recognized != null ? (apiExp.law_degree_recognized ? 'Yes' : 'No') : '');
        html += utils.previewTable(
            utils.previewFieldRow('Law Degree recognized by Bar Council of India', lawDegVal) +
            utils.previewFieldRow('Govt Law Officer Experience', apiExp && apiExp.govt_law_officer_experience ? 'Yes' : (apiExp ? 'No' : '')) +
            utils.previewFieldRow('Law Officer Details', apiExp ? (apiExp.provide_details_if_yes || '') : '') +
            utils.previewFieldRow('Professional Achievement', apiExp && apiExp.professional_achievement && apiExp.professional_achievement !== 'false' ? 'Yes' : (apiExp ? 'No' : '')) +
            utils.previewFieldRow('Achievement Remarks', apiExp ? (apiExp.achievement_remarks || '') : '')
        );
        html += '<h5 class="preview-subheading">Total Bar Experience</h5>';
        const barItems = state.barItems || [];
        if (!barItems.length) {
            html += '<p class="text-muted">None</p>';
        } else {
            barItems.forEach((b, i) => {
                html += `<div class="preview-sub-item"><div class="preview-sub-title">Entry ${i + 1}</div>`;
                html += utils.previewTable(
                    utils.previewFieldRow('Year of Experience', b.years) +
                    utils.previewFieldRow('From',  b.from) +
                    utils.previewFieldRow('To',    b.to) +
                    utils.previewFieldRow('Bar Council', b.barCouncil)
                );
                html += '<div class="preview-upload-block"><span class="preview-upload-label">Documents</span>' +
                    AF.files.renderDocPreview(fp[`bar-${i}`]) + '</div></div>';
            });
        }
        html += utils.previewTable(
            utils.previewFieldRow('Total Years (Auto)', totalBarEl ? totalBarEl.value : '')
        );

        html += '<h5 class="preview-subheading">Practice in High Court / Madurai Bench</h5>';
        const practiceItems = state.practiceItems || [];
        if (!practiceItems.length) {
            html += '<p class="text-muted">None</p>';
        } else {
            practiceItems.forEach((pr, i) => {
                html += `<div class="preview-sub-item"><div class="preview-sub-title">Entry ${i + 1}</div>`;
                html += utils.previewTable(
                    utils.previewFieldRow('Court', pr.courtName || pr.court) +
                    utils.previewFieldRow('Year of Experience', pr.years) +
                    utils.previewFieldRow('From',  pr.from) +
                    utils.previewFieldRow('To',    pr.to)
                );
                html += '<div class="preview-upload-block"><span class="preview-upload-label">Documents</span>' +
                    AF.files.renderDocPreview(fp[`practice-${i}`]) + '</div></div>';
            });
        }

        html += '<h5 class="preview-subheading">Judgements (AAG / SGP / GP — last 7 years)</h5>';
        const aagItems = state.judgmentAAGItems || [];
        if (!aagItems.length) {
            html += '<p class="text-muted">None</p>';
        } else {
            aagItems.forEach((j, i) => {
                html += `<div class="preview-sub-item"><div class="preview-sub-title">Entry ${i + 1}</div>`;
                html += utils.previewTable(
                    utils.previewFieldRow('Case No.',     j.caseNo) +
                    utils.previewFieldRow('Case details', j.caseDetails) +
                    utils.previewFieldRow('Judgment',     j.judgment) +
                    utils.previewFieldRow('Remarks',      j.remarks)
                );
                html += '<div class="preview-upload-block"><span class="preview-upload-label">Judgement file</span>' +
                    AF.files.renderDocPreview(fp[`judgment-${i}-judgmentAAG`]) + '</div></div>';
            });
        }

        html += '<h5 class="preview-subheading">Additional Government Pleader (last 5 years)</h5>';
        const agpItems = state.judgmentAGPItems || [];
        if (!agpItems.length) {
            html += '<p class="text-muted">None</p>';
        } else {
            agpItems.forEach((j, i) => {
                html += `<div class="preview-sub-item"><div class="preview-sub-title">Entry ${i + 1}</div>`;
                html += utils.previewTable(
                    utils.previewFieldRow('Case No.',     j.caseNo) +
                    utils.previewFieldRow('Case details', j.caseDetails) +
                    utils.previewFieldRow('Judgment',     j.judgment) +
                    utils.previewFieldRow('Remarks',      j.remarks)
                );
                html += '<div class="preview-upload-block"><span class="preview-upload-label">Judgement file</span>' +
                    AF.files.renderDocPreview(fp[`judgment-${i}-judgmentAGP`]) + '</div></div>';
            });
        }

        html += '<h5 class="preview-subheading">Drafting Experience</h5>';
        html += utils.previewTable(
            utils.previewFieldRow('No. of Years', draftYEl ? draftYEl.value : '')
        );
        html += '<div class="preview-upload-block"><span class="preview-upload-label">Petitions</span>' +
            AF.files.renderDocPreview(fp.drafting) + '</div>';
        html += utils.previewTable(
            utils.previewFieldRow('Whether IT Assessee', itAssEl ? itAssEl.value : '')
        );
        html += '</div>';

        refreshDeclarationDateTime();
        const declDateEl  = document.getElementById('declDate');
        const declPlaceEl = document.getElementById('declPlace');
        const declInfo = getDeclarationApplicantInfo();
        html += '<div class="preview-card"><h4>Declaration</h4>';
        html += utils.previewTable(
            utils.previewFieldRow('Date & Time', declDateEl ? declDateEl.value : '') +
            utils.previewFieldRow('Place', declPlaceEl ? declPlaceEl.value : '') +
            utils.previewFieldRow('Name', declInfo.name) +
            utils.previewFieldRow('Mobile', declInfo.mobile) +
            utils.previewFieldRow('Bar Council No.', declInfo.enrolmentNo)
        ) + '</div>';

        if (config.existingApp?.submittedAt) {
            html += '<p class="alert alert-success mt-2">Submitted on ' +
                new Date(config.existingApp.submittedAt).toLocaleString() + '</p>';
        }

        const previewContent = document.getElementById('previewContent');
        if (previewContent) previewContent.innerHTML = html;
    }

    // ─────────────────────────────────────────────────────────────
    // MAIN LOAD ENTRY POINT
    // ─────────────────────────────────────────────────────────────

    async function loadAndPopulatePreview() {
        showPreviewLoader(true);
        let data = null;

        try {
            data = await fetchPreviewData();
        } catch (err) {
            console.error('[Tab4] fetchPreviewData error:', err);
        }

        showPreviewLoader(false);

        if (!data) {
            generatePreview();
            showPreviewError('Could not load saved data from server. Showing locally filled data instead.', 'warning');
            return;
        }
        console.log("education", data.education);
        console.log("additional_qualification", data.additional_qualification);
        console.log("experience", data.experience);
        try {
            populatePersonalSection(data.personal_info || {}, data.documents || [], data.experience || {});
            populateEducationTable(data.education || []);
            populateAdditionalQualTable(data.additional_qualification || []);
            populateLawDegreeSection(data.experience  || {});
            populateBarPracticeTable(data.bar_practice || []);
            populateCourtPracticeTable(data.court_practice || []);
            populateJudgementTables(data.judgements || []);
            populateExperienceDetails(data.experience || {}, data.documents || []);
            applyPreviewDataToState(data);
            hydrateWizardTabsFromPreview(data);
            generatePreview();
            if (AF.nav && typeof AF.nav.applySubmittedHyperlinkView === 'function') {
                AF.nav.applySubmittedHyperlinkView();
            }

        } catch (err) {
            console.error('[Tab4] Error populating preview:', err);
            showPreviewError('An error occurred while rendering the preview. Please try again.');
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
        const { jsPDF } = jsPDFLib;
        const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const element = document.getElementById('pdfContent');
        if (!element) return;

        const canvas = await html2canvas(element, {
            scale: 2, useCORS: true, logging: false, scrollY: -window.scrollY
        });

        const imgData  = canvas.toDataURL('image/jpeg', 1.0);
        const pdfW = 210, pdfH = 297;
        const imgH = canvas.height * pdfW / canvas.width;
        let left   = imgH, pos = 0;

        pdf.addImage(imgData, 'JPEG', 0, pos, pdfW, imgH);
        left -= pdfH;
        while (left > 0) {
            pos = left - imgH;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, pos, pdfW, imgH);
            left -= pdfH;
        }
        pdf.save('Law-Officers-Application.pdf');
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
            const declCheck    = document.getElementById('declarationCheck');
            const declCheck2   = document.getElementById('declarationCheck2');
            const declPlaceEl  = document.getElementById('declPlace');
            const submitMsg    = document.getElementById('submitMessage');

            if (declCheck && !declCheck.checked) {
                showSubmitMessage('<div class="alert alert-danger">Please accept the declaration.</div>');
                return;
            }

            if (declCheck2 && !declCheck2.checked) {
                showSubmitMessage('<div class="alert alert-danger">Please confirm that you have read the 2017 Rules and fulfill the qualification.</div>');
                return;
            }

            if (declPlaceEl && !declPlaceEl.value.trim()) {
                showSubmitMessage('<div class="alert alert-danger">Please enter Place in the declaration.</div>');
                declPlaceEl.focus();
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

        const prevBtn = document.getElementById('prevToTab3');
        if (prevBtn) prevBtn.addEventListener('click', () => AF.nav.switchTab(3));

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
    }

    AF.tab4 = {
        init,
        generatePreview,
        loadAndPopulatePreview,
        hydrateWizardTabsFromPreview,
        downloadPDF,
        refreshDeclarationFields,
        getDeclarationSignatureText
    };

// FIX 5: pass `window` as second arg so `global` is defined inside the IIFE
})(window.ApplicationForm, window);