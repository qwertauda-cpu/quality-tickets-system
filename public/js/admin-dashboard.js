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
    
    // Show dashboard page by default
    showPage('dashboard');
    
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
    
    // Update page title (centralized in /js/menu-config.js)
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) {
        const centralizedTitle = window.MenuConfig?.titles?.[pageName];
        titleEl.textContent = centralizedTitle || 'لوحة التحكم';
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
    } else if (pageName === 'settings') {
        loadSettings();
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
            if (!tbody) {
                console.error('teamsTableBody element not found');
                return;
            }
            tbody.innerHTML = '';
            
            if (data.teams && data.teams.length > 0) {
                data.teams.forEach(team => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${team.name || '-'}</td>
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
        } else {
            const tbody = document.getElementById('teamsTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" class="error">خطأ في تحميل البيانات</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading teams:', error);
        const tbody = document.getElementById('teamsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="error">خطأ في تحميل البيانات</td></tr>';
        }
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
        } else {
            const tbody = document.getElementById('ticketsTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="error">خطأ في تحميل التذاكر</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
        const tbody = document.getElementById('ticketsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="error">خطأ في تحميل التذاكر</td></tr>';
        }
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
    if (!tbody) {
        console.error('ticketsTableBody element not found');
        return;
    }
    
    if (!tickets || tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">لا توجد تذكرةات</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
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
        }[ticket.status] || ticket.status || '-';
        
        const row = document.createElement('tr');
        if (ticket.status === 'postponed') {
            row.classList.add('postponed');
        }
        row.innerHTML = `
            <td>${ticket.ticket_number || '-'}</td>
            <td>${ticket.ticket_type_name || '-'}</td>
            <td>${ticket.team_name || '-'}</td>
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
        alert('يوجد تذكرة مفتوح بالفعل. يرجى إكماله أو إعادة تعيين النموذج.');
        return;
    }
    
    const ticketNumber = document.getElementById('admin_ticket_number').value?.trim();
    const ticketTypeId = document.getElementById('admin_ticket_type_id').value;
    const teamId = document.getElementById('admin_team_id').value;
    
    if (!ticketNumber) {
        alert('يرجى إدخال رقم التذكرة');
        return;
    }
    
    if (!ticketTypeId || ticketTypeId === '') {
        alert('يرجى اختيار نوع التذكرة');
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
        alert('نوع التذكرة غير صحيح');
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
            alert('تم إدخال التذكرة بنجاح! يمكنك الآن إضافة الصور وتقييم الجودة.');
            showAdminTicketDetails(data.ticketId);
        }
    } catch (error) {
        alert('خطأ في إدخال التذكرة: ' + (error.message || 'خطأ غير معروف'));
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
        alert('يجب إدخال التذكرة أولاً');
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
        alert('يجب إدخال التذكرة أولاً');
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
        alert('يجب إدخال التذكرة أولاً');
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
            if (!tbody) {
                console.error('usersTableBody element not found');
                return;
            }
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
                    
                    const statusBadge = user.is_active 
                        ? '<span class="badge badge-success">نشط</span>'
                        : '<span class="badge badge-warning">مجمد</span>';
                    
                    row.innerHTML = `
                        <td>${user.username || '-'}</td>
                        <td>${user.full_name || '-'}</td>
                        <td>${user.team_name || '-'}</td>
                        <td>${roleText}</td>
                        <td>${statusBadge}</td>
                        <td>${formatDate(user.created_at)}</td>
                        <td style="white-space: nowrap;">
                            <button class="btn btn-secondary" onclick="editUser(${user.id})" style="padding: 6px 12px; font-size: 12px; margin-left: 5px;">تعديل</button>
                            ${user.role !== 'admin' ? `
                                ${user.is_active 
                                    ? `<button class="btn btn-warning" onclick="freezeUser(${user.id})" style="padding: 6px 12px; font-size: 12px; margin-left: 5px;">تجميد</button>`
                                    : `<button class="btn btn-success" onclick="unfreezeUser(${user.id})" style="padding: 6px 12px; font-size: 12px; margin-left: 5px;">إلغاء التجميد</button>`
                                }
                                <button class="btn btn-danger" onclick="permanentlyDeleteUser(${user.id})" style="padding: 6px 12px; font-size: 12px; margin-left: 5px;">حذف نهائي</button>
                            ` : ''}
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="7" class="loading">لا يوجد مستخدمين</td></tr>';
            }
        } else {
            const tbody = document.getElementById('usersTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="error">خطأ في تحميل البيانات</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading users:', error);
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="error">خطأ في تحميل البيانات</td></tr>';
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

    // Reset role type selection
    document.querySelectorAll('input[name="role_type"]').forEach(radio => {
        radio.checked = false;
    });
    
    // Reset permissions
    document.getElementById('perm_create_tickets').checked = false;
    document.getElementById('perm_manage_tickets').checked = false;
    document.getElementById('perm_review_quality').checked = false;
    document.getElementById('perm_execute_tickets').checked = false;
    document.getElementById('perm_manage_teams').checked = false;
    document.getElementById('perm_view_reports').checked = false;

    // Reset sections
    document.getElementById('permissions_custom_section').style.display = 'none';
    document.getElementById('permissions_quality_section').style.display = 'none';
    document.getElementById('permissions_technician_section').style.display = 'none';
    
    // Reset role option styles
    document.querySelectorAll('.role-option').forEach(opt => {
        opt.style.borderColor = 'var(--border-color)';
        opt.style.background = 'var(--card-bg)';
    });

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

// Select role type (quality_staff, technician, or custom)
window.selectRoleType = function(roleType) {
    const roleInput = document.getElementById('user_role');
    const teamGroup = document.getElementById('user_team_group');
    const teamSelect = document.getElementById('user_team_id');
    const customSection = document.getElementById('permissions_custom_section');
    const qualitySection = document.getElementById('permissions_quality_section');
    const technicianSection = document.getElementById('permissions_technician_section');
    
    // Reset all checkboxes
    document.getElementById('perm_create_tickets').checked = false;
    document.getElementById('perm_manage_tickets').checked = false;
    document.getElementById('perm_review_quality').checked = false;
    document.getElementById('perm_execute_tickets').checked = false;
    document.getElementById('perm_manage_teams').checked = false;
    document.getElementById('perm_view_reports').checked = false;
    
    // Hide all sections
    customSection.style.display = 'none';
    qualitySection.style.display = 'none';
    technicianSection.style.display = 'none';
    
    // Update role option styles
    document.querySelectorAll('.role-option').forEach(opt => {
        opt.style.borderColor = 'var(--border-color)';
        opt.style.background = 'var(--card-bg)';
    });
    
    if (roleType === 'quality_staff') {
        roleInput.value = 'quality_staff';
        document.getElementById('perm_review_quality').checked = true;
        qualitySection.style.display = 'block';
        teamGroup.style.display = 'block';
        teamSelect.required = false;
        const smallText = document.getElementById('user_team_hint');
        if (smallText) {
            smallText.textContent = 'اختياري - يمكن تعيين موظف الجودة لفريق معين';
        }
        document.querySelector('[data-role="quality_staff"]').style.borderColor = 'var(--success-color)';
        document.querySelector('[data-role="quality_staff"]').style.background = 'rgba(5, 150, 105, 0.05)';
        // Ensure team select is loaded
        loadTeamsForUserForm();
    } else if (roleType === 'technician') {
        roleInput.value = 'technician';
        document.getElementById('perm_execute_tickets').checked = true;
        technicianSection.style.display = 'block';
        teamGroup.style.display = 'block';
        teamSelect.required = true;
        const smallText = document.getElementById('user_team_hint');
        if (smallText) {
            smallText.textContent = 'مطلوب - يجب اختيار الفريق للفني';
        }
        document.querySelector('[data-role="technician"]').style.borderColor = 'var(--primary-color)';
        document.querySelector('[data-role="technician"]').style.background = 'rgba(37, 99, 235, 0.05)';
        // Ensure team select is loaded
        loadTeamsForUserForm();
    } else if (roleType === 'custom') {
        roleInput.value = '';
        customSection.style.display = 'block';
        // Don't hide team group for custom, let updatePermissions() handle it
        teamGroup.style.display = 'block';
        teamSelect.required = false;
        document.querySelector('[data-role="custom"]').style.borderColor = 'var(--primary-color)';
        document.querySelector('[data-role="custom"]').style.background = 'rgba(37, 99, 235, 0.05)';
        // Ensure team select is loaded
        loadTeamsForUserForm();
    }
};

// Convert permissions to role (for custom permissions)
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
    
    // Only update if custom role is selected
    const customRole = document.getElementById('role_custom');
    if (!customRole || !customRole.checked) {
        return; // Don't override selected role type
    }
    
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
    if (!user) {
        return;
    }
    
    let domain = null;
    
    // Try to extract domain from current user's username (admin@domain)
    if (user.username && user.username.includes('@')) {
        const parts = user.username.split('@');
        if (parts.length === 2) {
            domain = parts[1];
        }
    }
    
    // If no domain from username, try to get from company_id
    if (!domain && user.company_id) {
        try {
            // Try to get domain from company
            if (window.api && window.api.getOwnerCompanies) {
                const companiesData = await window.api.getOwnerCompanies();
                if (companiesData && companiesData.success) {
                    const company = companiesData.companies.find(c => c.id === user.company_id);
                    if (company && company.domain) {
                        domain = company.domain;
                    }
                }
            }
        } catch (error) {
            console.error('Error getting company domain:', error);
        }
    }
    
    // If still no domain, try from user.domain (if available from login)
    if (!domain && user.domain) {
        domain = user.domain;
    }
    
    if (!domain) {
        // No domain available - remove any existing listeners
        const newInput = usernameInput.cloneNode(true);
        usernameInput.parentNode.replaceChild(newInput, usernameInput);
        return;
    }
    
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
    
    // Add input event to show hint while typing
    usernameInput.addEventListener('input', function() {
        const value = this.value.trim();
        if (value && !value.includes('@')) {
            // Show hint
            if (!this.dataset.originalPlaceholder) {
                this.dataset.originalPlaceholder = this.placeholder || '';
            }
            this.placeholder = `${value}@${domain}`;
        } else if (value.includes('@')) {
            // Restore original placeholder
            if (this.dataset.originalPlaceholder) {
                this.placeholder = this.dataset.originalPlaceholder;
            }
        }
    });
    
    // Add placeholder
    usernameInput.placeholder = `مثال: ahmed@${domain}`;
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
                
                // Set role type based on role
                if (user.role === 'quality_staff') {
                    document.getElementById('role_quality_staff').checked = true;
                    selectRoleType('quality_staff');
                } else if (user.role === 'technician') {
                    document.getElementById('role_technician').checked = true;
                    selectRoleType('technician');
                } else {
                    document.getElementById('role_custom').checked = true;
                    selectRoleType('custom');
                    // Set permissions based on role
                    setPermissionsFromRole(user.role);
                }
                
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

async function freezeUser(userId) {
    if (!confirm('هل أنت متأكد من تجميد هذا الحساب؟\n\nسيتم تعطيل الحساب ولن يتمكن المستخدم من تسجيل الدخول حتى تقوم بإلغاء التجميد.')) {
        return;
    }
    
    try {
        const data = await window.api.freezeUser(userId, true);
        if (data && data.success) {
            showAlertModal('نجح', 'تم تجميد الحساب بنجاح');
            loadUsers();
        } else {
            showAlertModal('خطأ', 'خطأ في تجميد الحساب: ' + (data?.error || 'خطأ غير معروف'));
        }
    } catch (error) {
        showAlertModal('خطأ', 'خطأ في تجميد الحساب: ' + (error.message || 'خطأ غير معروف'));
    }
}

async function unfreezeUser(userId) {
    if (!confirm('هل أنت متأكد من إلغاء تجميد هذا الحساب؟\n\nسيتم تفعيل الحساب ويمكن للمستخدم تسجيل الدخول مرة أخرى.')) {
        return;
    }
    
    try {
        const data = await window.api.freezeUser(userId, false);
        if (data && data.success) {
            showAlertModal('نجح', 'تم إلغاء تجميد الحساب بنجاح');
            loadUsers();
        } else {
            showAlertModal('خطأ', 'خطأ في إلغاء تجميد الحساب: ' + (data?.error || 'خطأ غير معروف'));
        }
    } catch (error) {
        showAlertModal('خطأ', 'خطأ في إلغاء تجميد الحساب: ' + (error.message || 'خطأ غير معروف'));
    }
}

async function permanentlyDeleteUser(userId) {
    // Get user info for confirmation
    try {
        const usersData = await window.api.getUsers();
        if (usersData && usersData.success) {
            const user = usersData.users.find(u => u.id == userId);
            if (user) {
                const confirmMessage = `⚠️ تحذير: حذف نهائي ⚠️\n\nهل أنت متأكد تماماً من حذف الحساب نهائياً؟\n\nاسم المستخدم: ${user.username}\nالاسم الكامل: ${user.full_name}\n\n⚠️ هذا الإجراء لا يمكن التراجع عنه!\nسيتم حذف الحساب نهائياً من قاعدة البيانات.`;
                
                if (!confirm(confirmMessage)) {
                    return;
                }
                
                // Double confirmation
                if (!confirm('⚠️ تأكيد نهائي ⚠️\n\nأنت على وشك حذف الحساب نهائياً من قاعدة البيانات.\nهذا الإجراء لا يمكن التراجع عنه.\n\nهل أنت متأكد تماماً؟')) {
                    return;
                }
            }
        }
    } catch (error) {
        console.error('Error getting user info:', error);
    }
    
    try {
        const data = await window.api.permanentlyDeleteUser(userId);
        if (data && data.success) {
            showAlertModal('نجح', 'تم حذف الحساب نهائياً بنجاح');
            loadUsers();
        } else {
            showAlertModal('خطأ', 'خطأ في حذف الحساب: ' + (data?.error || 'خطأ غير معروف'));
        }
    } catch (error) {
        showAlertModal('خطأ', 'خطأ في حذف الحساب: ' + (error.message || 'خطأ غير معروف'));
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
// Keep deleteUser for backward compatibility (now it freezes the account)
window.deleteUser = freezeUser;
window.freezeUser = freezeUser;
window.unfreezeUser = unfreezeUser;
window.permanentlyDeleteUser = permanentlyDeleteUser;
window.closeUserModal = closeUserModal;
window.toggleMobileMenu = toggleMobileMenu;
window.generateDailyReport = generateDailyReport;
window.exportDatabase = exportDatabase;
window.selectAllExportTables = selectAllExportTables;
window.deselectAllExportTables = deselectAllExportTables;
window.filterTickets = filterTickets;
window.resetFilters = resetFilters;
window.sortTickets = sortTickets;

// Create Ticket Modal Functions (for admin dashboard)
async function openCreateTicketModal() {
    // Admin can always create tickets
    const modal = document.getElementById('create-ticket-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        
        // Generate ticket number automatically
        generateCreateTicketNumber();
        
        // Load ticket types
        await loadCreateTicketTypes();
        
        // Setup form submission
        setupCreateTicketFormSubmission();
        
        // Setup phone validation
        setupCreatePhoneValidation();
    }
}

function closeCreateTicketModal() {
    const modal = document.getElementById('create-ticket-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
        // Reset form
        const form = document.getElementById('createTicketForm');
        if (form) {
            form.reset();
        }
    }
}

function generateCreateTicketNumber() {
    const ticketNumberInput = document.getElementById('create_ticket_number');
    if (ticketNumberInput) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        
        const ticketNumber = `TKT-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
        ticketNumberInput.value = ticketNumber;
    }
}

async function loadCreateTicketTypes() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        const data = await window.api.getTicketTypes();
        if (data && data.success && data.types) {
            const select = document.getElementById('create_ticket_type_id');
            if (select) {
                select.innerHTML = '<option value="">اختر النوع</option>';
                
                // Add all ticket types from database
                data.types.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.id;
                    option.textContent = type.name_ar || type.name || 'نوع غير معروف';
                    select.appendChild(option);
                });
                
                // Add "مخصص" option at the end
                const customOption = document.createElement('option');
                customOption.value = 'custom';
                customOption.textContent = 'مخصص';
                select.appendChild(customOption);
            }
        } else {
            // Even if API fails, add custom option
            const select = document.getElementById('create_ticket_type_id');
            if (select) {
                const customOption = document.createElement('option');
                customOption.value = 'custom';
                customOption.textContent = 'مخصص';
                select.appendChild(customOption);
            }
        }
    } catch (error) {
        console.error('Error loading ticket types:', error);
        // Even if error, add custom option
        const select = document.getElementById('create_ticket_type_id');
        if (select) {
            const customOption = document.createElement('option');
            customOption.value = 'custom';
            customOption.textContent = 'مخصص';
            select.appendChild(customOption);
        }
    }
}

function setupCreatePhoneValidation() {
    const phoneInput = document.getElementById('create_subscriber_phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }
}

// Save ticket only (without notification)
async function saveTicketOnly() {
    await createTicketWithNotification(false);
}

// Save ticket and send notification to technician
async function saveTicketAndNotify() {
    await createTicketWithNotification(true);
}

// Create ticket with optional notification
async function createTicketWithNotification(sendNotification = false) {
    const phone = document.getElementById('create_subscriber_phone')?.value?.trim() || '';
    if (phone && phone.length !== 11) {
        showAlertModal('تحذير', 'يجب أن يحتوي رقم الهاتف على 11 رقم بالضبط', 'warning');
        return;
    }
    
    const ticketNumber = document.getElementById('create_ticket_number')?.value?.trim();
    const ticketTypeSelect = document.getElementById('create_ticket_type_id');
    const selectedType = ticketTypeSelect ? ticketTypeSelect.value : '';
    let ticketTypeId = null;
    let customTicketType = null;
    
    if (selectedType === 'custom') {
        const customType = document.getElementById('create_custom_ticket_type')?.value.trim();
        if (!customType) {
            showAlertModal('تحذير', 'الرجاء إدخال نوع التذكرة المخصص', 'warning');
            return;
        }
        customTicketType = customType;
    } else if (selectedType && selectedType !== '') {
        ticketTypeId = parseInt(selectedType);
        if (isNaN(ticketTypeId)) {
            showAlertModal('تحذير', 'نوع التذكرة غير صحيح', 'warning');
            return;
        }
    } else {
        showAlertModal('تحذير', 'الرجاء اختيار نوع التذكرة', 'warning');
        return;
    }
    
    const subscriberName = document.getElementById('create_subscriber_name')?.value?.trim() || '';
    const subscriberPhone = phone;
    const region = document.getElementById('create_region')?.value?.trim() || '';
    const notes = document.getElementById('create_notes')?.value?.trim() || '';
    
    if (!ticketTypeId && !customTicketType) {
        showAlertModal('تحذير', 'الرجاء ملء جميع الحقول المطلوبة (*)', 'warning');
        return;
    }
    
    try {
        const formData = {
            ticket_number: ticketNumber,
            ticket_type_id: ticketTypeId,
            custom_ticket_type: customTicketType,
            subscriber_name: subscriberName || null,
            subscriber_phone: subscriberPhone || null,
            region: region || null,
            notes: notes || null,
            send_notification: sendNotification
        };
        
        const result = await window.api.createTicket(formData);
        
        if (result && result.success) {
            const message = sendNotification 
                ? 'تم إنشاء التذكرة بنجاح وإرسال تنبيه للفني!\nرقم التذكرة: ' + (result.ticket?.ticket_number || 'تم التوليد تلقائياً')
                : 'تم إنشاء التذكرة بنجاح!\nرقم التذكرة: ' + (result.ticket?.ticket_number || 'تم التوليد تلقائياً');
            showAlertModal('نجح', message, 'success');
            closeCreateTicketModal();
            // Reload tickets if on tickets page
            if (document.getElementById('tickets-page')?.style.display !== 'none') {
                loadTickets();
            }
        } else {
            showAlertModal('خطأ', result.error || 'فشل إنشاء التذكرة', 'error');
        }
    } catch (error) {
        console.error('Error creating ticket:', error);
        showAlertModal('خطأ', 'حدث خطأ أثناء إنشاء التذكرة: ' + (error.message || 'خطأ غير معروف'), 'error');
    }
}

function setupCreateTicketFormSubmission() {
    // Form submission is now handled by saveTicketOnly() and saveTicketAndNotify()
    // This function is kept for compatibility but form no longer has submit button
}

// Alert Modal Functions
function showAlertModal(title, message, type = 'warning') {
    const modal = document.getElementById('alert-modal');
    const titleEl = document.getElementById('alert-title');
    const messageEl = document.getElementById('alert-message');
    const iconEl = document.getElementById('alert-icon');
    const okBtn = document.getElementById('alert-ok-btn');
    
    if (!modal || !titleEl || !messageEl || !iconEl) return;
    
    titleEl.textContent = title || 'تنبيه';
    messageEl.textContent = message || '';
    
    const types = {
        'success': { icon: '✅', color: 'var(--success-color)', btnClass: 'btn-success' },
        'error': { icon: '❌', color: 'var(--danger-color)', btnClass: 'btn-danger' },
        'warning': { icon: '⚠️', color: 'var(--warning-color)', btnClass: 'btn-warning' },
        'info': { icon: 'ℹ️', color: 'var(--primary-color)', btnClass: 'btn-primary' }
    };
    
    const typeConfig = types[type] || types['warning'];
    iconEl.textContent = typeConfig.icon;
    iconEl.style.color = typeConfig.color;
    
    if (okBtn) {
        okBtn.className = `btn ${typeConfig.btnClass}`;
    }
    
    modal.style.display = 'flex';
    modal.classList.add('active');
}

function closeAlertModal() {
    const modal = document.getElementById('alert-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

// Make create ticket functions available globally
window.openCreateTicketModal = openCreateTicketModal;
window.closeCreateTicketModal = closeCreateTicketModal;
window.showAlertModal = showAlertModal;
window.closeAlertModal = closeAlertModal;
window.generateDailyReport = generateDailyReport;
window.exportDatabase = exportDatabase;
window.selectAllExportTables = selectAllExportTables;
window.deselectAllExportTables = deselectAllExportTables;
window.filterTickets = filterTickets;
window.resetFilters = resetFilters;
window.sortTickets = sortTickets;

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
            const todayStats = data.todayStats || [];
            const totalTickets = todayStats.reduce((sum, stat) => sum + (stat.total_tickets || 0), 0);
            const completedTickets = todayStats.reduce((sum, stat) => sum + (stat.completed_tickets || 0), 0);
            
            const totalTicketsEl = document.getElementById('totalTickets');
            const completedTicketsEl = document.getElementById('completedTickets');
            const pendingTicketsEl = document.getElementById('pendingTickets');
            
            if (totalTicketsEl) totalTicketsEl.textContent = totalTickets;
            if (completedTicketsEl) completedTicketsEl.textContent = completedTickets;
            if (pendingTicketsEl) pendingTicketsEl.textContent = totalTickets - completedTickets;
            
            // Update rankings
            const tbody = document.getElementById('rankingsTableBody');
            if (tbody) {
                tbody.innerHTML = '';
                
                if (data.teamRankings && data.teamRankings.length > 0) {
                    data.teamRankings.forEach((team, index) => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${index + 1}</td>
                            <td>${team.name || '-'}</td>
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
        } else {
            console.error('Dashboard API returned error:', data.error);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        // Show error message in UI
        const totalTicketsEl = document.getElementById('totalTickets');
        const completedTicketsEl = document.getElementById('completedTickets');
        const pendingTicketsEl = document.getElementById('pendingTickets');
        if (totalTicketsEl) totalTicketsEl.textContent = '-';
        if (completedTicketsEl) completedTicketsEl.textContent = '-';
        if (pendingTicketsEl) pendingTicketsEl.textContent = '-';
        
        const tbody = document.getElementById('rankingsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" class="error">خطأ في تحميل البيانات</td></tr>';
        }
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
        
        // تحميل النقاط الأساسية لأنواع التذاكر
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

// تحميل النقاط الأساسية لأنواع التذاكر
async function loadTicketTypeBasePoints(rules) {
    try {
        // جلب أنواع التذاكر
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
            container.innerHTML = '<p>لا توجد أنواع تذكرةات</p>';
            return;
        }
        
        // إنشاء جدول
        let html = '<table class="table" style="width: 100%;"><thead><tr><th>نوع التذكرة</th><th>النقاط الأساسية</th><th>الإجراءات</th></tr></thead><tbody>';
        
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

// حفظ النقاط الأساسية لنوع تذكرة
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
                description: `النقاط الأساسية لنوع التذكرة ${ticketTypeId}`
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

// تحميل التذاكر لقائمة النقاط
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
            tbody.innerHTML = '<tr><td colspan="9" class="error">❌ خطأ في تحميل التذاكر</td></tr>';
        }
    }
}

// عرض التذاكر في الجدول
function displayPointsTickets(tickets) {
    const tbody = document.getElementById('pointsTicketsTableBody');
    if (!tbody) return;
    
    if (!tickets || tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty">لا توجد تذكرةات</td></tr>';
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

// فلترة التذاكر
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
        // جلب معلومات التذكرة
        const ticketResponse = await window.api.getTicket(ticketId);
        if (!ticketResponse || (!ticketResponse.success && !ticketResponse.ticket)) {
            alert('خطأ في جلب معلومات التذكرة');
            return;
        }
        
        const ticket = (ticketResponse && ticketResponse.ticket) ? ticketResponse.ticket : ticketResponse;
        
        if (!ticket || !ticket.ticket_number) {
            alert('خطأ في جلب معلومات التذكرة');
            return;
        }
        
        // عرض معلومات التذكرة
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
                            <div><strong>عدد التذاكر في اليوم:</strong> ${calculatedTimeData.dailyLoad}</div>
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
        
        // جلب قائمة Checklist items بناءً على نوع التذكرة
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
        container.innerHTML = '<p style="grid-column: 1 / -1; color: var(--text-muted); text-align: center; padding: 20px;">لا توجد تاسكات لهذا النوع من التذاكر</p>';
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
        alert('لم يتم تحديد التذكرة');
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
            // إعادة تحميل قائمة التذاكر
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

// ==================== Notifications Page Functions ====================

// Load notifications page
async function loadSettings() {
    try {
        await loadAdminWhatsAppSettings();
    } catch (error) {
        console.error('Error loading admin WhatsApp settings:', error);
    }
    
    try {
        checkAdminWhatsAppStatus();
    } catch (error) {
        console.error('Error checking admin WhatsApp status:', error);
    }
    
    try {
        await loadUsersPermissions();
    } catch (error) {
        console.error('Error loading users permissions:', error);
    }
    
    try {
        setupNotificationsSettingsForm();
        await loadNotificationsSettings();
        // Open notifications accordion by default
        const notificationsContent = document.getElementById('notificationsAccordionContent');
        const notificationsIcon = document.getElementById('notificationsAccordionIcon');
        if (notificationsContent && notificationsIcon) {
            notificationsContent.style.display = 'block';
            notificationsIcon.style.transform = 'rotate(180deg)';
        }
    } catch (error) {
        console.error('Error loading notifications settings:', error);
    }
}

// Toggle Quality Staff Permissions accordion (updated to use loadUsersPermissions)
function toggleQualityStaffPermissionsAccordion() {
    const content = document.getElementById('qualityStaffPermissionsAccordionContent');
    const icon = document.getElementById('qualityStaffPermissionsAccordionIcon');
    if (content && icon) {
        const isOpen = content.style.display !== 'none';
        content.style.display = isOpen ? 'none' : 'block';
        icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
        if (!isOpen) {
            loadUsersPermissions();
        }
    }
}

// Load quality staff permissions
async function loadQualityStaffPermissions() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        const data = await window.api.getQualityStaffUsers();
        if (data && data.success && data.users) {
            const tbody = document.getElementById('qualityStaffPermissionsTableBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            if (data.users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="padding: 20px; text-align: center; color: var(--text-muted);">لا يوجد موظفي جودة</td></tr>';
                return;
            }
            
            data.users.forEach(user => {
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid var(--border-color)';
                row.innerHTML = `
                    <td style="padding: 12px; text-align: right;">${user.full_name || 'غير محدد'}</td>
                    <td style="padding: 12px; text-align: right; color: var(--text-secondary); font-size: 13px;">${user.username || 'غير محدد'}</td>
                    <td style="padding: 12px; text-align: center;">
                        <label style="display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" 
                                   class="notify-permission-checkbox" 
                                   data-user-id="${user.id}"
                                   ${user.can_notify_technicians ? 'checked' : ''}
                                   onchange="updateQualityStaffPermission(${user.id}, this.checked)"
                                   style="width: 18px; height: 18px; cursor: pointer;">
                            <span style="font-size: 14px; color: var(--text-primary);">${user.can_notify_technicians ? '✅ مفعل' : '❌ معطل'}</span>
                        </label>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading quality staff permissions:', error);
        const tbody = document.getElementById('qualityStaffPermissionsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="3" style="padding: 20px; text-align: center; color: var(--error-color);">خطأ في تحميل قائمة موظفي الجودة</td></tr>';
        }
    }
}

// Update quality staff permission
async function updateQualityStaffPermission(userId, canNotify) {
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        const data = await window.api.updateUserPermission(userId, { can_notify_technicians: canNotify ? 1 : 0 });
        if (data && data.success) {
            // Update the label text
            const checkbox = document.querySelector(`.notify-permission-checkbox[data-user-id="${userId}"]`);
            if (checkbox) {
                const label = checkbox.closest('label');
                const span = label.querySelector('span');
                if (span) {
                    span.textContent = canNotify ? '✅ مفعل' : '❌ معطل';
                }
            }
            showAlertModal('نجح', 'تم تحديث الصلاحية بنجاح', 'success');
        } else {
            showAlertModal('خطأ', data.error || 'فشل تحديث الصلاحية', 'error');
            // Revert checkbox
            const checkbox = document.querySelector(`.notify-permission-checkbox[data-user-id="${userId}"]`);
            if (checkbox) {
                checkbox.checked = !canNotify;
            }
        }
    } catch (error) {
        console.error('Error updating permission:', error);
        showAlertModal('خطأ', 'حدث خطأ أثناء تحديث الصلاحية', 'error');
        // Revert checkbox
        const checkbox = document.querySelector(`.notify-permission-checkbox[data-user-id="${userId}"]`);
        if (checkbox) {
            checkbox.checked = !canNotify;
        }
    }
}

// Toggle WhatsApp accordion
function toggleAdminWhatsAppAccordion() {
    const content = document.getElementById('adminWhatsAppAccordionContent');
    const icon = document.getElementById('adminWhatsAppAccordionIcon');
    if (content && icon) {
        const isOpen = content.style.display !== 'none';
        content.style.display = isOpen ? 'none' : 'block';
        icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    }
}

function toggleNotificationsAccordion() {
    const content = document.getElementById('notificationsAccordionContent');
    const icon = document.getElementById('notificationsAccordionIcon');
    if (content && icon) {
        const isOpen = content.style.display !== 'none' && content.style.display !== '';
        content.style.display = isOpen ? 'none' : 'block';
        icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
        if (!isOpen) {
            loadNotificationsSettings();
        }
    }
}

// Load notifications settings
async function loadNotificationsSettings() {
    try {
        // Load from localStorage or API
        const savedSettings = localStorage.getItem('admin_notifications_settings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            // Apply settings to form
            const enabledEl = document.getElementById('notifications_enabled');
            if (enabledEl) enabledEl.checked = settings.enabled !== false;
            
            const newTicketsEl = document.getElementById('notify_new_tickets');
            if (newTicketsEl) newTicketsEl.checked = settings.notify_new_tickets !== false;
            
            const completedTicketsEl = document.getElementById('notify_completed_tickets');
            if (completedTicketsEl) completedTicketsEl.checked = settings.notify_completed_tickets !== false;
            
            const pendingTicketsEl = document.getElementById('notify_pending_tickets');
            if (pendingTicketsEl) pendingTicketsEl.checked = settings.notify_pending_tickets !== false;
            
            const teamUpdatesEl = document.getElementById('notify_team_updates');
            if (teamUpdatesEl) teamUpdatesEl.checked = settings.notify_team_updates !== false;
            
            const userActivitiesEl = document.getElementById('notify_user_activities');
            if (userActivitiesEl) userActivitiesEl.checked = settings.notify_user_activities !== false;
            
            const systemAlertsEl = document.getElementById('notify_system_alerts');
            if (systemAlertsEl) systemAlertsEl.checked = settings.notify_system_alerts !== false;
            
            const soundEl = document.getElementById('notification_sound');
            if (soundEl) soundEl.value = settings.sound || 'default';
            
            const durationEl = document.getElementById('notification_duration');
            if (durationEl) durationEl.value = settings.duration || 5;
            
            const autoCloseEl = document.getElementById('notification_auto_close');
            if (autoCloseEl) autoCloseEl.checked = settings.auto_close !== false;
        }
    } catch (error) {
        console.error('Error loading notifications settings:', error);
    }
}

// Setup notifications settings form
function setupNotificationsSettingsForm() {
    const form = document.getElementById('notificationsSettingsForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const settings = {
            enabled: document.getElementById('notifications_enabled').checked,
            notify_new_tickets: document.getElementById('notify_new_tickets').checked,
            notify_completed_tickets: document.getElementById('notify_completed_tickets').checked,
            notify_pending_tickets: document.getElementById('notify_pending_tickets').checked,
            notify_team_updates: document.getElementById('notify_team_updates').checked,
            notify_user_activities: document.getElementById('notify_user_activities').checked,
            notify_system_alerts: document.getElementById('notify_system_alerts').checked,
            sound: document.getElementById('notification_sound').value,
            duration: parseInt(document.getElementById('notification_duration').value) || 5,
            auto_close: document.getElementById('notification_auto_close').checked
        };
        
        try {
            // Save to localStorage
            localStorage.setItem('admin_notifications_settings', JSON.stringify(settings));
            
            // If API is available, save to server
            if (window.api && window.api.saveAdminSettings) {
                try {
                    await window.api.saveAdminSettings({ notifications: settings });
                } catch (apiError) {
                    console.warn('Could not save to server, saved locally only:', apiError);
                }
            }
            
            showAlertModal('نجح', 'تم حفظ إعدادات الإشعارات بنجاح', 'success');
        } catch (error) {
            console.error('Error saving notifications settings:', error);
            showAlertModal('خطأ', 'حدث خطأ أثناء حفظ الإعدادات', 'error');
        }
    });
}

// Test notification
function testNotification() {
    const settings = {
        enabled: document.getElementById('notifications_enabled').checked,
        sound: document.getElementById('notification_sound').value,
        duration: parseInt(document.getElementById('notification_duration').value) || 5,
        auto_close: document.getElementById('notification_auto_close').checked
    };
    
    if (!settings.enabled) {
        showAlertModal('تنبيه', 'يرجى تفعيل الإشعارات أولاً', 'warning');
        return;
    }
    
    // Create a test notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        background: var(--card-bg);
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: var(--shadow-lg);
        border: 1px solid var(--border-color);
        z-index: 10000;
        min-width: 300px;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px;">🔔</div>
            <div style="flex: 1;">
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">إشعار تجريبي</div>
                <div style="font-size: 14px; color: var(--text-secondary);">هذا إشعار تجريبي للتحقق من الإعدادات</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text-secondary); padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Play sound if enabled
    if (settings.sound !== 'none') {
        // You can add sound playing logic here
        console.log('Playing notification sound:', settings.sound);
    }
    
    // Auto close if enabled
    if (settings.auto_close) {
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }
        }, settings.duration * 1000);
    }
    
    showAlertModal('نجح', 'تم إرسال إشعار تجريبي', 'success');
}

