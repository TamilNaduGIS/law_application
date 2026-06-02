/**
 * Application form — POST /api/vacancy/details (applicant_registration).
 */
(function (AF, global) {
    'use strict';

    const GENDER_MAP = {
        M: 'Male',
        F: 'Female',
        O: 'Other',
        Male: 'Male',
        Female: 'Female',
        Other: 'Other'
    };

    const MARITAL_MAP = {
        S: 'Single',
        M: 'Married',
        D: 'Divorced',
        W: 'Widowed',
        Single: 'Single',
        Married: 'Married',
        Divorced: 'Divorced',
        Widowed: 'Widowed'
    };

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

    function formatDate(val) {
        if (!val) return '';
        const s = String(val).trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
        const dmy = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (dmy) return dmy[3] + '-' + dmy[2] + '-' + dmy[1];
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
            return d.toISOString().slice(0, 10);
        }
        return s;
    }

    function mapGender(raw) {
        const key = String(raw || '').trim();
        return GENDER_MAP[key] || key;
    }

    function mapMarital(raw) {
        const key = String(raw || '').trim();
        return MARITAL_MAP[key] || key;
    }

    /** Values on application-form.html #community select */
    const FORM_COMMUNITY_CODES = ['OC', 'BC', 'BCM', 'MBC', 'DNC', 'SC', 'ST'];

    const COMMUNITY_SELECT_ALIASES = {
        '1': 'BC',
        '2': 'MBC',
        '3': 'SC',
        '4': 'ST',
        '5': 'OC',
        'BC MUSLIM': 'BCM',
        'BCMUSLIM': 'BCM',
        'BCM': 'BCM',
        'DNC/DNT': 'DNC',
        'DNC / DNT': 'DNC',
        'DNC DNT': 'DNC',
        'DNT': 'DNC',
        'DNC': 'DNC',
        'MOST BACKWARD CLASS': 'MBC',
        'MOST BACKWARD CLASSES': 'MBC',
        'BACKWARD CLASS': 'BC',
        'BACKWARD CLASSES': 'BC',
        'SCHEDULED CASTE': 'SC',
        'SCHEDULED TRIBE': 'ST',
        'OTHER CASTE': 'OC',
        'OPEN CATEGORY': 'OC',
        'GENERAL': 'OC',
        'DENOTIFIED': 'DNC',
        'DENOTIFIED COMMUNITY': 'DNC',
        'DNCDNT': 'DNC',
        'BCMUSLIM': 'BCM'
    };

    function normalizeCommunityForSelect(raw) {
        const s = String(raw || '').trim();
        if (!s) {
            return '';
        }
        const upper = s.toUpperCase().replace(/\s+/g, ' ');
        if (FORM_COMMUNITY_CODES.indexOf(upper) >= 0) {
            return upper;
        }
        if (COMMUNITY_SELECT_ALIASES[upper]) {
            return COMMUNITY_SELECT_ALIASES[upper];
        }
        const compact = upper.replace(/[\s/.-]+/g, '');
        if (COMMUNITY_SELECT_ALIASES[compact]) {
            return COMMUNITY_SELECT_ALIASES[compact];
        }
        return s;
    }

    /**
     * @param {string} raw Community from API / registration
     * @returns {{ selectValue: string, casteApiKey: string, raw: string }}
     */
    function resolveCommunityForForm(raw) {
        const original = String(raw || '').trim();
        const selectValue = normalizeCommunityForSelect(original);
        const casteApiKey = original || selectValue;
        return {
            selectValue: selectValue,
            casteApiKey: casteApiKey,
            raw: original
        };
    }

    /**
     * Set #community to a matching option; returns resolved codes for caste API.
     * @param {HTMLSelectElement|null} selectEl
     * @param {string} raw
     */
    function applyCommunityToSelect(selectEl, raw) {
        const resolved = resolveCommunityForForm(raw);
        if (!selectEl || !resolved.selectValue) {
            return resolved;
        }
        const target = resolved.selectValue;
        let matched = false;
        for (let i = 0; i < selectEl.options.length; i++) {
            const opt = selectEl.options[i];
            if (opt.value === target) {
                selectEl.value = target;
                matched = true;
                break;
            }
        }
        if (!matched) {
            const tLow = target.toLowerCase();
            for (let i = 0; i < selectEl.options.length; i++) {
                const opt = selectEl.options[i];
                const vLow = String(opt.value || '').toLowerCase();
                const labelLow = String(opt.textContent || '').trim().toLowerCase();
                if (vLow === tLow || labelLow === tLow) {
                    selectEl.value = opt.value;
                    resolved.selectValue = opt.value;
                    matched = true;
                    break;
                }
            }
        }
        if (!matched) {
            selectEl.value = target;
        }
        return resolved;
    }

    function normalizeApplicantPersonalRow(row) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
            return null;
        }
        if (row.personal_info && typeof row.personal_info === 'object' && !Array.isArray(row.personal_info)) {
            return row.personal_info;
        }
        if (row.personal && typeof row.personal === 'object' && !Array.isArray(row.personal)) {
            return row.personal;
        }
        return row;
    }

    function isApplicantPersonalRow(row) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
            return false;
        }
        return row.applicant_id !== undefined || row.applicant_name !== undefined
            || row.enrollment_no !== undefined || row.enrolment_no !== undefined
            || row.mobile_no !== undefined || row.email_id !== undefined
            || row.bar_council_enrollement_number !== undefined
            || row.bar_council_number !== undefined;
    }

    function extractDocumentsFromBundle(bundle) {
        if (!bundle || typeof bundle !== 'object') {
            return [];
        }
        if (Array.isArray(bundle.documents)) {
            return bundle.documents;
        }
        if (Array.isArray(bundle.document_list)) {
            return bundle.document_list;
        }
        return [];
    }

    function attachApplicantDocuments(personalRow, bundle) {
        if (!personalRow || !bundle || typeof bundle !== 'object') {
            return personalRow;
        }
        const docs = extractDocumentsFromBundle(bundle);
        if (docs.length && !Array.isArray(personalRow.documents)) {
            personalRow.documents = docs.slice();
        }
        return personalRow;
    }

    /**
     * Resolve applicant personal row from nested / array API shapes
     * (fn JSON, personal_info wrapper, { ok, data: [...] }, etc.).
     */
    function coerceApplicantRow(candidate, documentSource) {
        if (candidate == null) {
            return null;
        }
        if (Array.isArray(candidate)) {
            for (let i = 0; i < candidate.length; i++) {
                const row = coerceApplicantRow(candidate[i], documentSource || candidate);
                if (row && isApplicantPersonalRow(row)) {
                    return attachApplicantDocuments(row, documentSource || candidate[i]);
                }
            }
            if (candidate.length && typeof candidate[0] === 'object' && !Array.isArray(candidate[0])) {
                return attachApplicantDocuments(candidate[0], documentSource);
            }
            return null;
        }
        if (typeof candidate !== 'object') {
            return null;
        }
        if (candidate.error) {
            return null;
        }

        const nested = normalizeApplicantPersonalRow(candidate);
        if (nested && isApplicantPersonalRow(nested)) {
            return attachApplicantDocuments(nested, candidate);
        }
        if (isApplicantPersonalRow(candidate)) {
            return attachApplicantDocuments(candidate, documentSource || candidate);
        }

        const childKeys = ['data', 'result', 'record', 'applicant', 'applicant_details', 'details'];
        for (let k = 0; k < childKeys.length; k++) {
            const child = candidate[childKeys[k]];
            if (child == null) {
                continue;
            }
            const row = coerceApplicantRow(child, candidate);
            if (row && (isApplicantPersonalRow(row) || Object.keys(row).length)) {
                return attachApplicantDocuments(row, candidate);
            }
        }
        return null;
    }

    function extractApplicantRow(res) {
        if (!res) return null;

        let body = res;
        if (global.SecureAPI && typeof global.SecureAPI.unwrapResponse === 'function') {
            body = global.SecureAPI.unwrapResponse(res) || res;
        } else if (res.data !== undefined) {
            body = res.data;
        }

        if (Array.isArray(body)) {
            return coerceApplicantRow(body, res);
        }
        if (!body || typeof body !== 'object') {
            return null;
        }
        if (body.error) {
            return null;
        }

        if (body.fn_application_get_personal_info) {
            try {
                const parsed = typeof body.fn_application_get_personal_info === 'string'
                    ? JSON.parse(body.fn_application_get_personal_info)
                    : body.fn_application_get_personal_info;
                const fromFn = coerceApplicantRow(parsed, parsed);
                if (fromFn) {
                    return fromFn;
                }
            } catch (e) {
                console.warn('[API] fn_application_get_personal_info parse:', e);
            }
        }

        const row = coerceApplicantRow(body, body);
        if (row) {
            return row;
        }

        if (body.data != null) {
            return coerceApplicantRow(body.data, body);
        }
        return null;
    }

    /**
     * Present Court of practice — free text only.
     * Sign-up "Total Years of Practice" (expyears) must not appear here.
     */
    function normalizePresentCourtOfPractice(val) {
        const s = String(val == null ? '' : val).trim();
        if (!s) {
            return '';
        }
        if (/^[0-9]+(\.[0-9]+)?$/.test(s)) {
            return '';
        }
        return s;
    }

    function pickPresentCourtOfPractice(row) {
        if (!row) return '';
        const court = pickField(row, [
            'present_court_of_practice',
            'court_of_practice',
            'court_practice',
            'court_pratice'
        ]);
        if (court !== '' && court !== null) {
            return normalizePresentCourtOfPractice(court);
        }
        const legacy = pickField(row, ['years_of_practice_hcm']);
        return normalizePresentCourtOfPractice(legacy);
    }

    function trimStr(val) {
        return val != null ? String(val).trim() : '';
    }

    /** Merge saved upload paths from state/session when API row omits them (after save / tab switch / preview). */
    function pathsAreSameUpload(a, b) {
        const left = trimStr(a).replace(/\\/g, '/');
        const right = trimStr(b).replace(/\\/g, '/');
        return !!(left && right && left === right);
    }

    /** Normalize API row upload fields onto personal object used by Tab 1. */
    function extractApplicantUploadPaths(row) {
        row = row || {};
        const photoPath = trimStr(pickField(row, ['photo_path', 'photoPath']));
        let certPath = trimStr(pickField(row, [
            'certificate_path',
            'certificatePath',
            'enrolment_cert_path',
            'enrolmentCertPath'
        ]));
        const photoFileName = trimStr(pickField(row, ['photo_name', 'photo_file_name', 'photoFileName']));
        let certFileName = trimStr(pickField(row, [
            'certificate_name',
            'certificateName',
            'enrolment_cert_file_name',
            'enrolmentCertFileName'
        ]));
        if (pathsAreSameUpload(certPath, photoPath)) {
            certPath = '';
            certFileName = '';
        }
        return {
            photoPath: photoPath,
            photoFileName: photoFileName,
            enrolmentCertPath: certPath,
            enrolmentCertFileName: certFileName,
            certificate_path: certPath,
            certificate_name: certFileName
        };
    }

    function enrichPersonalWithUploadMeta(personal) {
        const out = Object.assign({}, personal || {});
        const fromRow = extractApplicantUploadPaths(out);
        if (fromRow.photoPath) {
            out.photoPath = fromRow.photoPath;
            out.photoFileName = out.photoFileName || fromRow.photoFileName;
        }
        if (fromRow.enrolmentCertPath) {
            out.enrolmentCertPath = fromRow.enrolmentCertPath;
            out.enrolmentCertFileName = out.enrolmentCertFileName || fromRow.enrolmentCertFileName;
        }
        if (!AF.files || typeof AF.files.getApplicantUploadMeta !== 'function') {
            return out;
        }
        const photoMeta = AF.files.getApplicantUploadMeta('photo');
        const certMeta = AF.files.getApplicantUploadMeta('enrolmentCert');
        if (!trimStr(out.photoPath) && photoMeta.path) {
            out.photoPath = photoMeta.path;
            out.photoFileName = trimStr(out.photoFileName) || photoMeta.fileName;
        }
        if (!trimStr(out.enrolmentCertPath) && certMeta.path && !pathsAreSameUpload(certMeta.path, out.photoPath)) {
            out.enrolmentCertPath = certMeta.path;
            out.enrolmentCertFileName = trimStr(out.enrolmentCertFileName) || certMeta.fileName;
        }
        return out;
    }

    function mapRowToPersonal(row, options) {
        options = options || {};
        if (!row) return null;

        const personal = normalizeApplicantPersonalRow(row) || row;
        const docs = Array.isArray(row.documents) ? row.documents
            : Array.isArray(row.document_list) ? row.document_list : [];
        const mapped = mapPreviewPersonalToForm(personal, docs);
        return enrichPersonalWithUploadMeta(mapped);
    }

    function mapPreviewPersonalToForm(p, docs) {
        p = p || {};
        docs = docs || [];
        let photoPath = pickField(p, ['photo_path', 'photoPath']);
        let photoFileName = pickField(p, ['photo_name', 'photo_file_name']);
        let certPath = pickField(p, ['certificate_path', 'enrolment_cert_path']);
        let certFileName = pickField(p, ['certificate_name', 'enrolment_cert_file_name']);

        (docs || []).forEach(function (d) {
            if (!d || d.is_deleted) return;
            const docType = String(d.document_type || d.documentType || '').toUpperCase();
            if (docType === 'PHOTO' && d.file_path) {
                photoPath = d.file_path;
                photoFileName = d.file_name || photoFileName;
            }
            if ((docType === 'ENROLMENT_CERTIFICATE' || docType === 'ENROLMENT' || docType === 'CERTIFICATE')
                && d.file_path) {
                certPath = d.file_path;
                certFileName = d.file_name || certFileName;
            }
        });

        const courtRaw = pickField(p, [
            'court_pratice',
            'court_practice',
            'present_court_of_practice',
            'years_of_practice_hcm'
        ]);

        const communityRaw = pickField(p, [
            'community',
            'community_code',
            'community_name',
            'community_category'
        ]);
        const communityResolved = resolveCommunityForForm(communityRaw);

        const uploadPaths = extractApplicantUploadPaths({
            photo_path: photoPath,
            photoPath: photoPath,
            photo_name: photoFileName,
            certificate_path: certPath,
            certificatePath: certPath,
            certificate_name: certFileName
        });

        return {
            advocateName: pickField(p, ['applicant_name', 'advocate_name', 'advocateName']),
            enrolmentNo: pickField(p, [
                'bar_council_enrollement_number',
                'bar_council_number',
                'enrollment_no',
                'enrolment_no'
            ]),
            seniorEnrolmentNo: pickField(p, [
                'bar_council_enrollement_number_senior',
                'senior_advocate_enrollment_no',
                'senior_enrolment_no'
            ]),
            enrolmentDate: formatDate(pickField(p, [
                'date_of_enrollment',
                'enrollment_date',
                'enrolment_date'
            ])),
            subCaste: pickField(p, ['sub_caste', 'subCaste', 'caste']),
            yearsOfPracticeHcm: normalizePresentCourtOfPractice(courtRaw),
            photoPath: uploadPaths.photoPath,
            photoFileName: uploadPaths.photoFileName || photoFileName,
            enrolmentCertPath: uploadPaths.enrolmentCertPath,
            enrolmentCertFileName: uploadPaths.enrolmentCertFileName || certFileName,
            certificate_path: uploadPaths.certificate_path,
            certificate_name: uploadPaths.certificate_name,
            fatherName: pickField(p, ['father_name', 'fatherName']),
            gender: mapGender(pickField(p, ['gender'])),
            maritalStatus: mapMarital(pickField(p, ['marital_status', 'maritalStatus'])),
            dob: formatDate(pickField(p, ['dob', 'date_of_birth'])),
            nationality: pickField(p, ['nationality']) || 'Indian',
            religion: pickField(p, ['religion']),
            community: communityResolved.selectValue,
            communityCasteKey: communityResolved.casteApiKey,
            mobile: pickField(p, ['mobile_no', 'mobile']),
            phone: pickField(p, ['phone_number', 'phone_no', 'phone']),
            email: pickField(p, ['email_id', 'email']),
            pan: pickField(p, ['pan_number', 'pan_no', 'pan']),
            officeDistrict: pickField(p, ['office_district', 'district']),
            officePincode: pickField(p, ['office_pincode', 'pincode']),
            officeAddress: pickField(p, ['office_address', 'officeAddress']),
            permanentDistrict: pickField(p, ['permanent_district']),
            permanentPincode: pickField(p, ['permanent_pincode']),
            permanentAddress: pickField(p, ['permanent_address', 'permanentAddress'])
        };
    }

    function mapToApplicationPayload(row) {
        const personal = mapRowToPersonal(row);
        if (!personal) return null;

        const expYears = pickField(row, ['expyears', 'years_of_practice']);
        const payload = { personal: personal };
        if (expYears !== '' && expYears !== null) {
            payload.specificBarYears = String(expYears);
        }
        return payload;
    }

    let tokensPromise = null;
    let authSessionPrepared = false;
    let applicantDetailsPromise = null;
    let applicantDetailsCache = null;
    let applicantDetailsCacheId = '';
    const casteDetailsCache = {};
    const casteDetailsInflight = {};

    function basenameFromPath(path) {
        const s = String(path || '').trim();
        if (!s) return '';
        const parts = s.split(/[/\\]/);
        return parts[parts.length - 1] || s;
    }

    function isRowMarkedDeleted(row) {
        if (!row || typeof row !== 'object') return true;
        const flag = row.is_deleted ?? row.isDeleted ?? row.deleted ?? false;
        return flag === true || flag === 1 || flag === '1' || flag === 't' || flag === 'true';
    }

    function mapEducationRowToEduItem(row) {
        if (isRowMarkedDeleted(row)) {
            return null;
        }
        const certPath = String(pickField(row, ['certificate_path', 'certificatePath']) || '').trim();
        let certFileName = String(pickField(row, [
            'certificate_file_name',
            'certificateFileName',
            'file_name',
            'fileName'
        ]) || '').trim();
        if (!certFileName && certPath) {
            certFileName = basenameFromPath(certPath);
        }
        const marks = pickField(row, ['marks_percentage', 'marksPercentage', 'percentage']);

        return {
            educationId: parseInt(pickField(row, ['education_id', 'educationId']), 10) || 0,
            exam: pickField(row, ['qualification_name', 'qualificationName', 'exam']),
            year: pickField(row, ['year_of_passing', 'yearOfPassing', 'year']),
            board: pickField(row, ['university_name', 'universityName', 'board']),
            institution: pickField(row, ['institution', 'institution_name', 'institutionName']),
            special: pickField(row, ['specialization', 'special', 'subject']),
            percentage: marks !== '' && marks != null ? String(marks) : '',
            certificatePath: certPath,
            certificateFileName: certFileName,
            isDeleted: false
        };
    }

    function mapAdditionalRowToItem(row) {
        if (isRowMarkedDeleted(row)) {
            return null;
        }
        const certPath = String(pickField(row, ['certificate_path', 'certificatePath']) || '').trim();
        let certFileName = String(pickField(row, [
            'certificate_file_name',
            'certificateFileName',
            'file_name',
            'fileName'
        ]) || '').trim();
        if (!certFileName && certPath) {
            certFileName = basenameFromPath(certPath);
        }
        const marks = pickField(row, ['marks_percentage', 'marksPercentage', 'percentage']);

        return {
            additionalId: parseInt(pickField(row, [
                'add_qualification_id',
                'addQualificationId',
                'additional_qualification_id',
                'additionalQualificationId',
                'additional_id'
            ]), 10) || 0,
            exam: pickField(row, ['qualification_name', 'qualificationName', 'exam']),
            year: pickField(row, ['year_of_passing', 'yearOfPassing', 'year']),
            board: pickField(row, [
                'board_university',
                'university_name',
                'universityName',
                'board'
            ]),
            institution: pickField(row, [
                'institution_name',
                'institution',
                'institutionName'
            ]),
            subject: pickField(row, [
                'subject_name',
                'specialization',
                'subject',
                'special'
            ]),
            percentage: marks !== '' && marks != null ? String(marks) : '',
            certificatePath: certPath,
            certificateFileName: certFileName,
            isDeleted: false
        };
    }

    function extractQualificationsBody(res) {
        if (!res) return null;

        let body = res;
        if (global.SecureAPI && typeof global.SecureAPI.unwrapResponse === 'function') {
            body = global.SecureAPI.unwrapResponse(res) || res;
        } else if (res.data !== undefined) {
            body = res.data;
        }

        if (body && body.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
            body = body.data;
        }

        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return null;
        }

        if (body.error && body.ok !== true) {
            return null;
        }

        return body;
    }

    function loadTab2Qualifications(applicantId) {
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.resolve({ eduItems: [], additionalItems: [] });
        }

        let resolvedId = String(applicantId || '').trim();
        if (!resolvedId) {
            resolvedId = getApplicantId();
        }
        if (!resolvedId) {
            return Promise.resolve({ eduItems: [], additionalItems: [] });
        }

        return whenAuthReady().then(function () {
            return global.LawPortal.apiRequest('vacancy/education/get', 'POST', {
                applicant_id: resolvedId,
                applicantId: resolvedId
            });
        }).then(function (res) {
            const body = extractQualificationsBody(res);
            if (!body) {
                return { eduItems: [], additionalItems: [] };
            }

            const educationRows = Array.isArray(body.education) ? body.education : [];
            const additionalRows = Array.isArray(body.additional_qualification)
                ? body.additional_qualification
                : [];

            const eduItems = educationRows
                .map(mapEducationRowToEduItem)
                .filter(function (item) {
                    return item && !item.isDeleted
                        && (item.exam || item.board || item.institution || item.certificatePath);
                });

            const additionalItems = additionalRows
                .map(mapAdditionalRowToItem)
                .filter(function (item) {
                    return item && !item.isDeleted
                        && (item.exam || item.year || item.certificatePath
                            || item.percentage || item.additionalId);
                });

            const applicationId = parseInt(body.application_id, 10);
            if (!isNaN(applicationId) && applicationId > 0) {
                global.sessionStorage.setItem('applicationId', String(applicationId));
            }

            return {
                eduItems: eduItems,
                additionalItems: additionalItems,
                applicationId: !isNaN(applicationId) && applicationId > 0 ? applicationId : 0
            };
        }).catch(function (err) {
            console.warn('Tab2 qualifications:', err && err.message ? err.message : err);
            return { eduItems: [], additionalItems: [] };
        });
    }

    function applyTab2QualificationsToState(qualifications, options) {
        const replace = !options || options.replace !== false;

        if (qualifications) {
            if (replace) {
                AF.state.eduItems = (qualifications.eduItems || []).slice();
                AF.state.additionalItems = (qualifications.additionalItems || []).slice();
            } else {
                if (qualifications.eduItems && qualifications.eduItems.length) {
                    AF.state.eduItems = qualifications.eduItems.slice();
                }
                if (qualifications.additionalItems && qualifications.additionalItems.length) {
                    AF.state.additionalItems = qualifications.additionalItems.slice();
                }
            }
        }

        if (AF.tab2 && typeof AF.tab2.ensureDefaultEduItems === 'function') {
            AF.tab2.ensureDefaultEduItems();
        }
        renderTab2Qualifications();
        tab2QualificationsHydrated = true;
    }

    function clearTab2FilePreviews() {
        const previews = AF.state.filePreviews || {};
        Object.keys(previews).forEach(function (key) {
            if (key.indexOf('edu-') === 0 || key.indexOf('add-') === 0) {
                delete previews[key];
            }
        });
    }

    function renderTab2Qualifications() {
        if (AF.tab2 && typeof AF.tab2.renderEdu === 'function') {
            AF.tab2.renderEdu();
        }
        if (AF.tab2 && typeof AF.tab2.renderAdditional === 'function') {
            AF.tab2.renderAdditional();
        }
    }

    let tab2QualificationsFetchPromise = null;
    let tab2QualificationsHydrated = false;

    /**
     * Re-fetch Tab 2 education/additional rows from the server and re-render.
     */
    function refreshTab2QualificationsFromApi() {
        if (tab2QualificationsFetchPromise) {
            return tab2QualificationsFetchPromise;
        }

        tab2QualificationsFetchPromise = loadTab2Qualifications(getApplicantId())
            .then(function (data) {
                applyTab2QualificationsToState(data, { replace: true });
                clearTab2FilePreviews();
                renderTab2Qualifications();
                return data;
            })
            .finally(function () {
                tab2QualificationsFetchPromise = null;
            });

        return tab2QualificationsFetchPromise;
    }

    /**
     * Called when the Qualifications tab becomes active (initial load uses startForm).
     */
    function onQualificationsTabActivated() {
        if (tab2QualificationsHydrated) {
            return Promise.resolve();
        }
        return refreshTab2QualificationsFromApi();
    }
    function whenAuthReady() {
        if (authSessionPrepared) {
            return Promise.resolve();
        }
        return ensureSessionTokens();
    }

    function ensureSessionTokens() {
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.resolve();
        }
        if (authSessionPrepared) {
            return Promise.resolve();
        }
        if (tokensPromise) {
            return tokensPromise;
        }

        tokensPromise = Promise.resolve().then(function () {
            if (global.SecureAPI && typeof global.SecureAPI.prepareSessionAuth === 'function') {
                return global.SecureAPI.prepareSessionAuth();
            }
            if (global.SecureAPI && typeof global.SecureAPI.ensureAccessToken === 'function') {
                return global.SecureAPI.ensureAccessToken();
            }
            if (!global.localStorage.getItem('access_token')
                && global.localStorage.getItem('refresh_token')
                && global.SecureAPI
                && typeof global.SecureAPI.refreshAccessToken === 'function') {
                return global.SecureAPI.refreshAccessToken();
            }
            return !!global.localStorage.getItem('access_token');
        }).then(function (tokenOk) {
            if (!tokenOk) {
                throw new Error('Session expired. Please log in again.');
            }
            const hasKeys = global.sessionStorage.getItem('encryption_key')
                && global.sessionStorage.getItem('csrf_token');
            if (hasKeys) {
                return;
            }
            return global.LawPortal.apiRequest('getTOKENS', 'GET').then(function (res) {
                if (res && res.encryption_key) {
                    global.sessionStorage.setItem('encryption_key', res.encryption_key);
                }
                if (res && res.csrf_token) {
                    global.sessionStorage.setItem('csrf_token', res.csrf_token);
                }
            }).catch(function () { /* optional */ });
        }).then(function () {
            authSessionPrepared = true;
        }).finally(function () {
            tokensPromise = null;
        });

        return tokensPromise;
    }

    /** Refresh token first, then encryption keys — before vacancy/details and other APIs. */
    function ensureSessionReady() {
        return ensureSessionTokens();
    }

    /**
     * Refresh access token when expired before Tab 4 preview or other mid-form API calls.
     * Does not redirect to login — caller shows local data on failure.
     * @returns {Promise<boolean>}
     */
    function ensureValidSessionForForm() {
        if (!global.SecureAPI || typeof global.SecureAPI.ensureAccessToken !== 'function') {
            return Promise.resolve(!!global.localStorage.getItem('access_token'));
        }
        return global.SecureAPI.ensureAccessToken();
    }

    function loadApplicantDetails(applicantId) {
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.reject(new Error('API client is not loaded.'));
        }
        let resolvedId = String(applicantId || '').trim();
        if (!resolvedId && global.AppData && typeof global.AppData.getSession === 'function') {
            const session = global.AppData.getSession();
            if (session) {
                resolvedId = String(session.applicantId || session.userId || '').trim();
            }
        }
        if (!resolvedId) {
            resolvedId = String(global.sessionStorage.getItem('applicantId') || '').trim();
        }

        if (applicantDetailsCache && applicantDetailsCacheId === resolvedId) {
            return Promise.resolve(applicantDetailsCache);
        }
        if (applicantDetailsPromise) {
            return applicantDetailsPromise;
        }

        applicantDetailsPromise = whenAuthReady().then(function () {
            return global.LawPortal.apiRequest('vacancy/details', 'POST', {
                applicant_id: resolvedId,
                applicantId: resolvedId
            });
        }).then(function (res) {
            if (res && res.ok === false) {
                throw new Error(res.error || res.message || 'Unable to load applicant details.');
            }
            const row = extractApplicantRow(res);
            if (!row || typeof row !== 'object' || !Object.keys(row).length) {
                applicantDetailsCache = null;
                applicantDetailsCacheId = resolvedId;
                return null;
            }
            if (!isApplicantPersonalRow(row)) {
                const hasName = !!pickField(row, ['applicant_name', 'advocate_name', 'mobile_no', 'email_id']);
                if (!hasName) {
                    applicantDetailsCache = null;
                    applicantDetailsCacheId = resolvedId;
                    return null;
                }
            }
            syncSessionFromRow(row);
            applicantDetailsCache = row;
            applicantDetailsCacheId = resolvedId;
            return row;
        }).finally(function () {
            applicantDetailsPromise = null;
        });

        return applicantDetailsPromise;
    }

    function extractSelectedCheckboxes(res) {
        if (!res) return '';
        if (typeof res.selected_checkboxes === 'string') {
            return res.selected_checkboxes.trim();
        }
        if (Array.isArray(res.data) && res.data[0] && res.data[0].selected_checkboxes != null) {
            return String(res.data[0].selected_checkboxes).trim();
        }
        if (res.data && res.data.selected_checkboxes != null) {
            return String(res.data.selected_checkboxes).trim();
        }
        return '';
    }

    function loadVacancySelections(applicantId) {
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.resolve({ submitted: false, selectedCheckboxes: '', selections: [] });
        }

        let resolvedId = String(applicantId || '').trim();
        if (!resolvedId) {
            resolvedId = getApplicantId();
        }
        if (!resolvedId) {
            return Promise.resolve({ submitted: false, selectedCheckboxes: '', selections: [] });
        }

        return whenAuthReady().then(function () {
            return global.LawPortal.apiRequest('vacancy/selections/get', 'POST', {
                applicant_id: resolvedId,
                applicantId: resolvedId
            });
        }).then(function (res) {
            if (res && res.ok === false) {
                throw new Error(res.error || res.message || 'Unable to load vacancy selections.');
            }

            const selectedCheckboxes = extractSelectedCheckboxes(res);
            const submitted = global.JobSelection && typeof global.JobSelection.isSubmittedCheckboxes === 'function'
                ? global.JobSelection.isSubmittedCheckboxes(selectedCheckboxes)
                : selectedCheckboxes.length > 0;
            const selections = global.JobSelection && typeof global.JobSelection.parseSelectedCheckboxes === 'function'
                ? global.JobSelection.parseSelectedCheckboxes(selectedCheckboxes)
                : [];

            if (submitted) {
                global.sessionStorage.setItem('applicationSubmitted', 'true');
                global.sessionStorage.setItem('selectedCheckboxes', selectedCheckboxes);
                if (selections.length) {
                    global.sessionStorage.setItem('selectedVacancies', JSON.stringify(selections));
                    global.sessionStorage.setItem(
                        'selectedJobId',
                        global.JobSelection.joinJobIds(selections)
                    );
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
        });
    }

    function syncSessionFromRow(row) {
        const name = pickField(row, ['applicant_name', 'advocate_name']);
        const enrolment = pickField(row, [
            'bar_council_enrollement_number',
            'enrollment_no',
            'bar_council_number',
            'enrolment_no'
        ]);
        const mobile = pickField(row, ['mobile_no', 'mobile']);
        const applicantId = pickField(row, ['applicant_id', 'applicantId']);

        const photoPath = pickField(row, ['photo_path', 'photoPath']);
        const certPath = pickField(row, ['certificate_path', 'enrolment_cert_path']);
        const certName = pickField(row, ['certificate_name', 'enrolment_cert_file_name']);
        const photoName = pickField(row, ['photo_name', 'photo_file_name']);

        if (name) global.sessionStorage.setItem('advocateName', name);
        if (enrolment) global.sessionStorage.setItem('enrolmentNo', enrolment);
        if (mobile) global.sessionStorage.setItem('mobile', mobile);
        if (applicantId) global.sessionStorage.setItem('applicantId', String(applicantId));
        const photoCleared = AF.files && typeof AF.files.isUploadCleared === 'function' && AF.files.isUploadCleared('photo');
        const certCleared = AF.files && typeof AF.files.isUploadCleared === 'function' && AF.files.isUploadCleared('enrolmentCert');
        if (photoPath && !photoCleared) {
            if (AF.files && typeof AF.files.setApplicantUploadMeta === 'function') {
                AF.files.setApplicantUploadMeta('photo', photoPath, photoName);
            } else {
                global.sessionStorage.setItem('photoPath', photoPath);
                if (photoName) global.sessionStorage.setItem('photoName', photoName);
                else global.sessionStorage.removeItem('photoName');
            }
        } else if (!photoCleared && !photoPath) {
            global.sessionStorage.removeItem('photoPath');
            global.sessionStorage.removeItem('photoName');
        }
        if (certPath && !certCleared && !pathsAreSameUpload(certPath, photoPath)) {
            if (AF.files && typeof AF.files.setApplicantUploadMeta === 'function') {
                AF.files.setApplicantUploadMeta('enrolmentCert', certPath, certName);
            } else {
                global.sessionStorage.setItem('enrolmentCertPath', certPath);
                if (certName) global.sessionStorage.setItem('enrolmentCertName', certName);
                else global.sessionStorage.removeItem('enrolmentCertName');
            }
        } else if (!certCleared && !certPath) {
            global.sessionStorage.removeItem('enrolmentCertPath');
            global.sessionStorage.removeItem('enrolmentCertName');
        }

        const strong = document.querySelector('.topbar-right .user-info strong');
        if (strong && name) strong.textContent = name;
    }

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

    function resolvePrimaryJob() {
        const jobId = (AF.config && AF.config.jobId)
            || global.sessionStorage.getItem('selectedJobId')
            || '';
        const first = String(jobId).split(',')[0].trim();
        if (global.JobSelection && typeof global.JobSelection.parseJobId === 'function') {
            return global.JobSelection.parseJobId(first);
        }
        return { postId: first.replace(/[AB]$/i, ''), jobId: first, courtBench: '' };
    }

    function formVal(id) {
        const el = document.getElementById(id);
        return el && el.value != null ? String(el.value).trim() : '';
    }

    function formatDateForProcedure(isoDate) {
        const s = String(isoDate || '').trim();
        if (!s) {
            return '';
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const parts = s.split('-');
            return parts[2] + '-' + parts[1] + '-' + parts[0];
        }
        return s;
    }

    function extractCasteList(res) {
        if (!res) {
            return [];
        }
        let body = res;
        if (global.SecureAPI && typeof global.SecureAPI.unwrapResponse === 'function') {
            body = global.SecureAPI.unwrapResponse(res) || res;
        } else if (res.data !== undefined) {
            body = res.data;
        }
        if (Array.isArray(body)) {
            return body.map(function (row) {
                if (typeof row === 'string') {
                    return row;
                }
                return row.caste || row.caste_name || row.sub_caste || '';
            }).filter(Boolean);
        }
        if (body && Array.isArray(body.castes)) {
            return body.castes.filter(Boolean);
        }
        if (body && Array.isArray(body.data)) {
            return extractCasteList({ data: body.data });
        }
        return [];
    }

    function loadCasteDetails(community) {
        const code = String(community || '').trim();
        if (!code) {
            return Promise.resolve([]);
        }
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.resolve([]);
        }
        if (casteDetailsCache[code]) {
            return Promise.resolve(casteDetailsCache[code].slice());
        }
        if (casteDetailsInflight[code]) {
            return casteDetailsInflight[code];
        }

        casteDetailsInflight[code] = ensureSessionTokens().then(function () {
            return global.LawPortal.apiRequest('caste/details', 'POST', { community: code });
        }).then(function (res) {
            if (res && res.ok === false) {
                throw new Error(res.error || 'Unable to load caste details.');
            }
            const castes = extractCasteList(res);
            casteDetailsCache[code] = castes;
            return castes.slice();
        }).finally(function () {
            delete casteDetailsInflight[code];
        });

        return casteDetailsInflight[code];
    }

    let populateSubCasteToken = 0;

    function populateSubCasteSelect(community, selectedValue) {
        const select = document.getElementById('subCaste');
        if (!select) {
            return Promise.resolve();
        }

        const code = String(community || '').trim();
        if (!code) {
            select.innerHTML = '<option value="">Select Caste</option>';
            return Promise.resolve();
        }

        const previous = selectedValue != null ? String(selectedValue).trim() : select.value;
        const requestToken = ++populateSubCasteToken;

        select.innerHTML = '<option value="">Select Caste</option>';
        select.disabled = true;

        const casteLookupKey = normalizeCommunityForSelect(code) !== code
            ? normalizeCommunityForSelect(code)
            : code;
        const lookupKeys = [];
        if (code) {
            lookupKeys.push(code);
        }
        if (casteLookupKey && lookupKeys.indexOf(casteLookupKey) === -1) {
            lookupKeys.push(casteLookupKey);
        }

        function loadCastesForKeys(keys, index) {
            if (index >= keys.length) {
                return Promise.resolve([]);
            }
            return loadCasteDetails(keys[index]).then(function (castes) {
                if (castes && castes.length) {
                    return castes;
                }
                return loadCastesForKeys(keys, index + 1);
            });
        }

        return loadCastesForKeys(lookupKeys, 0).then(function (castes) {
            if (requestToken !== populateSubCasteToken) {
                return;
            }
            castes.forEach(function (name) {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                select.appendChild(opt);
            });
            if (previous) {
                const hasOption = Array.prototype.some.call(select.options, function (opt) {
                    return opt.value === previous;
                });
                if (!hasOption && previous) {
                    const extra = document.createElement('option');
                    extra.value = previous;
                    extra.textContent = previous;
                    select.appendChild(extra);
                }
                select.value = previous;
            }
        }).catch(function (err) {
            console.warn('Caste details:', err && err.message ? err.message : err);
            if (previous) {
                const opt = document.createElement('option');
                opt.value = previous;
                opt.textContent = previous;
                select.appendChild(opt);
                select.value = previous;
            }
        }).finally(function () {
            select.disabled = false;
        });
    }

    function buildPersonalSavePayload(personal) {
        const applicantId = getApplicantId();
        const storedAppId = global.sessionStorage.getItem('applicationId');
        const applicationId = storedAppId ? parseInt(storedAppId, 10) : parseInt(applicantId, 10);

        return {
            applicant_id: applicantId,
            application_id: applicationId,
            applicant_name: personal.advocateName,
            father_name: personal.fatherName,
            bar_council_enrollement_number: personal.enrolmentNo,
            bar_council_enrollement_number_senior: (personal.seniorEnrolmentNo || formVal('seniorEnrolmentNo')).toUpperCase(),
            date_of_enrollment: formatDateForProcedure(personal.enrolmentDate || formVal('enrolmentDate')),
            certificate_name: global.sessionStorage.getItem('enrolmentCertName')
                || personal.enrolmentCertFileName
                || '',
            certificate_path: global.sessionStorage.getItem('enrolmentCertPath')
                || personal.enrolmentCertPath
                || '',
            sub_caste: personal.subCaste || formVal('subCaste'),
            years_of_practice_hcm: personal.yearsOfPracticeHcm !== undefined && personal.yearsOfPracticeHcm !== ''
                ? personal.yearsOfPracticeHcm
                : formVal('yearsOfPracticeHcm'),
            gender: personal.gender,
            dob: personal.dob,
            nationality: personal.nationality,
            religion: personal.religion,
            community: personal.community,
            photo_path: global.sessionStorage.getItem('photoPath')
                || personal.photoPath
                || '',
            photo_name: global.sessionStorage.getItem('photoName')
                || personal.photoFileName
                || '',
            mobile_no: personal.mobile,
            phone_number: personal.phone,
            email_id: personal.email,
            pan_number: personal.pan,
            office_district: formVal('office_district') || personal.officeDistrict || personal.district,
            office_pincode: formVal('office_pincode') || personal.officePincode || personal.pincode,
            office_address: formVal('office_address') || personal.officeAddress,
            permanent_district: formVal('permanent_district') || personal.permanentDistrict,
            permanent_pincode: formVal('permanent_pincode') || personal.permanentPincode,
            permanent_address: formVal('permanent_address') || personal.permanentAddress,
            created_by: applicantId
        };
    }

    function unwrapApiResult(res) {
        if (!res) {
            return { ok: false, error: 'Empty response from server.' };
        }
        if (res.ok === false || res.error) {
            return { ok: false, error: res.error || res.message || 'Request failed.' };
        }
        return res;
    }

    function savePersonalInfo(personal) {
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.reject(new Error('API client is not loaded.'));
        }
        return ensureSessionTokens().then(function () {
            return global.LawPortal.apiRequest(
                'vacancy/personal/save',
                'POST',
                buildPersonalSavePayload(personal)
            );
        }).then(function (res) {
            const body = unwrapApiResult(res);
            if (!body.ok) {
                throw new Error(body.error || 'Unable to save personal information.');
            }
            if (body.application_id) {
                global.sessionStorage.setItem('applicationId', String(body.application_id));
            }
            applicantDetailsCache = null;
            applicantDetailsCacheId = '';
            return body;
        });
    }

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

    function uploadDocument(applicationId, documentType, fileOrPreview) {
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.reject(new Error('API client is not loaded.'));
        }
        const appId = parseInt(applicationId, 10);
        const applicantId = getApplicantId();
        if (!appId && !applicantId) {
            return Promise.reject(new Error('Applicant ID is missing.'));
        }

        let promise;
        if (fileOrPreview instanceof File) {
            promise = fileToBase64(fileOrPreview).then(function (content) {
                return {
                    file_name: fileOrPreview.name,
                    file_content: content
                };
            });
        } else if (fileOrPreview && fileOrPreview.dataUrl) {
            promise = Promise.resolve({
                file_name: fileOrPreview.name || documentType + '.bin',
                file_content: fileOrPreview.dataUrl
            });
        } else {
            return Promise.resolve({ ok: true, skipped: true });
        }

        return promise.then(function (fileData) {
            return ensureSessionTokens().then(function () {
                return global.LawPortal.apiRequest('vacancy/document/upload', 'POST', {
                    applicant_id: applicantId,
                    application_id: appId || parseInt(applicantId, 10),
                    document_type: documentType,
                    file_name: fileData.file_name,
                    file_content: fileData.file_content,
                    uploaded_by: applicantId
                });
            });
        }).then(function (res) {
            const body = unwrapApiResult(res);
            if (!body.ok) {
                throw new Error(body.error || 'Document upload failed (' + documentType + ').');
            }
            if (documentType === 'PHOTO' && body.file_path) {
                if (AF.files && typeof AF.files.setApplicantUploadMeta === 'function') {
                    AF.files.setApplicantUploadMeta('photo', body.file_path, body.file_name);
                } else {
                    global.sessionStorage.setItem('photoPath', body.file_path);
                    if (body.file_name) {
                        global.sessionStorage.setItem('photoName', body.file_name);
                    }
                }
            }
            if (documentType === 'ENROLMENT_CERTIFICATE' && body.file_path) {
                if (AF.files && typeof AF.files.setApplicantUploadMeta === 'function') {
                    AF.files.setApplicantUploadMeta('enrolmentCert', body.file_path, body.file_name);
                } else {
                    global.sessionStorage.setItem('enrolmentCertPath', body.file_path);
                    if (body.file_name) {
                        global.sessionStorage.setItem('enrolmentCertName', body.file_name);
                    }
                }
            }
            return body;
        });
    }

    function isNewUploadSource(src) {
        if (!src) return false;
        if (typeof File !== 'undefined' && src instanceof File) return true;
        return !!(src.dataUrl);
    }

    function getTab1UploadSources() {
        const photoInput = document.getElementById('photoUpload');
        const certInput = document.getElementById('enrolmentCertUpload');
        const previews = AF.state.filePreviews || {};

        let photo = (photoInput && photoInput.files && photoInput.files[0])
            ? photoInput.files[0]
            : null;
        if (!photo && isNewUploadSource(previews.photo)) {
            photo = previews.photo;
        }

        let enrolmentCert = (certInput && certInput.files && certInput.files[0])
            ? certInput.files[0]
            : null;
        if (!enrolmentCert && isNewUploadSource(previews.enrolmentCert)) {
            enrolmentCert = previews.enrolmentCert;
        }

        return { photo: photo, enrolmentCert: enrolmentCert };
    }

    function saveTab1WithDocuments(personal) {
        const applicantId = getApplicantId();
        const applicationId = global.sessionStorage.getItem('applicationId') || applicantId;
        const sources = getTab1UploadSources();
        const uploads = [];

        if (sources.photo) {
            uploads.push(uploadDocument(applicationId, 'PHOTO', sources.photo));
        }
        if (sources.enrolmentCert) {
            uploads.push(uploadDocument(applicationId, 'ENROLMENT_CERTIFICATE', sources.enrolmentCert));
        }

        const uploadStep = uploads.length ? Promise.all(uploads) : Promise.resolve();

        return uploadStep.then(function () {
            if (AF.files && typeof AF.files.getApplicantUploadMeta === 'function') {
                const photoMeta = AF.files.getApplicantUploadMeta('photo');
                const certMeta = AF.files.getApplicantUploadMeta('enrolmentCert');
                personal.photoPath = photoMeta.path || personal.photoPath || '';
                personal.photoFileName = photoMeta.fileName || personal.photoFileName || '';
                personal.enrolmentCertPath = certMeta.path || personal.enrolmentCertPath || '';
                personal.enrolmentCertFileName = certMeta.fileName || personal.enrolmentCertFileName || '';
            } else {
                personal.photoPath = global.sessionStorage.getItem('photoPath') || personal.photoPath || '';
                personal.enrolmentCertPath = global.sessionStorage.getItem('enrolmentCertPath') || personal.enrolmentCertPath || '';
                personal.enrolmentCertFileName = global.sessionStorage.getItem('enrolmentCertName') || personal.enrolmentCertFileName || '';
            }
            return savePersonalInfo(personal);
        }).then(function (body) {
            const applicantId = getApplicantId();
            return loadApplicantDetails(applicantId).then(function (row) {
                if (row && AF.tab1 && typeof AF.tab1.applySavedApplicantUploads === 'function') {
                    AF.tab1.applySavedApplicantUploads(mapRowToPersonal(row));
                }
                return body;
            }).catch(function () {
                if (AF.tab1 && typeof AF.tab1.refreshApplicantUploadUi === 'function') {
                    AF.tab1.refreshApplicantUploadUi(enrichPersonalWithUploadMeta(personal));
                }
                return body;
            });
        });
    }

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

    function parseYearOfPassing(val) {
        if (val === undefined || val === null || val === '') {
            return null;
        }
        const s = String(val).trim();
        const iso = s.match(/^(\d{4})-\d{2}-\d{2}/);
        if (iso) {
            return parseInt(iso[1], 10);
        }
        const yearOnly = s.match(/^(\d{4})$/);
        if (yearOnly) {
            return parseInt(yearOnly[1], 10);
        }
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
            return d.getFullYear();
        }
        return null;
    }

    function parseMarksPercentage(val) {
        const n = parseFloat(String(val || '').replace(/[^\d.]/g, ''));
        if (isNaN(n)) {
            return null;
        }
        return Math.round(n * 100) / 100;
    }

    function buildTab2SaveMeta() {
        const applicantId = parseInt(getApplicantId(), 10) || 0;
        return {
            applicant_id: applicantId,
            created_by: applicantId
        };
    }

    function requireApplicantId() {
        const applicantId = parseInt(getApplicantId(), 10);
        if (!applicantId) {
            return Promise.reject(new Error('Applicant ID is missing. Please log in again.'));
        }
        return Promise.resolve(applicantId);
    }

    function mapEduItemToPayload(item) {
        const year = parseYearOfPassing(item.year);
        const marks = parseMarksPercentage(item.percentage);
        const row = {
            education_id: parseInt(item.educationId, 10) || 0,
            qualification_name: trimStr(item.exam),
            year_of_passing: year !== null ? year : 0,
            university_name: trimStr(item.board),
            institution: trimStr(item.institution),
            specialization: trimStr(item.special),
            marks_percentage: marks !== null ? marks : 0,
            certificate_path: trimStr(item.certificatePath)
        };
        if (item.isDeleted) {
            row.is_deleted = true;
        }
        return row;
    }

    /**
     * POST vacancy/document/upload — matches backend VacancyController::uploadDocument.
     * @param {number} applicationId
     * @param {string} documentType e.g. EDUCATION_CERTIFICATE
     * @param {File|object} fileOrPreview
     */
    function uploadEducationCertificate(applicationId, documentType, fileOrPreview) {
        return uploadDocument(applicationId, documentType, fileOrPreview);
    }

    function isAdditionalRowEmpty(item) {
        if (!item) return true;
        return !trimStr(item.exam)
            && !trimStr(item.year)
            && !trimStr(item.board)
            && !trimStr(item.institution)
            && !trimStr(item.subject)
            && !trimStr(item.percentage)
            && !trimStr(item.certificatePath);
    }

    function mapAdditionalItemToPayload(item) {
        const year = parseYearOfPassing(item.year);
        const marks = parseMarksPercentage(item.percentage);
        const addId = parseInt(item.additionalId, 10) || 0;

        return {
            add_qualification_id: addId,
            additional_qualification_id: addId,
            qualification_name: trimStr(item.exam),
            year_of_passing: year !== null ? year : 0,
            board_university: trimStr(item.board),
            institution_name: trimStr(item.institution),
            subject_name: trimStr(item.subject),
            marks_percentage: marks !== null ? marks : 0,
            certificate_path: trimStr(item.certificatePath)
        };
    }

    function buildEducationSavePayload(eduItems) {
        const meta = buildTab2SaveMeta();
        const active = (eduItems || []).filter(function (item) {
            return item && !item.isDeleted;
        });
        const deleted = (eduItems || []).filter(function (item) {
            return item && item.isDeleted && parseInt(item.educationId, 10) > 0;
        });
        const education = active.map(mapEduItemToPayload).concat(
            deleted.map(mapEduItemToPayload)
        );

        return {
            applicant_id: meta.applicant_id,
            created_by: meta.created_by,
            education: education
        };
    }

    function deleteEducationRecord(educationId) {
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.reject(new Error('API client is not loaded.'));
        }
        const applicantId = parseInt(getApplicantId(), 10) || 0;
        const eduId = parseInt(educationId, 10) || 0;
        if (!applicantId || !eduId) {
            return Promise.reject(new Error('Invalid education record.'));
        }

        return ensureSessionTokens().then(function () {
            return global.LawPortal.apiRequest('vacancy/education/delete', 'POST', {
                applicant_id: applicantId,
                education_id: eduId
            });
        }).then(function (res) {
            const body = unwrapApiResult(res);
            if (!body.ok) {
                throw new Error(body.error || 'Unable to delete educational qualification.');
            }
            return body;
        });
    }

    function deleteAdditionalQualificationRecord(additionalId) {
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.reject(new Error('API client is not loaded.'));
        }
        const applicantId = parseInt(getApplicantId(), 10) || 0;
        const rowId = parseInt(additionalId, 10) || 0;
        if (!applicantId || !rowId) {
            return Promise.reject(new Error('Invalid additional qualification record.'));
        }

        return ensureSessionTokens().then(function () {
            return global.LawPortal.apiRequest('vacancy/additional/delete', 'POST', {
                applicant_id: applicantId,
                add_qualification_id: rowId,
                additional_qualification_id: rowId
            });
        }).then(function (res) {
            const body = unwrapApiResult(res);
            if (!body.ok) {
                throw new Error(body.error || 'Unable to delete additional qualification.');
            }
            return body;
        });
    }

    function buildAdditionalSavePayload(additionalItems) {
        const meta = buildTab2SaveMeta();
        const rows = (additionalItems || [])
            .filter(function (item) {
                return item && !item.isDeleted && !isAdditionalRowEmpty(item);
            })
            .map(mapAdditionalItemToPayload);

        return {
            applicant_id: meta.applicant_id,
            created_by: meta.created_by,
            additional_qualification: rows
        };
    }

    function getAdditionalRowsForSave(additionalItems) {
        return buildAdditionalSavePayload(additionalItems).additional_qualification;
    }

    function collectAdditionalItemsFromDom() {
        const container = document.getElementById('additionalListContainer');
        if (!container) {
            return [];
        }

        let rows = container.querySelectorAll('.list-item');
        if (!rows.length) {
            rows = container.querySelectorAll('.add-card');
        }
        if (!rows.length && container.children.length) {
            rows = container.children;
        }

        const previous = AF.state.additionalItems || [];
        const items = [];

        rows.forEach(function (row, idx) {
            const getVal = function (sel) {
                const el = row.querySelector(sel);
                return el && el.value != null ? String(el.value).trim() : '';
            };
            const prev = previous[idx] || {};
            const previewKey = 'add-' + idx;
            const preview = AF.state.filePreviews && AF.state.filePreviews[previewKey];
            const fileInput = row.querySelector('.add-cert-file');
            let certName = row.getAttribute('data-cert-name') || prev.certificateFileName || '';
            if (fileInput && fileInput.files && fileInput.files.length) {
                certName = fileInput.files.length === 1
                    ? fileInput.files[0].name
                    : fileInput.files.length + ' file(s) selected';
                if (AF.files && typeof AF.files.storeFilesPreview === 'function') {
                    AF.files.storeFilesPreview(previewKey, fileInput.files);
                }
            } else if (!certName && preview) {
                if (Array.isArray(preview) && preview.length) {
                    certName = preview.length === 1 ? preview[0].name : preview.length + ' file(s) selected';
                } else if (preview.name) {
                    certName = preview.name;
                }
            }

            const item = {
                additionalId: prev.additionalId || parseInt(row.getAttribute('data-additional-id'), 10) || 0,
                exam: getVal('.add-exam'),
                year: getVal('.add-year'),
                board: getVal('.add-board'),
                institution: getVal('.add-inst'),
                subject: getVal('.add-subject'),
                percentage: getVal('.add-perc'),
                certificatePath: prev.certificatePath || row.getAttribute('data-cert-path') || '',
                certificateFileName: certName,
                isDeleted: false
            };

            if (!isAdditionalRowEmpty(item)) {
                items.push(item);
            }
        });

        AF.state.additionalItems = items;
        return items;
    }

    function syncTab2AdditionalFromDom() {
        if (AF.tab2 && typeof AF.tab2.syncAdditional === 'function') {
            AF.tab2.syncAdditional();
        }
        return collectAdditionalItemsFromDom();
    }

    function hasAdditionalQualificationToSave() {
        return collectAdditionalItemsFromDom().length > 0;
    }

    let tab2EducationSavePromise = null;

    function postEducationSave(payload) {
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.reject(new Error('API client is not loaded.'));
        }
        console.log('[Tab2] Education save payload:', payload);
        return ensureSessionTokens().then(function () {
            return global.LawPortal.apiRequest(
                'vacancy/education/save',
                'POST',
                payload
            );
        }).then(function (res) {
            const body = unwrapApiResult(res);
            if (!body.ok) {
                throw new Error(body.error || 'Unable to save educational qualifications.');
            }
            if (body.application_id) {
                global.sessionStorage.setItem('applicationId', String(body.application_id));
            }
            return body;
        });
    }

    function postAdditionalSave(payload) {
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.reject(new Error('API client is not loaded.'));
        }
        console.log('[Tab2] Additional qualification save payload:', payload);
        return ensureSessionTokens().then(function () {
            return global.LawPortal.apiRequest(
                'vacancy/additional/save',
                'POST',
                payload
            );
        }).then(function (res) {
            const body = unwrapApiResult(res);
            if (!body.ok) {
                throw new Error(body.error || 'Unable to save additional qualifications.');
            }
            if (body.application_id) {
                global.sessionStorage.setItem('applicationId', String(body.application_id));
            }
            return body;
        });
    }

    function saveEducation(eduItems) {
        return postEducationSave(buildEducationSavePayload(eduItems));
    }

    function saveAdditionalQualification(additionalItems) {
        syncTab2AdditionalFromDom();
        const items = additionalItems || AF.state.additionalItems || [];
        const rows = getAdditionalRowsForSave(items);
        if (!rows.length) {
            return Promise.resolve({ ok: true, skipped: true });
        }
        return postAdditionalSave(buildAdditionalSavePayload(items));
    }

    function getTab2CertificateSources(containerId, previewPrefix) {
        const previews = AF.state.filePreviews || {};
        const sources = [];
        const container = document.getElementById(containerId);
        if (!container) return sources;

        container.querySelectorAll('.list-item').forEach(function (row, idx) {
            const input = row.querySelector('.certificateUpload, .add-cert-file');
            const file = (input && input.files && input.files[0]) ? input.files[0] : null;
            const preview = previews[previewPrefix + idx] || null;
            sources.push({
                index: idx,
                file: file,
                preview: preview
            });
        });

        return sources;
    }

    function uploadCertificateSources(applicationId, items, sources, documentType) {
        let chain = Promise.resolve();

        sources.forEach(function (src) {
            const fileOrPreview = src.file || src.preview;
            const row = items[src.index];
            if (!fileOrPreview || (row && row.certificatePath)) {
                return;
            }
            chain = chain.then(function () {
                return uploadEducationCertificate(applicationId, documentType, fileOrPreview)
                    .then(function (body) {
                        if (body.file_path && items[src.index]) {
                            items[src.index].certificatePath = body.file_path;
                        }
                    });
            });
        });

        return chain;
    }

    function saveAdditionalQualificationFromDom(applicantId) {
        const addItems = collectAdditionalItemsFromDom();
        if (!addItems.length) {
            console.log('[Tab2] No additional qualification rows — skipping additional/save');
            return Promise.resolve({ ok: true, skippedAdditional: true });
        }

        console.log('[Tab2] Additional qualification rows:', addItems.length);
        const addSources = getTab2CertificateSources('additionalListContainer', 'add-');
        const uploadAppId = getApplicationId() || applicantId;

        return uploadCertificateSources(
            uploadAppId,
            addItems,
            addSources,
            'ADDITIONAL_QUALIFICATION_CERTIFICATE'
        ).then(function () {
            const freshItems = collectAdditionalItemsFromDom();
            return postAdditionalSave(buildAdditionalSavePayload(freshItems));
        });
    }

    function uploadCertificatesThenSave(applicantId) {
        const eduSources = getTab2CertificateSources('eduListContainer', 'edu-');
        const uploadAppId = getApplicationId() || applicantId;

        return uploadCertificateSources(
            uploadAppId,
            AF.state.eduItems || [],
            eduSources,
            'EDUCATION_CERTIFICATE'
        )
            .then(function () {
                if (AF.tab2 && typeof AF.tab2.syncEdu === 'function') {
                    AF.tab2.syncEdu();
                }
                return postEducationSave(buildEducationSavePayload(AF.state.eduItems));
            })
            .then(function (eduResult) {
                if (!hasAdditionalQualificationToSave()) {
                    return eduResult;
                }
                return saveAdditionalQualificationFromDom(applicantId).then(function (addResult) {
                    return { education: eduResult, additional: addResult };
                });
            });
    }

    function saveTab2WithCertificates() {
        if (tab2EducationSavePromise) {
            return tab2EducationSavePromise;
        }

        if (AF.tab2 && typeof AF.tab2.syncEdu === 'function') {
            AF.tab2.syncEdu();
        }
        syncTab2AdditionalFromDom();

        tab2EducationSavePromise = requireApplicantId()
            .then(function (applicantId) {
                return uploadCertificatesThenSave(applicantId);
            })
            .finally(function () {
                tab2EducationSavePromise = null;
            });

        return tab2EducationSavePromise;
    }

    AF.api = {
        pickField: pickField,
        mapRowToPersonal: mapRowToPersonal,
        enrichPersonalWithUploadMeta: enrichPersonalWithUploadMeta,
        mapPreviewPersonalToForm: mapPreviewPersonalToForm,
        normalizePresentCourtOfPractice: normalizePresentCourtOfPractice,
        normalizeCommunityForSelect: normalizeCommunityForSelect,
        resolveCommunityForForm: resolveCommunityForForm,
        applyCommunityToSelect: applyCommunityToSelect,
        pickPresentCourtOfPractice: pickPresentCourtOfPractice,
        mapToApplicationPayload: mapToApplicationPayload,
        loadApplicantDetails: loadApplicantDetails,
        loadVacancySelections: loadVacancySelections,
        extractSelectedCheckboxes: extractSelectedCheckboxes,
        loadTab2Qualifications: loadTab2Qualifications,
        applyTab2QualificationsToState: applyTab2QualificationsToState,
        refreshTab2QualificationsFromApi: refreshTab2QualificationsFromApi,
        onQualificationsTabActivated: onQualificationsTabActivated,
        renderTab2Qualifications: renderTab2Qualifications,
        deleteEducationRecord: deleteEducationRecord,
        deleteAdditionalQualificationRecord: deleteAdditionalQualificationRecord,
        mapEducationRowToEduItem: mapEducationRowToEduItem,
        mapAdditionalRowToItem: mapAdditionalRowToItem,
        ensureSessionTokens: ensureSessionTokens,
        ensureSessionReady: ensureSessionReady,
        ensureValidSessionForForm: ensureValidSessionForForm,
        buildPersonalSavePayload: buildPersonalSavePayload,
        loadCasteDetails: loadCasteDetails,
        populateSubCasteSelect: populateSubCasteSelect,
        savePersonalInfo: savePersonalInfo,
        uploadDocument: uploadDocument,
        saveTab1WithDocuments: saveTab1WithDocuments,
        getApplicationId: getApplicationId,
        requireApplicantId: requireApplicantId,
        buildEducationSavePayload: buildEducationSavePayload,
        buildAdditionalSavePayload: buildAdditionalSavePayload,
        postAdditionalSave: postAdditionalSave,
        saveEducation: saveEducation,
        saveAdditionalQualification: saveAdditionalQualification,
        saveAdditionalQualificationFromDom: saveAdditionalQualificationFromDom,
        uploadEducationCertificate: uploadEducationCertificate,
        saveTab2WithCertificates: saveTab2WithCertificates
    };
})(window.ApplicationForm, window);
