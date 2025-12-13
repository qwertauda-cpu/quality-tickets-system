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
        'active-tickets': 'لوحة التذكرةات',
        'completed-tickets': 'لوحة التذكرةات المنجزة',
        'dashboard': 'لوحة التحكم',
        'rankings': 'تصنيف الفرق',
        'my-team': 'فريقي'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) {
        titleEl.textContent = titles[pageName] || 'لوحة التحكم';
    }
    
    // Load page data
    if (pageName === 'active-tickets') {
        loadActiveTickets();
    } else if (pageName === 'completed-tickets') {
        loadCompletedTickets();
    } else if (pageName === 'dashboard') {
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

// Mobile Menu Toggle
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.mobile-menu-overlay');
    if (sidebar) {
        sidebar.classList.toggle('open');
        if (overlay) {
            overlay.classList.toggle('active');
        }
    }
}

// Close mobile menu when clicking on a menu item
function setupMobileMenuClose() {
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                toggleMobileMenu();
            }
        });
    });
}

// Load active tickets
async function loadActiveTickets() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        const data = await window.api.getTechnicianTickets('active');
        const tbody = document.getElementById('activeTicketsTableBody');
        
        if (!data || !data.success || !data.tickets || data.tickets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">لا توجد تذكرةات مخصصة لك</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        data.tickets.forEach(ticket => {
            const row = document.createElement('tr');
            const receivedDate = ticket.time_received ? new Date(ticket.time_received).toLocaleString('ar-SA') : '-';
            
            row.innerHTML = `
                <td>${ticket.ticket_number}</td>
                <td>${ticket.subscriber_name || '-'}</td>
                <td>${ticket.subscriber_phone || '-'}</td>
                <td>${ticket.ticket_type_name || '-'}</td>
                <td>${ticket.team_name || '-'}</td>
                <td>${receivedDate}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewTicketDetails(${ticket.id})" style="margin-left: 5px;">عرض التفاصيل</button>
                    ${ticket.status === 'ASSIGNED' ? `
                        <button class="btn btn-sm btn-success" onclick="startWork(${ticket.id})">▶️ بدء العمل</button>
                    ` : ''}
                    ${ticket.status === 'IN_PROGRESS' ? `
                        <button class="btn btn-sm btn-primary" onclick="completeTicket(${ticket.id})">✅ إنهاء التذكرة</button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading active tickets:', error);
        const tbody = document.getElementById('activeTicketsTableBody');
        tbody.innerHTML = '<tr><td colspan="7" class="loading">خطأ في تحميل التذكرةات</td></tr>';
    }
}

