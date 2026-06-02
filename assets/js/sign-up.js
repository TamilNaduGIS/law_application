/**
 * Applicant registration — validation and API integration.
 */
(function ($, global) {
    'use strict';

    const MARITAL_LABELS = { S: 'Single', M: 'Married', D: 'Divorced', W: 'Widowed' };
    const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    const ENROLMENT_REGEX = /^[A-Z]{2}\/[0-9]{5}\/[0-9]{4}$/;
    const ENROLMENT_SR_REGEX = /^[A-Z]{2}\/[0-9]{4}\/[0-9]{4}SR$/;
    const MOBILE_REGEX = /^[6-9]\d{9}$/;
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const RELIGION_OPTIONS = [
        'Buddhist',
        'Christian',
        'Hindu',
        'Jain',
        'Muslim',
        'Not Stated',
        'Others',
        'Parsi',
        'Sikh',
        'Zoroastrian'
    ];

    let mobileVerified = false;
    let verifiedMobile = '';
    let otpSending = false;

    const OTP_PURPOSE = 'register';
    const OTP_TIMER_SECONDS = 300;

    const casteMaster = {
        BC: ['Agamudayar', 'Gounder', 'Kaikolar', 'Kallar', 'Maravars', 'Muthuraja', 'Nadar', 'Others', 'Sengunthar', 'Vannan'],
        MBC: ['Ambalakarar', 'Isaivellalar', 'Kurumba', 'Maruthuvar', 'Navithar', 'Others', 'Paravar', 'Vettuva Gounder'],
        'DNC/DNT': ['Kootappal Kallars', 'Koravars', 'Others', 'Padayachi', 'Piramalai Kallars', 'Valayars', 'Vettaikarar'],
        OC: ['Others'],
        SC: ['Adi Dravida', 'Adi Karnataka', 'Arunthathiyar', 'Chakkiliyan', 'Kuravan', 'Others', 'Pallan', 'Parayan'],
        ST: ['Irular', 'Kattunayakan', 'Kota', 'Kurumbas', 'Others', 'Paniyan', 'Toda'],
        'BC Muslim': ['Labbais', 'Marakayar', 'Others', 'Rowthar', 'Sheik', 'Syed']
    };

    function sortLabels(list) {
        return list.slice().sort(function (a, b) {
            return a.localeCompare(b, undefined, { sensitivity: 'base' });
        });
    }

    function fieldVal(selector) {
        const el = $(selector);
        if (!el.length) {
            return '';
        }
        const v = el.val();
        return v == null ? '' : String(v).trim();
    }

    function showValidationAlert(message, title) {
        if (global.LawPortal && typeof global.LawPortal.alert === 'function') {
            global.LawPortal.alert({ icon: 'error', title: title || 'Validation Error', text: message });
            return;
        }
        if (typeof global.Swal !== 'undefined') {
            global.Swal.fire({ icon: 'error', title: title || 'Validation Error', text: message, confirmButtonColor: '#1f3291' });
            return;
        }
        global.alert(message);
    }

    function showError(message, fieldErrors) {
        const errorEl = document.getElementById('errorMsg');
        if (!errorEl) {
            return;
        }

        let html = message || 'Please correct the errors below.';
        if (fieldErrors && typeof fieldErrors === 'object') {
            const list = Object.values(fieldErrors).filter(Boolean);
            if (list.length) {
                html = '<ul class="error-msg-list">' + list.map(function (msg) {
                    return '<li>' + msg + '</li>';
                }).join('') + '</ul>';
            }
        }

        errorEl.innerHTML = html;
        errorEl.classList.remove('success-msg');
        errorEl.classList.add('error-msg', 'signup-error-toast', 'is-visible');
    }

    function clearError() {
        const errorEl = document.getElementById('errorMsg');
        if (errorEl) {
            errorEl.innerHTML = '';
            errorEl.classList.remove('is-visible', 'success-msg');
            errorEl.classList.add('error-msg');
        }
        document.querySelectorAll('.field-invalid').forEach(function (el) {
            el.classList.remove('field-invalid');
        });
    }

    function markInvalid(id) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('field-invalid');
            el.focus();
        }
    }

    function parseLocalDate(value) {
        if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return null;
        }
        const parts = value.split('-').map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function isValidDate(value) {
        const dt = parseLocalDate(value);
        if (!dt) {
            return false;
        }
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return value === y + '-' + m + '-' + d;
    }

    function ageFromDob(dob) {
        const birth = parseLocalDate(dob);
        if (!birth) {
            return 0;
        }
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    function yearsSinceDate(fromDateStr) {
        const from = parseLocalDate(fromDateStr);
        if (!from) {
            return null;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        from.setHours(0, 0, 0, 0);
        const diffDays = (today - from) / (1000 * 60 * 60 * 24);
        return Math.max(0, Math.round((diffDays / 365.25) * 100) / 100);
    }

    function isEnrolmentAfterDob(enrolmentDate, dob) {
        if (!enrolmentDate || !dob || !isValidDate(enrolmentDate) || !isValidDate(dob)) {
            return true;
        }
        const enrolDt = parseLocalDate(enrolmentDate);
        const birthDt = parseLocalDate(dob);
        enrolDt.setHours(0, 0, 0, 0);
        birthDt.setHours(0, 0, 0, 0);
        return enrolDt > birthDt;
    }

    const CROSS_DATE_FIELDS = ['enrolmentDate', 'dob', 'expyears'];

    function isValidPan(value) {
        return PAN_REGEX.test((value || '').trim().toUpperCase());
    }

    const VALIDATED_FIELD_IDS = [
        'advocateName', 'fatherName', 'enrolmentNo', 'enrolmentnosr', 'enrolmentDate',
        'pan', 'expyears', 'mobile', 'phone', 'email', 'gender', 'maritalStatus',
        'dob', 'nationality', 'religion', 'otherCaste', 'captcha'
    ];

    const touchedFields = new Set();

    function normalizeField(fieldId) {
        if (fieldId === 'enrolmentNo' || fieldId === 'enrolmentnosr' || fieldId === 'pan') {
            const $el = $('#' + fieldId);
            if ($el.length) {
                $el.val(fieldVal('#' + fieldId).toUpperCase());
            }
        }
    }

    function getFieldError(fieldId) {
        switch (fieldId) {
            case 'advocateName': {
                const advocateName = fieldVal('#advocateName');
                if (!advocateName) {
                    return 'Advocate name is required.';
                }
                if (advocateName.length < 2) {
                    return 'Advocate name must be at least 2 characters.';
                }
                return null;
            }
            case 'fatherName':
                return fieldVal('#fatherName') ? null : "Father's name is required.";
            case 'enrolmentNo': {
                const enrolmentNo = fieldVal('#enrolmentNo').toUpperCase();
                if (!enrolmentNo) {
                    return 'Bar Council enrolment number is required.';
                }
                if (!ENROLMENT_REGEX.test(enrolmentNo)) {
                    return 'Invalid format. Use MS/12345/2015';
                }
                return null;
            }
            case 'enrolmentnosr': {
                if (!$('#enrolmentnosr').length) {
                    return null;
                }
                const enrolmentNoSr = fieldVal('#enrolmentnosr').toUpperCase();
                if (enrolmentNoSr && !ENROLMENT_SR_REGEX.test(enrolmentNoSr)) {
                    return 'Invalid format. Use MS/1234/0123SR';
                }
                return null;
            }
            case 'enrolmentDate': {
                const enrolmentDate = fieldVal('#enrolmentDate');
                if (!enrolmentDate) {
                    return 'Enrolment date is required.';
                }
                if (!isValidDate(enrolmentDate)) {
                    return 'Enter a valid enrolment date.';
                }
                const enrolDt = parseLocalDate(enrolmentDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (enrolDt > today) {
                    return 'Enrolment date cannot be in the future.';
                }
                const dob = fieldVal('#dob');
                if (dob && isValidDate(dob) && !isEnrolmentAfterDob(enrolmentDate, dob)) {
                    return 'Enrolment date must be after date of birth.';
                }
                return null;
            }
            case 'pan': {
                const pan = fieldVal('#pan').toUpperCase();
                if (!pan) {
                    return 'PAN number is required.';
                }
                if (!isValidPan(pan)) {
                    return 'Enter a valid PAN (format: ABCDE1234F).';
                }
                return null;
            }
            case 'expyears': {
                const expyears = fieldVal('#expyears');
                if (expyears === '') {
                    return 'Total years of practice is required.';
                }
                if (isNaN(expyears) || Number(expyears) < 0 || Number(expyears) > 50) {
                    return 'Years of practice must be between 0 and 50.';
                }
                const enrolmentDate = fieldVal('#enrolmentDate');
                if (enrolmentDate && isValidDate(enrolmentDate)) {
                    const maxPracticeYears = yearsSinceDate(enrolmentDate);
                    if (maxPracticeYears != null && Number(expyears) > maxPracticeYears) {
                        return 'Years of practice cannot exceed ' + maxPracticeYears + ' year(s) since enrolment date.';
                    }
                }
                return null;
            }
            case 'mobile': {
                const mobile = fieldVal('#mobile');
                if (!mobile) {
                    return 'Mobile number is required.';
                }
                if (!MOBILE_REGEX.test(mobile)) {
                    return 'Enter a valid 10-digit mobile number starting with 6–9.';
                }
                if (!mobileVerified) {
                    return 'Please verify your mobile number using OTP.';
                }
                return null;
            }
            case 'phone': {
                const phone = fieldVal('#phone').replace(/\D/g, '');
                if (phone && (phone.length < 10 || phone.length > 15)) {
                    return 'Enter a valid phone number.';
                }
                return null;
            }
            case 'email': {
                const email = fieldVal('#email');
                if (!email) {
                    return 'Email is required.';
                }
                if (!EMAIL_REGEX.test(email)) {
                    return 'Enter a valid email address.';
                }
                return null;
            }
            case 'gender':
                return ['M', 'F', 'O'].includes(fieldVal('#gender')) ? null : 'Select a valid gender.';
            case 'maritalStatus':
                return MARITAL_LABELS[fieldVal('#maritalStatus')] ? null : 'Select a valid marital status.';
            case 'dob': {
                const dob = fieldVal('#dob');
                if (!dob) {
                    return 'Date of birth is required.';
                }
                if (!isValidDate(dob)) {
                    return 'Enter a valid date of birth.';
                }
                if (ageFromDob(dob) < 18) {
                    return 'You must be at least 18 years old to register.';
                }
                const enrolmentDate = fieldVal('#enrolmentDate');
                if (enrolmentDate && isValidDate(enrolmentDate) && !isEnrolmentAfterDob(enrolmentDate, dob)) {
                    return 'Date of birth must be before enrolment date.';
                }
                return null;
            }
            case 'nationality':
                return fieldVal('#nationality') ? null : 'Nationality is required.';
            case 'religion': {
                const religion = fieldVal('#religion');
                if (!religion) {
                    return 'Religion is required.';
                }
                if (RELIGION_OPTIONS.indexOf(religion) === -1) {
                    return 'Select a valid religion.';
                }
                return null;
            }
            case 'community':
                return fieldVal('#community') ? null : 'Community is required.';
            case 'caste': {
                if (!fieldVal('#community')) {
                    return 'Community is required.';
                }
                if (!fieldVal('#caste')) {
                    return 'Caste is required.';
                }
                return null;
            }
            case 'otherCaste':
                if (fieldVal('#caste') === 'Others' && !fieldVal('#otherCaste')) {
                    return 'Please enter your caste name.';
                }
                return null;
            case 'captcha': {
                const captchaAnswer = fieldVal('#captcha');
                const captchaToken = fieldVal('#captchaToken');
                if (!captchaToken) {
                    return 'Captcha expired. Click the image to refresh.';
                }
                if (!captchaAnswer) {
                    return 'Captcha is required.';
                }
                return null;
            }
            default:
                return null;
        }
    }

    function markFieldState(fieldId, hasError) {
        const el = document.getElementById(fieldId);
        if (el) {
            el.classList.toggle('field-invalid', !!hasError);
        }
    }

    function refreshValidationBanner() {
        const errors = {};
        touchedFields.forEach(function (fieldId) {
            const err = getFieldError(fieldId);
            if (err) {
                errors[fieldId] = err;
            }
        });

        if (Object.keys(errors).length) {
            showError(null, errors);
        } else {
            clearError();
        }
    }

    function validateSingleField(fieldId, options) {
        options = options || {};
        if (!fieldId || !document.getElementById(fieldId)) {
            return true;
        }

        normalizeField(fieldId);
        const error = getFieldError(fieldId);
        markFieldState(fieldId, !!error);

        if (options.trackTouch !== false) {
            touchedFields.add(fieldId);
            refreshValidationBanner();
        }

        return !error;
    }

    function revalidateCrossDateFields(changedFieldId) {
        if (CROSS_DATE_FIELDS.indexOf(changedFieldId) === -1) {
            return;
        }

        CROSS_DATE_FIELDS.forEach(function (fieldId) {
            if (fieldId !== changedFieldId && fieldVal('#' + fieldId) !== '') {
                validateSingleField(fieldId);
            }
        });
    }

    function collectAllErrors() {
        const errors = {};
        const fieldIds = VALIDATED_FIELD_IDS.concat(['community', 'caste']);

        fieldIds.forEach(function (fieldId) {
            if (!document.getElementById(fieldId)) {
                return;
            }
            normalizeField(fieldId);
            const err = getFieldError(fieldId);
            if (err) {
                errors[fieldId] = err;
            }
        });
        return errors;
    }

    function validateForm() {
        clearError();
        touchedFields.clear();

        const errors = collectAllErrors();
        const keys = Object.keys(errors);

        if (keys.length) {
            keys.forEach(function (key) {
                touchedFields.add(key);
                markFieldState(key, true);
            });
            showError(null, errors);
            markInvalid(keys[0]);
            return null;
        }

        const enrolmentNo = fieldVal('#enrolmentNo').toUpperCase();
        const enrolmentNoSr = fieldVal('#enrolmentnosr').toUpperCase();
        const pan = fieldVal('#pan').toUpperCase();
        const expyears = fieldVal('#expyears');
        const mobile = fieldVal('#mobile');

        return {
            advocateName: fieldVal('#advocateName'),
            fatherName: fieldVal('#fatherName'),
            enrolmentNo: enrolmentNo,
            enrolmentNoSr: enrolmentNoSr,
            isSeniorAdvocate: !!enrolmentNoSr,
            enrolmentDate: fieldVal('#enrolmentDate'),
            pan: pan,
            expyears: Number(expyears),
            mobile: mobile,
            mobileVerified: mobileVerified,
            phone: fieldVal('#phone'),
            email: fieldVal('#email'),
            gender: fieldVal('#gender'),
            maritalStatus: fieldVal('#maritalStatus'),
            dob: fieldVal('#dob'),
            nationality: fieldVal('#nationality'),
            religion: fieldVal('#religion'),
            community: fieldVal('#community'),
            caste: fieldVal('#caste'),
            otherCaste: fieldVal('#otherCaste'),
            captcha_token: fieldVal('#captchaToken'),
            captcha_answer: fieldVal('#captcha')
        };
    }

    function initChangeValidation() {
        VALIDATED_FIELD_IDS.forEach(function (fieldId) {
            const el = document.getElementById(fieldId);
            if (!el) {
                return;
            }

            $('#' + fieldId).on('change', function () {
                validateSingleField(fieldId);
                revalidateCrossDateFields(fieldId);
            });
        });
    }

    function submitRegistration(payload) {
        const $btn = $('#btnlogin');
        const originalHtml = $btn.html();

        $btn.prop('disabled', true).html('<span class="main-text">Registering…</span>');

        return global.LawPortal.apiAjax('register', 'POST', payload)
            .done(function (res) {
                if (res && res.ok) {
                    global.location.href = 'login.html?registered=1';
                    return;
                }
                showError((res && res.error) || 'Registration failed.');
            })
            .fail(function (xhr) {
                let message = 'Unable to register. Please try again later.';
                try {
                    const res = xhr.responseJSON;
                    if (res && res.errors) {
                        showError(null, res.errors);
                        const firstKey = Object.keys(res.errors)[0];
                        if (firstKey) {
                            markInvalid(firstKey);
                        }
                        return;
                    }
                    if (res && res.error) {
                        message = res.error;
                    }
                } catch (e) { /* ignore */ }
                showError(message);
            })
            .always(function () {
                $btn.prop('disabled', false).html(originalHtml);
            });
    }

    function initCommunityCaste() {
        $('#religion').on('change', function () {
            validateSingleField('religion');
        });

        $('#community').on('change', function () {
            const selected = $(this).val();
            const $caste = $('#caste');

            $caste.html('<option value="">Select Caste</option>');
            $('#otherCasteWrapper').hide();
            $('#otherCaste').val('').prop('required', false);

            if (!selected || !casteMaster[selected]) {
                validateSingleField('community');
                validateSingleField('caste');
                validateSingleField('otherCaste');
                return;
            }

            sortLabels(casteMaster[selected]).forEach(function (name) {
                $caste.append($('<option></option>').val(name).text(name));
            });

            validateSingleField('community');
            validateSingleField('caste');
            validateSingleField('otherCaste');
        });

        $('#caste').on('change', function () {
            if ($(this).val() === 'Others') {
                $('#otherCasteWrapper').slideDown(200);
                $('#otherCaste').prop('required', true);
            } else {
                $('#otherCasteWrapper').slideUp(200);
                $('#otherCaste').prop('required', false).val('');
            }
            validateSingleField('caste');
            validateSingleField('otherCaste');
        });
    }

    function initInputHelpers() {
        if (typeof global.applyInputValidation !== 'function') {
            return;
        }
        applyInputValidation('advocateName', [10]);
        applyInputValidation('fatherName', [10]);
        applyInputValidation('enrolmentNo', [11]);
        if ($('#enrolmentnosr').length) {
            applyInputValidation('enrolmentnosr', [11]);
        }
        applyInputValidation('pan', [12]);
        applyInputValidation('mobile', [3]);
        applyInputValidation('phone', [2]);
    }

    function initPanValidation() {
        $('#pan').on('input', function () {
            this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
        });
    }

    function resetMobileVerification() {
        mobileVerified = false;
        verifiedMobile = '';
        const sendOtpBtn = document.getElementById('sendOtp');
        const mobileInput = document.getElementById('mobile');

        if (sendOtpBtn) {
            sendOtpBtn.disabled = false;
            sendOtpBtn.innerHTML = '<i class="bi bi-shield-check"></i> Verify';
            sendOtpBtn.style.background = '';
        }

        if (mobileInput) {
            mobileInput.readOnly = false;
        }
    }

    function requestOtp(mobile) {
        return global.LawPortal.apiAjax('otp/send', 'POST', {
            mobile: mobile,
            purpose: OTP_PURPOSE
        });
    }

    function verifyOtpApi(mobile, otp) {
        return global.LawPortal.apiAjax('otp/verify', 'POST', {
            mobile: mobile,
            otp: otp,
            purpose: OTP_PURPOSE
        });
    }

    function showOtpStatus(message, type) {
        const statusBox = document.getElementById('status');
        if (!statusBox) {
            return;
        }

        statusBox.style.display = 'block';
        statusBox.className = 'otp-status ' + (type || 'error');
        statusBox.innerHTML = type === 'success'
            ? '<i class="bi bi-patch-check-fill"></i> ' + message
            : '<i class="bi bi-exclamation-circle-fill"></i> ' + message;
    }

    function initOtpFlow() {
        const sendOtpBtn = document.getElementById('sendOtp');
        const verifyBtn = document.getElementById('verifyOtp');
        const resendBtn = document.getElementById('resendOtp');
        const otpModal = document.getElementById('otpModal');
        const closeModal = document.getElementById('closeOtpModal');
        const otpInputs = document.querySelectorAll('.otp-input');
        const mobileInput = document.getElementById('mobile');
        const otpHidden = document.getElementById('otp');
        const statusBox = document.getElementById('status');
        const countdown = document.getElementById('countdown');
        const maskedMobile = document.getElementById('maskedMobile');

        if (!sendOtpBtn || !otpModal || !mobileInput) {
            return;
        }

        let timer;
        let seconds = OTP_TIMER_SECONDS;

        function markVerifiedUi() {
            mobileVerified = true;
            verifiedMobile = fieldVal('#mobile');
            clearInterval(timer);

            showOtpStatus('Mobile Number Verified Successfully', 'success');

            if (verifyBtn) {
                verifyBtn.innerHTML = '<i class="bi bi-patch-check-fill"></i> Verified';
            }

            otpInputs.forEach(function (input) {
                input.disabled = true;
            });
            mobileInput.readOnly = true;

            sendOtpBtn.innerHTML = '<i class="bi bi-patch-check-fill"></i> Verified';
            sendOtpBtn.style.background = 'linear-gradient(135deg,#059669,#10b981)';

            setTimeout(function () {
                otpModal.classList.remove('active');
            }, 1200);

            validateSingleField('mobile');
        }

        function openOtpModal(mobile) {
            otpModal.classList.add('active');

            if (maskedMobile) {
                maskedMobile.textContent = mobile.substring(0, 2) + 'XXXXXX' + mobile.substring(8);
            }

            if (statusBox) {
                statusBox.style.display = 'none';
                statusBox.textContent = '';
            }

            resetOtpInputs();
            startTimer();

            if (otpInputs.length) {
                otpInputs[0].focus();
            }
        }

        function resetSendOtpButton() {
            sendOtpBtn.disabled = false;
            sendOtpBtn.innerHTML = '<i class="bi bi-shield-check"></i> Verify';
            sendOtpBtn.style.background = '';
        }

        function handleSendOtp() {
            if (otpSending) {
                return;
            }

            const mobile = fieldVal('#mobile');

            if (!MOBILE_REGEX.test(mobile)) {
                showError('Enter a valid 10-digit mobile number starting with 6–9.');
                markInvalid('mobile');
                return;
            }

            clearError();
            otpSending = true;
            let otpSent = false;
            sendOtpBtn.disabled = true;
            sendOtpBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Sending...';

            requestOtp(mobile)
                .done(function (res) {
                    if (res && res.ok) {
                        otpSent = true;
                        resetMobileVerification();
                        sendOtpBtn.innerHTML = '<i class="bi bi-check-circle-fill"></i> OTP Sent';
                        openOtpModal(mobile);
                        return;
                    }

                    const message = (res && res.error) || 'Failed to send OTP.';
                    showError(message, (res && res.errors) || null);
                    if (res && res.errors && res.errors.mobile) {
                        markInvalid('mobile');
                    }
                })
                .fail(function (xhr) {
                    let message = 'Failed to send OTP. Please try again.';
                    try {
                        const res = xhr.responseJSON;
                        if (res && res.errors) {
                            showError(null, res.errors);
                            if (res.errors.mobile) {
                                markInvalid('mobile');
                            }
                            return;
                        }
                        if (res && res.error) {
                            message = res.error;
                        }
                    } catch (e) { /* ignore */ }
                    showError(message);
                })
                .always(function () {
                    otpSending = false;
                    if (!otpSent) {
                        resetSendOtpButton();
                    }
                });
        }

        function updateHiddenOTP() {
            let otp = '';
            otpInputs.forEach(function (input) {
                otp += input.value;
            });
            if (otpHidden) {
                otpHidden.value = otp;
            }
        }

        function startTimer() {
            clearInterval(timer);
            seconds = OTP_TIMER_SECONDS;
            if (resendBtn) {
                resendBtn.style.display = 'none';
            }

            timer = setInterval(function () {
                seconds--;
                const min = Math.floor(seconds / 60);
                const sec = seconds % 60;
                if (countdown) {
                    countdown.textContent =
                        String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
                }

                if (seconds <= 0) {
                    clearInterval(timer);
                    if (countdown) {
                        countdown.textContent = 'Expired';
                    }
                    if (resendBtn) {
                        resendBtn.style.display = 'block';
                    }
                }
            }, 1000);
        }

        function resetOtpInputs() {
            otpInputs.forEach(function (input) {
                input.value = '';
                input.disabled = false;
            });
            if (otpHidden) {
                otpHidden.value = '';
            }
        }

        sendOtpBtn.addEventListener('click', handleSendOtp);

        mobileInput.addEventListener('input', function () {
            if (mobileVerified && fieldVal('#mobile') !== verifiedMobile) {
                resetMobileVerification();
            }
        });

        if (closeModal) {
            closeModal.addEventListener('click', function () {
                otpModal.classList.remove('active');
            });
        }

        otpInputs.forEach(function (input, index) {
            input.addEventListener('input', function () {
                this.value = this.value.replace(/[^0-9]/g, '');
                if (this.value && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
                updateHiddenOTP();
            });

            input.addEventListener('keydown', function (e) {
                if (e.key === 'Backspace' && !this.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
        });

        if (verifyBtn) {
            verifyBtn.addEventListener('click', function () {
                updateHiddenOTP();
                const otpValue = otpHidden ? otpHidden.value : '';
                const mobile = fieldVal('#mobile');

                if (otpValue.length !== 6) {
                    showOtpStatus('Enter 6 digit OTP', 'error');
                    return;
                }

                verifyBtn.disabled = true;
                verifyBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Verifying...';

                verifyOtpApi(mobile, otpValue)
                    .done(function (res) {
                        if (res && res.ok) {
                            markVerifiedUi();
                            return;
                        }
                        showOtpStatus((res && res.error) || 'Invalid OTP. Please try again.', 'error');
                    })
                    .fail(function (xhr) {
                        const message = (xhr.responseJSON && xhr.responseJSON.error)
                            || 'OTP verification failed. Please try again.';
                        showOtpStatus(message, 'error');
                    })
                    .always(function () {
                        verifyBtn.disabled = false;
                        verifyBtn.innerHTML = '<i class="bi bi-patch-check-fill"></i> Verify OTP';
                    });
            });
        }

        if (resendBtn) {
            resendBtn.addEventListener('click', function () {
                handleSendOtp();
            });
        }

        global.addEventListener('click', function (e) {
            if (e.target === otpModal) {
                otpModal.classList.remove('active');
            }
        });
    }

    $(function () {
        if (!$('#signupForm').length) {
            return;
        }

        initInputHelpers();
        initCommunityCaste();
        initPanValidation();
        initChangeValidation();
        initOtpFlow();

        if (global.LawPortal && typeof global.LawPortal.bindCaptchaUi === 'function') {
            global.LawPortal.bindCaptchaUi('#captchaImage', '#captchaToken');
        }

        $('#signupForm').on('submit', function (e) {
            e.preventDefault();
            const payload = validateForm();
            if (!payload) {
                return;
            }
            submitRegistration(payload);
        });
    });
})(jQuery, window);
