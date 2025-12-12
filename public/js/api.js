// API Helper Functions

// Use existing API_BASE if defined, otherwise define it
if (typeof window.API_BASE === 'undefined') {
    window.API_BASE = '/api';
}

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
        const response = await fetch(`${window.API_BASE}${endpoint}`, finalOptions);
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
        return fetch(`${window.API_BASE}/tickets/${ticketId}/photos`, {
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
    getTicketTypes: () => apiRequest('/ticket-types'),
    
    // Users Management (Admin only)
    getUsers: () => apiRequest('/users'),
    createUser: (data) => apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateUser: (id, data) => apiRequest(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteUser: (id) => apiRequest(`/users/${id}`, {
        method: 'DELETE'
    }),
    
    // Team Rankings (for technicians)
    getTeamRankings: (period = 'daily', date = null) => {
        const params = new URLSearchParams({ period });
        if (date) params.append('date', date);
        return apiRequest(`/team-rankings?${params}`);
    },
    getMyTeam: () => apiRequest('/my-team'),
    
    // Notifications
    getNotifications: (unreadOnly = false) => {
        const params = unreadOnly ? '?unread_only=true' : '';
        return apiRequest(`/notifications${params}`);
    },
    markNotificationRead: (id) => apiRequest(`/notifications/${id}/read`, {
        method: 'PUT'
    }),
    markAllNotificationsRead: () => apiRequest('/notifications/read-all', {
        method: 'PUT'
    }),
    
    // Rewards (Accountant)
    getRewards: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/rewards?${queryString}`);
    },
    calculateRewards: (data) => apiRequest('/rewards/calculate', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateReward: (id, data) => apiRequest(`/rewards/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    
    // Database Export
    getExportTables: () => apiRequest('/export/tables'),
    exportDatabase: (tables = []) => {
        const params = tables.length > 0 ? `?tables=${tables.join(',')}` : '';
        return fetch(`${window.API_BASE}/export/database${params}`, {
            headers: {
                'Authorization': localStorage.getItem('token') || ''
            }
        }).then(res => {
            if (res.ok) {
                return res.blob().then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `database-export-${new Date().toISOString().split('T')[0]}.sql`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    return { success: true };
                });
            }
            return res.json();
        });
    }
};

// Make API available globally
window.api = api;

