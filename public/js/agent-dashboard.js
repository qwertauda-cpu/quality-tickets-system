// Agent Dashboard JavaScript

let ticketsAutoRefreshInterval = null;
let currentTicketId = null;

function initAgentDashboard() {
    if (typeof isAuthenticated === 'undefined' || typeof getCurrentUser === 'undefined') {
        setTimeout(initAgentDashboard, 100);
        return;
    }
    
    if (typeof window.api === 'undefined') {
        setTimeout(initAgentDashboard, 100);
        return;
    }
    
    if (!isAuthenticated()) {
        window.location.href = '/index.html';
        return;
    }
    
    const user = getCurrentUser();
    if (!user || user.role !== 'agent') {
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
    
    // Load tickets
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

async function loadTickets() {
    try {
        if (!window.api) return;
        
        const status = document.getElementById('ticketsStatusFilter')?.value || '';
        const params = { assigned_to_me: true };
        if (status) params.status = status;
        
        const response = await window.api.getMyAssignedTickets(params);
        
        if (response && response.success) {
            displayTickets(response.tickets || []);
        } else {
            document.getElementById('ticketsList').innerHTML = '<p>خطأ في جلب التذاكر</p>';
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
        document.getElementById('ticketsList').innerHTML = '<p>خطأ في جلب التذاكر</p>';
    }
}

function displayTickets(tickets) {
    const container = document.getElementById('ticketsList');
    
    if (tickets.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding: 40px; text-align: center; color: var(--text-muted); font-size: 15px; font-weight: 500;">لا يوجد بيانات</div>';
        return;
    }
    
    let html = '<div class="tickets-grid">';
    
    tickets.forEach(ticket => {
        const statusClass = {
            'pending': 'badge-warning',
            'accepted': 'badge-info',
            'waiting': 'badge-secondary',
            'postponed': 'badge-danger',
            'in_progress': 'badge-primary',
            'completed': 'badge-success'
        }[ticket.assignment_status || ticket.status] || 'badge-secondary';
        
        const statusText = {
            'pending': 'معلقة',
            'accepted': 'مقبولة',
            'waiting': 'في الانتظار',
            'postponed': 'مؤجلة',
            'in_progress': 'قيد التنفيذ',
            'completed': 'مكتملة'
        }[ticket.assignment_status || ticket.status] || ticket.status;
        
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
                </div>
                <div class="ticket-card-footer">
                    ${ticket.assignment_status === 'pending' ? `
                        <button class="btn btn-success" onclick="acceptTicket(${ticket.id})">✅ قبول</button>
                        <button class="btn btn-warning" onclick="waitTicket(${ticket.id})">⏸️ انتظار</button>
                        <button class="btn btn-danger" onclick="postponeTicket(${ticket.id})">⏸️ تأجيل</button>
                    ` : ''}
                    ${ticket.assignment_status === 'accepted' ? `
                        <button class="btn btn-primary" onclick="openTicket(${ticket.id})">📝 فتح التذكرة</button>
                    ` : ''}
                    ${ticket.assignment_status === 'in_progress' ? `
                        <button class="btn btn-primary" onclick="openTicket(${ticket.id})">📝 فتح التذكرة</button>
                        <button class="btn btn-success" onclick="completeTicket(${ticket.id})">✅ إكمال</button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

async function acceptTicket(ticketId) {
    try {
        if (!confirm('هل تريد قبول هذا التذكرة؟')) return;
        
        const response = await window.api.updateTicketAssignment(ticketId, { status: 'accepted' });
        
        if (response && response.success) {
            alert('تم قبول التذكرة بنجاح');
            loadTickets();
            loadNotifications();
        } else {
            alert('خطأ: ' + (response.error || 'خطأ غير معروف'));
        }
    } catch (error) {
        console.error('Error accepting ticket:', error);
        alert('خطأ في قبول التذكرة');
    }
}

async function waitTicket(ticketId) {
    try {
        if (!confirm('هل تريد وضع التذكرة في قائمة الانتظار؟')) return;
        
        const response = await window.api.updateTicketAssignment(ticketId, { status: 'waiting' });
        
        if (response && response.success) {
            alert('تم وضع التذكرة في قائمة الانتظار');
            loadTickets();
        } else {
            alert('خطأ: ' + (response.error || 'خطأ غير معروف'));
        }
    } catch (error) {
        console.error('Error waiting ticket:', error);
        alert('خطأ في تحديث حالة التذكرة');
    }
}

async function postponeTicket(ticketId) {
    const reason = prompt('يرجى إدخال سبب التأجيل:');
    if (!reason) return;
    
    try {
        const response = await window.api.updateTicketAssignment(ticketId, { 
            status: 'postponed',
            notes: reason
        });
        
        if (response && response.success) {
            alert('تم تأجيل التذكرة');
            loadTickets();
        } else {
            alert('خطأ: ' + (response.error || 'خطأ غير معروف'));
        }
    } catch (error) {
        console.error('Error postponing ticket:', error);
        alert('خطأ في تأجيل التذكرة');
    }
}

async function openTicket(ticketId) {
    currentTicketId = ticketId;
    
    try {
        const response = await window.api.getTicket(ticketId);
        
        if (response && response.success) {
            showTicketModal(response.ticket);
        } else {
            alert('خطأ في جلب بيانات التذكرة');
        }
    } catch (error) {
        console.error('Error loading ticket:', error);
        alert('خطأ في جلب بيانات التذكرة');
    }
}

function showTicketModal(ticket) {
    const modal = document.getElementById('ticketModal');
    const modalBody = document.getElementById('ticketModalBody');
    
    modalBody.innerHTML = `
        <form id="ticketForm">
            <div class="form-group">
                <label>رقم التذكرة *</label>
                <input type="text" id="ticket_number" value="${ticket.ticket_number}" required>
            </div>
            
            <div class="form-group">
                <label>نوع التذكرة</label>
                <input type="text" value="${ticket.ticket_type_name || ''}" disabled>
            </div>
            
            <div class="form-group">
                <label>اسم المشترك *</label>
                <input type="text" id="subscriber_name" value="${ticket.subscriber_name || ''}" required>
            </div>
            
            <div class="form-group">
                <label>رقم هاتف المشترك *</label>
                <input type="text" id="subscriber_phone" value="${ticket.subscriber_phone || ''}" required>
            </div>
            
            <div class="form-group">
                <label>عنوان المشترك</label>
                <textarea id="subscriber_address" rows="2">${ticket.subscriber_address || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label>ملاحظات</label>
                <textarea id="notes" rows="3">${ticket.notes || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label>رفع صور</label>
                <input type="file" id="ticket_photos" multiple accept="image/*">
                <small>يمكنك رفع عدة صور</small>
            </div>
            
            <div id="uploadedPhotos" class="photo-grid"></div>
            
            <div class="btn-group">
                <button type="submit" class="btn btn-primary">حفظ التعديلات</button>
                <button type="button" class="btn btn-secondary" onclick="closeTicketModal()">إلغاء</button>
            </div>
        </form>
    `;
    
    // Load existing photos
    if (ticket.photos && ticket.photos.length > 0) {
        displayPhotos(ticket.photos);
    }
    
    // Setup form submission
    document.getElementById('ticketForm').addEventListener('submit', handleTicketUpdate);
    
    modal.style.display = 'flex';
}

async function handleTicketUpdate(e) {
    e.preventDefault();
    
    try {
        const formData = {
            ticket_number: document.getElementById('ticket_number').value,
            subscriber_name: document.getElementById('subscriber_name').value,
            subscriber_phone: document.getElementById('subscriber_phone').value,
            subscriber_address: document.getElementById('subscriber_address').value,
            notes: document.getElementById('notes').value
        };
        
        await window.api.updateTicket(currentTicketId, formData);
        
        // Upload photos if any
        const photoInput = document.getElementById('ticket_photos');
        if (photoInput.files.length > 0) {
            const uploadFormData = new FormData();
            uploadFormData.append('photo_type', 'general');
            Array.from(photoInput.files).forEach(file => {
                uploadFormData.append('photos', file);
            });
            
            await window.api.uploadPhotos(currentTicketId, uploadFormData);
        }
        
        alert('تم حفظ التعديلات بنجاح');
        closeTicketModal();
        loadTickets();
    } catch (error) {
        console.error('Error updating ticket:', error);
        alert('خطأ في حفظ التعديلات');
    }
}

async function completeTicket(ticketId) {
    if (!confirm('هل أنت متأكد من إكمال هذا التذكرة؟')) return;
    
    try {
        const response = await window.api.updateTicketAssignment(ticketId, { status: 'completed' });
        
        if (response && response.success) {
            alert('تم إكمال التذكرة بنجاح');
            loadTickets();
            loadNotifications();
        } else {
            alert('خطأ: ' + (response.error || 'خطأ غير معروف'));
        }
    } catch (error) {
        console.error('Error completing ticket:', error);
        alert('خطأ في إكمال التذكرة');
    }
}

function displayPhotos(photos) {
    const container = document.getElementById('uploadedPhotos');
    if (!container) return;
    
    container.innerHTML = '';
    photos.forEach(photo => {
        const img = document.createElement('img');
        img.src = photo.photo_path;
        img.style.width = '100px';
        img.style.height = '100px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';
        img.style.margin = '5px';
        container.appendChild(img);
    });
}

function closeTicketModal() {
    document.getElementById('ticketModal').style.display = 'none';
    currentTicketId = null;
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

// Notifications functions (same as admin dashboard)
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
        
        const unreadCount = response.notifications.filter(n => !n.is_read).length;
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
    return formatDate(dateString);
}

function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.mobile-menu-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAgentDashboard);
} else {
    initAgentDashboard();
}

