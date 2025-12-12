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
    
    // Initialize notifications
    setTimeout(initNotifications, 1000);
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
        'users': 'إدارة المستخدمين',
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
    } else if (pageName === 'users') {
        loadUsers();
    } else if (pageName === 'teams') {
        loadTeams();
    } else if (pageName === 'tickets') {
        loadTickets();
        setupTicketsAutoRefresh();
    } else if (pageName === 'reports') {
        loadReports();
    }
}

// Auto refresh variables
let ticketsAutoRefreshInterval = null;
let currentTicketsFilters = {};
let currentTicketsSort = { field: 'created_at', order: 'DESC' };

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

// Store all tickets for client-side filtering
let allTickets = [];
let filteredTickets = [];

async function loadTickets() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        // Load teams and ticket types for filters
        await loadTicketsFilters();
        
        // Load all tickets (we'll filter client-side)
        const data = await window.api.getTickets({ limit: 1000 });
        if (data && data.success) {
            allTickets = data.tickets || [];
            filterTickets();
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
        document.getElementById('ticketsTableBody').innerHTML = '<tr><td colspan="7" class="loading">خطأ في تحميل التكتات</td></tr>';
    }
}

async function loadTicketsFilters() {
    try {
        // Load teams
        const teamsData = await window.api.getTeams();
        const teamSelect = document.getElementById('ticketsTeamFilter');
        if (teamSelect && teamsData && teamsData.success) {
            teamSelect.innerHTML = '<option value="">جميع الفرق</option>';
            (teamsData.teams || []).forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.name;
                teamSelect.appendChild(option);
            });
        }
        
        // Load ticket types
        const typesData = await window.api.getTicketTypes();
        const typeSelect = document.getElementById('ticketsTypeFilter');
        if (typeSelect && typesData && typesData.success) {
            typeSelect.innerHTML = '<option value="">جميع الأنواع</option>';
            (typesData.ticket_types || []).forEach(type => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = type.name_ar;
                typeSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading filters:', error);
    }
}

function filterTickets() {
    const search = (document.getElementById('ticketsSearch')?.value || '').toLowerCase();
    const date = document.getElementById('ticketsDateFilter')?.value || '';
    const teamId = document.getElementById('ticketsTeamFilter')?.value || '';
    const typeId = document.getElementById('ticketsTypeFilter')?.value || '';
    const status = document.getElementById('ticketsStatusFilter')?.value || '';
    const sortBy = document.getElementById('ticketsSortBy')?.value || 'created_at';
    const sortOrder = document.getElementById('ticketsSortOrder')?.value || 'DESC';
    
    // Filter tickets
    filteredTickets = allTickets.filter(ticket => {
        // Search filter
        if (search) {
            const searchText = `${ticket.ticket_number} ${ticket.ticket_type_name || ''} ${ticket.team_name || ''}`.toLowerCase();
            if (!searchText.includes(search)) return false;
        }
        
        // Date filter
        if (date) {
            const ticketDate = new Date(ticket.created_at).toISOString().split('T')[0];
            if (ticketDate !== date) return false;
        }
        
        // Team filter
        if (teamId && ticket.team_id != teamId) return false;
        
        // Type filter
        if (typeId && ticket.ticket_type_id != typeId) return false;
        
        // Status filter
        if (status && ticket.status !== status) return false;
        
        return true;
    });
    
    // Sort tickets
    filteredTickets.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];
        
        // Handle null/undefined
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';
        
        // Handle numbers
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortOrder === 'ASC' ? aVal - bVal : bVal - aVal;
        }
        
        // Handle strings
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        
        if (sortOrder === 'ASC') {
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
    });
    
    displayTickets(filteredTickets);
}

function displayTickets(tickets) {
    const tbody = document.getElementById('ticketsTableBody');
    tbody.innerHTML = '';
    
    if (tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">لا توجد تكتات</td></tr>';
        return;
    }
    
    tickets.forEach(ticket => {
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
        if (ticket.status === 'postponed') {
            row.classList.add('postponed');
        }
        row.innerHTML = `
            <td>${ticket.ticket_number}</td>
            <td>${ticket.ticket_type_name || ''}</td>
            <td>${ticket.team_name || ''}</td>
            <td><span class="badge ${statusBadge}">${statusText}</span></td>
            <td>${formatTimeDuration(ticket.actual_time_minutes)}</td>
            <td>${netScore}</td>
            <td>${formatDate(ticket.created_at)}</td>
        `;
        tbody.appendChild(row);
    });
}