// Add CSS for notification animations
if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(-100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(-100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Load admin WhatsApp settings
async function loadAdminWhatsAppSettings() {
    try {
        if (!window.api) {
            console.error('API not available');
            const phoneEl = document.getElementById('admin_whatsapp_phone');
            const enabledEl = document.getElementById('admin_whatsapp_enabled');
            if (phoneEl) phoneEl.value = '';
            if (enabledEl) enabledEl.checked = false;
            return;
        }
        
        const data = await window.api.getAdminSettings();
        if (data && data.success && data.settings) {
            const phoneEl = document.getElementById('admin_whatsapp_phone');
            const enabledEl = document.getElementById('admin_whatsapp_enabled');
            
            if (phoneEl) phoneEl.value = data.settings.whatsapp_phone || '';
            if (enabledEl) enabledEl.checked = data.settings.whatsapp_enabled === '1' || data.settings.whatsapp_enabled === 1;
        } else {
            const phoneEl = document.getElementById('admin_whatsapp_phone');
            const enabledEl = document.getElementById('admin_whatsapp_enabled');
            if (phoneEl) phoneEl.value = '';
            if (enabledEl) enabledEl.checked = false;
        }
    } catch (error) {
        console.error('Error loading admin WhatsApp settings:', error);
        const phoneEl = document.getElementById('admin_whatsapp_phone');
        const enabledEl = document.getElementById('admin_whatsapp_enabled');
        if (phoneEl) phoneEl.value = '';
        if (enabledEl) enabledEl.checked = false;
    }
}

// Setup admin WhatsApp settings form
function setupAdminWhatsAppSettingsForm() {
    const form = document.getElementById('adminWhatsappSettingsForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            whatsapp_phone: document.getElementById('admin_whatsapp_phone').value.trim(),
            whatsapp_enabled: document.getElementById('admin_whatsapp_enabled').checked ? '1' : '0'
        };
        
        if (!formData.whatsapp_phone) {
            showAlertModal('خطأ', 'يرجى إدخال رقم الواتساب');
            return;
        }
        
        try {
            if (!window.api) {
                showAlertModal('خطأ', 'API غير متاح');
                return;
            }
            
            const data = await window.api.saveAdminSettings(formData);
            if (data && data.success) {
                showAlertModal('نجح', 'تم حفظ الإعدادات بنجاح', 'success');
                if (data.qr_code) {
                    displayAdminQRCode(data.qr_code);
                } else if (data.needs_qr) {
                    checkAdminQRCode();
                } else if (data.connected) {
                    showAlertModal('معلومات', 'واتساب مربوط بالفعل', 'info');
                    checkAdminWhatsAppStatus();
                }
            } else {
                showAlertModal('خطأ', data.error || 'فشل حفظ الإعدادات', 'error');
            }
        } catch (error) {
            console.error('Error saving admin settings:', error);
            showAlertModal('خطأ', 'حدث خطأ أثناء حفظ الإعدادات', 'error');
        }
    });
}

