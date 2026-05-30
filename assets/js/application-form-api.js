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

    function extractApplicantRow(res) {
        if (!res) return null;

        let body = res;
        if (global.SecureAPI && typeof global.SecureAPI.unwrapResponse === 'function') {
            body = global.SecureAPI.unwrapResponse(res) || res;
        } else if (res.data !== undefined) {
            body = res.data;
        }

        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return null;
        }
        if (body.error) {
            return null;
        }
        if (body.applicant_id !== undefined || body.applicant_name !== undefined
            || body.enrollment_no !== undefined || body.mobile_no !== undefined) {
            return body;
        }
        if (body.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
            return body.data.error ? null : body.data;
        }
        return null;
    }

    function mapRowToPersonal(row) {
        if (!row) return null;

        return {
            advocateName: pickField(row, ['applicant_name', 'advocate_name', 'advocateName']),
            enrolmentNo: pickField(row, ['bar_council_enrollement_number', 'enrollment_no', 'bar_council_number', 'enrolment_no']),
            seniorEnrolmentNo: pickField(row, ['senior_advocate_enrollment_no', 'senior_enrolment_no']),
            enrolmentDate: formatDate(pickField(row, ['enrollment_date', 'enrolment_date'])),
            fatherName: pickField(row, ['father_name', 'fatherName']),
            gender: mapGender(pickField(row, ['gender'])),
            maritalStatus: mapMarital(pickField(row, ['marital_status', 'maritalStatus'])),
            dob: formatDate(pickField(row, ['dob', 'date_of_birth'])),
            nationality: pickField(row, ['nationality']) || 'Indian',
            religion: pickField(row, ['religion']),
            community: pickField(row, ['community']),
            mobile: pickField(row, ['mobile_no', 'mobile']),
            phone: pickField(row, ['phone_number', 'phone_no', 'phone']),
            email: pickField(row, ['email_id', 'email']),
            pan: pickField(row, ['pan_number', 'pan_no', 'pan']),
            officeDistrict: pickField(row, ['office_district', 'district']),
            officePincode: pickField(row, ['office_pincode', 'pincode']),
            officeAddress: pickField(row, ['office_address', 'officeAddress']),
            permanentDistrict: pickField(row, ['permanent_district']),
            permanentPincode: pickField(row, ['permanent_pincode']),
            permanentAddress: pickField(row, ['permanent_address', 'permanentAddress'])
        };
    }

    function mapToApplicationPayload(row) {
        const personal = mapRowToPersonal(row);
        if (!personal) return null;

        const yearsHc = pickField(row, ['years_of_practice_hcm', 'years_of_practice', 'expyears']);
        const payload = { personal: personal };
        if (yearsHc !== '' && yearsHc !== null) {
            payload.specificBarYears = String(yearsHc);
        }
        return payload;
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

        return ensureSessionTokens().then(function () {
            return global.LawPortal.apiRequest('vacancy/details', 'POST', {
                applicant_id: resolvedId,
                applicantId: resolvedId
            });
        }).then(function (res) {
            if (res && res.ok === false) {
                throw new Error(res.error || res.message || 'Unable to load applicant details.');
            }
            const row = extractApplicantRow(res);
            if (!row || !Object.keys(row).length) {
                return null;
            }
            syncSessionFromRow(row);
            return row;
        });
    }

    function syncSessionFromRow(row) {
        const name = pickField(row, ['applicant_name', 'advocate_name']);
        const enrolment = pickField(row, ['enrollment_no', 'bar_council_number']);
        const mobile = pickField(row, ['mobile_no', 'mobile']);
        const applicantId = pickField(row, ['applicant_id', 'applicantId']);

        if (name) global.sessionStorage.setItem('advocateName', name);
        if (enrolment) global.sessionStorage.setItem('enrolmentNo', enrolment);
        if (mobile) global.sessionStorage.setItem('mobile', mobile);
        if (applicantId) global.sessionStorage.setItem('applicantId', String(applicantId));

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

    function buildPersonalSavePayload(personal) {
        const applicantId = parseInt(getApplicantId(), 10) || 0;

        const payload = {
            applicant_id: applicantId,
            applicant_name: personal.advocateName,
            father_name: personal.fatherName,
            bar_council_enrollement_number: personal.enrolmentNo,
            gender: personal.gender,
            dob: personal.dob,
            nationality: personal.nationality,
            religion: personal.religion,
            community: personal.community,
            photo_path: global.sessionStorage.getItem('photoPath') || '',
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

        const storedAppId = parseInt(global.sessionStorage.getItem('applicationId'), 10);
        if (!isNaN(storedAppId) && storedAppId > 0) {
            payload.application_id = storedAppId;
        }

        return payload;
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
                global.sessionStorage.setItem('photoPath', body.file_path);
            }
            return body;
        });
    }

    function getTab1UploadSources() {
        const photoInput = document.getElementById('photoUpload');
        const certInput = document.getElementById('enrolmentCertUpload');
        const previews = AF.state.filePreviews || {};

        const photo = (photoInput && photoInput.files && photoInput.files[0])
            ? photoInput.files[0]
            : (previews.photo || null);

        const enrolmentCert = (certInput && certInput.files && certInput.files[0])
            ? certInput.files[0]
            : (previews.enrolmentCert || null);

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
            return savePersonalInfo(personal);
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
        return {
            education_id: parseInt(item.educationId, 10) || 0,
            qualification_name: trimStr(item.exam),
            year_of_passing: year !== null ? year : 0,
            university_name: trimStr(item.board),
            institution: trimStr(item.institution),
            specialization: trimStr(item.special),
            marks_percentage: marks !== null ? marks : 0,
            certificate_path: trimStr(item.certificatePath)
        };
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

    function trimStr(val) {
        return val != null ? String(val).trim() : '';
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
        return {
            additional_qualification_id: parseInt(item.additionalId, 10) || 0,
            qualification_name: trimStr(item.exam),
            year_of_passing: year !== null ? year : 0,
            university_name: trimStr(item.board),
            institution: trimStr(item.institution),
            specialization: trimStr(item.subject),
            marks_percentage: marks !== null ? marks : 0,
            certificate_path: trimStr(item.certificatePath)
        };
    }

    function buildEducationSavePayload(eduItems) {
        const meta = buildTab2SaveMeta();
        const education = (eduItems || [])
            .filter(function (item) {
                return item && !item.isDeleted;
            })
            .map(mapEduItemToPayload);

        return {
            applicant_id: meta.applicant_id,
            created_by: meta.created_by,
            education: education
        };
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
        mapToApplicationPayload: mapToApplicationPayload,
        loadApplicantDetails: loadApplicantDetails,
        ensureSessionTokens: ensureSessionTokens,
        buildPersonalSavePayload: buildPersonalSavePayload,
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
