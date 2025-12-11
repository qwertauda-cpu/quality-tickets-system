// Team Dashboard JavaScript

document.addEventListener('DOMContentLoaded', async () => {
    if (!isAuthenticated()) {
        window.location.href = '/index.html';
        return;
    }
    
    const user = getCurrentUser();
    document.getElementById('userName').textContent = user.full_name;
    document.getElementById('currentUser').textContent = user.full_name;
    
    // Setup navigation
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            if (page) {
                showPage(page);
            }
        });
    });
    
    await loadMyScores();
    await loadAllTeams();
});

function showPage(pageName) {
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'none';
    });
    
    const targetPage = document.getElementById(pageName + '-page');
    if (targetPage) {
        targetPage.style.display = 'block';
    }
    
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) {
            link.classList.add('active');
        }
    });
}

async function loadMyScores() {
    try {
        const user = getCurrentUser();
        if (user.team_id) {
            const today = new Date().toISOString().split('T')[0];
            const data = await api.getTeamScores(user.team_id, 'daily', today);
            
            if (data.success && data.scores && data.scores.length > 0) {
                const score = data.scores[0];
                document.getElementById('todayScore').textContent = (score.positive_points || 0) - (score.negative_points || 0);
                document.getElementById('ticketCount').textContent = score.ticket_count || 0;
            }
        }
    } catch (error) {
        console.error('Error loading my scores:', error);
    }
}

async function loadAllTeams() {
    try {
        const data = await api.getDashboard();
        if (data.success && data.teamRankings) {
            const tbody = document.getElementById('allTeamsTableBody');
            tbody.innerHTML = '';
            
            data.teamRankings.forEach((team, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${team.name}</td>
                    <td>${team.total_points || 0}</td>
                    <td>${team.total_tickets || 0}</td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading all teams:', error);
    }
}

function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.mobile-menu-overlay');
    
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
    
    if (overlay) {
        overlay.classList.toggle('active');
    }
}

window.showPage = showPage;
window.toggleMobileMenu = toggleMobileMenu;

