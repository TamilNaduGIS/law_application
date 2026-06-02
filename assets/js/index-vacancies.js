/**
 * Home page — dynamic Notified Vacancies via GET /api/public/vacancies (no login).
 */
(function (global) {
    'use strict';

    const VC = global.VacancyCatalog;

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderCountCell(count) {
        const n = VC ? VC.formatCount(count) : String(count || 0);
        return '<td class="vacancy-count-cell"><span class="index-vacancy-count">' + escapeHtml(n) + '</span></td>';
    }

    function renderTable(rows) {
        const tbody = document.getElementById('indexVacancyTableBody');
        if (!tbody) return;

        if (!rows || !rows.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No vacancies are available at this time.</td></tr>';
            return;
        }

        let sumMadras = 0;
        let sumMadurai = 0;
        let sumTotal = 0;

        const bodyHtml = rows.map(function (row, index) {
            const sl = row.slNo != null ? row.slNo : (index + 1);
            sumMadras += row.madras || 0;
            sumMadurai += row.madurai || 0;
            sumTotal += row.total || 0;
            const levelHtml = row.postLevel
                ? '<div class="index-vacancy-level">' + escapeHtml(row.postLevel) + '</div>'
                : '';
            return (
                '<tr>' +
                '<td>' + escapeHtml(String(sl)) + '</td>' +
                '<td><strong>' + escapeHtml(row.postName || '—') + '</strong>' + levelHtml + '</td>' +
                renderCountCell(row.madras) +
                renderCountCell(row.madurai) +
                '<td class="vacancy-total-cell"><span class="index-vacancy-total">' + escapeHtml(VC.formatCount(row.total)) + '</span></td>' +
                '</tr>'
            );
        }).join('');

        const totalRow =
            '<tr class="index-vacancy-totals-row">' +
            '<td colspan="2"><strong>Total</strong></td>' +
            '<td class="vacancy-count-cell"><strong>' + escapeHtml(VC.formatCount(sumMadras)) + '</strong></td>' +
            '<td class="vacancy-count-cell"><strong>' + escapeHtml(VC.formatCount(sumMadurai)) + '</strong></td>' +
            '<td class="vacancy-total-cell"><strong>' + escapeHtml(VC.formatCount(sumTotal)) + '</strong></td>' +
            '</tr>';

        tbody.innerHTML = bodyHtml + totalRow;
    }

    function showLoadError(message) {
        const tbody = document.getElementById('indexVacancyTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">' + escapeHtml(message) + '</td></tr>';
    }

    function init() {
        if (!VC || typeof VC.loadMergedVacancyRowsPublic !== 'function') {
            showLoadError('Unable to load vacancy module.');
            return;
        }

        VC.loadMergedVacancyRowsPublic()
            .then(renderTable)
            .catch(function (err) {
                const cached = VC.readCachedVacancyRows();
                if (cached.length) {
                    renderTable(cached);
                    return;
                }
                const msg = (err && err.message) ? err.message : 'Unable to load vacancies. Please try again later.';
                showLoadError(msg);
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window);
