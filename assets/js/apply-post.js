/**
 * Apply-post page — loads vacancies from POST /api/vacancies (authenticated).
 */
(function ($, global) {
    'use strict';

    const JS = global.JobSelection;
    const BENCH_MADRAS = JS ? JS.BENCH_MADRAS : 'High Court';
    const BENCH_MADURAI = JS ? JS.BENCH_MADURAI : 'Madurai Bench';

    let selectionLocked = false;
    let catalogRows = [];
    let submittedSelectionState = null;

    function buildJobId(postId, benchKey) {
        if (JS) return JS.buildJobId(postId, benchKey);
        const suffix = String(benchKey).toLowerCase() === 'madurai' ? 'B' : 'A';
        return String(postId) + suffix;
    }

    function isAuthenticated() {
        return !!global.localStorage.getItem('access_token')
            && global.sessionStorage.getItem('isLoggedIn') === 'true';
    }

    function redirectToLogin() {
        const returnTo = encodeURIComponent('apply-post.html');
        global.location.href = 'login.html?return=' + returnTo;
    }

    function clearPortalSession() {
        if (global.AppData && typeof global.AppData.logout === 'function') {
            global.AppData.logout();
        } else {
            global.localStorage.removeItem('access_token');
            global.localStorage.removeItem('refresh_token');
            global.sessionStorage.clear();
        }
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function pickField(row, keys) {
        if (!row || typeof row !== 'object') return '';
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
                return row[key];
            }
            const lower = key.toLowerCase();
            if (row[lower] !== undefined && row[lower] !== null && row[lower] !== '') {
                return row[lower];
            }
        }
        return '';
    }

    function parseCount(val) {
        if (val === null || val === undefined) return 0;
        const s = String(val).trim();
        if (s === '' || /^n(i)?ll$/i.test(s)) return 0;
        const n = parseInt(s, 10);
        return isNaN(n) ? 0 : n;
    }

    function parseIntField(val, fallback) {
        if (val === null || val === undefined || val === '') {
            return fallback !== undefined ? fallback : 0;
        }
        const n = parseInt(String(val).trim(), 10);
        return isNaN(n) ? (fallback !== undefined ? fallback : 0) : n;
    }

    function formatCount(val) {
        const n = parseCount(val);
        return n > 0 ? String(n) : 0;
    }

    function padSlNo(n) {
        return String(n);
    }

    function isBenchSelectedForRow(postId, benchKey) {
        if (!submittedSelectionState || !submittedSelectionState.selections) {
            return false;
        }
        return submittedSelectionState.selections.some(function (item) {
            const sel = JS ? JS.normalizeSelection(item) : item;
            if (!sel) return false;
            const selBench = sel.benchKey || (String(sel.courtBench || '').toLowerCase().indexOf('madurai') !== -1 ? 'madurai' : 'madras');
            return String(sel.postId) === String(postId) && selBench === benchKey;
        });
    }

    function buildBenchCellHtml(row, benchKey, count, submittedView) {
        const disabled = count <= 0 ? ' disabled' : '';
        const countClass = benchKey === 'madurai' ? 'secondary' : 'primary';
        const vacancyKey = benchKey === 'madurai' ? 'maduraiVacancyId' : 'madrasVacancyId';
        const courtKey = benchKey === 'madurai' ? 'maduraiCourtId' : 'madrasCourtId';

        if (submittedView) {
            const selected = isBenchSelectedForRow(row.id, benchKey) && count > 0;
            const checkHtml = selected
                ? '<span class="bench-submitted-check" title="Applied"><i class="bi bi-check-lg"></i></span>'
                : '<span class="bench-submitted-check bench-submitted-check--empty" aria-hidden="true"></span>';
            return (
                '<td><div class="bench-card bench-card--submitted">' +
                checkHtml +
                '<div class="count-badge ' + countClass + '">' + escapeHtml(formatCount(count)) + '</div>' +
                '</div></td>'
            );
        }

        return (
            '<td><div class="bench-card">' +
            '<label class="premium-checkbox">' +
            '<input type="checkbox" class="bench-select" data-bench="' + benchKey + '"' +
            ' data-post-id="' + escapeHtml(row.id) + '"' +
            ' data-job-id="' + escapeHtml(buildJobId(row.id, benchKey)) + '"' +
            ' data-vacancy-id="' + escapeHtml(String(row[vacancyKey] || '')) + '"' +
            ' data-court-id="' + escapeHtml(String(row[courtKey] || '')) + '"' +
            disabled + '>' +
            '<span></span></label>' +
            '<div class="count-badge ' + countClass + '">' + escapeHtml(formatCount(count)) + '</div>' +
            '</div></td>'
        );
    }

    function normalizeVacancyRow(row, index) {
        const madras = parseCount(pickField(row, [
            'highcourt_madras', 'madras_hc', 'madras_count', 'hc_madras', 'high_court_madras',
            'madras', 'madras_vacancy', 'madrashc'
        ]));
        const madurai = parseCount(pickField(row, [
            'madurai_bench', 'madurai_count', 'madurai', 'madurai_vacancy', 'maduraibench'
        ]));
        let total = parseCount(pickField(row, [
            'total_vacancy', 'total', 'total_count', 'totalvacancy'
        ]));
        if (total <= 0 && (madras > 0 || madurai > 0)) {
            total = madras + madurai;
        }

        const id = pickField(row, [
            'post_id', 'postid', 'id', 'job_id', 'jobid', 'post_master_id'
        ]);
        const postIdNum = parseInt(id, 10);
        const vacancyId = parseIntField(pickField(row, ['vacancy_id', 'vacancyId']), 0);
        const courtId = parseIntField(pickField(row, ['court_id', 'courtId']), 0);
        const madrasCourtId = parseIntField(
            pickField(row, ['madras_court_id', 'highcourt_court_id', 'high_court_id']),
            courtId > 0 ? courtId : 1
        );
        const maduraiCourtId = parseIntField(
            pickField(row, ['madurai_court_id', 'madurai_bench_court_id']),
            courtId === 2 ? courtId : 2
        );

        return {
            id: id !== '' ? String(id) : String(index + 1),
            slNo: (!isNaN(postIdNum) && postIdNum > 0) ? postIdNum : (index + 1),
            postName: pickField(row, [
                'post_name', 'position', 'post_title', 'postname', 'designation', 'post'
            ]),
            postLevel: pickField(row, [
                'post_level', 'level', 'category', 'post_category', 'postlevel', 'post_type'
            ]),
            vacancyId: vacancyId,
            courtId: courtId,
            madrasCourtId: madrasCourtId,
            maduraiCourtId: maduraiCourtId,
            madrasVacancyId: madras > 0 ? vacancyId : 0,
            maduraiVacancyId: madurai > 0 ? vacancyId : 0,
            madras: madras,
            madurai: madurai,
            total: total
        };
    }

    /**
     * API may return one row per court for the same post.
     * Merge into a single row per unique position with both bench counts.
     */
    function mergeVacancyRowsByPost(rows) {
        const byPost = {};
        const order = [];

        rows.forEach(function (row) {
            const key = String(row.id || row.postName || '').trim();
            if (!key) return;

            if (!byPost[key]) {
                byPost[key] = {
                    id: row.id,
                    slNo: row.slNo,
                    postName: row.postName,
                    postLevel: row.postLevel,
                    madras: 0,
                    madurai: 0,
                    total: 0,
                    madrasVacancyId: 0,
                    madrasCourtId: 0,
                    maduraiVacancyId: 0,
                    maduraiCourtId: 0
                };
                order.push(key);
            }

            const merged = byPost[key];
            if (!merged.postName && row.postName) merged.postName = row.postName;
            if (!merged.postLevel && row.postLevel) merged.postLevel = row.postLevel;
            if (!merged.slNo && row.slNo) merged.slNo = row.slNo;

            if (row.madras > 0) {
                merged.madras = Math.max(merged.madras, row.madras);
                merged.madrasVacancyId = row.vacancyId || row.madrasVacancyId || merged.madrasVacancyId;
                merged.madrasCourtId = row.madrasCourtId || row.courtId || merged.madrasCourtId;
            }

            if (row.madurai > 0) {
                merged.madurai = Math.max(merged.madurai, row.madurai);
                merged.maduraiVacancyId = row.vacancyId || row.maduraiVacancyId || merged.maduraiVacancyId;
                merged.maduraiCourtId = row.maduraiCourtId || row.courtId || merged.maduraiCourtId;
            }

            // Row carries count only in total_vacancy for one court
            if (row.madras <= 0 && row.madurai <= 0 && row.total > 0) {
                const isMaduraiCourt = row.courtId === 2 || row.maduraiCourtId === 2;

                if (isMaduraiCourt) {
                    merged.madurai = Math.max(merged.madurai, row.total);
                    merged.maduraiVacancyId = row.vacancyId || merged.maduraiVacancyId;
                    merged.maduraiCourtId = row.courtId || row.maduraiCourtId || merged.maduraiCourtId;
                } else {
                    merged.madras = Math.max(merged.madras, row.total);
                    merged.madrasVacancyId = row.vacancyId || merged.madrasVacancyId;
                    merged.madrasCourtId = row.courtId || row.madrasCourtId || merged.madrasCourtId;
                }
            }
        });

        return order.map(function (key, index) {
            const merged = byPost[key];
            merged.total = merged.madras + merged.madurai;
            merged.slNo = merged.slNo || (index + 1);
            merged.madrasCourtId = merged.madrasCourtId || 1;
            merged.maduraiCourtId = merged.maduraiCourtId || 2;
            merged.vacancyId = merged.madrasVacancyId || merged.maduraiVacancyId;
            merged.courtId = merged.madrasCourtId || merged.maduraiCourtId;
            return merged;
        }).sort(function (a, b) {
            return Number(a.slNo) - Number(b.slNo);
        });
    }

    function extractVacancyList(result) {
        if (!result) return [];
        if (Array.isArray(result)) return result;
        if (Array.isArray(result.data)) return result.data;
        if (result.data && Array.isArray(result.data.data)) return result.data.data;
        if (Array.isArray(result.vacancies)) return result.vacancies;
        if (Array.isArray(result.posts)) return result.posts;
        // Fallback when an array was merged as numeric keys: { ok: true, 0: {...}, 1: {...} }
        const numericKeys = Object.keys(result).filter(function (k) { return /^\d+$/.test(k); });
        if (numericKeys.length) {
            return numericKeys
                .sort(function (a, b) { return Number(a) - Number(b); })
                .map(function (k) { return result[k]; });
        }
        return [];
    }

    function ensureSessionTokens() {
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.resolve();
        }
        if (global.sessionStorage.getItem('encryption_key')
            && global.sessionStorage.getItem('csrf_token')) {
            return Promise.resolve();
        }
        return global.LawPortal.apiRequest('getTOKENS', 'GET').then(function (res) {
            if (res && res.encryption_key) {
                global.sessionStorage.setItem('encryption_key', res.encryption_key);
            }
            if (res && res.csrf_token) {
                global.sessionStorage.setItem('csrf_token', res.csrf_token);
            }
        }).catch(function () { /* optional refresh */ });
    }

    function loadVacancies() {
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.reject(new Error('API client is not loaded.'));
        }
        return ensureSessionTokens().then(function () {
            return global.LawPortal.apiRequest('vacancies', 'POST', {});
        });
    }

    function loadSubmittedSelections() {
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.resolve({ submitted: false, selectedCheckboxes: '', selections: [] });
        }

        const applicantId = global.sessionStorage.getItem('applicantId') || '';
        if (!applicantId) {
            return Promise.resolve({ submitted: false, selectedCheckboxes: '', selections: [] });
        }

        return ensureSessionTokens().then(function () {
            return global.LawPortal.apiRequest('vacancy/selections/get', 'POST', {
                applicant_id: applicantId,
                applicantId: applicantId
            });
        }).then(function (res) {
            if (res && res.ok === false) {
                throw new Error(res.error || res.message || 'Unable to load selections.');
            }

            let selectedCheckboxes = '';
            if (typeof res.selected_checkboxes === 'string') {
                selectedCheckboxes = res.selected_checkboxes.trim();
            } else if (Array.isArray(res.data) && res.data[0]) {
                selectedCheckboxes = String(res.data[0].selected_checkboxes || '').trim();
            }

            const submitted = JS
                ? JS.isSubmittedCheckboxes(selectedCheckboxes)
                : selectedCheckboxes.length > 0;
            const selections = JS
                ? JS.parseSelectedCheckboxes(selectedCheckboxes)
                : [];

            if (submitted) {
                global.sessionStorage.setItem('applicationSubmitted', 'true');
                global.sessionStorage.setItem('selectedCheckboxes', selectedCheckboxes);
                if (selections.length) {
                    saveSelectedVacancies(selections);
                }
            } else {
                global.sessionStorage.removeItem('applicationSubmitted');
                global.sessionStorage.removeItem('selectedCheckboxes');
            }

            return {
                submitted: submitted,
                selectedCheckboxes: selectedCheckboxes,
                selections: selections
            };
        }).catch(function () {
            return { submitted: false, selectedCheckboxes: '', selections: [] };
        });
    }

    function applySubmittedCheckboxes(selections) {
        if (!selections || !selections.length) return;

        selections.forEach(function (item) {
            const sel = JS ? JS.normalizeSelection(item) : item;
            const postId = String(sel.postId || '');
            const bench = sel.benchKey || 'madras';
            $('.bench-select[data-post-id="' + postId + '"][data-bench="' + bench + '"]').prop('checked', true);
        });
    }

    function getTableColSpan() {
        return submittedSelectionState && submittedSelectionState.submitted ? 6 : 5;
    }

    function getApplicantMobile() {
        return String(global.sessionStorage.getItem('mobile') || '').replace(/\D/g, '');
    }

    function setSubmittedTableMode(submitted) {
        $('.vacancy-table').toggleClass('vacancy-table--submitted', !!submitted);
    }

    function buildApplicationIdCellHtml(postId) {
        if (!submittedSelectionState || !submittedSelectionState.submitted) {
            return '';
        }

        const mobile = getApplicantMobile();
        const selections = submittedSelectionState.selections || [];
        let apps = [];

        if (JS && typeof JS.applicationIdsForPost === 'function') {
            apps = JS.applicationIdsForPost(postId, selections, mobile);
        } else {
            selections.forEach(function (item) {
                if (String(item.postId) !== String(postId)) {
                    return;
                }
                const jobId = String(item.jobId || '').toUpperCase();
                if (!jobId) {
                    return;
                }
                apps.push({
                    jobId: jobId,
                    applicationNo: mobile ? mobile + '-' + jobId : jobId
                });
            });
        }

        if (!apps.length) {
            return (
                '<td class="application-id-cell">' +
                '<span class="text-muted">—</span></td>'
            );
        }

        const links = apps.map(function (app) {
            const href = 'application-form.html?previewView=1&submitted=1&jobId=' + encodeURIComponent(app.jobId);
            return (
                '<a href="' + href + '" class="application-id-link" title="View application ' +
                escapeHtml(app.applicationNo) + '">' + escapeHtml(app.applicationNo) + '</a>'
            );
        }).join('');

        return (
            '<td class="application-id-cell">' +
            '<div class="application-id-list">' + links + '</div></td>'
        );
    }

    function lockApplyButtonAfterSubmit() {
        const $btn = $('#btnApplyPost');
        if (!$btn.length) return;
        if (!$btn.data('orig-text')) {
            $btn.data('orig-text', $btn.text().trim() || 'Apply for Selected Post(s)');
        }
        $btn
            .prop('disabled', true)
            .attr('type', 'button')
            .attr('aria-disabled', 'true')
            .addClass('apply-post-btn--locked')
            .text($btn.data('orig-text'));
    }

    function lockVacancyTableAsSubmitted() {
        selectionLocked = true;
        setSubmittedTableMode(true);
        $('.bench-select').prop('disabled', true);
        $('.vacancy-table-wrapper').addClass('vacancy-table-wrapper--locked');
        lockApplyButtonAfterSubmit();

        if (!$('#vacancySubmittedAlert').length) {
            $('.vacancy-table-wrapper').before(
                '<div id="vacancySubmittedAlert" class="alert alert-info mb-3">' +
                '<i class="bi bi-check-circle me-1"></i> Application already submitted. Post selections are locked.' +
                '</div>'
            );
        }

        if (catalogRows.length) {
            renderTable(catalogRows);
        }
    }

    function renderSummary(rows) {
        const totalVacancies = rows.reduce(function (sum, r) { return sum + r.total; }, 0);
        const $total = $('#vacancyTotalCount');
        const $categories = $('#vacancyCategoryCount');
        if ($total.length) $total.text(totalVacancies > 0 ? totalVacancies : '—');
        if ($categories.length) $categories.text(rows.length || '—');
    }

    function renderTable(rows) {
        const $tbody = $('#vacancyTableBody');
        if (!$tbody.length) return;

        catalogRows = rows || [];

        const colSpan = getTableColSpan();

        if (!rows.length) {
            $tbody.html(
                '<tr><td colspan="' + colSpan + '" class="text-center text-muted py-4">No vacancies are available at this time.</td></tr>'
            );
            return;
        }

        const showAppIds = !!(submittedSelectionState && submittedSelectionState.submitted);

        const html = rows.map(function (row, index) {
            const sl = padSlNo(typeof row.slNo === 'number' ? row.slNo : index + 1);
            const levelHtml = row.postLevel
                ? '<small>' + escapeHtml(row.postLevel) + '</small>'
                : '';

            return (
                '<tr data-post-id="' + escapeHtml(row.id) + '"' +
                ' data-post-name="' + escapeHtml(row.postName) + '"' +
                ' data-madras-vacancy-id="' + escapeHtml(String(row.madrasVacancyId || '')) + '"' +
                ' data-madras-court-id="' + escapeHtml(String(row.madrasCourtId || '')) + '"' +
                ' data-madurai-vacancy-id="' + escapeHtml(String(row.maduraiVacancyId || '')) + '"' +
                ' data-madurai-court-id="' + escapeHtml(String(row.maduraiCourtId || '')) + '">' +
                '<td>' + escapeHtml(sl) + '</td>' +
                '<td><h6>' + escapeHtml(row.postName || '—') + '</h6>' + levelHtml + '</td>' +
                buildBenchCellHtml(row, 'madras', row.madras, showAppIds) +
                buildBenchCellHtml(row, 'madurai', row.madurai, showAppIds) +
                '<td><span class="total-badge">' + escapeHtml(formatCount(row.total)) + '</span></td>' +
                (showAppIds ? buildApplicationIdCellHtml(row.id) : '') +
                '</tr>'
            );
        }).join('');

        $tbody.html(html);
        if (!showAppIds) {
            restoreBenchSelection();
            bindBenchSelection();
        }
    }

    function benchLabel(benchKey) {
        return benchKey === 'madurai' ? BENCH_MADURAI : BENCH_MADRAS;
    }

    function readStoredVacancies() {
        return JS ? JS.readStoredVacancies() : [];
    }

    function restoreBenchSelection() {
        const stored = readStoredVacancies();
        if (!stored.length) return;

        stored.forEach(function (item) {
            const sel = JS ? JS.normalizeSelection(item) : item;
            const postId = String(sel.postId || '');
            const bench = sel.benchKey || 'madras';
            $('.bench-select[data-post-id="' + postId + '"][data-bench="' + bench + '"]').prop('checked', true);
        });
        updateSelectionUi();
    }

    function bindBenchSelection() {
        $(document).off('change.benchSelect', '.bench-select').on('change.benchSelect', '.bench-select', function () {
            updateSelectionUi();
        });
    }

    function renderSelectedPostBadges(selections) {
        const $postsText = $('#selectedPostsText');
        if (!$postsText.length) return;

        if (!selections.length) {
            $postsText.html('<span class="selected-posts-empty">None selected</span>');
            return;
        }

        const normalized = selections.map(function (item) {
            return JS ? JS.normalizeSelection(item) : item;
        });
        const jobIds = JS
            ? JS.joinJobIds(normalized).split(',').filter(Boolean)
            : normalized.map(function (s) { return s.jobId; }).filter(Boolean);

        $postsText.html(
            jobIds.map(function (id) {
                return '<span class="post-badge">' + escapeHtml(id) + '</span>';
            }).join('')
        );
    }

    function updateSelectionUi() {
        const selections = getSelectedVacancies();
        const count = selections.length;

        renderSelectedPostBadges(selections);

        const $btn = $('#btnApplyPost');
        if (!$btn.length) return;
        if (selectionLocked) {
            lockApplyButtonAfterSubmit();
            return;
        }
        const base = $btn.data('orig-text') || 'Apply for Selected Post(s)';
        if (count > 0) {
            $btn.text(base + ' (' + count + ')');
        } else {
            $btn.text(base);
        }
    }

    function resolveCourtIdForBench($row, $input, benchKey) {
        const fromInput = parseIntField($input.data('court-id'), 0);
        if (fromInput > 0) return fromInput;

        const attr = benchKey === 'madurai' ? 'madurai-court-id' : 'madras-court-id';
        const fromRow = parseIntField($row.data(attr), 0);
        if (fromRow > 0) return fromRow;

        return benchKey === 'madurai' ? 2 : 1;
    }

    function resolveVacancyIdForBench($row, $input, benchKey) {
        const fromInput = parseIntField($input.data('vacancy-id'), 0);
        if (fromInput > 0) return fromInput;

        const attr = benchKey === 'madurai' ? 'madurai-vacancy-id' : 'madras-vacancy-id';
        return parseIntField($row.data(attr), 0);
    }

    function getSelectedVacancies() {
        const selections = [];

        $('.bench-select:checked').each(function () {
            const $input = $(this);
            const $row = $input.closest('tr');
            const benchKey = String($input.data('bench') || 'madras');

            const postId = String($row.data('post-id') || $input.data('post-id') || '');
            selections.push({
                postId: postId,
                postName: String($row.data('post-name') || ''),
                benchKey: benchKey,
                courtBench: benchLabel(benchKey),
                jobId: String($input.data('job-id') || buildJobId(postId, benchKey)),
                vacancyId: resolveVacancyIdForBench($row, $input, benchKey),
                courtId: resolveCourtIdForBench($row, $input, benchKey)
            });
        });

        return selections;
    }

    function saveSelectedVacancies(selections) {
        const normalized = selections.map(function (item) {
            return JS ? JS.normalizeSelection(item) : item;
        });

        global.sessionStorage.setItem('selectedVacancies', JSON.stringify(normalized));
        global.sessionStorage.setItem(
            'selectedJobId',
            JS ? JS.joinJobIds(normalized) : normalized.map(function (s) { return s.jobId; }).join(',')
        );

        const groups = JS ? JS.groupSelectionsByPost(normalized) : [];
        global.sessionStorage.setItem(
            'selectedPost',
            groups.length
                ? groups.map(function (g) { return g.postName; }).join('; ')
                : (normalized[0] && normalized[0].postName) || ''
        );

        if (normalized[0]) {
            global.sessionStorage.setItem('courtBench', normalized[0].courtBench);
        }
    }

    function showLoadError(message) {
        const $tbody = $('#vacancyTableBody');
        if ($tbody.length) {
            $tbody.html(
                '<tr><td colspan="' + getTableColSpan() + '" class="text-center text-danger py-4">' +
                escapeHtml(message || 'Unable to load vacancies.') +
                '</td></tr>'
            );
        }
        if (global.LawPortal && global.LawPortal.alert) {
            global.LawPortal.alert({
                icon: 'error',
                title: 'Load failed',
                text: message || 'Unable to load vacancies.'
            });
        }
    }

    function mountUserChip() {
        if (global.LawPortal && typeof global.LawPortal.bindHeaderUser === 'function') {
            global.LawPortal.bindHeaderUser();
            return;
        }
        const label = global.sessionStorage.getItem('advocateName')
            || global.sessionStorage.getItem('enrolmentNo')
            || global.sessionStorage.getItem('mobile')
            || 'Applicant';
        $('#userDisplayName').text(label);
    }

    function setApplyButtonLoading(loading) {
        const $btn = $('#btnApplyPost');
        if (!$btn.length) return;

        if (loading) {
            if (!$btn.data('orig-text')) {
                $btn.data('orig-text', $btn.text().trim() || 'Apply for Selected Post(s)');
            }
            $btn.prop('disabled', true).text('Loading vacancies…');
            return;
        }

        if (selectionLocked) {
            lockApplyButtonAfterSubmit();
            return;
        }

        $btn.prop('disabled', false).removeClass('apply-post-btn--locked').text($btn.data('orig-text') || 'Apply for Selected Post(s)');
    }

    function handleApplyPostClick() {
        if (selectionLocked
            || global.sessionStorage.getItem('applicationSubmitted') === 'true') {
            return;
        }

        const selections = getSelectedVacancies();
        if (!selections.length) {
            if (global.LawPortal && global.LawPortal.alert) {
                global.LawPortal.alert({
                    icon: 'warning',
                    title: 'No post selected',
                    text: 'Select one or more court bench checkboxes for the posts you wish to apply for.'
                });
            } else {
                alert('Select one or more court bench checkboxes for the posts you wish to apply for.');
            }
            return;
        }

        saveSelectedVacancies(selections);

        let jobIds = '';
        if (JS && typeof JS.joinJobIds === 'function') {
            jobIds = JS.joinJobIds(selections.map(function (s) {
                return JS.normalizeSelection ? JS.normalizeSelection(s) : s;
            }).filter(Boolean));
        }
        if (!jobIds) {
            jobIds = selections.map(function (s) { return s.jobId; }).filter(Boolean).join(',');
        }

        if (!jobIds) {
            if (global.LawPortal && global.LawPortal.alert) {
                global.LawPortal.alert({
                    icon: 'error',
                    title: 'Selection error',
                    text: 'Could not build job selection. Please refresh and try again.'
                });
            }
            return;
        }

        global.location.href = 'application-form.html?jobId=' + encodeURIComponent(jobIds);
    }

    $(function () {
        if (!isAuthenticated()) {
            redirectToLogin();
            return;
        }

        mountUserChip();

        const $applyBtn = $('#btnApplyPost');
        if ($applyBtn.length) {
            $applyBtn.attr('type', 'button');
            if (!$applyBtn.data('orig-text')) {
                $applyBtn.data('orig-text', $applyBtn.text().trim() || 'Apply for Selected Post(s)');
            }
        }

        $('#logoutLink').on('click', function (e) {
            e.preventDefault();
            clearPortalSession();
            global.location.href = 'index.html';
        });

        setApplyButtonLoading(true);

        loadVacancies()
            .then(function (res) {
                if (res && res.ok === false) {
                    throw new Error(res.error || res.message || 'Request failed.');
                }
                const raw = extractVacancyList(res);
                const normalized = raw.map(normalizeVacancyRow);
                const rows = mergeVacancyRowsByPost(normalized);
                global.sessionStorage.setItem('vacancyCatalog', JSON.stringify(rows));
                renderSummary(rows);
                catalogRows = rows;
                renderTable(rows);
                return loadSubmittedSelections();
            })
            .then(function (selectionState) {
                submittedSelectionState = selectionState || null;
                if (selectionState && selectionState.submitted) {
                    global.sessionStorage.setItem('applicationSubmitted', 'true');
                    applySubmittedCheckboxes(selectionState.selections);
                    lockVacancyTableAsSubmitted();
                    updateSelectionUi();
                } else if (global.sessionStorage.getItem('applicationSubmitted') === 'true') {
                    lockVacancyTableAsSubmitted();
                    updateSelectionUi();
                } else {
                    setSubmittedTableMode(false);
                }
            })
            .catch(function (err) {
                const msg = (err && err.message) ? err.message : 'Unable to load vacancies. Please try again.';
                showLoadError(msg);
                if (msg.indexOf('Unauthorized') !== -1 || msg.indexOf('401') !== -1) {
                    clearPortalSession();
                    redirectToLogin();
                }
            })
            .finally(function () {
                setApplyButtonLoading(false);
                updateSelectionUi();
            });

        $(document).off('click.applyPost', '#btnApplyPost').on('click.applyPost', '#btnApplyPost', function (e) {
            e.preventDefault();
            e.stopPropagation();
            handleApplyPostClick();
        });
    });
})(jQuery, window);
