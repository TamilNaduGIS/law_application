/**
 * Tab 3: Experience Details
 */
(function (AF) {
    const escapeHtml = AF.utils.escapeHtml;
    const buildFileUploadHtml = AF.files.buildFileUploadHtml;

    function renderBarItem(item, idx) {
        return `
    <div class="premium-bar-card list-item">
        <button type="button"
                class="bar-remove-btn remove-item d-flex justify-content-center align-items-center"
                data-idx="${idx}"
                data-type="bar">
            <i class="bi bi-trash3-fill"></i>
        </button>
        <div class="bar-card-header">
            <div class="bar-icon-wrap">
                <i class="bi bi-briefcase-fill"></i>
            </div>
            <div>
                <div class="bar-title">Bar Practice Experience</div>
                <div class="bar-subtitle">Advocate Practice & Council Details</div>
            </div>
        </div>
        <div class="row g-2 mt-1">
            <div class="col-md-2">
                <label class="premium-label"><i class="bi bi-calendar2-check-fill"></i>Years</label>
                <input type="text" class="form-control premium-input bar-years"
                       value="${escapeHtml(item.years || '')}" placeholder="Years">
            </div>
            <div class="col-md-2">
                <label class="premium-label"><i class="bi bi-calendar-event-fill"></i>From</label>
                <input type="date" class="form-control premium-input bar-from"
                       value="${escapeHtml(item.from || '')}" placeholder="From">
            </div>
            <div class="col-md-2">
                <label class="premium-label"><i class="bi bi-calendar-range-fill"></i>To</label>
                <input type="date" class="form-control premium-input bar-to"
                       value="${escapeHtml(item.to || '')}" placeholder="To">
            </div>
            <div class="col-md-6">
                <label class="premium-label"><i class="bi bi-bank2"></i>Name of the Bar Council</label>
                <input type="text" class="form-control premium-input bar-council"
                       value="${escapeHtml(item.barCouncil || '')}" placeholder="Enter Bar Council Name">
            </div>
        </div>
        <div class="mt-3">
            <div class="compact-upload-box">
                <div class="upload-left">
                    <div class="upload-file-icon"><i class="bi bi-cloud-arrow-up-fill"></i></div>
                    <div>
                        <div class="upload-title">Upload Supporting Documents</div>
                        <div class="upload-subtitle">PDF / DOC / DOCX</div>
                    </div>
                </div>
                <div class="upload-right">
                    ${buildFileUploadHtml('bar-doc-' + idx, 'Choose Files', item.documentFileName, 'bar-doc-file', '.pdf,.doc,.docx', true)}
                </div>
            </div>
        </div>
    </div>`;
    }

    function renderPracticeItem(item, idx) {
        return `
    <div class="premium-practice-card list-item">
        <button type="button" class="practice-remove-btn remove-item" data-idx="${idx}" data-type="practice">
            <i class="bi bi-trash3-fill"></i>
        </button>
        <div class="practice-card-header">
            <div class="practice-icon-wrap"><i class="bi bi-building-fill-check"></i></div>
            <div>
                <div class="practice-title">Court Practice Experience</div>
                <div class="practice-subtitle">Court Details & Professional Practice Timeline</div>
            </div>
        </div>
        <div class="row g-2 mt-1">
            <div class="col-md-4">
                <label class="practice-label"><i class="bi bi-bank"></i>Court Name</label>
                <input type="text" class="form-control practice-input practice-court"
                       value="${escapeHtml(item.courtName || item.court || '')}" placeholder="Enter Court Name">
            </div>
            <div class="col-md-2">
                <label class="practice-label"><i class="bi bi-calendar2-check-fill"></i>Years</label>
                <input type="text" class="form-control practice-input practice-years"
                       value="${escapeHtml(item.years || '')}" placeholder="Years">
            </div>
            <div class="col-md-2">
                <label class="practice-label"><i class="bi bi-calendar-event-fill"></i>From</label>
                <input type="text" class="form-control practice-input practice-from"
                       value="${escapeHtml(item.from || '')}" placeholder="From">
            </div>
            <div class="col-md-2">
                <label class="practice-label"><i class="bi bi-calendar-range-fill"></i>To</label>
                <input type="text" class="form-control practice-input practice-to"
                       value="${escapeHtml(item.to || '')}" placeholder="To">
            </div>
        </div>
        <div class="mt-3">
            <div class="practice-upload-box">
                <div class="practice-upload-left">
                    <div class="practice-upload-icon"><i class="bi bi-cloud-arrow-up-fill"></i></div>
                    <div>
                        <div class="practice-upload-title">Upload Practice Documents</div>
                        <div class="practice-upload-subtitle">Experience Certificates / Supporting Files</div>
                    </div>
                </div>
                <div class="practice-upload-right">
                    ${buildFileUploadHtml('practice-doc-' + idx, 'Choose Files', item.documentFileName, 'practice-doc-file', '.pdf,.doc,.docx', true)}
                </div>
            </div>
        </div>
    </div>`;
    }

    function renderJudgmentItem(item, idx, type) {
        return `
    <div class="premium-judgment-card list-item">
        <button type="button"
                class="judgment-remove-btn remove-item d-flex justify-content-center align-items-center"
                data-idx="${idx}"
                data-type="${type}">
            <i class="bi bi-trash3-fill"></i>
        </button>
        <div class="judgment-header">
            <div class="judgment-icon-wrap"><i class="bi bi-journal-richtext"></i></div>
            <div>
                <div class="judgment-title">Judgment / Case Information</div>
                <div class="judgment-subtitle">Legal Case Details & Supporting Judgments</div>
            </div>
        </div>
        <div class="row g-2 mt-1">
            <div class="col-md-10">
                <label class="judgment-label"><i class="bi bi-hash"></i>Case No Citation</label>
                <input type="text" class="form-control judgment-input j-case"
                       value="${escapeHtml(item.caseNo || '')}" placeholder="Enter Case Citation">
            </div>
            <div class="col-md-2 d-flex align-items-end">
                <button type="button" class="btn btn-primary w-100 addCitationBtn">
                    <i class="bi bi-plus-circle me-1"></i>Add More
                </button>
            </div>
        </div>
        <div class="extraCitationWrapper mt-2"></div>
        <div class="mt-3 d-none">
            <div class="judgment-upload-box">
                <div class="judgment-upload-left">
                    <div class="judgment-upload-icon"><i class="bi bi-cloud-arrow-up-fill"></i></div>
                    <div>
                        <div class="judgment-upload-title">Upload Judgment Documents</div>
                        <div class="judgment-upload-subtitle">Court Orders / Judgments / Supporting Files</div>
                    </div>
                </div>
                <div class="judgment-upload-right">
                    ${buildFileUploadHtml('judgment-doc-' + idx + '-' + type, 'Choose Files', item.documentFileName, 'judgment-doc-file', '.pdf,.doc,.docx', true)}
                </div>
            </div>
        </div>
    </div>`;
    }

    function syncBar() {
        AF.state.barItems = [];
        document.querySelectorAll('#barExpContainer .list-item').forEach(function (item) {
            AF.state.barItems.push({
                years: item.querySelector('.bar-years') && item.querySelector('.bar-years').value,
                from: item.querySelector('.bar-from') && item.querySelector('.bar-from').value,
                to: item.querySelector('.bar-to') && item.querySelector('.bar-to').value,
                barCouncil: item.querySelector('.bar-council') && item.querySelector('.bar-council').value
            });
        });
        calculateTotalBarYears();
    }

    function syncPractice() {
        AF.state.practiceItems = [];
        document.querySelectorAll('#courtPracticeContainer .list-item').forEach(function (item) {
            AF.state.practiceItems.push({
                courtName: item.querySelector('.practice-court') && item.querySelector('.practice-court').value,
                years: item.querySelector('.practice-years') && item.querySelector('.practice-years').value,
                from: item.querySelector('.practice-from') && item.querySelector('.practice-from').value,
                to: item.querySelector('.practice-to') && item.querySelector('.practice-to').value
            });
        });
    }

    function syncJudgmentAAG() {
        AF.state.judgmentAAGItems = [];
        document.querySelectorAll('#judgmentAAGContainer .list-item').forEach(function (item) {
            AF.state.judgmentAAGItems.push({
                caseNo: item.querySelector('.j-case') && item.querySelector('.j-case').value,
                caseDetails: item.querySelector('.j-details') && item.querySelector('.j-details').value,
                judgment: item.querySelector('.j-judgment') && item.querySelector('.j-judgment').value,
                remarks: item.querySelector('.j-remarks') && item.querySelector('.j-remarks').value
            });
        });
    }

    function syncJudgmentAGP() {
        AF.state.judgmentAGPItems = [];
        document.querySelectorAll('#judgmentAGPContainer .list-item').forEach(function (item) {
            AF.state.judgmentAGPItems.push({
                caseNo: item.querySelector('.j-case') && item.querySelector('.j-case').value,
                caseDetails: item.querySelector('.j-details') && item.querySelector('.j-details').value,
                judgment: item.querySelector('.j-judgment') && item.querySelector('.j-judgment').value,
                remarks: item.querySelector('.j-remarks') && item.querySelector('.j-remarks').value
            });
        });
    }

    function calculateTotalBarYears() {
        let total = 0;
        AF.state.barItems.forEach(function (b) {
            const y = parseInt(b.years, 10);
            if (!isNaN(y)) total += y;
        });
        const el = document.getElementById('totalBarYears');
        if (el) el.value = total ? total + ' years' : '';
    }

    function renderBar() {
        AF.lists.renderList('barExpContainer', AF.state.barItems, renderBarItem, 'bar');
        calculateTotalBarYears();
    }

    function renderPractice() {
        AF.lists.renderList('courtPracticeContainer', AF.state.practiceItems, renderPracticeItem, 'practice');
    }

    function renderJudgmentAAG() {
        AF.lists.renderList('judgmentAAGContainer', AF.state.judgmentAAGItems, function (it, i) {
            return renderJudgmentItem(it, i, 'judgmentAAG');
        }, 'judgmentAAG');
    }

    function renderJudgmentAGP() {
        AF.lists.renderList('judgmentAGPContainer', AF.state.judgmentAGPItems, function (it, i) {
            return renderJudgmentItem(it, i, 'judgmentAGP');
        }, 'judgmentAGP');
    }

    function initCitationHandlers() {
        function appendCitationRow(wrapper) {
            const total = wrapper.find('.extra-citation-row').length;
            if (total >= 29) {
                alert('Maximum 30 citations allowed');
                return;
            }
            const html = `
                <div class="row g-2 mt-2 extra-citation-row">
                    <div class="col-md-10">
                        <input type="text" class="form-control judgment-input extraCitationInput"
                               placeholder="Enter Additional Case Citation">
                    </div>
                    <div class="col-md-2">
                        <div class="d-flex gap-2">
                            <button type="button" class="btn btn-primary addCitationBtnInline flex-fill">
                                <i class="bi bi-plus-lg"></i>
                            </button>
                            <button type="button" class="btn btn-danger removeCitationBtn flex-fill">
                                <i class="bi bi-x-lg"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
            wrapper.append(html);
            wrapper.find('.extraCitationInput').last().focus();
        }

        $(document).on('click', '.addCitationBtn', function () {
            appendCitationRow($(this).closest('.premium-judgment-card').find('.extraCitationWrapper'));
        });

        $(document).on('click', '.addCitationBtnInline', function () {
            appendCitationRow($(this).closest('.premium-judgment-card').find('.extraCitationWrapper'));
        });

        $(document).on('click', '.removeCitationBtn', function () {
            $(this).closest('.extra-citation-row').remove();
        });
    }

    function initProceedingToggles() {
        $(document).on('change', '.proceedingToggle', function () {
            const target = $(this).data('target');
            if ($(this).val() === 'Yes') {
                $(target).removeClass('d-none').slideDown(200);
            } else {
                $(target).slideUp(200);
            }
        });

        $(function () {
            $('.proceedingToggle').change(function () {
                const target = $(this).attr('data-target');
                if ($(this).val() === 'Yes') {
                    $(target).stop(true, true).slideDown(300);
                } else {
                    $(target).stop(true, true).slideUp(300);
                }
            });
        });
    }

    function initConditionalFields() {
        const previousWorked = document.getElementById('previousWorked');
        if (previousWorked) {
            previousWorked.addEventListener('change', function () {
                const wrapper = document.getElementById('previousWorkedWrapper');
                if (!wrapper) return;
                if (this.value === 'Yes') wrapper.classList.remove('d-none');
                else wrapper.classList.add('d-none');
            });
        }

        const achievementWrap = document.getElementById('achievmenetWrap');
        if (achievementWrap) {
            achievementWrap.addEventListener('change', function () {
                const wrapper = document.getElementById('achievementDetailsWrapper');
                if (!wrapper) return;
                if (this.value === 'Yes') {
                    wrapper.classList.remove('d-none');
                } else {
                    wrapper.classList.add('d-none');
                    const details = document.getElementById('achievementDetails');
                    const files = document.getElementById('achievementFiles');
                    if (details) details.value = '';
                    if (files) files.value = '';
                }
            });
        }
    }

    function initDefaultItems() {
        if (!AF.state.barItems.length) {
            AF.state.barItems.push({
                years: '8', from: '2017', to: '2025', barCouncil: 'Bar Council of Tamil Nadu'
            });
        }
        if (AF.state.judgmentAGPItems.length === 0) {
            AF.state.judgmentAGPItems.push({ caseNo: '' });
        }
    }

    function init() {
        initCitationHandlers();
        initProceedingToggles();
        initConditionalFields();
        initDefaultItems();

        const addBarBtn = document.getElementById('addBarExpBtn');
        if (addBarBtn) {
            addBarBtn.addEventListener('click', function () {
                AF.state.barItems.push({});
                renderBar();
            });
        }

        const addPracticeBtn = document.getElementById('addPracticeBtn');
        if (addPracticeBtn) {
            addPracticeBtn.addEventListener('click', function () {
                AF.state.practiceItems.push({});
                renderPractice();
            });
        }

        const addJudgmentAAGBtn = document.getElementById('addJudgmentAAGBtn');
        if (addJudgmentAAGBtn) {
            addJudgmentAAGBtn.addEventListener('click', function () {
                AF.state.judgmentAAGItems.push({});
                renderJudgmentAAG();
            });
        }

        const addJudgmentAGPBtn = document.getElementById('addJudgmentAGPBtn');
        if (addJudgmentAGPBtn) {
            addJudgmentAGPBtn.addEventListener('click', function () {
                AF.state.judgmentAGPItems.push({ caseNo: '' });
                renderJudgmentAGP();
            });
        }

        const prevBtn = document.getElementById('prevToTab2');
        if (prevBtn) prevBtn.addEventListener('click', function () { AF.nav.switchTab(2); });

        const nextBtn = document.getElementById('nextToTab4');
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                AF.data.saveDraft();
                if (AF.tab4) AF.tab4.generatePreview();
                AF.nav.switchTab(4);
            });
        }
    }

    AF.tab3 = {
        init: init,
        renderBar: renderBar,
        renderPractice: renderPractice,
        renderJudgmentAAG: renderJudgmentAAG,
        renderJudgmentAGP: renderJudgmentAGP,
        syncBar: syncBar,
        syncPractice: syncPractice,
        syncJudgmentAAG: syncJudgmentAAG,
        syncJudgmentAGP: syncJudgmentAGP,
        calculateTotalBarYears: calculateTotalBarYears
    };
})(window.ApplicationForm);
