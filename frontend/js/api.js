const API_BASE = 'http://localhost:8000/api';

async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        }
    });
    if (!response.ok) throw new Error('API Error');
    return response.json();
}