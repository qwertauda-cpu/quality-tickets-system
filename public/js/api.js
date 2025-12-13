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
        const fullUrl = `${window.API_BASE}${endpoint}`;
        const response = await fetch(fullUrl, finalOptions);
        const data = await response.json();
        
        if (response.status === 401) {
            // Unauthorized - redirect to login
            window.location.href = '/index.html';
            return null;
        }
        
        // إذا كان هناك خطأ (400, 500, إلخ)، نرمي خطأ يحتوي على الرسالة
        if (!response.ok) {
            const error = new Error(data.error || 'حدث خطأ');
            error.status = response.status;
            error.data = data;
            throw error;
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
    getTechniciansByTeam: (teamId) => apiRequest(`/teams/${teamId}/technicians`),
    getTeamMembers: (teamId) => apiRequest(`/teams/${teamId}/members`),
    
    // Tickets
    getTickets: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/tickets?${queryString}`);
    },
    getTicket: (id) => apiRequest(`/tickets/${id}`),
    checkTicketExists: (ticketNumber) => apiRequest(`/tickets/check/${ticketNumber}`),
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
    permanentlyDeleteUser: (id) => apiRequest(`/users/${id}/permanent`, {
        method: 'DELETE'
    }),
    freezeUser: (id, isFrozen) => apiRequest(`/users/${id}/freeze`, {
        method: 'PUT',
        body: JSON.stringify({ is_frozen: isFrozen })
    }),
    
    // Team Rankings (for technicians)
    getTeamRankings: (period = 'daily', date = null) => {
        const params = new URLSearchParams({ period });
        if (date) params.append('date', date);
        return apiRequest(`/team-rankings?${params}`);
    },
    getMyTeam: () => apiRequest('/my-team'),
    
    // Technician endpoints
    getTechnicianTickets: (status = null) => {
        const params = status ? `?status=${status}` : '';
        return apiRequest(`/technician/tickets${params}`);
    },
    startTechnicianWork: (ticketId) => apiRequest(`/technician/tickets/${ticketId}/start-work`, {
        method: 'POST'
    }),
    completeTechnicianTicket: (ticketId) => apiRequest(`/technician/tickets/${ticketId}/complete`, {
        method: 'POST'
    }),
    
    // Quality Staff endpoints
    assignTicketToTechnician: (ticketId, data) => apiRequest(`/tickets/${ticketId}/assign-to-technician`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    reviewTicket: (ticketId, data) => apiRequest(`/tickets/${ticketId}/review`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    
    // Agent & Call Center
    getMyAssignedTickets: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/tickets/assigned?${queryString}`);
    },
    updateTicketAssignment: (ticketId, data) => apiRequest(`/tickets/${ticketId}/assignment`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    assignTicket: (ticketId, data) => apiRequest(`/tickets/${ticketId}/assign`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    
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
    getSettings: () => apiRequest('/owner/settings'),
    saveSettings: (settings) => apiRequest('/owner/settings', { method: 'POST', body: JSON.stringify(settings) }),
    getWhatsAppQR: () => apiRequest('/owner/whatsapp-qr'),
    logoutWhatsApp: () => apiRequest('/owner/whatsapp-logout', { method: 'POST' }),
    sendManualWhatsAppMessages: (data) => apiRequest('/owner/send-whatsapp-messages', { method: 'POST', body: JSON.stringify(data) }),
    exportDatabase: (tables = []) => {
        const params = tables.length > 0 ? `?tables=${tables.join(',')}` : '';
        return fetch(`${window.API_BASE}/export/database${params}`, {
            headers: {
                'Authorization': localStorage.getItem('token') || ''
            }
        }).then(res => {
            if (res.ok) {
                return res.blob().then(blob => {
                    // Use createObjectURL with proper error handling
                    // Note: This may show a warning on HTTP (not HTTPS) but will still work
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `database-export-${new Date().toISOString().split('T')[0]}.sql`;
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    
                    // Clean up immediately to reduce security warning
                    setTimeout(() => {
                        try {
                            window.URL.revokeObjectURL(url);
                            if (document.body.contains(a)) {
                                document.body.removeChild(a);
                            }
                        } catch (e) {
                            // Ignore cleanup errors
                        }
                    }, 0);
                    
                    return { success: true };
                });
            }
            return res.json();
        });
    }
};

// Points Management API
api.saveTicketPoints = async (ticketId, pointsData) => {
    return await apiRequest(`/admin/tickets/${ticketId}/points`, {
        method: 'POST',
        body: JSON.stringify(pointsData)
    });
};

api.getTicketPoints = async (ticketId) => {
    return await apiRequest(`/tickets/${ticketId}/points`);
};

api.deleteTicketPoints = async (ticketId) => {
    return await apiRequest(`/admin/tickets/${ticketId}/points`, {
        method: 'DELETE'
    });
};

api.calculateTimePoints = async (ticketId) => {
    return await apiRequest(`/admin/tickets/${ticketId}/calculate-time-points`);
};

// Scoring Rules API
api.getScoringRules = async () => {
    return await apiRequest('/admin/scoring-rules');
};

api.updateScoringRule = async (ruleId, data) => {
    return await apiRequest(`/admin/scoring-rules/${ruleId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
};

api.createScoringRule = async (data) => {
    return await apiRequest('/admin/scoring-rules', {
        method: 'POST',
        body: JSON.stringify(data)
    });
};

// Get scoring rules (for all users - used in quality staff)
api.getScoringRules = async () => {
    return await apiRequest('/scoring-rules');
};

// Owner Dashboard API
api.getOwnerDashboard = () => apiRequest('/owner/dashboard');
api.getOwnerCompanies = () => apiRequest('/owner/companies');
api.createCompany = (data) => apiRequest('/owner/companies', {
    method: 'POST',
    body: JSON.stringify(data)
});
api.updateCompany = (id, data) => apiRequest(`/owner/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
});
api.getOwnerEmployees = (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/owner/employees?${queryString}`);
};
api.getOwnerInvoices = (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/owner/invoices?${queryString}`);
};
api.createInvoice = (data) => apiRequest('/owner/invoices', {
    method: 'POST',
    body: JSON.stringify(data)
});
api.updateInvoiceStatus = (id, data) => apiRequest(`/owner/invoices/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(data)
});
api.getOwnerPurchaseRequests = (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/owner/purchase-requests?${queryString}`);
};
api.updatePurchaseRequest = (id, data) => apiRequest(`/owner/purchase-requests/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
});
api.submitPurchaseRequest = (data) => apiRequest('/purchase-request', {
    method: 'POST',
    body: JSON.stringify(data)
});

// Admin Settings API
api.getAdminSettings = () => apiRequest('/admin/settings');
api.saveAdminSettings = (data) => apiRequest('/admin/settings', {
    method: 'POST',
    body: JSON.stringify(data)
});
api.getAdminWhatsAppQR = () => apiRequest('/admin/whatsapp-qr');
api.logoutAdminWhatsApp = () => apiRequest('/admin/whatsapp-logout', {
    method: 'POST'
});

// Make API available globally
window.api = api;