// Generate admin WhatsApp QR
async function generateAdminWhatsAppQR() {
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        const whatsappPhone = document.getElementById('admin_whatsapp_phone')?.value.trim();
        if (!whatsappPhone) {
            showAlertModal('خطأ', 'يرجى إدخال رقم الواتساب أولاً ثم حفظ الإعدادات');
            return;
        }
        
        const whatsappEnabled = document.getElementById('admin_whatsapp_enabled')?.checked;
        if (!whatsappEnabled) {
            showAlertModal('خطأ', 'يرجى تفعيل "إرسال رسائل الواتساب" أولاً ثم حفظ الإعدادات');
            return;
        }
        
        showAlertModal('معلومات', 'جاري توليد QR Code... يرجى الانتظار', 'info');
        
        const data = await window.api.getAdminWhatsAppQR();
        if (data && data.success) {
            if (data.qr_code) {
                displayAdminQRCode(data.qr_code);
            } else if (data.connected) {
                showAlertModal('معلومات', 'واتساب مربوط بالفعل', 'info');
                checkAdminWhatsAppStatus();
            } else {
                checkAdminQRCode();
            }
        } else {
            showAlertModal('خطأ', data.error || 'فشل توليد QR Code', 'error');
        }
    } catch (error) {
        console.error('Error generating admin QR:', error);
        showAlertModal('خطأ', 'حدث خطأ أثناء توليد QR Code', 'error');
    }
}

