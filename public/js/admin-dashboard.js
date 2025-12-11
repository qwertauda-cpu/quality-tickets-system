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

async function loadTeams() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        const data = await window.api.getTeams();
        if (data && data.success) {
            const tbody = document.getElementById('teamsTableBody');
            tbody.innerHTML = '';
            
            if (data.teams && data.teams.length > 0) {
                data.teams.forEach(team => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${team.name}</td>
                        <td>${team.shift === 'morning' ? 'صباحي' : 'مسائي'}</td>
                        <td>${team.member_count || 0}</td>
                        <td>${team.max_connection_limit || 7}</td>
                        <td>${team.max_maintenance_limit || 15}</td>
                        <td><span class="badge ${team.is_active ? 'badge-success' : 'badge-danger'}">${team.is_active ? 'نشط' : 'غير نشط'}</span></td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="6" class="loading">لا توجد فرق</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading teams:', error);
    }
}

async function loadTickets() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        const date = document.getElementById('ticketsDateFilter')?.value || '';
        const status = document.getElementById('ticketsStatusFilter')?.value || '';
        
        const params = {};
        if (date) params.date = date;
        if (status) params.status = status;
        
        const data = await window.api.getTickets(params);
        if (data && data.success) {
            const tbody = document.getElementById('ticketsTableBody');
            tbody.innerHTML = '';
            
            if (data.tickets && data.tickets.length > 0) {
                data.tickets.forEach(ticket => {
                    const netScore = (ticket.positive_points || 0) - (ticket.negative_points || 0);
                    const statusBadge = {
                        'pending': 'badge-warning',
                        'in_progress': 'badge-info',
                        'completed': 'badge-success',
                        'postponed': 'badge-danger',
                        'closed': 'badge-danger'
                    }[ticket.status] || 'badge-info';
                    
                    const statusText = {
                        'pending': 'معلقة',
                        'in_progress': 'قيد التنفيذ',
                        'completed': 'مكتملة',
                        'postponed': 'مؤجلة',
                        'closed': 'مغلقة'
                    }[ticket.status] || ticket.status;
                    
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${ticket.ticket_number}</td>
                        <td>${ticket.ticket_type_name || ''}</td>
                        <td>${ticket.team_name || ''}</td>
                        <td><span class="badge ${statusBadge}">${statusText}</span></td>
                        <td>${ticket.actual_time_minutes ? ticket.actual_time_minutes + ' دقيقة' : '-'}</td>
                        <td>${netScore}</td>
                        <td>${new Date(ticket.created_at).toLocaleDateString('ar-SA')}</td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="7" class="loading">لا توجد تكتات</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
    }
}

function loadReports() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('reportDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = today;
    }
}

async function generateDailyReport() {
    try {
        if (!window.api) {
            alert('API not available');
            return;
        }
        
        const date = document.getElementById('reportDate')?.value || new Date().toISOString().split('T')[0];
        const resultDiv = document.getElementById('reportResult');
        
        resultDiv.innerHTML = '<p>جاري توليد التقرير...</p>';
        
        const data = await window.api.generateDailyPDF(date);
        if (data && data.success) {
            resultDiv.innerHTML = `
                <div class="message-box">
                    <p>✅ تم توليد التقرير بنجاح</p>
                    <p><a href="${data.url}" target="_blank" class="btn btn-primary">تحميل التقرير</a></p>
                </div>
            `;
        } else {
            resultDiv.innerHTML = '<p class="error-message">❌ فشل في توليد التقرير</p>';
        }
    } catch (error) {
        console.error('Error generating report:', error);
        document.getElementById('reportResult').innerHTML = '<p class="error-message">❌ حدث خطأ في توليد التقرير</p>';
    }
}

// Setup filters
document.addEventListener('DOMContentLoaded', () => {
    const ticketsDateFilter = document.getElementById('ticketsDateFilter');
    const ticketsStatusFilter = document.getElementById('ticketsStatusFilter');
    
    if (ticketsDateFilter) {
        ticketsDateFilter.addEventListener('change', loadTickets);
    }
    if (ticketsStatusFilter) {
        ticketsStatusFilter.addEventListener('change', loadTickets);
    }
});

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

