// Call Center Dashboard JavaScript

let ticketsAutoRefreshInterval = null;

function initCallCenterDashboard() {
    if (typeof isAuthenticated === 'undefined' || typeof getCurrentUser === 'undefined') {
        setTimeout(initCallCenterDashboard, 100);
        return;
    }
    
    if (typeof window.api === 'undefined') {
        setTimeout(initCallCenterDashboard, 100);
        return;
    }
    
    if (!isAuthenticated()) {
        window.location.href = '/index.html';
        return;
    }
    
    const user = getCurrentUser();
    if (!user || user.role !== 'call_center') {
        alert('غير مصرح لك بالوصول إلى هذه الصفحة');
        window.location.href = '/index.html';
        return;
    }
    
    document.getElementById('userName').textContent = user.full_name;
    document.getElementById('currentUser').textContent = user.full_name;
    
    // Setup navigation
    setupNavigation();
    
    // Initialize notifications
    setTimeout(initNotifications, 1000);
    
    // Load data
    loadTicketTypes();
    loadTeams();
    loadAgents();
    loadTickets();
    setupTicketsAutoRefresh();
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
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'none';
    });
    
    const targetPage = document.getElementById(pageName + '-page');
    if (targetPage) {
        targetPage.style.display = 'block';
    }
    
    document.getElementById('pageTitle').textContent = 'التذكرةات';
    
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) {
            link.classList.add('active');
        }
    });
    
    if (pageName === 'tickets') {
        loadTickets();
    }
}

async function loadTicketTypes() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        const data = await window.api.getTicketTypes();
        // Load for modal
        const modalSelect = document.getElementById('create_ticket_type_id');
        if (modalSelect && data && data.success) {
            modalSelect.innerHTML = '<option value="">اختر النوع</option>';
            // Check both possible response formats
            const types = data.types || data.ticket_types || [];
            if (Array.isArray(types) && types.length > 0) {
                types.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.id;
                    option.textContent = type.name_ar || type.name || '';
                    modalSelect.appendChild(option);
                });
            }
            
            // Add "مخصص" option at the end
            const customOption = document.createElement('option');
            customOption.value = 'custom';
            customOption.textContent = 'مخصص';
            modalSelect.appendChild(customOption);
        } else {
            // Even if API fails, add custom option
            const modalSelect = document.getElementById('create_ticket_type_id');
            if (modalSelect) {
                const customOption = document.createElement('option');
                customOption.value = 'custom';
                customOption.textContent = 'مخصص';
                modalSelect.appendChild(customOption);
            }
        }
    } catch (error) {
        console.error('Error loading ticket types:', error);
        // Even if error, add custom option
        const modalSelect = document.getElementById('create_ticket_type_id');
        if (modalSelect) {
            const customOption = document.createElement('option');
            customOption.value = 'custom';
            customOption.textContent = 'مخصص';
            modalSelect.appendChild(customOption);
        }
    }
}

// Create Ticket Modal Functions
// Use openCreateTicketModal from quality-staff.js (loaded after this file)
// This function will be overridden by quality-staff.js which has permission checking
async function openCreateTicketModal() {
    // Wait for quality-staff.js to load if not already loaded
    if (typeof window.openCreateTicketModal === 'function' && window.openCreateTicketModal.toString().includes('getCurrentUser')) {
        await window.openCreateTicketModal();
    } else {
        // Fallback: show alert if quality-staff.js not loaded
        alert('جاري تحميل الوظيفة...');
    }
}

