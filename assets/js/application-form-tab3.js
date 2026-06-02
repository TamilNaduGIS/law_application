/**
 * Tab 3: Experience Details - With File Upload Support (Subfolder Structure)
 */
(function (AF, global) {
    'use strict';

    const escapeHtml = AF.utils.escapeHtml;
    let initDone = false;
    let tab3Saving = false;
    let citationRendering = false;
    let citationHandlersBound = false;

    const CITATION_MAX_ROWS = 30;
    const EXPERIENCE_TOOLTIP_TEXT = 'Experience is calculated based on the selected From Date and To Date. Only completed years are considered. Any fractional value is ignored. For example, 3.99 years will be displayed as 3 years, and values below 1 year will be displayed as 0 years.';

    const CITATION_SECTIONS = {
        aag: {
            kind: 'aag',
            listId: 'judgmentAAGCiteList',
            stateKey: 'judgmentAAGCitations',
            inputName: 'judgment_aag_citation'
        },
        agp: {
            kind: 'agp',
            listId: 'judgmentAGPCiteList',
            stateKey: 'judgmentAGPCitations',
            inputName: 'judgment_agp_citation'
        }
    };

    function nextCitationId(kind) {
        return 'cite-' + kind + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    }

    function citationEntryValue(entry) {
        if (entry && typeof entry === 'object') {
            return entry.value != null ? String(entry.value) : '';
        }
        return entry != null ? String(entry) : '';
    }

    function normalizeCitationEntry(entry, kind) {
        if (entry && typeof entry === 'object' && entry.id) {
            return {
                id: String(entry.id),
                value: citationEntryValue(entry)
            };
        }
        return {
            id: nextCitationId(kind),
            value: citationEntryValue(entry)
        };
    }

    function normalizeCitationList(list, kind) {
        if (!list || !list.length) {
            return [{ id: nextCitationId(kind), value: '' }];
        }
        return list.map(function (entry) {
            return normalizeCitationEntry(entry, kind);
        });
    }

    /** Escape text for HTML attribute values (e.g. citation input value). */
    function escapeAttr(str) {
        if (str == null) {
            return '';
        }
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // Counter for unique IDs
    let barSectionCounter = 1;
    let practiceSectionCounter = 1;
    let uploadedAchievementDocumentPath = null;
    let uploadedAchievementDocumentName = null;
    // Helper function to convert Yes/No to boolean
    function toBoolean(value) {
        if (value === undefined || value === null || value === '') return null;
        const strValue = String(value).toLowerCase().trim();
        if (strValue === 'yes' || strValue === 'true' || strValue === '1') return true;
        if (strValue === 'no' || strValue === 'false' || strValue === '0') return false;
        return null;
    }

    // Helper function to trim string
    function trimStr(val) {
        return val != null ? String(val).trim() : '';
    }

    /** Experience year fields: digits only, max 2 characters (0–99). */
    function normalizeExperienceYearsInput(val) {
        return String(val != null ? val : '').replace(/\D/g, '').slice(0, 2);
    }

    function formatExperienceYearsForDisplay(val) {
        const s = trimStr(val);
        if (!s) return '';
        const num = parseFloat(s);
        if (!isNaN(num)) {
            if (num > 99) return '99';
            return normalizeExperienceYearsInput(String(Math.floor(num)));
        }
        return normalizeExperienceYearsInput(s);
    }

    function parseExperienceYears(val) {
        const s = normalizeExperienceYearsInput(trimStr(val));
        if (!s) return NaN;
        const num = parseInt(s, 10);
        return isNaN(num) ? NaN : num;
    }

    function buildExperienceInfoIconHtml() {
        return '<span class="experience-info-icon ms-1" role="button" tabindex="0" aria-label="Experience calculation info" data-experience-tooltip="true" data-bs-toggle="tooltip" data-bs-trigger="hover focus" data-bs-placement="top" title="' + escapeAttr(EXPERIENCE_TOOLTIP_TEXT) + '"><i class="bi bi-info-circle"></i></span>';
    }

    function initExperienceTooltips(root) {
        if (!global.bootstrap || typeof global.bootstrap.Tooltip !== 'function') {
            return;
        }
        const scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll('[data-experience-tooltip="true"]').forEach(function (el) {
            if (el.getAttribute('data-tooltip-initialized') === '1') {
                return;
            }
            global.bootstrap.Tooltip.getOrCreateInstance(el, {
                trigger: 'hover focus',
                container: 'body'
            });
            el.setAttribute('data-tooltip-initialized', '1');
        });
    }

    function parseLocalDate(value) {
        if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return null;
        }
        const parts = value.split('-').map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function yearsBetweenDates(fromStr, toStr) {
        const from = parseLocalDate(fromStr);
        const to = parseLocalDate(toStr);
        if (!from || !to) {
            return null;
        }
        from.setHours(0, 0, 0, 0);
        to.setHours(0, 0, 0, 0);
        if (to < from) {
            return null;
        }
        const diffDays = (to - from) / (1000 * 60 * 60 * 24);
        return Math.max(0, Math.round((diffDays / 365.25) * 100) / 100);
    }

    function formatCalculatedYears(years) {
        if (years == null || isNaN(years)) {
            return '';
        }
        const capped = Math.min(Math.max(Math.floor(years), 0), 99);
        return String(capped);
    }

    function dateToIsoLocal(d) {
        if (!(d instanceof Date) || isNaN(d.getTime())) {
            return '';
        }
        const pad = function (n) { return String(n).padStart(2, '0'); };
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    function getEnrolmentDateIso() {
        let raw = '';
        const el = document.getElementById('enrolmentDate');
        if (el && el.value) {
            raw = trimStr(el.value);
        }
        if (!raw && AF.tab1 && typeof AF.tab1.getPersonalFromForm === 'function') {
            raw = trimStr((AF.tab1.getPersonalFromForm() || {}).enrolmentDate);
        }
        if (!raw) {
            raw = trimStr(global.sessionStorage.getItem('enrolmentDate') || '');
        }
        if (!raw || !parseLocalDate(raw)) {
            return '';
        }
        return raw.slice(0, 10);
    }

    function getMaxEligibleBarYears() {
        const enrol = getEnrolmentDateIso();
        if (!enrol) {
            return null;
        }
        return yearsBetweenDates(enrol, getTodayIsoLocal());
    }

    function hasBarDocumentUploaded($item) {
        if (!$item || !$item.length) {
            return false;
        }
        if (trimStr($item.data('supporting-document'))) {
            return true;
        }
        const input = $item.find('.bar-doc-file')[0];
        if (input && input.files && input.files[0]) {
            return true;
        }
        const idx = $('#barExpContainer .bar-item').index($item);
        const preview = AF.state.filePreviews && AF.state.filePreviews['bar-' + idx];
        return !!(preview && (preview.url || preview.dataUrl || preview.name));
    }

    function collectBarPracticeRanges() {
        const ranges = [];
        $('#barExpContainer .bar-item').each(function (index) {
            const $item = $(this);
            const from = trimStr($item.find('.bar-from').val());
            const to = trimStr($item.find('.bar-to').val());
            if (!from || !to) {
                return;
            }
            const fromDt = parseLocalDate(from);
            const toDt = parseLocalDate(to);
            if (!fromDt || !toDt) {
                return;
            }
            ranges.push({
                index: index,
                $item: $item,
                from: from,
                to: to,
                fromTime: fromDt.getTime(),
                toTime: toDt.getTime(),
                courtType: trimStr($item.find('.bar-court-type').val())
            });
        });
        return ranges;
    }

    function rangesOverlap(a, b) {
        return a.fromTime <= b.toTime && b.fromTime <= a.toTime;
    }

    function mergeBarDateRanges(ranges) {
        if (!ranges.length) {
            return [];
        }
        const sorted = ranges.slice().sort(function (a, b) {
            return a.fromTime - b.fromTime;
        });
        const merged = [{
            fromTime: sorted[0].fromTime,
            toTime: sorted[0].toTime,
            courtTypes: { [sorted[0].courtType]: true }
        }];
        for (let i = 1; i < sorted.length; i++) {
            const cur = sorted[i];
            const last = merged[merged.length - 1];
            if (cur.fromTime <= last.toTime) {
                last.toTime = Math.max(last.toTime, cur.toTime);
                if (cur.courtType) {
                    last.courtTypes[cur.courtType] = true;
                }
            } else {
                merged.push({
                    fromTime: cur.fromTime,
                    toTime: cur.toTime,
                    courtTypes: { [cur.courtType]: true }
                });
            }
        }
        return merged;
    }

    function sumYearsFromMergedRanges(merged) {
        let total = 0;
        merged.forEach(function (m) {
            const y = yearsBetweenDates(dateToIsoLocal(new Date(m.fromTime)), dateToIsoLocal(new Date(m.toTime)));
            if (y != null) {
                total += y;
            }
        });
        return Math.round(total * 100) / 100;
    }

    function sumHighCourtYearsFromRanges(ranges) {
        const hcRanges = ranges.filter(function (r) {
            return r.courtType === 'High Court';
        });
        return sumYearsFromMergedRanges(mergeBarDateRanges(hcRanges));
    }

    function isBarRecordStarted($item) {
        const from = trimStr($item.find('.bar-from').val());
        const to = trimStr($item.find('.bar-to').val());
        const council = trimStr($item.find('.bar-council').val());
        const courtType = trimStr($item.find('.bar-court-type').val());
        const years = getYearsFromField($item.find('.bar-years'));
        return !!(from || to || council || courtType || years || hasBarDocumentUploaded($item));
    }

    let lastTab3ToastKey = '';
    let lastTab3ToastAt = 0;

    function showTab3ToastOnce(key, message) {
        const text = message != null ? String(message).trim() : '';
        if (!text) {
            return;
        }
        const now = Date.now();
        if (key && key === lastTab3ToastKey && now - lastTab3ToastAt < 2500) {
            return;
        }
        lastTab3ToastKey = key || text;
        lastTab3ToastAt = now;
        showTab3Toast(text);
    }

    function getTodayIsoLocal() {
        const t = new Date();
        const pad = function (n) { return String(n).padStart(2, '0'); };
        return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
    }

    function getExperienceItemLabel($item) {
        if ($item.hasClass('bar-item')) {
            return 'Bar Practice #' + ($('#barExpContainer .bar-item').index($item) + 1);
        }
        return 'Court Practice #' + ($('#courtPracticeContainer .practice-item').index($item) + 1);
    }

    function getYearsFromField($yearsEl) {
        return trimStr($yearsEl.val());
    }

    const MSG = {
        fromAfterTo: 'From Date cannot be later than To Date.',
        futureDates: 'Future dates are not allowed.',
        
        overlap: 'Date range overlaps with another Bar Practice Experience entry.',
        duplicateDates: 'The same From Date and To Date combination already exists in another entry.',
        enrollmentCap: 'Total experience cannot exceed the period from Bar Council enrollment date.',
        courtTypeRequired: 'Court Type must be selected before saving the experience record.',
        councilRequired: 'Bar Council / Court name cannot be empty.',
        documentRequired: 'Supporting certificate/document must be uploaded for every experience record.'
    };

    /**
     * Bar Practice: dates, auto years, min experience.
     */
    function validateBarPracticeItemDates($item, options) {
        options = options || {};
        const showToast = options.showToast !== false;
        if (!$item || !$item.length) {
            return { ok: true };
        }

        const label = getExperienceItemLabel($item);
        const $from = $item.find('.bar-from');
        const $to = $item.find('.bar-to');
        const $years = $item.find('.bar-years');
        const fromDate = trimStr($from.val());
        const toDate = trimStr($to.val());
        const today = getTodayIsoLocal();

        function markInvalid($el) {
            if ($el && $el.length) {
                $el.addClass('is-invalid');
            }
        }

        function fail(message, $field) {
            markInvalid($field);
            if (showToast) {
                showTab3ToastOnce(label + ':' + message, message);
            }
            return { ok: false, message: message };
        }

        $from.removeClass('is-invalid');
        $to.removeClass('is-invalid');
        $years.removeClass('is-invalid');
        $item.find('.date-error-message').remove();

        const enrolMin = getEnrolmentDateIso();
        $to.attr('min', fromDate || enrolMin || '');
        $from.attr('max', toDate && toDate <= today ? toDate : today);
        $to.attr('max', today);
        if (enrolMin) {
            $from.attr('min', enrolMin);
        }

        if (fromDate && fromDate > today) {
            return fail(MSG.futureDates, $from);
        }
        if (toDate && toDate > today) {
            return fail(MSG.futureDates, $to);
        }

        if (fromDate && !toDate) {
            $years.val('');
            markInvalid($to);
            if (showToast) {
                showTab3ToastOnce(label + ':to-required', label + ': Please enter To Date.');
            }
            return { ok: false, message: 'To Date is required.' };
        }

        if (!fromDate && toDate) {
            $years.val('');
            if (showToast) {
                showTab3ToastOnce(label + ':from-required', label + ': Please enter From Date.');
            }
            return fail('Please enter From Date.', $from);
        }

        if (!fromDate || !toDate) {
            $years.val('');
            recalculateTotalYears();
            return { ok: true };
        }

        if (!parseLocalDate(fromDate) || !parseLocalDate(toDate)) {
            $years.val('');
            return fail(MSG.futureDates, $from);
        }

        const fromDt = parseLocalDate(fromDate);
        const toDt = parseLocalDate(toDate);
        if (fromDt > toDt) {
            $years.val('');
            $to.after('<div class="invalid-feedback date-error-message d-block">' + MSG.fromAfterTo + '</div>');
            return fail(MSG.fromAfterTo, $from);
        }

        const years = yearsBetweenDates(fromDate, toDate);
        if (years === null || years <= 0) {
            $years.val('');
            return fail(MSG.minExperience, $years);
        }

        $years.val(formatCalculatedYears(years));
        $years.removeClass('is-invalid');
        recalculateTotalYears();
        return { ok: true };
    }

    /** Overlap, duplicate, enrollment cap (all bar rows). */
    function validateBarPracticeCrossRules(options) {
        options = options || {};
        const showToast = options.showToast !== false;
        const ranges = collectBarPracticeRanges();

        for (let i = 0; i < ranges.length; i++) {
            for (let j = i + 1; j < ranges.length; j++) {
                const a = ranges[i];
                const b = ranges[j];
                if (a.from === b.from && a.to === b.to) {
                    if (showToast) {
                        showTab3ToastOnce('bar-duplicate', MSG.duplicateDates);
                    }
                    markBarItemsInvalid([a.$item, b.$item]);
                    return { ok: false, message: MSG.duplicateDates };
                }
                if (rangesOverlap(a, b)) {
                    if (showToast) {
                        showTab3ToastOnce('bar-overlap', MSG.overlap);
                    }
                    markBarItemsInvalid([a.$item, b.$item]);
                    return { ok: false, message: MSG.overlap };
                }
            }
        }

        const mergedTotal = sumYearsFromMergedRanges(mergeBarDateRanges(ranges));
        const maxEligible = getMaxEligibleBarYears();
        if (maxEligible != null && mergedTotal > maxEligible + 0.001) {
            if (showToast) {
                showTab3ToastOnce('bar-enrollment-cap', MSG.enrollmentCap);
            }
            return { ok: false, message: MSG.enrollmentCap };
        }

        return { ok: true };
    }

    function markBarItemsInvalid(items) {
        (items || []).forEach(function ($item) {
            if ($item && $item.length) {
                $item.find('.bar-from, .bar-to, .bar-years').addClass('is-invalid');
            }
        });
    }

    function validateBarPracticeRecordFields($item, options) {
        options = options || {};
        const showToast = options.showToast !== false;
        const label = getExperienceItemLabel($item);
        const courtType = trimStr($item.find('.bar-court-type').val());
        const council = trimStr($item.find('.bar-council').val());

        if (!courtType) {
            $item.find('.bar-court-type').addClass('is-invalid');
            if (showToast) {
                showTab3ToastOnce(label + ':court', MSG.courtTypeRequired);
            }
            return { ok: false, message: MSG.courtTypeRequired };
        }
        $item.find('.bar-court-type').removeClass('is-invalid');

        if (!council) {
            $item.find('.bar-council').addClass('is-invalid');
            if (showToast) {
                showTab3ToastOnce(label + ':council', MSG.councilRequired);
            }
            return { ok: false, message: MSG.councilRequired };
        }
        $item.find('.bar-council').removeClass('is-invalid');

        if (!hasBarDocumentUploaded($item)) {
            $item.find('.cert-upload-strip').addClass('is-invalid');
            if (showToast) {
                showTab3ToastOnce(label + ':doc', MSG.documentRequired);
            }
            return { ok: false, message: MSG.documentRequired };
        }
        $item.find('.cert-upload-strip').removeClass('is-invalid');

        return { ok: true };
    }

    function validateBarPracticeRow($item, options) {
        options = options || {};
        const showToast = options.showToast !== false;
        if (!isBarRecordStarted($item)) {
            return { ok: true };
        }
        const label = getExperienceItemLabel($item);
        const from = trimStr($item.find('.bar-from').val());
        const to = trimStr($item.find('.bar-to').val());

        if (!from || !to) {
            if (showToast) {
                showTab3ToastOnce(label + ':dates-required', label + ': Please enter From Date and To Date.');
            }
            if (!from) {
                $item.find('.bar-from').addClass('is-invalid');
            }
            if (!to) {
                $item.find('.bar-to').addClass('is-invalid');
            }
            return { ok: false, message: 'Dates required.' };
        }

        const dateResult = validateBarPracticeItemDates($item, options);
        if (!dateResult.ok) {
            return dateResult;
        }

        return validateBarPracticeRecordFields($item, options);
    }

    function validateAllBarPracticeRecords(options) {
        options = options || {};
        let hasAny = false;
        let allOk = true;

        $('#barExpContainer .bar-item').each(function () {
            const $item = $(this);
            if (!isBarRecordStarted($item)) {
                return;
            }
            hasAny = true;
            const rowResult = validateBarPracticeRow($item, options);
            if (!rowResult.ok) {
                allOk = false;
                return false;
            }
        });

        if (!hasAny) {
            if (options.showToast !== false) {
                showTab3Toast('Please fill at least one Bar Practice Experience with valid data.');
            }
            return { ok: false, message: 'No bar practice records.' };
        }

        if (!allOk) {
            return { ok: false };
        }

        return validateBarPracticeCrossRules(options);
    }

    /** Court practice rows — basic date rules only. */
    function validateExperienceItemDates($item, options) {
        if ($item && $item.hasClass('bar-item')) {
            return validateBarPracticeItemDates($item, options);
        }

        options = options || {};
        const showToast = options.showToast !== false;
        if (!$item || !$item.length) {
            return { ok: true };
        }

        const label = getExperienceItemLabel($item);
        const $from = $item.find('.practice-from');
        const $to = $item.find('.practice-to');
        const $years = $item.find('.practice-years');
        const fromDate = trimStr($from.val());
        const toDate = trimStr($to.val());
        const today = getTodayIsoLocal();

        function fail(message, $field) {
            if ($field) {
                $field.addClass('is-invalid');
            }
            if (showToast) {
                showTab3ToastOnce(label + ':' + message, label + ': ' + message);
            }
            return { ok: false, message: message };
        }

        $from.removeClass('is-invalid');
        $to.removeClass('is-invalid');
        $years.removeClass('is-invalid');
        $item.find('.date-error-message').remove();

        if (fromDate && fromDate > today) {
            return fail(MSG.futureDates, $from);
        }
        if (toDate && toDate > today) {
            return fail(MSG.futureDates, $to);
        }

        if (fromDate && toDate) {
            const fromDt = parseLocalDate(fromDate);
            const toDt = parseLocalDate(toDate);
            if (!fromDt || !toDt || fromDt > toDt) {
                $years.val('');
                return fail(MSG.fromAfterTo, $from);
            }
            const years = yearsBetweenDates(fromDate, toDate);
            $years.val(years != null ? formatCalculatedYears(years) : '');
        } else {
            $years.val('');
        }

        return { ok: true };
    }

    function updateItemExperienceYears($item) {
        if ($item && $item.hasClass('bar-item')) {
            const result = validateBarPracticeItemDates($item, { showToast: false });
            if (result.ok) {
                validateBarPracticeCrossRules({ showToast: false });
            }
            return result.ok;
        }
        const result = validateExperienceItemDates($item, { showToast: false });
        return result.ok;
    }

    function updateBarRemoveButtonVisibility() {
        $('#barExpContainer .bar-item').each(function (index) {
            $(this).find('.bar-remove-btn').toggleClass('d-none', index === 0);
        });
    }

    function updatePracticeRemoveButtonVisibility() {
        $('#courtPracticeContainer .practice-item').each(function (index) {
            $(this).find('.practice-remove-btn').toggleClass('d-none', index === 0);
        });
    }

    /** Same certificate upload UI as Tab 2 (edu-upload-compact / cert-upload-strip). */
    function renderCertUploadBlock(inputId, inputClass, labelTitle) {
        const title = labelTitle || 'Certificate';
        const idAttr = inputId ? ' id="' + escapeHtml(inputId) + '"' : '';
        return (
            '<div class="cert-upload-strip file-upload-host">' +
            getDocUploadHintHtml() +
            '<p class="upload-field-error small mb-2" role="alert" hidden></p>' +
            '<div class="upload-pick-panel">' +
            '<label class="edu-upload-box edu-upload-compact" role="button" tabindex="0">' +
            '<input type="file"' + idAttr + ' class="edu-upload-input ' + escapeHtml(inputClass) + '" accept="' + getDocUploadAccept() + '">' +
            '<div class="edu-upload-content">' +
            '<span class="edu-upload-icon"><i class="bi bi-file-earmark-arrow-up-fill"></i></span>' +
            '<span class="edu-upload-title">' + escapeHtml(title) + '</span>' +
            '<span class="edu-upload-btn"><i class="bi bi-cloud-upload-fill"></i>Choose</span>' +
            '</div></label></div>' +
            getSelectedPanelHtml() +
            '</div>'
        );
    }

    function bindTab3UploadKeyboard(container) {
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

    function initTab3UploadUi(root) {
        const scope = root || document.getElementById('tab3');
        if (!scope) {
            return;
        }
        const today = getTodayIsoLocal();
        const dateInputs = scope.querySelectorAll ? scope.querySelectorAll('input[type="date"]') : [];
        dateInputs.forEach(function (input) {
            input.setAttribute('max', today);
        });
        bindTab3UploadKeyboard(scope);
        refreshTab3FileInputs(scope);
        if (scope.querySelectorAll) {
            scope.querySelectorAll('input[type="file"]').forEach(function (input) {
                if (AF.files && typeof AF.files.ensureUploadHostForInput === 'function') {
                    AF.files.ensureUploadHostForInput(input);
                }
            });
        }
    }

    function showTab3Toast(message) {
        const text = message != null ? String(message).trim() : '';
        if (!text) {
            return;
        }
        if (AF.utils && typeof AF.utils.showToast === 'function') {
            AF.utils.showToast(text, 'error');
        } else {
            alert(text);
        }
    }

    function getDocUploadHintHtml() {
        if (AF.files && typeof AF.files.getUploadHintHtml === 'function') {
            return AF.files.getUploadHintHtml('certificate');
        }
        return '<p class="upload-field-hint small mb-2">Allowed formats: JPG, JPEG, PNG or PDF only. Maximum file size: 5 MB.</p>' +
            '<p class="upload-field-error small mb-2" role="alert" hidden></p>';
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

    function initAchievementUploadUi() {
        const mount = document.getElementById('achievementFilesMount');
        if (!mount || mount.getAttribute('data-achievement-upload-init') === '1') {
            return;
        }
        mount.setAttribute('data-achievement-upload-init', '1');
        mount.innerHTML = renderCertUploadBlock('achievementFiles', 'achievement-doc-file', 'Certificate');
        const input = document.getElementById('achievementFiles');
        if (input) {
            input.removeAttribute('multiple');
        }
        initTab3UploadUi(mount);
    }

    function refreshTab3FileInputs(root) {
        if (AF.files && typeof AF.files.refreshFileUploadRules === 'function') {
            AF.files.refreshFileUploadRules(root || document.getElementById('tab3'));
        }
    }

    // Convert file to base64
    function fileToBase64(file) {
        return new Promise(function (resolve, reject) {
            const reader = new FileReader();
            reader.onload = function () {
                resolve(typeof reader.result === 'string' ? reader.result : '');
            };
            reader.onerror = function () {
                reject(new Error('Failed to read file.'));
            };
            reader.readAsDataURL(file);
        });
    }

    // Upload document with subfolder support
    function uploadDocument(documentType, file, subFolder) {
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.reject(new Error('API client is not loaded.'));
        }

        const applicantId = getApplicantId();
        const applicationId = getApplicationId();

        if (!applicationId && !applicantId) {
            return Promise.reject(new Error('Application ID is missing.'));
        }

        const appId = applicationId || parseInt(applicantId, 10);

        return fileToBase64(file).then(function (content) {
            const payload = {
                applicant_id: applicantId,
                application_id: appId,
                document_type: documentType,
                file_name: file.name,
                file_content: content,
                sub_folder: subFolder || 'experience',
                uploaded_by: parseInt(applicantId, 10)
            };

            console.log('[Tab3] Uploading document:', documentType, 'to folder:', subFolder);

            return ensureSessionTokens().then(function () {
                return global.LawPortal.apiRequest(
                    'vacancy/document/upload',
                    'POST',
                    payload
                );
            });
        }).then(function (res) {
            const body = unwrapApiResult(res);
            if (!body.ok) {
                throw new Error(body.error || 'Document upload failed (' + documentType + ').');
            }
            console.log('[Tab3] Document uploaded successfully:', body);
            return body;
        });
    }

    // Ensure session tokens
    function ensureSessionTokens() {
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.resolve();
        }
        if (global.sessionStorage.getItem('encryption_key') && global.sessionStorage.getItem('csrf_token')) {
            return Promise.resolve();
        }
        return global.LawPortal.apiRequest('getTOKENS', 'GET').then(function (res) {
            if (res && res.encryption_key) {
                global.sessionStorage.setItem('encryption_key', res.encryption_key);
            }
            if (res && res.csrf_token) {
                global.sessionStorage.setItem('csrf_token', res.csrf_token);
            }
        }).catch(function () { /* optional */ });
    }

    // Unwrap API result
    function unwrapApiResult(res) {
        if (!res) {
            return { ok: false, error: 'Empty response from server.' };
        }
        if (global.SecureAPI && typeof global.SecureAPI.unwrapResponse === 'function') {
            res = global.SecureAPI.unwrapResponse(res) || res;
        }
        const expRow = res && (res['0'] || res[0]);
        if (res && (res.experience || res.bar_practice || (expRow && expRow.fn_application_get_experience_details))) {
            if (res.ok === undefined) {
                res.ok = true;
            }
            return res;
        }
        if (res.ok === false || res.error) {
            return { ok: false, error: res.error || res.message || 'Request failed.' };
        }
        return res;
    }

    function buildDocUrl(filePath) {
        if (!filePath) {
            return '';
        }
        const p = String(filePath).replace(/\\/g, '/');
        if (/^https?:\/\//i.test(p)) {
            return p;
        }
        let base = '';
        if (global.LawPortal && global.LawPortal.secureApiBase) {
            base = String(global.LawPortal.secureApiBase).replace(/\/?$/, '/');
        } else if (global.LawPortal && global.LawPortal.apiBase) {
            base = String(global.LawPortal.apiBase).replace(/\/api\/?$/, '/').replace(/\/?$/, '/');
        } else {
            const marker = '/law_v4';
            const pathname = global.location.pathname.replace(/\\/g, '/');
            const idx = pathname.toLowerCase().indexOf(marker);
            base = idx !== -1
                ? global.location.origin + pathname.substring(0, idx + marker.length) + '/backend/public/'
                : new URL('backend/public/', global.location.href).href.replace(/\/?$/, '/');
        }
        return base + p.replace(/^\//, '');
    }

    function basenameFromPath(path) {
        if (!path) {
            return '';
        }
        const parts = String(path).replace(/\\/g, '/').split('/');
        return parts[parts.length - 1] || '';
    }

    function docPreviewFromPath(path, fileName) {
        if (!path) {
            return null;
        }
        const url = buildDocUrl(path);
        if (!url) {
            return null;
        }
        return {
            url: url,
            name: fileName || basenameFromPath(path),
            isExisting: true
        };
    }

    function trimExperienceStr(val) {
        return val == null ? '' : String(val).trim();
    }

    function resolveExperienceDocumentDisplay(type, item, index) {
        const previewKey = (type === 'bar' ? 'bar-' : 'practice-') + index;
        const preview = AF.state.filePreviews && AF.state.filePreviews[previewKey];
        const serverPath = type === 'bar'
            ? trimExperienceStr(item.supporting_document || item.supportingDocument)
            : trimExperienceStr(item.practice_document || item.practiceDocument);
        if (serverPath) {
            return { path: serverPath, serverPath: serverPath, preview: preview, previewKey: previewKey };
        }
        if (preview) {
            const media = AF.files && typeof AF.files.getPreviewMediaUrl === 'function'
                ? AF.files.getPreviewMediaUrl(preview)
                : '';
            const path = media || preview.url || preview.dataUrl || '';
            if (path) {
                return { path: path, serverPath: '', preview: preview, previewKey: previewKey };
            }
        }
        return { path: '', serverPath: '', preview: preview, previewKey: previewKey };
    }

    function applyExistingUploadUi(hostEl, filePath, options) {
        if (!hostEl || !filePath) {
            return;
        }
        options = options || {};
        const preview = options.preview;
        const fileName = (preview && preview.name) || basenameFromPath(filePath);
        const fileInput = hostEl.querySelector('input[type="file"]');
        if (AF.files && typeof AF.files.showFileUploadSelected === 'function' && fileInput) {
            AF.files.showFileUploadSelected(fileInput, fileName, { replaceReady: true });
        }
        if (options.serverPath && options.type === 'bar') {
            $(hostEl).closest('.bar-item').data('supporting-document', options.serverPath);
        } else if (options.serverPath && options.type === 'practice') {
            $(hostEl).closest('.practice-item').data('practice-document', options.serverPath);
        }
    }

    function applyProceedingRadios(isYes, yesId, noId, detailsSelector, fieldMap) {
        const $details = $(detailsSelector);
        fieldMap = fieldMap || {};
        $details.find('textarea').eq(0).val(fieldMap.criminal_details || '');
        $details.find('textarea').eq(1).val(fieldMap.criminal_status || '');
        $details.find('textarea').eq(2).val(fieldMap.disciplinary_details || '');
        $details.find('textarea').eq(3).val(fieldMap.disciplinary_status || '');
        $(yesId + ', ' + noId).prop('checked', false);
        if (isYes) {
            $(yesId).prop('checked', true);
        } else {
            $(noId).prop('checked', true);
        }
        $(yesId + ', ' + noId).first().trigger('change');
    }

    // Get applicant ID
    function getApplicantId() {
        if (AF.config && AF.config.userId) {
            return String(AF.config.userId).trim();
        }
        const session = global.AppData && typeof global.AppData.getSession === 'function'
            ? global.AppData.getSession()
            : null;
        if (session) {
            return String(session.applicantId || session.userId || '').trim();
        }
        return String(global.sessionStorage.getItem('applicantId') || '').trim();
    }

    // Get application ID
    function getApplicationId() {
        const applicantId = getApplicantId();
        const storedAppId = global.sessionStorage.getItem('applicationId');
        if (storedAppId) {
            const parsed = parseInt(storedAppId, 10);
            if (!isNaN(parsed) && parsed > 0) {
                return parsed;
            }
        }
        const parsedApplicant = parseInt(applicantId, 10);
        return !isNaN(parsedApplicant) && parsedApplicant > 0 ? parsedApplicant : 0;
    }

    // Build meta data for save
    function buildExperienceSaveMeta() {
        const applicantId = parseInt(getApplicantId(), 10) || 0;
        return {
            applicant_id: applicantId,
            created_by: applicantId
        };
    }

    function parseBarPracticeYears(item) {
        const y = parseExperienceYears(item.years ?? item.years_experience);
        return isNaN(y) ? 0 : y;
    }

    function ensureDeletedPracticeState() {
        if (!AF.state.deletedBarPractices) {
            AF.state.deletedBarPractices = [];
        }
        if (!AF.state.deletedCourtPractices) {
            AF.state.deletedCourtPractices = [];
        }
    }

    function recordDeletedBarPractice($item) {
        if (!$item || !$item.length) {
            return;
        }
        const practiceId = parseInt($item.data('bar-practice-id'), 10) || 0;
        if (practiceId <= 0) {
            return;
        }
        ensureDeletedPracticeState();
        const exists = AF.state.deletedBarPractices.some(function (row) {
            return (parseInt(row.id ?? row.bar_practice_id, 10) || 0) === practiceId;
        });
        if (exists) {
            return;
        }
        AF.state.deletedBarPractices.push({
            id: practiceId,
            bar_practice_id: practiceId,
            years: ($item.find('.bar-years').val() || '').trim(),
            from_date: $item.find('.bar-from').val() || null,
            to_date: $item.find('.bar-to').val() || null,
            court_type: ($item.find('.bar-court-type').val() || '').trim(),
            bar_council: ($item.find('.bar-council').val() || '').trim(),
            supporting_document: $item.data('supporting-document') || '',
            is_deleted: true
        });
        const idx = parseInt($item.index(), 10);
        if (!isNaN(idx) && AF.state.filePreviews && AF.state.filePreviews['bar-' + idx]) {
            delete AF.state.filePreviews['bar-' + idx];
        }
    }

    function recordDeletedCourtPractice($item) {
        if (!$item || !$item.length) {
            return;
        }
        const practiceId = parseInt($item.data('court-practice-id'), 10) || 0;
        if (practiceId <= 0) {
            return;
        }
        ensureDeletedPracticeState();
        const exists = AF.state.deletedCourtPractices.some(function (row) {
            return (parseInt(row.id ?? row.court_practice_id, 10) || 0) === practiceId;
        });
        if (exists) {
            return;
        }
        AF.state.deletedCourtPractices.push({
            id: practiceId,
            court_practice_id: practiceId,
            court_name: ($item.find('.practice-court').val() || '').trim(),
            years: ($item.find('.practice-years').val() || '').trim(),
            from_date: $item.find('.practice-from').val() || null,
            to_date: $item.find('.practice-to').val() || null,
            practice_document: $item.data('practice-document') || '',
            is_deleted: true
        });
        const idx = parseInt($item.index(), 10);
        if (!isNaN(idx) && AF.state.filePreviews && AF.state.filePreviews['practice-' + idx]) {
            delete AF.state.filePreviews['practice-' + idx];
        }
    }

    // Transform bar practice item to payload (API sample format)
    function mapBarPracticeToPayload(item) {
        const practiceId = parseInt(item.id ?? item.bar_practice_id, 10);
        const deleted = !!item.is_deleted;
        return {
            bar_practice_id: !isNaN(practiceId) && practiceId > 0 ? practiceId : 0,
            court_type: trimStr(item.court_type || item.courtType) || '',
            years_experience: deleted ? 0 : parseBarPracticeYears(item),
            from_date: item.from_date || null,
            to_date: item.to_date || null,
            bar_council_name: trimStr(item.bar_council || item.bar_council_name),
            supporting_document: trimStr(item.supporting_document) || '',
            is_deleted: deleted
        };
    }

    // Transform court practice item to payload (API sample format)
    function mapCourtPracticeToPayload(item) {
        const practiceId = parseInt(item.id ?? item.court_practice_id, 10);
        const deleted = !!item.is_deleted;
        return {
            court_practice_id: !isNaN(practiceId) && practiceId > 0 ? practiceId : 0,
            court_name: trimStr(item.court_name || item.courtName),
            years_experience: deleted ? 0 : parseBarPracticeYears(item),
            from_date: item.from_date || null,
            to_date: item.to_date || null,
            practice_document: trimStr(item.practice_document) || '',
            is_deleted: deleted
        };
    }

    function isActiveBarRow(item) {
        if (!item || item.is_deleted) {
            return false;
        }
        return !!(item.years || item.years_experience || item.from_date || item.to_date
            || item.bar_council || item.bar_council_name || item.court_type || item.courtType
            || item.supporting_document);
    }

    function isActiveCourtRow(item) {
        if (!item || item.is_deleted) {
            return false;
        }
        return !!(item.court_name || item.courtName || item.years || item.years_experience
            || item.from_date || item.to_date || item.practice_document);
    }

    function isDeletedBarRow(item) {
        const id = parseInt(item.id ?? item.bar_practice_id, 10);
        return !!item.is_deleted && !isNaN(id) && id > 0;
    }

    function isDeletedCourtRow(item) {
        const id = parseInt(item.id ?? item.court_practice_id, 10);
        return !!item.is_deleted && !isNaN(id) && id > 0;
    }

    function citationTextForJudgementPayload(entry) {
        if (entry == null) {
            return '';
        }
        if (typeof entry === 'string' || typeof entry === 'number') {
            return trimStr(entry);
        }
        if (typeof entry === 'object') {
            return trimStr(
                entry.case_citation || entry.caseCitation || entry.value
                || entry.citation || entry.case_title || entry.caseTitle
            );
        }
        return '';
    }

    function buildJudgementsPayload(formData) {
        if (formData.judgements && Array.isArray(formData.judgements) && formData.judgements.length) {
            return formData.judgements;
        }

        const judgements = [];

        function pushCategory(category, citationType, citations) {
            const items = (citations || []).map(citationTextForJudgementPayload).filter(Boolean).map(function (text) {
                return {
                    citation_type: citationType,
                    case_title: '',
                    case_citation: text
                };
            });
            if (items.length) {
                judgements.push({ category: category, citations: items });
            }
        }

        const aagList = formData.judgment_aag_citations || [];
        const agpList = formData.judgment_agp_citations || [];

        if (aagList.length) {
            pushCategory('AAG', '7_YEAR', aagList);
        }
        if (agpList.length) {
            pushCategory('AGP', '5_YEAR', agpList);
        }

        return judgements;
    }

    // Build experience save payload
    function buildExperienceSavePayload(formData) {
        const meta = buildExperienceSaveMeta();

        // Calculate total bar experience years
        let totalBarExperienceYears = 0;
        if (formData.bar_experiences && Array.isArray(formData.bar_experiences)) {
            formData.bar_experiences.forEach(function (exp) {
                if (!isActiveBarRow(exp)) {
                    return;
                }
                const years = parseExperienceYears(exp.years ?? exp.years_experience);
                if (!isNaN(years)) {
                    totalBarExperienceYears += years;
                }
            });
        }

        // Calculate total practice years
        let totalPracticeYears = 0;
        if (formData.practice_items && Array.isArray(formData.practice_items)) {
            formData.practice_items.forEach(function (practice) {
                if (!isActiveCourtRow(practice)) {
                    return;
                }
                const years = parseExperienceYears(practice.years ?? practice.years_experience);
                if (!isNaN(years)) {
                    totalPracticeYears += years;
                }
            });
        }

        // Get drafting years
        const draftingYears = formData.drafting_years ? (parseExperienceYears(formData.drafting_years) || 0) : 0;

        ensureDeletedPracticeState();

        const barPractice = (formData.bar_experiences || [])
            .filter(function (item) {
                return isActiveBarRow(item);
            })
            .map(mapBarPracticeToPayload)
            .concat(
                (AF.state.deletedBarPractices || [])
                    .filter(isDeletedBarRow)
                    .map(mapBarPracticeToPayload)
            );

        const courtPractice = (formData.practice_items || [])
            .filter(function (item) {
                return isActiveCourtRow(item);
            })
            .map(mapCourtPracticeToPayload)
            .concat(
                (AF.state.deletedCourtPractices || [])
                    .filter(isDeletedCourtRow)
                    .map(mapCourtPracticeToPayload)
            );

        const judgements = buildJudgementsPayload(formData);
        const achievementPath = trimStr(uploadedAchievementDocumentPath)
            || trimStr(AF.state && AF.state.achievementDocumentPath);

        return {
            applicant_id: meta.applicant_id,
            created_by: meta.created_by,
            law_degree_recognized: !!formData.law_degree_recognized,
            govt_law_officer_experience: !!formData.previously_worked,
            provide_details_if_yes: trimStr(formData.previously_worked_details),
            current_facing_criminal_proceedings: !!formData.current_proceeding,
            current_criminal_cases_details: trimStr(formData.current_criminal_details),
            current_criminal_cases_present_status: trimStr(formData.current_criminal_status),
            current_disciplinary_proceeding_details: trimStr(formData.current_disciplinary_details),
            current_disciplinary_proceeding_present_status: trimStr(formData.current_disciplinary_status),
            past_facing_criminal_proceedings: !!formData.past_proceeding,
            past_criminal_cases_details: trimStr(formData.past_criminal_details),
            past_criminal_cases_present_status: trimStr(formData.past_criminal_status),
            past_disciplinary_proceeding_details: trimStr(formData.past_disciplinary_details),
            past_disciplinary_proceeding_present_status: trimStr(formData.past_disciplinary_status),
            professional_achievement: !!formData.has_achievements,
            achievement_remarks: trimStr(formData.achievement_details),
            achievement_support_document: achievementPath,
            total_bar_experience_years: totalBarExperienceYears,
            total_practice_years: totalPracticeYears,
            drafting_experience_years: draftingYears,
            bar_practice: barPractice,
            court_practice: courtPractice,
            judgements: judgements
        };
    }

    // Post experience save API call
    function postExperienceSave(payload) {
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.reject(new Error('API client is not loaded.'));
        }
        console.log('[Tab3] Experience save payload:', payload);
        return ensureSessionTokens().then(function () {
            return global.LawPortal.apiRequest(
                'vacancy/experience/saveExperience',
                'POST',
                payload
            );
        }).then(function (res) {
            const body = unwrapApiResult(res);
            if (!body.ok) {
                throw new Error(body.error || 'Unable to save experience details.');
            }
            if (body.application_id) {
                global.sessionStorage.setItem('applicationId', String(body.application_id));
            }
            AF.state.deletedBarPractices = [];
            AF.state.deletedCourtPractices = [];
            return body;
        });
    }

    // Save experience data
    function saveExperienceData() {
        syncAll();
        const rawPayload = collectExperienceData();
        const dbPayload = buildExperienceSavePayload(rawPayload);
        return postExperienceSave(dbPayload);
    }

    // Initialize file upload handlers for dynamically added elements
    function initFileUploadHandlers() {
        // Handle bar document file upload
        $(document).off('change', '.bar-doc-file').on('change', '.bar-doc-file', function () {
            const fileInput = $(this);
            const file = fileInput[0].files[0];
            const $barItem = fileInput.closest('.bar-item');
            const sectionNum = $barItem.data('section');

            if (!file) return;

            if (AF.files && typeof AF.files.validateFileInputUi === 'function') {
                if (!AF.files.validateFileInputUi(fileInput[0])) {
                    fileInput.val('');
                    return;
                }
            }

            const fileName = file.name;
            if (AF.files && typeof AF.files.showFileUploadSelected === 'function') {
                AF.files.showFileUploadSelected(fileInput[0], 'Uploading…');
            }
            fileInput.prop('disabled', true);

            uploadDocument('BAR_PRACTICE', file, 'experience/bar_practice')
                .then(function (response) {
                    if (AF.files && typeof AF.files.showFileUploadSelected === 'function') {
                        AF.files.showFileUploadSelected(fileInput[0], fileName);
                    }
                    fileInput.prop('disabled', false);
                    $barItem.data('supporting-document', response.file_path);
                    $barItem.find('.cert-upload-strip').removeClass('is-invalid');
                    console.log('[Tab3] Bar practice document uploaded:', response.file_path);
                })
                .catch(function (err) {
                    if (AF.files && typeof AF.files.clearFileUpload === 'function') {
                        AF.files.clearFileUpload(fileInput[0]);
                    }
                    fileInput.prop('disabled', false);
                    showTab3Toast('Failed to upload document: ' + (err && err.message ? err.message : 'Upload failed'));
                });
        });

        // Handle practice document file upload
        $(document).off('change', '.practice-doc-file').on('change', '.practice-doc-file', function () {
            const fileInput = $(this);
            const file = fileInput[0].files[0];
            const $practiceItem = fileInput.closest('.practice-item');
            const sectionNum = $practiceItem.data('section');

            if (!file) return;

            if (AF.files && typeof AF.files.validateFileInputUi === 'function') {
                if (!AF.files.validateFileInputUi(fileInput[0])) {
                    fileInput.val('');
                    return;
                }
            }

            const fileName = file.name;
            if (AF.files && typeof AF.files.showFileUploadSelected === 'function') {
                AF.files.showFileUploadSelected(fileInput[0], 'Uploading…');
            }
            fileInput.prop('disabled', true);

            uploadDocument('COURT_PRACTICE', file, 'experience/court_practice')
                .then(function (response) {
                    if (AF.files && typeof AF.files.showFileUploadSelected === 'function') {
                        AF.files.showFileUploadSelected(fileInput[0], fileName);
                    }
                    fileInput.prop('disabled', false);
                    $practiceItem.data('practice-document', response.file_path);
                    console.log('[Tab3] Court practice document uploaded:', response.file_path);
                })
                .catch(function (err) {
                    if (AF.files && typeof AF.files.clearFileUpload === 'function') {
                        AF.files.clearFileUpload(fileInput[0]);
                    }
                    fileInput.prop('disabled', false);
                    showTab3Toast('Failed to upload document: ' + (err && err.message ? err.message : 'Upload failed'));
                });
        });


        $(document).off('change', '#achievementFiles, .achievement-doc-file').on('change', '#achievementFiles, .achievement-doc-file', function () {
            const fileInput = $(this);
            const file = fileInput[0].files[0];

            if (!file) return;

            const fileName = file.name;
            if (AF.files && typeof AF.files.showFileUploadSelected === 'function') {
                AF.files.showFileUploadSelected(fileInput[0], 'Uploading…');
            }
            fileInput.prop('disabled', true);

            uploadDocument('ACHIEVEMENT', file, 'experience/achievement')
                .then(function (response) {
                    if (AF.files && typeof AF.files.showFileUploadSelected === 'function') {
                        AF.files.showFileUploadSelected(fileInput[0], fileName);
                    }
                    fileInput.prop('disabled', false);
                    uploadedAchievementDocumentPath = response.file_path;
                    AF.state.achievementDocumentPath = response.file_path;
                    if (AF.files && typeof AF.files.storeFilePreview === 'function') {
                        AF.files.storeFilePreview('achievement', file);
                    }
                })
                .catch(function (err) {
                    if (AF.files && typeof AF.files.clearFileUpload === 'function') {
                        AF.files.clearFileUpload(fileInput[0]);
                    }
                    fileInput.prop('disabled', false);
                    showTab3Toast('Failed to upload achievement document: ' + (err && err.message ? err.message : 'Upload failed'));
                });
        });
    }


    function collectBarExperiences() {
        const barExperiences = [];
        $('#barExpContainer .bar-item').each(function () {
            const $item = $(this);
            const years = ($item.find('.bar-years').val() || '').trim();
            const fromDate = $item.find('.bar-from').val() || null;
            const toDate = $item.find('.bar-to').val() || null;
            const courtType = ($item.find('.bar-court-type').val() || '').trim() || null;
            const barCouncil = ($item.find('.bar-council').val() || '').trim() || null;

            if (years || fromDate || toDate || courtType || barCouncil) {
                barExperiences.push({
                    id: parseInt($item.data('bar-practice-id'), 10) || 0,
                    years: years || '',
                    from_date: fromDate,
                    to_date: toDate,
                    court_type: courtType,
                    bar_council: barCouncil,
                    supporting_document: $item.data('supporting-document') || ''
                });
            }
        });
        return barExperiences.length > 0 ? barExperiences : null;
    }

    // Collect court practices - FIXED to include IDs
    function collectCourtPractices() {
        const practiceItems = [];
        $('#courtPracticeContainer .practice-item').each(function () {
            const $item = $(this);
            const courtName = ($item.find('.practice-court').val() || '').trim();
            const years = ($item.find('.practice-years').val() || '').trim();
            const fromDate = $item.find('.practice-from').val() || null;
            const toDate = $item.find('.practice-to').val() || null;

            if (courtName || years || fromDate || toDate) {
                practiceItems.push({
                    id: parseInt($item.data('court-practice-id'), 10) || 0,
                    court_name: courtName || '',
                    years: years || '',
                    from_date: fromDate,
                    to_date: toDate,
                    practice_document: $item.data('practice-document') || ''
                });
            }
        });
        return practiceItems.length > 0 ? practiceItems : null;
    }
    function initOptimizedDateValidation() {
        const today = getTodayIsoLocal();
        $('#tab3 input[type="date"]').each(function () {
            $(this).attr('max', today);
        });

        $(document)
            .off('change.tab3Dates input.tab3Dates', '.bar-from, .bar-to, .practice-from, .practice-to')
            .on('change.tab3Dates input.tab3Dates', '.bar-from, .bar-to, .practice-from, .practice-to', function () {
                const $item = $(this).closest('.list-item');
                if ($item.hasClass('bar-item')) {
                    validateBarPracticeItemDates($item, { showToast: true });
                    validateBarPracticeCrossRules({ showToast: true });
                } else {
                    validateExperienceItemDates($item, { showToast: true });
                }
            })
            .on('focus.tab3Dates', '.bar-from, .bar-to, .practice-from, .practice-to', function () {
                $(this).attr('max', getTodayIsoLocal());
            });
    }

    function initTab3InstantValidation() {
        const today = getTodayIsoLocal();

        $('#lawDegreeRecognized1').off('change.tab3Instant').on('change.tab3Instant', function () {
            if (!$(this).val()) {
                showTab3ToastOnce('law-degree', 'Please select whether Law Degree is recognized by Bar Council of India.');
                $(this).addClass('is-invalid');
            } else {
                $(this).removeClass('is-invalid');
            }
        });

        $('#previousWorked').off('change.tab3Instant').on('change.tab3Instant', function () {
            if (!$(this).val()) {
                showTab3ToastOnce('prev-worked', 'Please select whether previously worked or presently working as Law Officer.');
                $(this).addClass('is-invalid');
            } else {
                $(this).removeClass('is-invalid');
                if ($(this).val() !== 'Yes') {
                    $('#previousWorkedDetails').removeClass('is-invalid');
                }
            }
        });

        $('#previousWorkedDetails').off('input.tab3Instant change.tab3Instant').on('input.tab3Instant change.tab3Instant', function () {
            if ($('#previousWorked').val() === 'Yes' && !$(this).val().trim()) {
                showTab3ToastOnce('prev-worked-details', 'Please provide details of previous/present work as Law Officer.');
                $(this).addClass('is-invalid');
            } else {
                $(this).removeClass('is-invalid');
            }
        });

        $(document)
            .off('change.tab3BarFields blur.tab3BarFields', '.bar-council, .bar-court-type')
            .on('change.tab3BarFields blur.tab3BarFields', '.bar-council, .bar-court-type', function () {
                const $item = $(this).closest('.bar-item');
                if (!$item.length || !isBarRecordStarted($item)) {
                    return;
                }
                validateBarPracticeItemDates($item, { showToast: false });
                validateBarPracticeRecordFields($item, { showToast: true });
                validateBarPracticeCrossRules({ showToast: true });
            });

        $(document)
            .off('change.tab3Practice blur.tab3Practice', '.practice-court')
            .on('change.tab3Practice blur.tab3Practice', '.practice-court', function () {
                const $item = $(this).closest('.practice-item');
                const courtName = trimStr($(this).val());
                const label = getExperienceItemLabel($item);
                if (!courtName) {
                    showTab3ToastOnce(label + ':court-name', label + ': Please enter Court / Bench name.');
                    $(this).addClass('is-invalid');
                } else {
                    $(this).removeClass('is-invalid');
                }
            });

        $('#tab3 input[type="date"]').attr('max', today);
    }

    // Collect all experience data from form
    function collectExperienceData() {
        const payload = {};

        // 1. Basic Fields
        payload.law_degree_recognized = toBoolean($('#lawDegreeRecognized1').val());
        payload.previously_worked = toBoolean($('#previousWorked').val());
        payload.previously_worked_details = $('#previousWorkedDetails').val().trim() || null;

        // 2. Current Proceedings
        const currentProceedingValue = $('input[name="currentProceeding"]:checked').val();
        payload.current_proceeding = toBoolean(currentProceedingValue);

        const $currentDetails = $('#currentProceedingDetails');
        if (payload.current_proceeding === true) {
            const textareas = $currentDetails.find('textarea');
            payload.current_criminal_details = textareas.eq(0).val().trim() || null;
            payload.current_criminal_status = textareas.eq(1).val().trim() || null;
            payload.current_disciplinary_details = textareas.eq(2).val().trim() || null;
            payload.current_disciplinary_status = textareas.eq(3).val().trim() || null;
        } else {
            payload.current_criminal_details = null;
            payload.current_criminal_status = null;
            payload.current_disciplinary_details = null;
            payload.current_disciplinary_status = null;
        }

        // 3. Past Proceedings
        const pastProceedingValue = $('input[name="pastProceeding"]:checked').val();
        payload.past_proceeding = toBoolean(pastProceedingValue);

        const $pastDetails = $('#pastProceedingDetails');
        if (payload.past_proceeding === true) {
            const textareas = $pastDetails.find('textarea');
            payload.past_criminal_details = textareas.eq(0).val().trim() || null;
            payload.past_criminal_status = textareas.eq(1).val().trim() || null;
            payload.past_disciplinary_details = textareas.eq(2).val().trim() || null;
            payload.past_disciplinary_status = textareas.eq(3).val().trim() || null;
        } else {
            payload.past_criminal_details = null;
            payload.past_criminal_status = null;
            payload.past_disciplinary_details = null;
            payload.past_disciplinary_status = null;
        }

        // 4. Achievement Section
        payload.has_achievements = toBoolean($('#achievmenetWrap').val());
        payload.achievement_details = $('#achievementDetails').val().trim() || null;

        // 5. Bar Experiences
        payload.bar_experiences = collectBarExperiences();

        if (!payload.bar_experiences || payload.bar_experiences.length === 0) {
            payload.bar_experiences = null;
        }

        // 6. Practice Items
        payload.practice_items = collectCourtPractices();

        if (!payload.practice_items || payload.practice_items.length === 0) {
            payload.practice_items = null;
        }

        // 7-8. Judgment citations
        payload.judgment_aag_citations = [];
        getAAGCitations().forEach(function (entry) {
            const val = citationEntryValue(entry).trim();
            if (val) payload.judgment_aag_citations.push(val);
        });
        if (payload.judgment_aag_citations.length === 0) payload.judgment_aag_citations = null;

        payload.judgment_agp_citations = [];
        getAGPCitations().forEach(function (entry) {
            const val = citationEntryValue(entry).trim();
            if (val) payload.judgment_agp_citations.push(val);
        });
        if (payload.judgment_agp_citations.length === 0) payload.judgment_agp_citations = null;

        // 9. Drafting Experience
        payload.drafting_years = $('#draftingYears').val().trim() || null;

        // 10. Calculated Fields
        payload.total_bar_years = $('#totalBarYears').val() || null;
        payload.high_court_years = $('#specificBarYears').val() || null;

        // 11. Law Officer Remarks
        payload.law_officer_remarks = $('#lawOfficerRemarks').val().trim() || null;

        // 12. Timestamp
        payload.collected_at = new Date().toISOString();

        return payload;
    }

    // Total bar years = merged non-overlapping periods (no double-counting)
    function recalculateTotalYears() {
        const ranges = collectBarPracticeRanges();
        const mergedTotal = sumYearsFromMergedRanges(mergeBarDateRanges(ranges));
        const highCourtTotal = sumHighCourtYearsFromRanges(ranges);

        const totalWholeYears = mergedTotal > 0 ? Math.floor(mergedTotal) : 0;
        const highCourtWholeYears = highCourtTotal > 0 ? Math.floor(highCourtTotal) : 0;

        $('#totalBarYears').val(totalWholeYears + ' years');
        $('#specificBarYears').val(highCourtWholeYears + ' years');
    }

    // Create a new bar experience section (BLANK)
    function createBarSection(sectionNumber) {
        const hideRemove = sectionNumber === 1 ? ' d-none' : '';
        return `
            <div class="premium-bar-card bar-item list-item mb-3" data-section="${sectionNumber}">
                <button type="button" class="bar-remove-btn remove-bar-item d-flex justify-content-center align-items-center${hideRemove}"
                        data-section="${sectionNumber}">
                    <i class="bi bi-trash3-fill"></i>
                </button>
                <div class="bar-card-header">
                    <div class="bar-icon-wrap"><i class="bi bi-briefcase-fill"></i></div>
                    <div>
                        <div class="bar-title">Bar Practice Experience #${sectionNumber}</div>
                        <div class="bar-subtitle">Advocate Practice & Council Details</div>
                    </div>
                </div>
                <div class="row g-2 mt-1">
                    <div class="col-md-3">
                        <label class="premium-label"><i class="bi bi-calendar-event-fill"></i>From Date <span class="text-danger">*</span></label>
                        <input type="date" class="form-control premium-input bar-from"
                               name="bar_from_${sectionNumber}"
                               id="bar_from_${sectionNumber}"
                               value="" required>
                    </div>
                    <div class="col-md-3">
                        <label class="premium-label"><i class="bi bi-calendar-range-fill"></i>To Date <span class="text-danger">*</span></label>
                        <input type="date" class="form-control premium-input bar-to"
                               name="bar_to_${sectionNumber}"
                               id="bar_to_${sectionNumber}"
                               value="" required>
                    </div>
                    <div class="col-md-3">
                        <label class="premium-label"><i class="bi bi-calendar2-check-fill"></i>Years of Experience ${buildExperienceInfoIconHtml()}</label>
                        <input type="text" class="form-control premium-input bar-years"
                               name="bar_years_${sectionNumber}"
                               id="bar_years_${sectionNumber}"
                               value=""
                               readonly
                               tabindex="-1"
                               placeholder="Auto"
                               title="Auto-calculated from From and To dates (read-only)"
                               readonly>
                    </div>
                    <div class="col-md-3">
                        <label class="premium-label"><i class="bi bi-bank2"></i>Court Type</label>
                        <select class="form-control premium-input bar-court-type"
                                name="bar_court_type_${sectionNumber}"
                                id="bar_court_type_${sectionNumber}">
                            <option value="">Select</option>
                            <option value="High Court">High Court</option>
                            <option value="District Court">District Court</option>
                            <option value="Tribunal">Tribunal</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
                <div class="row g-2 mt-2">
                    <div class="col-md-12">
                        <label class="premium-label"><i class="bi bi-building"></i>Name of the Bar Council / Court</label>
                        <input type="text" class="form-control premium-input bar-council"
                               name="bar_council_${sectionNumber}"
                               id="bar_council_${sectionNumber}"
                               value="" 
                               placeholder="Enter Bar Council or Court Name">
                    </div>
                </div>
                <div class="mt-3">
                    ${renderCertUploadBlock('bar-doc-' + sectionNumber, 'bar-doc-file', 'Certificate')}
                </div>
            </div>
        `;
    }

    // Create a new practice section (BLANK)
    function createPracticeSection(sectionNumber) {
        const hideRemove = sectionNumber === 1 ? ' d-none' : '';
        return `
            <div class="premium-practice-card practice-item list-item mb-3" data-section="${sectionNumber}">
                <button type="button" class="practice-remove-btn remove-practice-item d-flex justify-content-center align-items-center${hideRemove}"
                        data-section="${sectionNumber}">
                    <i class="bi bi-trash3-fill"></i>
                </button>
                <div class="practice-card-header">
                    <div class="practice-icon-wrap"><i class="bi bi-building-fill-check"></i></div>
                    <div>
                        <div class="practice-title">Court Practice Experience #${sectionNumber}</div>
                        <div class="practice-subtitle">Practice in High Court / Madurai Bench</div>
                    </div>
                </div>
                <div class="row g-2 mt-1">
                    <div class="col-md-4">
                        <label class="practice-label"><i class="bi bi-bank"></i>Court / Bench Name</label>
                        <input type="text" class="form-control practice-input practice-court"
                               name="practice_court_${sectionNumber}"
                               id="practice_court_${sectionNumber}"
                               value="" 
                               placeholder="Enter Court Name">
                    </div>
                    <div class="col-md-3">
                        <label class="practice-label"><i class="bi bi-calendar-event-fill"></i>From Date</label>
                        <input type="date" class="form-control practice-input practice-from"
                               name="practice_from_${sectionNumber}"
                               id="practice_from_${sectionNumber}"
                               value="">
                    </div>
                    <div class="col-md-3">
                        <label class="practice-label"><i class="bi bi-calendar-range-fill"></i>To Date</label>
                        <input type="date" class="form-control practice-input practice-to"
                               name="practice_to_${sectionNumber}"
                               id="practice_to_${sectionNumber}"
                               value="">
                    </div>
                    <div class="col-md-2">
                        <label class="practice-label"><i class="bi bi-calendar2-check-fill"></i>Years of Experience ${buildExperienceInfoIconHtml()}</label>
                        <input type="text" class="form-control practice-input practice-years"
                               name="practice_years_${sectionNumber}"
                               id="practice_years_${sectionNumber}"
                               value=""
                               readonly
                               tabindex="-1"
                               placeholder="Auto"
                               title="Calculated from From and To dates">
                    </div>
                </div>
                <div class="mt-3">
                    ${renderCertUploadBlock('practice-doc-' + sectionNumber, 'practice-doc-file', 'Certificate')}
                </div>
            </div>
        `;
    }

    // Render initial bar sections
    function renderBarSections() {
        const container = $('#barExpContainer');
        container.empty();

        const sections = AF.state.barSections || [1];

        sections.forEach(sectionNum => {
            container.append(createBarSection(sectionNum));
        });

        barSectionCounter = Math.max(...sections) + 1;
        updateBarRemoveButtonVisibility();
        initFileUploadHandlers();
        initTab3UploadUi(container[0]);
        initExperienceTooltips(container[0]);
        container.find('.bar-item').each(function () {
            updateItemExperienceYears($(this));
        });
        recalculateTotalYears();
    }

    // Render initial practice sections
    function renderPracticeSections() {
        const container = $('#courtPracticeContainer');
        container.empty();

        const sections = AF.state.practiceSections || [1];

        sections.forEach(sectionNum => {
            container.append(createPracticeSection(sectionNum));
        });

        practiceSectionCounter = Math.max(...sections) + 1;
        updatePracticeRemoveButtonVisibility();
        initFileUploadHandlers();
        initTab3UploadUi(container[0]);
        initExperienceTooltips(container[0]);
        container.find('.practice-item').each(function () {
            updateItemExperienceYears($(this));
        });
    }

    // Add new bar section
    function addBarSection() {
        const newSectionNum = barSectionCounter++;
        const $newSection = $(createBarSection(newSectionNum));
        $('#barExpContainer').append($newSection);

        const sections = AF.state.barSections || [1];
        sections.push(newSectionNum);
        AF.state.barSections = sections;

        updateBarRemoveButtonVisibility();
        initFileUploadHandlers();
        initTab3UploadUi($newSection[0]);
        validateBarPracticeCrossRules({ showToast: false });
    }

    // Add new practice section
    function addPracticeSection() {
        const newSectionNum = practiceSectionCounter++;
        const $newSection = $(createPracticeSection(newSectionNum));
        $('#courtPracticeContainer').append($newSection);

        const sections = AF.state.practiceSections || [1];
        sections.push(newSectionNum);
        AF.state.practiceSections = sections;

        updatePracticeRemoveButtonVisibility();
        initFileUploadHandlers();
        initTab3UploadUi($newSection[0]);
    }

    // Remove bar section
    function removeBarSection(sectionNum) {
        const $item = $(`.bar-item[data-section="${sectionNum}"]`);
        recordDeletedBarPractice($item);
        $item.remove();

        let sections = AF.state.barSections || [1];
        sections = sections.filter(s => s !== sectionNum);
        if (sections.length === 0) sections = [1];
        AF.state.barSections = sections;

        $('#barExpContainer .bar-item').each(function (index) {
            const newNum = index + 1;
            $(this).attr('data-section', newNum);
            $(this).find('.bar-title').text(`Bar Practice Experience #${newNum}`);
            $(this).find('.bar-years').attr({ name: `bar_years_${newNum}`, id: `bar_years_${newNum}` });
            $(this).find('.bar-from').attr({ name: `bar_from_${newNum}`, id: `bar_from_${newNum}` });
            $(this).find('.bar-to').attr({ name: `bar_to_${newNum}`, id: `bar_to_${newNum}` });
            $(this).find('.bar-court-type').attr({ name: `bar_court_type_${newNum}`, id: `bar_court_type_${newNum}` });
            $(this).find('.bar-council').attr({ name: `bar_council_${newNum}`, id: `bar_council_${newNum}` });
            $(this).find('.bar-remove-btn').attr('data-section', newNum);
        });

        barSectionCounter = sections.length + 1;
        updateBarRemoveButtonVisibility();
        recalculateTotalYears();
        validateBarPracticeCrossRules({ showToast: false });
    }

    // Remove practice section
    function removePracticeSection(sectionNum) {
        const $item = $(`.practice-item[data-section="${sectionNum}"]`);
        recordDeletedCourtPractice($item);
        $item.remove();

        let sections = AF.state.practiceSections || [1];
        sections = sections.filter(s => s !== sectionNum);
        if (sections.length === 0) sections = [1];
        AF.state.practiceSections = sections;

        $('#courtPracticeContainer .practice-item').each(function (index) {
            const newNum = index + 1;
            $(this).attr('data-section', newNum);
            $(this).find('.practice-title').text(`Court Practice Experience #${newNum}`);
            $(this).find('.practice-court').attr({ name: `practice_court_${newNum}`, id: `practice_court_${newNum}` });
            $(this).find('.practice-years').attr({ name: `practice_years_${newNum}`, id: `practice_years_${newNum}` });
            $(this).find('.practice-from').attr({ name: `practice_from_${newNum}`, id: `practice_from_${newNum}` });
            $(this).find('.practice-to').attr({ name: `practice_to_${newNum}`, id: `practice_to_${newNum}` });
            $(this).find('.practice-remove-btn').attr('data-section', newNum);
        });

        practiceSectionCounter = sections.length + 1;
        updatePracticeRemoveButtonVisibility();
    }

    // ============================================================
    // JUDGMENT CITATION SECTIONS (AAG 7-year / AGP 5-year)
    // Stable HTML shell; only the list is re-rendered; add/remove by row index.
    // ============================================================

    function getCitationSection(kind) {
        return CITATION_SECTIONS[kind] || CITATION_SECTIONS.aag;
    }

    function getCitationListEl(kind) {
        const cfg = getCitationSection(kind);
        return document.getElementById(cfg.listId);
    }

    function citationValuesFromState(kind) {
        const cfg = getCitationSection(kind);
        const list = AF.state[cfg.stateKey];
        if (!list || !list.length) {
            return [''];
        }
        return list.map(function (item) {
            return citationEntryValue(item);
        });
    }

    function stateFromCitationValues(kind, values) {
        return values.map(function (value) {
            return {
                id: nextCitationId(kind),
                value: value != null ? String(value) : ''
            };
        });
    }

    function readCitationValuesFromDom(kind) {
        const listEl = getCitationListEl(kind);
        if (!listEl) {
            return [''];
        }
        const rows = listEl.querySelectorAll('[data-cite-row]');
        if (!rows.length) {
            return [''];
        }
        const values = [];
        for (let i = 0; i < rows.length; i++) {
            const input = rows[i].querySelector('[data-cite-input]');
            values.push(input ? input.value : '');
        }
        return values;
    }

    function readCitationsFromDom(kind) {
        const values = readCitationValuesFromDom(kind);
        return stateFromCitationValues(kind, values);
    }

    let citationDraftSaveTimer = null;

    function scheduleCitationDraftSave() {
        if (!AF.data || typeof AF.data.saveDraft !== 'function') {
            return;
        }
        if (citationDraftSaveTimer) {
            clearTimeout(citationDraftSaveTimer);
        }
        citationDraftSaveTimer = setTimeout(function () {
            citationDraftSaveTimer = null;
            AF.data.saveDraft();
        }, 400);
    }

    function persistCitationsToState(kind) {
        const cfg = getCitationSection(kind);
        const values = readCitationValuesFromDom(kind);
        AF.state[cfg.stateKey] = stateFromCitationValues(kind, values.length ? values : ['']);
        scheduleCitationDraftSave();
        return AF.state[cfg.stateKey];
    }

    function ensureCitationState(kind) {
        const cfg = getCitationSection(kind);
        let list = AF.state[cfg.stateKey];
        if (!list || !list.length) {
            list = [{ id: nextCitationId(kind), value: '' }];
        } else {
            list = normalizeCitationList(list, kind);
        }
        AF.state[cfg.stateKey] = list;
        return list;
    }

    function buildCitationRowHtml(kind, rowIndex, value) {
        const cfg = getCitationSection(kind);
        const inputId = cfg.inputName + '_' + rowIndex;
        const showRemove = rowIndex > 0;
        const removeBtn = showRemove
            ? '<button type="button" class="judgment-cite-remove" data-cite-action="remove" ' +
            'aria-label="Remove citation ' + (rowIndex + 1) + '">' +
            '<i class="bi bi-x-lg" aria-hidden="true"></i></button>'
            : '';

        return (
            '<div class="judgment-cite-card" data-cite-row data-row-index="' + rowIndex + '" role="listitem">' +
            removeBtn +
            '<div class="judgment-cite-inner">' +
            '<span class="judgment-cite-badge" aria-hidden="true">' + (rowIndex + 1) + '</span>' +
            '<div class="judgment-cite-field flex-grow-1">' +
            '<label class="judgment-cite-label" for="' + inputId + '">' +
            '<i class="bi bi-journal-text" aria-hidden="true"></i>Case Citation</label>' +
            '<input type="text" class="form-control judgment-cite-input" data-cite-input ' +
            'name="' + inputId + '" id="' + inputId + '" value="' + escapeAttr(value) + '" ' +
            'placeholder="e.g., 2023 SCC 123" autocomplete="off">' +
            '</div></div></div>'
        );
    }

    function renderCitationsForKind(kind, valuesOverride) {
        const cfg = getCitationSection(kind);
        const listEl = getCitationListEl(kind);
        if (!listEl) {
            return;
        }

        let values = valuesOverride;
        if (!values) {
            values = citationValuesFromState(kind);
        }
        if (!values.length) {
            values = [''];
        }

        citationRendering = true;
        try {
            listEl.innerHTML = values.map(function (val, idx) {
                return buildCitationRowHtml(kind, idx, val);
            }).join('');
            AF.state[cfg.stateKey] = stateFromCitationValues(kind, values);
        } finally {
            citationRendering = false;
        }
    }

    function reindexCitationRows(kind) {
        const cfg = getCitationSection(kind);
        const listEl = getCitationListEl(kind);
        if (!listEl) {
            return;
        }
        const rows = listEl.querySelectorAll('[data-cite-row]');
        rows.forEach(function (row, idx) {
            row.setAttribute('data-row-index', String(idx));
            const badge = row.querySelector('.judgment-cite-badge');
            if (badge) {
                badge.textContent = String(idx + 1);
            }
            const inputId = cfg.inputName + '_' + idx;
            const input = row.querySelector('[data-cite-input]');
            if (input) {
                input.name = inputId;
                input.id = inputId;
            }
            const label = row.querySelector('.judgment-cite-label');
            if (label) {
                label.setAttribute('for', inputId);
            }
            let removeBtn = row.querySelector('[data-cite-action="remove"]');
            if (idx === 0) {
                if (removeBtn) {
                    removeBtn.remove();
                }
            } else if (!removeBtn) {
                removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'judgment-cite-remove';
                removeBtn.setAttribute('data-cite-action', 'remove');
                removeBtn.setAttribute('aria-label', 'Remove citation ' + (idx + 1));
                removeBtn.innerHTML = '<i class="bi bi-x-lg" aria-hidden="true"></i>';
                row.insertBefore(removeBtn, row.firstChild);
            } else {
                removeBtn.setAttribute('aria-label', 'Remove citation ' + (idx + 1));
            }
        });
    }

    function removeCitationRow(kind, rowEl) {
        if (!rowEl || citationRendering) {
            return;
        }
        const listEl = getCitationListEl(kind);
        if (!listEl || !listEl.contains(rowEl)) {
            return;
        }

        let removeIndex = parseInt(rowEl.getAttribute('data-row-index'), 10);
        if (isNaN(removeIndex)) {
            const rows = listEl.querySelectorAll('[data-cite-row]');
            removeIndex = -1;
            for (let i = 0; i < rows.length; i++) {
                if (rows[i] === rowEl) {
                    removeIndex = i;
                    break;
                }
            }
        }
        if (removeIndex < 1) {
            return;
        }

        const values = readCitationValuesFromDom(kind);
        if (values.length <= 1 || removeIndex >= values.length) {
            return;
        }

        values.splice(removeIndex, 1);
        if (!values.length) {
            values.push('');
        }

        rowEl.remove();
        reindexCitationRows(kind);

        const cfg = getCitationSection(kind);
        AF.state[cfg.stateKey] = stateFromCitationValues(kind, values);
    }

    function addCitationRow(kind) {
        if (citationRendering) {
            return;
        }
        const values = readCitationValuesFromDom(kind);
        const filledCount = values.filter(function (v) {
            return trimStr(v);
        }).length;
        if (filledCount >= CITATION_MAX_ROWS) {
            showTab3Toast('Maximum ' + CITATION_MAX_ROWS + ' citations allowed for this section.');
            return;
        }
        values.push('');
        renderCitationsForKind(kind, values);

        const listEl = getCitationListEl(kind);
        const lastInput = listEl && listEl.querySelector('[data-cite-row]:last-child [data-cite-input]');
        if (lastInput) {
            lastInput.focus();
        }
    }

    function getAAGCitations() {
        return readCitationsFromDom('aag');
    }

    function getAGPCitations() {
        return readCitationsFromDom('agp');
    }

    function renderJudgmentAAG() {
        renderCitationsForKind('aag');
    }

    function renderJudgmentAGP() {
        renderCitationsForKind('agp');
    }

    function onTab3CitationClick(e) {
        if (citationRendering) {
            return;
        }

        const removeBtn = e.target.closest('[data-cite-action="remove"]');
        if (removeBtn) {
            e.preventDefault();
            e.stopPropagation();
            const block = removeBtn.closest('[data-citation-kind]');
            const row = removeBtn.closest('[data-cite-row]');
            if (block && row) {
                removeCitationRow(block.getAttribute('data-citation-kind'), row);
            }
            return;
        }

        const addBtn = e.target.closest('[data-cite-action="add"]');
        if (addBtn) {
            e.preventDefault();
            e.stopPropagation();
            const kind = addBtn.getAttribute('data-citation-kind');
            if (kind) {
                addCitationRow(kind);
            }
        }
    }

    function onTab3CitationInput(e) {
        if (citationRendering) {
            return;
        }
        const input = e.target.closest('[data-cite-input]');
        if (!input) {
            return;
        }
        const block = input.closest('[data-citation-kind]');
        if (!block) {
            return;
        }
        persistCitationsToState(block.getAttribute('data-citation-kind'));
    }

    function initJudgmentCitationHandlers() {
        if (citationHandlersBound) {
            return;
        }
        const tab3 = document.getElementById('tab3');
        if (!tab3) {
            return;
        }
        tab3.addEventListener('click', onTab3CitationClick);
        tab3.addEventListener('input', onTab3CitationInput);
        citationHandlersBound = true;
    }


    function validateStep3() {
        // Validate Law Degree
        const lawDegree = $('#lawDegreeRecognized1').val();
        if (!lawDegree) {
            alert('Please select whether Law Degree is recognized by Bar Council of India.');
            $('#lawDegreeRecognized1').focus();
            return false;
        }

        // Validate Previous Worked
        const previousWorked = $('#previousWorked').val();
        if (!previousWorked) {
            alert('Please select whether previously worked or presently working as Law Officer.');
            $('#previousWorked').focus();
            return false;
        }

        // If previously worked is Yes, check details
        if (previousWorked === 'Yes') {
            const details = $('#previousWorkedDetails').val().trim();
            if (!details) {
                alert('Please provide details of previous/present work as Law Officer.');
                $('#previousWorkedDetails').focus();
                return false;
            }
        }

        if (!validateAllBarPracticeRecords({ showToast: true }).ok) {
            return false;
        }

        // Validate at least one court practice has data
        const practiceItems = $('#courtPracticeContainer .practice-item');
        let hasValidPractice = false;
        let practiceValidationPassed = true;
        practiceItems.each(function (index) {
            const $item = $(this);
            const courtName = $item.find('.practice-court').val().trim();
            const fromDate = $item.find('.practice-from').val();
            const toDate = $item.find('.practice-to').val();
            const years = ($item.find('.practice-years').val() || '').trim();

            if (!courtName && !fromDate && !toDate && !years) {
                return;
            }
            if (courtName) {
                hasValidPractice = true;
            }
            if (fromDate || toDate) {
                const dateCheck = validateExperienceItemDates($item, { showToast: true });
                if (!dateCheck.ok) {
                    practiceValidationPassed = false;
                    return false;
                }
            }
        });

        if (!practiceValidationPassed) {
            return false;
        }

        if (!hasValidPractice) {
            showTab3Toast('Please add at least one Court Practice Experience.');
            return false;
        }

        return true;
    }

    function syncBarSections() {
        const sections = [];
        $('#barExpContainer .bar-item').each(function () {
            const sectionNum = parseInt($(this).attr('data-section'));
            if (!isNaN(sectionNum)) {
                sections.push(sectionNum);
            }
        });
        AF.state.barSections = sections.length > 0 ? sections : [1];

        // Sync bar items data
        AF.state.barItems = [];
        $('#barExpContainer .bar-item').each(function (index) {
            const $item = $(this);
            const docPath = trimExperienceStr($item.data('supporting-document'))
                || trimExperienceStr(
                    AF.state.barItems && AF.state.barItems[index]
                    && (AF.state.barItems[index].supporting_document || AF.state.barItems[index].supportingDocument)
                );
            AF.state.barItems.push({
                id: parseInt($item.data('bar-practice-id'), 10) || 0,
                years: getYearsFromField($item.find('.bar-years')),
                from: $item.find('.bar-from').val() || '',
                to: $item.find('.bar-to').val() || '',
                barCouncil: $item.find('.bar-council').val() || '',
                courtType: $item.find('.bar-court-type').val() || '',
                supporting_document: docPath,
                supportingDocument: docPath
            });
        });
    }

    function syncPracticeSections() {
        const sections = [];
        $('#courtPracticeContainer .practice-item').each(function () {
            const sectionNum = parseInt($(this).attr('data-section'));
            if (!isNaN(sectionNum)) {
                sections.push(sectionNum);
            }
        });
        AF.state.practiceSections = sections.length > 0 ? sections : [1];

        // Sync practice items data
        AF.state.practiceItems = [];
        $('#courtPracticeContainer .practice-item').each(function (index) {
            const $item = $(this);
            const docPath = trimExperienceStr($item.data('practice-document'))
                || trimExperienceStr(
                    AF.state.practiceItems && AF.state.practiceItems[index]
                    && (AF.state.practiceItems[index].practice_document || AF.state.practiceItems[index].practiceDocument)
                );
            AF.state.practiceItems.push({
                id: parseInt($item.data('court-practice-id'), 10) || 0,
                courtName: $item.find('.practice-court').val() || '',
                years: getYearsFromField($item.find('.practice-years')),
                from: $item.find('.practice-from').val() || '',
                to: $item.find('.practice-to').val() || '',
                practice_document: docPath,
                practiceDocument: docPath
            });
        });
    }

    // ============================================================
    // INITIALIZATION FUNCTIONS
    // ============================================================

    function initProceedingToggles() {
        const $currentDetails = $('#currentProceedingDetails');
        const $pastDetails = $('#pastProceedingDetails');

        function toggleProceedingDetails($details, isYes) {
            if (!$details.length) {
                return;
            }
            if (isYes) {
                $details.stop(true, true).slideDown(300);
                $details.find('textarea').prop('required', true);
            } else {
                $details.stop(true, true).slideUp(300);
                $details.find('textarea').prop('required', false);
            }
        }

        function toggleCurrent() {
            toggleProceedingDetails($currentDetails, $('#currentProceedingYes').is(':checked'));
        }

        function togglePast() {
            toggleProceedingDetails($pastDetails, $('#pastProceedingYes').is(':checked'));
        }

        $('#currentProceedingYes, #currentProceedingNo').off('change.tab3Proceeding').on('change.tab3Proceeding', toggleCurrent);
        $('#pastProceedingYes, #pastProceedingNo').off('change.tab3Proceeding').on('change.tab3Proceeding', togglePast);

        toggleCurrent();
        togglePast();
    }

    function initConditionalFields() {
        $('#previousWorked').off('change').on('change', function () {
            if ($(this).val() === 'Yes') {
                $('#previousWorkedWrapper').removeClass('d-none');
            } else {
                $('#previousWorkedWrapper').addClass('d-none');
            }
        }).trigger('change');

        $('#achievmenetWrap').off('change').on('change', function () {
            if ($(this).val() === 'Yes') {
                $('#achievementDetailsWrapper').removeClass('d-none');
            } else {
                $('#achievementDetailsWrapper').addClass('d-none');
                $('#achievementDetails').val('');
                $('#achievementFiles').val('');
                // Clear the uploaded document path when hiding
                uploadedAchievementDocumentPath = null;
                AF.state.achievementDocumentPath = null;
            }
        }).trigger('change');
    }

    function initDraftingExperience() {
        const draftingYears = document.getElementById('draftingYears');
        if (draftingYears) {
            draftingYears.value = normalizeExperienceYearsInput(draftingYears.value);
            draftingYears.addEventListener('input', function () {
                this.value = normalizeExperienceYearsInput(this.value);
            });
            draftingYears.addEventListener('change', function () {
                this.value = normalizeExperienceYearsInput(this.value);
                AF.state.draftingYears = this.value;
            });
            if (AF.state.draftingYears) {
                draftingYears.value = normalizeExperienceYearsInput(AF.state.draftingYears);
            }
        }
    }

    function initDefaultItems() {
        if (!AF.state.barSections || AF.state.barSections.length === 0) {
            AF.state.barSections = [1];
        }
        if (!AF.state.practiceSections || AF.state.practiceSections.length === 0) {
            AF.state.practiceSections = [1];
        }
        if (!AF.state.judgmentAAGCitations || AF.state.judgmentAAGCitations.length === 0) {
            AF.state.judgmentAAGCitations = [{ id: nextCitationId('aag'), value: '' }];
        } else {
            AF.state.judgmentAAGCitations = normalizeCitationList(AF.state.judgmentAAGCitations, 'aag');
        }
        if (!AF.state.judgmentAGPCitations || AF.state.judgmentAGPCitations.length === 0) {
            AF.state.judgmentAGPCitations = [{ id: nextCitationId('agp'), value: '' }];
        } else {
            AF.state.judgmentAGPCitations = normalizeCitationList(AF.state.judgmentAGPCitations, 'agp');
        }
        if (!AF.state.draftingYears) {
            AF.state.draftingYears = '';
        }

        // Initialize barItems and practiceItems
        if (!AF.state.barItems) {
            AF.state.barItems = [{}];
        }
        if (!AF.state.practiceItems) {
            AF.state.practiceItems = [{}];
        }
    }

    // ============================================================
    // SAVE AND CONTINUE HANDLER
    // ============================================================

    function onSaveAndContinue() {
        if (tab3Saving) return;

        if (!validateStep3()) return;

        tab3Saving = true;
        const nextBtn = document.getElementById('experienceSave');

        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.textContent = 'Saving...';
        }

        saveExperienceData()
            .then(function (response) {
                console.log('[Tab3] Experience saved successfully:', response);
                AF.data.saveDraft();
                if (AF.nav) AF.nav.switchTab(4);
            })
            .catch(function (err) {
                console.error('[Tab3] Save error:', err);
                alert(err && err.message ? err.message : 'Failed to save experience data. Please try again.');
            })
            .finally(function () {
                tab3Saving = false;
                if (nextBtn) {
                    nextBtn.disabled = false;
                    nextBtn.textContent = 'Save and Continue';
                }
            });
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================

    function init() {
        if (initDone) return;
        initDone = true;
        ensureDeletedPracticeState();

        initOptimizedDateValidation();
        initTab3InstantValidation();
        $(document).off('keydown.tab3Years paste.tab3Years', '.bar-years').on('keydown.tab3Years paste.tab3Years', '.bar-years', function (e) {
            e.preventDefault();
        });
        initDefaultItems();
        initJudgmentCitationHandlers();
        initProceedingToggles();
        initConditionalFields();
        initDraftingExperience();
        initExperienceTooltips(document.getElementById('tab3'));
        initAchievementUploadUi();
        initFileUploadHandlers();
        initTab3UploadUi(document.getElementById('tab3'));

        if (!document._tab3UploadClearBound) {
            document._tab3UploadClearBound = true;
            document.addEventListener('file-upload-cleared', function (e) {
                const input = e.target;
                if (!input || input.type !== 'file') {
                    return;
                }
                if (input.id === 'achievementFiles') {
                    AF.state.achievementDocumentPath = '';
                }
            });
        }

        renderBarSections();
        renderPracticeSections();
        renderJudgmentAAG();
        renderJudgmentAGP();
        /* Experience loads when Tab 3 is opened (or via Tab 4 preview hydrate) — not on init, to avoid racing Tab 1 details + token refresh. */
        $(document).on('change input', '.bar-from, .bar-to, .practice-from, .practice-to', function () {
            recalculateTotalYears();
        });

        $(document).on('change', '.bar-court-type', function () {
            recalculateTotalYears();
        });

        // Save and Continue button handler
        const nextBtn = document.getElementById('experienceSave');
        if (nextBtn) {
            nextBtn.addEventListener('click', onSaveAndContinue);
        }

        $('#addBarExpBtn').off('click').on('click', function () {
            addBarSection();
        });

        $('#addPracticeBtn').off('click').on('click', function () {
            addPracticeSection();
        });

        $(document).off('click', '.remove-bar-item').on('click', '.remove-bar-item', function () {
            const sectionNum = $(this).data('section');
            if ($('#barExpContainer .bar-item').length > 1) {
                removeBarSection(sectionNum);
            } else {
                $('#barExpContainer .bar-years, #barExpContainer .bar-from, #barExpContainer .bar-to, #barExpContainer .bar-council').val('');
                $('#barExpContainer .bar-court-type').val('');
                recalculateTotalYears();
            }
        });

        $(document).off('click', '.remove-practice-item').on('click', '.remove-practice-item', function () {
            const sectionNum = $(this).data('section');
            if ($('#courtPracticeContainer .practice-item').length > 1) {
                removePracticeSection(sectionNum);
            } else {
                $('#courtPracticeContainer .practice-court, #courtPracticeContainer .practice-years, #courtPracticeContainer .practice-from, #courtPracticeContainer .practice-to').val('');
            }
        });

        $('#prevToTab2').off('click').on('click', function () {
            if (AF.nav) AF.nav.switchTab(2);
        });
    }
    // Add these functions to your Tab 3 code before the exposed API

    function syncBar() {
        AF.state.barItems = [];
        $('#barExpContainer .bar-item').each(function (index) {
            const $item = $(this);
            const docPath = trimExperienceStr($item.data('supporting-document'))
                || trimExperienceStr(
                    AF.state.barItems && AF.state.barItems[index]
                    && (AF.state.barItems[index].supporting_document || AF.state.barItems[index].supportingDocument)
                );
            AF.state.barItems.push({
                id: parseInt($item.data('bar-practice-id'), 10) || 0,
                years: getYearsFromField($item.find('.bar-years')),
                from: $item.find('.bar-from').val() || '',
                to: $item.find('.bar-to').val() || '',
                barCouncil: $item.find('.bar-council').val() || '',
                courtType: $item.find('.bar-court-type').val() || '',
                supporting_document: docPath,
                supportingDocument: docPath
            });
        });
    }

    function syncPractice() {
        AF.state.practiceItems = [];
        $('#courtPracticeContainer .practice-item').each(function (index) {
            const $item = $(this);
            const docPath = trimExperienceStr($item.data('practice-document'))
                || trimExperienceStr(
                    AF.state.practiceItems && AF.state.practiceItems[index]
                    && (AF.state.practiceItems[index].practice_document || AF.state.practiceItems[index].practiceDocument)
                );
            AF.state.practiceItems.push({
                id: parseInt($item.data('court-practice-id'), 10) || 0,
                courtName: $item.find('.practice-court').val() || '',
                years: getYearsFromField($item.find('.practice-years')),
                from: $item.find('.practice-from').val() || '',
                to: $item.find('.practice-to').val() || '',
                practice_document: docPath,
                practiceDocument: docPath
            });
        });
    }

    function syncJudgmentAAG() {
        if (citationRendering) {
            return;
        }
        persistCitationsToState('aag');
    }

    function syncJudgmentAGP() {
        if (citationRendering) {
            return;
        }
        persistCitationsToState('agp');
    }

    function syncAll() {
        syncBar();
        syncPractice();
        syncJudgmentAAG();
        syncJudgmentAGP();
        syncBarSections();
        syncPracticeSections();
    }

    /** Rebuild Tab 3 DOM from AF.state (do not sync from DOM first — it may be empty). */
    function restoreTab3FromState() {
        if (!initDone) {
            return;
        }

        const barItems = AF.state.barItems || [];
        if (barItems.length > 0) {
            AF.state.barSections = barItems.map(function (_, i) { return i + 1; });
            barSectionCounter = barItems.length + 1;
            renderBarSections();
            barItems.forEach(function (item, index) {
                const $item = $('#barExpContainer .bar-item').eq(index);
                if (!$item.length) {
                    return;
                }
                if (item.id) {
                    $item.data('bar-practice-id', item.id);
                }
                $item.find('.bar-from').val(item.from || '');
                $item.find('.bar-to').val(item.to || '');
                $item.find('.bar-council').val(item.barCouncil || '');
                $item.find('.bar-court-type').val(item.courtType || '');
                updateItemExperienceYears($item);
                if (item.years) {
                    $item.find('.bar-years').val(formatExperienceYearsForDisplay(item.years));
                }
                const resolved = resolveExperienceDocumentDisplay('bar', item, index);
                if (resolved.serverPath) {
                    $item.data('supporting-document', resolved.serverPath);
                }
                if (resolved.path) {
                    applyExistingUploadUi($item[0], resolved.path, {
                        preview: resolved.preview,
                        serverPath: resolved.serverPath,
                        type: 'bar'
                    });
                }
            });
        }

        const practiceItems = AF.state.practiceItems || [];
        if (practiceItems.length > 0) {
            AF.state.practiceSections = practiceItems.map(function (_, i) { return i + 1; });
            practiceSectionCounter = practiceItems.length + 1;
            renderPracticeSections();
            practiceItems.forEach(function (item, index) {
                const $item = $('#courtPracticeContainer .practice-item').eq(index);
                if (!$item.length) {
                    return;
                }
                if (item.id) {
                    $item.data('court-practice-id', item.id);
                }
                $item.find('.practice-court').val(item.courtName || '');
                $item.find('.practice-from').val(item.from || '');
                $item.find('.practice-to').val(item.to || '');
                updateItemExperienceYears($item);
                if (item.years) {
                    $item.find('.practice-years').val(formatExperienceYearsForDisplay(item.years));
                }
                const resolved = resolveExperienceDocumentDisplay('practice', item, index);
                if (resolved.serverPath) {
                    $item.data('practice-document', resolved.serverPath);
                }
                if (resolved.path) {
                    applyExistingUploadUi($item[0], resolved.path, {
                        preview: resolved.preview,
                        serverPath: resolved.serverPath,
                        type: 'practice'
                    });
                }
            });
        }

        renderJudgmentAAG();
        renderJudgmentAGP();

        recalculateTotalYears();

        if (AF.files && typeof AF.files.mountAllDocPreviewButtons === 'function') {
            AF.files.mountAllDocPreviewButtons(document.getElementById('tab3'));
        }
    }

    // ============================================================
    // EXPOSED API
    // ============================================================

    // Add to AF.api like Tab 2
    AF.api = AF.api || {};
    AF.api.saveExperience = saveExperienceData;
    AF.api.postExperienceSave = postExperienceSave;
    AF.api.buildExperienceSavePayload = buildExperienceSavePayload;
    AF.api.collectExperienceData = collectExperienceData;
    AF.api.uploadDocument = uploadDocument;

    AF.tab3 = {
        init: init,
        collectData: collectExperienceData,
        buildPayload: buildExperienceSavePayload,
        saveExperience: saveExperienceData,
        validateStep3: validateStep3,
        onSaveAndContinue: onSaveAndContinue,
        fetchExperienceData: fetchExperienceData,
        loadExperienceData: loadExperienceData,
        populateExperienceData: populateExperienceData,
        applyJudgementsToCitationState: applyJudgementsToCitationState,
        parseExperienceResponse: parseExperienceResponse,
        uploadDocument: uploadDocument,
        syncBar: syncBar,
        syncPractice: syncPractice,
        syncJudgmentAAG: syncJudgmentAAG,
        syncJudgmentAGP: syncJudgmentAGP,
        syncAll: syncAll,
        syncBarSections: syncBarSections,
        syncPracticeSections: syncPracticeSections,
        restoreTab3FromState: restoreTab3FromState,
        renderBar: renderBarSections,
        renderPractice: renderPracticeSections,
        renderJudgmentAAG: renderJudgmentAAG,
        renderJudgmentAGP: renderJudgmentAGP,
        renderCitationsFromState: renderCitationsForKind,
        persistCitationsToState: persistCitationsToState
    };

    function fetchExperienceData(applicationId) {
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.reject(new Error('API client is not loaded.'));
        }

        const applicantId = getApplicantId();
        const apId = parseInt(applicationId, 10) || parseInt(applicantId, 10);

        if (!apId) {
            return Promise.reject(new Error('Application ID or Applicant ID is required.'));
        }

        const payload = {
            applicant_id: apId
        };

        console.log('[Tab3] Fetching experience data for applicant:', apId);

        return ensureSessionTokens().then(function () {
            return global.LawPortal.apiRequest(
                'vacancy/experience/fetchExperience',
                'POST',
                payload
            );
        }).then(function (res) {
            const body = unwrapApiResult(res);
            if (!parseExperienceResponse(body)) {
                throw new Error(body.error || 'Unable to fetch experience details.');
            }
            console.log('[Tab3] Experience data fetched:', body);
            return body;
        });
    }


    function parseExperienceResponse(response) {
        if (!response) {
            return null;
        }
        if (response.ok === false) {
            return null;
        }
        if (Array.isArray(response)) {
            const row = response[0];
            if (row && row.fn_application_get_experience_details) {
                try {
                    return JSON.parse(row.fn_application_get_experience_details);
                } catch (e) {
                    console.error('[Tab3] Failed to parse experience array row:', e);
                }
            }
            return null;
        }
        if (response.experience || response.bar_practice || response.court_practice || response.judgements) {
            return response;
        }
        if (response.data) {
            if (typeof response.data === 'string') {
                try {
                    return JSON.parse(response.data);
                } catch (e) {
                    console.warn('[Tab3] parseExperienceResponse data string:', e);
                }
            }
            if (typeof response.data === 'object' && (response.data.experience || response.data.bar_practice)) {
                return response.data;
            }
        }
        const row = response['0'] || response[0] || (Array.isArray(response) ? response[0] : null);
        if (row && row.fn_application_get_experience_details) {
            try {
                return JSON.parse(row.fn_application_get_experience_details);
            } catch (e) {
                console.error('[Tab3] Failed to parse fn_application_get_experience_details:', e);
            }
        }
        return null;
    }

    function applyJudgementsToCitationState(judgements) {
        const aagCitations = [];
        const agpCitations = [];

        (judgements || []).forEach(function (judgement) {
            const cat = String(judgement.category || '').toUpperCase();
            (judgement.citations || []).forEach(function (citation) {
                const citText = citationTextForJudgementPayload(citation);
                if (!citText) {
                    return;
                }
                const citeType = String(citation.citation_type || citation.citationType || '').toUpperCase();
                const agpCategory = cat === 'AGP' || cat === 'SGP' || cat === 'GP'
                    || cat.indexOf('GOVERNMENT PLEADER') >= 0;
                if (citeType === '5_YEAR' || agpCategory) {
                    agpCitations.push(citText);
                } else {
                    aagCitations.push(citText);
                }
            });
        });

        const uniqueAAG = [...new Set(aagCitations)];
        const uniqueAGP = [...new Set(agpCitations)];

        if (uniqueAAG.length > 0) {
            AF.state.judgmentAAGCitations = uniqueAAG.map(function (text) {
                return { id: nextCitationId('aag'), value: text };
            });
        }
        if (uniqueAGP.length > 0) {
            AF.state.judgmentAGPCitations = uniqueAGP.map(function (text) {
                return { id: nextCitationId('agp'), value: text };
            });
        }

        renderJudgmentAAG();
        renderJudgmentAGP();
    }

    function populateExperienceData(response) {
        const expData = parseExperienceResponse(response);
        if (!expData) {
            console.log('[Tab3] No experience data to populate');
            return;
        }
        console.log('[Tab3] Parsed experience data:', expData);

        if (!AF.state.filePreviews) {
            AF.state.filePreviews = {};
        }
        Object.keys(AF.state.filePreviews).forEach(function (k) {
            if (k.indexOf('bar-') === 0 || k.indexOf('practice-') === 0 || k === 'achievement') {
                delete AF.state.filePreviews[k];
            }
        });
        AF.state.deletedBarPractices = [];
        AF.state.deletedCourtPractices = [];

        const experience = expData.experience || {};
        const barPractice = expData.bar_practice || [];
        const courtPractice = expData.court_practice || [];
        const judgements = expData.judgements || [];

        // 1. Basic Fields
        if (experience.law_degree_recognized !== undefined) {
            const lawDegreeVal = experience.law_degree_recognized === true || experience.law_degree_recognized === 'true' || experience.law_degree_recognized === 1 ? 'Yes' : 'No';
            $('#lawDegreeRecognized1').val(lawDegreeVal);
        }

        if (experience.govt_law_officer_experience !== undefined) {
            const govtVal = experience.govt_law_officer_experience === true || experience.govt_law_officer_experience === 'true' || experience.govt_law_officer_experience === 1 ? 'Yes' : 'No';
            $('#previousWorked').val(govtVal).trigger('change');
        }

        if (experience.provide_details_if_yes) {
            $('#previousWorkedDetails').val(experience.provide_details_if_yes);
        }

        // 2. Current proceedings — fill textareas before toggling radios
        if (experience.current_facing_criminal_proceedings !== undefined) {
            const isCurrentProceeding = experience.current_facing_criminal_proceedings === true
                || experience.current_facing_criminal_proceedings === 'true'
                || experience.current_facing_criminal_proceedings === 1;
            applyProceedingRadios(
                isCurrentProceeding,
                '#currentProceedingYes',
                '#currentProceedingNo',
                '#currentProceedingDetails',
                {
                    criminal_details: experience.current_criminal_cases_details || '',
                    criminal_status: experience.current_criminal_cases_present_status || '',
                    disciplinary_details: experience.current_disciplinary_proceeding_details || '',
                    disciplinary_status: experience.current_disciplinary_proceeding_present_status || ''
                }
            );
        }

        // 3. Past proceedings
        if (experience.past_facing_criminal_proceedings !== undefined) {
            const isPastProceeding = experience.past_facing_criminal_proceedings === true
                || experience.past_facing_criminal_proceedings === 'true'
                || experience.past_facing_criminal_proceedings === 1;
            applyProceedingRadios(
                isPastProceeding,
                '#pastProceedingYes',
                '#pastProceedingNo',
                '#pastProceedingDetails',
                {
                    criminal_details: experience.past_criminal_cases_details || '',
                    criminal_status: experience.past_criminal_cases_present_status || '',
                    disciplinary_details: experience.past_disciplinary_proceeding_details || '',
                    disciplinary_status: experience.past_disciplinary_proceeding_present_status || ''
                }
            );
        }

        // 4. Achievement Section
        if (experience.professional_achievement !== undefined) {
            const pa = experience.professional_achievement;
            if (typeof pa === 'string' && pa.length > 2 && pa !== 'true' && pa !== 'false') {
                $('#achievmenetWrap').val('Yes').trigger('change');
                $('#achievementDetails').val(pa);
            } else {
                const hasAchievement = pa === true || pa === 'true' || pa === 1 ? 'Yes' : 'No';
                $('#achievmenetWrap').val(hasAchievement).trigger('change');
            }
        }

        if (experience.achievement_remarks) {
            $('#achievementDetails').val(experience.achievement_remarks);
        }

        if (experience.achievement_support_document) {
            uploadedAchievementDocumentPath = experience.achievement_support_document;
            AF.state.achievementDocumentPath = experience.achievement_support_document;
            AF.state.filePreviews.achievement = docPreviewFromPath(experience.achievement_support_document);
            const achMount = document.getElementById('achievementFilesMount');
            if (achMount) {
                applyExistingUploadUi(achMount, experience.achievement_support_document);
            }
        }

        // 5. Bar Experiences - WITH IDs and court_type
        if (barPractice && barPractice.length > 0) {
            $('#barExpContainer').empty();
            AF.state.barSections = [];
            AF.state.barItems = [];

            barPractice.forEach(function (practice, index) {
                const sectionNum = index + 1;
                AF.state.barSections.push(sectionNum);
                AF.state.barItems.push({
                    id: practice.bar_practice_id || 0,
                    years: practice.years_experience != null && practice.years_experience !== ''
                        ? formatExperienceYearsForDisplay(String(practice.years_experience)) : '',
                    from: practice.from_date || '',
                    to: practice.to_date || '',
                    barCouncil: practice.bar_council_name || '',
                    courtType: practice.court_type || '',
                    supporting_document: practice.supporting_document || '',
                    supportingDocument: practice.supporting_document || ''
                });
            });

            barSectionCounter = barPractice.length + 1;
            renderBarSections();

            // Populate values after render and set IDs and file names
            barPractice.forEach(function (practice, index) {
                const $item = $('#barExpContainer .bar-item').eq(index);
                if ($item.length) {
                    // Store the bar_practice_id
                    $item.data('bar-practice-id', practice.bar_practice_id || 0);

                    $item.find('.bar-from').val(practice.from_date || '');
                    $item.find('.bar-to').val(practice.to_date || '');
                    updateItemExperienceYears($item);
                    if (!$item.find('.bar-years').val() && practice.years_experience != null && practice.years_experience !== '') {
                        $item.find('.bar-years').val(formatExperienceYearsForDisplay(String(practice.years_experience)));
                    }
                    $item.find('.bar-council').val(practice.bar_council_name || '');
                    $item.find('.bar-court-type').val(practice.court_type || '');

                    if (practice.supporting_document) {
                        $item.data('supporting-document', practice.supporting_document);
                        AF.state.filePreviews['bar-' + index] = docPreviewFromPath(practice.supporting_document);
                        applyExistingUploadUi($item[0], practice.supporting_document);
                    }
                }
            });
        }

        // 6. Court Practices - WITH IDs
        if (courtPractice && courtPractice.length > 0) {
            $('#courtPracticeContainer').empty();
            AF.state.practiceSections = [];
            AF.state.practiceItems = [];

            courtPractice.forEach(function (practice, index) {
                const sectionNum = index + 1;
                AF.state.practiceSections.push(sectionNum);
                AF.state.practiceItems.push({
                    id: practice.court_practice_id || 0,
                    courtName: practice.court_name || '',
                    years: String(practice.years_experience != null ? practice.years_experience : ''),
                    from: practice.from_date || '',
                    to: practice.to_date || '',
                    practice_document: practice.practice_document || '',
                    practiceDocument: practice.practice_document || ''
                });
            });

            practiceSectionCounter = courtPractice.length + 1;
            renderPracticeSections();

            // Populate values after render and set IDs and file names
            courtPractice.forEach(function (practice, index) {
                const $item = $('#courtPracticeContainer .practice-item').eq(index);
                if ($item.length) {
                    // Store the court_practice_id
                    $item.data('court-practice-id', practice.court_practice_id || 0);

                    $item.find('.practice-court').val(practice.court_name || '');
                    $item.find('.practice-from').val(practice.from_date || '');
                    $item.find('.practice-to').val(practice.to_date || '');
                    updateItemExperienceYears($item);
                    if (!$item.find('.practice-years').val() && practice.years_experience != null && practice.years_experience !== '') {
                        $item.find('.practice-years').val(formatExperienceYearsForDisplay(String(practice.years_experience)));
                    }

                    if (practice.practice_document) {
                        $item.data('practice-document', practice.practice_document);
                        AF.state.filePreviews['practice-' + index] = docPreviewFromPath(practice.practice_document);
                        applyExistingUploadUi($item[0], practice.practice_document);
                    }
                }
            });
        }

        // 7. Judgments/Citations (7_YEAR → AAG, 5_YEAR → AGP)
        if (judgements && judgements.length > 0) {
            applyJudgementsToCitationState(judgements);
        }

        // 8. Drafting Experience
        if (experience.drafting_experience_years != null && experience.drafting_experience_years !== '') {
            $('#draftingYears').val(formatExperienceYearsForDisplay(String(experience.drafting_experience_years)));
        }

        if (experience.total_bar_experience_years != null && experience.total_bar_experience_years !== '') {
            $('#totalBarYears').val(formatExperienceYearsForDisplay(String(experience.total_bar_experience_years)) + ' years');
        }

        if (experience.total_practice_years != null && experience.total_practice_years !== '') {
            const specEl = document.getElementById('specificBarYears');
            if (specEl) {
                specEl.value = formatExperienceYearsForDisplay(String(experience.total_practice_years)) + ' years';
            }
        }

        recalculateTotalYears();

        if (AF.files && typeof AF.files.mountAllDocPreviewButtons === 'function') {
            AF.files.mountAllDocPreviewButtons(document.querySelector('.app-container'));
        }
        AF.state.experienceHydrated = true;

        console.log('[Tab3] Experience data populated successfully');
    }
    /**
     * Load experience data when tab is opened
     */
    function loadExperienceData() {
        const applicationId = getApplicationId();
        const applicantId = getApplicantId();

        const apId = parseInt(applicationId, 10) || parseInt(applicantId, 10);

        if (!apId) {
            console.log('[Tab3] No application ID or applicant ID found, skipping load');
            return Promise.resolve(null);
        }

        return fetchExperienceData(apId)
            .then(function (response) {
                if (parseExperienceResponse(response)) {
                    populateExperienceData(response);
                }
                return response;
            })
            .catch(function (err) {
                console.warn('[Tab3] Failed to load experience data:', err);
                return null;
            });
    }

})(window.ApplicationForm, window);