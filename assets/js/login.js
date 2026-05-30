/**
 * Applicant login — sp_applicant_login + OTP verify.
 */
(function ($, global) {
    'use strict';

    const MOBILE_REGEX = /^[6-9]\d{9}$/;
    const ENROLMENT_REGEX = /^[A-Z]{2}\/[0-9]{1,5}\/[0-9]{2,4}$/;
    const OTP_TIMER_SECONDS = 300;

    let loginContext = null;
    let otpTimer = null;
    let otpCountdown = OTP_TIMER_SECONDS;

    const otpModal = new bootstrap.Modal(document.getElementById('otpModal'));

    function fieldVal(id) {
        const el = document.getElementById(id);
        if (!el) {
            return '';
        }
        return String(el.value || '').trim();
    }

    function showError(message) {
        const errorEl = document.getElementById('errorMsg');
        const successEl = document.getElementById('successMsg');
        if (successEl) {
            successEl.style.display = 'none';
        }
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }

    function showSuccess(message) {
        const errorEl = document.getElementById('errorMsg');
        const successEl = document.getElementById('successMsg');
        if (errorEl) {
            errorEl.style.display = 'none';
        }
        if (successEl) {
            successEl.textContent = message;
            successEl.style.display = 'block';
        }
    }

    function clearMessages() {
        ['errorMsg', 'successMsg'].forEach(function (id) {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'none';
                el.textContent = '';
            }
        });
    }

    function getEnteredOtp() {
        let otp = '';
        document.querySelectorAll('.otp-box').forEach(function (box) {
            otp += box.value;
        });
        return otp;
    }

    function resetOtpBoxes() {
        document.querySelectorAll('.otp-box').forEach(function (box) {
            box.value = '';
        });
    }

    function startOtpTimer() {
        clearInterval(otpTimer);
        otpCountdown = OTP_TIMER_SECONDS;

        const resendBtn = document.getElementById('resendBtn');
        const timerText = document.getElementById('timerText');

        if (resendBtn) {
            resendBtn.style.display = 'none';
        }

        otpTimer = setInterval(function () {
            otpCountdown--;

            if (timerText) {
                timerText.textContent = otpCountdown > 0
                    ? 'Resend OTP in ' + otpCountdown + 's'
                    : '';
            }

            if (otpCountdown <= 0) {
                clearInterval(otpTimer);
                if (resendBtn) {
                    resendBtn.style.display = 'inline-block';
                }
            }
        }, 1000);
    }

    function requestLoginOtp(enrollmentNo, mobile) {
        return global.LawPortal.apiAjax('login', 'POST', {
            enrollment_no: enrollmentNo,
            mobile: mobile
        });
    }

    function resendLoginOtp(mobile) {
        return global.LawPortal.apiAjax('otp/send', 'POST', {
            mobile: mobile,
            purpose: 'login'
        });
    }

    function verifyLoginOtp(payload) {
        return global.LawPortal.apiAjax('login/verify', 'POST', payload);
    }

    function openOtpModal() {
        resetOtpBoxes();
        startOtpTimer();
        otpModal.show();

        const firstBox = document.getElementById('otpbox1');
        if (firstBox) {
            firstBox.focus();
        }
    }

    function saveSession(session) {
        if (global.LawPortal && typeof global.LawPortal.saveAuthSession === 'function') {
            global.LawPortal.saveAuthSession(session);
            return;
        }
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('applicantId', session.applicant_id || '');
        sessionStorage.setItem('enrolmentNo', session.enrollment_no || '');
        sessionStorage.setItem('mobile', session.mobile || '');
    }

    $(function () {
        if (typeof applyInputValidation === 'function') {
            applyInputValidation('enrolmentNumber', [11]);
            applyInputValidation('mobileNumber', [3]);
            applyInputValidation('otpbox1', [2]);
            applyInputValidation('otpbox2', [2]);
            applyInputValidation('otpbox3', [2]);
            applyInputValidation('otpbox4', [2]);
            applyInputValidation('otpbox5', [2]);
            applyInputValidation('otpbox6', [2]);
        }

        if (new URLSearchParams(global.location.search).get('registered') === '1') {
            showSuccess('Account created successfully. Please log in with your enrolment number and mobile.');
        }

        document.querySelectorAll('.otp-box').forEach(function (input, index) {
            const boxes = document.querySelectorAll('.otp-box');

            input.addEventListener('input', function () {
                this.value = this.value.replace(/[^0-9]/g, '');
                if (this.value && boxes[index + 1]) {
                    boxes[index + 1].focus();
                }
            });

            input.addEventListener('keydown', function (e) {
                if (e.key === 'Backspace' && !this.value && boxes[index - 1]) {
                    boxes[index - 1].focus();
                }
            });
        });

        $('#loginForm').on('submit', function (e) {
            e.preventDefault();
            clearMessages();

            const enrollmentNo = fieldVal('enrolmentNumber').toUpperCase();
            const mobile = fieldVal('mobileNumber');

            $('#enrolmentNumber').val(enrollmentNo);

            if (!ENROLMENT_REGEX.test(enrollmentNo)) {
                showError('Enter a valid Bar Council enrolment number (e.g. MS/1234/2015).');
                return;
            }

            if (!MOBILE_REGEX.test(mobile)) {
                showError('Enter a valid 10-digit mobile number starting with 6–9.');
                return;
            }

            const $btn = $(this).find('button[type="submit"]');
            const originalText = $btn.text();
            $btn.prop('disabled', true).text('Sending OTP...');

            requestLoginOtp(enrollmentNo, mobile)
                .done(function (res) {
                    if (res && res.ok) {
                        loginContext = {
                            enrollment_no: enrollmentNo,
                            mobile: mobile,
                            applicant_id: res.applicant_id || null
                        };
                        openOtpModal();
                        return;
                    }
                    showError((res && res.error) || 'Login failed. Please check your details.');
                })
                .fail(function (xhr) {
                    let message = 'Unable to login. Please try again.';
                    const res = xhr.responseJSON;
                    if (res && res.errors) {
                        message = Object.values(res.errors).join(' ');
                    } else if (res && res.error) {
                        message = res.error;
                    }
                    showError(message);
                })
                .always(function () {
                    $btn.prop('disabled', false).text(originalText);
                });
        });

        $('#resendBtn').on('click', function () {
            if (!loginContext) {
                return;
            }

            resendLoginOtp(loginContext.mobile)
                .done(function (res) {
                    if (res && res.ok) {
                        resetOtpBoxes();
                        startOtpTimer();
                        if (global.LawPortal && global.LawPortal.alert) {
                            global.LawPortal.alert({
                                icon: 'success',
                                title: 'OTP Sent',
                                text: 'OTP resent successfully'
                            });
                        }
                        return;
                    }
                    showError((res && res.error) || 'Failed to resend OTP.');
                })
                .fail(function (xhr) {
                    const message = (xhr.responseJSON && xhr.responseJSON.error)
                        || 'Failed to resend OTP.';
                    showError(message);
                });
        });

        $('#verifyOtpBtn').on('click', function () {
            if (!loginContext) {
                showError('Please request OTP again.');
                return;
            }

            const otp = getEnteredOtp();
            if (otp.length !== 6) {
                if (global.LawPortal && global.LawPortal.alert) {
                    global.LawPortal.alert({
                        icon: 'error',
                        title: 'Invalid OTP',
                        text: 'Enter the 6-digit OTP.'
                    });
                } else {
                    showError('Enter the 6-digit OTP.');
                }
                return;
            }

            const $btn = $('#verifyOtpBtn');
            $btn.prop('disabled', true).text('Verifying...');

            verifyLoginOtp({
                mobile: loginContext.mobile,
                enrollment_no: loginContext.enrollment_no,
                applicant_id: loginContext.applicant_id,
                otp: otp
            })
                .done(function (res) {
                    if (res && res.ok && res.session) {
                        saveSession(res.session);
                        otpModal.hide();
                        global.location.href = 'dashboard.html';
                        return;
                    }
                    showError((res && res.error) || 'OTP verification failed.');
                })
                .fail(function (xhr) {
                    const message = (xhr.responseJSON && xhr.responseJSON.error)
                        || 'OTP verification failed.';
                    if (global.LawPortal && global.LawPortal.alert) {
                        global.LawPortal.alert({
                            icon: 'error',
                            title: 'Verification Failed',
                            text: message
                        });
                    } else {
                        showError(message);
                    }
                })
                .always(function () {
                    $btn.prop('disabled', false).text('Verify OTP');
                });
        });
    });
})(jQuery, window);
