const API_BASE = '/api/v1';

let _token = localStorage.getItem('wfc_token') || null;

function getToken() {
    return _token;
}

function setToken(token) {
    _token = token;
    localStorage.setItem('wfc_token', token);
}

function clearToken() {
    _token = null;
    localStorage.removeItem('wfc_token');
    localStorage.removeItem('wfc_store');
}

function getStore() {
    try {
        return JSON.parse(localStorage.getItem('wfc_store'));
    } catch {
        return null;
    }
}

function setStore(store) {
    localStorage.setItem('wfc_store', JSON.stringify(store));
}

async function api(endpoint, options = {}) {
    const token = _token || getToken();

    // Don't set Content-Type for FormData (let browser set it with boundary)
    const isFormData = options.body instanceof FormData;

    const headers = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
    };

    // Remove Content-Type for FormData
    if (isFormData && headers['Content-Type']) {
        delete headers['Content-Type'];
    }

    const config = {
        ...options,
        headers
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (response.status === 401) {
        // Only clear session if not attempting to authenticate
        if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
            clearToken();
            window.location.href = '/';
            throw new Error('Session expired');
        }
    }

    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }

    return data;
}

export { api, getToken, setToken, clearToken, getStore, setStore };