// Display admin QR code
function displayAdminQRCode(qrCodeData) {
    const container = document.getElementById('adminWhatsappQRContainer');
    const display = document.getElementById('adminQRCodeDisplay');
    
    if (!container || !display) return;
    
    container.style.display = 'block';
    
    // Try to use QRCode library if available
    if (typeof QRCode !== 'undefined') {
        display.innerHTML = '';
        const canvas = document.createElement('canvas');
        display.appendChild(canvas);
        QRCode.toCanvas(canvas, qrCodeData, { width: 256, margin: 2 }, (error) => {
            if (error) {
                console.error('Error generating QR code:', error);
                display.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrCodeData)}" alt="QR Code" style="max-width: 100%; height: auto;">`;
            }
        });
    } else {
        // Fallback to image API
        display.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrCodeData)}" alt="QR Code" style="max-width: 100%; height: auto;">`;
    }
}

// Check for admin QR code
async function checkAdminQRCode() {
    const maxAttempts = 20;
    let attempts = 0;
    
    const checkInterval = setInterval(async () => {
        attempts++;
        try {
            const data = await window.api.getAdminWhatsAppQR();
            if (data && data.success && data.qr_code) {
                clearInterval(checkInterval);
                displayAdminQRCode(data.qr_code);
            } else if (data && data.connected) {
                clearInterval(checkInterval);
                showAlertModal('معلومات', 'واتساب مربوط بالفعل', 'info');
                checkAdminWhatsAppStatus();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                showAlertModal('خطأ', 'انتهى الوقت المحدد لتوليد QR Code', 'error');
            }
        } catch (error) {
            console.error('Error checking QR code:', error);
            if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
            }
        }
    }, 500);
}

