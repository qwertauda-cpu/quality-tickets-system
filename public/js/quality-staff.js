// Quality Staff Interface JavaScript

let currentTicketId = null;
let ticketTypes = [];
let teams = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    if (!isAuthenticated()) {
        window.location.href = '/index.html';
        return;
    }
    
    const user = getCurrentUser();
    document.getElementById('userName').textContent = user.full_name;
    document.getElementById('currentUser').textContent = user.full_name;
    
    // Load initial data
    await loadTicketTypes();
    await loadTeams();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize datetime pickers
    if (typeof initDateTimePickers === 'function') {
        initDateTimePickers();
    }
    
    // Initialize time pickers
    if (typeof initTimePickers === 'function') {
        initTimePickers();
    }
});

async function loadTicketTypes() {
    try {
        if (!window.api) {
            console.error('API not loaded');
            return;
        }
        const data = await window.api.getTicketTypes();
        if (data.success) {
            ticketTypes = data.types;
            const select = document.getElementById('ticket_type_id');
            data.types.forEach(type => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = type.name_ar;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading ticket types:', error);
    }
}

async function loadTeams() {
    try {
        if (!window.api) {
            console.error('API not loaded');
            return;
        }
        const data = await window.api.getTeams();
        if (data.success) {
            teams = data.teams;
            const select = document.getElementById('team_id');
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

function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            if (page) {
                showPage(page);
            }
        });
    });
    
    // Ticket form submission
    document.getElementById('ticketForm').addEventListener('submit', handleTicketSubmit);
    
    // Quality review form
    document.getElementById('qualityReviewForm').addEventListener('submit', handleQualityReviewSubmit);
    
    // Followup checkbox
    document.getElementById('needs_followup').addEventListener('change', (e) => {
        document.getElementById('followupReasonGroup').style.display = e.target.checked ? 'block' : 'none';
    });
    
    // Photo upload
    const photoUploadArea = document.getElementById('photoUploadArea');
    const photoInput = document.getElementById('photoInput');
    
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
        handlePhotoUpload(e.dataTransfer.files);
    });
    
    photoInput.addEventListener('change', (e) => {
        handlePhotoUpload(e.target.files);
    });
}

async function handleTicketSubmit(e) {
    e.preventDefault();
    
    if (!currentTicketId) {
        // Create new ticket
        // Combine date and time
        const dateReceived = getDateTimeValue('time_received_container');
        const timeReceived = getTimeValue('time_received_time_container');
        const timeReceivedFull = combineDateTime(dateReceived, timeReceived);
        
        const dateFirstContact = getDateTimeValue('time_first_contact_container');
        const timeFirstContact = getTimeValue('time_first_contact_time_container');
        const timeFirstContactFull = dateFirstContact && timeFirstContact ? combineDateTime(dateFirstContact, timeFirstContact) : null;
        
        const dateCompleted = getDateTimeValue('time_completed_container');
        const timeCompleted = getTimeValue('time_completed_time_container');
        const timeCompletedFull = dateCompleted && timeCompleted ? combineDateTime(dateCompleted, timeCompleted) : null;
        
        const formData = {
            ticket_number: document.getElementById('ticket_number').value,
            ticket_type_id: parseInt(document.getElementById('ticket_type_id').value),
            team_id: parseInt(document.getElementById('team_id').value),
            time_received: timeReceivedFull,
            time_first_contact: timeFirstContactFull,
            time_completed: timeCompletedFull,
            subscriber_name: document.getElementById('subscriber_name').value || null,
            subscriber_phone: document.getElementById('subscriber_phone').value || null,
            subscriber_address: document.getElementById('subscriber_address').value || null,
            notes: document.getElementById('notes').value || null
        };
        
        try {
            if (!window.api) {
                alert('API not loaded');
                return;
            }
            const data = await window.api.createTicket(formData);
            if (data.success) {
                currentTicketId = data.ticketId;
                alert('تم إدخال التكت بنجاح! يمكنك الآن إضافة الصور وتقييم الجودة.');
                showTicketDetails(data.ticketId);
            }
        } catch (error) {
            alert('خطأ في إدخال التكت: ' + (error.message || 'خطأ غير معروف'));
        }
    }
}

