// Admin Dashboard JavaScript

// Copy ticketChecklists and ticketTypeMapping from quality-staff.js
const ticketChecklists = {
    FTTH_NEW: ["صورة الفات قبل العمل", "صورة الفات بعد الربط", "صورة الفات مغلق", "القدرة المستلمه RX (الباور)", "Broadband", "Network", "WiFi", "البنك", "Speed Test", "الأجهزة"],
    ONU_CHANGE: ["صورة للجهاز القديم", "صورة للجهاز الجديد", "القدرة المستلمه RX (الباور)", "Network", "WiFi", "البنك", "Speed Test", "الأجهزة"],
    RX_ISSUE: ["القدرة المستلمه RX (الباور) قبل", "القدرة المستلمه RX (الباور) بعد", "الفات / الكيبل", "Speed Test", "WiFi", "البنك", "الأجهزة"],
    PPPOE: ["القدرة المستلمه RX (الباور)", "Broadband", "Network", "حالة الاتصال", "WiFi", "البنك", "Speed Test", "الأجهزة"],
    WIFI_SIMPLE: ["WiFi", "البنك", "Speed Test", "الأجهزة"],
    REACTIVATE_SERVICE: ["صورة الفات قبل العمل", "صورة الفات بعد الربط", "صورة الفات مغلق", "القدرة المستلمه RX (الباور)", "Broadband", "Network", "WiFi", "البنك", "Speed Test", "الأجهزة"],
    CHECK_ONLY: ["القدرة المستلمه RX (الباور)", "Broadband", "Network", "WiFi", "البنك", "Speed Test", "الأجهزة"],
    EXTERNAL_MAINTENANCE: ["صورة الفات قبل العمل", "صورة الفات بعد العمل", "صورة السبليتر"],
    FIBER_CUT: ["صورة للقطع", "صورة لصلاح القطع", "القدرة المستلمه RX (الباور)", "Broadband", "Network", "WiFi", "البنك", "Speed Test", "الأجهزة"],
    ACTIVATION_NO_CABLE: ["القدرة المستلمه RX (الباور)", "Broadband", "Network", "WiFi", "البنك", "Speed Test", "الأجهزة"],
    SUBSCRIBER_TAMPERING: ["القدرة المستلمه RX (الباور)", "Broadband", "Network", "WiFi", "البنك", "Speed Test", "الأجهزة"]
};

