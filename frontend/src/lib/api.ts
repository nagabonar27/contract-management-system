import axios from 'axios';

// For Vercel Deployment Mockup: Use internal Next.js API routes
// For Local Python Backend: Use 'http://127.0.0.1:5000/api'
const API_BASE_URL = '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const endpoints = {
    dashboard: '/dashboard',
    contracts: '/contracts',
    active: '/active',
};

export default api;
