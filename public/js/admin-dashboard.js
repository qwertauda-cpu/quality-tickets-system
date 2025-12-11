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
        'add-ticket': 'إضافة تكت',
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
    } else if (pageName === 'add-ticket') {
        loadAddTicketPage();
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

// Admin Ticket Management Variables
let adminCurrentTicketId = null;
let adminTicketTypes = [];
let adminTeams = [];

// Load Add Ticket Page
async function loadAddTicketPage() {
    await loadAdminTicketTypes();
    await loadAdminTeams();
    setupAdminTicketForm();
    
    // Set current time as default
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const timeInput = document.getElementById('admin_time_received');
    if (timeInput) {
        timeInput.value = now.toISOString().slice(0, 16);
    }
}

async function loadAdminTicketTypes() {
    try {
        if (!window.api) {
            console.error('API not loaded');
            return;
        }
        const data = await window.api.getTicketTypes();
        if (data.success) {
            adminTicketTypes = data.types;
            const select = document.getElementById('admin_ticket_type_id');
            if (select) {
                select.innerHTML = '<option value="">اختر النوع</option>';
                data.types.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.id;
                    option.textContent = type.name_ar;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading ticket types:', error);
    }
}

async function loadAdminTeams() {
    try {
        if (!window.api) {
            console.error('API not loaded');
            return;
        }
        const data = await window.api.getTeams();
        if (data.success) {
            adminTeams = data.teams;
            const select = document.getElementById('admin_team_id');
            if (select) {
                select.innerHTML = '<option value="">اختر الفريق</option>';
                data.teams.forEach(team => {
                    const option = document.createElement('option');
                    option.value = team.id;
                    option.textContent = team.name;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading teams:', error);
    }
}

function setupAdminTicketForm() {
    // Ticket form submission
    const ticketForm = document.getElementById('adminTicketForm');
    if (ticketForm) {
        ticketForm.addEventListener('submit', handleAdminTicketSubmit);
    }
    
    // Quality review form
    const qualityForm = document.getElementById('adminQualityReviewForm');
    if (qualityForm) {
        qualityForm.addEventListener('submit', handleAdminQualityReviewSubmit);
    }
    
    // Followup checkbox
    const followupCheckbox = document.getElementById('admin_needs_followup');
    if (followupCheckbox) {
        followupCheckbox.addEventListener('change', (e) => {
            const reasonGroup = document.getElementById('adminFollowupReasonGroup');
            if (reasonGroup) {
                reasonGroup.style.display = e.target.checked ? 'block' : 'none';
            }
        });
    }
    
    // Photo upload
    const photoUploadArea = document.getElementById('adminPhotoUploadArea');
    const photoInput = document.getElementById('adminPhotoInput');
    
    if (photoUploadArea && photoInput) {
        photoUploadArea.addEventListener('click', () => photoInput.click());
        photoUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            photoUploadArea.classList.add('dragover');
        });
        photoUploadArea.addEventListener('dragleave', () => {
            photoUploadArea.classList.remove('dragover');
        });
        photoUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            photoUploadArea.classList.remove('dragover');
            handleAdminPhotoUpload(e.dataTransfer.files);
        });
        
        photoInput.addEventListener('change', (e) => {
            handleAdminPhotoUpload(e.target.files);
        });
    }
}

async function handleAdminTicketSubmit(e) {
    e.preventDefault();
    
    if (adminCurrentTicketId) {
        alert('يوجد تكت مفتوح بالفعل. يرجى إكماله أو إعادة تعيين النموذج.');
        return;
    }
    
    const formData = {
        ticket_number: document.getElementById('admin_ticket_number').value,
        ticket_type_id: parseInt(document.getElementById('admin_ticket_type_id').value),
        team_id: parseInt(document.getElementById('admin_team_id').value),
        time_received: document.getElementById('admin_time_received').value,
        time_first_contact: document.getElementById('admin_time_first_contact').value || null,
        time_completed: document.getElementById('admin_time_completed').value || null,
        subscriber_name: document.getElementById('admin_subscriber_name').value || null,
        subscriber_phone: document.getElementById('admin_subscriber_phone').value || null,
        subscriber_address: document.getElementById('admin_subscriber_address').value || null,
        notes: document.getElementById('admin_notes').value || null
    };
    
    try {
        if (!window.api) {
            alert('API not loaded');
            return;
        }
        const data = await window.api.createTicket(formData);
        if (data.success) {
            adminCurrentTicketId = data.ticketId;
            alert('تم إدخال التكت بنجاح! يمكنك الآن إضافة الصور وتقييم الجودة.');
            showAdminTicketDetails(data.ticketId);
        }
    } catch (error) {
        alert('خطأ في إدخال التكت: ' + (error.message || 'خطأ غير معروف'));
    }
}

async function showAdminTicketDetails(ticketId) {
    adminCurrentTicketId = ticketId;
    const detailsSection = document.getElementById('admin-ticket-details-section');
    if (detailsSection) {
        detailsSection.style.display = 'block';
    }
    
    try {
        const data = await window.api.getTicket(ticketId);
        if (data.success) {
            const ticket = data.ticket;
            const ticketNumberEl = document.getElementById('admin-detail-ticket-number');
            if (ticketNumberEl) {
                ticketNumberEl.textContent = ticket.ticket_number;
            }
            
            // Load photos
            loadAdminPhotos(ticket.photos || []);
            
            // Load quality review if exists
            if (ticket.qualityReview) {
                loadAdminQualityReview(ticket.qualityReview);
            }
            
            // Load scores
            if (ticket.scores) {
                displayAdminScores(ticket.scores);
            }
        }
    } catch (error) {
        console.error('Error loading ticket details:', error);
    }
}

function loadAdminPhotos(photos) {
    const photoGrid = document.getElementById('adminPhotoGrid');
    if (!photoGrid) return;
    
    photoGrid.innerHTML = '';
    
    photos.forEach(photo => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.innerHTML = `
            <img src="${photo.photo_path}" alt="${photo.photo_type}">
            <button class="remove-photo" onclick="removeAdminPhoto(${photo.id})">×</button>
        `;
        photoGrid.appendChild(photoItem);
    });
}

async function handleAdminPhotoUpload(files) {
    if (!adminCurrentTicketId) {
        alert('يجب إدخال التكت أولاً');
        return;
    }
    
    const photoType = document.getElementById('admin_photo_type')?.value;
    if (!photoType) {
        alert('يرجى اختيار نوع الصورة');
        return;
    }
    
    const formData = new FormData();
    formData.append('photo_type', photoType);
    Array.from(files).forEach(file => {
        formData.append('photos', file);
    });
    
    try {
        const data = await window.api.uploadPhotos(adminCurrentTicketId, formData);
        if (data.success) {
            alert('تم رفع الصور بنجاح');
            // Reload ticket to get updated photos
            showAdminTicketDetails(adminCurrentTicketId);
        }
    } catch (error) {
        alert('خطأ في رفع الصور: ' + (error.message || 'خطأ غير معروف'));
    }
}

async function removeAdminPhoto(photoId) {
    if (!confirm('هل أنت متأكد من حذف هذه الصورة؟')) {
        return;
    }
    
    try {
        // Note: You may need to add a delete photo endpoint to the API
        alert('ميزة حذف الصور قيد التطوير');
        // await window.api.deletePhoto(photoId);
        // showAdminTicketDetails(adminCurrentTicketId);
    } catch (error) {
        alert('خطأ في حذف الصورة: ' + (error.message || 'خطأ غير معروف'));
    }
}

async function handleAdminQualityReviewSubmit(e) {
    e.preventDefault();
    
    if (!adminCurrentTicketId) {
        alert('يجب إدخال التكت أولاً');
        return;
    }
    
    const formData = {
        contact_status: document.getElementById('admin_contact_status').value,
        service_status: document.getElementById('admin_service_status').value,
        team_rating: parseInt(document.getElementById('admin_team_rating').value),
        explained_sinmana: document.getElementById('admin_explained_sinmana').checked ? 1 : 0,
        explained_platform: document.getElementById('admin_explained_platform').checked ? 1 : 0,
        explained_mytv_plus: document.getElementById('admin_explained_mytv_plus').checked ? 1 : 0,
        explained_shahid_plus: document.getElementById('admin_explained_shahid_plus').checked ? 1 : 0,
        whatsapp_group_interest: document.getElementById('admin_whatsapp_group_interest').checked ? 1 : 0,
        subscription_amount: document.getElementById('admin_subscription_amount').value || null,
        needs_followup: document.getElementById('admin_needs_followup').checked ? 1 : 0,
        followup_reason: document.getElementById('admin_followup_reason').value || null,
        review_notes: document.getElementById('admin_review_notes').value || null
    };
    
    try {
        const data = await window.api.submitQualityReview(adminCurrentTicketId, formData);
        if (data.success) {
            alert('تم حفظ تقييم الجودة بنجاح');
            // Reload ticket
            showAdminTicketDetails(adminCurrentTicketId);
        }
    } catch (error) {
        alert('خطأ في حفظ التقييم: ' + (error.message || 'خطأ غير معروف'));
    }
}

function loadAdminQualityReview(review) {
    document.getElementById('admin_contact_status').value = review.contact_status;
    document.getElementById('admin_service_status').value = review.service_status;
    document.getElementById('admin_team_rating').value = review.team_rating;
    document.getElementById('admin_explained_sinmana').checked = review.explained_sinmana === 1;
    document.getElementById('admin_explained_platform').checked = review.explained_platform === 1;
    document.getElementById('admin_explained_mytv_plus').checked = review.explained_mytv_plus === 1;
    document.getElementById('admin_explained_shahid_plus').checked = review.explained_shahid_plus === 1;
    document.getElementById('admin_whatsapp_group_interest').checked = review.whatsapp_group_interest === 1;
    document.getElementById('admin_subscription_amount').value = review.subscription_amount || '';
    document.getElementById('admin_needs_followup').checked = review.needs_followup === 1;
    document.getElementById('admin_followup_reason').value = review.followup_reason || '';
    document.getElementById('admin_review_notes').value = review.review_notes || '';
    
    if (review.needs_followup === 1) {
        document.getElementById('adminFollowupReasonGroup').style.display = 'block';
    }
}

async function generateAdminMessage() {
    if (!adminCurrentTicketId) {
        alert('يجب إدخال التكت أولاً');
        return;
    }
    
    try {
        const data = await window.api.generateMessage(adminCurrentTicketId);
        if (data.success) {
            const messageTextarea = document.getElementById('adminGeneratedMessage');
            const messageSection = document.getElementById('adminMessageSection');
            if (messageTextarea) {
                messageTextarea.value = data.message;
            }
            if (messageSection) {
                messageSection.style.display = 'block';
            }
        }
    } catch (error) {
        alert('خطأ في توليد الرسالة: ' + (error.message || 'خطأ غير معروف'));
    }
}

function copyAdminMessage() {
    const messageText = document.getElementById('adminGeneratedMessage');
    if (messageText) {
        messageText.select();
        document.execCommand('copy');
        alert('تم نسخ الرسالة!');
    }
}

function displayAdminScores(scores) {
    const scoreDisplay = document.getElementById('adminScoreDisplay');
    if (!scoreDisplay) return;
    
    scoreDisplay.innerHTML = `
        <div class="score-item positive">
            <div class="label">النقاط الموجبة</div>
            <div class="value">+${scores.totalPositive || 0}</div>
        </div>
        <div class="score-item negative">
            <div class="label">النقاط السالبة</div>
            <div class="value">-${scores.totalNegative || 0}</div>
        </div>
        <div class="score-item net">
            <div class="label">النقاط الصافية</div>
            <div class="value">${scores.netScore || 0}</div>
        </div>
    `;
}

function resetAdminTicketForm() {
    document.getElementById('adminTicketForm').reset();
    adminCurrentTicketId = null;
    const detailsSection = document.getElementById('admin-ticket-details-section');
    if (detailsSection) {
        detailsSection.style.display = 'none';
    }
    const photoGrid = document.getElementById('adminPhotoGrid');
    if (photoGrid) {
        photoGrid.innerHTML = '';
    }
    const messageSection = document.getElementById('adminMessageSection');
    if (messageSection) {
        messageSection.style.display = 'none';
    }
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const timeInput = document.getElementById('admin_time_received');
    if (timeInput) {
        timeInput.value = now.toISOString().slice(0, 16);
    }
}

// Make functions available globally
window.removeAdminPhoto = removeAdminPhoto;
window.generateAdminMessage = generateAdminMessage;
window.copyAdminMessage = copyAdminMessage;
window.resetAdminTicketForm = resetAdminTicketForm;

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

