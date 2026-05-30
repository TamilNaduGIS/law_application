/**
 * Applicant registration — validation and API integration.
 */
(function ($, global) {
    'use strict';

    const MARITAL_LABELS = { S: 'Single', M: 'Married', D: 'Divorced', W: 'Widowed' };
    const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    const ENROLMENT_REGEX = /^[A-Z]{2}\/[0-9]{1,5}\/[0-9]{2}$/;
    const ENROLMENT_SR_REGEX = /^[A-Z]{2}\/[0-9]{1,5}\/[0-9]{2}SR$/;
    const MOBILE_REGEX = /^[6-9]\d{9}$/;
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    let mobileVerified = false;
    let verifiedMobile = '';
    let otpSending = false;

    const OTP_PURPOSE = 'register';
    const OTP_TIMER_SECONDS = 300;

    const casteMaster = {
        BC: ['Agamudayar', 'Nadar', 'Maravars', 'Muthuraja', 'Kaikolar', 'Sengunthar', 'Kallar', 'Vannan', 'Gounder', 'Others'],
        MBC: ['Ambalakarar', 'Isaivellalar', 'Kurumba', 'Navithar', 'Maruthuvar', 'Vettuva Gounder', 'Paravar', 'Others'],
        'DNC/DNT': ['Koravars', 'Kootappal Kallars', 'Piramalai Kallars', 'Vettaikarar', 'Padayachi', 'Valayars', 'Others'],
        SC: ['Adi Dravida', 'Adi Karnataka', 'Arunthathiyar', 'Parayan', 'Pallan', 'Chakkiliyan', 'Kuravan', 'Others'],
        ST: ['Irular', 'Kattunayakan', 'Toda', 'Kota', 'Kurumbas', 'Paniyan', 'Others'],
        'BC Muslim': ['Labbais', 'Rowthar', 'Marakayar', 'Sheik', 'Syed', 'Others']
    };

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
        errorEl.classList.add('error-msg', 'is-visible');
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    function isValidPan(value) {
        return PAN_REGEX.test((value || '').trim().toUpperCase());
    }

    function validateForm() {
        clearError();
        const errors = {};

        const advocateName = fieldVal('#advocateName');
        if (!advocateName) {
            errors.advocateName = 'Advocate name is required.';
        } else if (advocateName.length < 2) {
            errors.advocateName = 'Advocate name must be at least 2 characters.';
        }

        const fatherName = fieldVal('#fatherName');
        if (!fatherName) {
            errors.fatherName = "Father's name is required.";
        }

        const enrolmentNo = fieldVal('#enrolmentNo').toUpperCase();
        $('#enrolmentNo').val(enrolmentNo);
        if (!enrolmentNo) {
            errors.enrolmentNo = 'Bar Council enrolment number is required.';
        } else if (!ENROLMENT_REGEX.test(enrolmentNo)) {
            errors.enrolmentNo = 'Invalid format. Use AB/1234/YY';
        }

        const enrolmentNoSr = fieldVal('#enrolmentnosr').toUpperCase();
        if ($('#enrolmentnosr').length) {
            $('#enrolmentnosr').val(enrolmentNoSr);
            if (enrolmentNoSr && !ENROLMENT_SR_REGEX.test(enrolmentNoSr)) {
                errors.enrolmentnosr = 'Invalid format. Use AB/1234/YYSR';
            }
        }

        const enrolmentDate = fieldVal('#enrolmentDate');
        if (!enrolmentDate) {
            errors.enrolmentDate = 'Enrolment date is required.';
        } else if (!isValidDate(enrolmentDate)) {
            errors.enrolmentDate = 'Enter a valid enrolment date.';
        } else {
            const enrolDt = parseLocalDate(enrolmentDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (enrolDt > today) {
                errors.enrolmentDate = 'Enrolment date cannot be in the future.';
            }
        }

        const pan = fieldVal('#pan').toUpperCase();
        $('#pan').val(pan);
        if (!pan) {
            errors.pan = 'PAN number is required.';
        } else if (!isValidPan(pan)) {
            errors.pan = 'Enter a valid PAN (format: ABCDE1234F).';
        }

        const expyears = fieldVal('#expyears');
        if (expyears === '') {
            errors.expyears = 'Total years of practice is required.';
        } else if (isNaN(expyears) || Number(expyears) < 0 || Number(expyears) > 50) {
            errors.expyears = 'Years of practice must be between 0 and 50.';
        }

        const mobile = fieldVal('#mobile');
        if (!mobile) {
            errors.mobile = 'Mobile number is required.';
        } else if (!MOBILE_REGEX.test(mobile)) {
            errors.mobile = 'Enter a valid 10-digit mobile number starting with 6–9.';
        } else if (!mobileVerified) {
            errors.mobile = 'Please verify your mobile number using OTP.';
        }

        const phone = fieldVal('#phone').replace(/\D/g, '');
        if (phone && (phone.length < 10 || phone.length > 15)) {
            errors.phone = 'Enter a valid phone number.';
        }

        const email = fieldVal('#email');
        if (!email) {
            errors.email = 'Email is required.';
        } else if (!EMAIL_REGEX.test(email)) {
            errors.email = 'Enter a valid email address.';
        }

        const gender = fieldVal('#gender');
        if (!['M', 'F', 'O'].includes(gender)) {
            errors.gender = 'Select a valid gender.';
        }

        const maritalStatus = fieldVal('#maritalStatus');
        if (!MARITAL_LABELS[maritalStatus]) {
            errors.maritalStatus = 'Select a valid marital status.';
        }

        const dob = fieldVal('#dob');
        if (!dob) {
            errors.dob = 'Date of birth is required.';
        } else if (!isValidDate(dob)) {
            errors.dob = 'Enter a valid date of birth.';
        } else if (ageFromDob(dob) < 18) {
            errors.dob = 'You must be at least 18 years old to register.';
        }

        const nationality = fieldVal('#nationality');
        if (!nationality) {
            errors.nationality = 'Nationality is required.';
        }

        const community = fieldVal('#community');
        if (!community) {
            errors.community = 'Community is required.';
        }

        const caste = fieldVal('#caste');
        if (community && !caste) {
            errors.caste = 'Caste is required.';
        }

        if (caste === 'Others') {
            const otherCaste = fieldVal('#otherCaste');
            if (!otherCaste) {
                errors.otherCaste = 'Please enter your caste name.';
            }
        }

        const captcha = fieldVal('#captcha');
        if (!captcha) {
            errors.captcha = 'Captcha is required.';
        }

        const keys = Object.keys(errors);
        if (keys.length) {
            showError(null, errors);
            keys.forEach(function (key) {
                const el = document.getElementById(key);
                if (el) {
                    el.classList.add('field-invalid');
                }
            });
            markInvalid(keys[0]);
            return null;
        }

        return {
            advocateName: advocateName,
            fatherName: fatherName,
            enrolmentNo: enrolmentNo,
            enrolmentNoSr: enrolmentNoSr,
            isSeniorAdvocate: !!enrolmentNoSr,
            enrolmentDate: enrolmentDate,
            pan: pan,
            expyears: Number(expyears),
            mobile: mobile,
            mobileVerified: mobileVerified,
            phone: fieldVal('#phone'),
            email: email,
            gender: gender,
            maritalStatus: maritalStatus,
            dob: dob,
            nationality: nationality,
            religion: fieldVal('#religion'),
            community: community,
            caste: caste,
            otherCaste: fieldVal('#otherCaste'),
            captcha: captcha
        };
    }

    function submitRegistration(payload) {
        const $btn = $('#btnlogin');
        const originalHtml = $btn.html();

        $btn.prop('disabled', true).html('<span class="main-text">Registering…</span>');

        return $.ajax({
            url: global.LawPortal.apiUrl('register'),
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            dataType: 'json'
        })
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
        $('#community').on('change', function () {
            const selected = $(this).val();
            const $caste = $('#caste');

            $caste.html('<option value="">Select Caste</option>');
            $('#otherCasteWrapper').hide();
            $('#otherCaste').val('').prop('required', false);

            if (!selected || !casteMaster[selected]) {
                return;
            }

            casteMaster[selected].forEach(function (name) {
                $caste.append($('<option></option>').val(name).text(name));
            });
        });

        $('#caste').on('change', function () {
            if ($(this).val() === 'Others') {
                $('#otherCasteWrapper').slideDown(200);
                $('#otherCaste').prop('required', true);
            } else {
                $('#otherCasteWrapper').slideUp(200);
                $('#otherCaste').prop('required', false).val('');
            }
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

    function initEnrolmentValidation() {
        $('#enrolmentNo').on('change', function () {
            const $el = $(this);
            const value = fieldVal('#enrolmentNo').toUpperCase();
            $el.val(value);

            if (!value) {
                return;
            }

            if (!ENROLMENT_REGEX.test(value)) {
                showValidationAlert('Use format AB/1234/YY', 'Invalid Enrolment Number');
                $el.val('');
                $el.focus();
            }
        });

        if ($('#enrolmentnosr').length) {
            $('#enrolmentnosr').on('change', function () {
                const $el = $(this);
                const value = fieldVal('#enrolmentnosr').toUpperCase();
                $el.val(value);

                if (!value) {
                    return;
                }

                if (!ENROLMENT_SR_REGEX.test(value)) {
                    showValidationAlert('Use format AB/1234/YYSR', 'Invalid Senior Advocate Enrolment');
                    $el.val('');
                    $el.focus();
                }
            });
        }
    }

    function initPanValidation() {
        $('#pan').on('input', function () {
            this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
        });

        $('#pan').on('change blur', function () {
            const $el = $(this);
            const value = fieldVal('#pan').toUpperCase();
            $el.val(value);

            if (!value) {
                return;
            }

            if (!isValidPan(value)) {
                showValidationAlert(
                    'PAN must be 10 characters: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F).',
                    'Invalid PAN'
                );
                $el.val('');
                $el.focus();
                markInvalid('pan');
            }
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
        return $.ajax({
            url: global.LawPortal.apiUrl('otp/send'),
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                mobile: mobile,
                purpose: OTP_PURPOSE
            }),
            dataType: 'json'
        });
    }

    function verifyOtpApi(mobile, otp) {
        return $.ajax({
            url: global.LawPortal.apiUrl('otp/verify'),
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                mobile: mobile,
                otp: otp,
                purpose: OTP_PURPOSE
            }),
            dataType: 'json'
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
            sendOtpBtn.disabled = true;
            sendOtpBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Sending...';

            requestOtp(mobile)
                .done(function (res) {
                    if (res && res.ok) {
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
                    sendOtpBtn.disabled = false;
                    sendOtpBtn.innerHTML = '<i class="bi bi-shield-check"></i> Verify';
                })
                .fail(function (xhr) {
                    let message = 'Failed to send OTP. Please try again.';
                    try {
                        const res = xhr.responseJSON;
                        if (res && res.errors) {
                            showError(null, res.errors);
                            markInvalid('mobile');
                            return;
                        }
                        if (res && res.error) {
                            message = res.error;
                        }
                    } catch (e) { /* ignore */ }
                    showError(message);
                    sendOtpBtn.disabled = false;
                    sendOtpBtn.innerHTML = '<i class="bi bi-shield-check"></i> Verify';
                })
                .always(function () {
                    otpSending = false;
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
        initEnrolmentValidation();
        initPanValidation();
        initOtpFlow();

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
