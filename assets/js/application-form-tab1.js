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



    function getPhotoWrapper() {

        const photoInput = document.getElementById('photoUpload');

        return photoInput ? photoInput.closest('.compact-upload-wrapper') : null;

    }



    function hasPhotoFile() {

        const photoInput = document.getElementById('photoUpload');

        if (photoInput && photoInput.files && photoInput.files[0]) return true;

        const preview = AF.state.filePreviews.photo;

        return !!(preview && preview.name);

    }



    function hasEnrolmentCertFile() {

        const certInput = document.getElementById('enrolmentCertUpload');

        if (certInput && certInput.files && certInput.files[0]) return true;

        const preview = AF.state.filePreviews.enrolmentCert;

        return !!(preview && preview.name);

    }



    function getPhotoFileName() {

        const photoInput = document.getElementById('photoUpload');

        if (photoInput && photoInput.files && photoInput.files[0]) return photoInput.files[0].name;

        const preview = AF.state.filePreviews.photo;

        return preview && preview.name ? preview.name : '';

    }



    function getEnrolmentCertFileName() {

        const certInput = document.getElementById('enrolmentCertUpload');

        if (certInput && certInput.files && certInput.files[0]) return certInput.files[0].name;

        const preview = AF.state.filePreviews.enrolmentCert;

        return preview && preview.name ? preview.name : '';

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

            enrolmentCertFileName: getEnrolmentCertFileName()

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

        if (data.community) document.getElementById('community').value = data.community;

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

        if (data.photoFileName) setPhotoFileLabel(data.photoFileName);

        if (data.enrolmentCertFileName) mountEnrolmentCertUpload(data.enrolmentCertFileName);

    }



    function setPhotoFileLabel(fileName) {

        const wrap = getPhotoWrapper();

        if (!wrap || !fileName) return;

        const subtitle = wrap.querySelector('.upload-subtitle');

        if (subtitle) {

            subtitle.innerHTML = '<i class="bi bi-check-circle-fill text-success me-1"></i>' + AF.utils.escapeHtml(fileName);

        }

        wrap.classList.add('has-file');

    }



    function mountEnrolmentCertUpload(fileNameFromPersonal) {

        const mount = document.getElementById('enrolmentCertUploadMount');

        if (!mount || !AF.files.buildFileUploadHtml) return;

        const preview = AF.state.filePreviews.enrolmentCert;

        const savedName = fileNameFromPersonal
            || (preview && preview.name ? preview.name : '');

        mount.innerHTML = AF.files.buildFileUploadHtml(

            'enrolmentCertUpload',

            'Upload Certificate',

            savedName,

            '',

            ENROL_CERT_ACCEPT,

            false

        );

        AF.files.initFileUploadButtons(mount);

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

        const profile = AppData.getPersonalProfile();

        fillPersonal(profile);

        if (AF.config.existingApp && AF.config.existingApp.personal) {

            fillPersonal(AF.config.existingApp.personal);

        }

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



    function init() {

        mountEnrolmentCertUpload();

        initPhotoUpload();

        initSeniorEnrolmentField();

        initLawOfficerToggle();



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

        mountEnrolmentCertUpload: mountEnrolmentCertUpload,

        validateStep1: validateStep1,

        prefillTab1FromSession: prefillTab1FromSession,

        prefillTab1FromDb: prefillTab1FromSession

    };

})(window.ApplicationForm);