async function showTicketDetails(ticketId) {
    currentTicketId = ticketId;
    showPage('ticket-details');
    
    try {
        const data = await window.api.getTicket(ticketId);
        if (data.success) {
            const ticket = data.ticket;
            document.getElementById('detail-ticket-number').textContent = ticket.ticket_number;
            
            // Load photos
            loadPhotos(ticket.photos || []);
            
            // Load quality review if exists
            if (ticket.qualityReview) {
                loadQualityReview(ticket.qualityReview);
            }
            
            // Load scores
            if (ticket.scores) {
                displayScores(ticket.scores);
            }
        }
    } catch (error) {
        console.error('Error loading ticket details:', error);
    }
}

function loadPhotos(photos) {
    const photoGrid = document.getElementById('photoGrid');
    photoGrid.innerHTML = '';
    
    photos.forEach(photo => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.innerHTML = `
            <img src="${photo.photo_path}" alt="${photo.photo_type}">
            <button class="remove-photo" onclick="removePhoto(${photo.id})">×</button>
        `;
        photoGrid.appendChild(photoItem);
    });
}

async function handlePhotoUpload(files) {
    if (!currentTicketId) {
        alert('يجب إدخال التكت أولاً');
        return;
    }
    
    const photoType = document.getElementById('photo_type').value;
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
        const data = await window.api.uploadPhotos(currentTicketId, formData);
        if (data.success) {
            alert('تم رفع الصور بنجاح');
            // Reload ticket to get updated photos
            showTicketDetails(currentTicketId);
        }
    } catch (error) {
        alert('خطأ في رفع الصور: ' + (error.message || 'خطأ غير معروف'));
    }
}

async function handleQualityReviewSubmit(e) {
    e.preventDefault();
    
    if (!currentTicketId) {
        alert('يجب إدخال التكت أولاً');
        return;
    }
    
    const formData = {
        contact_status: document.getElementById('contact_status').value,
        service_status: document.getElementById('service_status').value,
        team_rating: parseInt(document.getElementById('team_rating').value),
        behavior_rating: document.getElementById('behavior_rating').value,
        explained_sinmana: document.getElementById('explained_sinmana').checked ? 1 : 0,
        explained_platform: document.getElementById('explained_platform').checked ? 1 : 0,
        explained_mytv_plus: document.getElementById('explained_mytv_plus').checked ? 1 : 0,
        explained_shahid_plus: document.getElementById('explained_shahid_plus').checked ? 1 : 0,
        whatsapp_group_interest: document.getElementById('whatsapp_group_interest').checked ? 1 : 0,
        subscription_amount: document.getElementById('subscription_amount').value || null,
        needs_followup: document.getElementById('needs_followup').checked ? 1 : 0,
        followup_reason: document.getElementById('followup_reason').value || null,
        review_notes: document.getElementById('review_notes').value || null,
        upsell_router: document.getElementById('upsell_router').checked ? 1 : 0,
        upsell_onu: document.getElementById('upsell_onu').checked ? 1 : 0,
        upsell_ups: document.getElementById('upsell_ups').checked ? 1 : 0
    };
    
    try {
        const data = await window.api.submitQualityReview(currentTicketId, formData);
        if (data.success) {
            alert('تم حفظ تقييم الجودة بنجاح');
            // Reload ticket
            showTicketDetails(currentTicketId);
        }
    } catch (error) {
        alert('خطأ في حفظ التقييم: ' + (error.message || 'خطأ غير معروف'));
    }
}

