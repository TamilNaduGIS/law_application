/**
 * Job selection codes: {postId}A = Madras HC, {postId}B = Madurai Bench.
 */
(function (global) {
    'use strict';

    const BENCH_MADRAS = 'High Court';
    const BENCH_MADURAI = 'Madurai Bench';

    function buildJobId(postId, benchKey) {
        const pid = String(postId).replace(/[ab]$/i, '');
        const suffix = String(benchKey).toLowerCase() === 'madurai' ? 'B' : 'A';
        return pid + suffix;
    }

    function parseJobId(jobId) {
        const raw = String(jobId || '').trim();
        const match = raw.match(/^(\d+)([AB])$/i);
        if (!match) {
            return {
                postId: raw.replace(/[AB]$/i, '') || raw,
                benchKey: 'madras',
                jobId: raw,
                courtBench: BENCH_MADRAS
            };
        }
        const benchKey = match[2].toUpperCase() === 'B' ? 'madurai' : 'madras';
        return {
            postId: match[1],
            benchKey: benchKey,
            jobId: match[1] + match[2].toUpperCase(),
            courtBench: benchKey === 'madurai' ? BENCH_MADURAI : BENCH_MADRAS
        };
    }

    function readStoredVacancies() {
        try {
            const raw = global.sessionStorage.getItem('selectedVacancies');
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function readVacancyCatalog() {
        try {
            const raw = global.sessionStorage.getItem('vacancyCatalog');
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function findCatalogRow(postId) {
        const catalog = readVacancyCatalog();
        const pid = String(postId || '');
        return catalog.find(function (row) {
            return String(row.id || row.postId || '') === pid;
        }) || null;
    }

    function resolveCourtIdFromCatalog(row, benchKey) {
        if (!row) {
            return benchKey === 'madurai' ? 2 : 1;
        }
        if (benchKey === 'madurai') {
            return parseInt(row.maduraiCourtId, 10) || 2;
        }
        return parseInt(row.madrasCourtId, 10)
            || parseInt(row.courtId, 10)
            || 1;
    }

    function resolveVacancyIdFromCatalog(row, benchKey) {
        if (!row) return 0;
        if (benchKey === 'madurai') {
            return parseInt(row.maduraiVacancyId, 10)
                || parseInt(row.vacancyId, 10)
                || 0;
        }
        return parseInt(row.madrasVacancyId, 10)
            || parseInt(row.vacancyId, 10)
            || 0;
    }

    function normalizeSelection(item) {
        if (!item || typeof item !== 'object') return null;
        const postId = String(item.postId || item.post_id || '');
        const benchKey = item.benchKey
            || (item.courtBench === BENCH_MADURAI ? 'madurai' : 'madras');
        const jobId = item.jobId || buildJobId(postId, benchKey);
        const parsed = parseJobId(jobId);
        const catalogRow = findCatalogRow(parsed.postId || postId);
        const effectiveBench = parsed.benchKey || benchKey;

        let vacancyId = parseInt(item.vacancyId || item.vacancy_id, 10);
        if (isNaN(vacancyId) || vacancyId <= 0) {
            vacancyId = resolveVacancyIdFromCatalog(catalogRow, effectiveBench);
        }

        let courtId = parseInt(item.courtId || item.court_id, 10);
        if (isNaN(courtId) || courtId <= 0) {
            courtId = resolveCourtIdFromCatalog(catalogRow, effectiveBench);
        }

        let postName = String(item.postName || item.post_name || '');
        if (!postName && catalogRow) {
            postName = String(catalogRow.postName || '');
        }

        return {
            postId: parsed.postId || postId,
            postName: postName,
            benchKey: parsed.benchKey,
            jobId: parsed.jobId,
            courtBench: item.courtBench || parsed.courtBench,
            vacancyId: vacancyId,
            courtId: courtId
        };
    }

    function enrichSelection(item) {
        return normalizeSelection(item);
    }

    function enrichSelections(selections) {
        if (!Array.isArray(selections)) return [];
        return selections.map(enrichSelection).filter(Boolean);
    }

    function groupSelectionsByPost(selections) {
        const groups = [];
        const indexByPost = {};

        selections.forEach(function (item) {
            const sel = normalizeSelection(item);
            if (!sel || !sel.postId) return;

            if (indexByPost[sel.postId] === undefined) {
                indexByPost[sel.postId] = groups.length;
                groups.push({
                    postId: sel.postId,
                    postName: sel.postName,
                    jobIds: []
                });
            }
            const group = groups[indexByPost[sel.postId]];
            if (sel.postName && !group.postName) {
                group.postName = sel.postName;
            }
            if (group.jobIds.indexOf(sel.jobId) === -1) {
                group.jobIds.push(sel.jobId);
            }
        });

        groups.forEach(function (g) {
            g.jobIds.sort(function (a, b) {
                return a.localeCompare(b, undefined, { numeric: true });
            });
        });

        return groups.sort(function (a, b) {
            return Number(a.postId) - Number(b.postId);
        });
    }

    function formatPostLine(postName, jobIds, courtBenches) {
        const name = postName || 'Post';
        const ids = Array.isArray(jobIds) ? jobIds.join(', ') : String(jobIds || '');
        if (Array.isArray(courtBenches) && courtBenches.length > 1) {
            return name + ' (' + courtBenches.join(', ') + ') : ' + ids;
        }
        return name + ' : ' + ids;
    }

    function formatSelectionLine(sel) {
        const normalized = normalizeSelection(sel);
        if (!normalized) return '';
        const name = normalized.postName || ('Post ' + normalized.postId);
        return name + ' — ' + (normalized.courtBench || '') + ' (' + normalized.jobId + ')';
    }

    function formatBannerLines(selections) {
        return groupSelectionsByPost(enrichSelections(selections)).map(function (g) {
            const benches = selections
                .filter(function (item) {
                    const sel = normalizeSelection(item);
                    return sel && String(sel.postId) === String(g.postId);
                })
                .map(function (item) {
                    return normalizeSelection(item).courtBench;
                })
                .filter(function (bench, idx, arr) {
                    return bench && arr.indexOf(bench) === idx;
                });
            return formatPostLine(g.postName, g.jobIds, benches);
        });
    }

    function joinJobIds(selections) {
        const ids = [];
        selections.forEach(function (item) {
            const sel = normalizeSelection(item);
            if (sel && ids.indexOf(sel.jobId) === -1) {
                ids.push(sel.jobId);
            }
        });
        return ids.sort(function (a, b) {
            return a.localeCompare(b, undefined, { numeric: true });
        }).join(',');
    }

    /**
     * Keep only selections matching job id(s), e.g. "5A" from submitted Application ID link.
     * @param {Array} selections
     * @param {string|string[]} jobIds
     */
    function filterSelectionsByJobIds(selections, jobIds) {
        const ids = (Array.isArray(jobIds) ? jobIds : String(jobIds || '').split(','))
            .map(function (s) { return String(s).trim().toUpperCase(); })
            .filter(Boolean);
        if (!ids.length) {
            return enrichSelections(selections);
        }
        const enriched = enrichSelections(selections || []);
        const filtered = enriched.filter(function (sel) {
            return sel && ids.indexOf(String(sel.jobId).toUpperCase()) !== -1;
        });
        if (filtered.length) {
            return filtered;
        }
        return ids.map(function (id) {
            return enrichSelection({ jobId: id });
        }).filter(Boolean);
    }

    /** Parse DB value e.g. "1a,3b,4a" into selection objects */
    function parseSelectedCheckboxes(raw) {
        const str = String(raw || '').trim();
        if (!str) return [];

        return str.split(',').map(function (part) {
            const token = String(part || '').trim().toLowerCase();
            const match = token.match(/^(\d+)([ab])$/);
            if (!match) return null;

            const postId = match[1];
            const benchKey = match[2] === 'b' ? 'madurai' : 'madras';

            return normalizeSelection({
                postId: postId,
                benchKey: benchKey,
                jobId: buildJobId(postId, benchKey)
            });
        }).filter(Boolean);
    }

    function isSubmittedCheckboxes(raw) {
        return String(raw || '').trim().length > 0;
    }

    /** Display ID e.g. 9876543210-1A (mobile + job selection code). */
    function buildApplicationNo(mobile, jobId) {
        const digits = String(mobile || '').replace(/\D/g, '');
        const jid = String(jobId || '').trim().toUpperCase();
        if (!jid) {
            return digits;
        }
        if (!digits) {
            return jid;
        }
        return digits + '-' + jid;
    }

    function applicationIdsForPost(postId, selections, mobile) {
        const pid = String(postId || '');
        const list = [];
        const seen = {};

        (selections || []).forEach(function (item) {
            const sel = normalizeSelection(item);
            if (!sel || String(sel.postId) !== pid) {
                return;
            }
            const jobId = String(sel.jobId || '').toUpperCase();
            if (!jobId || seen[jobId]) {
                return;
            }
            seen[jobId] = true;
            list.push({
                jobId: jobId,
                applicationNo: buildApplicationNo(mobile, jobId)
            });
        });

        list.sort(function (a, b) {
            return a.jobId.localeCompare(b.jobId, undefined, { numeric: true });
        });

        return list;
    }

    function benchToCourtCode(benchKey) {
        return String(benchKey || '').toLowerCase() === 'madurai' ? 'b' : 'a';
    }

    function courtCodeToBench(courtCode) {
        return String(courtCode || '').toLowerCase() === 'b' ? 'madurai' : 'madras';
    }

    global.JobSelection = {
        BENCH_MADRAS: BENCH_MADRAS,
        BENCH_MADURAI: BENCH_MADURAI,
        buildJobId: buildJobId,
        parseJobId: parseJobId,
        readStoredVacancies: readStoredVacancies,
        normalizeSelection: normalizeSelection,
        enrichSelection: enrichSelection,
        enrichSelections: enrichSelections,
        readVacancyCatalog: readVacancyCatalog,
        groupSelectionsByPost: groupSelectionsByPost,
        formatPostLine: formatPostLine,
        formatSelectionLine: formatSelectionLine,
        formatBannerLines: formatBannerLines,
        filterSelectionsByJobIds: filterSelectionsByJobIds,
        joinJobIds: joinJobIds,
        parseSelectedCheckboxes: parseSelectedCheckboxes,
        isSubmittedCheckboxes: isSubmittedCheckboxes,
        buildApplicationNo: buildApplicationNo,
        applicationIdsForPost: applicationIdsForPost,
        benchToCourtCode: benchToCourtCode,
        courtCodeToBench: courtCodeToBench
    };
})(typeof window !== 'undefined' ? window : global);