// Check admin WhatsApp status
async function checkAdminWhatsAppStatus() {
    try {
        if (!window.api) {
            return;
        }
        
        const data = await window.api.getAdminWhatsAppQR();
        const statusIndicator = document.getElementById('adminWhatsappStatusIndicator');
        const statusIcon = document.getElementById('adminWhatsappStatusIcon');
        const statusText = document.getElementById('adminWhatsappStatusText');
        
        if (!statusIndicator || !statusIcon || !statusText) {
            return;
        }
        
        if (data && data.success) {
            if (data.connected) {
                statusIcon.textContent = '✅';
                statusText.textContent = 'واتساب مربوط';
                statusIndicator.style.display = 'block';
                statusIndicator.style.background = 'rgba(37, 211, 102, 0.1)';
                statusIndicator.style.borderColor = 'rgba(37, 211, 102, 0.3)';
            } else {
                statusIcon.textContent = '❌';
                statusText.textContent = 'واتساب غير مربوط';
                statusIndicator.style.display = 'block';
                statusIndicator.style.background = 'rgba(255, 0, 0, 0.1)';
                statusIndicator.style.borderColor = 'rgba(255, 0, 0, 0.3)';
            }
        }
    } catch (error) {
        console.error('Error checking admin WhatsApp status:', error);
    }
}

