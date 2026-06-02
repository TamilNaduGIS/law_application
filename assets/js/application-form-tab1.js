/**

 * Tab 1: Personal & Professional Information

 */

(function (AF) {

    const ENROLMENT_REGEX = /^[A-Z]{2}\/[0-9]{5}\/[0-9]{4}$/;

    const ENROLMENT_SR_REGEX = /^[A-Z]{2}\/[0-9]{4}\/[0-9]{4}SR$/;

    const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

    const RELIGION_OPTIONS = [
        'Buddhist',
        'Christian',
        'Hindu',
        'Muslim',
        'Jain',
        'Others',
        'Sikh',
        'Parsi',
        'Not Stated',
        'Zoroastrian'
    ];

    const ENROL_CERT_ACCEPT = (AF.files && AF.files.CERT_UPLOAD_ACCEPT) || '.pdf,.jpg,.jpeg,.png';



    function setVal(id, value) {

        const el = document.getElementById(id);

        if (!el || value == null || value === '') return;

        el.value = value;

    }



    function parseLocalDate(value) {

        if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {

            return null;

        }

        const parts = value.split('-').map(Number);

        return new Date(parts[0], parts[1] - 1, parts[2]);

    }



    function ageFromDob(dob) {

        const birth = parseLocalDate(dob);

        if (!birth) {

            return null;

        }

        const today = new Date();

        let age = today.getFullYear() - birth.getFullYear();

        const m = today.getMonth() - birth.getMonth();

        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {

            age--;

        }

        return age;

    }



    function updateAgeFromDob() {

        const dobEl = document.getElementById('dob');

        const ageEl = document.getElementById('age');

        if (!ageEl) return;

        const dob = dobEl ? dobEl.value : '';

        const age = ageFromDob(dob);

        ageEl.value = age != null && age >= 0 ? String(age) : '';

    }



    function hasPrefillValue(value) {

        return value !== null && value !== undefined && String(value).trim() !== '';

    }



    function setFieldLocked(id, locked) {

        const el = document.getElementById(id);

        if (!el) return;

        if (locked) {

            el.disabled = true;

            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {

                el.readOnly = true;

            }

            el.classList.add('prefilled-locked');

        } else {

            el.disabled = false;

            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {

                el.readOnly = false;

            }

            el.classList.remove('prefilled-locked');

        }

    }



    /** Disable fields that were populated from profile / applicant master data. */

    function lockPrefilledTab1Fields(data) {

        if (!data) return;

        const fieldMap = [

            { id: 'advocateName', keys: ['advocateName'] },

            { id: 'enrolmentNo', keys: ['enrolmentNo'] },

            { id: 'seniorEnrolmentNo', keys: ['seniorEnrolmentNo'] },

            { id: 'enrolmentDate', keys: ['enrolmentDate'] },

            { id: 'fatherName', keys: ['fatherName'] },

            { id: 'gender', keys: ['gender'] },

            { id: 'maritalStatus', keys: ['maritalStatus'] },

            { id: 'dob', keys: ['dob'] },

            { id: 'nationality', keys: ['nationality'] },

            { id: 'religion', keys: ['religion'] },

            { id: 'community', keys: ['community'] },

            { id: 'subCaste', keys: ['subCaste', 'caste'] },

            { id: 'mobile', keys: ['mobile'] },

            { id: 'phone', keys: ['phone'] },

            { id: 'email', keys: ['email'] },

            { id: 'pan', keys: ['pan'] },

            { id: 'office_district', keys: ['officeDistrict', 'district'] },

            { id: 'office_pincode', keys: ['officePincode', 'pincode'] },

            { id: 'office_address', keys: ['officeAddress'] },

            { id: 'permanent_district', keys: ['permanentDistrict'] },

            { id: 'permanent_pincode', keys: ['permanentPincode'] },

            { id: 'permanent_address', keys: ['permanentAddress'] }

        ];

        fieldMap.forEach(function (field) {

            const filled = field.keys.some(function (key) {

                return hasPrefillValue(data[key]);

            });

            if (filled) {

                setFieldLocked(field.id, true);

            }

        });

        if (hasPrefillValue(data.photoPath) || hasPrefillValue(data.photoFileName) || hasExistingPhoto()) {

            lockPhotoUpload(true);

        }

        if (hasPrefillValue(data.enrolmentCertPath) || hasPrefillValue(data.enrolmentCertFileName) || hasExistingEnrolmentCert()) {

            lockEnrolmentCertUpload(true);

        }

    }



    function lockPhotoUpload(locked) {

        const photoInput = document.getElementById('photoUpload');

        const wrap = getPhotoWrapper();

        if (photoInput) {

            photoInput.disabled = !!locked;

        }

        if (wrap) {

            wrap.classList.toggle('prefilled-locked', !!locked);

            const label = wrap.querySelector('label[for="photoUpload"]');

            if (label) {

                label.style.pointerEvents = locked ? 'none' : '';

            }

        }

    }



    function lockEnrolmentCertUpload(locked) {

        const mount = document.getElementById('enrolmentCertUploadMount');

        const certInput = document.getElementById('enrolmentCertUpload');

        if (certInput) {

            certInput.disabled = !!locked;

        }

        if (mount) {

            mount.classList.toggle('prefilled-locked', !!locked);

            mount.querySelectorAll('label, button, .compact-upload-card, .btn-upload-file, a').forEach(function (el) {

                el.style.pointerEvents = locked ? 'none' : '';

                if (locked) {

                    el.setAttribute('tabindex', '-1');

                } else {

                    el.removeAttribute('tabindex');

                }

            });

        }

    }



    function fileNameFromPath(path) {

        if (!path) return '';

        const base = String(path).replace(/\\/g, '/').split('/').pop() || '';

        const match = base.match(/^(?:PHOTO|ENROLMENT_CERTIFICATE)_\d+_(.+)$/i);

        return match ? match[1] : base;

    }



    function resolveUploadUrl(path) {

        if (!path) return '';

        const p = String(path).replace(/\\/g, '/');

        if (/^https?:\/\//i.test(p)) return p;

        let base = '';

        if (window.LawPortal && window.LawPortal.secureApiBase) {

            base = String(window.LawPortal.secureApiBase).replace(/\/?$/, '/');

        } else if (window.LawPortal && window.LawPortal.apiBase) {

            base = String(window.LawPortal.apiBase).replace(/\/api\/?$/, '/').replace(/\/?$/, '/');

        } else {

            const marker = '/law_application';

            const pathname = window.location.pathname.replace(/\\/g, '/');

            const idx = pathname.toLowerCase().indexOf(marker);

            if (idx !== -1) {

                base = window.location.origin + pathname.substring(0, idx + marker.length) + '/backend/public/';

            } else {

                base = new URL('backend/public/', window.location.href).href.replace(/\/?$/, '/');

            }

        }

        return base + p.replace(/^\//, '');

    }



    function hasExistingPhoto() {
        if (AF.files && typeof AF.files.isUploadCleared === 'function' && AF.files.isUploadCleared('photo')) {
            return false;
        }
        if (AF.files && typeof AF.files.getApplicantUploadMeta === 'function') {
            if (AF.files.getApplicantUploadMeta('photo').path) {
                return true;
            }
        }
        if (getLocalPhotoPreview()) {
            return true;
        }
        return !!(window.sessionStorage.getItem('photoPath') || '').trim();
    }



    function hasExistingEnrolmentCert() {
        if (AF.files && typeof AF.files.getApplicantUploadMeta === 'function') {
            return !!AF.files.getApplicantUploadMeta('enrolmentCert').path;
        }
        if (AF.files && typeof AF.files.isUploadCleared === 'function' && AF.files.isUploadCleared('enrolmentCert')) {
            return false;
        }
        const preview = AF.state.filePreviews && AF.state.filePreviews.enrolmentCert;
        if (preview && (preview.name || preview.dataUrl || preview.url)) {
            return true;
        }
        return !!(window.sessionStorage.getItem('enrolmentCertPath') || '').trim();
    }

    function getLocalPhotoPreview() {
        const preview = AF.state.filePreviews && AF.state.filePreviews.photo;
        if (!preview) {
            return null;
        }
        if (AF.files && typeof AF.files.isUploadCleared === 'function' && AF.files.isUploadCleared('photo')) {
            return null;
        }
        const media = AF.files && typeof AF.files.getPreviewMediaUrl === 'function'
            ? AF.files.getPreviewMediaUrl(preview)
            : (preview.url || preview.dataUrl || '');
        if (!media) {
            return null;
        }
        return { preview: preview, media: media, name: preview.name || 'Photo' };
    }

    function getLocalCertPreview() {
        const preview = AF.state.filePreviews && AF.state.filePreviews.enrolmentCert;
        if (!preview) {
            return null;
        }
        if (AF.files && typeof AF.files.isUploadCleared === 'function' && AF.files.isUploadCleared('enrolmentCert')) {
            return null;
        }
        const media = AF.files && typeof AF.files.getPreviewMediaUrl === 'function'
            ? AF.files.getPreviewMediaUrl(preview)
            : (preview.url || preview.dataUrl || '');
        if (!media && !preview.name) {
            return null;
        }
        return { preview: preview, media: media || '', name: preview.name || 'Document' };
    }



    function getPhotoWrapper() {

        const photoInput = document.getElementById('photoUpload');

        return photoInput ? photoInput.closest('.compact-upload-wrapper') : null;

    }



    function getEnrolmentCertWrapper() {

        const certInput = document.getElementById('enrolmentCertUpload');

        return certInput ? certInput.closest('.compact-upload-wrapper') : null;

    }



    function applyCompactUploadChosen(wrap, fileName, options) {

        if (!wrap || !fileName) return;

        const input = wrap.querySelector('input[type="file"]');

        if (input && AF.files && typeof AF.files.showFileUploadSelected === 'function') {

            AF.files.showFileUploadSelected(input, fileName, options || {});

            return;

        }

        wrap.classList.add('has-file');

    }



    function hasPhotoFile() {

        if (AF.files && typeof AF.files.isUploadCleared === 'function' && AF.files.isUploadCleared('photo')) {

            return false;

        }

        const photoInput = document.getElementById('photoUpload');

        if (photoInput && photoInput.files && photoInput.files[0]) return true;

        const preview = AF.state.filePreviews.photo;

        return !!(preview && preview.name) || hasExistingPhoto();

    }



    function hasEnrolmentCertFile() {

        const certInput = document.getElementById('enrolmentCertUpload');

        if (certInput && certInput.files && certInput.files[0]) return true;

        const preview = AF.state.filePreviews.enrolmentCert;

        return !!(preview && preview.name) || hasExistingEnrolmentCert();

    }



    function getPhotoFileName() {

        if (AF.files && typeof AF.files.isUploadCleared === 'function' && AF.files.isUploadCleared('photo')) {

            return '';

        }

        const photoInput = document.getElementById('photoUpload');

        if (photoInput && photoInput.files && photoInput.files[0]) return photoInput.files[0].name;

        const preview = AF.state.filePreviews.photo;

        if (preview && preview.name) return preview.name;

        const storedName = window.sessionStorage.getItem('photoName') || '';

        if (storedName) return storedName;

        return fileNameFromPath(window.sessionStorage.getItem('photoPath') || '');

    }



    function getEnrolmentCertFileName() {

        const certInput = document.getElementById('enrolmentCertUpload');

        if (certInput && certInput.files && certInput.files[0]) return certInput.files[0].name;

        const preview = AF.state.filePreviews.enrolmentCert;

        if (preview && preview.name) return preview.name;

        const storedName = window.sessionStorage.getItem('enrolmentCertName') || '';

        if (storedName) return storedName;

        return fileNameFromPath(window.sessionStorage.getItem('enrolmentCertPath') || '');

    }



    function getPersonalFromForm() {

        const seniorEl = document.getElementById('seniorEnrolmentNo');

        const seniorRaw = seniorEl ? seniorEl.value.trim() : '';

        return {

            advocateName: document.getElementById('advocateName').value.trim(),

            enrolmentNo: document.getElementById('enrolmentNo').value.trim(),

            seniorEnrolmentNo: seniorRaw ? seniorRaw.toUpperCase() : '',

            enrolmentDate: document.getElementById('enrolmentDate') ? document.getElementById('enrolmentDate').value : '',

            fatherName: document.getElementById('fatherName').value.trim(),

            gender: document.getElementById('gender').value,

            maritalStatus: document.getElementById('maritalStatus').value,

            dob: document.getElementById('dob').value,

            nationality: document.getElementById('nationality').value.trim(),

            religion: document.getElementById('religion').value.trim(),

            community: document.getElementById('community').value,

            subCaste: document.getElementById('subCaste') ? document.getElementById('subCaste').value.trim() : '',

            yearsOfPracticeHcm: document.getElementById('yearsOfPracticeHcm')
                ? document.getElementById('yearsOfPracticeHcm').value.trim()
                : '',

            mobile: document.getElementById('mobile').value.trim(),

            phone: document.getElementById('phone').value.trim(),

            email: document.getElementById('email').value.trim(),

            pan: document.getElementById('pan').value.trim(),

            district: document.getElementById('district') ? document.getElementById('district').value.trim() : '',

            pincode: document.getElementById('pincode') ? document.getElementById('pincode').value.trim() : '',

            officeAddress: document.getElementById('officeAddress') ? document.getElementById('officeAddress').value.trim() : '',

            officeDistrict: document.getElementById('office_district') ? document.getElementById('office_district').value.trim() : '',

            officePincode: document.getElementById('office_pincode') ? document.getElementById('office_pincode').value.trim() : '',

            permanentDistrict: document.getElementById('permanent_district') ? document.getElementById('permanent_district').value.trim() : '',

            permanentPincode: document.getElementById('permanent_pincode') ? document.getElementById('permanent_pincode').value.trim() : '',

            permanentAddress: document.getElementById('permanent_address') ? document.getElementById('permanent_address').value.trim() : '',

            photoFileName: getPhotoFileName(),

            photoPath: (AF.files && typeof AF.files.getApplicantUploadMeta === 'function'
                ? AF.files.getApplicantUploadMeta('photo').path
                : window.sessionStorage.getItem('photoPath')) || '',

            enrolmentCertFileName: getEnrolmentCertFileName(),

            enrolmentCertPath: (AF.files && typeof AF.files.getApplicantUploadMeta === 'function'
                ? AF.files.getApplicantUploadMeta('enrolmentCert').path
                : window.sessionStorage.getItem('enrolmentCertPath')) || ''

        };

    }



    function fillPersonal(data, options) {

        if (!data) return Promise.resolve();

        options = options || {};

        if (AF.api && typeof AF.api.enrichPersonalWithUploadMeta === 'function') {
            data = AF.api.enrichPersonalWithUploadMeta(data);
        }

        setVal('advocateName', data.advocateName);

        setVal('enrolmentNo', data.enrolmentNo);

        setVal('seniorEnrolmentNo', data.seniorEnrolmentNo);

        setVal('enrolmentDate', data.enrolmentDate);

        setVal('fatherName', data.fatherName);

        const genderEl = document.getElementById('gender');
        if (genderEl && data.gender) {
            genderEl.value = data.gender;
        }

        const maritalEl = document.getElementById('maritalStatus');
        if (maritalEl && data.maritalStatus) {
            maritalEl.value = data.maritalStatus;
        }

        setVal('dob', data.dob);

        updateAgeFromDob();

        setVal('nationality', data.nationality);

        setVal('religion', data.religion);

        const subCasteValue = data.subCaste || data.caste || '';
        const communityEl = document.getElementById('community');
        let subCasteReady = Promise.resolve();
        const communityRaw = data.communityCasteKey || data.community || '';
        if (communityEl && communityRaw) {
            let communityResolved = null;
            if (AF.api && typeof AF.api.applyCommunityToSelect === 'function') {
                communityResolved = AF.api.applyCommunityToSelect(communityEl, communityRaw);
                if (communityResolved && communityResolved.selectValue) {
                    data.community = communityResolved.selectValue;
                }
            } else {
                communityEl.value = data.community || communityRaw;
            }
            const casteLookupKey = (communityResolved && communityResolved.casteApiKey)
                || data.communityCasteKey
                || data.community
                || communityRaw;
            if (AF.api && typeof AF.api.populateSubCasteSelect === 'function') {
                const subCastePromise = AF.api.populateSubCasteSelect(casteLookupKey, subCasteValue);
                if (subCastePromise && typeof subCastePromise.then === 'function') {
                    subCasteReady = subCastePromise.then(function () {
                        const subEl = document.getElementById('subCaste');
                        if (subEl && hasPrefillValue(subCasteValue)) {
                            subEl.value = subCasteValue;
                            setFieldLocked('subCaste', true);
                        }
                        if (communityEl && hasPrefillValue(data.community)) {
                            setFieldLocked('community', true);
                        }
                    });
                }
            }
        } else if (subCasteValue) {
            const subEl = document.getElementById('subCaste');
            if (subEl) {
                subEl.value = subCasteValue;
            }
        }

        const courtVal = (AF.api && typeof AF.api.normalizePresentCourtOfPractice === 'function')
            ? AF.api.normalizePresentCourtOfPractice(data.yearsOfPracticeHcm)
            : (data.yearsOfPracticeHcm || '');
        const courtEl = document.getElementById('yearsOfPracticeHcm');
        if (courtEl) {
            courtEl.value = courtVal;
            courtEl.readOnly = false;
            courtEl.disabled = false;
        }

        setFieldLocked('yearsOfPracticeHcm', false);

        setVal('mobile', data.mobile);

        setVal('phone', data.phone);

        setVal('email', data.email);

        setVal('pan', data.pan);

        setVal('office_district', data.officeDistrict || data.district);

        setVal('office_pincode', data.officePincode || data.pincode);

        setVal('office_address', data.officeAddress);

        setVal('permanent_district', data.permanentDistrict);

        setVal('permanent_pincode', data.permanentPincode);

        setVal('permanent_address', data.permanentAddress);

        setVal('district', data.district);

        setVal('pincode', data.pincode);

        setVal('officeAddress', data.officeAddress);

        setVal('permanentAddress', data.permanentAddress);

        return subCasteReady.then(function () {
            if (!options || options.skipUploadApply !== true) {
                applyApplicantUploadFieldsFromPersonal(data);
            }
            lockPrefilledTab1Fields(data);
        });

    }



    function removePhotoViewButton() {

        const wrap = getPhotoWrapper();

        if (wrap && wrap.parentElement) {

            wrap.parentElement.querySelectorAll('.tab1-photo-view-host, .doc-view-wrap').forEach(function (el) {

                el.remove();

            });

        }

    }



    function resetPhotoUploadDisplay() {

        delete AF.state.filePreviews.photo;

        removePhotoViewButton();

        const photoInput = document.getElementById('photoUpload');

        const wrap = getPhotoWrapper();

        const iconWrapper = wrap && wrap.querySelector('.upload-icon-wrapper');

        if (iconWrapper) {

            iconWrapper.innerHTML = '<i class="bi bi-person-fill upload-main-icon"></i>';

        }

        if (photoInput && AF.files && typeof AF.files.clearFileUpload === 'function') {

            AF.files.clearFileUpload(photoInput, { skipClearMark: true });

        }

    }



    function clearPhotoUploadUi() {

        if (AF.files && typeof AF.files.clearApplicantUploadMeta === 'function') {

            AF.files.clearApplicantUploadMeta('photo');

        } else if (AF.files && typeof AF.files.markUploadCleared === 'function') {

            AF.files.markUploadCleared('photo');

        } else {

            delete AF.state.filePreviews.photo;

        }

        resetPhotoUploadDisplay();

    }



    function clearEnrolmentCertUploadUi() {

        if (AF.files && typeof AF.files.clearApplicantUploadMeta === 'function') {

            AF.files.clearApplicantUploadMeta('enrolmentCert');

        } else if (AF.files && typeof AF.files.markUploadCleared === 'function') {

            AF.files.markUploadCleared('enrolmentCert');

        } else {

            delete AF.state.filePreviews.enrolmentCert;

        }

        mountEnrolmentCertUpload('', '');

    }



    function applyApplicantUploadFieldsFromPersonal(data) {

        data = AF.files && typeof AF.files.stripClearedUploadsFromPersonal === 'function'
            ? AF.files.stripClearedUploadsFromPersonal(data || {})
            : (data || {});

        const photoPath = String(data.photoPath || data.photo_path || '').trim();

        const photoFileName = String(data.photoFileName || data.photo_name || data.photo_file_name || '').trim();

        let certPath = String(
            data.enrolmentCertPath
            || data.certificate_path
            || data.certificatePath
            || ''
        ).trim();

        let certFileName = String(
            data.enrolmentCertFileName
            || data.certificate_name
            || data.certificateName
            || ''
        ).trim();

        if (photoPath && certPath && photoPath.replace(/\\/g, '/') === certPath.replace(/\\/g, '/')) {
            certPath = '';
            certFileName = '';
        }

        const photoCleared = AF.files && typeof AF.files.isUploadCleared === 'function'
            && AF.files.isUploadCleared('photo');

        const certCleared = AF.files && typeof AF.files.isUploadCleared === 'function'
            && AF.files.isUploadCleared('enrolmentCert');

        if (photoCleared) {

            clearPhotoUploadUi();

        } else if (photoPath) {

            showExistingPhoto(photoPath, photoFileName);

        } else {

            const localPhoto = getLocalPhotoPreview();

            if (localPhoto) {

                const photoInput = document.getElementById('photoUpload');

                if (photoInput && AF.files && typeof AF.files.showFileUploadSelected === 'function') {

                    AF.files.showFileUploadSelected(photoInput, localPhoto.name, {

                        replaceReady: true,

                        isPhoto: true,

                        thumbnailHtml: '<img src="' + AF.utils.escapeHtml(localPhoto.media) + '" class="preview-upload-thumb preview-upload-thumb-photo" alt="Photo">'

                    });

                }

            } else if (!hasPhotoFile()) {

                resetPhotoUploadDisplay();

            }

        }

        if (certCleared) {

            clearEnrolmentCertUploadUi();

        } else if (certPath) {

            if (AF.files && typeof AF.files.setApplicantUploadMeta === 'function') {

                AF.files.setApplicantUploadMeta('enrolmentCert', certPath, certFileName);

            }

            showExistingEnrolmentCert(certPath, certFileName);

        } else {

            const localCert = getLocalCertPreview();

            if (localCert) {

                const certInput = document.getElementById('enrolmentCertUpload');

                const certWrap = getEnrolmentCertWrapper();

                if (certInput && certWrap) {

                    applyCompactUploadChosen(certWrap, localCert.name, { replaceReady: true });

                } else {

                    mountEnrolmentCertUpload(localCert.name);

                }

            } else if (!hasEnrolmentCertFile()) {

                mountEnrolmentCertUpload('', '');

            }

        }

    }

    /** Keep API personal data but do not drop files the user picked locally (not saved yet). */
    function mergePersonalPreservingLocalUploads(apiPersonal) {
        const out = Object.assign({}, apiPersonal || {});
        const apiPhotoPath = String(out.photoPath || out.photo_path || '').trim();
        const apiCertPath = String(out.enrolmentCertPath || out.certificate_path || out.certificatePath || '').trim();
        if (hasPhotoFile() && !apiPhotoPath) {
            out.photoPath = (AF.files && AF.files.getApplicantUploadMeta
                ? AF.files.getApplicantUploadMeta('photo').path
                : '') || out.photoPath || '';
            out.photoFileName = getPhotoFileName() || out.photoFileName || '';
        } else if (apiPhotoPath) {
            out.photoPath = apiPhotoPath;
        }
        if (hasEnrolmentCertFile() && !apiCertPath) {
            const metaPath = AF.files && AF.files.getApplicantUploadMeta
                ? AF.files.getApplicantUploadMeta('enrolmentCert').path
                : '';
            if (metaPath && metaPath.replace(/\\/g, '/') !== String(out.photoPath || '').replace(/\\/g, '/')) {
                out.enrolmentCertPath = metaPath;
            }
            out.enrolmentCertFileName = getEnrolmentCertFileName() || out.enrolmentCertFileName || '';
        } else if (apiCertPath) {
            out.enrolmentCertPath = apiCertPath;
            out.enrolmentCertFileName = out.enrolmentCertFileName || out.certificate_name || '';
        }
        if (AF.api && typeof AF.api.enrichPersonalWithUploadMeta === 'function') {
            return AF.api.enrichPersonalWithUploadMeta(out);
        }
        return out;
    }



    function showExistingPhoto(photoPath, fileName) {

        const path = String(photoPath || '').trim();

        if (!path) return;

        if (AF.files && typeof AF.files.isUploadCleared === 'function' && AF.files.isUploadCleared('photo')) {

            return;

        }

        if (AF.files && typeof AF.files.setApplicantUploadMeta === 'function') {

            AF.files.setApplicantUploadMeta('photo', path, fileName);

        } else {

            window.sessionStorage.setItem('photoPath', path);

        }

        const photoInput = document.getElementById('photoUpload');

        if (!photoInput) return;

        const name = fileName || window.sessionStorage.getItem('photoName') || fileNameFromPath(path);

        const url = resolveUploadUrl(path);

        AF.state.filePreviews.photo = {

            name: name,

            url: url,

            isImage: true,

            isExisting: true

        };

        if (AF.files && typeof AF.files.showFileUploadSelected === 'function') {

            AF.files.showFileUploadSelected(photoInput, name, {

                replaceReady: true,

                isPhoto: true,

                thumbnailHtml: '<img src="' + AF.utils.escapeHtml(url) + '" class="preview-upload-thumb preview-upload-thumb-photo" alt="Photo">'

            });

        }

        if (AF.files && typeof AF.files.mountAllDocPreviewButtons === 'function') {

            AF.files.mountAllDocPreviewButtons(document.querySelector('.app-container'));

        }

    }



    function setPhotoFileLabel(fileName) {

        const photoInput = document.getElementById('photoUpload');

        if (photoInput && AF.files && typeof AF.files.showFileUploadSelected === 'function') {

            AF.files.showFileUploadSelected(photoInput, fileName, { replaceReady: true, isPhoto: true });

        }

    }



    function buildCertThumbnailHtml(certPath, fileName) {
        const path = String(certPath || '').trim();
        const name = String(fileName || '').trim();
        if (!path) {
            return '';
        }
        if (/\.pdf$/i.test(name || path)) {
            return '<i class="bi bi-file-earmark-pdf-fill"></i>';
        }
        if (/\.(jpe?g|png|gif|webp)$/i.test(name || path)) {
            const url = resolveUploadUrl(path);
            return '<img src="' + AF.utils.escapeHtml(url) + '" class="preview-upload-thumb preview-upload-thumb-cert" alt="Certificate">';
        }
        return '<i class="bi bi-file-earmark-check-fill"></i>';
    }

    function showExistingEnrolmentCert(certPath, fileName) {
        const path = String(certPath || '').trim();
        if (!path) {
            mountEnrolmentCertUpload('', '');
            return;
        }
        const photoPath = (AF.files && typeof AF.files.getApplicantUploadMeta === 'function'
            ? AF.files.getApplicantUploadMeta('photo').path
            : window.sessionStorage.getItem('photoPath')) || '';
        if (photoPath && path.replace(/\\/g, '/') === String(photoPath).replace(/\\/g, '/')) {
            mountEnrolmentCertUpload('', '');
            return;
        }
        const name = fileName || fileNameFromPath(path);
        if (AF.files && typeof AF.files.setApplicantUploadMeta === 'function') {
            AF.files.setApplicantUploadMeta('enrolmentCert', path, name);
        }
        mountEnrolmentCertUpload(name, path);
        const certInput = document.getElementById('enrolmentCertUpload');
        const certWrap = getEnrolmentCertWrapper();
        const thumbHtml = buildCertThumbnailHtml(path, name);
        if (certInput && certWrap && thumbHtml.indexOf('<img') === 0 && AF.files && typeof AF.files.showFileUploadSelected === 'function') {
            AF.files.showFileUploadSelected(certInput, name, {
                replaceReady: true,
                thumbnailHtml: thumbHtml
            });
        }
        if (AF.files && typeof AF.files.mountAllDocPreviewButtons === 'function') {
            AF.files.mountAllDocPreviewButtons(document.querySelector('.app-container'));
        }
    }

    function mountEnrolmentCertUpload(fileNameFromPersonal, certPathFromServer) {

        const mount = document.getElementById('enrolmentCertUploadMount');

        if (!mount || !AF.files || typeof AF.files.buildCompactUploadHtml !== 'function') return;

        if (AF.files && typeof AF.files.isUploadCleared === 'function' && AF.files.isUploadCleared('enrolmentCert')) {

            fileNameFromPersonal = '';

            certPathFromServer = '';

        }

        const useServerSource = arguments.length >= 2;

        const preview = AF.state.filePreviews.enrolmentCert;

        let existingPath = '';

        let savedName = '';

        let isExisting = false;

        if (useServerSource) {

            existingPath = String(certPathFromServer || '').trim();

            if (existingPath) {

                savedName = String(fileNameFromPersonal || '').trim() || fileNameFromPath(existingPath);

                isExisting = true;

            } else {

                delete AF.state.filePreviews.enrolmentCert;

            }

        } else if (preview && preview.name && !preview.isExisting) {

            savedName = preview.name;

        }

        const certHint = typeof AF.files.getUploadHint === 'function'
            ? AF.files.getUploadHint('certificate')
            : 'Allowed formats: JPG, JPEG, PNG or PDF only. Maximum file size: 5 MB.';

        const defaultSubtitle = 'JPG, JPEG, PNG, PDF — max 5 MB';

        mount.innerHTML = AF.files.buildCompactUploadHtml({
            inputId: 'enrolmentCertUpload',
            title: 'Upload Certificate',
            subtitle: savedName || defaultSubtitle,
            hint: certHint,
            accept: ENROL_CERT_ACCEPT,
            kind: 'certificate',
            iconClass: 'bi bi-file-earmark-text-fill'
        });

        if (savedName) {
            const certWrap = getEnrolmentCertWrapper();
            const thumbHtml = isExisting && existingPath
                ? buildCertThumbnailHtml(existingPath, savedName)
                : '';
            applyCompactUploadChosen(certWrap, savedName, {
                replaceReady: isExisting,
                thumbnailHtml: thumbHtml.indexOf('<img') === 0 ? thumbHtml : undefined
            });
        }

        if (isExisting && existingPath) {

            const certUrl = resolveUploadUrl(existingPath);

            AF.state.filePreviews.enrolmentCert = {

                name: savedName,

                url: certUrl,

                isExisting: true,

                isPdf: /\.pdf$/i.test(savedName || existingPath),

                isImage: /\.(jpe?g|png|gif|webp)$/i.test(savedName || existingPath)

            };

        }

        initEnrolmentCertUpload();

    }



    function initEnrolmentCertUpload() {

        const certInput = document.getElementById('enrolmentCertUpload');

        if (!certInput || certInput.getAttribute('data-tab1-cert-bound') === '1') return;

        certInput.setAttribute('data-tab1-cert-bound', '1');

        if (AF.files && typeof AF.files.ensureUploadHostForInput === 'function') {
            AF.files.ensureUploadHostForInput(certInput);
        }

        certInput.addEventListener('change', function () {

            const file = this.files[0];

            if (!file) return;

            if (AF.files && typeof AF.files.validateFileInputUi === 'function') {

                if (!AF.files.validateFileInputUi(this)) {

                    return;

                }

            }

            AF.files.storeFilePreview('enrolmentCert', file);

        });

        certInput.addEventListener('file-upload-cleared', function () {

            if (AF.files && typeof AF.files.clearApplicantUploadMeta === 'function') {

                AF.files.clearApplicantUploadMeta('enrolmentCert');

            } else if (AF.files && typeof AF.files.markUploadCleared === 'function') {

                AF.files.markUploadCleared('enrolmentCert');

            } else {

                delete AF.state.filePreviews.enrolmentCert;

            }

            mountEnrolmentCertUpload('', '');

        });

    }



    function validateSeniorEnrolment(senior) {

        if (!senior) return true;

        const normalized = String(senior).trim().toUpperCase();

        if (!ENROLMENT_SR_REGEX.test(normalized)) {

            alert('Invalid Senior Advocate Enrolment format. Use MS/1234/0123SR');

            return false;

        }

        return true;

    }

    function validateEnrolment(enrolmentNo) {

        const normalized = String(enrolmentNo || '').trim().toUpperCase();

        if (!normalized) {

            alert('Please fill mandatory fields: Name, Enrolment No, Mobile, Email');

            return false;

        }

        if (!ENROLMENT_REGEX.test(normalized)) {

            alert('Invalid Enrolment format. Use MS/12345/2015');

            const enrolmentEl = document.getElementById('enrolmentNo');

            if (enrolmentEl) {

                enrolmentEl.focus();

            }

            return false;

        }

        return true;

    }



    function normalizePincodeInput(value) {

        return String(value || '').replace(/\D/g, '').slice(0, 6);

    }



    function markPincodeField(id, invalid) {

        const el = document.getElementById(id);

        if (!el) return;

        el.classList.toggle('is-invalid', !!invalid);

    }



    function clearPincodeFieldErrors() {

        ['office_pincode', 'permanent_pincode', 'pincode'].forEach(function (id) {

            markPincodeField(id, false);

        });

    }



    /** @returns {string|null} error message */

    function validatePincodeField(pincode, label, required) {

        const pin = normalizePincodeInput(pincode);

        if (!pin) {

            return required ? (label + ' is required.') : null;

        }

        if (!PINCODE_REGEX.test(pin)) {

            return 'Enter a valid 6-digit ' + label + ' (first digit cannot be 0).';

        }

        return null;

    }



    function validatePincodes(p) {

        clearPincodeFieldErrors();

        const officeNeedsPin = !!(

            String(p.officeAddress || '').trim()

            || String(p.officeDistrict || '').trim()

        );

        const permanentNeedsPin = !!(

            String(p.permanentAddress || '').trim()

            || String(p.permanentDistrict || '').trim()

        );

        const checks = [

            {

                value: p.officePincode,

                label: 'office pincode',

                id: 'office_pincode',

                required: officeNeedsPin

            },

            {

                value: p.permanentPincode,

                label: 'permanent pincode',

                id: 'permanent_pincode',

                required: permanentNeedsPin

            }

        ];

        if (document.getElementById('pincode')) {

            checks.push({

                value: p.pincode,

                label: 'pincode',

                id: 'pincode',

                required: false

            });

        }

        for (let i = 0; i < checks.length; i++) {

            const item = checks[i];

            const err = validatePincodeField(item.value, item.label, item.required);

            if (err) {

                markPincodeField(item.id, true);

                const el = document.getElementById(item.id);

                if (el) {

                    el.focus();

                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

                }

                return err;

            }

        }

        return null;

    }



    function initPincodeFields() {

        ['office_pincode', 'permanent_pincode', 'pincode'].forEach(function (id) {

            const el = document.getElementById(id);

            if (!el) return;

            el.setAttribute('maxlength', '6');

            el.setAttribute('inputmode', 'numeric');

            el.setAttribute('pattern', '[1-9][0-9]{5}');

            el.setAttribute('title', 'Enter a valid 6-digit Indian pincode');

            el.addEventListener('input', function () {

                this.value = normalizePincodeInput(this.value);

                markPincodeField(id, false);

            });

            el.addEventListener('blur', function () {

                const pin = normalizePincodeInput(this.value);

                if (!pin) {

                    markPincodeField(id, false);

                    return;

                }

                markPincodeField(id, !PINCODE_REGEX.test(pin));

            });

        });

    }



    function validateStep1() {

        const p = getPersonalFromForm();

        if (!p.advocateName || !p.enrolmentNo || !p.mobile || !p.email) {

            alert('Please fill mandatory fields: Name, Enrolment No, Mobile, Email');

            return false;

        }

        if (!validateEnrolment(p.enrolmentNo)) return false;

        if (!p.religion) {

            alert('Please select Religion.');

            document.getElementById('religion') && document.getElementById('religion').focus();

            return false;

        }

        if (RELIGION_OPTIONS.indexOf(p.religion) === -1) {

            alert('Please select a valid Religion.');

            return false;

        }

        if (!p.community) {

            alert('Please select Community.');

            document.getElementById('community') && document.getElementById('community').focus();

            return false;

        }

        if (!p.subCaste) {

            alert('Please select Caste.');

            document.getElementById('subCaste') && document.getElementById('subCaste').focus();

            return false;

        }

        const pincodeError = validatePincodes(p);

        if (pincodeError) {

            alert(pincodeError);

            return false;

        }

        if (!validateSeniorEnrolment(p.seniorEnrolmentNo)) return false;

        const validateFile = AF.files && typeof AF.files.validateUploadFile === 'function'
            ? AF.files.validateUploadFile
            : null;
        const showFileError = AF.files && typeof AF.files.showUploadValidationError === 'function'
            ? AF.files.showUploadValidationError
            : function (msg) { alert(msg); };

        if (validateFile) {
            const photoInput = document.getElementById('photoUpload');
            if (photoInput && photoInput.files && photoInput.files[0]) {
                const photoCheck = validateFile(photoInput.files[0], 'photo');
                if (!photoCheck.ok) {
                    showFileError(photoCheck.message);
                    return false;
                }
            }
            const certInput = document.getElementById('enrolmentCertUpload');
            if (certInput && certInput.files && certInput.files[0]) {
                const certCheck = validateFile(certInput.files[0], 'certificate');
                if (!certCheck.ok) {
                    showFileError(certCheck.message);
                    return false;
                }
            }
        }

        if (!hasPhotoFile()) {

            alert('Please upload your photograph (JPG or PNG).');

            const wrap = getPhotoWrapper();

            if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });

            return false;

        }

        if (!hasEnrolmentCertFile()) {

            alert('Please upload a self-attested copy of your Bar Council Enrolment Certificate (PDF or image).');

            const mount = document.getElementById('enrolmentCertUploadMount');

            if (mount) mount.scrollIntoView({ behavior: 'smooth', block: 'center' });

            return false;

        }

        return true;

    }



    function prefillTab1FromSession() {

        const profile = AppData.getPersonalProfile() || {};

        const draftPersonal = (AF.config.existingApp && AF.config.existingApp.personal) || {};

        const merged = Object.assign({}, profile, draftPersonal);
        merged.yearsOfPracticeHcm = draftPersonal.yearsOfPracticeHcm != null && draftPersonal.yearsOfPracticeHcm !== ''
            ? draftPersonal.yearsOfPracticeHcm
            : '';

        fillPersonal(merged);

    }



    function waitForTab1Paint() {
        if (AF.utils && typeof AF.utils.waitForPrefillPaint === 'function') {
            return AF.utils.waitForPrefillPaint();
        }
        return new Promise(function (resolve) {
            requestAnimationFrame(function () {
                requestAnimationFrame(resolve);
            });
        });
    }

    /**
     * Populate Tab 1 from API applicant row (initial load and after async bootstrap).
     * @param {object} row Raw applicant row from vacancy/details
     * @returns {Promise<void>}
     */
    function hydrateFromApplicantRow(row) {
        if (!row || !AF.api || typeof AF.api.mapRowToPersonal !== 'function') {
            prefillTab1FromSession();
            return waitForTab1Paint();
        }

        const personal = AF.api.mapRowToPersonal(row);
        if (!personal) {
            prefillTab1FromSession();
            return waitForTab1Paint();
        }

        if (AF.files && typeof AF.files.setApplicantUploadMeta === 'function') {
            if (String(personal.photoPath || '').trim()) {
                AF.files.setApplicantUploadMeta('photo', personal.photoPath, personal.photoFileName);
            }
            if (String(personal.enrolmentCertPath || '').trim()) {
                AF.files.setApplicantUploadMeta('enrolmentCert', personal.enrolmentCertPath, personal.enrolmentCertFileName);
            }
        }

        const fillPromise = fillPersonal(personal);
        const chained = fillPromise && typeof fillPromise.then === 'function'
            ? fillPromise
            : Promise.resolve();
        return chained.then(function () {
            return waitForTab1Paint();
        });
    }

    function refreshApplicantUploadUi(personal) {
        let data = personal;
        if (!data && typeof getPersonalFromForm === 'function') {
            data = getPersonalFromForm();
        }
        data = mergePersonalPreservingLocalUploads(data || {});
        applyApplicantUploadFieldsFromPersonal(data);
        if (AF.files && typeof AF.files.mountAllDocPreviewButtons === 'function') {
            AF.files.mountAllDocPreviewButtons(document.querySelector('.app-container'));
        }
    }



    function applySavedApplicantUploads(personal) {
        if (!personal) {
            refreshApplicantUploadUi();
            return;
        }
        if (AF.files && typeof AF.files.setApplicantUploadMeta === 'function') {
            if (String(personal.photoPath || '').trim()) {
                AF.files.setApplicantUploadMeta('photo', personal.photoPath, personal.photoFileName);
            }
            if (String(personal.enrolmentCertPath || '').trim()) {
                AF.files.setApplicantUploadMeta('enrolmentCert', personal.enrolmentCertPath, personal.enrolmentCertFileName);
            }
        }
        refreshApplicantUploadUi(personal);
    }



    function initPhotoUpload() {

        const photoInput = document.getElementById('photoUpload');

        if (!photoInput) return;

        photoInput.setAttribute('accept', (AF.files && AF.files.PHOTO_UPLOAD_ACCEPT) || '.jpg,.jpeg,.png');

        if (AF.files && typeof AF.files.ensureUploadHostForInput === 'function') {
            AF.files.ensureUploadHostForInput(photoInput);
        }

        photoInput.addEventListener('change', function () {

            const file = this.files[0];

            if (!file) return;

            if (AF.files && typeof AF.files.validateFileInputUi === 'function') {

                if (!AF.files.validateFileInputUi(this)) {

                    return;

                }

            }

            AF.files.storeFilePreview('photo', file);

        });

        photoInput.addEventListener('file-upload-cleared', function () {

            if (AF.files && typeof AF.files.clearApplicantUploadMeta === 'function') {

                AF.files.clearApplicantUploadMeta('photo');

            } else if (AF.files && typeof AF.files.markUploadCleared === 'function') {

                AF.files.markUploadCleared('photo');

            } else {

                delete AF.state.filePreviews.photo;

            }

            removePhotoViewButton();

            const wrap = getPhotoWrapper();

            const iconWrapper = wrap && wrap.querySelector('.upload-icon-wrapper');

            if (iconWrapper) {

                iconWrapper.innerHTML = '<i class="bi bi-person-fill upload-main-icon"></i>';

            }

        });

    }



    function initSeniorEnrolmentField() {

        const seniorEl = document.getElementById('seniorEnrolmentNo');

        if (!seniorEl) return;

        seniorEl.addEventListener('blur', function () {

            const v = this.value.trim();

            if (v) this.value = v.toUpperCase();

        });

    }



    function initLawOfficerToggle() {

        const lawOfficerEl = document.getElementById('lawOfficerServing');

        if (!lawOfficerEl) return;

        $('#lawOfficerServing').on('change', function () {

            const selectedValue = $(this).val();

            if (selectedValue === 'Yes') {

                $('#lawOfficerRemarksWrapper').removeClass('d-none').hide().fadeIn(250);

            } else {

                $('#lawOfficerRemarksWrapper').fadeOut(200, function () {

                    $(this).addClass('d-none');

                    $('#lawOfficerRemarks').val('');

                });

            }

        });

    }



    function onNextToTab2() {

        AF.files.collectLiveFilePreviews();

        if (!validateStep1()) return;

        const nextBtn = document.getElementById('nextToTab2');

        const personal = getPersonalFromForm();

        const saveFn = AF.api && typeof AF.api.saveTab1WithDocuments === 'function'
            ? AF.api.saveTab1WithDocuments(personal)
            : Promise.resolve();

        if (nextBtn) {

            nextBtn.disabled = true;

            nextBtn.textContent = 'Saving...';

        }

        saveFn

            .then(function () {

                AF.data.saveDraft();

                refreshApplicantUploadUi(personal);

                AF.nav.switchTab(2);

            })

            .catch(function (err) {

                alert(err && err.message ? err.message : 'Failed to save. Please try again.');

            })

            .finally(function () {

                if (nextBtn) {

                    nextBtn.disabled = false;

                    nextBtn.textContent = 'Next →';

                }

            });

    }



    function initSubCasteDropdown() {
        const communityEl = document.getElementById('community');
        if (!communityEl) {
            return;
        }

        communityEl.addEventListener('change', function () {
            if (communityEl.disabled || communityEl.classList.contains('prefilled-locked')) {
                return;
            }
            if (AF.api && typeof AF.api.populateSubCasteSelect === 'function') {
                AF.api.populateSubCasteSelect(communityEl.value, '');
            }
        });
    }



    function initDobAgeField() {

        const dobEl = document.getElementById('dob');

        if (!dobEl) return;

        dobEl.addEventListener('change', updateAgeFromDob);

        dobEl.addEventListener('input', updateAgeFromDob);

    }



    function init() {

        mountEnrolmentCertUpload('', '');

        initPhotoUpload();

        initSeniorEnrolmentField();

        initLawOfficerToggle();

        initSubCasteDropdown();

        initDobAgeField();

        initPincodeFields();



        const nextBtn = document.getElementById('nextToTab2');

        if (nextBtn) {

            nextBtn.addEventListener('click', onNextToTab2);

        }

    }



    AF.tab1 = {

        init: init,

        getPersonalFromForm: getPersonalFromForm,

        fillPersonal: fillPersonal,

        setPhotoFileLabel: setPhotoFileLabel,

        showExistingPhoto: showExistingPhoto,
        showExistingEnrolmentCert: showExistingEnrolmentCert,

        mountEnrolmentCertUpload: mountEnrolmentCertUpload,

        clearPhotoUploadUi: clearPhotoUploadUi,

        clearEnrolmentCertUploadUi: clearEnrolmentCertUploadUi,

        validateStep1: validateStep1,

        prefillTab1FromSession: prefillTab1FromSession,

        prefillTab1FromDb: prefillTab1FromSession,

        lockPrefilledTab1Fields: lockPrefilledTab1Fields,

        refreshApplicantUploadUi: refreshApplicantUploadUi,

        applySavedApplicantUploads: applySavedApplicantUploads,

        hydrateFromApplicantRow: hydrateFromApplicantRow,

        waitForTab1Paint: waitForTab1Paint,

        mergePersonalPreservingLocalUploads: mergePersonalPreservingLocalUploads

    };

})(window.ApplicationForm);

