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
            seniorEnrolmentNo: pickField(row, [
                'bar_council_enrollement_number_senior',
                'senior_advocate_enrollment_no',
                'senior_enrolment_no'
            ]),
            enrolmentDate: formatDate(pickField(row, ['date_of_enrollment', 'enrollment_date', 'enrolment_date'])),
            subCaste: pickField(row, ['sub_caste', 'subCaste', 'caste']),
            yearsOfPracticeHcm: pickField(row, ['years_of_practice_hcm', 'years_of_practice', 'expyears']),
            enrolmentCertFileName: pickField(row, ['certificate_name', 'enrolment_cert_file_name']),
            enrolmentCertPath: pickField(row, ['certificate_path', 'enrolment_cert_path']),
            photoPath: pickField(row, ['photo_path', 'photoPath']),
            photoFileName: pickField(row, ['photo_name', 'photo_file_name']),
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
        if (yearsHc !== '' && yearsHc !== null) {
            personal.yearsOfPracticeHcm = String(yearsHc);
        }
        const payload = { personal: personal };
        if (yearsHc !== '' && yearsHc !== null) {
            payload.specificBarYears = String(yearsHc);
        }
        return payload;
    }

    let tokensPromise = null;
    let applicantDetailsPromise = null;
    let applicantDetailsCache = null;
    let applicantDetailsCacheId = '';
    const casteDetailsCache = {};
    const casteDetailsInflight = {};

    function ensureSessionTokens() {
        if (!global.LawPortal || typeof global.LawPortal.apiRequest !== 'function') {
            return Promise.resolve();
        }
        if (global.sessionStorage.getItem('encryption_key')
            && global.sessionStorage.getItem('csrf_token')) {
            return Promise.resolve();
        }
        if (tokensPromise) {
            return tokensPromise;
        }
        tokensPromise = global.LawPortal.apiRequest('getTOKENS', 'GET').then(function (res) {
            if (res && res.encryption_key) {
                global.sessionStorage.setItem('encryption_key', res.encryption_key);
            }
            if (res && res.csrf_token) {
                global.sessionStorage.setItem('csrf_token', res.csrf_token);
            }
        }).catch(function () { /* optional */ }).finally(function () {
            tokensPromise = null;
        });
        return tokensPromise;
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

        applicantDetailsPromise = ensureSessionTokens().then(function () {
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
                applicantDetailsCache = null;
                applicantDetailsCacheId = resolvedId;
                return null;
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

    function syncSessionFromRow(row) {
        const name = pickField(row, ['applicant_name', 'advocate_name']);
        const enrolment = pickField(row, ['enrollment_no', 'bar_council_number']);
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
        if (photoPath) global.sessionStorage.setItem('photoPath', photoPath);
        if (photoName) global.sessionStorage.setItem('photoName', photoName);
        if (certPath) global.sessionStorage.setItem('enrolmentCertPath', certPath);
        if (certName) global.sessionStorage.setItem('enrolmentCertName', certName);

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
            select.innerHTML = '<option value="">Select Sub Caste</option>';
            return Promise.resolve();
        }

        const previous = selectedValue != null ? String(selectedValue).trim() : select.value;
        const requestToken = ++populateSubCasteToken;

        // select.innerHTML = '<option value="">Select Sub Caste</option>';
        select.disabled = true;

        return loadCasteDetails(code).then(function (castes) {
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
                global.sessionStorage.setItem('photoPath', body.file_path);
                if (body.file_name) {
                    global.sessionStorage.setItem('photoName', body.file_name);
                }
            }
            if (documentType === 'ENROLMENT_CERTIFICATE') {
                if (body.file_path) {
                    global.sessionStorage.setItem('enrolmentCertPath', body.file_path);
                }
                if (body.file_name) {
                    global.sessionStorage.setItem('enrolmentCertName', body.file_name);
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
            personal.photoPath = global.sessionStorage.getItem('photoPath') || personal.photoPath || '';
            personal.enrolmentCertPath = global.sessionStorage.getItem('enrolmentCertPath') || personal.enrolmentCertPath || '';
            personal.enrolmentCertFileName = global.sessionStorage.getItem('enrolmentCertName') || personal.enrolmentCertFileName || '';
            return savePersonalInfo(personal);
        });
    }

    AF.api = {
        pickField: pickField,
        mapRowToPersonal: mapRowToPersonal,
        mapToApplicationPayload: mapToApplicationPayload,
        loadApplicantDetails: loadApplicantDetails,
        ensureSessionTokens: ensureSessionTokens,
        buildPersonalSavePayload: buildPersonalSavePayload,
        loadCasteDetails: loadCasteDetails,
        populateSubCasteSelect: populateSubCasteSelect,
        savePersonalInfo: savePersonalInfo,
        uploadDocument: uploadDocument,
        saveTab1WithDocuments: saveTab1WithDocuments
    };
})(window.ApplicationForm, window);
