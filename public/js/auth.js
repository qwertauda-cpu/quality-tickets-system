// Authentication JavaScript

// Define API_BASE on window if not already defined
if (typeof window.API_BASE === 'undefined') {
    window.API_BASE = '/api';
}

// Only add event listener if login form exists
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');
    
    errorDiv.style.display = 'none';
    
    try {
        const response = await fetch(`${window.API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // حفظ بيانات المستخدم والـ token
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // توجيه حسب الدور
            const role = data.user.role;
            if (role === 'admin') {
                window.location.href = '/admin-dashboard.html';
            } else if (role === 'quality_staff') {
                window.location.href = '/quality-staff.html';
            } else if (role === 'team_leader' || role === 'technician') {
                window.location.href = '/technician-dashboard.html';
            } else if (role === 'accountant') {
                window.location.href = '/accountant-dashboard.html';
            } else {
                window.location.href = '/index.html';
            }
        } else {
            errorDiv.textContent = data.error || 'خطأ في تسجيل الدخول';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'حدث خطأ أثناء الاتصال بالخادم';
        errorDiv.style.display = 'block';
    }
    });
}

// Helper function to get auth token
function getAuthToken() {
    return localStorage.getItem('token');
}

// Helper function to get current user
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Helper function to check if user is authenticated
function isAuthenticated() {
    return !!getAuthToken();
}

// Helper function to logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

// Make functions available globally
window.getAuthToken = getAuthToken;
window.getCurrentUser = getCurrentUser;
window.isAuthenticated = isAuthenticated;
window.logout = logout;

