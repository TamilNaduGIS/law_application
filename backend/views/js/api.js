
const SecureAPI = {
    encrypt: (data, key) => {
        const iv = CryptoJS.lib.WordArray.random(16);
        const encrypted = CryptoJS.AES.encrypt(data, CryptoJS.enc.Hex.parse(key), {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        const combined = iv.concat(encrypted.ciphertext);
        return CryptoJS.enc.Base64.stringify(combined);
    },

    decrypt: (base64Data, key) => {
        const combined = CryptoJS.enc.Base64.parse(base64Data);
        
        // Extract IV (first 16 bytes / 4 words)
        const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
        
        // Extract Ciphertext (everything after first 16 bytes)
        const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4), combined.sigBytes - 16);
        
        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: ciphertext },
            CryptoJS.enc.Hex.parse(key),
            {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        );
        return decrypted.toString(CryptoJS.enc.Utf8);
    },

    request: async (url, method, data = null) => {
        let token = localStorage.getItem('access_token');
        const encryptionKey = sessionStorage.getItem('encryption_key');
        const csrfToken = sessionStorage.getItem('csrf_token');

        let payload = null;
        if (data && encryptionKey) {
            payload = SecureAPI.encrypt(JSON.stringify(data), encryptionKey);
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-CSRF-Token': csrfToken
        };

        let response = await fetch(url, {
            method: method,
            credentials: 'include',
            headers: headers,
            body: payload ? JSON.stringify({ payload: payload }) : null
        });

        // Handle Token Expiry (401)
        if (response.status === 401) {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                console.log("Access token expired, attempting to refresh...");
                const refreshRes = await fetch(`${API_BASE_URL}/refresh`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken })
                });

                if (refreshRes.ok) {
                    const refreshResult = await refreshRes.json();
                    localStorage.setItem('access_token', refreshResult.access_token);
                    if (refreshResult.refresh_token) {
                        localStorage.setItem('refresh_token', refreshResult.refresh_token);
                    }
                    console.log("Token refreshed successfully!");
                    
                    // Retry original request with new token
                    headers['Authorization'] = `Bearer ${refreshResult.access_token}`;
                    response = await fetch(url, {
                        method: method,
                        credentials: 'include',
                        headers: headers,
                        body: payload ? JSON.stringify({ payload: payload }) : null
                    });
                } else {
                    console.error("Refresh failed, session expired.");
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.reload();
                    return;
                }
            }
        }

        const result = await response.json();
        if (result.payload && encryptionKey) {
            const decrypted = SecureAPI.decrypt(result.payload, encryptionKey);
            return JSON.parse(decrypted);
        }
        return result;
    }
};