function closeCreateTicketModal() {
    // Use quality-staff.js version if available
    if (typeof window.closeCreateTicketModal === 'function') {
        window.closeCreateTicketModal();
    } else {
        // Fallback
        const modal = document.getElementById('create-ticket-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    }
}

// Handle ticket type change to show/hide custom type input
window.handleTicketTypeChange = function() {
    const ticketTypeSelect = document.getElementById('create_ticket_type_id');
    const customTypeGroup = document.getElementById('create_custom_ticket_type_group');
    const customTypeInput = document.getElementById('create_custom_ticket_type');
    
    if (ticketTypeSelect && customTypeGroup && customTypeInput) {
        if (ticketTypeSelect.value === 'custom') {
            customTypeGroup.style.display = 'block';
            customTypeInput.required = true;
        } else {
            customTypeGroup.style.display = 'none';
            customTypeInput.required = false;
            customTypeInput.value = '';
        }
    }
};

// Handle form submission
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('createTicketForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const formData = {
                    subscriber_name: document.getElementById('modal_subscriber_name').value.trim(),
                    subscriber_phone: document.getElementById('modal_subscriber_phone').value.trim(),
                    ticket_type_id: parseInt(document.getElementById('modal_ticket_type_id').value),
                    region: document.getElementById('modal_region').value.trim() || null,
                    notes: document.getElementById('modal_notes').value.trim() || null
                };
                
                // Validation
                if (!formData.subscriber_name) {
                    alert('اسم المشترك مطلوب');
                    return;
                }
                
                if (!formData.subscriber_phone) {
                    alert('رقم الهاتف مطلوب');
                    return;
                }
                
                if (!formData.ticket_type_id || isNaN(formData.ticket_type_id)) {
                    alert('نوع التذكرة مطلوب');
                    return;
                }
                
                // Call API to create ticket (ticket_number will be generated on server)
                const response = await window.api.createTicket(formData);
                
                if (response && response.success) {
                    alert('✅ تم إنشاء التذكرة بنجاح!');
                    closeCreateTicketModal();
                    loadTickets(); // Refresh tickets list
                } else {
                    alert('❌ خطأ: ' + (response.error || 'فشل إنشاء التذكرة'));
                }
            } catch (error) {
                console.error('Error creating ticket:', error);
                alert('❌ خطأ في إنشاء التذكرة: ' + (error.message || 'خطأ غير معروف'));
            }
        });
    }
});

