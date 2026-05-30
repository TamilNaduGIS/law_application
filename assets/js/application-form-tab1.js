/**

 * Tab 1: Personal & Professional Information

 */

(function (AF) {

    const ENROLMENT_SR_REGEX = /^[A-Z]{2}\/[0-9]{1,5}\/[0-9]{2}SR$/;

    const ENROL_CERT_ACCEPT = '.pdf,.jpg,.jpeg,.png';



    function setVal(id, value) {

        const el = document.getElementById(id);

        if (!el || value == null || value === '') return;

        el.value = value;

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

        return !!(window.sessionStorage.getItem('photoPath') || '').trim();

    }



    function hasExistingEnrolmentCert() {

        return !!(window.sessionStorage.getItem('enrolmentCertPath') || '').trim();

    }



    function getPhotoWrapper() {

        const photoInput = document.getElementById('photoUpload');

        return photoInput ? photoInput.closest('.compact-upload-wrapper') : null;

    }



    function hasPhotoFile() {

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

            photoPath: window.sessionStorage.getItem('photoPath') || '',

            enrolmentCertFileName: getEnrolmentCertFileName(),

            enrolmentCertPath: window.sessionStorage.getItem('enrolmentCertPath') || ''

        };

    }



    function fillPersonal(data) {

        if (!data) return;

        setVal('advocateName', data.advocateName);

        setVal('enrolmentNo', data.enrolmentNo);

        setVal('seniorEnrolmentNo', data.seniorEnrolmentNo);

        setVal('enrolmentDate', data.enrolmentDate);

        setVal('fatherName', data.fatherName);

        if (data.gender) document.getElementById('gender').value = data.gender;

        if (data.maritalStatus) document.getElementById('maritalStatus').value = data.maritalStatus;

        setVal('dob', data.dob);

        setVal('nationality', data.nationality);

        setVal('religion', data.religion);

        const subCasteValue = data.subCaste || data.caste || '';
        if (data.community) {
            document.getElementById('community').value = data.community;
            if (AF.api && typeof AF.api.populateSubCasteSelect === 'function') {
                AF.api.populateSubCasteSelect(data.community, subCasteValue);
            }
        } else if (subCasteValue && document.getElementById('subCaste')) {
            document.getElementById('subCaste').value = subCasteValue;
        }

        setVal('yearsOfPracticeHcm', data.yearsOfPracticeHcm);

        if (data.enrolmentCertPath) {
            window.sessionStorage.setItem('enrolmentCertPath', data.enrolmentCertPath);
        }
        if (data.enrolmentCertFileName) {
            window.sessionStorage.setItem('enrolmentCertName', data.enrolmentCertFileName);
        }
        if (data.photoPath) {
            window.sessionStorage.setItem('photoPath', data.photoPath);
        }
        if (data.photoFileName) {
            window.sessionStorage.setItem('photoName', data.photoFileName);
        }

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

        if (data.photoPath) {
            showExistingPhoto(data.photoPath, data.photoFileName);
        } else if (data.photoFileName) {
            setPhotoFileLabel(data.photoFileName);
        }

        const certName = data.enrolmentCertFileName
            || (data.enrolmentCertPath ? fileNameFromPath(data.enrolmentCertPath) : '');

        if (certName || data.enrolmentCertPath) {
            mountEnrolmentCertUpload(certName);
        }

    }



    function showExistingPhoto(photoPath, fileName) {

        const path = photoPath || window.sessionStorage.getItem('photoPath') || '';

        if (!path) return;

        window.sessionStorage.setItem('photoPath', path);

        const wrap = getPhotoWrapper();

        if (!wrap) return;

        const name = fileName || window.sessionStorage.getItem('photoName') || fileNameFromPath(path);

        const url = resolveUploadUrl(path);

        const subtitle = wrap.querySelector('.upload-subtitle');

        const iconWrapper = wrap.querySelector('.upload-icon-wrapper');

        const actionBtn = wrap.querySelector('.upload-action-btn');

        if (subtitle) {

            subtitle.innerHTML = '<i class="bi bi-check-circle-fill text-success me-1"></i>' + AF.utils.escapeHtml(name);

        }

        if (iconWrapper) {

            iconWrapper.innerHTML = '<img src="' + AF.utils.escapeHtml(url) + '" class="preview-upload-image" alt="Photo">';

        }

        if (actionBtn) {

            actionBtn.innerHTML = '<i class="bi bi-pencil-square me-1"></i> Update';

        }

        wrap.classList.add('has-file');

        AF.state.filePreviews.photo = {

            name: name,

            url: url,

            isImage: true,

            isExisting: true

        };

    }



    function setPhotoFileLabel(fileName) {

        const wrap = getPhotoWrapper();

        if (!wrap || !fileName) return;

        const subtitle = wrap.querySelector('.upload-subtitle');

        if (subtitle) {

            subtitle.innerHTML = '<i class="bi bi-check-circle-fill text-success me-1"></i>' + AF.utils.escapeHtml(fileName);

        }

        wrap.classList.add('has-file');

        const actionBtn = wrap.querySelector('.upload-action-btn');

        if (actionBtn) {

            actionBtn.innerHTML = '<i class="bi bi-pencil-square me-1"></i> Update';

        }

    }



    function mountEnrolmentCertUpload(fileNameFromPersonal) {

        const mount = document.getElementById('enrolmentCertUploadMount');

        if (!mount || !AF.files.buildFileUploadHtml) return;

        const preview = AF.state.filePreviews.enrolmentCert;

        const existingPath = window.sessionStorage.getItem('enrolmentCertPath') || '';

        const savedName = fileNameFromPersonal
            || window.sessionStorage.getItem('enrolmentCertName')
            || (preview && preview.name ? preview.name : '')
            || fileNameFromPath(existingPath);

        const isExisting = !!existingPath && !(preview && preview.name);

        mount.innerHTML = AF.files.buildFileUploadHtml(

            'enrolmentCertUpload',

            'Upload Certificate',

            savedName,

            '',

            ENROL_CERT_ACCEPT,

            false,

            isExisting

        );

        AF.files.initFileUploadButtons(mount);

        if (isExisting && existingPath) {

            const certUrl = resolveUploadUrl(existingPath);

            AF.state.filePreviews.enrolmentCert = {

                name: savedName,

                url: certUrl,

                isExisting: true,

                isPdf: /\.pdf$/i.test(savedName),

                isImage: /\.(jpe?g|png|gif|webp)$/i.test(savedName)

            };

        }

    }



    function validateSeniorEnrolment(senior) {

        // if (!senior) return true;

        // if (!ENROLMENT_SR_REGEX.test(senior)) {

        //     alert('Invalid Senior Advocate Enrolment format. Use AB/1234/YYSR');

        //     return false;

        // }

        return true;

    }



    function validateStep1() {

        const p = getPersonalFromForm();

        if (!p.advocateName || !p.enrolmentNo || !p.mobile || !p.email) {

            alert('Please fill mandatory fields: Name, Enrolment No, Mobile, Email');

            return false;

        }

        if (!validateSeniorEnrolment(p.seniorEnrolmentNo)) return false;

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

        fillPersonal(Object.assign({}, profile, draftPersonal));

    }



    function initPhotoUpload() {

        const photoInput = document.getElementById('photoUpload');

        if (!photoInput) return;

        photoInput.addEventListener('change', function () {

            const file = this.files[0];

            if (!file) return;

            if (!/^image\/(jpeg|png|jpg)$/i.test(file.type) && !/\.(jpe?g|png)$/i.test(file.name)) {

                alert('Photo must be JPG or PNG.');

                this.value = '';

                return;

            }

            AF.files.storeFilePreview('photo', file);

            const wrap = getPhotoWrapper();

            if (!wrap) return;

            const imageURL = URL.createObjectURL(file);

            const subtitle = wrap.querySelector('.upload-subtitle');

            const iconWrapper = wrap.querySelector('.upload-icon-wrapper');

            if (subtitle) {

                subtitle.innerHTML = '<i class="bi bi-check-circle-fill text-success me-1"></i>' + AF.utils.escapeHtml(file.name);

            }

            if (iconWrapper) {

                iconWrapper.innerHTML = '<img src="' + imageURL + '" class="preview-upload-image" alt="Preview">';

            }

            const actionBtn = wrap.querySelector('.upload-action-btn');

            if (actionBtn) {

                actionBtn.innerHTML = '<i class="bi bi-pencil-square me-1"></i> Update';

            }

            wrap.classList.add('has-file');

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
            if (AF.api && typeof AF.api.populateSubCasteSelect === 'function') {
                AF.api.populateSubCasteSelect(communityEl.value, '');
            }
        });
    }

    function init() {

        mountEnrolmentCertUpload();

        initPhotoUpload();

        initSeniorEnrolmentField();

        initLawOfficerToggle();

        initSubCasteDropdown();



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

        mountEnrolmentCertUpload: mountEnrolmentCertUpload,

        validateStep1: validateStep1,

        prefillTab1FromSession: prefillTab1FromSession,

        prefillTab1FromDb: prefillTab1FromSession

    };

})(window.ApplicationForm);