function sortTickets(field) {
    const currentField = document.getElementById('ticketsSortBy').value;
    const currentOrder = document.getElementById('ticketsSortOrder').value;
    
    if (currentField === field) {
        // Toggle order
        document.getElementById('ticketsSortOrder').value = currentOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
        document.getElementById('ticketsSortBy').value = field;
        document.getElementById('ticketsSortOrder').value = 'DESC';
    }
    
    filterTickets();
}

function resetFilters() {
    document.getElementById('ticketsSearch').value = '';
    document.getElementById('ticketsDateFilter').value = '';
    document.getElementById('ticketsTeamFilter').value = '';
    document.getElementById('ticketsTypeFilter').value = '';
    document.getElementById('ticketsStatusFilter').value = '';
    document.getElementById('ticketsSortBy').value = 'created_at';
    document.getElementById('ticketsSortOrder').value = 'DESC';
    filterTickets();
}

function setupTicketsAutoRefresh() {
    // Clear existing interval
    if (ticketsAutoRefreshInterval) {
        clearInterval(ticketsAutoRefreshInterval);
    }
    
    // Check if auto-refresh is enabled
    const autoRefreshCheckbox = document.getElementById('autoRefreshTickets');
    if (!autoRefreshCheckbox) return;
    
    // Setup interval
    const refresh = () => {
        if (autoRefreshCheckbox.checked) {
            loadTickets();
        }
    };
    
    autoRefreshCheckbox.addEventListener('change', () => {
        if (autoRefreshCheckbox.checked) {
            ticketsAutoRefreshInterval = setInterval(refresh, 30000); // 30 seconds
        } else {
            if (ticketsAutoRefreshInterval) {
                clearInterval(ticketsAutoRefreshInterval);
                ticketsAutoRefreshInterval = null;
            }
        }
    });
    
    // Start if checked
    if (autoRefreshCheckbox.checked) {
        ticketsAutoRefreshInterval = setInterval(refresh, 30000);
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
    
    // Initialize datetime pickers
    if (typeof initDateTimePickers === 'function') {
        initDateTimePickers();
    }
    
    // Initialize time pickers
    if (typeof initTimePickers === 'function') {
        initTimePickers();
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
    
    // Combine date and time
    const dateReceived = getDateTimeValue('admin_time_received_container');
    const timeReceived = getTimeValue('admin_time_received_time_container');
    const timeReceivedFull = combineDateTime(dateReceived, timeReceived);
    
    const dateFirstContact = getDateTimeValue('admin_time_first_contact_container');
    const timeFirstContact = getTimeValue('admin_time_first_contact_time_container');
    const timeFirstContactFull = dateFirstContact && timeFirstContact ? combineDateTime(dateFirstContact, timeFirstContact) : null;
    
    const dateCompleted = getDateTimeValue('admin_time_completed_container');
    const timeCompleted = getTimeValue('admin_time_completed_time_container');
    const timeCompletedFull = dateCompleted && timeCompleted ? combineDateTime(dateCompleted, timeCompleted) : null;
    
    const formData = {
        ticket_number: document.getElementById('admin_ticket_number').value,
        ticket_type_id: parseInt(document.getElementById('admin_ticket_type_id').value),
        team_id: parseInt(document.getElementById('admin_team_id').value),
        time_received: timeReceivedFull,
        time_first_contact: timeFirstContactFull,
        time_completed: timeCompletedFull,
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
    
    if (window.adminTimeReceivedPicker) {
        window.adminTimeReceivedPicker.reset();
    }
    if (window.adminTimeFirstContactPicker) {
        window.adminTimeFirstContactPicker.setValue('');
    }
    if (window.adminTimeCompletedPicker) {
        window.adminTimeCompletedPicker.setValue('');
    }
    if (window.adminTimeReceivedTimePicker) {
        window.adminTimeReceivedTimePicker.reset();
    }
    if (window.adminTimeFirstContactTimePicker) {
        window.adminTimeFirstContactTimePicker.setValue('');
    }
    if (window.adminTimeCompletedTimePicker) {
        window.adminTimeCompletedTimePicker.setValue('');
    }
}

// ==================== Users Management ====================
async function loadUsers() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        const data = await window.api.getUsers();
        if (data && data.success) {
            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = '';
            
            if (data.users && data.users.length > 0) {
                data.users.forEach(user => {
                    const row = document.createElement('tr');
                    const roleText = {
                        'admin': 'مدير',
                        'quality_staff': 'موظف جودة',
                        'team_leader': 'قائد فريق',
                        'technician': 'عامل',
                        'call_center': 'كول سنتر',
                        'agent': 'مندوب',
                        'accountant': 'محاسب'
                    }[user.role] || user.role;
                    
                    row.innerHTML = `
                        <td>${user.username}</td>
                        <td>${user.full_name}</td>
                        <td>${user.team_name || '-'}</td>
                        <td>${roleText}</td>
                        <td><span class="badge ${user.is_active ? 'badge-success' : 'badge-danger'}">${user.is_active ? 'نشط' : 'غير نشط'}</span></td>
                        <td>${formatDate(user.created_at)}</td>
                        <td>
                            <button class="btn btn-secondary" onclick="editUser(${user.id})" style="padding: 6px 12px; font-size: 12px; margin-left: 5px;">تعديل</button>
                            ${user.role !== 'admin' ? `<button class="btn btn-danger" onclick="deleteUser(${user.id})" style="padding: 6px 12px; font-size: 12px;">حذف</button>` : ''}
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="7" class="loading">لا يوجد مستخدمين</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading users:', error);
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">خطأ في تحميل البيانات</td></tr>';
        }
    }
}

function showAddUserForm() {
    document.getElementById('userModalTitle').textContent = 'إضافة عامل جديد';
    document.getElementById('userForm').reset();
    document.getElementById('edit_user_id').value = '';
    document.getElementById('user_password').required = true;
    document.getElementById('user_password_label').innerHTML = 'كلمة المرور *';
    document.getElementById('user_is_active').checked = true;
    document.getElementById('user_role').value = '';
    document.getElementById('user_team_group').style.display = 'none';
    document.getElementById('user_team_id').required = false;
    
    // Load teams
    loadTeamsForUserForm();
    
    document.getElementById('userModal').style.display = 'flex';
}

function handleRoleChange() {
    const role = document.getElementById('user_role').value;
    const teamGroup = document.getElementById('user_team_group');
    const teamSelect = document.getElementById('user_team_id');
    
    if (role === 'quality_staff') {
        teamGroup.style.display = 'block';
        teamSelect.required = false;
    } else {
        teamGroup.style.display = 'none';
        teamSelect.required = false;
        teamSelect.value = '';
    }
}

async function loadTeamsForUserForm() {
    try {
        const data = await window.api.getTeams();
        const select = document.getElementById('user_team_id');
        if (select && data.success) {
            select.innerHTML = '<option value="">اختر الفريق</option>';
            data.teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading teams:', error);
    }
}

async function editUser(userId) {
    try {
        const data = await window.api.getUsers();
        if (data && data.success) {
            const user = data.users.find(u => u.id == userId);
            if (user) {
                document.getElementById('userModalTitle').textContent = 'تعديل المستخدم';
                document.getElementById('edit_user_id').value = user.id;
                document.getElementById('user_username').value = user.username;
                document.getElementById('user_password').value = '';
                document.getElementById('user_password').required = false;
                document.getElementById('user_password_label').innerHTML = 'كلمة المرور (اتركه فارغاً إذا لم ترد تغييره)';
                document.getElementById('user_full_name').value = user.full_name;
                document.getElementById('user_role').value = user.role;
                document.getElementById('user_is_active').checked = user.is_active == 1;
                
                handleRoleChange();
                await loadTeamsForUserForm();
                if (user.team_id) {
                    document.getElementById('user_team_id').value = user.team_id;
                }
                
                document.getElementById('userModal').style.display = 'flex';
            }
        }
    } catch (error) {
        alert('خطأ في تحميل بيانات المستخدم: ' + (error.message || 'خطأ غير معروف'));
    }
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

async function deleteUser(userId) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
        return;
    }
    
    try {
        const data = await window.api.deleteUser(userId);
        if (data && data.success) {
            alert('تم حذف المستخدم بنجاح');
            loadUsers();
        } else {
            alert('خطأ في حذف المستخدم: ' + (data.error || 'خطأ غير معروف'));
        }
    } catch (error) {
        alert('خطأ في حذف المستخدم: ' + (error.message || 'خطأ غير معروف'));
    }
}

// Setup user form submission
document.addEventListener('DOMContentLoaded', () => {
    const userForm = document.getElementById('userForm');
    if (userForm) {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const userId = document.getElementById('edit_user_id').value;
            const role = document.getElementById('user_role').value;
            const teamId = document.getElementById('user_team_id').value;
            
            if (!role) {
                alert('يرجى اختيار نوع الحساب');
                return;
            }
            
            const formData = {
                username: document.getElementById('user_username').value,
                full_name: document.getElementById('user_full_name').value,
                role: role,
                team_id: (role === 'quality_staff' && teamId) ? parseInt(teamId) : null,
                is_active: document.getElementById('user_is_active').checked ? 1 : 0
            };
            
            const password = document.getElementById('user_password').value;
            if (password) {
                formData.password = password;
            }
            
            try {
                let data;
                if (userId) {
                    data = await window.api.updateUser(userId, formData);
                } else {
                    if (!password) {
                        alert('كلمة المرور مطلوبة للمستخدمين الجدد');
                        return;
                    }
                    formData.password = password;
                    data = await window.api.createUser(formData);
                }
                
                if (data && data.success) {
                    alert(userId ? 'تم تحديث المستخدم بنجاح' : 'تم إنشاء المستخدم بنجاح');
                    closeUserModal();
                    loadUsers();
                } else {
                    alert('خطأ: ' + (data.error || 'خطأ غير معروف'));
                }
            } catch (error) {
                alert('خطأ: ' + (error.message || 'خطأ غير معروف'));
            }
        });
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

// Make functions available globally
window.removeAdminPhoto = removeAdminPhoto;
window.generateAdminMessage = generateAdminMessage;
window.copyAdminMessage = copyAdminMessage;
window.resetAdminTicketForm = resetAdminTicketForm;
window.showAddUserForm = showAddUserForm;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.closeUserModal = closeUserModal;
window.toggleMobileMenu = toggleMobileMenu;

document.addEventListener('DOMContentLoaded', () => {
    initAdminDashboard();
    setupMobileMenuClose();
});

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

// ==================== Notifications ====================
let notificationsInterval = null;

function initNotifications() {
    loadNotifications();
    // Check for new notifications every 30 seconds
    notificationsInterval = setInterval(loadNotifications, 30000);
}

async function loadNotifications() {
    try {
        if (!window.api) return;
        
        const response = await window.api.getNotifications(true); // Only unread
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
            list.innerHTML = `
                <div class="notification-empty">
                    <div style="font-size: 48px; margin-bottom: 10px;">📭</div>
                    <p>لا توجد إشعارات</p>
                </div>
            `;
            if (countBadge) countBadge.textContent = '0';
            return;
        }
        
        // تحديث العداد
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
        const list = document.getElementById('notificationsList');
        if (list) {
            list.innerHTML = '<div class="notification-error">❌ خطأ في تحميل الإشعارات</div>';
        }
    }
}

async function markNotificationRead(id, event) {
    try {
        if (event) {
            event.stopPropagation();
        }
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

// ==================== Database Export ====================
async function loadExportTables() {
    try {
        if (!window.api) return;
        
        const response = await window.api.getExportTables();
        const container = document.getElementById('exportTablesList');
        
        if (!response || !response.success || !response.tables) {
            container.innerHTML = '<p>خطأ في تحميل قائمة الجداول</p>';
            return;
        }
        
        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">';
        response.tables.forEach(table => {
            html += `
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" class="export-table-checkbox" value="${table.name}" checked style="margin-left: 5px;">
                    <span>${table.description} (${table.name})</span>
                </label>
            `;
        });
        html += '</div>';
        html += '<div style="margin-top: 10px;">';
        html += '<button class="btn btn-sm btn-secondary" onclick="selectAllExportTables()">تحديد الكل</button> ';
        html += '<button class="btn btn-sm btn-secondary" onclick="deselectAllExportTables()">إلغاء تحديد الكل</button>';
        html += '</div>';
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading export tables:', error);
    }
}

function selectAllExportTables() {
    document.querySelectorAll('.export-table-checkbox').forEach(cb => cb.checked = true);
}

function deselectAllExportTables() {
    document.querySelectorAll('.export-table-checkbox').forEach(cb => cb.checked = false);
}

async function exportDatabase() {
    try {
        if (!window.api) {
            alert('API غير متاح');
            return;
        }
        
        const selectedTables = Array.from(document.querySelectorAll('.export-table-checkbox:checked'))
            .map(cb => cb.value);
        
        if (selectedTables.length === 0) {
            alert('الرجاء اختيار جدول واحد على الأقل');
            return;
        }
        
        const resultDiv = document.getElementById('exportResult');
        resultDiv.innerHTML = '<p>جاري تصدير قاعدة البيانات...</p>';
        
        await window.api.exportDatabase(selectedTables);
        
        resultDiv.innerHTML = '<div class="alert alert-success">✅ تم تصدير قاعدة البيانات بنجاح</div>';
    } catch (error) {
        console.error('Error exporting database:', error);
        document.getElementById('exportResult').innerHTML = '<div class="alert alert-error">❌ خطأ في تصدير قاعدة البيانات</div>';
    }
}

// Update loadReports to load export tables
const originalLoadReports = loadReports;
loadReports = function() {
    originalLoadReports();
    loadExportTables();
};

// Initialize notifications on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initNotifications, 1000);
    });
} else {
    setTimeout(initNotifications, 1000);
}