// Load completed tickets
async function loadCompletedTickets() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        const data = await window.api.getTechnicianTickets('completed');
        const tbody = document.getElementById('completedTicketsTableBody');
        
        if (!data || !data.success || !data.tickets || data.tickets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">لا توجد تذكرةات منجزة</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        data.tickets.forEach(ticket => {
            const row = document.createElement('tr');
            const completedDate = ticket.technician_completed_at ? new Date(ticket.technician_completed_at).toLocaleString('ar-SA') : '-';
            const timeMinutes = ticket.actual_time_minutes || 0;
            const hours = Math.floor(timeMinutes / 60);
            const minutes = timeMinutes % 60;
            const timeDisplay = hours > 0 ? `${hours}س ${minutes}د` : `${minutes}د`;
            
            // تحديد حالة التقييم
            let qualityStatus = 'منتظر المراجعة';
            let statusColor = 'var(--warning-color)';
            if (ticket.status === 'COMPLETED') {
                qualityStatus = 'جاهز للمراجعة';
                statusColor = 'var(--primary-color)';
            } else if (ticket.status === 'UNDER_REVIEW') {
                qualityStatus = 'قيد المراجعة';
                statusColor = 'var(--info-color)';
            } else if (ticket.status === 'CLOSED') {
                qualityStatus = 'مغلق';
                statusColor = 'var(--success-color)';
            } else if (ticket.status === 'FOLLOW_UP') {
                qualityStatus = 'متابعة';
                statusColor = 'var(--danger-color)';
            }
            
            row.innerHTML = `
                <td>${ticket.ticket_number}</td>
                <td>${ticket.subscriber_name || '-'}</td>
                <td>${ticket.ticket_type_name || '-'}</td>
                <td>${timeDisplay}</td>
                <td>${completedDate}</td>
                <td><span style="color: ${statusColor};">${qualityStatus}</span></td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="viewTicketDetails(${ticket.id}, true)">عرض التفاصيل</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading completed tickets:', error);
        const tbody = document.getElementById('completedTicketsTableBody');
        tbody.innerHTML = '<tr><td colspan="7" class="loading">خطأ في تحميل التذكرةات</td></tr>';
    }
}

// View ticket details
let currentViewingTicketId = null;
let isCompletedTicket = false;

async function viewTicketDetails(ticketId, completed = false) {
    currentViewingTicketId = ticketId;
    isCompletedTicket = completed;
    
    const modal = document.getElementById('ticket-details-modal');
    const content = document.getElementById('ticket-details-content');
    const completeSection = document.getElementById('ticket-complete-section');
    
    if (!modal || !content) return;
    
    modal.style.display = 'flex';
    content.innerHTML = '<p class="loading">جاري التحميل...</p>';
    
    // إخفاء قسم الإنهاء إذا كان التذكرة منتهياً
    if (completeSection) {
        completeSection.style.display = completed ? 'none' : 'block';
    }
    
    try {
        const data = await window.api.getTicket(ticketId);
        if (data && data.success && data.ticket) {
            const ticket = data.ticket;
            const receivedDate = ticket.time_received ? new Date(ticket.time_received).toLocaleString('ar-SA') : '-';
            const firstContactDate = ticket.time_first_contact ? new Date(ticket.time_first_contact).toLocaleString('ar-SA') : '-';
            const completedDate = ticket.time_completed ? new Date(ticket.time_completed).toLocaleString('ar-SA') : '-';
            const technicianCompletedDate = ticket.technician_completed_at ? new Date(ticket.technician_completed_at).toLocaleString('ar-SA') : '-';
            
            document.getElementById('modal-ticket-number').textContent = ticket.ticket_number;
            
            content.innerHTML = `
                <div style="display: grid; gap: 15px;">
                    <div>
                        <strong>اسم المشترك:</strong> ${ticket.subscriber_name || '-'}
                    </div>
                    <div>
                        <strong>رقم المشترك:</strong> ${ticket.subscriber_phone || '-'}
                    </div>
                    <div>
                        <strong>نوع التذكرة:</strong> ${ticket.ticket_type_name || '-'}
                    </div>
                    <div>
                        <strong>الفريق:</strong> ${ticket.team_name || '-'}
                    </div>
                    <div>
                        <strong>موظف الجودة:</strong> ${ticket.quality_staff_name || '-'}
                    </div>
                    <div>
                        <strong>حالة التذكرة:</strong> <span class="badge badge-${ticket.status === 'ASSIGNED' ? 'info' : ticket.status === 'IN_PROGRESS' ? 'primary' : 'success'}">${
                            ticket.status === 'ASSIGNED' ? 'مخصص' : 
                            ticket.status === 'IN_PROGRESS' ? 'قيد العمل' : 
                            ticket.status === 'COMPLETED' ? 'مكتمل' : ticket.status
                        }</span>
                    </div>
                    <hr style="border-color: var(--border-color);">
                    <div>
                        <strong>تاريخ استلام التذكرة (T0):</strong> ${receivedDate}
                    </div>
                    <div>
                        <strong>تاريخ اول رد (T1):</strong> ${firstContactDate}
                    </div>
                    <div>
                        <strong>تاريخ اكمال التذكرة (T2):</strong> ${completedDate}
                    </div>
                    ${technicianCompletedDate !== '-' ? `
                    <div>
                        <strong>تاريخ إنهاء التذكرة من الفني:</strong> ${technicianCompletedDate}
                    </div>
                    ` : ''}
                    ${ticket.actual_time_minutes ? `
                    <div>
                        <strong>الوقت المستغرق:</strong> ${Math.floor(ticket.actual_time_minutes / 60)}س ${ticket.actual_time_minutes % 60}د
                    </div>
                    ` : ''}
                    ${ticket.notes ? `
                    <div>
                        <strong>ملاحظات:</strong> ${ticket.notes}
                    </div>
                    ` : ''}
                </div>
            `;
            
            // تحديث أزرار الإجراءات حسب الحالة
            const completeSection = document.getElementById('ticket-complete-section');
            if (completeSection) {
                if (ticket.status === 'ASSIGNED') {
                    completeSection.innerHTML = `
                        <button class="btn btn-success" onclick="startWork(${ticket.id})" style="width: 100%;">▶️ بدء العمل</button>
                    `;
                    completeSection.style.display = 'block';
                } else if (ticket.status === 'IN_PROGRESS') {
                    completeSection.innerHTML = `
                        <button class="btn btn-primary" onclick="completeTicket(${ticket.id})" style="width: 100%;">✅ إنهاء التذكرة</button>
                    `;
                    completeSection.style.display = 'block';
                } else {
                    completeSection.style.display = 'none';
                }
            }
        } else {
            content.innerHTML = '<p style="color: var(--danger-color);">خطأ في تحميل تفاصيل التذكرة</p>';
        }
    } catch (error) {
        console.error('Error loading ticket details:', error);
        content.innerHTML = '<p style="color: var(--danger-color);">خطأ في تحميل تفاصيل التذكرة</p>';
    }
}

// Close ticket details modal
function closeTicketDetailsModal() {
    const modal = document.getElementById('ticket-details-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentViewingTicketId = null;
    isCompletedTicket = false;
}

// Start work on ticket
async function startWork(ticketId) {
    if (!confirm('هل أنت متأكد من بدء العمل على هذا التذكرة؟')) {
        return;
    }
    
    try {
        const data = await window.api.startTechnicianWork(ticketId);
        if (data && data.success) {
            alert('✅ ' + (data.message || 'تم بدء العمل بنجاح'));
            // تحديث قائمة التذكرةات النشطة
            if (document.getElementById('active-tickets-page').style.display !== 'none') {
                loadActiveTickets();
            }
            // إذا كان modal مفتوحاً، إغلاقه وإعادة فتحه
            if (currentViewingTicketId === ticketId) {
                closeTicketDetailsModal();
                setTimeout(() => viewTicketDetails(ticketId), 300);
            }
        } else {
            alert('❌ خطأ: ' + (data.error || 'فشل بدء العمل'));
        }
    } catch (error) {
        console.error('Error starting work:', error);
        alert('❌ خطأ في بدء العمل: ' + (error.message || 'خطأ غير معروف'));
    }
}

// Complete ticket
async function completeTicket(ticketId) {
    if (!ticketId) {
        ticketId = currentViewingTicketId;
    }
    
    if (!ticketId) {
        alert('لم يتم تحديد التذكرة');
        return;
    }
    
    if (!confirm('هل أنت متأكد من إنهاء هذا التذكرة؟ سيتم تجميد الوقت وإرسال إشعار لموظف الجودة للمراجعة.')) {
        return;
    }
    
    try {
        const data = await window.api.completeTechnicianTicket(ticketId);
        if (data && data.success) {
            alert('✅ ' + (data.message || 'تم إنهاء التذكرة بنجاح'));
            closeTicketDetailsModal();
            // تحديث قائمة التذكرةات النشطة
            if (document.getElementById('active-tickets-page').style.display !== 'none') {
                loadActiveTickets();
            }
            // تحديث قائمة التذكرةات المنجزة
            if (document.getElementById('completed-tickets-page').style.display !== 'none') {
                loadCompletedTickets();
            }
        } else {
            alert('❌ خطأ: ' + (data.error || 'فشل إنهاء التذكرة'));
        }
    } catch (error) {
        console.error('Error completing ticket:', error);
        alert('❌ خطأ في إنهاء التذكرة: ' + (error.message || 'خطأ غير معروف'));
    }
}

// Make functions available globally
window.viewTicketDetails = viewTicketDetails;
window.closeTicketDetailsModal = closeTicketDetailsModal;
window.completeTicket = completeTicket;
window.startWork = startWork;
window.loadActiveTickets = loadActiveTickets;
window.loadCompletedTickets = loadCompletedTickets;

window.toggleMobileMenu = toggleMobileMenu;

document.addEventListener('DOMContentLoaded', () => {
    initTechnicianDashboard();
    setupMobileMenuClose();
});

