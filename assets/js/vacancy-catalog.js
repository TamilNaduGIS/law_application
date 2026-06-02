/**
 * Shared vacancy list parsing + API load (apply-post, index).
 */
(function (global) {
    'use strict';

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
        return n > 0 ? String(n) : '0';
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

            if (row.madras <= 0 && row.madurai <= 0 && row.total > 0) {
                const isMaduraiCourt = row.courtId === 2 || row.maduraiCourtId === 2;
                if (isMaduraiCourt) {
                    merged.madurai = Math.max(merged.madurai, row.total);
                    merged.maduraiVacancyId = row.vacancyId || merged.maduraiVacancyId;
                    merged.maduraiCourtId = row.courtId || row.maduraiCourtId || merged.maduraiCourtId;
                } else {
                    merged.madras = Math.max(merged.madras, row.total);
                    merged.madrasVacancyId = row.vacancyId || merged.madrasVacancyId;
                    merged.madrasCourtId = row.courtId || merged.madrasCourtId || merged.madrasCourtId;
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
            return Promise.reject(new Error('API client is not loaded.'));
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
        }).catch(function () { /* optional */ });
    }

    function prepareAuthIfLoggedIn() {
        if (!global.localStorage.getItem('access_token')) {
            return Promise.resolve();
        }
        if (global.SecureAPI && typeof global.SecureAPI.prepareSessionAuth === 'function') {
            return global.SecureAPI.prepareSessionAuth().catch(function () {
                return false;
            });
        }
        return Promise.resolve();
    }

    function fetchVacancies() {
        return ensureSessionTokens()
            .then(prepareAuthIfLoggedIn)
            .then(function () {
                return global.LawPortal.apiRequest('vacancies', 'POST', {});
            });
    }

    function rowsFromApiResponse(res) {
        if (res && res.ok === false) {
            throw new Error(res.error || res.message || 'Request failed.');
        }
        const raw = extractVacancyList(res);
        const normalized = raw.map(normalizeVacancyRow);
        return mergeVacancyRowsByPost(normalized);
    }

    /**
     * Public home page — GET /api/public/vacancies (no auth, no encryption).
     */
    function fetchPublicNotifiedVacancies() {
        if (!global.LawPortal || typeof global.LawPortal.apiUrl !== 'function') {
            return Promise.reject(new Error('API configuration is not loaded.'));
        }
        const url = global.LawPortal.apiUrl('public/vacancies');
        return fetch(url, {
            method: 'GET',
            credentials: 'same-origin',
            headers: { Accept: 'application/json' }
        }).then(function (res) {
            return res.json().then(function (body) {
                if (!res.ok) {
                    const msg = (body && (body.error || body.message)) || ('HTTP ' + res.status);
                    throw new Error(msg);
                }
                return body || {};
            });
        });
    }

    function loadMergedVacancyRowsPublic() {
        return fetchPublicNotifiedVacancies().then(function (res) {
            const rows = rowsFromApiResponse(res);
            try {
                global.sessionStorage.setItem('vacancyCatalog', JSON.stringify(rows));
            } catch (e) { /* ignore */ }
            return rows;
        });
    }

    function loadMergedVacancyRows() {
        return fetchVacancies().then(function (res) {
            const rows = rowsFromApiResponse(res);
            try {
                global.sessionStorage.setItem('vacancyCatalog', JSON.stringify(rows));
            } catch (e) { /* ignore */ }
            return rows;
        });
    }

    function readCachedVacancyRows() {
        try {
            const raw = global.sessionStorage.getItem('vacancyCatalog');
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    global.VacancyCatalog = {
        pickField: pickField,
        parseCount: parseCount,
        formatCount: formatCount,
        normalizeVacancyRow: normalizeVacancyRow,
        mergeVacancyRowsByPost: mergeVacancyRowsByPost,
        extractVacancyList: extractVacancyList,
        ensureSessionTokens: ensureSessionTokens,
        fetchVacancies: fetchVacancies,
        fetchPublicNotifiedVacancies: fetchPublicNotifiedVacancies,
        loadMergedVacancyRows: loadMergedVacancyRows,
        loadMergedVacancyRowsPublic: loadMergedVacancyRowsPublic,
        readCachedVacancyRows: readCachedVacancyRows
    };
})(typeof window !== 'undefined' ? window : global);
