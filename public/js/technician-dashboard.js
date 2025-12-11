// Technician Dashboard JavaScript

function initTechnicianDashboard() {
    // Check if required functions are available
    if (typeof isAuthenticated === 'undefined' || typeof getCurrentUser === 'undefined') {
        setTimeout(initTechnicianDashboard, 100);
        return;
    }
    
    // Wait for api to be available
    if (typeof window.api === 'undefined') {
        setTimeout(initTechnicianDashboard, 100);
        return;
    }
    
    if (!isAuthenticated()) {
        window.location.href = '/index.html';
        return;
    }
    
    const user = getCurrentUser();
    if (user.role !== 'technician' && user.role !== 'team_leader') {
        alert('غير مصرح لك بالوصول إلى هذه الصفحة');
        window.location.href = '/index.html';
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
        'rankings': 'تصنيف الفرق',
        'my-team': 'فريقي'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) {
        titleEl.textContent = titles[pageName] || 'لوحة التحكم';
    }
    
    // Load page data
    if (pageName === 'dashboard') {
        loadDashboard();
    } else if (pageName === 'rankings') {
        loadRankings();
    } else if (pageName === 'my-team') {
        loadMyTeam();
    }
}

async function loadDashboard() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        const data = await window.api.getMyTeam();
        if (data && data.success) {
            if (data.team) {
                // Update stats
                document.getElementById('myTeamPoints').textContent = data.scores.today_points || 0;
                document.getElementById('myTeamTickets').textContent = data.scores.today_tickets || 0;
                document.getElementById('myTeamPositive').textContent = '+' + (data.scores.today_positive || 0);
                document.getElementById('myTeamNegative').textContent = '-' + (data.scores.today_negative || 0);
                
                // Update team info
                const teamInfo = document.getElementById('teamInfo');
                teamInfo.innerHTML = `
                    <p><strong>اسم الفريق:</strong> ${data.team.name}</p>
                    <p><strong>الوردية:</strong> ${data.team.shift === 'morning' ? 'صباحي' : 'مسائي'}</p>
                    <p><strong>عدد الأعضاء:</strong> ${data.members.length}</p>
                    <p><strong>حد الربط اليومي:</strong> ${data.team.max_connection_limit || 7}</p>
                    <p><strong>حد الصيانة اليومي:</strong> ${data.team.max_maintenance_limit || 15}</p>
                `;
            } else {
                document.getElementById('teamInfo').innerHTML = '<p>لم يتم تعيينك في فريق</p>';
            }
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadRankings() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        const period = document.getElementById('rankingsPeriod')?.value || 'daily';
        const date = document.getElementById('rankingsDate')?.value || new Date().toISOString().split('T')[0];
        
        const data = await window.api.getTeamRankings(period, date);
        if (data && data.success) {
            const tbody = document.getElementById('rankingsTableBody');
            tbody.innerHTML = '';
            
            if (data.rankings && data.rankings.length > 0) {
                data.rankings.forEach((team, index) => {
                    const row = document.createElement('tr');
                    const isMyTeam = team.id == getCurrentUser().team_id;
                    row.style.backgroundColor = isMyTeam ? 'rgba(79, 70, 229, 0.1)' : '';
                    row.style.fontWeight = isMyTeam ? 'bold' : 'normal';
                    
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${team.name} ${isMyTeam ? '⭐ (فريقي)' : ''}</td>
                        <td>${team.shift === 'morning' ? 'صباحي' : 'مسائي'}</td>
                        <td><strong>${team.total_points}</strong></td>
                        <td>${team.total_tickets}</td>
                        <td style="color: #10b981;">+${team.positive_points}</td>
                        <td style="color: #ef4444;">-${team.negative_points}</td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="7" class="loading">لا توجد بيانات</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading rankings:', error);
    }
}

async function loadMyTeam() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        const data = await window.api.getMyTeam();
        if (data && data.success) {
            const membersDiv = document.getElementById('teamMembers');
            
            if (data.members && data.members.length > 0) {
                let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">';
                data.members.forEach(member => {
                    html += `
                        <div style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
                            <p><strong>${member.full_name}</strong></p>
                            <p style="color: var(--text-muted); font-size: 12px;">${member.role === 'team_leader' ? 'قائد فريق' : 'عامل'}</p>
                        </div>
                    `;
                });
                html += '</div>';
                membersDiv.innerHTML = html;
            } else {
                membersDiv.innerHTML = '<p>لا يوجد أعضاء في الفريق</p>';
            }
        }
    } catch (error) {
        console.error('Error loading team members:', error);
    }
}

// Setup filters
document.addEventListener('DOMContentLoaded', () => {
    const rankingsPeriod = document.getElementById('rankingsPeriod');
    const rankingsDate = document.getElementById('rankingsDate');
    
    if (rankingsPeriod) {
        rankingsPeriod.addEventListener('change', loadRankings);
    }
    if (rankingsDate) {
        rankingsDate.value = new Date().toISOString().split('T')[0];
        rankingsDate.addEventListener('change', loadRankings);
    }
});

document.addEventListener('DOMContentLoaded', initTechnicianDashboard);