// Logout admin WhatsApp
async function logoutAdminWhatsApp() {
    if (!confirm('هل أنت متأكد من تسجيل الخروج من WhatsApp؟')) {
        return;
    }
    
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        const data = await window.api.logoutAdminWhatsApp();
        if (data && data.success) {
            showAlertModal('نجح', 'تم تسجيل الخروج بنجاح', 'success');
            const container = document.getElementById('adminWhatsappQRContainer');
            if (container) container.style.display = 'none';
            checkAdminWhatsAppStatus();
        } else {
            showAlertModal('خطأ', data.error || 'فشل تسجيل الخروج', 'error');
        }
    } catch (error) {
        console.error('Error logging out admin WhatsApp:', error);
        showAlertModal('خطأ', 'حدث خطأ أثناء تسجيل الخروج', 'error');
    }
}

// Make functions globally accessible
window.saveTicketOnly = saveTicketOnly;
window.saveTicketAndNotify = saveTicketAndNotify;
window.toggleAdminWhatsAppAccordion = toggleAdminWhatsAppAccordion;
window.toggleNotificationsAccordion = toggleNotificationsAccordion;
window.testNotification = testNotification;
window.generateAdminWhatsAppQR = generateAdminWhatsAppQR;
window.logoutAdminWhatsApp = logoutAdminWhatsApp;