const ticketTypeMapping = {
    'ربط مشترك جديد FTTH': 'FTTH_NEW',
    'ربط جديد FTTH': 'FTTH_NEW',
    'تبديل او صيانه راوتر/ONU': 'ONU_CHANGE',
    'تبديل راوتر/ONU': 'ONU_CHANGE',
    'ضعف إشارة البور RX': 'RX_ISSUE',
    'ضعف إشارة RX': 'RX_ISSUE',
    'إعداد PPPoE / DHCP': 'PPPOE',
    'إعداد PPPoE/DHCP': 'PPPOE',
    'PPPoE / DHCP': 'PPPOE',
    'PPPoE/DHCP': 'PPPOE',
    'PPPoE': 'PPPOE',
    'PPPOE': 'PPPOE',
    'WiFi بدون تمديد': 'WIFI_SIMPLE',
    'إعادة مشترك إلى الخدمة': 'REACTIVATE_SERVICE',
    'إعادة ربط': 'REACTIVATE_SERVICE',
    'فحص فقط': 'CHECK_ONLY',
    'صيانة خارجية': 'EXTERNAL_MAINTENANCE',
    'صيانة خارجية / فات': 'EXTERNAL_MAINTENANCE',
    'قطع فايبر': 'FIBER_CUT',
    'تفعيل بدون سحب كيبل': 'ACTIVATION_NO_CABLE',
    'عبث مشترك / كهرباء': 'SUBSCRIBER_TAMPERING'
};

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
        'scoring-rules': 'قواعد النقاط',
        'points-management': 'قواعد النقاط',
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
    } else if (pageName === 'scoring-rules') {
        loadScoringRulesPage();
    } else if (pageName === 'points-management') {
        // DEPRECATED: Redirect to scoring-rules
        showPage('scoring-rules');
        return;
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
                // عرض اسم الفريق مع أسماء العمال بين قوسين
                const membersText = team.members_names ? ` (${team.members_names})` : '';
                option.textContent = `${team.name}${membersText}`;
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
                    // عرض اسم الفريق مع أسماء العمال بين قوسين
                    const membersText = team.members_names ? ` (${team.members_names})` : '';
                    option.textContent = `${team.name}${membersText}`;
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
    
    const ticketNumber = document.getElementById('admin_ticket_number').value?.trim();
    const ticketTypeId = document.getElementById('admin_ticket_type_id').value;
    const teamId = document.getElementById('admin_team_id').value;
    
    if (!ticketNumber) {
        alert('يرجى إدخال رقم التكت');
        return;
    }
    
    if (!ticketTypeId || ticketTypeId === '') {
        alert('يرجى اختيار نوع التكت');
        return;
    }
    
    if (!teamId || teamId === '') {
        alert('يرجى اختيار الفريق');
        return;
    }
    
    // التحقق من أن القيم رقمية صحيحة
    const parsedTicketTypeId = parseInt(ticketTypeId);
    const parsedTeamId = parseInt(teamId);
    
    if (isNaN(parsedTicketTypeId) || parsedTicketTypeId <= 0) {
        alert('نوع التكت غير صحيح');
        return;
    }
    
    if (isNaN(parsedTeamId) || parsedTeamId <= 0) {
        alert('الفريق غير صحيح');
        return;
    }
    
    const formData = {
        ticket_number: ticketNumber,
        ticket_type_id: parsedTicketTypeId,
        team_id: parsedTeamId,
        subscriber_name: document.getElementById('admin_subscriber_name').value?.trim() || null,
        subscriber_phone: document.getElementById('admin_subscriber_phone').value?.trim() || null,
        subscriber_address: document.getElementById('admin_subscriber_address').value?.trim() || null,
        notes: document.getElementById('admin_notes').value?.trim() || null
    };
    
    // Log for debugging
    console.log('Sending ticket data:', formData);
    
    try {
        if (!window.api) {
            alert('API not loaded');
            return;
        }
        const data = await window.api.createTicket(formData);
        if (data && data.success) {
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
                        'technician': 'موظف فني',
                        'accountant': 'محاسب',
                        'call_center': 'موظف مركز اتصال'
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

async function showAddUserForm() {
    document.getElementById('userModalTitle').textContent = 'إضافة موظف جديد';
    document.getElementById('userForm').reset();
    document.getElementById('edit_user_id').value = '';
    document.getElementById('user_password').required = true;
    document.getElementById('user_password_label').innerHTML = 'كلمة المرور *';
    document.getElementById('user_is_active').checked = true;
    
    // Reset permissions
    document.getElementById('perm_create_tickets').checked = false;
    document.getElementById('perm_manage_tickets').checked = false;
    document.getElementById('perm_review_quality').checked = false;
    document.getElementById('perm_execute_tickets').checked = false;
    document.getElementById('perm_manage_teams').checked = false;
    document.getElementById('perm_view_reports').checked = false;
    
    document.getElementById('user_role').value = '';
    document.getElementById('user_team_group').style.display = 'none';
    document.getElementById('user_team_id').required = false;
    
    // Load teams
    await loadTeamsForUserForm();
    
    // Setup domain auto-complete for username
    setupUsernameDomainAutoComplete();
    
    document.getElementById('userModal').style.display = 'flex';
}

// Set permissions checkboxes based on role (for editing)
function setPermissionsFromRole(role) {
    // Reset all permissions
    document.getElementById('perm_create_tickets').checked = false;
    document.getElementById('perm_manage_tickets').checked = false;
    document.getElementById('perm_review_quality').checked = false;
    document.getElementById('perm_execute_tickets').checked = false;
    document.getElementById('perm_manage_teams').checked = false;
    document.getElementById('perm_view_reports').checked = false;
    
    // Set permissions based on role
    switch(role) {
        case 'admin':
            document.getElementById('perm_manage_tickets').checked = true;
            document.getElementById('perm_manage_teams').checked = true;
            document.getElementById('perm_view_reports').checked = true;
            break;
        case 'call_center':
            document.getElementById('perm_create_tickets').checked = true;
            break;
        case 'quality_staff':
            document.getElementById('perm_review_quality').checked = true;
            document.getElementById('perm_view_reports').checked = true;
            break;
        case 'technician':
            document.getElementById('perm_execute_tickets').checked = true;
            break;
        case 'team_leader':
            document.getElementById('perm_manage_teams').checked = true;
            document.getElementById('perm_execute_tickets').checked = true;
            break;
        case 'accountant':
            document.getElementById('perm_view_reports').checked = true;
            break;
    }
}

// Convert permissions to role
function updatePermissions() {
    const createTickets = document.getElementById('perm_create_tickets').checked;
    const manageTickets = document.getElementById('perm_manage_tickets').checked;
    const reviewQuality = document.getElementById('perm_review_quality').checked;
    const executeTickets = document.getElementById('perm_execute_tickets').checked;
    const manageTeams = document.getElementById('perm_manage_teams').checked;
    const viewReports = document.getElementById('perm_view_reports').checked;
    
    const teamGroup = document.getElementById('user_team_group');
    const teamSelect = document.getElementById('user_team_id');
    const roleInput = document.getElementById('user_role');
    
    // Determine role based on permissions
    let role = '';
    if (manageTickets && manageTeams) {
        // Admin-like permissions
        role = 'admin';
    } else if (createTickets && !executeTickets && !reviewQuality) {
        // Call center
        role = 'call_center';
    } else if (reviewQuality && !executeTickets) {
        // Quality staff
        role = 'quality_staff';
        teamGroup.style.display = 'block';
        teamSelect.required = false;
        const smallText = document.getElementById('user_team_hint');
        if (smallText) {
            smallText.textContent = 'اختياري - يمكن تعيين موظف الجودة لفريق معين';
        }
    } else if (executeTickets && !reviewQuality) {
        // Technician
        role = 'technician';
        teamGroup.style.display = 'block';
        teamSelect.required = true;
        const smallText = document.getElementById('user_team_hint');
        if (smallText) {
            smallText.textContent = 'مطلوب - يجب اختيار الفريق للفني';
        }
    } else if (manageTeams && !manageTickets) {
        // Team leader
        role = 'team_leader';
        teamGroup.style.display = 'block';
        teamSelect.required = true;
        const smallText = document.getElementById('user_team_hint');
        if (smallText) {
            smallText.textContent = 'مطلوب - يجب اختيار الفريق لقائد الفريق';
        }
    } else if (viewReports && !createTickets && !executeTickets) {
        // Accountant
        role = 'accountant';
        teamGroup.style.display = 'none';
        teamSelect.required = false;
    } else {
        // Default to technician if execute_tickets is checked
        if (executeTickets) {
            role = 'technician';
            teamGroup.style.display = 'block';
            teamSelect.required = true;
            const smallText = document.getElementById('user_team_hint');
            if (smallText) {
                smallText.textContent = 'مطلوب - يجب اختيار الفريق للفني';
            }
        } else {
            teamGroup.style.display = 'none';
            teamSelect.required = false;
        }
    }
    
    roleInput.value = role;
}

async function loadTeamsForUserForm() {
    try {
        const data = await window.api.getTeams();
        const select = document.getElementById('user_team_id');
        if (select && data.success) {
            select.innerHTML = '<option value="">اختر الفريق (اختياري)</option>';
            data.teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                // عرض اسم الفريق مع أسماء العمال بين قوسين
                const membersText = team.members_names ? ` (${team.members_names})` : '';
                option.textContent = `${team.name}${membersText}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading teams:', error);
    }
}

// Setup username domain auto-complete
async function setupUsernameDomainAutoComplete() {
    const usernameInput = document.getElementById('user_username');
    if (!usernameInput) return;
    
    // Get current user's company domain
    const user = getCurrentUser();
    if (!user || !user.company_id) {
        // No company - remove any existing listeners
        const newInput = usernameInput.cloneNode(true);
        usernameInput.parentNode.replaceChild(newInput, usernameInput);
        return;
    }
    
    try {
        // Get company domain
        const companiesData = await window.api.getOwnerCompanies();
        if (companiesData && companiesData.success) {
            const company = companiesData.companies.find(c => c.id === user.company_id);
            if (company && company.domain) {
                const domain = company.domain;
                
                // Add blur event to auto-add @domain
                usernameInput.addEventListener('blur', function() {
                    const value = this.value.trim();
                    if (value && !value.includes('@')) {
                        this.value = `${value}@${domain}`;
                    } else if (value.includes('@')) {
                        // Check if domain matches
                        const parts = value.split('@');
                        if (parts.length === 2 && parts[1] !== domain) {
                            // Wrong domain, fix it
                            this.value = `${parts[0]}@${domain}`;
                        }
                    }
                });
                
                // Add placeholder
                usernameInput.placeholder = `مثال: ahmed@${domain}`;
            }
        }
    } catch (error) {
        console.error('Error setting up domain auto-complete:', error);
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
                
                // Set permissions based on role
                setPermissionsFromRole(user.role);
                
                await loadTeamsForUserForm();
                if (user.team_id) {
                    document.getElementById('user_team_id').value = user.team_id;
                }
                
                updatePermissions();
                
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
            
            // Update role from permissions
            updatePermissions();
            const role = document.getElementById('user_role').value;
            const teamId = document.getElementById('user_team_id').value;
            
            if (!role) {
                alert('يرجى اختيار صلاحية واحدة على الأقل');
                return;
            }
            
            const formData = {
                username: document.getElementById('user_username').value,
                full_name: document.getElementById('user_full_name').value,
                role: role,
                team_id: ((role === 'technician' || role === 'quality_staff') && teamId) ? parseInt(teamId) : null,
                is_active: document.getElementById('user_is_active').checked ? 1 : 0
            };
            
            // التحقق من أن الفريق مطلوب للفني
            if (role === 'technician' && !teamId) {
                alert('يرجى اختيار الفريق للفني');
                return;
            }
            
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

// ==================== Scoring Rules Management Functions ====================

// تحميل صفحة قواعد النقاط
async function loadScoringRulesPage() {
    try {
        await loadScoringRules();
    } catch (error) {
        console.error('Error loading scoring rules page:', error);
    }
}

// تحميل قواعد النقاط
async function loadScoringRules() {
    try {
        const response = await window.api.getScoringRules();
        if (!response || !response.success || !response.rules) {
            console.error('Error loading scoring rules:', response);
            return;
        }
        
        const rules = response.rules;
        
        // تحميل النقاط الأساسية لأنواع التكتات
        await loadTicketTypeBasePoints(rules);
        
        // تحميل قواعد الوقت
        loadSpeedPointsRules(rules);
        
        // تحميل قاعدة Checklist
        loadChecklistPointsRule(rules);
        
        // تحميل قواعد تقييم الفني
        loadPerformanceRatingRules(rules);
        
        // تحميل قواعد البيع
        loadUpsellRules(rules);
        
    } catch (error) {
        console.error('Error loading scoring rules:', error);
    }
}

// تحميل النقاط الأساسية لأنواع التكتات
async function loadTicketTypeBasePoints(rules) {
    try {
        // جلب أنواع التكتات
        const ticketTypesResponse = await window.api.getTicketTypes();
        let ticketTypes = [];
        
        // معالجة بنية البيانات المختلفة - API يرجع { success: true, types: [...] }
        if (ticketTypesResponse) {
            if (ticketTypesResponse.success && Array.isArray(ticketTypesResponse.types)) {
                ticketTypes = ticketTypesResponse.types;
            } else if (ticketTypesResponse.success && Array.isArray(ticketTypesResponse.ticketTypes)) {
                ticketTypes = ticketTypesResponse.ticketTypes;
            } else if (Array.isArray(ticketTypesResponse.types)) {
                ticketTypes = ticketTypesResponse.types;
            } else if (Array.isArray(ticketTypesResponse.ticketTypes)) {
                ticketTypes = ticketTypesResponse.ticketTypes;
            } else if (Array.isArray(ticketTypesResponse)) {
                ticketTypes = ticketTypesResponse;
            }
        }
        
        const container = document.getElementById('ticket-type-base-points-container');
        if (!container) return;
        
        if (!Array.isArray(ticketTypes) || ticketTypes.length === 0) {
            container.innerHTML = '<p>لا توجد أنواع تكتات</p>';
            return;
        }
        
        // إنشاء جدول
        let html = '<table class="table" style="width: 100%;"><thead><tr><th>نوع التكت</th><th>النقاط الأساسية</th><th>الإجراءات</th></tr></thead><tbody>';
        
        ticketTypes.forEach(tt => {
            // البحث عن القاعدة لهذا النوع
            const rule = rules.find(r => r.rule_type === 'ticket_type_base_points' && r.rule_key === tt.id.toString());
            const points = rule ? rule.rule_value : (tt.base_points || 0);
            const ruleId = rule ? rule.id : null;
            
            html += `
                <tr>
                    <td>${tt.name_ar}</td>
                    <td>
                        <input type="number" 
                               id="ticket-type-points-${tt.id}" 
                               class="form-control" 
                               value="${points}" 
                               min="0" 
                               step="0.01"
                               style="width: 150px; display: inline-block;">
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="saveTicketTypeBasePoints(${tt.id}, ${ruleId || 'null'})">
                            💾 حفظ
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading ticket type base points:', error);
    }
}

// حفظ النقاط الأساسية لنوع تكت
async function saveTicketTypeBasePoints(ticketTypeId, ruleId) {
    try {
        const input = document.getElementById(`ticket-type-points-${ticketTypeId}`);
        if (!input) return;
        
        const value = parseFloat(input.value) || 0;
        
        if (ruleId) {
            // تحديث القاعدة الموجودة
            await window.api.updateScoringRule(ruleId, { rule_value: value });
        } else {
            // إنشاء قاعدة جديدة
            await window.api.createScoringRule({
                rule_type: 'ticket_type_base_points',
                rule_key: ticketTypeId.toString(),
                rule_value: value,
                description: `النقاط الأساسية لنوع التكت ${ticketTypeId}`
            });
        }
        
        alert('✅ تم حفظ النقاط بنجاح');
        await loadScoringRules(); // إعادة تحميل
        
    } catch (error) {
        console.error('Error saving ticket type base points:', error);
        alert('❌ خطأ في حفظ النقاط: ' + (error.message || 'خطأ غير معروف'));
    }
}

// تحميل قواعد الوقت
function loadSpeedPointsRules(rules) {
    const excellent = rules.find(r => r.rule_type === 'speed_points_excellent' && !r.rule_key);
    const acceptable = rules.find(r => r.rule_type === 'speed_points_acceptable' && !r.rule_key);
    const late = rules.find(r => r.rule_type === 'speed_points_late' && !r.rule_key);
    const multiplier = rules.find(r => r.rule_type === 'speed_sla_multiplier' && !r.rule_key);
    
    if (excellent) document.getElementById('speed-points-excellent').value = excellent.rule_value;
    if (acceptable) document.getElementById('speed-points-acceptable').value = acceptable.rule_value;
    if (late) document.getElementById('speed-points-late').value = late.rule_value;
    if (multiplier) document.getElementById('speed-sla-multiplier').value = multiplier.rule_value;
}

// حفظ قواعد الوقت
async function saveSpeedPointsRules() {
    try {
        const excellent = parseFloat(document.getElementById('speed-points-excellent').value) || 0;
        const acceptable = parseFloat(document.getElementById('speed-points-acceptable').value) || 0;
        const late = parseFloat(document.getElementById('speed-points-late').value) || 0;
        const multiplier = parseFloat(document.getElementById('speed-sla-multiplier').value) || 1.5;
        
        const response = await window.api.getScoringRules();
        const rules = response && response.success && response.rules ? response.rules : [];
        
        // حفظ/تحديث كل قاعدة
        for (const { type, value, desc } of [
            { type: 'speed_points_excellent', value: excellent, desc: 'نقاط الوقت للمثالي (ضمن SLA)' },
            { type: 'speed_points_acceptable', value: acceptable, desc: 'نقاط الوقت للمقبول (تجاوز بسيط)' },
            { type: 'speed_points_late', value: late, desc: 'نقاط الوقت للمتأخر' },
            { type: 'speed_sla_multiplier', value: multiplier, desc: 'معامل تجاوز SLA' }
        ]) {
            const existingRule = rules.find(r => r.rule_type === type && !r.rule_key);
            if (existingRule) {
                await window.api.updateScoringRule(existingRule.id, { rule_value: value, description: desc });
            } else {
                await window.api.createScoringRule({ rule_type: type, rule_key: null, rule_value: value, description: desc });
            }
        }
        
        alert('✅ تم حفظ قواعد الوقت بنجاح');
        
    } catch (error) {
        console.error('Error saving speed points rules:', error);
        alert('❌ خطأ في حفظ القواعد: ' + (error.message || 'خطأ غير معروف'));
    }
}

// تحميل قاعدة Checklist
function loadChecklistPointsRule(rules) {
    const rule = rules.find(r => r.rule_type === 'checklist_item_points' && !r.rule_key);
    if (rule) document.getElementById('checklist-item-points').value = rule.rule_value;
}

// حفظ قاعدة Checklist
async function saveChecklistPointsRule() {
    try {
        const value = parseFloat(document.getElementById('checklist-item-points').value) || 0;
        
        const response = await window.api.getScoringRules();
        const rules = response && response.success && response.rules ? response.rules : [];
        const existingRule = rules.find(r => r.rule_type === 'checklist_item_points' && !r.rule_key);
        
        if (existingRule) {
            await window.api.updateScoringRule(existingRule.id, { rule_value: value });
        } else {
            await window.api.createScoringRule({ 
                rule_type: 'checklist_item_points', 
                rule_key: null, 
                rule_value: value, 
                description: 'نقاط كل صورة/تاسك مكتمل' 
            });
        }
        
        alert('✅ تم حفظ قاعدة Checklist بنجاح');
        
    } catch (error) {
        console.error('Error saving checklist points rule:', error);
        alert('❌ خطأ في حفظ القاعدة: ' + (error.message || 'خطأ غير معروف'));
    }
}

// تحميل قواعد تقييم أداء الفريق
function loadPerformanceRatingRules(rules) {
    const rating5 = rules.find(r => r.rule_type === 'performance_rating_excellent' && r.rule_key === '5');
    const rating4 = rules.find(r => r.rule_type === 'performance_rating_good' && r.rule_key === '4');
    const rating3 = rules.find(r => r.rule_type === 'performance_rating_average' && r.rule_key === '3');
    const rating2 = rules.find(r => r.rule_type === 'performance_rating_poor' && r.rule_key === '2');
    const rating1 = rules.find(r => r.rule_type === 'performance_rating_very_poor' && r.rule_key === '1');
    
    if (rating5) document.getElementById('performance-rating-5').value = rating5.rule_value;
    if (rating4) document.getElementById('performance-rating-4').value = rating4.rule_value;
    if (rating3) document.getElementById('performance-rating-3').value = rating3.rule_value;
    if (rating2) {
        const el = document.getElementById('performance-rating-2');
        if (el) el.value = rating2.rule_value;
    }
    if (rating1) {
        const el = document.getElementById('performance-rating-1');
        if (el) el.value = rating1.rule_value;
    }
}

// حفظ قواعد تقييم أداء الفريق
async function savePerformanceRatingRules() {
    try {
        const rating5 = parseFloat(document.getElementById('performance-rating-5').value) || 0;
        const rating4 = parseFloat(document.getElementById('performance-rating-4').value) || 0;
        const rating3 = parseFloat(document.getElementById('performance-rating-3').value) || 0;
        const rating2 = parseFloat(document.getElementById('performance-rating-2').value) || 0;
        const rating1 = parseFloat(document.getElementById('performance-rating-1').value) || 0;
        
        const response = await window.api.getScoringRules();
        const rules = response && response.success && response.rules ? response.rules : [];
        
        for (const { type, key, value, desc } of [
            { type: 'performance_rating_excellent', key: '5', value: rating5, desc: 'تقييم ممتاز (5) - لا خصم' },
            { type: 'performance_rating_good', key: '4', value: rating4, desc: 'تقييم جيد (4) - لا خصم' },
            { type: 'performance_rating_average', key: '3', value: rating3, desc: 'تقييم عادي (3) - خصم نقطة واحدة' },
            { type: 'performance_rating_poor', key: '2', value: rating2, desc: 'تقييم ضعيف (2) - خصم نقطتين' },
            { type: 'performance_rating_very_poor', key: '1', value: rating1, desc: 'تقييم ضعيف جداً (1) - خصم 3 نقاط' }
        ]) {
            const existingRule = rules.find(r => r.rule_type === type && r.rule_key === key);
            if (existingRule) {
                await window.api.updateScoringRule(existingRule.id, { rule_value: value, description: desc });
            } else {
                await window.api.createScoringRule({ rule_type: type, rule_key: key, rule_value: value, description: desc });
            }
        }
        
        alert('✅ تم حفظ قواعد التقييم بنجاح');
        
    } catch (error) {
        console.error('Error saving performance rating rules:', error);
        alert('❌ خطأ في حفظ القواعد: ' + (error.message || 'خطأ غير معروف'));
    }
}

// تحميل قواعد البيع
function loadUpsellRules(rules) {
    const router = rules.find(r => r.rule_type === 'upsell_router' && !r.rule_key);
    const onu = rules.find(r => r.rule_type === 'upsell_onu' && !r.rule_key);
    const ups = rules.find(r => r.rule_type === 'upsell_ups' && !r.rule_key);
    
    if (router) document.getElementById('upsell-router').value = router.rule_value;
    if (onu) document.getElementById('upsell-onu').value = onu.rule_value;
    if (ups) document.getElementById('upsell-ups').value = ups.rule_value;
}

// حفظ قواعد البيع
async function saveUpsellRules() {
    try {
        const router = parseFloat(document.getElementById('upsell-router').value) || 0;
        const onu = parseFloat(document.getElementById('upsell-onu').value) || 0;
        const ups = parseFloat(document.getElementById('upsell-ups').value) || 0;
        
        const response = await window.api.getScoringRules();
        const rules = response && response.success && response.rules ? response.rules : [];
        
        for (const { type, value, desc } of [
            { type: 'upsell_router', value: router, desc: 'نقاط بيع Router' },
            { type: 'upsell_onu', value: onu, desc: 'نقاط بيع ONU' },
            { type: 'upsell_ups', value: ups, desc: 'نقاط بيع UPS' }
        ]) {
            const existingRule = rules.find(r => r.rule_type === type && !r.rule_key);
            if (existingRule) {
                await window.api.updateScoringRule(existingRule.id, { rule_value: value, description: desc });
            } else {
                await window.api.createScoringRule({ rule_type: type, rule_key: null, rule_value: value, description: desc });
            }
        }
        
        alert('✅ تم حفظ قواعد البيع بنجاح');
        
    } catch (error) {
        console.error('Error saving upsell rules:', error);
        alert('❌ خطأ في حفظ القواعد: ' + (error.message || 'خطأ غير معروف'));
    }
}

// ==================== DEPRECATED: Points Management Functions (Will be removed) ====================

let currentPointsTicketId = null;
let pointsTicketsData = [];

// تحميل صفحة إدارة النقاط
async function loadPointsManagementPage() {
    try {
        await loadPointsTickets();
        await loadTeamsForPointsFilter();
    } catch (error) {
        console.error('Error loading points management page:', error);
    }
}

// تحميل التكتات لقائمة النقاط
async function loadPointsTickets() {
    try {
        const response = await window.api.getTickets({ limit: 1000 });
        if (response && response.success && response.tickets) {
            pointsTicketsData = response.tickets;
            displayPointsTickets(pointsTicketsData);
        } else if (response && response.tickets) {
            // Fallback if response structure is different
            pointsTicketsData = response.tickets;
            displayPointsTickets(pointsTicketsData);
        } else {
            pointsTicketsData = [];
            displayPointsTickets([]);
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
        const tbody = document.getElementById('pointsTicketsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="9" class="error">❌ خطأ في تحميل التكتات</td></tr>';
        }
    }
}

// عرض التكتات في الجدول
function displayPointsTickets(tickets) {
    const tbody = document.getElementById('pointsTicketsTableBody');
    if (!tbody) return;
    
    if (!tickets || tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty">لا توجد تكتات</td></tr>';
        return;
    }
    
    tbody.innerHTML = tickets.map(ticket => {
        const statusText = {
            'pending': 'معلقة',
            'in_progress': 'قيد التنفيذ',
            'completed': 'مكتملة',
            'postponed': 'مؤجلة',
            'closed': 'مغلقة'
        }[ticket.status] || ticket.status;
        
        const actualTime = ticket.actual_time_minutes 
            ? `${(ticket.actual_time_minutes / 60).toFixed(2)} ساعة`
            : '-';
        
        const finalPoints = parseFloat(ticket.points || 0) || 0;
        
        return `
            <tr>
                <td>${ticket.ticket_number}</td>
                <td>${ticket.ticket_type_name || '-'}</td>
                <td>${ticket.team_name || '-'}</td>
                <td>${statusText}</td>
                <td>${actualTime}</td>
                <td><strong style="color: var(--primary-color);">${finalPoints.toFixed(2)}</strong></td>
                <td>${ticket.manager_name || '-'}</td>
                <td>${ticket.time_received ? formatDateTime(ticket.time_received) : '-'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="openPointsManagementModal(${ticket.id})">
                        📊 إدارة النقاط
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// تحميل الفرق للفلترة
async function loadTeamsForPointsFilter() {
    try {
        const response = await window.api.getTeams();
        const teams = response && response.teams ? response.teams : (response || []);
        const select = document.getElementById('pointsTeamFilter');
        if (select && Array.isArray(teams)) {
            select.innerHTML = '<option value="">جميع الفرق</option>' +
                teams.map(team => `<option value="${team.id}">${team.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading teams:', error);
    }
}

// فلترة التكتات
function filterPointsTickets() {
    const search = document.getElementById('pointsSearch')?.value.toLowerCase() || '';
    const dateFilter = document.getElementById('pointsDateFilter')?.value || '';
    const teamFilter = document.getElementById('pointsTeamFilter')?.value || '';
    
    let filtered = pointsTicketsData.filter(ticket => {
        const matchesSearch = !search || 
            ticket.ticket_number?.toLowerCase().includes(search) ||
            ticket.ticket_type_name?.toLowerCase().includes(search);
        
        const matchesDate = !dateFilter || 
            (ticket.time_received && ticket.time_received.startsWith(dateFilter));
        
        const matchesTeam = !teamFilter || 
            ticket.team_id == teamFilter;
        
        return matchesSearch && matchesDate && matchesTeam;
    });
    
    displayPointsTickets(filtered);
}

// إعادة تعيين الفلترة
function resetPointsFilters() {
    document.getElementById('pointsSearch').value = '';
    document.getElementById('pointsDateFilter').value = '';
    document.getElementById('pointsTeamFilter').value = '';
    filterPointsTickets();
}

// فتح modal إدارة النقاط
async function openPointsManagementModal(ticketId) {
    currentPointsTicketId = ticketId;
    const modal = document.getElementById('points-management-modal');
    if (!modal) return;
    
    try {
        // جلب معلومات التكت
        const ticketResponse = await window.api.getTicket(ticketId);
        if (!ticketResponse || (!ticketResponse.success && !ticketResponse.ticket)) {
            alert('خطأ في جلب معلومات التكت');
            return;
        }
        
        const ticket = (ticketResponse && ticketResponse.ticket) ? ticketResponse.ticket : ticketResponse;
        
        if (!ticket || !ticket.ticket_number) {
            alert('خطأ في جلب معلومات التكت');
            return;
        }
        
        // عرض معلومات التكت
        document.getElementById('points-ticket-number').textContent = ticket.ticket_number;
        document.getElementById('points-ticket-type').textContent = ticket.ticket_type_name || '-';
        document.getElementById('points-time-received').textContent = ticket.time_received ? formatDateTime(ticket.time_received) : '-';
        document.getElementById('points-time-first-contact').textContent = ticket.time_first_contact ? formatDateTime(ticket.time_first_contact) : '-';
        document.getElementById('points-time-completed').textContent = ticket.time_completed ? formatDateTime(ticket.time_completed) : '-';
        
        // حساب الوقت الفعلي
        if (ticket.time_received && ticket.time_completed) {
            const start = new Date(ticket.time_received);
            const end = new Date(ticket.time_completed);
            const hours = (end - start) / (1000 * 60 * 60);
            document.getElementById('points-actual-time').textContent = hours.toFixed(2);
        } else {
            document.getElementById('points-actual-time').textContent = '-';
        }
        
        // حساب Daily Load Factor و Adjusted Time و Speed Points المقترحة
        let calculatedTimeData = null;
        try {
            const timeCalcResponse = await window.api.calculateTimePoints(ticketId);
            if (timeCalcResponse && timeCalcResponse.success) {
                calculatedTimeData = timeCalcResponse;
                // عرض معلومات الحساب
                const timeInfoDiv = document.getElementById('points-time-info');
                if (timeInfoDiv) {
                    timeInfoDiv.innerHTML = `
                        <div style="background: rgba(59, 130, 246, 0.1); padding: 15px; border-radius: 8px; margin-top: 10px;">
                            <div><strong>عدد التكتات في اليوم:</strong> ${calculatedTimeData.dailyLoad}</div>
                            <div><strong>الوقت الفعلي:</strong> ${calculatedTimeData.actualMinutes} دقيقة</div>
                            <div><strong>الوقت المعدل (Adjusted):</strong> ${calculatedTimeData.adjustedMinutes.toFixed(2)} دقيقة</div>
                            <div><strong>نقاط الوقت المقترحة:</strong> ${calculatedTimeData.suggestedSpeedPoints} / 10</div>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error calculating time points:', error);
        }
        
        // جلب قائمة Checklist items بناءً على نوع التكت
        const ticketTypeKey = ticketTypeMapping[ticket.ticket_type_name] || null;
        const checklistItems = ticketTypeKey ? ticketChecklists[ticketTypeKey] : [];
        
        // عرض Checklist items مع inputs
        renderChecklistItemsForPoints(checklistItems);
        
        // جلب النقاط الموجودة (إن وجدت)
        const pointsResponse = await window.api.getTicketPoints(ticketId);
        let checklistPointsData = {};
        if (pointsResponse && pointsResponse.success && pointsResponse.points) {
            const points = pointsResponse.points;
            
            // تعبئة الحقول
            document.getElementById('base_points').value = points.base_points || 0;
            document.getElementById('time_points').value = points.time_points || 0;
            document.getElementById('upsell_points').value = points.upsell_points || 0;
            document.getElementById('bonus_points').value = points.bonus_points || 0;
            document.getElementById('time_penalty').value = points.time_penalty || 0;
            document.getElementById('tasks_penalty').value = points.tasks_penalty || 0;
            document.getElementById('quality_penalty').value = points.quality_penalty || 0;
            document.getElementById('behavior_penalty').value = points.behavior_penalty || 0;
            document.getElementById('other_penalty').value = points.other_penalty || 0;
            document.getElementById('team_performance_rating').value = points.team_performance_rating || '';
            document.getElementById('manager_notes').value = points.manager_notes || '';
            
            // تحميل نقاط Checklist items
            if (points.checklist_points_json) {
                try {
                    checklistPointsData = JSON.parse(points.checklist_points_json);
                    // تعبئة inputs
                    checklistItems.forEach(item => {
                        const input = document.getElementById(`checklist-point-${item.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}`);
                        if (input && checklistPointsData[item]) {
                            input.value = checklistPointsData[item];
                        }
                    });
                } catch (e) {
                    console.error('Error parsing checklist_points_json:', e);
                }
            }
        } else {
            // إعادة تعيين الحقول
            ['base_points', 'upsell_points', 'bonus_points',
             'time_penalty', 'tasks_penalty', 'quality_penalty', 'behavior_penalty', 'other_penalty', 
             'team_performance_rating', 'manager_notes'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            
            // ملء نقاط الوقت المقترحة تلقائياً
            if (calculatedTimeData) {
                document.getElementById('time_points').value = calculatedTimeData.suggestedSpeedPoints;
            } else {
                document.getElementById('time_points').value = '';
            }
        }
        
        // تحميل قواعد النقاط للتخزين المؤقت
        await loadScoringRulesCache();
        
        // إضافة event listeners لحساب الإجماليات
        setupPointsCalculationListeners();
        
        // حساب الإجماليات الأولية
        calculatePointsTotals();
        
        // عرض الـ modal
        modal.classList.add('active');
    } catch (error) {
        console.error('Error opening points modal:', error);
        alert('خطأ في فتح صفحة النقاط');
    }
}

// عرض Checklist items مع inputs
function renderChecklistItemsForPoints(items) {
    const container = document.getElementById('checklist-items-container');
    if (!container) return;
    
    if (!items || items.length === 0) {
        container.innerHTML = '<p style="grid-column: 1 / -1; color: var(--text-muted); text-align: center; padding: 20px;">لا توجد تاسكات لهذا النوع من التكتات</p>';
        return;
    }
    
    container.innerHTML = items.map(item => {
        const inputId = `checklist-point-${item.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}`;
        return `
            <div class="form-group" style="background: var(--bg-secondary); padding: 15px; border-radius: 8px;">
                <label for="${inputId}" style="display: block; margin-bottom: 8px; font-weight: 500;">${item}</label>
                <input type="number" id="${inputId}" min="0" step="0.01" class="form-control checklist-point-input" 
                       placeholder="0.00" data-item="${item}">
            </div>
        `;
    }).join('');
    
    // إضافة event listeners لحقول checklist
    container.querySelectorAll('.checklist-point-input').forEach(input => {
        input.addEventListener('input', calculatePointsTotals);
    });
}

// إعداد مستمعي الحساب
function setupPointsCalculationListeners() {
    const inputIds = ['base_points', 'time_points', 'upsell_points', 'bonus_points',
                     'time_penalty', 'tasks_penalty', 'quality_penalty', 'behavior_penalty', 'other_penalty',
                     'team_performance_rating'];
    
    inputIds.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            // إزالة المستمعين القديمين
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);
            
            // إضافة مستمع جديد
            document.getElementById(id).addEventListener('change', calculatePointsTotals);
            document.getElementById(id).addEventListener('input', calculatePointsTotals);
        }
    });
    
    // Checklist inputs
    document.querySelectorAll('.checklist-point-input').forEach(input => {
        input.addEventListener('input', calculatePointsTotals);
    });
}

// متغير لتخزين قواعد النقاط (يتم تحميله مرة واحدة)
let cachedScoringRules = null;

// تحميل قواعد النقاط مرة واحدة
async function loadScoringRulesCache() {
    try {
        const rulesResponse = await window.api.getScoringRules();
        if (rulesResponse && rulesResponse.success && rulesResponse.rules) {
            cachedScoringRules = rulesResponse.rules;
        }
    } catch (error) {
        console.error('Error loading scoring rules cache:', error);
    }
}

// حساب الإجماليات
function calculatePointsTotals() {
    const basePoints = parseFloat(document.getElementById('base_points').value) || 0;
    const timePoints = parseFloat(document.getElementById('time_points').value) || 0;
    const upsellPoints = parseFloat(document.getElementById('upsell_points').value) || 0;
    const bonusPoints = parseFloat(document.getElementById('bonus_points').value) || 0;
    
    // حساب نقاط Checklist من inputs
    let qualityPoints = 0;
    document.querySelectorAll('.checklist-point-input').forEach(input => {
        const value = parseFloat(input.value) || 0;
        qualityPoints += value;
    });
    
    // تحديث حقل quality_points (readonly)
    const qualityPointsInput = document.getElementById('quality_points');
    if (qualityPointsInput) {
        qualityPointsInput.value = qualityPoints.toFixed(2);
    }
    
    const timePenalty = parseFloat(document.getElementById('time_penalty').value) || 0;
    const tasksPenalty = parseFloat(document.getElementById('tasks_penalty').value) || 0;
    const qualityPenalty = parseFloat(document.getElementById('quality_penalty').value) || 0;
    const behaviorPenalty = parseFloat(document.getElementById('behavior_penalty').value) || 0;
    const otherPenalty = parseFloat(document.getElementById('other_penalty').value) || 0;
    
    // حساب خصم تقييم أداء الفريق
    let performanceRatingPenalty = 0;
    const teamPerformanceRating = document.getElementById('team_performance_rating');
    if (teamPerformanceRating && teamPerformanceRating.value && cachedScoringRules) {
        const rating = teamPerformanceRating.value;
        let ruleType = '';
        
        // تحديد نوع القاعدة حسب التقييم
        switch(rating) {
            case '5':
                ruleType = 'performance_rating_excellent';
                break;
            case '4':
                ruleType = 'performance_rating_good';
                break;
            case '3':
                ruleType = 'performance_rating_average';
                break;
            case '2':
                ruleType = 'performance_rating_poor';
                break;
            case '1':
                ruleType = 'performance_rating_very_poor';
                break;
        }
        
        if (ruleType) {
            const rule = cachedScoringRules.find(r => r.rule_type === ruleType && r.rule_key === rating);
            if (rule) {
                performanceRatingPenalty = Math.abs(parseFloat(rule.rule_value) || 0); // تحويل إلى قيمة موجبة للخصم
                
                // عرض الخصم في الحقل
                const penaltyInput = document.getElementById('performance_rating_penalty');
                if (penaltyInput) {
                    penaltyInput.value = performanceRatingPenalty.toFixed(2);
                }
            }
        }
    } else {
        // إعادة تعيين حقل خصم التقييم إذا لم يتم اختيار تقييم
        const penaltyInput = document.getElementById('performance_rating_penalty');
        if (penaltyInput) {
            penaltyInput.value = '0';
        }
    }
    
    const totalEarned = basePoints + timePoints + qualityPoints + upsellPoints + bonusPoints;
    const totalPenalty = timePenalty + tasksPenalty + qualityPenalty + behaviorPenalty + otherPenalty + performanceRatingPenalty;
    const finalPoints = totalEarned - totalPenalty;
    
    document.getElementById('total-earned-display').textContent = totalEarned.toFixed(2);
    document.getElementById('total-penalty-display').textContent = totalPenalty.toFixed(2);
    document.getElementById('final-points-display').textContent = finalPoints.toFixed(2);
}

// حفظ النقاط
async function saveTicketPoints() {
    if (!currentPointsTicketId) {
        alert('لم يتم تحديد التكت');
        return;
    }
    
    // جمع نقاط Checklist items
    const checklistPointsData = {};
    document.querySelectorAll('.checklist-point-input').forEach(input => {
        const item = input.getAttribute('data-item');
        const points = parseFloat(input.value) || 0;
        if (item && points > 0) {
            checklistPointsData[item] = points;
        }
    });
    
    const qualityPoints = parseFloat(document.getElementById('quality_points').value) || 0;
    
    const pointsData = {
        base_points: parseFloat(document.getElementById('base_points').value) || 0,
        time_points: parseFloat(document.getElementById('time_points').value) || 0,
        quality_points: qualityPoints,
        checklist_points_json: JSON.stringify(checklistPointsData),
        upsell_points: parseFloat(document.getElementById('upsell_points').value) || 0,
        bonus_points: parseFloat(document.getElementById('bonus_points').value) || 0,
        time_penalty: parseFloat(document.getElementById('time_penalty').value) || 0,
        tasks_penalty: parseFloat(document.getElementById('tasks_penalty').value) || 0,
        quality_penalty: parseFloat(document.getElementById('quality_penalty').value) || 0,
        behavior_penalty: parseFloat(document.getElementById('behavior_penalty').value) || 0,
        other_penalty: parseFloat(document.getElementById('other_penalty').value) || 0,
        team_performance_rating: parseInt(document.getElementById('team_performance_rating').value) || null,
        manager_notes: document.getElementById('manager_notes').value
    };
    
    try {
        const response = await window.api.saveTicketPoints(currentPointsTicketId, pointsData);
        if (response && response.success) {
            alert('تم حفظ النقاط بنجاح');
            closePointsManagementModal();
            // إعادة تحميل قائمة التكتات
            await loadPointsTickets();
        } else {
            alert('خطأ في حفظ النقاط: ' + (response?.message || 'خطأ غير معروف'));
        }
    } catch (error) {
        console.error('Error saving points:', error);
        alert('خطأ في حفظ النقاط');
    }
}

// حذف النقاط
async function deleteTicketPoints() {
    if (!currentPointsTicketId) {
        return;
    }
    
    if (!confirm('هل أنت متأكد من حذف النقاط؟')) {
        return;
    }
    
    try {
        const response = await window.api.deleteTicketPoints(currentPointsTicketId);
        if (response && response.success) {
            alert('تم حذف النقاط بنجاح');
            closePointsManagementModal();
            await loadPointsTickets();
        } else {
            alert('خطأ في حذف النقاط');
        }
    } catch (error) {
        console.error('Error deleting points:', error);
        alert('خطأ في حذف النقاط');
    }
}

// إغلاق الـ modal
function closePointsManagementModal() {
    const modal = document.getElementById('points-management-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    currentPointsTicketId = null;
}

// إغلاق modal عند النقر خارجها
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('points-management-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closePointsManagementModal();
            }
        });
    }
});

