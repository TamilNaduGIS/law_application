$(document).ready(function () {
    
    // Load CAPTCHA
    async function loadCaptcha() {
        try {
            const response = await $.ajax({
                url: `${API_BASE_URL}/captcha`,
                method: 'GET',
                xhrFields: { withCredentials: true }
            });
            $('#captchaImage').attr('src', response.captcha);
            $('#captchaToken').val(response.token);
        } catch (e) {
            console.error('Failed to load CAPTCHA', e);
        }
    }

    if ($('#captchaImage').length) {
        loadCaptcha();
        $('#captchaImage').on('click', loadCaptcha);
    }

    // Portal link login from URL (?details=<base64>)
    const urlParams = new URLSearchParams(window.location.search);
    const Details = urlParams.get('details');

    if (Details) {
        handlePortalLogin(Details);
    }

    async function handlePortalLogin(details) {
        $('#loginForm').addClass('d-none');
        $('#portalLoading').removeClass('d-none');

        try {
            const response = await $.ajax({
                url: `${API_BASE_URL}/portal-login`,
                method: 'POST',
                contentType: 'application/json',
                xhrFields: { withCredentials: true },
                data: JSON.stringify({ details: details })
            });

            saveSession(response);
            $('#portalLoading').addClass('d-none');
            $('#secureArea').removeClass('d-none');

        } catch (xhr) {
            $('#portalLoading').addClass('d-none');
            $('#loginForm').removeClass('d-none');
            let errorMsg = 'Portal login failed';
            if (xhr.responseJSON && xhr.responseJSON.error) {
                errorMsg += ': ' + xhr.responseJSON.error;
            }
            alert(errorMsg);
            loadCaptcha();
        }
    }

    function saveSession(response) {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        sessionStorage.setItem('encryption_key', response.encryption_key);
        sessionStorage.setItem('csrf_token', response.csrf_token);
        sessionStorage.setItem('user_details', JSON.stringify(response.details));
        if (response.module) {
            sessionStorage.setItem('auth_module', response.module);
        }
        if (response.content) {
            sessionStorage.setItem('portal_content', JSON.stringify(response.content));
        }
        if (response.institute_details) {
            sessionStorage.setItem('institute_details', JSON.stringify(response.institute_details));
        }
    }

    // LOGIN
    $('#loginBtn').on('click', async function () {
        const username = $('#email').val();
        const password = $('#password').val();
        const token = $('#captchaToken').val();
        const captcha = $('#captcha').val();

        try {
            const response = await $.ajax({
                url: `${API_BASE_URL}/login`,
                method: 'POST',
                contentType: 'application/json',
                xhrFields: { withCredentials: true },
                data: JSON.stringify({ username, password, token, captcha })
            });

            saveSession(response);
            $('#secureArea').removeClass('d-none');
            $('#loginForm').addClass('d-none');

            alert('Login Successful!');

        } catch (xhr) {
            let errorMsg = 'Login Failed';
            if (xhr.responseJSON && xhr.responseJSON.error) {
                errorMsg += ': ' + xhr.responseJSON.error;
            }
            alert(errorMsg);
            loadCaptcha();
        }
    });

    // LOGOUT
    $('#logoutBtn').on('click', async function () {
        try {
            await SecureAPI.request(
                `${API_BASE_URL}/logout`,
                'POST'
            );
        } catch (e) {
            console.warn('Logout API failed, continuing cleanup...');
        }

        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.clear();
        location.reload();
    });

});