// ==================== Templates Management ====================
// Toggle templates accordion
function toggleTemplatesAccordion() {
    const content = document.getElementById('templatesAccordionContent');
    const icon = document.getElementById('templatesAccordionIcon');
    if (content && icon) {
        const isOpen = content.style.display !== 'none';
        content.style.display = isOpen ? 'none' : 'block';
        icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
        if (!isOpen) {
            loadTemplates();
        }
    }
}
window.toggleTemplatesAccordion = toggleTemplatesAccordion;

// Load templates
async function loadTemplates() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        const tbody = document.getElementById('templatesTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--text-muted);">جاري التحميل...</td></tr>';
        
        const data = await window.api.getAdminTemplates();
        if (data && data.success && data.templates) {
            if (data.templates.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--text-muted);">لا توجد قوالب. اضغط "إضافة قالب جديد" لإنشاء قالب</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.templates.map(template => {
                const categoryNames = {
                    'subscription_expiry': 'انتهاء اشتراك الشركة',
                    'subscriber_expiry': 'انتهاء اشتراك المشترك',
                    'ticket_notification': 'إشعارات التذاكر',
                    'custom': 'مخصص'
                };
                
                return `
                    <tr>
                        <td style="padding: 12px;">${template.title || '-'}</td>
                        <td style="padding: 12px;">${categoryNames[template.template_category] || template.template_category}</td>
                        <td style="padding: 12px;">${template.template_type || 'custom'}</td>
                        <td style="padding: 12px; text-align: center;">
                            <button onclick="editTemplate(${template.id})" class="btn btn-sm btn-primary">✏️ تعديل</button>
                            <button onclick="deleteTemplate(${template.id})" class="btn btn-sm btn-danger">🗑️ حذف</button>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--text-danger);">خطأ في تحميل القوالب</td></tr>';
        }
    } catch (error) {
        console.error('Error loading templates:', error);
        const tbody = document.getElementById('templatesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--text-danger);">خطأ في تحميل القوالب</td></tr>';
        }
    }
}

// Open create template modal
function openCreateTemplateModal() {
    const modal = document.getElementById('template-modal');
    const title = document.getElementById('template-modal-title');
    const form = document.getElementById('templateForm');
    
    if (modal && title && form) {
        title.textContent = 'إضافة قالب جديد';
        form.reset();
        document.getElementById('template_id').value = '';
        modal.style.display = 'flex';
    }
}
window.openCreateTemplateModal = openCreateTemplateModal;

// Close template modal
function closeTemplateModal() {
    const modal = document.getElementById('template-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}
window.closeTemplateModal = closeTemplateModal;

// Edit template
async function editTemplate(templateId) {
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        const data = await window.api.getTemplate(templateId);
        if (data && data.success && data.template) {
            const template = data.template;
            const modal = document.getElementById('template-modal');
            const title = document.getElementById('template-modal-title');
            
            if (modal && title) {
                title.textContent = 'تعديل القالب';
                document.getElementById('template_id').value = template.id;
                document.getElementById('template_title').value = template.title || '';
                document.getElementById('template_category').value = template.template_category || 'custom';
                document.getElementById('template_type').value = template.template_type || 'custom';
                document.getElementById('template_description').value = template.description || '';
                document.getElementById('template_text').value = template.template_text || '';
                
                modal.style.display = 'flex';
            }
        } else {
            showAlertModal('خطأ', data.error || 'فشل جلب القالب');
        }
    } catch (error) {
        console.error('Error editing template:', error);
        showAlertModal('خطأ', 'حدث خطأ أثناء جلب القالب');
    }
}
window.editTemplate = editTemplate;

// Delete template
async function deleteTemplate(templateId) {
    if (!confirm('هل أنت متأكد من حذف هذا القالب؟')) {
        return;
    }
    
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        const data = await window.api.deleteTemplate(templateId);
        if (data && data.success) {
            showAlertModal('نجح', 'تم حذف القالب بنجاح', 'success');
            loadTemplates();
        } else {
            showAlertModal('خطأ', data.error || 'فشل حذف القالب');
        }
    } catch (error) {
        console.error('Error deleting template:', error);
        showAlertModal('خطأ', 'حدث خطأ أثناء حذف القالب');
    }
}
window.deleteTemplate = deleteTemplate;

// Insert variable into template text
function insertVariable(variable) {
    const textarea = document.getElementById('template_text');
    if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + variable + text.substring(end);
        textarea.value = newText;
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
    }
}
window.insertVariable = insertVariable;

// Setup template form submission
function setupTemplateForm() {
    const form = document.getElementById('templateForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const templateId = document.getElementById('template_id').value;
        const formData = {
            title: document.getElementById('template_title').value.trim(),
            template_text: document.getElementById('template_text').value.trim(),
            template_type: document.getElementById('template_type').value,
            template_category: document.getElementById('template_category').value,
            description: document.getElementById('template_description').value.trim()
        };
        
        if (!formData.title || !formData.template_text || !formData.template_category) {
            showAlertModal('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
            return;
        }
        
        try {
            if (!window.api) {
                showAlertModal('خطأ', 'API غير متاح');
                return;
            }
            
            let data;
            if (templateId) {
                // Update
                data = await window.api.updateTemplate(templateId, formData);
            } else {
                // Create
                data = await window.api.createTemplate(formData);
            }
            
            if (data && data.success) {
                showAlertModal('نجح', templateId ? 'تم تحديث القالب بنجاح' : 'تم إنشاء القالب بنجاح', 'success');
                closeTemplateModal();
                loadTemplates();
            } else {
                showAlertModal('خطأ', data.error || 'فشل حفظ القالب');
            }
        } catch (error) {
            console.error('Error saving template:', error);
            showAlertModal('خطأ', 'حدث خطأ أثناء حفظ القالب');
        }
    });
}

// Load users permissions
async function loadUsersPermissions() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        const tbody = document.getElementById('usersPermissionsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-muted);">جاري التحميل...</td></tr>';
        
        const data = await window.api.getUsersPermissions();
        if (data && data.success && data.users) {
            if (data.users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-muted);">لا توجد موظفين</td></tr>';
                return;
            }
            
            const roleNames = {
                'call_center': 'كول سنتر',
                'quality_staff': 'جودة'
            };
            
            tbody.innerHTML = data.users.map(user => {
                const canNotifyTechnicians = user.can_notify_technicians === 1 || user.can_notify_technicians === true || user.can_notify_technicians === '1';
                const canNotifySubscribers = user.can_notify_subscribers === 1 || user.can_notify_subscribers === true || user.can_notify_subscribers === '1';
                const canSendMessages = user.can_send_messages === 1 || user.can_send_messages === true || user.can_send_messages === '1';
                
                return `
                    <tr>
                        <td style="padding: 12px;">${user.full_name || '-'}</td>
                        <td style="padding: 12px;">${roleNames[user.role] || user.role}</td>
                        <td style="padding: 12px; text-align: center;">
                            <label style="display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                <input type="checkbox" 
                                       class="permission-checkbox" 
                                       data-user-id="${user.id}" 
                                       data-permission="can_notify_technicians"
                                       ${canNotifyTechnicians ? 'checked' : ''}
                                       onchange="updateUserPermission(${user.id}, 'can_notify_technicians', this.checked)">
                            </label>
                        </td>
                        <td style="padding: 12px; text-align: center;">
                            <label style="display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                <input type="checkbox" 
                                       class="permission-checkbox" 
                                       data-user-id="${user.id}" 
                                       data-permission="can_notify_subscribers"
                                       ${canNotifySubscribers ? 'checked' : ''}
                                       onchange="updateUserPermission(${user.id}, 'can_notify_subscribers', this.checked)">
                            </label>
                        </td>
                        <td style="padding: 12px; text-align: center;">
                            <label style="display: flex; align-items: center; justify-content: center; cursor: pointer;">
                                <input type="checkbox" 
                                       class="permission-checkbox" 
                                       data-user-id="${user.id}" 
                                       data-permission="can_send_messages"
                                       ${canSendMessages ? 'checked' : ''}
                                       onchange="updateUserPermission(${user.id}, 'can_send_messages', this.checked)">
                            </label>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-danger);">خطأ في تحميل الموظفين</td></tr>';
        }
    } catch (error) {
        console.error('Error loading users permissions:', error);
        const tbody = document.getElementById('usersPermissionsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-danger);">خطأ في تحميل الموظفين</td></tr>';
        }
    }
}