async function loadTickets() {
    try {
        if (!window.api) return;
        
        const status = document.getElementById('ticketsStatusFilter')?.value || '';
        const params = { created_by_me: true };
        if (status) params.status = status;
        
        const response = await window.api.getTickets(params);
        
        if (response && response.success) {
            displayTickets(response.tickets || []);
        } else {
            document.getElementById('ticketsList').innerHTML = '<p>خطأ في جلب التذكرةات</p>';
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
        document.getElementById('ticketsList').innerHTML = '<p>خطأ في جلب التذكرةات</p>';
    }
}

function displayTickets(tickets) {
    const container = document.getElementById('ticketsList');
    
    if (tickets.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>📭 لا توجد تذكرةات</p></div>';
        return;
    }
    
    let html = '<div class="tickets-grid">';
    
    tickets.forEach(ticket => {
        const statusClass = {
            'pending': 'badge-warning',
            'accepted': 'badge-info',
            'in_progress': 'badge-primary',
            'completed': 'badge-success',
            'postponed': 'badge-danger'
        }[ticket.status] || 'badge-secondary';
        
        const statusText = {
            'pending': 'معلقة',
            'accepted': 'مقبولة',
            'in_progress': 'قيد التنفيذ',
            'completed': 'مكتملة',
            'postponed': 'مؤجلة'
        }[ticket.status] || ticket.status;
        
        const assignmentInfo = ticket.assignment_status ? 
            `<p><strong>حالة التوزيع:</strong> ${ticket.assignment_status === 'accepted' ? 'مقبولة' : ticket.assignment_status === 'pending' ? 'معلقة' : ticket.assignment_status}</p>` : '';
        
        html += `
            <div class="ticket-card">
                <div class="ticket-card-header">
                    <h3>التذكرة رقم: ${ticket.ticket_number}</h3>
                    <span class="badge ${statusClass}">${statusText}</span>
                </div>
                <div class="ticket-card-body">
                    <p><strong>النوع:</strong> ${ticket.ticket_type_name || ''}</p>
                    <p><strong>المشترك:</strong> ${ticket.subscriber_name || 'غير محدد'}</p>
                    <p><strong>الهاتف:</strong> ${ticket.subscriber_phone || 'غير محدد'}</p>
                    ${ticket.subscriber_address ? `<p><strong>العنوان:</strong> ${ticket.subscriber_address}</p>` : ''}
                    ${ticket.notes ? `<p><strong>الملاحظات:</strong> ${ticket.notes}</p>` : ''}
                    ${ticket.time_received ? `<p><strong>T0 (استلام):</strong> ${formatDateTime(ticket.time_received)}</p>` : ''}
                    ${ticket.time_first_contact ? `<p><strong>T1 (أول اتصال):</strong> ${formatDateTime(ticket.time_first_contact)}</p>` : ''}
                    ${ticket.time_completed ? `<p><strong>T3 (تفعيل):</strong> ${formatDateTime(ticket.time_completed)}</p>` : ''}
                    ${assignmentInfo}
                </div>
                <div class="ticket-card-footer">
                    <button class="btn btn-primary" onclick="viewTicket(${ticket.id})">عرض التفاصيل</button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

async function viewTicket(ticketId) {
    // يمكن إضافة modal لعرض التفاصيل
    alert('عرض تفاصيل التذكرة - قيد التطوير');
}

// Expose functions to window
window.openCreateTicketModal = openCreateTicketModal;
window.closeCreateTicketModal = closeCreateTicketModal;

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ar-SA', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function setupTicketsAutoRefresh() {
    if (ticketsAutoRefreshInterval) {
        clearInterval(ticketsAutoRefreshInterval);
    }
    
    const autoRefreshCheckbox = document.getElementById('autoRefreshTickets');
    if (!autoRefreshCheckbox) return;
    
    const refresh = () => {
        if (autoRefreshCheckbox.checked) {
            loadTickets();
        }
    };
    
    autoRefreshCheckbox.addEventListener('change', () => {
        if (autoRefreshCheckbox.checked) {
            ticketsAutoRefreshInterval = setInterval(refresh, 30000);
        } else {
            if (ticketsAutoRefreshInterval) {
                clearInterval(ticketsAutoRefreshInterval);
                ticketsAutoRefreshInterval = null;
            }
        }
    });
    
    if (autoRefreshCheckbox.checked) {
        ticketsAutoRefreshInterval = setInterval(refresh, 30000);
    }
}

// Notifications functions (same as agent dashboard)
let notificationsInterval = null;

function initNotifications() {
    loadNotifications();
    notificationsInterval = setInterval(loadNotifications, 30000);
}

async function loadNotifications() {
    try {
        if (!window.api) return;
        
        const response = await window.api.getNotifications(true);
        if (response && response.success) {
            const badge = document.getElementById('notificationBadge');
            if (badge) {
                if (response.unread_count > 0) {
                    badge.textContent = response.unread_count;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function showNotifications() {
    const dropdown = document.getElementById('notificationsDropdown');
    const overlay = document.getElementById('notificationsOverlay');
    if (!dropdown || !overlay) return;
    
    const isVisible = dropdown.classList.contains('active');
    
    if (isVisible) {
        closeNotifications();
    } else {
        dropdown.classList.add('active');
        overlay.classList.add('active');
        loadNotificationsList();
    }
}

function closeNotifications() {
    const dropdown = document.getElementById('notificationsDropdown');
    const overlay = document.getElementById('notificationsOverlay');
    if (dropdown) dropdown.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

async function loadNotificationsList() {
    try {
        if (!window.api) return;
        
        const response = await window.api.getNotifications();
        const list = document.getElementById('notificationsList');
        const countBadge = document.getElementById('notificationsCount');
        
        if (!response || !response.success || !response.notifications || response.notifications.length === 0) {
            list.innerHTML = '<div class="notification-empty"><div style="font-size: 48px; margin-bottom: 10px;">📭</div><p>لا توجد إشعارات</p></div>';
            if (countBadge) countBadge.textContent = '0';
            return;
        }
        
        if (countBadge) {
            countBadge.textContent = response.notifications.length;
            countBadge.style.display = response.notifications.length > 0 ? 'inline-block' : 'none';
        }
        
        let html = '';
        response.notifications.forEach((notif, index) => {
            const timeAgo = formatTimeAgo(notif.created_at);
            const icon = notif.type === 'ticket_delayed' ? '⏰' : 
                        notif.type === 'ticket_completed' ? '✅' : 
                        notif.type === 'achievement' ? '🏆' : '📢';
            
            html += `
                <div class="notification-item ${notif.is_read ? '' : 'unread'}" onclick="markNotificationRead(${notif.id}, event)">
                    <div class="notification-icon">${icon}</div>
                    <div class="notification-content">
                        <div class="notification-title">${notif.title}</div>
                        <div class="notification-message">${notif.message}</div>
                        <div class="notification-time">${timeAgo}</div>
                    </div>
                    ${!notif.is_read ? '<div class="notification-dot"></div>' : ''}
                </div>
            `;
        });
        
        list.innerHTML = html;
    } catch (error) {
        console.error('Error loading notifications list:', error);
    }
}

async function markNotificationRead(id, event) {
    try {
        if (event) event.stopPropagation();
        if (!window.api) return;
        
        await window.api.markNotificationRead(id);
        loadNotifications();
        loadNotificationsList();
    } catch (error) {
        console.error('Error marking notification read:', error);
    }
}

async function markAllNotificationsRead() {
    try {
        if (!window.api) return;
        await window.api.markAllNotificationsRead();
        loadNotifications();
        loadNotificationsList();
    } catch (error) {
        console.error('Error marking all notifications read:', error);
    }
}

function formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return formatDateTime(dateString);
}

function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.mobile-menu-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCallCenterDashboard);
} else {
    initCallCenterDashboard();
}

