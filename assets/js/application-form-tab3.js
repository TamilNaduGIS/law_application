/**
 * Tab 3: Experience Details - With DB Format Transformation
 */
(function (AF) {
    const escapeHtml = AF.utils.escapeHtml;
    const buildFileUploadHtml = AF.files.buildFileUploadHtml;
    
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
    
    // Transform payload to database format
    function transformToDBFormat(formData) {
        // Calculate total bar experience years
        let totalBarExperienceYears = 0;
        if (formData.bar_experiences && Array.isArray(formData.bar_experiences)) {
            formData.bar_experiences.forEach(exp => {
                const years = parseFloat(exp.years);
                if (!isNaN(years)) {
                    totalBarExperienceYears += years;
                }
            });
        }
        
        // Calculate total practice years
        let totalPracticeYears = 0;
        if (formData.practice_items && Array.isArray(formData.practice_items)) {
            formData.practice_items.forEach(practice => {
                const years = parseFloat(practice.years);
                if (!isNaN(years)) {
                    totalPracticeYears += years;
                }
            });
        }
        
        // Get drafting years
        const draftingYears = formData.drafting_years ? parseFloat(formData.drafting_years) : 0;
        
        // Transform bar practice
        const barPractice = [];
        if (formData.bar_experiences && Array.isArray(formData.bar_experiences)) {
            formData.bar_experiences.forEach((exp, index) => {
                barPractice.push({
                    bar_practice_id: 0,
                    years_experience: parseInt(exp.years) || 0,
                    from_date: exp.from_date || null,
                    to_date: exp.to_date || null,
                    bar_council_name: exp.bar_council || "",
                    supporting_document: null,
                    is_deleted: false
                });
            });
        }
        
        // Transform court practice
        const courtPractice = [];
        if (formData.practice_items && Array.isArray(formData.practice_items)) {
            formData.practice_items.forEach((practice, index) => {
                courtPractice.push({
                    court_practice_id: 0,
                    court_name: practice.court_name || "",
                    years_experience: parseInt(practice.years) || 0,
                    from_date: practice.from_date || null,
                    to_date: practice.to_date || null,
                    practice_document: null,
                    is_deleted: false
                });
            });
        }
        
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
        const dbPayload = {
            applicant_id: AF.state.applicant_id || 1,
            created_by: AF.state.created_by || 1,
            law_degree_recognized: formData.law_degree_recognized || false,
            govt_law_officer_experience: formData.previously_worked || false,
            provide_details_if_yes: formData.previously_worked_details || "",
            current_facing_criminal_proceedings: formData.current_proceeding || false,
            current_criminal_cases_details: formData.current_criminal_details || "",
            current_criminal_cases_present_status: formData.current_criminal_status || "",
            current_disciplinary_proceeding_details: formData.current_disciplinary_details || "",
            current_disciplinary_proceeding_present_status: formData.current_disciplinary_status || "",
            past_facing_criminal_proceedings: formData.past_proceeding || false,
            past_criminal_cases_details: formData.past_criminal_details || "",
            past_criminal_cases_present_status: formData.past_criminal_status || "",
            past_disciplinary_proceeding_details: formData.past_disciplinary_details || "",
            past_disciplinary_proceeding_present_status: formData.past_disciplinary_status || "",
            professional_achievement: formData.has_achievements || false,
            achievement_remarks: formData.achievement_details || "",
            achievement_support_document: formData.achievement_files && formData.achievement_files.length > 0 ? formData.achievement_files[0] : null,
            total_bar_experience_years: totalBarExperienceYears,
            total_practice_years: totalPracticeYears,
            drafting_experience_years: draftingYears,
            bar_practice: barPractice,
            court_practice: courtPractice,
            judgements: judgements
        };
        
        return dbPayload;
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
                        .fadeOut(300, function() { $(this).remove(); });
                } else {
                    $item.find('.date-error-message').remove();
                }
            } else {
                $from.removeClass('is-invalid');
                $to.removeClass('is-invalid');
            }
        };
        
        $(document)
            .on('change', '.bar-from, .practice-from', function() {
                const $to = $(this).closest('.list-item').find('.bar-to, .practice-to');
                validateDates($(this), $to);
            })
            .on('change', '.bar-to, .practice-to', function() {
                const $from = $(this).closest('.list-item').find('.bar-from, .practice-from');
                validateDates($from, $(this));
            })
            .on('focus', '.bar-from, .bar-to, .practice-from, .practice-to', function() {
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
        
        const achievementFiles = $('#achievementFiles')[0]?.files;
        payload.achievement_files = achievementFiles && achievementFiles.length > 0 
            ? Array.from(achievementFiles).map(f => f.name) 
            : null;
        
        // 5. Bar Experiences
        payload.bar_experiences = [];
        $('#barExpContainer .bar-item').each(function(index) {
            const $item = $(this);
            const years = ($item.find('.bar-years').val() || '').trim();
            const fromDate = $item.find('.bar-from').val() || null;
            const toDate = $item.find('.bar-to').val() || null;
            const courtType = ($item.find('.bar-court-type').val() || '').trim() || null;
            const barCouncil = ($item.find('.bar-council').val() || '').trim() || null;
            
            if (years || fromDate || toDate || courtType || barCouncil) {
                payload.bar_experiences.push({
                    years: years || null,
                    from_date: fromDate,
                    to_date: toDate,
                    court_type: courtType,
                    bar_council: barCouncil
                });
            }
        });
        if (payload.bar_experiences.length === 0) payload.bar_experiences = null;
        
        // 6. Practice Items
        payload.practice_items = [];
        $('#courtPracticeContainer .practice-item').each(function(index) {
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
                    to_date: toDate
                });
            }
        });
        if (payload.practice_items.length === 0) payload.practice_items = null;
        
        // 7-8. Judgment citations
        payload.judgment_aag_citations = [];
        $('#judgmentAAGContainer .citation-input').each(function() {
            const val = $(this).val().trim();
            if (val) payload.judgment_aag_citations.push(val);
        });
        if (payload.judgment_aag_citations.length === 0) payload.judgment_aag_citations = null;

        payload.judgment_agp_citations = [];
        $('#judgmentAGPContainer .citation-input').each(function() {
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
        
        $('#barExpContainer .bar-item').each(function() {
            const $item = $(this);
            const years = parseFloat($item.find('.bar-years').val());
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
                        <label class="premium-label"><i class="bi bi-calendar2-check-fill"></i>Years</label>
                        <input type="number" class="form-control premium-input bar-years"
                               name="bar_years_${sectionNumber}"
                               id="bar_years_${sectionNumber}"
                               value="" 
                               placeholder="Years" step="0.5">
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
                    <div class="compact-upload-box">
                        <div class="upload-left">
                            <div class="upload-file-icon"><i class="bi bi-cloud-arrow-up-fill"></i></div>
                            <div>
                                <div class="upload-title">Upload Supporting Documents</div>
                                <div class="upload-subtitle">PDF / DOC / DOCX</div>
                            </div>
                        </div>
                        <div class="upload-right">
                            ${buildFileUploadHtml('bar-doc-' + sectionNumber, 'Choose Files', '', 'bar-doc-file', '.pdf,.doc,.docx', true)}
                        </div>
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
                        <label class="practice-label"><i class="bi bi-calendar2-check-fill"></i>Years</label>
                        <input type="number" class="form-control practice-input practice-years"
                               name="practice_years_${sectionNumber}"
                               id="practice_years_${sectionNumber}"
                               value="" 
                               placeholder="Years" step="0.5">
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
                    <div class="practice-upload-box">
                        <div class="practice-upload-left">
                            <div class="practice-upload-icon"><i class="bi bi-cloud-arrow-up-fill"></i></div>
                            <div>
                                <div class="practice-upload-title">Upload Practice Documents</div>
                                <div class="practice-upload-subtitle">Experience Certificates / Supporting Files</div>
                            </div>
                        </div>
                        <div class="practice-upload-right">
                            ${buildFileUploadHtml('practice-doc-' + sectionNumber, 'Choose Files', '', 'practice-doc-file', '.pdf,.doc,.docx', true)}
                        </div>
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
    }
    
    // Add new practice section
    function addPracticeSection() {
        const newSectionNum = practiceSectionCounter++;
        const $newSection = $(createPracticeSection(newSectionNum));
        $('#courtPracticeContainer').append($newSection);
        
        const sections = AF.state.practiceSections || [1];
        sections.push(newSectionNum);
        AF.state.practiceSections = sections;
    }
    
    // Remove bar section
    function removeBarSection(sectionNum) {
        $(`.bar-item[data-section="${sectionNum}"]`).remove();
        
        let sections = AF.state.barSections || [1];
        sections = sections.filter(s => s !== sectionNum);
        if (sections.length === 0) sections = [1];
        AF.state.barSections = sections;
        
        $('#barExpContainer .bar-item').each(function(index) {
            const newNum = index + 1;
            $(this).attr('data-section', newNum);
            $(this).find('.bar-title').text(`Bar Practice Experience #${newNum}`);
            $(this).find('.bar-years').attr({name: `bar_years_${newNum}`, id: `bar_years_${newNum}`});
            $(this).find('.bar-from').attr({name: `bar_from_${newNum}`, id: `bar_from_${newNum}`});
            $(this).find('.bar-to').attr({name: `bar_to_${newNum}`, id: `bar_to_${newNum}`});
            $(this).find('.bar-court-type').attr({name: `bar_court_type_${newNum}`, id: `bar_court_type_${newNum}`});
            $(this).find('.bar-council').attr({name: `bar_council_${newNum}`, id: `bar_council_${newNum}`});
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
        
        $('#courtPracticeContainer .practice-item').each(function(index) {
            const newNum = index + 1;
            $(this).attr('data-section', newNum);
            $(this).find('.practice-title').text(`Court Practice Experience #${newNum}`);
            $(this).find('.practice-court').attr({name: `practice_court_${newNum}`, id: `practice_court_${newNum}`});
            $(this).find('.practice-years').attr({name: `practice_years_${newNum}`, id: `practice_years_${newNum}`});
            $(this).find('.practice-from').attr({name: `practice_from_${newNum}`, id: `practice_from_${newNum}`});
            $(this).find('.practice-to').attr({name: `practice_to_${newNum}`, id: `practice_to_${newNum}`});
            $(this).find('.practice-remove-btn').attr('data-section', newNum);
        });
        
        practiceSectionCounter = sections.length + 1;
    }
    
    // ============================================================
    // JUDGMENT CITATION FUNCTIONS
    // ============================================================
    
    function getAAGCitations() {
        const citations = [];
        $('#judgmentAAGContainer .citation-input').each(function() {
            const val = $(this).val();
            citations.push(val);
        });
        return citations.length > 0 ? citations : [''];
    }
    
    function getAGPCitations() {
        const citations = [];
        $('#judgmentAGPContainer .citation-input').each(function() {
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
        $(document).off('click', '.add-aag-citation-btn').on('click', '.add-aag-citation-btn', function() {
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
        
        $(document).off('click', '.add-agp-citation-btn').on('click', '.add-agp-citation-btn', function() {
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
        
        $(document).off('click', '.remove-citation-btn').on('click', '.remove-citation-btn', function() {
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
        
        $(document).off('input', '.citation-input').on('input', '.citation-input', function() {
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
    
    // ============================================================
    // INITIALIZATION FUNCTIONS
    // ============================================================

    function initProceedingToggles() {
        const $currentDetails = $('#currentProceedingDetails');
        const $pastDetails = $('#pastProceedingDetails');
        
        function toggleCurrent() {
            if ($('#currentProceedingYes').is(':checked')) {
                $currentDetails.slideDown(300);
                $currentDetails.find('textarea').prop('required', true);
            } else {
                $currentDetails.slideUp(300);
                $currentDetails.find('textarea').val('').prop('required', false);
            }
        }
        
        function togglePast() {
            if ($('#pastProceedingYes').is(':checked')) {
                $pastDetails.slideDown(300);
                $pastDetails.find('textarea').prop('required', true);
            } else {
                $pastDetails.slideUp(300);
                $pastDetails.find('textarea').val('').prop('required', false);
            }
        }
        
        $('#currentProceedingYes, #currentProceedingNo').on('change', toggleCurrent);
        $('#pastProceedingYes, #pastProceedingNo').on('change', togglePast);
        
        toggleCurrent();
        togglePast();
    }

    function initConditionalFields() {
        $('#previousWorked').on('change', function() {
            if ($(this).val() === 'Yes') {
                $('#previousWorkedWrapper').removeClass('d-none');
            } else {
                $('#previousWorkedWrapper').addClass('d-none');
                $('#previousWorkedDetails').val('');
            }
        }).trigger('change');
        
        $('#achievmenetWrap').on('change', function() {
            if ($(this).val() === 'Yes') {
                $('#achievementDetailsWrapper').removeClass('d-none');
            } else {
                $('#achievementDetailsWrapper').addClass('d-none');
                $('#achievementDetails').val('');
                $('#achievementFiles').val('');
            }
        }).trigger('change');
    }

    function initDraftingExperience() {
        const draftingYears = document.getElementById('draftingYears');
        if (draftingYears) {
            draftingYears.addEventListener('change', function() {
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
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================

    function init() {
        initOptimizedDateValidation();
        initDefaultItems();
        initJudgmentCitationHandlers();
        initProceedingToggles();
        initConditionalFields();
        initDraftingExperience();
        
        renderBarSections();
        renderPracticeSections();
        renderJudgmentAAG();
        renderJudgmentAGP();
        
        $(document).on('input', '.bar-years, .practice-years, .bar-from, .bar-to, .practice-from, .practice-to', function() {
            recalculateTotalYears();
        });
        
        $(document).on('change', '.bar-court-type', function() {
            recalculateTotalYears();
        });
        
        // Save button handler - Transforms to DB format
        $('#experienceSave').on('click', function(e){
            e.preventDefault();
            
            // Collect raw form data
            const rawPayload = collectExperienceData();
            console.log('Raw Form Data:', rawPayload);
            
            // Transform to database format
            const dbPayload = transformToDBFormat(rawPayload);
            console.log('Database Format Payload:', dbPayload);
            console.log('Whole Payload:', JSON.stringify(dbPayload, null, 2));
            
            // Store in AF state
            AF.state.experienceData = rawPayload;
            AF.state.dbExperienceData = dbPayload;
            
            if (AF.data && AF.data.saveDraft) AF.data.saveDraft();
            
            alert('Experience data collected! Check console for payload.');
            return dbPayload;
        });
        
        $('#addBarExpBtn').off('click').on('click', function() {
            addBarSection();
        });
        
        $('#addPracticeBtn').off('click').on('click', function() {
            addPracticeSection();
        });
        
        $(document).off('click', '.remove-bar-item').on('click', '.remove-bar-item', function() {
            const sectionNum = $(this).data('section');
            if ($('#barExpContainer .bar-item').length > 1) {
                removeBarSection(sectionNum);
            } else {
                $('#barExpContainer .bar-years, #barExpContainer .bar-from, #barExpContainer .bar-to, #barExpContainer .bar-council').val('');
                $('#barExpContainer .bar-court-type').val('');
                recalculateTotalYears();
            }
        });
        
        $(document).off('click', '.remove-practice-item').on('click', '.remove-practice-item', function() {
            const sectionNum = $(this).data('section');
            if ($('#courtPracticeContainer .practice-item').length > 1) {
                removePracticeSection(sectionNum);
            } else {
                $('#courtPracticeContainer .practice-court, #courtPracticeContainer .practice-years, #courtPracticeContainer .practice-from, #courtPracticeContainer .practice-to').val('');
            }
        });
        
        $('#prevToTab2').off('click').on('click', function() { 
            if (AF.nav) AF.nav.switchTab(2); 
        });
    }

    // ============================================================
    // EXPOSED API
    // ============================================================

    AF.tab3 = {
        init: init,
        collectData: collectExperienceData,
        transformToDBFormat: transformToDBFormat
    };
    
})(window.ApplicationForm);