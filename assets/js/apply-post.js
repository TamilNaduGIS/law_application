/**
 * Apply-post page — loads vacancies from POST /api/vacancies (authenticated).
 */
(function ($, global) {
    'use strict';

    const JS = global.JobSelection;
    const BENCH_MADRAS = JS ? JS.BENCH_MADRAS : 'High Court';
    const BENCH_MADURAI = JS ? JS.BENCH_MADURAI : 'Madurai Bench';

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

    function formatCount(val) {
        const n = parseCount(val);
        return n > 0 ? String(n) : 0;
    }

    function padSlNo(n) {
        return n < 10 ? '0' + n : String(n);
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

        return {
            id: id !== '' ? String(id) : String(index + 1),
            slNo: (!isNaN(postIdNum) && postIdNum > 0) ? postIdNum : (index + 1),
            postName: pickField(row, [
                'post_name', 'position', 'post_title', 'postname', 'designation', 'post'
            ]),
            postLevel: pickField(row, [
                'post_level', 'level', 'category', 'post_category', 'postlevel', 'post_type'
            ]),
            madras: madras,
            madurai: madurai,
            total: total
        };
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

        if (!rows.length) {
            $tbody.html(
                '<tr><td colspan="5" class="text-center text-muted py-4">No vacancies are available at this time.</td></tr>'
            );
            return;
        }

        const html = rows.map(function (row, index) {
            const sl = padSlNo(typeof row.slNo === 'number' ? row.slNo : index + 1);
            const madrasDisabled = row.madras <= 0 ? ' disabled' : '';
            const maduraiDisabled = row.madurai <= 0 ? ' disabled' : '';
            const levelHtml = row.postLevel
                ? '<small>' + escapeHtml(row.postLevel) + '</small>'
                : '';

            return (
                '<tr data-post-id="' + escapeHtml(row.id) + '" data-post-name="' + escapeHtml(row.postName) + '">' +
                '<td>' + escapeHtml(sl) + '</td>' +
                '<td><h6>' + escapeHtml(row.postName || '—') + '</h6>' + levelHtml + '</td>' +
                '<td><div class="bench-card">' +
                '<label class="premium-checkbox">' +
                '<input type="checkbox" class="bench-select" data-bench="madras" data-post-id="' + escapeHtml(row.id) + '" data-job-id="' + escapeHtml(buildJobId(row.id, 'madras')) + '"' + madrasDisabled + '>' +
                '<span></span></label>' +
                '<div class="count-badge primary">' + escapeHtml(formatCount(row.madras)) + '</div>' +
                '</div></td>' +
                '<td><div class="bench-card">' +
                '<label class="premium-checkbox">' +
                '<input type="checkbox" class="bench-select" data-bench="madurai" data-post-id="' + escapeHtml(row.id) + '" data-job-id="' + escapeHtml(buildJobId(row.id, 'madurai')) + '"' + maduraiDisabled + '>' +
                '<span></span></label>' +
                '<div class="count-badge secondary">' + escapeHtml(formatCount(row.madurai)) + '</div>' +
                '</div></td>' +
                '<td><span class="total-badge">' + escapeHtml(formatCount(row.total)) + '</span></td>' +
                '</tr>'
            );
        }).join('');

        $tbody.html(html);
        restoreBenchSelection();
        bindBenchSelection();
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

    function updateSelectionUi() {
        const count = getSelectedVacancies().length;
        const $btn = $('#btnApplyPost');
        if (!$btn.length) return;
        const base = $btn.data('orig-text') || 'Apply for Selected Post(s)';
        if (count > 0) {
            $btn.text(base + ' (' + count + ')');
        } else {
            $btn.text(base);
        }
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
                jobId: String($input.data('job-id') || buildJobId(postId, benchKey))
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
                '<tr><td colspan="5" class="text-center text-danger py-4">' +
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
            $btn.prop('disabled', true).data('orig-text', $btn.text()).text('Loading vacancies…');
        } else {
            $btn.prop('disabled', false).text($btn.data('orig-text') || 'Apply for Selected Post(s)');
        }
    }

    $(function () {
        if (!isAuthenticated()) {
            redirectToLogin();
            return;
        }

        mountUserChip();

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
                const rows = raw.map(normalizeVacancyRow);
                renderSummary(rows);
                renderTable(rows);
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

        $('#btnApplyPost').on('click', function () {
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
            const jobIds = JS
                ? JS.joinJobIds(selections.map(function (s) { return JS.normalizeSelection(s); }))
                : selections.map(function (s) { return s.jobId; }).join(',');
            global.location.href = 'application-form.html?jobId=' + encodeURIComponent(jobIds);
        });
    });
})(jQuery, window);
