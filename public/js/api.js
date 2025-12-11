// API Helper Functions

// Use existing API_BASE if defined, otherwise define it
const API_BASE = window.API_BASE || '/api';

async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token || ''
        }
    };
    
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, finalOptions);
        const data = await response.json();
        
        if (response.status === 401) {
            // Unauthorized - redirect to login
            window.location.href = '/index.html';
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// API Methods
const api = {
    // Dashboard
    getDashboard: () => apiRequest('/dashboard'),
    
    // Teams
    getTeams: () => apiRequest('/teams'),
    getTeamScores: (teamId, period = 'daily', date = null) => {
        const params = new URLSearchParams({ period });
        if (date) params.append('date', date);
        return apiRequest(`/teams/${teamId}/scores?${params}`);
    },
    
    // Tickets
    getTickets: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/tickets?${queryString}`);
    },
    getTicket: (id) => apiRequest(`/tickets/${id}`),
    createTicket: (data) => apiRequest('/tickets', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateTicket: (id, data) => apiRequest(`/tickets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    
    // Photos
    uploadPhotos: (ticketId, formData) => {
        const token = localStorage.getItem('token');
        return fetch(`${API_BASE}/tickets/${ticketId}/photos`, {
            method: 'POST',
            headers: {
                'Authorization': token || ''
            },
            body: formData
        }).then(res => res.json());
    },
    
    // Quality Review
    submitQualityReview: (ticketId, data) => apiRequest(`/tickets/${ticketId}/quality-review`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    
    // Messages
    generateMessage: (ticketId, messageType = null) => {
        const params = messageType ? `?message_type=${messageType}` : '';
        return apiRequest(`/tickets/${ticketId}/generate-message${params}`);
    },
    
    // Reports
    generateDailyPDF: (date = null) => {
        const params = date ? `?date=${date}` : '';
        return apiRequest(`/reports/daily-pdf${params}`);
    },
    
    // Ticket Types
    getTicketTypes: () => apiRequest('/ticket-types')
};

// Make API available globally
window.api = api;

