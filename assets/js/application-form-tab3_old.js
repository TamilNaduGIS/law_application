/**
 * Tab 3: Experience Details - With File Upload Support (Subfolder Structure)
 */
(function (AF, global) {
    'use strict';

    const escapeHtml = AF.utils.escapeHtml;
    let initDone = false;
    let tab3Saving = false;

    // Counter for unique IDs
    let barSectionCounter = 1;
    let practiceSectionCounter = 1;

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
        return parseInt(s, 10);
    }

    function bindExperienceYearsInputs() {
        $(document).on('input', '.bar-years, .practice-years', function () {
            const v = normalizeExperienceYearsInput(this.value);
            if (this.value !== v) {
                this.value = v;
            }
        });
        $(document).on('keypress', '.bar-years, .practice-years', function (e) {
            if (e.key && e.key.length === 1 && !/\d/.test(e.key)) {
                e.preventDefault();
            }
        });
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
        const input = document.getElementById('achievementFiles');
        if (!input || input.closest('.file-upload-host')) {
            return;
        }
        const parent = input.parentNode;
        if (!parent) {
            return;
        }
        const host = document.createElement('div');
        host.className = 'file-upload-host achievement-upload-host';
        parent.insertBefore(host, input);
        const pick = document.createElement('div');
        pick.className = 'upload-pick-panel';
        host.appendChild(pick);
        pick.appendChild(input);
        host.insertAdjacentHTML('beforeend', getSelectedPanelHtml());
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
        if (res.ok === false || res.error) {
            return { ok: false, error: res.error || res.message || 'Request failed.' };
        }
        return res;
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

    // Transform bar practice item to payload
    function mapBarPracticeToPayload(item) {
        const practiceId = parseInt(item.id ?? item.bar_practice_id, 10);
        return {
            bar_practice_id: !isNaN(practiceId) && practiceId > 0 ? practiceId : 0,
            court_type: trimStr(item.court_type || item.courtType) || null,
            years_experience: (function () { const y = parseExperienceYears(item.years); return isNaN(y) ? 0 : y; })(),
            from_date: item.from_date || null,
            to_date: item.to_date || null,
            bar_council_name: trimStr(item.bar_council),
            supporting_document: item.supporting_document || null,
            is_deleted: false
        };
    }

    // Transform court practice item to payload
    function mapCourtPracticeToPayload(item) {
        return {
            court_practice_id: 0,
            court_name: trimStr(item.court_name),
            years_experience: (function () { const y = parseExperienceYears(item.years); return isNaN(y) ? 0 : y; })(),
            from_date: item.from_date || null,
            to_date: item.to_date || null,
            practice_document: item.practice_document || null,
            is_deleted: false
        };
    }

    // Build experience save payload
    function buildExperienceSavePayload(formData) {
        const meta = buildExperienceSaveMeta();

        // Calculate total bar experience years
        let totalBarExperienceYears = 0;
        if (formData.bar_experiences && Array.isArray(formData.bar_experiences)) {
            formData.bar_experiences.forEach(exp => {
                const years = parseExperienceYears(exp.years);
                if (!isNaN(years)) {
                    totalBarExperienceYears += years;
                }
            });
        }

        // Calculate total practice years
        let totalPracticeYears = 0;
        if (formData.practice_items && Array.isArray(formData.practice_items)) {
            formData.practice_items.forEach(practice => {
                const years = parseExperienceYears(practice.years);
                if (!isNaN(years)) {
                    totalPracticeYears += years;
                }
            });
        }

        // Get drafting years
        const draftingYears = formData.drafting_years ? parseFloat(formData.drafting_years) : 0;

        // Transform bar practice
        const barPractice = (formData.bar_experiences || [])
            .filter(function (item) {
                return item && (item.years || item.from_date || item.to_date || item.bar_council
                    || item.court_type || item.courtType);
            })
            .map(mapBarPracticeToPayload);

        // Transform court practice
        const courtPractice = (formData.practice_items || [])
            .filter(function (item) {
                return item && (item.court_name || item.years || item.from_date || item.to_date);
            })
            .map(mapCourtPracticeToPayload);

        // Transform judgments with categories
        const judgements = [];

        // Process AAG citations (7 year category)
        if (formData.judgment_aag_citations && formData.judgment_aag_citations.length > 0) {
            const aagCitations = [];
            formData.judgment_aag_citations.forEach(citation => {
                if (citation && citation.trim()) {
                    aagCitations.push({
                        citation_type: "7_YEAR",
                        case_title: "",
                        case_citation: citation.trim()
                    });
                }
            });

            if (aagCitations.length > 0) {
                judgements.push({
                    category: "AAG",
                    citations: aagCitations
                });
            }
        }

        // Process AGP citations (5 year category)
        if (formData.judgment_agp_citations && formData.judgment_agp_citations.length > 0) {
            const agpCitations = [];
            formData.judgment_agp_citations.forEach(citation => {
                if (citation && citation.trim()) {
                    agpCitations.push({
                        citation_type: "5_YEAR",
                        case_title: "",
                        case_citation: citation.trim()
                    });
                }
            });

            if (agpCitations.length > 0) {
                judgements.push({
                    category: "AGP",
                    citations: agpCitations
                });
            }
        }

        // Build the final payload
        return {
            applicant_id: meta.applicant_id,
            created_by: meta.created_by,
            law_degree_recognized: formData.law_degree_recognized || false,
            govt_law_officer_experience: formData.previously_worked || false,
            provide_details_if_yes: trimStr(formData.previously_worked_details),
            current_facing_criminal_proceedings: formData.current_proceeding || false,
            current_criminal_cases_details: trimStr(formData.current_criminal_details),
            current_criminal_cases_present_status: trimStr(formData.current_criminal_status),
            current_disciplinary_proceeding_details: trimStr(formData.current_disciplinary_details),
            current_disciplinary_proceeding_present_status: trimStr(formData.current_disciplinary_status),
            past_facing_criminal_proceedings: formData.past_proceeding || false,
            past_criminal_cases_details: trimStr(formData.past_criminal_details),
            past_criminal_cases_present_status: trimStr(formData.past_criminal_status),
            past_disciplinary_proceeding_details: trimStr(formData.past_disciplinary_details),
            past_disciplinary_proceeding_present_status: trimStr(formData.past_disciplinary_status),
            professional_achievement: formData.has_achievements || false,
            achievement_remarks: trimStr(formData.achievement_details),
            achievement_support_document: formData.achievement_files && formData.achievement_files.length > 0 ? formData.achievement_files[0] : null,
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
            return body;
        });
    }

    // Save experience data
    function saveExperienceData() {
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
                    console.log('[Tab3] Bar practice document uploaded:', response.file_path);
                })
                .catch(function (err) {
                    if (AF.files && typeof AF.files.clearFileUpload === 'function') {
                        AF.files.clearFileUpload(fileInput[0]);
                    }
                    fileInput.prop('disabled', false);
                    console.error('[Tab3] Upload error:', err);
                    alert('Failed to upload document: ' + err.message);
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
                    console.error('[Tab3] Upload error:', err);
                    alert('Failed to upload document: ' + err.message);
                });
        });

        // Handle achievement document file upload
        $(document).off('change', '#achievementFiles').on('change', '#achievementFiles', function () {
            const fileInput = $(this);
            const file = fileInput[0].files[0];

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

            uploadDocument('ACHIEVEMENT', file, 'experience/achievement')
                .then(function (response) {
                    if (AF.files && typeof AF.files.showFileUploadSelected === 'function') {
                        AF.files.showFileUploadSelected(fileInput[0], fileName);
                    }
                    fileInput.prop('disabled', false);
                    AF.state.achievementDocumentPath = response.file_path;
                    console.log('[Tab3] Achievement document uploaded:', response.file_path);
                })
                .catch(function (err) {
                    if (AF.files && typeof AF.files.clearFileUpload === 'function') {
                        AF.files.clearFileUpload(fileInput[0]);
                    }
                    fileInput.prop('disabled', false);
                    AF.state.achievementDocumentPath = '';
                    console.error('[Tab3] Upload error:', err);
                    alert('Failed to upload achievement document: ' + err.message);
                });
        });
    }

    // Create button click handlers for file upload triggers
    function initUploadButtonHandlers() {
        // Trigger bar file input on button click
        $(document).off('click', '.bar-upload-btn').on('click', '.bar-upload-btn', function (e) {
            e.preventDefault();
            const fileInput = $(this).siblings('.bar-doc-file');
            if (fileInput.length) {
                fileInput.click();
            }
        });

        // Trigger practice file input on button click
        $(document).off('click', '.practice-upload-btn').on('click', '.practice-upload-btn', function (e) {
            e.preventDefault();
            const fileInput = $(this).siblings('.practice-doc-file');
            if (fileInput.length) {
                fileInput.click();
            }
        });
    }

    // Optimized date validation
    function initOptimizedDateValidation() {
        const TODAY = new Date().toISOString().split('T')[0];

        const validateDates = ($from, $to) => {
            const fromDate = $from.val();
            const toDate = $to.val();
            const $item = $from.closest('.list-item');

            $to.attr('min', fromDate || '');
            $from.attr('max', toDate || '');

            if (fromDate && toDate) {
                const isValid = new Date(fromDate) <= new Date(toDate);
                $from.toggleClass('is-invalid', !isValid);
                $to.toggleClass('is-invalid', !isValid);

                if (!isValid) {
                    $item.find('.date-error-message').remove();
                    $('<div class="invalid-feedback date-error-message">From date cannot be greater than to date</div>')
                        .insertAfter($to)
                        .delay(3000)
                        .fadeOut(300, function () { $(this).remove(); });
                } else {
                    $item.find('.date-error-message').remove();
                }
            } else {
                $from.removeClass('is-invalid');
                $to.removeClass('is-invalid');
            }
        };

        $(document)
            .on('change', '.bar-from, .practice-from', function () {
                const $to = $(this).closest('.list-item').find('.bar-to, .practice-to');
                validateDates($(this), $to);
            })
            .on('change', '.bar-to, .practice-to', function () {
                const $from = $(this).closest('.list-item').find('.bar-from, .practice-from');
                validateDates($from, $(this));
            })
            .on('focus', '.bar-from, .bar-to, .practice-from, .practice-to', function () {
                $(this).attr('max', TODAY);
            });
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
        payload.bar_experiences = [];
        $('#barExpContainer .bar-item').each(function () {
            const $item = $(this);
            const years = ($item.find('.bar-years').val() || '').trim();
            const fromDate = $item.find('.bar-from').val() || null;
            const toDate = $item.find('.bar-to').val() || null;
            const courtType = ($item.find('.bar-court-type').val() || '').trim() || null;
            const barCouncil = ($item.find('.bar-council').val() || '').trim() || null;

            if (years || fromDate || toDate || courtType || barCouncil) {
                const practiceId = parseInt($item.data('bar-practice-id'), 10);
                payload.bar_experiences.push({
                    id: !isNaN(practiceId) && practiceId > 0 ? practiceId : 0,
                    years: years || null,
                    from_date: fromDate,
                    to_date: toDate,
                    court_type: courtType,
                    bar_council: barCouncil,
                    supporting_document: $item.data('supporting-document') || null
                });
            }
        });
        if (payload.bar_experiences.length === 0) payload.bar_experiences = null;

        // 6. Practice Items
        payload.practice_items = [];
        $('#courtPracticeContainer .practice-item').each(function () {
            const $item = $(this);
            const courtName = ($item.find('.practice-court').val() || '').trim();
            const years = ($item.find('.practice-years').val() || '').trim();
            const fromDate = $item.find('.practice-from').val() || null;
            const toDate = $item.find('.practice-to').val() || null;

            if (courtName || years || fromDate || toDate) {
                payload.practice_items.push({
                    court_name: courtName || null,
                    years: years || null,
                    from_date: fromDate,
                    to_date: toDate,
                    practice_document: $item.data('practice-document') || null
                });
            }
        });
        if (payload.practice_items.length === 0) payload.practice_items = null;

        // 7-8. Judgment citations
        payload.judgment_aag_citations = [];
        $('#judgmentAAGContainer .citation-input').each(function () {
            const val = $(this).val().trim();
            if (val) payload.judgment_aag_citations.push(val);
        });
        if (payload.judgment_aag_citations.length === 0) payload.judgment_aag_citations = null;

        payload.judgment_agp_citations = [];
        $('#judgmentAGPContainer .citation-input').each(function () {
            const val = $(this).val().trim();
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

    // Function to recalculate total years
    function recalculateTotalYears() {
        let totalYears = 0;
        let highCourtYears = 0;

        $('#barExpContainer .bar-item').each(function () {
            const $item = $(this);
            const years = parseExperienceYears($item.find('.bar-years').val());
            const courtType = $item.find('.bar-court-type').val();
            const fromDate = $item.find('.bar-from').val();
            const toDate = $item.find('.bar-to').val();

            if (!isNaN(years)) {
                totalYears += years;
                if (courtType === 'High Court') {
                    highCourtYears += years;
                }
            }

            if (fromDate && toDate && (isNaN(years) || !$item.find('.bar-years').val())) {
                const from = new Date(fromDate);
                const to = new Date(toDate);
                if (to > from) {
                    const yearDiff = (to - from) / (1000 * 60 * 60 * 24 * 365.25);
                    totalYears += yearDiff;
                    if (courtType === 'High Court') {
                        highCourtYears += yearDiff;
                    }
                }
            }
        });

        $('#totalBarYears').val(totalYears > 0 ? totalYears.toFixed(2) + ' years' : '0 years');
        $('#specificBarYears').val(highCourtYears > 0 ? highCourtYears.toFixed(2) + ' years' : '0 years');
    }

    // Create a new bar experience section (BLANK)
    function createBarSection(sectionNumber) {
        return `
            <div class="premium-bar-card bar-item list-item mb-3" data-section="${sectionNumber}">
                <button type="button" class="bar-remove-btn remove-bar-item d-flex justify-content-center align-items-center"
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
                        <label class="premium-label"><i class="bi bi-calendar2-check-fill"></i>Year of Experience</label>
                        <input type="text" class="form-control premium-input bar-years"
                               name="bar_years_${sectionNumber}"
                               id="bar_years_${sectionNumber}"
                               value=""
                               maxlength="2"
                               inputmode="numeric"
                               autocomplete="off"
                               placeholder="YY">
                    </div>
                    <div class="col-md-3">
                        <label class="premium-label"><i class="bi bi-calendar-event-fill"></i>From Date</label>
                        <input type="date" class="form-control premium-input bar-from"
                               name="bar_from_${sectionNumber}"
                               id="bar_from_${sectionNumber}"
                               value="">
                    </div>
                    <div class="col-md-3">
                        <label class="premium-label"><i class="bi bi-calendar-range-fill"></i>To Date</label>
                        <input type="date" class="form-control premium-input bar-to"
                               name="bar_to_${sectionNumber}"
                               id="bar_to_${sectionNumber}"
                               value="">
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
                    ${getDocUploadHintHtml()}
                    <div class="file-upload-host tab3-file-upload-host">
                        <div class="upload-pick-panel">
                            <div class="compact-upload-box">
                                <div class="upload-left">
                                    <div class="upload-file-icon"><i class="bi bi-cloud-arrow-up-fill"></i></div>
                                    <div>
                                        <div class="upload-title">Upload Supporting Documents</div>
                                        <div class="upload-subtitle">JPG, JPEG, PNG, PDF — max 5 MB</div>
                                    </div>
                                </div>
                                <div class="upload-right">
                                    <input type="file" class="bar-doc-file d-none" id="bar-doc-${sectionNumber}" accept="${getDocUploadAccept()}">
                                    <button type="button" class="btn btn-outline-primary btn-upload-file bar-upload-btn">
                                        <i class="bi bi-cloud-upload-fill me-2"></i>Choose Files
                                    </button>
                                </div>
                            </div>
                        </div>
                        ${getSelectedPanelHtml()}
                    </div>
                </div>
            </div>
        `;
    }

    // Create a new practice section (BLANK)
    function createPracticeSection(sectionNumber) {
        return `
            <div class="premium-practice-card practice-item list-item mb-3" data-section="${sectionNumber}">
                <button type="button" class="practice-remove-btn remove-practice-item d-flex justify-content-center align-items-center"
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
                    <div class="col-md-2">
                        <label class="practice-label"><i class="bi bi-calendar2-check-fill"></i>Year of Experience</label>
                        <input type="text" class="form-control practice-input practice-years"
                               name="practice_years_${sectionNumber}"
                               id="practice_years_${sectionNumber}"
                               value=""
                               maxlength="2"
                               inputmode="numeric"
                               autocomplete="off"
                               placeholder="YY">
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
                </div>
                <div class="mt-3">
                    ${getDocUploadHintHtml()}
                    <div class="file-upload-host tab3-file-upload-host">
                        <div class="upload-pick-panel">
                            <div class="practice-upload-box">
                                <div class="practice-upload-left">
                                    <div class="practice-upload-icon"><i class="bi bi-cloud-arrow-up-fill"></i></div>
                                    <div>
                                        <div class="practice-upload-title">Upload Practice Documents</div>
                                        <div class="practice-upload-subtitle">JPG, JPEG, PNG, PDF — max 5 MB</div>
                                    </div>
                                </div>
                                <div class="practice-upload-right">
                                    <input type="file" class="practice-doc-file d-none" id="practice-doc-${sectionNumber}" accept="${getDocUploadAccept()}">
                                    <button type="button" class="btn btn-outline-primary btn-upload-file practice-upload-btn">
                                        <i class="bi bi-cloud-upload-fill me-2"></i>Choose Files
                                    </button>
                                </div>
                            </div>
                        </div>
                        ${getSelectedPanelHtml()}
                    </div>
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
        // Re-initialize file upload handlers after rendering
        initFileUploadHandlers();
        initUploadButtonHandlers();
        refreshTab3FileInputs(container[0]);
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
        // Re-initialize file upload handlers after rendering
        initFileUploadHandlers();
        initUploadButtonHandlers();
        refreshTab3FileInputs(container[0]);
    }

    // Add new bar section
    function addBarSection() {
        const newSectionNum = barSectionCounter++;
        const $newSection = $(createBarSection(newSectionNum));
        $('#barExpContainer').append($newSection);

        const sections = AF.state.barSections || [1];
        sections.push(newSectionNum);
        AF.state.barSections = sections;

        recalculateTotalYears();
        // Re-initialize file upload handlers for the new section
        initFileUploadHandlers();
        initUploadButtonHandlers();
        refreshTab3FileInputs($newSection[0]);
    }

    // Add new practice section
    function addPracticeSection() {
        const newSectionNum = practiceSectionCounter++;
        const $newSection = $(createPracticeSection(newSectionNum));
        $('#courtPracticeContainer').append($newSection);

        const sections = AF.state.practiceSections || [1];
        sections.push(newSectionNum);
        AF.state.practiceSections = sections;

        // Re-initialize file upload handlers for the new section
        initFileUploadHandlers();
        initUploadButtonHandlers();
        refreshTab3FileInputs($newSection[0]);
    }

    // Remove bar section
    function removeBarSection(sectionNum) {
        $(`.bar-item[data-section="${sectionNum}"]`).remove();

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
        recalculateTotalYears();
    }

    // Remove practice section
    function removePracticeSection(sectionNum) {
        $(`.practice-item[data-section="${sectionNum}"]`).remove();

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
    }

    // ============================================================
    // JUDGMENT CITATION FUNCTIONS
    // ============================================================

    function getAAGCitations() {
        const citations = [];
        $('#judgmentAAGContainer .citation-input').each(function () {
            const val = $(this).val();
            citations.push(val);
        });
        return citations.length > 0 ? citations : [''];
    }

    function getAGPCitations() {
        const citations = [];
        $('#judgmentAGPContainer .citation-input').each(function () {
            const val = $(this).val();
            citations.push(val);
        });
        return citations.length > 0 ? citations : [''];
    }

    function renderJudgmentAAG() {
        const container = $('#judgmentAAGContainer');
        container.empty();

        const citations = AF.state.judgmentAAGCitations || [''];

        citations.forEach((citation, index) => {
            const citationHtml = `
                <div class="citation-item mb-2" data-index="${index}">
                    <div class="row g-2">
                        <div class="col-md-10">
                            <input type="text" class="form-control citation-input" 
                                   name="judgment_aag_citation_${index}"
                                   id="judgment_aag_citation_${index}"
                                   value="${escapeHtml(citation)}" 
                                   placeholder="Enter Case Citation (e.g., 2023 SCC 123)">
                        </div>
                        <div class="col-md-2">
                            <button type="button" class="btn btn-danger remove-citation-btn w-100">
                                <i class="bi bi-trash-fill"></i> Remove
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.append(citationHtml);
        });

        const addButtonHtml = `
            <div class="row mt-3">
                <div class="col-md-12">
                    <button type="button" class="btn btn-primary add-aag-citation-btn">
                        <i class="bi bi-plus-circle me-2"></i>Add Citation (Max 30)
                    </button>
                </div>
            </div>
        `;
        container.append(addButtonHtml);
    }

    function renderJudgmentAGP() {
        const container = $('#judgmentAGPContainer');
        container.empty();

        const citations = AF.state.judgmentAGPCitations || [''];

        citations.forEach((citation, index) => {
            const citationHtml = `
                <div class="citation-item mb-2" data-index="${index}">
                    <div class="row g-2">
                        <div class="col-md-10">
                            <input type="text" class="form-control citation-input" 
                                   name="judgment_agp_citation_${index}"
                                   id="judgment_agp_citation_${index}"
                                   value="${escapeHtml(citation)}" 
                                   placeholder="Enter Case Citation (e.g., 2023 SCC 123)">
                        </div>
                        <div class="col-md-2">
                            <button type="button" class="btn btn-danger remove-citation-btn w-100">
                                <i class="bi bi-trash-fill"></i> Remove
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.append(citationHtml);
        });

        const addButtonHtml = `
            <div class="row mt-3">
                <div class="col-md-12">
                    <button type="button" class="btn btn-primary add-agp-citation-btn">
                        <i class="bi bi-plus-circle me-2"></i>Add Citation (Max 30)
                    </button>
                </div>
            </div>
        `;
        container.append(addButtonHtml);
    }

    function initJudgmentCitationHandlers() {
        $(document).off('click', '.add-aag-citation-btn').on('click', '.add-aag-citation-btn', function () {
            let citations = getAAGCitations();
            const nonEmptyCount = citations.filter(c => c && c.trim() !== '').length;

            if (nonEmptyCount >= 30) {
                alert('Maximum 30 citations allowed for AAG section!');
                return;
            }

            citations.push('');
            AF.state.judgmentAAGCitations = citations;
            renderJudgmentAAG();
        });

        $(document).off('click', '.add-agp-citation-btn').on('click', '.add-agp-citation-btn', function () {
            let citations = getAGPCitations();
            const nonEmptyCount = citations.filter(c => c && c.trim() !== '').length;

            if (nonEmptyCount >= 30) {
                alert('Maximum 30 citations allowed for AGP section!');
                return;
            }

            citations.push('');
            AF.state.judgmentAGPCitations = citations;
            renderJudgmentAGP();
        });

        $(document).off('click', '.remove-citation-btn').on('click', '.remove-citation-btn', function () {
            const $btn = $(this);
            const $citationItem = $btn.closest('.citation-item');
            const $container = $citationItem.closest('#judgmentAAGContainer, #judgmentAGPContainer');
            const isAAG = $container.attr('id') === 'judgmentAAGContainer';
            const index = $citationItem.data('index');

            let citations = isAAG ? getAAGCitations() : getAGPCitations();

            if (index >= 0 && citations.length > 1) {
                citations.splice(index, 1);
                const hasNonEmpty = citations.some(c => c && c.trim() !== '');
                if (!hasNonEmpty && citations.length > 0) {
                    citations = [''];
                }

                if (isAAG) {
                    AF.state.judgmentAAGCitations = citations;
                    renderJudgmentAAG();
                } else {
                    AF.state.judgmentAGPCitations = citations;
                    renderJudgmentAGP();
                }
            }
        });

        $(document).off('input', '.citation-input').on('input', '.citation-input', function () {
            const $input = $(this);
            const $citationItem = $input.closest('.citation-item');
            const $container = $citationItem.closest('#judgmentAAGContainer, #judgmentAGPContainer');
            const isAAG = $container.attr('id') === 'judgmentAAGContainer';
            const newValue = $input.val();
            const index = $citationItem.data('index');

            let citations = isAAG ? [...(AF.state.judgmentAAGCitations || [''])] : [...(AF.state.judgmentAGPCitations || [''])];

            if (index >= 0 && citations[index] !== undefined) {
                citations[index] = newValue;

                if (isAAG) {
                    AF.state.judgmentAAGCitations = citations;
                } else {
                    AF.state.judgmentAGPCitations = citations;
                }
            }
        });
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

        // Validate Bar Experiences
        const barItems = $('#barExpContainer .bar-item');
        if (barItems.length === 0) {
            alert('Please add at least one Bar Practice Experience.');
            return false;
        }

        let hasValidBarExperience = false;
        let barValidationPassed = true;

        barItems.each(function (index) {
            const $item = $(this);
            const years = $item.find('.bar-years').val();
            const fromDate = $item.find('.bar-from').val();
            const toDate = $item.find('.bar-to').val();
            const courtType = $item.find('.bar-court-type').val();
            const barCouncil = $item.find('.bar-council').val().trim();

            if (years || fromDate || toDate || courtType || barCouncil) {
                hasValidBarExperience = true;

                if (!barCouncil) {
                    alert(`Bar Practice #${index + 1}: Please enter the Bar Council / Court name.`);
                    $item.find('.bar-council').focus();
                    barValidationPassed = false;
                    return false;
                }

                if (!courtType) {
                    alert(`Bar Practice #${index + 1}: Please select Court Type.`);
                    $item.find('.bar-court-type').focus();
                    barValidationPassed = false;
                    return false;
                }
            }
        });

        if (!barValidationPassed) return false;

        if (!hasValidBarExperience) {
            alert('Please fill at least one Bar Practice Experience with valid data.');
            return false;
        }

        // Validate at least one court practice has data
        const practiceItems = $('#courtPracticeContainer .practice-item');
        let hasValidPractice = false;
        practiceItems.each(function () {
            const courtName = $(this).find('.practice-court').val().trim();
            if (courtName) {
                hasValidPractice = true;
            }
        });

        if (!hasValidPractice) {
            alert('Please add at least one Court Practice Experience.');
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
            AF.state.barItems.push({
                years: normalizeExperienceYearsInput($item.find('.bar-years').val()) || '',
                from: $item.find('.bar-from').val() || '',
                to: $item.find('.bar-to').val() || '',
                barCouncil: $item.find('.bar-council').val() || '',
                courtType: $item.find('.bar-court-type').val() || ''
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
            AF.state.practiceItems.push({
                courtName: $item.find('.practice-court').val() || '',
                years: normalizeExperienceYearsInput($item.find('.practice-years').val()) || '',
                from: $item.find('.practice-from').val() || '',
                to: $item.find('.practice-to').val() || ''
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
        $('#previousWorked').off('change.tab3Conditional').on('change.tab3Conditional', function () {
            const isYes = $(this).val() === 'Yes';
            $('#previousWorkedWrapper').toggleClass('d-none', !isYes);
        });

        $('#achievmenetWrap').off('change.tab3Conditional').on('change.tab3Conditional', function () {
            const isYes = $(this).val() === 'Yes';
            $('#achievementDetailsWrapper').toggleClass('d-none', !isYes);
        });

        $('#previousWorked').trigger('change');
        $('#achievmenetWrap').trigger('change');
    }

    function initDraftingExperience() {
        const draftingYears = document.getElementById('draftingYears');
        if (draftingYears) {
            draftingYears.addEventListener('change', function () {
                AF.state.draftingYears = this.value;
            });
            if (AF.state.draftingYears) {
                draftingYears.value = AF.state.draftingYears;
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
            AF.state.judgmentAAGCitations = [''];
        }
        if (!AF.state.judgmentAGPCitations || AF.state.judgmentAGPCitations.length === 0) {
            AF.state.judgmentAGPCitations = [''];
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

        initOptimizedDateValidation();
        initDefaultItems();
        initJudgmentCitationHandlers();
        initProceedingToggles();
        initConditionalFields();
        initDraftingExperience();
        initAchievementUploadUi();
        initFileUploadHandlers();
        initUploadButtonHandlers();
        bindExperienceYearsInputs();

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
        loadExperienceData().then(function () {
            console.log('[Tab3] Experience data loaded');
        }).catch(function (err) {
            console.warn('[Tab3] Could not load experience data:', err);
        });
        $(document).on('input', '.bar-years, .practice-years, .bar-from, .bar-to, .practice-from, .practice-to', function () {
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
            AF.state.barItems.push({
                years: normalizeExperienceYearsInput($item.find('.bar-years').val()) || '',
                from: $item.find('.bar-from').val() || '',
                to: $item.find('.bar-to').val() || '',
                barCouncil: $item.find('.bar-council').val() || '',
                courtType: $item.find('.bar-court-type').val() || ''
            });
        });
        // calculateTotalBarYears();
        // calculateHighCourtYears();
    }

    function syncPractice() {
        AF.state.practiceItems = [];
        $('#courtPracticeContainer .practice-item').each(function (index) {
            const $item = $(this);
            AF.state.practiceItems.push({
                courtName: $item.find('.practice-court').val() || '',
                years: normalizeExperienceYearsInput($item.find('.practice-years').val()) || '',
                from: $item.find('.practice-from').val() || '',
                to: $item.find('.practice-to').val() || ''
            });
        });
    }

    function syncJudgmentAAG() {
        const citations = [];
        $('#judgmentAAGContainer .citation-input').each(function () {
            const val = $(this).val().trim();
            if (val) citations.push(val);
        });
        AF.state.judgmentAAGCitations = citations.length > 0 ? citations : [''];
    }

    function syncJudgmentAGP() {
        const citations = [];
        $('#judgmentAGPContainer .citation-input').each(function () {
            const val = $(this).val().trim();
            if (val) citations.push(val);
        });
        AF.state.judgmentAGPCitations = citations.length > 0 ? citations : [''];
    }

    function syncAll() {
        syncBar();
        syncPractice();
        syncJudgmentAAG();
        syncJudgmentAGP();
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
        uploadDocument: uploadDocument,
        syncBar: syncBar,
        syncPractice: syncPractice,
        syncJudgmentAAG: syncJudgmentAAG,
        syncJudgmentAGP: syncJudgmentAGP,
        syncAll: syncAll,
        syncBarSections: syncBarSections,
        syncPracticeSections: syncPracticeSections,
        renderBar: renderBarSections,
        renderPractice: renderPracticeSections,
        renderJudgmentAAG: renderJudgmentAAG,
        renderJudgmentAGP: renderJudgmentAGP
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
            if (!body.ok) {
                throw new Error(body.error || 'Unable to fetch experience details.');
            }
            console.log('[Tab3] Experience data fetched:', body);
            return body;
        });
    }

    function populateExperienceData(response) {
        if (!response || !response.ok) {
            console.log('[Tab3] No experience data to populate or response not ok');
            return;
        }

        // Parse the nested JSON string from the response
        let expData = null;
        if (response[0] && response[0].fn_application_get_experience_details) {
            try {
                const parsed = JSON.parse(response[0].fn_application_get_experience_details);
                expData = parsed;
                console.log('[Tab3] Parsed experience data:', expData);
            } catch (e) {
                console.error('[Tab3] Failed to parse experience data:', e);
                return;
            }
        }

        if (!expData) {
            console.log('[Tab3] No experience data found');
            return;
        }

        const experience = expData.experience || {};
        const barPractice = expData.bar_practice || [];
        const courtPractice = expData.court_practice || [];
        const judgements = expData.judgements || [];

        // 1. Basic Fields
        if (experience.law_degree_recognized !== undefined) {
            const lawDegreeVal = experience.law_degree_recognized === true || experience.law_degree_recognized === 'true' || experience.law_degree_recognized === 1 ? 'Yes' : 'No';
            $('#lawDegreeRecognized1').val(lawDegreeVal);
        }

        if (experience.provide_details_if_yes) {
            $('#previousWorkedDetails').val(experience.provide_details_if_yes);
        }

        if (experience.govt_law_officer_experience !== undefined) {
            const govtVal = experience.govt_law_officer_experience === true || experience.govt_law_officer_experience === 'true' || experience.govt_law_officer_experience === 1 ? 'Yes' : 'No';
            $('#previousWorked').val(govtVal).trigger('change');
        }

        // 2. Current Proceedings — populate fields before toggling visibility
        const $currentDetails = $('#currentProceedingDetails');
        if (experience.current_criminal_cases_details) {
            $currentDetails.find('textarea').eq(0).val(experience.current_criminal_cases_details);
        }
        if (experience.current_criminal_cases_present_status) {
            $currentDetails.find('textarea').eq(1).val(experience.current_criminal_cases_present_status);
        }
        if (experience.current_disciplinary_proceeding_details) {
            $currentDetails.find('textarea').eq(2).val(experience.current_disciplinary_proceeding_details);
        }
        if (experience.current_disciplinary_proceeding_present_status) {
            $currentDetails.find('textarea').eq(3).val(experience.current_disciplinary_proceeding_present_status);
        }
        if (experience.current_facing_criminal_proceedings !== undefined) {
            const isCurrentProceeding = experience.current_facing_criminal_proceedings === true || experience.current_facing_criminal_proceedings === 'true' || experience.current_facing_criminal_proceedings === 1;
            $('#currentProceedingYes').prop('checked', isCurrentProceeding);
            $('#currentProceedingNo').prop('checked', !isCurrentProceeding);
            $('#currentProceedingYes, #currentProceedingNo').trigger('change');
        }

        // 3. Past Proceedings — populate fields before toggling visibility
        const $pastDetails = $('#pastProceedingDetails');
        if (experience.past_criminal_cases_details) {
            $pastDetails.find('textarea').eq(0).val(experience.past_criminal_cases_details);
        }
        if (experience.past_criminal_cases_present_status) {
            $pastDetails.find('textarea').eq(1).val(experience.past_criminal_cases_present_status);
        }
        if (experience.past_disciplinary_proceeding_details) {
            $pastDetails.find('textarea').eq(2).val(experience.past_disciplinary_proceeding_details);
        }
        if (experience.past_disciplinary_proceeding_present_status) {
            $pastDetails.find('textarea').eq(3).val(experience.past_disciplinary_proceeding_present_status);
        }
        if (experience.past_facing_criminal_proceedings !== undefined) {
            const isPastProceeding = experience.past_facing_criminal_proceedings === true || experience.past_facing_criminal_proceedings === 'true' || experience.past_facing_criminal_proceedings === 1;
            $('#pastProceedingYes').prop('checked', isPastProceeding);
            $('#pastProceedingNo').prop('checked', !isPastProceeding);
            $('#pastProceedingYes, #pastProceedingNo').trigger('change');
        }

        // 4. Achievement Section — populate fields before toggling visibility
        if (experience.achievement_remarks) {
            $('#achievementDetails').val(experience.achievement_remarks);
        }
        if (experience.professional_achievement !== undefined) {
            const hasAchievement = experience.professional_achievement === true || experience.professional_achievement === 'true' || experience.professional_achievement === 1 ? 'Yes' : 'No';
            $('#achievmenetWrap').val(hasAchievement).trigger('change');
        }

        // 5. Bar Experiences - WITH FILE DISPLAY
        if (barPractice && barPractice.length > 0) {
            // Clear existing sections
            $('#barExpContainer').empty();
            AF.state.barSections = [];
            AF.state.barItems = [];

            barPractice.forEach(function (practice, index) {
                const sectionNum = index + 1;
                AF.state.barSections.push(sectionNum);
                AF.state.barItems.push({
                    id: practice.bar_practice_id || practice.id || 0,
                    years: practice.years_experience || '',
                    from: practice.from_date || '',
                    to: practice.to_date || '',
                    barCouncil: practice.bar_council_name || '',
                    courtType: practice.court_type || ''
                });
            });

            barSectionCounter = barPractice.length + 1;
            renderBarSections();

            // Populate values after render and set file names
            barPractice.forEach(function (practice, index) {
                const $item = $('#barExpContainer .bar-item').eq(index);
                if ($item.length) {
                    const practiceId = parseInt(practice.bar_practice_id || practice.id, 10);
                    if (!isNaN(practiceId) && practiceId > 0) {
                        $item.data('bar-practice-id', practiceId);
                    }
                    $item.find('.bar-years').val(formatExperienceYearsForDisplay(practice.years_experience));
                    $item.find('.bar-from').val(practice.from_date || '');
                    $item.find('.bar-to').val(practice.to_date || '');
                    $item.find('.bar-council').val(practice.bar_council_name || '');
                    $item.find('.bar-court-type').val(practice.court_type || '');

                    // Handle supporting document display
                    if (practice.supporting_document && practice.supporting_document !== '') {
                        $item.data('supporting-document', practice.supporting_document);
                        const fileInput = $item.find('.bar-doc-file')[0];
                        const fileName = practice.supporting_document.split('/').pop();
                        if (fileInput && AF.files && typeof AF.files.showFileUploadSelected === 'function') {
                            AF.files.showFileUploadSelected(fileInput, fileName, { replaceReady: true });
                        }
                    }
                }
            });
        }

        // 6. Court Practices - WITH FILE DISPLAY
        if (courtPractice && courtPractice.length > 0) {
            // Clear existing sections
            $('#courtPracticeContainer').empty();
            AF.state.practiceSections = [];
            AF.state.practiceItems = [];

            courtPractice.forEach(function (practice, index) {
                const sectionNum = index + 1;
                AF.state.practiceSections.push(sectionNum);
                AF.state.practiceItems.push({
                    courtName: practice.court_name || '',
                    years: practice.years_experience || '',
                    from: practice.from_date || '',
                    to: practice.to_date || ''
                });
            });

            practiceSectionCounter = courtPractice.length + 1;
            renderPracticeSections();

            // Populate values after render and set file names
            courtPractice.forEach(function (practice, index) {
                const $item = $('#courtPracticeContainer .practice-item').eq(index);
                if ($item.length) {
                    $item.find('.practice-court').val(practice.court_name || '');
                    $item.find('.practice-years').val(formatExperienceYearsForDisplay(practice.years_experience));
                    $item.find('.practice-from').val(practice.from_date || '');
                    $item.find('.practice-to').val(practice.to_date || '');

                    // Handle practice document display
                    if (practice.practice_document && practice.practice_document !== '') {
                        $item.data('practice-document', practice.practice_document);
                        const fileInput = $item.find('.practice-doc-file')[0];
                        const fileName = practice.practice_document.split('/').pop();
                        if (fileInput && AF.files && typeof AF.files.showFileUploadSelected === 'function') {
                            AF.files.showFileUploadSelected(fileInput, fileName, { replaceReady: true });
                        }
                    }
                }
            });
        }

        // 7. Judgments/Citations
        if (judgements && judgements.length > 0) {
            // Separate AAG and AGP citations
            const aagCitations = [];
            const agpCitations = [];

            judgements.forEach(function (judgement) {
                if (judgement.category === 'AAG' && judgement.citations && judgement.citations.length > 0) {
                    judgement.citations.forEach(function (citation) {
                        if (citation.case_citation && citation.case_citation.trim()) {
                            aagCitations.push(citation.case_citation);
                        }
                    });
                }
                if (judgement.category === 'AGP' && judgement.citations && judgement.citations.length > 0) {
                    judgement.citations.forEach(function (citation) {
                        if (citation.case_citation && citation.case_citation.trim()) {
                            agpCitations.push(citation.case_citation);
                        }
                    });
                }
            });

            // Remove duplicates if needed (optional)
            const uniqueAAG = [...new Set(aagCitations)];
            const uniqueAGP = [...new Set(agpCitations)];

            if (uniqueAAG.length > 0) {
                AF.state.judgmentAAGCitations = uniqueAAG;
                renderJudgmentAAG();
            }

            if (uniqueAGP.length > 0) {
                AF.state.judgmentAGPCitations = uniqueAGP;
                renderJudgmentAGP();
            }
        }

        // 8. Drafting Experience
        if (experience.drafting_experience_years) {
            $('#draftingYears').val(experience.drafting_experience_years);
        }

        // 9. Total Bar Years (calculated field - display only, not populated from API)
        if (experience.total_bar_experience_years) {
            $('#totalBarYears').val(experience.total_bar_experience_years + ' years');
        }

        // Trigger recalculation to ensure all totals are correct
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
                if (response && response.ok) {
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