// Update user permission
async function updateUserPermission(userId, permission, value) {
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        const data = await window.api.updateUserPermission(userId, { [permission]: value });
        if (data && data.success) {
            // Success - checkbox already updated
        } else {
            // Revert checkbox
            const checkbox = document.querySelector(`.permission-checkbox[data-user-id="${userId}"][data-permission="${permission}"]`);
            if (checkbox) {
                checkbox.checked = !value;
            }
            showAlertModal('خطأ', data.error || 'فشل تحديث الصلاحية');
        }
    } catch (error) {
        console.error('Error updating permission:', error);
        // Revert checkbox
        const checkbox = document.querySelector(`.permission-checkbox[data-user-id="${userId}"][data-permission="${permission}"]`);
        if (checkbox) {
            checkbox.checked = !value;
        }
        showAlertModal('خطأ', 'حدث خطأ أثناء تحديث الصلاحية');
    }
}
window.updateUserPermission = updateUserPermission;

// Toggle quality staff permissions accordion
function toggleQualityStaffPermissionsAccordion() {
    const content = document.getElementById('qualityStaffPermissionsAccordionContent');
    const icon = document.getElementById('qualityStaffPermissionsAccordionIcon');
    if (content && icon) {
        const isOpen = content.style.display !== 'none';
        content.style.display = isOpen ? 'none' : 'block';
        icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
        if (!isOpen) {
            loadUsersPermissions();
        }
    }
}
window.toggleQualityStaffPermissionsAccordion = toggleQualityStaffPermissionsAccordion;

// Setup admin WhatsApp settings form on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setupAdminWhatsAppSettingsForm();
    setupTemplateForm();
});

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

