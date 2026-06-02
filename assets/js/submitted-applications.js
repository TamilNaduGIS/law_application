/**
 * Submitted Applications list — POST /api/vacancy/selections/get
 */
(function ($, global) {
    'use strict';

    let applications = [];

    function isAuthenticated() {
        return !!global.localStorage.getItem('access_token')
            && global.sessionStorage.getItem('isLoggedIn') === 'true';
    }

    function redirectToLogin() {
        global.location.href = 'login.html?return=' + encodeURIComponent('submitted-applications.html');
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function padSlNo(n) {
        return n < 10 ? '0' + n : String(n);
    }

    function formatSubmittedDate(value) {
        if (!value) {
            const stored = global.sessionStorage.getItem('lastSubmittedAt');
            if (stored) value = stored;
        }
        if (!value) return '—';

        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return String(day).padStart(2, '0') + '-' + month + '-' + year;
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
        }).catch(function () { /* optional */ });
    }

    function normalizeApplications(res) {
        if (Array.isArray(res.applications) && res.applications.length) {
            const mobile = String(res.mobile || global.sessionStorage.getItem('mobile') || '').replace(/\D/g, '');
            return res.applications.map(function (item) {
                const jobId = String(item.job_id || item.jobId || '').toUpperCase();
                const applicationNo = item.application_no
                    || (global.JobSelection && global.JobSelection.buildApplicationNo
                        ? global.JobSelection.buildApplicationNo(mobile, jobId)
                        : (mobile ? mobile + '-' + jobId : jobId));

                return {
                    postName: item.post_name || item.postName || '—',
                    applicationNo: applicationNo,
                    jobId: jobId,
                    status: item.status || 'Submitted',
                    submittedOn: item.submitted_on || item.submittedOn || res.submitted_on || null
                };
            });
        }

        const selected = String(res.selected_checkboxes || '').trim();
        if (!selected) return [];

        const mobile = String(res.mobile || global.sessionStorage.getItem('mobile') || '').replace(/\D/g, '');
        const selections = global.JobSelection
            ? global.JobSelection.parseSelectedCheckboxes(selected)
            : [];

        return selections.map(function (sel) {
            const jobId = String(sel.jobId || '').toUpperCase();
            return {
                postName: sel.postName || ('Post ' + sel.postId),
                applicationNo: global.JobSelection
                    ? global.JobSelection.buildApplicationNo(mobile, jobId)
                    : (mobile ? mobile + '-' + jobId : jobId),
                jobId: jobId,
                status: 'Submitted',
                submittedOn: res.submitted_on || global.sessionStorage.getItem('lastSubmittedAt')
            };
        });
    }

    function loadSubmittedApplications() {
        const applicantId = global.sessionStorage.getItem('applicantId') || '';

        return ensureSessionTokens().then(function () {
            return global.LawPortal.apiRequest('vacancy/selections/get', 'POST', {
                applicant_id: applicantId,
                applicantId: applicantId
            });
        }).then(function (res) {
            if (res && res.ok === false) {
                throw new Error(res.error || res.message || 'Unable to load applications.');
            }
            applications = normalizeApplications(res || {});
            return applications;
        });
    }

    function renderTable(rows) {
        const $tbody = $('#submittedApplicationsBody');
        if (!$tbody.length) return;

        if (!rows.length) {
            $tbody.html(
                '<tr><td colspan="6" class="text-center text-muted py-4">' +
                'No submitted applications found. <a href="apply-post.html">Apply for a post</a>.' +
                '</td></tr>'
            );
            return;
        }

        $tbody.html(rows.map(function (row, index) {
            return (
                '<tr data-application-no="' + escapeHtml(row.applicationNo) + '">' +
                '<td>' + escapeHtml(padSlNo(index + 1)) + '</td>' +
                '<td><h6 class="mb-0">' + escapeHtml(row.postName) + '</h6></td>' +
                '<td><span class="application-no">' + escapeHtml(row.applicationNo) + '</span></td>' +
                '<td><span class="status-badge">' + escapeHtml(row.status) + '</span></td>' +
                '<td>' + escapeHtml(formatSubmittedDate(row.submittedOn)) + '</td>' +
                '<td><button type="button" class="view-app-btn" data-job-id="' + escapeHtml(row.jobId) + '" data-application-no="' + escapeHtml(row.applicationNo) + '">' +
                '<i class="bi bi-eye-fill"></i> View</button></td>' +
                '</tr>'
            );
        }).join(''));
    }

    function filterApplications(query) {
        const q = String(query || '').trim().toLowerCase();
        if (!q) {
            renderTable(applications);
            return;
        }

        renderTable(applications.filter(function (row) {
            return String(row.applicationNo || '').toLowerCase().indexOf(q) !== -1
                || String(row.postName || '').toLowerCase().indexOf(q) !== -1;
        }));
    }

    function openPreview(jobId, applicationNo) {
        const userId = global.sessionStorage.getItem('applicantId') || '';
        const url = 'application-form.html?previewView=1&submitted=1&jobId='
            + encodeURIComponent(jobId)
            + (userId ? '&userId=' + encodeURIComponent(userId) : '');

        global.sessionStorage.setItem('selectedJobId', jobId);

        $('#previewModalTitle').text(applicationNo ? ('Application ' + applicationNo) : 'Application Preview');
        $('#applicationPreviewFrame').attr('src', url);

        const modalEl = document.getElementById('applicationPreviewModal');
        if (modalEl && global.bootstrap) {
            global.bootstrap.Modal.getOrCreateInstance(modalEl).show();
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

    $(function () {
        if (global.AppData && typeof global.AppData.requireAuth === 'function') {
            global.AppData.requireAuth('login.html?return=' + encodeURIComponent('submitted-applications.html'));
        } else if (!isAuthenticated()) {
            redirectToLogin();
            return;
        }

        mountUserChip();

        $('#logoutLink').on('click', function (e) {
            e.preventDefault();
            if (global.AppData && typeof global.AppData.logout === 'function') {
                global.AppData.logout();
            }
            global.location.href = 'index.html';
        });

        $('#applicationSearchInput').on('input', function () {
            filterApplications($(this).val());
        });

        $(document).on('click', '.view-app-btn', function () {
            openPreview($(this).data('job-id'), $(this).data('application-no'));
        });

        $('#applicationPreviewModal').on('hidden.bs.modal', function () {
            $('#applicationPreviewFrame').attr('src', 'about:blank');
        });

        loadSubmittedApplications()
            .then(function (rows) {
                renderTable(rows);
            })
            .catch(function (err) {
                $('#submittedApplicationsBody').html(
                    '<tr><td colspan="6" class="text-center text-danger py-4">' +
                    escapeHtml((err && err.message) ? err.message : 'Unable to load submitted applications.') +
                    '</td></tr>'
                );
            });
    });
})(jQuery, window);
