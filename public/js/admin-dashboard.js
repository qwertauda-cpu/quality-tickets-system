// Admin Dashboard JavaScript

// Wait for scripts to load
function initAdminDashboard() {
    // Check if required functions are available
    if (typeof isAuthenticated === 'undefined' || typeof getCurrentUser === 'undefined') {
        setTimeout(initAdminDashboard, 100);
        return;
    }
    
    // Wait for api to be available
    if (typeof window.api === 'undefined') {
        setTimeout(initAdminDashboard, 100);
        return;
    }
    
    if (!isAuthenticated()) {
        window.location.href = '/index.html';
        return;
    }
    
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
        alert('غير مصرح لك بالوصول إلى هذه الصفحة');
        window.location.href = '/quality-staff.html';
        return;
    }
    
    document.getElementById('userName').textContent = user.full_name;
    document.getElementById('currentUser').textContent = user.full_name;
    
    // Setup navigation
    setupNavigation();
    
    loadDashboard();
}

function setupNavigation() {
    document.querySelectorAll('.sidebar-menu a[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            showPage(page);
        });
    });
}

function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'none';
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageName + '-page');
    if (targetPage) {
        targetPage.style.display = 'block';
    }
    
    // Update active menu item
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) {
            link.classList.add('active');
        }
    });
    
    // Update page title
    const titles = {
        'dashboard': 'لوحة التحكم',
        'teams': 'الفرق',
        'tickets': 'التكتات',
        'reports': 'التقارير'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) {
        titleEl.textContent = titles[pageName] || 'لوحة التحكم';
    }
    
    // Load page data
    if (pageName === 'dashboard') {
        loadDashboard();
    } else if (pageName === 'teams') {
        loadTeams();
    } else if (pageName === 'tickets') {
        loadTickets();
    } else if (pageName === 'reports') {
        loadReports();
    }
}

function loadTeams() {
    // TODO: Implement teams page
    console.log('Loading teams...');
}

function loadTickets() {
    // TODO: Implement tickets page
    console.log('Loading tickets...');
}

function loadReports() {
    // TODO: Implement reports page
    console.log('Loading reports...');
}

document.addEventListener('DOMContentLoaded', initAdminDashboard);

async function loadDashboard() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        const data = await window.api.getDashboard();
        if (!data) {
            console.error('No data returned from API');
            return;
        }
        if (data.success) {
            // Update stats
            const totalTickets = data.todayStats.reduce((sum, stat) => sum + (stat.total_tickets || 0), 0);
            const completedTickets = data.todayStats.reduce((sum, stat) => sum + (stat.completed_tickets || 0), 0);
            
            document.getElementById('totalTickets').textContent = totalTickets;
            document.getElementById('completedTickets').textContent = completedTickets;
            document.getElementById('pendingTickets').textContent = totalTickets - completedTickets;
            
            // Update rankings
            const tbody = document.getElementById('rankingsTableBody');
            tbody.innerHTML = '';
            
            if (data.teamRankings && data.teamRankings.length > 0) {
                data.teamRankings.forEach((team, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${team.name}</td>
                        <td>${team.total_points || 0}</td>
                        <td>${team.total_tickets || 0}</td>
                        <td>${team.total_points || 0}</td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="loading">لا توجد بيانات</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