function loadQualityReview(review) {
    document.getElementById('contact_status').value = review.contact_status;
    document.getElementById('service_status').value = review.service_status;
    document.getElementById('team_rating').value = review.team_rating;
    if (review.behavior_rating) {
        document.getElementById('behavior_rating').value = review.behavior_rating;
    }
    document.getElementById('explained_sinmana').checked = review.explained_sinmana === 1;
    document.getElementById('explained_platform').checked = review.explained_platform === 1;
    document.getElementById('explained_mytv_plus').checked = review.explained_mytv_plus === 1;
    document.getElementById('explained_shahid_plus').checked = review.explained_shahid_plus === 1;
    document.getElementById('whatsapp_group_interest').checked = review.whatsapp_group_interest === 1;
    document.getElementById('subscription_amount').value = review.subscription_amount || '';
    document.getElementById('needs_followup').checked = review.needs_followup === 1;
    document.getElementById('followup_reason').value = review.followup_reason || '';
    document.getElementById('review_notes').value = review.review_notes || '';
    
    // Upsell fields
    if (review.upsell_router !== undefined) {
        document.getElementById('upsell_router').checked = review.upsell_router === 1;
    }
    if (review.upsell_onu !== undefined) {
        document.getElementById('upsell_onu').checked = review.upsell_onu === 1;
    }
    if (review.upsell_ups !== undefined) {
        document.getElementById('upsell_ups').checked = review.upsell_ups === 1;
    }
    
    if (review.needs_followup === 1) {
        document.getElementById('followupReasonGroup').style.display = 'block';
    }
}

async function generateMessage() {
    if (!currentTicketId) {
        alert('يجب إدخال التكت أولاً');
        return;
    }
    
    try {
        const data = await window.api.generateMessage(currentTicketId);
        if (data.success) {
            document.getElementById('generatedMessage').value = data.message;
            document.getElementById('messageSection').style.display = 'block';
        }
    } catch (error) {
        alert('خطأ في توليد الرسالة: ' + (error.message || 'خطأ غير معروف'));
    }
}

function copyMessage() {
    const messageText = document.getElementById('generatedMessage');
    messageText.select();
    document.execCommand('copy');
    alert('تم نسخ الرسالة!');
}

function displayScores(scores) {
    const scoreDisplay = document.getElementById('scoreDisplay');
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
        'new-ticket': 'إدخال تكت جديد',
        'tickets-list': 'قائمة التكتات',
        'followup': 'المتابعة',
        'daily-report': 'التقرير اليومي'
    };
    document.getElementById('pageTitle').textContent = titles[pageName] || '';
    
    // Load page data
    if (pageName === 'tickets-list') {
        loadTicketsList();
    }
}

async function loadTicketsList() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        const data = await window.api.getTickets();
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
                        <td>
                            <button class="btn btn-secondary" onclick="showTicketDetails(${ticket.id})" style="padding: 6px 12px; font-size: 12px;">عرض</button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="7" class="loading">لا توجد تكتات</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
        const tbody = document.getElementById('ticketsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">خطأ في تحميل البيانات</td></tr>';
        }
    }
}

function resetForm() {
    document.getElementById('ticketForm').reset();
    currentTicketId = null;
    if (window.timeReceivedPicker) {
        window.timeReceivedPicker.reset();
    }
    if (window.timeFirstContactPicker) {
        window.timeFirstContactPicker.setValue('');
    }
    if (window.timeCompletedPicker) {
        window.timeCompletedPicker.setValue('');
    }
    if (window.timeReceivedTimePicker) {
        window.timeReceivedTimePicker.reset();
    }
    if (window.timeFirstContactTimePicker) {
        window.timeFirstContactTimePicker.setValue('');
    }
    if (window.timeCompletedTimePicker) {
        window.timeCompletedTimePicker.setValue('');
    }
}

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
window.showPage = showPage;
window.showTicketDetails = showTicketDetails;
window.generateMessage = generateMessage;
window.copyMessage = copyMessage;
window.resetForm = resetForm;
window.toggleMobileMenu = toggleMobileMenu;

