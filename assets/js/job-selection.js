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

    function normalizeSelection(item) {
        if (!item || typeof item !== 'object') return null;
        const postId = String(item.postId || item.post_id || '');
        const benchKey = item.benchKey
            || (item.courtBench === BENCH_MADURAI ? 'madurai' : 'madras');
        const jobId = item.jobId || buildJobId(postId, benchKey);
        const parsed = parseJobId(jobId);

        return {
            postId: parsed.postId || postId,
            postName: String(item.postName || item.post_name || ''),
            benchKey: parsed.benchKey,
            jobId: parsed.jobId,
            courtBench: item.courtBench || parsed.courtBench
        };
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

    function formatPostLine(postName, jobIds) {
        const name = postName || 'Post';
        return name + ' : ' + jobIds.join(', ');
    }

    function formatBannerLines(selections) {
        return groupSelectionsByPost(selections).map(function (g) {
            return formatPostLine(g.postName, g.jobIds);
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

    global.JobSelection = {
        BENCH_MADRAS: BENCH_MADRAS,
        BENCH_MADURAI: BENCH_MADURAI,
        buildJobId: buildJobId,
        parseJobId: parseJobId,
        readStoredVacancies: readStoredVacancies,
        normalizeSelection: normalizeSelection,
        groupSelectionsByPost: groupSelectionsByPost,
        formatPostLine: formatPostLine,
        formatBannerLines: formatBannerLines,
        joinJobIds: joinJobIds
    };
})(typeof window !== 'undefined' ? window : global);
