/**
 * Tab 1: Personal & Professional Information
 */
(function (AF) {
    function setVal(id, value) {
        const el = document.getElementById(id);
        if (!el || value == null || value === '') return;
        el.value = value;
    }

    function getPhotoFileName() {
        const photoInput = document.getElementById('photoUpload');
        if (photoInput && photoInput.files && photoInput.files[0]) return photoInput.files[0].name;
        const wrap = photoInput && photoInput.closest('.custom-file-upload');
        if (wrap && wrap.classList.contains('has-file')) {
            const text = wrap.querySelector('.upload-btn-text');
            return (text && text.title) ? text.title : '';
        }
        return '';
    }

    function getPersonalFromForm() {
        return {
            advocateName: document.getElementById('advocateName').value.trim(),
            enrolmentNo: document.getElementById('enrolmentNo').value.trim(),
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
            permanentAddress: document.getElementById('permanent_address') ? document.getElementById('permanent_address').value.trim() : '',
            photoFileName: getPhotoFileName()
        };
    }

    function fillPersonal(data) {
        if (!data) return;
        setVal('advocateName', data.advocateName);
        setVal('enrolmentNo', data.enrolmentNo);
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
        setVal('district', data.district);
        setVal('pincode', data.pincode);
        setVal('officeAddress', data.officeAddress);
        setVal('permanentAddress', data.permanentAddress);
        setVal('permanent_address', data.permanentAddress);
        if (data.photoFileName) setPhotoFileLabel(data.photoFileName);
    }

    function setPhotoFileLabel(fileName) {
        const wrap = document.querySelector('#photoUpload') && document.querySelector('#photoUpload').closest('.custom-file-upload');
        if (!wrap) return;
        const textEl = wrap.querySelector('.upload-btn-text');
        if (textEl) {
            textEl.textContent = AF.utils.truncateFileName(fileName);
            textEl.title = fileName;
            wrap.classList.add('has-file');
        }
    }

    function validateStep1() {
        const p = getPersonalFromForm();
        if (!p.advocateName || !p.enrolmentNo || !p.mobile || !p.email) {
            alert('Please fill mandatory fields: Name, Enrolment No, Mobile, Email');
            return false;
        }
        return true;
    }

    function prefillTab1FromDb() {
        const profile = AppData.getPersonalProfile(AF.config.userId) || {};
        const sessionName = sessionStorage.getItem('advocateName');
        const sessionEnrolment = sessionStorage.getItem('enrolmentNo');
        const sessionMobile = sessionStorage.getItem('mobile');
        if (sessionName) profile.advocateName = sessionName;
        if (sessionEnrolment) profile.enrolmentNo = sessionEnrolment;
        if (sessionMobile) profile.mobile = sessionMobile;
        fillPersonal(profile);
        if (AF.config.existingApp && AF.config.existingApp.personal) fillPersonal(AF.config.existingApp.personal);
    }

    function initPhotoUpload() {
        const photoInput = document.getElementById('photoUpload');
        if (!photoInput) return;
        photoInput.addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;
            const imageURL = URL.createObjectURL(file);
            const subtitle = document.querySelector('.upload-subtitle');
            const iconWrapper = document.querySelector('.upload-icon-wrapper');
            if (subtitle) {
                subtitle.innerHTML = '<i class="bi bi-check-circle-fill text-success me-1"></i>' + file.name;
            }
            if (iconWrapper) {
                iconWrapper.innerHTML = '<img src="' + imageURL + '" class="preview-upload-image" alt="Preview">';
            }
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

    function initEnrolmentDefault() {
        $(document).ready(function () {
            const enrolment = sessionStorage.getItem('enrolmentNo');
            if (enrolment) {
                $('#enrolmentNo').val(enrolment);
            }
        });
    }

    function init() {
        initPhotoUpload();
        initLawOfficerToggle();
        initEnrolmentDefault();

        const nextBtn = document.getElementById('nextToTab2');
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                if (!validateStep1()) return;
                AF.data.saveDraft();
                AF.nav.switchTab(2);
            });
        }
    }

    AF.tab1 = {
        init: init,
        getPersonalFromForm: getPersonalFromForm,
        fillPersonal: fillPersonal,
        setPhotoFileLabel: setPhotoFileLabel,
        validateStep1: validateStep1,
        prefillTab1FromDb: prefillTab1FromDb
    };
})(window.ApplicationForm);
