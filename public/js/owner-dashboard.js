// Owner Dashboard JavaScript

// Global variable for QR code refresh timer
let qrCodeRefreshTimer = null;

// Wait for scripts to load
function initOwnerDashboard() {
    // Check if required functions are available
    if (typeof isAuthenticated === 'undefined' || typeof getCurrentUser === 'undefined') {
        setTimeout(initOwnerDashboard, 100);
        return;
    }
    
    // Wait for api to be available
    if (typeof window.api === 'undefined') {
        setTimeout(initOwnerDashboard, 100);
        return;
    }
    
    if (!isAuthenticated()) {
        window.location.href = '/index.html';
        return;
    }
    
    const user = getCurrentUser();
    if (!user || user.role !== 'owner') {
        showAlertModal('خطأ', 'غير مصرح لك بالوصول إلى هذه الصفحة');
        window.location.href = '/index.html';
        return;
    }
    
    document.getElementById('userName').textContent = user.full_name || user.display_username || user.username;
    document.getElementById('currentUser').textContent = user.full_name || user.display_username || user.username;
    
    // Setup navigation
    setupNavigation();
    
    // Check WhatsApp connection status on page load
    updateWhatsAppStatusIndicator();
    // Update status every 30 seconds
    setInterval(updateWhatsAppStatusIndicator, 30000);
    
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
    
    // Remove active class from all links
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to clicked link
    document.querySelector(`.sidebar-menu a[data-page="${pageName}"]`)?.classList.add('active');
    
    // Show selected page
    const targetPage = document.getElementById(pageName + '-page');
    if (targetPage) {
        targetPage.style.display = 'block';
    }
    
    // Update page title (centralized in /js/menu-config.js)
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) {
        const centralizedTitle = window.MenuConfig?.titles?.[pageName];
        titleEl.textContent = centralizedTitle || 'لوحة التحكم';
    }
    
    // Load page data
    switch(pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'companies':
            loadCompanies();
            break;
        case 'employees':
            loadEmployees();
            break;
        case 'invoices':
            loadInvoices();
            break;
        case 'purchase-requests':
            loadPurchaseRequests();
            break;
        case 'database':
            loadDatabaseTables();
            break;
        case 'settings':
            loadSettings();
            // Check WhatsApp connection status when settings page loads
            setTimeout(() => {
                checkConnectionStatusOnLoad();
            }, 500);
            break;
    }
}

// ==================== Dashboard ====================
async function loadDashboard() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        const data = await window.api.getOwnerDashboard();
        if (data && data.success) {
            const stats = data.stats || {};
            const totalCompaniesEl = document.getElementById('totalCompanies');
            const totalEmployeesEl = document.getElementById('totalEmployees');
            const pendingInvoicesEl = document.getElementById('pendingInvoices');
            const pendingRequestsEl = document.getElementById('pendingRequests');
            const totalRevenueEl = document.getElementById('totalRevenue');
            const inactiveCompaniesEl = document.getElementById('inactiveCompanies');
            const expiringSoonEl = document.getElementById('expiringSoon');
            
            if (totalCompaniesEl) totalCompaniesEl.textContent = stats.total_companies || 0;
            if (totalEmployeesEl) totalEmployeesEl.textContent = stats.total_employees || 0;
            if (pendingInvoicesEl) pendingInvoicesEl.textContent = stats.pending_invoices || 0;
            if (pendingRequestsEl) pendingRequestsEl.textContent = stats.pending_requests || 0;
            if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(stats.total_revenue || 0);
            if (inactiveCompaniesEl) inactiveCompaniesEl.textContent = stats.inactive_companies || 0;
            if (expiringSoonEl) expiringSoonEl.textContent = stats.expiring_soon || 0;
            
            // Load recent invoices
            loadRecentInvoices(data.recent_invoices || []);
            
            // Load active companies
            loadActiveCompanies(data.active_companies || []);
            
            // Load inactive companies
            loadInactiveCompanies(data.inactive_companies || []);
            
            // Load expiring companies
            loadExpiringCompanies(data.expiring_companies || []);
            
        } else {
            console.error('Dashboard API returned error:', data?.error);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        // Show error in UI
        const totalCompaniesEl = document.getElementById('totalCompanies');
        const totalEmployeesEl = document.getElementById('totalEmployees');
        const pendingInvoicesEl = document.getElementById('pendingInvoices');
        const pendingRequestsEl = document.getElementById('pendingRequests');
        const totalRevenueEl = document.getElementById('totalRevenue');
        const inactiveCompaniesEl = document.getElementById('inactiveCompanies');
        const expiringSoonEl = document.getElementById('expiringSoon');
        
        if (totalCompaniesEl) totalCompaniesEl.textContent = '-';
        if (totalEmployeesEl) totalEmployeesEl.textContent = '-';
        if (pendingInvoicesEl) pendingInvoicesEl.textContent = '-';
        if (pendingRequestsEl) pendingRequestsEl.textContent = '-';
        if (totalRevenueEl) totalRevenueEl.textContent = '-';
        if (inactiveCompaniesEl) inactiveCompaniesEl.textContent = '-';
        if (expiringSoonEl) expiringSoonEl.textContent = '-';
    }
}

function loadRecentInvoices(invoices) {
    const tbody = document.getElementById('recentInvoicesTableBody');
    if (!tbody) return;
    
    if (!invoices || invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">لا توجد فواتير</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    invoices.forEach(invoice => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${invoice.invoice_number || '-'}</td>
            <td>${invoice.company_name || '-'} ${invoice.domain ? '(@' + invoice.domain + ')' : ''}</td>
            <td>${formatCurrency(invoice.total || 0)}</td>
            <td>${invoice.due_date ? formatDate(invoice.due_date) : '-'}</td>
            <td><span class="badge badge-${getInvoiceStatusClass(invoice.status)}">${getInvoiceStatusName(invoice.status)}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewInvoice(${invoice.id})">عرض</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function loadActiveCompanies(companies) {
    const tbody = document.getElementById('activeCompaniesTableBody');
    if (!tbody) return;
    
    if (!companies || companies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد شركات نشطة</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    companies.forEach(company => {
        const row = document.createElement('tr');
        const endDate = company.subscription_end_date ? formatDate(company.subscription_end_date) : 'غير محدد';
        row.innerHTML = `
            <td>${company.name || '-'}</td>
            <td>@${company.domain || '-'}</td>
            <td>${company.current_employees || 0}</td>
            <td>${endDate}</td>
            <td><span class="badge badge-success">نشط</span></td>
        `;
        tbody.appendChild(row);
    });
}

function loadInactiveCompanies(companies) {
    const tbody = document.getElementById('inactiveCompaniesTableBody');
    if (!tbody) return;
    
    if (!companies || companies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد شركات غير نشطة</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    companies.forEach(company => {
        const row = document.createElement('tr');
        const endDate = company.subscription_end_date ? formatDate(company.subscription_end_date) : 'غير محدد';
        row.innerHTML = `
            <td>${company.name || '-'}</td>
            <td>@${company.domain || '-'}</td>
            <td>${company.current_employees || 0}</td>
            <td>${endDate}</td>
            <td><span class="badge badge-warning">غير نشط</span></td>
        `;
        tbody.appendChild(row);
    });
}

function loadExpiringCompanies(companies) {
    const tbody = document.getElementById('expiringCompaniesTableBody');
    const badge = document.getElementById('expiringCountBadge');
    if (!tbody) return;
    
    if (badge) {
        badge.textContent = companies ? companies.length : 0;
    }
    
    if (!companies || companies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد اشتراكات قريبة على الانتهاء</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    companies.forEach(company => {
        const row = document.createElement('tr');
        const daysRemaining = company.days_remaining || 0;
        const daysClass = daysRemaining <= 7 ? 'badge-danger' : daysRemaining <= 15 ? 'badge-warning' : 'badge-info';
        row.innerHTML = `
            <td>${company.name || '-'}</td>
            <td>@${company.domain || '-'}</td>
            <td>${company.subscription_end_date ? formatDate(company.subscription_end_date) : 'غير محدد'}</td>
            <td><span class="badge ${daysClass}">${daysRemaining} يوم</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editCompany(${company.id})">تعديل</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getInvoiceStatusClass(status) {
    const statusMap = {
        'draft': 'secondary',
        'sent': 'info',
        'paid': 'success',
        'overdue': 'danger',
        'cancelled': 'secondary'
    };
    return statusMap[status] || 'secondary';
}

function getInvoiceStatusName(status) {
    const statusMap = {
        'draft': 'مسودة',
        'sent': 'مرسلة',
        'paid': 'مدفوعة',
        'overdue': 'متأخرة',
        'cancelled': 'ملغاة'
    };
    return statusMap[status] || status;
}

// ==================== Companies Management ====================
let allCompaniesData = []; // Store all companies data for sorting

async function loadCompanies() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        const data = await window.api.getOwnerCompanies();
        if (data && data.success) {
            // Store companies data for sorting
            allCompaniesData = data.companies || [];
            
            // Apply current sort if any
            applyCompanySort();
        } else {
            const tbody = document.getElementById('companiesTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center error">خطأ في تحميل البيانات</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading companies:', error);
        const tbody = document.getElementById('companiesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center error">خطأ في تحميل البيانات</td></tr>';
        }
    }
}

window.applyCompanySort = function() {
    const sortSelect = document.getElementById('sortCompanies');
    const sortValue = sortSelect ? sortSelect.value : 'default';
    
    const tbody = document.getElementById('companiesTableBody');
    if (!tbody) {
        console.error('companiesTableBody element not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    if (!allCompaniesData || allCompaniesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">لا توجد شركات</td></tr>';
        return;
    }
    
    // Create a copy of companies array for sorting
    let sortedCompanies = [...allCompaniesData];
    
    // Apply sorting based on selected option
    switch (sortValue) {
        case 'employees_asc':
            sortedCompanies.sort((a, b) => {
                const aEmployees = a.current_employees || 0;
                const bEmployees = b.current_employees || 0;
                return aEmployees - bEmployees;
            });
            break;
            
        case 'employees_desc':
            sortedCompanies.sort((a, b) => {
                const aEmployees = a.current_employees || 0;
                const bEmployees = b.current_employees || 0;
                return bEmployees - aEmployees;
            });
            break;
            
        case 'expiring_soon':
            sortedCompanies.sort((a, b) => {
                // Companies with subscription_end_date closer to today come first
                const aDate = a.subscription_end_date ? new Date(a.subscription_end_date) : null;
                const bDate = b.subscription_end_date ? new Date(b.subscription_end_date) : null;
                
                if (!aDate && !bDate) return 0;
                if (!aDate) return 1; // Put companies without date at the end
                if (!bDate) return -1;
                
                const today = new Date();
                const aDiff = Math.abs(aDate - today);
                const bDiff = Math.abs(bDate - today);
                
                // Only show companies with dates in the future (not expired)
                if (aDate < today && bDate < today) return 0;
                if (aDate < today) return 1;
                if (bDate < today) return -1;
                
                return aDiff - bDiff;
            });
            break;
            
        case 'expiring_later':
            sortedCompanies.sort((a, b) => {
                // Companies with subscription_end_date further from today come first
                const aDate = a.subscription_end_date ? new Date(a.subscription_end_date) : null;
                const bDate = b.subscription_end_date ? new Date(b.subscription_end_date) : null;
                
                if (!aDate && !bDate) return 0;
                if (!aDate) return 1; // Put companies without date at the end
                if (!bDate) return -1;
                
                const today = new Date();
                const aDiff = Math.abs(aDate - today);
                const bDiff = Math.abs(bDate - today);
                
                // Only show companies with dates in the future (not expired)
                if (aDate < today && bDate < today) return 0;
                if (aDate < today) return 1;
                if (bDate < today) return -1;
                
                return bDiff - aDiff;
            });
            break;
            
        case 'default':
        default:
            // Keep original order (usually by creation date DESC from API)
            break;
    }
    
    // Render sorted companies
    sortedCompanies.forEach(company => {
        const row = document.createElement('tr');
        
        // Calculate days remaining for subscription
        let daysRemaining = null;
        if (company.subscription_end_date) {
            const endDate = new Date(company.subscription_end_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            const diffTime = endDate - today;
            daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        
        // Add subscription info if available
        let subscriptionInfo = '';
        if (daysRemaining !== null) {
            if (daysRemaining < 0) {
                subscriptionInfo = ` <span class="badge badge-danger" style="margin-right: 8px;">منتهي</span>`;
            } else if (daysRemaining <= 30) {
                subscriptionInfo = ` <span class="badge badge-warning" style="margin-right: 8px;">${daysRemaining} يوم متبقي</span>`;
            } else {
                subscriptionInfo = ` <span class="badge badge-info" style="margin-right: 8px;">${daysRemaining} يوم متبقي</span>`;
            }
        }
        
        const statusBadge = company.is_active 
            ? '<span class="badge badge-success">نشط</span>' 
            : '<span class="badge badge-danger">مجمد</span>';
        
        row.innerHTML = `
            <td>${company.name || '-'}${subscriptionInfo}</td>
            <td><strong>@${company.domain || '-'}</strong></td>
            <td>${company.admin_name || company.admin_username || '-'}</td>
            <td>${company.current_employees || 0} / ${company.max_employees || '∞'}</td>
            <td>${formatCurrency(company.price_per_employee || 0)}</td>
            <td>${statusBadge}</td>
            <td style="white-space: nowrap;">
                <button class="btn btn-sm btn-primary" onclick="editCompany(${company.id})" style="padding: 6px 12px; font-size: 12px; margin-left: 5px;" title="تعديل الشركة">✏️ تعديل</button>
                ${company.is_active 
                    ? `<button class="btn btn-sm btn-warning" onclick="freezeCompany(${company.id})" style="padding: 6px 12px; font-size: 12px; margin-left: 5px;" title="تجميد الشركة">❄️ تجميد</button>`
                    : `<button class="btn btn-sm btn-success" onclick="unfreezeCompany(${company.id})" style="padding: 6px 12px; font-size: 12px; margin-left: 5px;" title="إلغاء تجميد الشركة">✅ إلغاء التجميد</button>`
                }
                <button class="btn btn-sm btn-info" onclick="renewCompanySubscription(${company.id})" style="padding: 6px 12px; font-size: 12px; margin-left: 5px;" title="تجديد الاشتراك">🔄 تجديد</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Helper function to setup thousands input field
function setupThousandsInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    // Set step to 1000 for spinner arrows
    input.step = 1000;
    input.min = 0;
    
    // Handle spinner arrow clicks (up/down)
    input.addEventListener('wheel', function(e) {
        e.preventDefault();
        const currentValue = parseFloat(this.value) || 0;
        if (e.deltaY < 0) {
            // Scroll up = increase by 1000
            this.value = (currentValue + 1000).toString();
        } else {
            // Scroll down = decrease by 1000
            this.value = Math.max(0, currentValue - 1000).toString();
        }
    });
    
    // Handle input change to ensure value is in thousands
    input.addEventListener('change', function(e) {
        const currentValue = parseFloat(this.value);
        if (!isNaN(currentValue) && currentValue > 0) {
            // Round to nearest thousand
            const roundedValue = Math.round(currentValue / 1000) * 1000;
            this.value = roundedValue.toString();
        }
    });
    
    // Handle manual input - convert to thousands on blur
    input.addEventListener('blur', function(e) {
        const currentValue = parseFloat(this.value);
        if (!isNaN(currentValue) && currentValue > 0) {
            // If value is less than 1000, assume user entered in thousands and multiply
            if (currentValue < 1000) {
                this.value = (currentValue * 1000).toString();
            } else {
                // Round to nearest thousand
                const roundedValue = Math.round(currentValue / 1000) * 1000;
                this.value = roundedValue.toString();
            }
        }
    });
}

// Toggle password visibility
window.togglePasswordVisibility = function(inputId, button) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '🙈';
    } else {
        input.type = 'password';
        button.textContent = '👁️';
    }
};

// Freeze/Unfreeze Company functions
window.freezeCompany = async function(companyId) {
    if (!confirm('هل أنت متأكد من تجميد هذه الشركة؟\n\nسيتم تعطيل جميع حسابات الشركة ولن يتمكنوا من تسجيل الدخول حتى تقوم بإلغاء التجميد.')) {
        return;
    }
    
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        const data = await window.api.freezeCompany(companyId, true);
        if (data && data.success) {
            showAlertModal('نجح', 'تم تجميد الشركة بنجاح');
            loadCompanies();
        } else {
            showAlertModal('خطأ', 'خطأ في تجميد الشركة: ' + (data?.error || 'خطأ غير معروف'));
        }
    } catch (error) {
        console.error('Error freezing company:', error);
        showAlertModal('خطأ', 'خطأ في تجميد الشركة: ' + (error.message || 'خطأ غير معروف'));
    }
};

window.unfreezeCompany = async function(companyId) {
    if (!confirm('هل أنت متأكد من إلغاء تجميد هذه الشركة؟\n\nسيتم تفعيل جميع حسابات الشركة ويمكن للمستخدمين تسجيل الدخول مرة أخرى.')) {
        return;
    }
    
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        const data = await window.api.freezeCompany(companyId, false);
        if (data && data.success) {
            showAlertModal('نجح', 'تم إلغاء تجميد الشركة بنجاح');
            loadCompanies();
        } else {
            showAlertModal('خطأ', 'خطأ في إلغاء تجميد الشركة: ' + (data?.error || 'خطأ غير معروف'));
        }
    } catch (error) {
        console.error('Error unfreezing company:', error);
        showAlertModal('خطأ', 'خطأ في إلغاء تجميد الشركة: ' + (error.message || 'خطأ غير معروف'));
    }
};

// Renew Company Subscription
window.renewCompanySubscription = async function(companyId) {
    const months = prompt('أدخل عدد الأشهر لتجديد الاشتراك:', '1');
    if (!months || isNaN(months) || parseInt(months) <= 0) {
        return;
    }
    
    if (!confirm(`هل أنت متأكد من تجديد الاشتراك لمدة ${months} شهر؟`)) {
        return;
    }
    
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        const data = await window.api.renewCompanySubscription(companyId, parseInt(months));
        if (data && data.success) {
            showAlertModal('نجح', `تم تجديد الاشتراك بنجاح!\nتاريخ الانتهاء الجديد: ${data.new_end_date || 'غير محدد'}`);
            loadCompanies();
        } else {
            showAlertModal('خطأ', 'خطأ في تجديد الاشتراك: ' + (data?.error || 'خطأ غير معروف'));
        }
    } catch (error) {
        console.error('Error renewing subscription:', error);
        showAlertModal('خطأ', 'خطأ في تجديد الاشتراك: ' + (error.message || 'خطأ غير معروف'));
    }
};

// Make functions globally available
window.openAddCompanyModal = function() {
    const modal = document.getElementById('addCompanyModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
    document.getElementById('addCompanyForm').reset();
    // Setup thousands input for price field
    setupThousandsInput('company_price_per_employee');
};

window.closeAddCompanyModal = function() {
    const modal = document.getElementById('addCompanyModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
};

document.getElementById('addCompanyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('company_name').value,
        domain: document.getElementById('company_domain').value,
        contact_name: document.getElementById('company_contact_name').value,
        contact_email: document.getElementById('company_contact_email').value,
        contact_phone: document.getElementById('company_contact_phone').value,
        address: document.getElementById('company_address').value,
        max_employees: parseInt(document.getElementById('company_max_employees').value) || 0,
        price_per_employee: parseFloat(document.getElementById('company_price_per_employee').value) || 0,
        admin_password: document.getElementById('company_admin_password').value
    };
    
    try {
        const data = await window.api.createCompany(formData);
        if (data && data.success) {
            showAlertModal('نجح', `تم إنشاء الشركة بنجاح!\nاسم المستخدم: ${data.company.admin_username}`);
            closeAddCompanyModal();
            loadCompanies();
            loadDashboard();
        }
    } catch (error) {
        showAlertModal('خطأ', error.message || 'حدث خطأ في إنشاء الشركة');
    }
});

// ==================== Employees Management ====================
async function loadEmployees() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        const companyIdEl = document.getElementById('filterCompanyEmployees');
        const companyId = companyIdEl ? companyIdEl.value : '';
        const params = companyId ? { company_id: companyId } : {};
        
        const data = await window.api.getOwnerEmployees(params);
        if (data && data.success) {
            const tbody = document.getElementById('employeesTableBody');
            if (!tbody) {
                console.error('employeesTableBody element not found');
                return;
            }
            tbody.innerHTML = '';
            
            if (!data.employees || data.employees.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">لا يوجد موظفين</td></tr>';
                // Load companies for filter even if no employees
                await loadCompaniesForFilter('filterCompanyEmployees');
                return;
            }
            
            data.employees.forEach(emp => {
                const row = document.createElement('tr');
                const statusBadge = emp.is_active 
                    ? '<span class="badge badge-success">نشط</span>'
                    : '<span class="badge badge-warning">مجمد</span>';
                
                row.innerHTML = `
                    <td>${emp.username || '-'}</td>
                    <td>${emp.full_name || '-'}</td>
                    <td>${getRoleName(emp.role)}</td>
                    <td>${emp.company_name ? `${emp.company_name} (@${emp.domain || '-'})` : '-'}</td>
                    <td>${emp.team_name || '-'}</td>
                    <td>${statusBadge}</td>
                    <td style="white-space: nowrap;">
                        <button class="btn btn-sm btn-primary" onclick="editEmployee(${emp.id})" style="padding: 6px 12px; font-size: 12px; margin-left: 5px;">تعديل</button>
                        ${emp.role !== 'admin' && emp.role !== 'owner' ? `
                            ${emp.is_active 
                                ? `<button class="btn btn-sm btn-warning" onclick="freezeEmployee(${emp.id})" style="padding: 6px 12px; font-size: 12px; margin-left: 5px;">تجميد</button>`
                                : `<button class="btn btn-sm btn-success" onclick="unfreezeEmployee(${emp.id})" style="padding: 6px 12px; font-size: 12px; margin-left: 5px;">إلغاء التجميد</button>`
                            }
                            <button class="btn btn-sm btn-danger" onclick="permanentlyDeleteEmployee(${emp.id})" style="padding: 6px 12px; font-size: 12px; margin-left: 5px;">حذف نهائي</button>
                        ` : ''}
                    </td>
                `;
                tbody.appendChild(row);
            });
        } else {
            const tbody = document.getElementById('employeesTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center error">خطأ في تحميل البيانات</td></tr>';
            }
        }
        
        // Load companies for filter
        await loadCompaniesForFilter('filterCompanyEmployees');
    } catch (error) {
        console.error('Error loading employees:', error);
        const tbody = document.getElementById('employeesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center error">خطأ في تحميل البيانات</td></tr>';
        }
    }
}

// Freeze/Unfreeze employee functions
window.freezeEmployee = async function(employeeId) {
    if (!confirm('هل أنت متأكد من تجميد هذا الحساب؟\n\nسيتم تعطيل الحساب ولن يتمكن المستخدم من تسجيل الدخول حتى تقوم بإلغاء التجميد.')) {
        return;
    }
    
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        const data = await window.api.freezeUser(employeeId, true);
        if (data && data.success) {
            showAlertModal('نجح', 'تم تجميد الحساب بنجاح');
            loadEmployees();
        } else {
            showAlertModal('خطأ', 'خطأ في تجميد الحساب: ' + (data?.error || 'خطأ غير معروف'));
        }
    } catch (error) {
        console.error('Error freezing employee:', error);
        showAlertModal('خطأ', 'خطأ في تجميد الحساب: ' + (error.message || 'خطأ غير معروف'));
    }
};

window.unfreezeEmployee = async function(employeeId) {
    if (!confirm('هل أنت متأكد من إلغاء تجميد هذا الحساب؟\n\nسيتم تفعيل الحساب ويمكن للمستخدم تسجيل الدخول مرة أخرى.')) {
        return;
    }
    
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        const data = await window.api.freezeUser(employeeId, false);
        if (data && data.success) {
            showAlertModal('نجح', 'تم إلغاء تجميد الحساب بنجاح');
            loadEmployees();
        } else {
            showAlertModal('خطأ', 'خطأ في إلغاء تجميد الحساب: ' + (data?.error || 'خطأ غير معروف'));
        }
    } catch (error) {
        console.error('Error unfreezing employee:', error);
        showAlertModal('خطأ', 'خطأ في إلغاء تجميد الحساب: ' + (error.message || 'خطأ غير معروف'));
    }
};

window.editEmployee = async function(employeeId) {
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        // Get employee data
        const employeesData = await window.api.getOwnerEmployees();
        if (!employeesData || !employeesData.success) {
            showAlertModal('خطأ', 'فشل في تحميل بيانات الموظف');
            return;
        }
        
        const emp = employeesData.employees.find(e => e.id == employeeId);
        if (!emp) {
            showAlertModal('خطأ', 'الموظف غير موجود');
            return;
        }
        
        // Open edit modal
        const modal = document.getElementById('editEmployeeModal');
        if (!modal) {
            showAlertModal('خطأ', 'نافذة التعديل غير موجودة');
            return;
        }
        
        // Fill form with employee data
        document.getElementById('edit_employee_id').value = emp.id;
        document.getElementById('edit_employee_username').value = emp.username || '';
        document.getElementById('edit_employee_full_name').value = emp.full_name || '';
        document.getElementById('edit_employee_password').value = '';
        document.getElementById('edit_employee_is_active').checked = emp.is_active === 1 || emp.is_active === true;
        
        // Load teams for dropdown
        try {
            const teamsData = await window.api.getTeams();
            const teamSelect = document.getElementById('edit_employee_team_id');
            if (teamSelect && teamsData && teamsData.success) {
                teamSelect.innerHTML = '<option value="">لا يوجد فريق</option>';
                (teamsData.teams || []).forEach(team => {
                    const option = document.createElement('option');
                    option.value = team.id;
                    option.textContent = team.name;
                    if (emp.team_id == team.id) {
                        option.selected = true;
                    }
                    teamSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading teams:', error);
        }
        
        // Show modal
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    } catch (error) {
        console.error('Error loading employee for edit:', error);
        showAlertModal('خطأ', 'حدث خطأ في تحميل بيانات الموظف: ' + (error.message || 'خطأ غير معروف'));
    }
};

window.closeEditEmployeeModal = function() {
    const modal = document.getElementById('editEmployeeModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
        const form = document.getElementById('editEmployeeForm');
        if (form) {
            form.reset();
        }
    }
};

// Setup edit employee form submission
(function() {
    const editEmployeeForm = document.getElementById('editEmployeeForm');
    if (editEmployeeForm) {
        editEmployeeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const employeeId = document.getElementById('edit_employee_id')?.value;
            if (!employeeId) {
                showAlertModal('خطأ', 'معرف الموظف غير موجود');
                return;
            }
            
            const formData = {
                username: document.getElementById('edit_employee_username')?.value.trim() || '',
                full_name: document.getElementById('edit_employee_full_name')?.value.trim() || '',
                password: document.getElementById('edit_employee_password')?.value.trim() || null,
                team_id: document.getElementById('edit_employee_team_id')?.value || null,
                is_active: document.getElementById('edit_employee_is_active')?.checked ? 1 : 0
            };
            
            // Validate required fields
            if (!formData.username || !formData.full_name) {
                showAlertModal('تحذير', 'الرجاء ملء جميع الحقول المطلوبة (*)');
                return;
            }
            
            // Remove password from formData if empty
            if (!formData.password) {
                delete formData.password;
            }
            
            try {
                if (!window.api) {
                    showAlertModal('خطأ', 'API غير متاح');
                    return;
                }
                
                const data = await window.api.updateUser(employeeId, formData);
                if (data && data.success) {
                    showAlertModal('نجح', 'تم تحديث الموظف بنجاح!');
                    closeEditEmployeeModal();
                    loadEmployees();
                } else {
                    showAlertModal('خطأ', data?.error || 'فشل تحديث الموظف');
                }
            } catch (error) {
                console.error('Error updating employee:', error);
                showAlertModal('خطأ', 'حدث خطأ في تحديث الموظف: ' + (error.message || 'خطأ غير معروف'));
            }
        });
    }
})();

window.permanentlyDeleteEmployee = async function(employeeId) {
    // Get employee info for confirmation
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        const employeesData = await window.api.getOwnerEmployees();
        if (employeesData && employeesData.success) {
            const emp = employeesData.employees.find(e => e.id == employeeId);
            if (emp) {
                const confirmMessage = `⚠️ تحذير: حذف نهائي ⚠️\n\nهل أنت متأكد تماماً من حذف الحساب نهائياً؟\n\nاسم المستخدم: ${emp.username}\nالاسم الكامل: ${emp.full_name}\n\n⚠️ هذا الإجراء لا يمكن التراجع عنه!\nسيتم حذف الحساب نهائياً من قاعدة البيانات.`;
                
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
        console.error('Error getting employee info:', error);
    }
    
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        const data = await window.api.permanentlyDeleteUser(employeeId);
        if (data && data.success) {
            showAlertModal('نجح', 'تم حذف الحساب نهائياً بنجاح');
            loadEmployees();
            loadDashboard();
        } else {
            showAlertModal('خطأ', 'خطأ في حذف الحساب: ' + (data?.error || 'خطأ غير معروف'));
        }
    } catch (error) {
        console.error('Error permanently deleting employee:', error);
        showAlertModal('خطأ', 'خطأ في حذف الحساب: ' + (error.message || 'خطأ غير معروف'));
    }
};

async function loadCompaniesForFilter(selectId) {
    try {
        const data = await window.api.getOwnerCompanies();
        if (data && data.success) {
            const select = document.getElementById(selectId);
            const currentValue = select.value;
            select.innerHTML = '<option value="">جميع الشركات</option>';
            
            data.companies.forEach(company => {
                const option = document.createElement('option');
                option.value = company.id;
                option.textContent = `${company.name} (@${company.domain})`;
                select.appendChild(option);
            });
            
            select.value = currentValue;
        }
    } catch (error) {
        console.error('Error loading companies for filter:', error);
    }
}

// ==================== Invoices Management ====================
async function loadInvoices() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        const companyIdEl = document.getElementById('filterCompanyInvoices');
        const statusEl = document.getElementById('filterStatusInvoices');
        const companyId = companyIdEl ? companyIdEl.value : '';
        const status = statusEl ? statusEl.value : '';
        
        const params = {};
        if (companyId) params.company_id = companyId;
        if (status) params.status = status;
        
        const data = await window.api.getOwnerInvoices(params);
        if (data && data.success) {
            const tbody = document.getElementById('invoicesTableBody');
            if (!tbody) {
                console.error('invoicesTableBody element not found');
                return;
            }
            tbody.innerHTML = '';
            
            if (!data.invoices || data.invoices.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center">لا توجد فواتير</td></tr>';
                // Load companies for filter even if no invoices
                await loadCompaniesForFilter('filterCompanyInvoices');
                return;
            }
            
            data.invoices.forEach(invoice => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${invoice.invoice_number || '-'}</td>
                    <td>${invoice.company_name || '-'} (@${invoice.domain || '-'})</td>
                    <td>${formatDate(invoice.period_start)} - ${formatDate(invoice.period_end)}</td>
                    <td>${invoice.employee_count || 0}</td>
                    <td>${formatCurrency(invoice.total || 0)}</td>
                    <td>${invoice.due_date ? formatDate(invoice.due_date) : '-'}</td>
                    <td><span class="badge badge-${getInvoiceStatusClass(invoice.status)}">${getInvoiceStatusName(invoice.status)}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewInvoice(${invoice.id})">عرض</button>
                        <button class="btn btn-sm btn-secondary" onclick="updateInvoiceStatus(${invoice.id})">تحديث الحالة</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } else {
            const tbody = document.getElementById('invoicesTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center error">خطأ في تحميل البيانات</td></tr>';
            }
        }
        
        // Load companies for filter
        await loadCompaniesForFilter('filterCompanyInvoices');
    } catch (error) {
        console.error('Error loading invoices:', error);
        const tbody = document.getElementById('invoicesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center error">خطأ في تحميل البيانات</td></tr>';
        }
    }
}

window.openCreateInvoiceModal = function() {
    const modal = document.getElementById('createInvoiceModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
    document.getElementById('createInvoiceForm').reset();
    loadCompaniesForInvoice();
    // Setup thousands input for price fields
    setupThousandsInput('invoice_price_per_employee');
    setupThousandsInput('invoice_tax');
};

window.closeCreateInvoiceModal = function() {
    const modal = document.getElementById('createInvoiceModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
};

async function loadCompaniesForInvoice() {
    try {
        const data = await window.api.getOwnerCompanies();
        if (data && data.success) {
            const select = document.getElementById('invoice_company_id');
            select.innerHTML = '<option value="">اختر الشركة</option>';
            
            data.companies.forEach(company => {
                const option = document.createElement('option');
                option.value = company.id;
                option.textContent = `${company.name} (@${company.domain})`;
                option.dataset.pricePerEmployee = company.price_per_employee || 0;
                option.dataset.currentEmployees = company.current_employees || 0;
                select.appendChild(option);
            });
            
            // Auto-fill company info when company is selected
            select.addEventListener('change', function() {
                const selectedOption = this.options[this.selectedIndex];
                if (selectedOption && selectedOption.value) {
                    // Get company data from the option
                    const pricePerEmployee = parseFloat(selectedOption.dataset.pricePerEmployee) || 0;
                    const currentEmployees = parseInt(selectedOption.dataset.currentEmployees) || 0;
                    
                    // Fill price per employee (already in full amount)
                    const priceInput = document.getElementById('invoice_price_per_employee');
                    if (priceInput) {
                        priceInput.value = pricePerEmployee.toString();
                    }
                    
                    // Fill employee count
                    const employeeCountInput = document.getElementById('invoice_employee_count');
                    if (employeeCountInput) {
                        employeeCountInput.value = currentEmployees.toString();
                    }
                } else {
                    // Clear fields if no company selected
                    const priceInput = document.getElementById('invoice_price_per_employee');
                    if (priceInput) {
                        priceInput.value = '';
                    }
                    const employeeCountInput = document.getElementById('invoice_employee_count');
                    if (employeeCountInput) {
                        employeeCountInput.value = '';
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading companies for invoice:', error);
    }
}

document.getElementById('createInvoiceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        company_id: parseInt(document.getElementById('invoice_company_id').value),
        period_start: document.getElementById('invoice_period_start').value,
        period_end: document.getElementById('invoice_period_end').value,
        employee_count: parseInt(document.getElementById('invoice_employee_count').value),
        price_per_employee: parseFloat(document.getElementById('invoice_price_per_employee').value),
        tax: parseFloat(document.getElementById('invoice_tax').value) || 0,
        due_date: document.getElementById('invoice_due_date').value || null,
        notes: document.getElementById('invoice_notes').value || null
    };
    
    try {
        const data = await window.api.createInvoice(formData);
        if (data && data.success) {
            showAlertModal('نجح', 'تم إنشاء الفاتورة بنجاح!');
            closeCreateInvoiceModal();
            loadInvoices();
            loadDashboard();
        }
    } catch (error) {
        showAlertModal('خطأ', error.message || 'حدث خطأ في إنشاء الفاتورة');
    }
});

// ==================== Purchase Requests ====================
async function loadPurchaseRequests() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        const statusEl = document.getElementById('filterStatusRequests');
        const status = statusEl ? statusEl.value : '';
        const params = status ? { status } : {};
        
        const data = await window.api.getOwnerPurchaseRequests(params);
        if (data && data.success) {
            const tbody = document.getElementById('purchaseRequestsTableBody');
            if (!tbody) {
                console.error('purchaseRequestsTableBody element not found');
                return;
            }
            tbody.innerHTML = '';
            
            if (!data.requests || data.requests.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center">لا توجد طلبات</td></tr>';
                return;
            }
            
            data.requests.forEach(request => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${request.company_name || '-'}</td>
                    <td>${request.contact_name || '-'}</td>
                    <td>${request.contact_email || '-'}</td>
                    <td>${request.contact_phone || '-'}</td>
                    <td>${request.expected_employees || 0}</td>
                    <td>${formatDateTime(request.created_at)}</td>
                    <td><span class="badge badge-${getRequestStatusClass(request.status)}">${getRequestStatusName(request.status)}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewPurchaseRequest(${request.id})">عرض</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } else {
            const tbody = document.getElementById('purchaseRequestsTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center error">خطأ في تحميل البيانات</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error loading purchase requests:', error);
        const tbody = document.getElementById('purchaseRequestsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center error">خطأ في تحميل البيانات</td></tr>';
        }
    }
}

window.viewPurchaseRequest = async function(id) {
    try {
        const data = await window.api.getOwnerPurchaseRequests();
        if (data && data.success) {
            const request = data.requests.find(r => r.id === id);
            if (request) {
                const details = document.getElementById('purchaseRequestDetails');
                details.innerHTML = `
                    <div class="form-group">
                        <label>اسم الشركة:</label>
                        <p>${request.company_name}</p>
                    </div>
                    <div class="form-group">
                        <label>اسم المسؤول:</label>
                        <p>${request.contact_name}</p>
                    </div>
                    <div class="form-group">
                        <label>البريد الإلكتروني:</label>
                        <p>${request.contact_email}</p>
                    </div>
                    <div class="form-group">
                        <label>رقم الهاتف:</label>
                        <p>${request.contact_phone}</p>
                    </div>
                    <div class="form-group">
                        <label>العنوان:</label>
                        <p>${request.company_address || '-'}</p>
                    </div>
                    <div class="form-group">
                        <label>عدد الموظفين المتوقع:</label>
                        <p>${request.expected_employees}</p>
                    </div>
                    <div class="form-group">
                        <label>الرسالة:</label>
                        <p>${request.message || '-'}</p>
                    </div>
                    <div class="form-group">
                        <label>الحالة:</label>
                        <p><span class="badge badge-${getRequestStatusClass(request.status)}">${getRequestStatusName(request.status)}</span></p>
                    </div>
                    ${request.admin_notes ? `
                    <div class="form-group">
                        <label>ملاحظات الإدارة:</label>
                        <p>${request.admin_notes}</p>
                    </div>
                    ` : ''}
                    ${request.converted_company_name ? `
                    <div class="form-group">
                        <label>تم التحويل إلى:</label>
                        <p>${request.converted_company_name} (@${request.converted_domain})</p>
                    </div>
                    ` : ''}
                    <div class="form-actions">
                        <button class="btn btn-primary" onclick="updatePurchaseRequestStatus(${request.id})">تحديث الحالة</button>
                        <button class="btn btn-secondary" onclick="closePurchaseRequestModal()">إغلاق</button>
                    </div>
                `;
                const modal = document.getElementById('purchaseRequestModal');
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('active'), 10);
            }
        }
    } catch (error) {
        showAlertModal('خطأ', error.message || 'حدث خطأ في تحميل تفاصيل الطلب');
    }
};

window.closePurchaseRequestModal = function() {
    const modal = document.getElementById('purchaseRequestModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
};

window.updatePurchaseRequestStatus = async function(id) {
    const status = prompt('اختر الحالة:\n1. pending - معلقة\n2. contacted - تم التواصل\n3. approved - موافق عليها\n4. rejected - مرفوضة\n5. converted - محولة');
    if (!status) return;
    
    const adminNotes = prompt('ملاحظات الإدارة (اختياري):') || null;
    
    try {
        const data = await window.api.updatePurchaseRequest(id, { status, admin_notes: adminNotes });
        if (data && data.success) {
            showAlertModal('نجح', 'تم تحديث حالة الطلب بنجاح!');
            closePurchaseRequestModal();
            loadPurchaseRequests();
            loadDashboard();
        }
    } catch (error) {
        showAlertModal('خطأ', error.message || 'حدث خطأ في تحديث حالة الطلب');
    }
};

async function viewInvoice(id) {
    // TODO: Implement invoice view modal
    showAlertModal('معلومة', 'ميزة عرض الفاتورة قيد التطوير');
}

async function updateInvoiceStatus(id) {
    const status = prompt('اختر الحالة:\n1. draft - مسودة\n2. sent - مرسلة\n3. paid - مدفوعة\n4. overdue - متأخرة\n5. cancelled - ملغاة');
    if (!status) return;
    
    let paidDate = null;
    if (status === 'paid') {
        paidDate = prompt('تاريخ الدفع (YYYY-MM-DD):') || null;
    }
    
    try {
        const data = await window.api.updateInvoiceStatus(id, { status, paid_date: paidDate });
        if (data && data.success) {
            showAlertModal('نجح', 'تم تحديث حالة الفاتورة بنجاح!');
            loadInvoices();
            loadDashboard();
        }
    } catch (error) {
        showAlertModal('خطأ', error.message || 'حدث خطأ في تحديث حالة الفاتورة');
    }
}

window.editCompany = async function(id) {
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        // Get company data
        const companiesData = await window.api.getOwnerCompanies();
        if (!companiesData || !companiesData.success) {
            showAlertModal('خطأ', 'فشل في تحميل بيانات الشركة');
            return;
        }
        
        const company = companiesData.companies.find(c => c.id === id);
        if (!company) {
            showAlertModal('خطأ', 'الشركة غير موجودة');
            return;
        }
        
        // Open edit modal
        const modal = document.getElementById('editCompanyModal');
        if (!modal) {
            showAlertModal('خطأ', 'نافذة التعديل غير موجودة');
            return;
        }
        
        // Fill form with company data
        document.getElementById('edit_company_id').value = company.id;
        document.getElementById('edit_company_name').value = company.name || '';
        document.getElementById('edit_company_domain').value = company.domain || '';
        document.getElementById('edit_company_contact_name').value = company.contact_name || '';
        document.getElementById('edit_company_contact_email').value = company.contact_email || '';
        document.getElementById('edit_company_contact_phone').value = company.contact_phone || '';
        document.getElementById('edit_company_address').value = company.address || '';
        document.getElementById('edit_company_max_employees').value = company.max_employees || 0;
        document.getElementById('edit_company_price_per_employee').value = company.price_per_employee || 0;
        document.getElementById('edit_company_is_active').checked = company.is_active === 1 || company.is_active === true;
        
        // Setup thousands input for price field
        setupThousandsInput('edit_company_price_per_employee');
        
        // Show modal
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    } catch (error) {
        console.error('Error loading company for edit:', error);
        showAlertModal('خطأ', 'حدث خطأ في تحميل بيانات الشركة: ' + (error.message || 'خطأ غير معروف'));
    }
};

window.closeEditCompanyModal = function() {
    const modal = document.getElementById('editCompanyModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
        const form = document.getElementById('editCompanyForm');
        if (form) {
            form.reset();
        }
    }
};

// Setup edit company form submission
(function() {
    const editCompanyForm = document.getElementById('editCompanyForm');
    if (editCompanyForm) {
        editCompanyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const companyId = document.getElementById('edit_company_id')?.value;
            if (!companyId) {
                showAlertModal('خطأ', 'معرف الشركة غير موجود');
                return;
            }
            
            const formData = {
                name: document.getElementById('edit_company_name')?.value || '',
                contact_name: document.getElementById('edit_company_contact_name')?.value || '',
                contact_email: document.getElementById('edit_company_contact_email')?.value || '',
                contact_phone: document.getElementById('edit_company_contact_phone')?.value || null,
                address: document.getElementById('edit_company_address')?.value || null,
                max_employees: parseInt(document.getElementById('edit_company_max_employees')?.value) || 0,
                price_per_employee: parseFloat(document.getElementById('edit_company_price_per_employee')?.value) || 0,
                is_active: document.getElementById('edit_company_is_active')?.checked ? 1 : 0
            };
            
            // Validate required fields
            if (!formData.name || !formData.contact_name || !formData.contact_email) {
                showAlertModal('تحذير', 'الرجاء ملء جميع الحقول المطلوبة (*)');
                return;
            }
            
            try {
                if (!window.api) {
                    showAlertModal('خطأ', 'API غير متاح');
                    return;
                }
                
                const data = await window.api.updateCompany(companyId, formData);
                if (data && data.success) {
                    showAlertModal('نجح', 'تم تحديث الشركة بنجاح!');
                    closeEditCompanyModal();
                    loadCompanies();
                    loadDashboard();
                } else {
                    showAlertModal('خطأ', data?.error || 'فشل تحديث الشركة');
                }
            } catch (error) {
                console.error('Error updating company:', error);
                showAlertModal('خطأ', 'حدث خطأ في تحديث الشركة: ' + (error.message || 'خطأ غير معروف'));
            }
        });
    }
})();

window.exportTable = function(tableName) {
    if (!window.api) {
        showAlertModal('خطأ', 'API غير متاح');
        return;
    }
    
    window.api.exportDatabase([tableName]).then(result => {
        if (result && result.success) {
            showAlertModal('نجح', 'تم تصدير الجدول بنجاح!');
        }
    }).catch(error => {
        showAlertModal('خطأ', error.message || 'حدث خطأ في تصدير الجدول');
    });
};

window.exportAllDatabase = function() {
    if (!window.api) {
        showAlertModal('خطأ', 'API غير متاح');
        return;
    }
    
    if (!confirm('هل أنت متأكد من تصدير قاعدة البيانات كاملة؟\n\nسيتم تصدير جميع الجداول.')) {
        return;
    }
    
    window.api.exportDatabase([]).then(result => {
        if (result && result.success) {
            showAlertModal('نجح', 'تم تصدير قاعدة البيانات كاملة بنجاح!');
        }
    }).catch(error => {
        showAlertModal('خطأ', error.message || 'حدث خطأ في تصدير قاعدة البيانات');
    });
};

// ==================== Database Management ====================
async function loadDatabaseTables() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        const tbody = document.getElementById('databaseTablesTableBody');
        if (!tbody) {
            console.error('databaseTablesTableBody element not found');
            return;
        }
        
        tbody.innerHTML = '<tr><td colspan="5" class="loading">جاري التحميل...</td></tr>';
        
        const data = await window.api.getExportTables();
        if (data && data.success) {
            tbody.innerHTML = '';
            
            if (!data.tables || data.tables.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد جداول</td></tr>';
                return;
            }
            
            let currentCategory = '';
            data.tables.forEach(table => {
                // إضافة عنوان الفئة إذا تغيرت
                if (table.category && table.category !== currentCategory) {
                    currentCategory = table.category;
                    const categoryRow = document.createElement('tr');
                    categoryRow.className = 'category-header';
                    categoryRow.innerHTML = `
                        <td colspan="5" class="category-title">
                            <strong>${currentCategory}</strong>
                        </td>
                    `;
                    tbody.appendChild(categoryRow);
                }
                
                const row = document.createElement('tr');
                const recordCount = table.record_count !== undefined ? table.record_count : '-';
                const countClass = recordCount === 0 ? 'text-muted' : 'text-primary';
                const countDisplay = typeof recordCount === 'number' ? recordCount.toLocaleString('ar-IQ') : recordCount;
                
                row.innerHTML = `
                    <td><code>${table.name || '-'}</code></td>
                    <td>${table.description || '-'}</td>
                    <td class="${countClass}" style="font-weight: 600;">${countDisplay}</td>
                    <td><span class="badge badge-info">${table.category || '-'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="exportTable('${table.name || ''}')" title="تصدير الجدول">
                            📥 تصدير
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center error">خطأ في تحميل البيانات</td></tr>';
        }
    } catch (error) {
        console.error('Error loading database tables:', error);
        const tbody = document.getElementById('databaseTablesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center error">خطأ في تحميل البيانات: ' + (error.message || 'خطأ غير معروف') + '</td></tr>';
        }
    }
}

// ==================== Settings Management ====================
async function loadSettings() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        const data = await window.api.getSettings();
        if (data && data.success) {
            const settings = data.settings || {};
            
            // Fill WhatsApp settings
            const whatsappPhoneEl = document.getElementById('whatsapp_phone');
            const whatsappEnabledEl = document.getElementById('whatsapp_enabled');
            
            if (whatsappPhoneEl) whatsappPhoneEl.value = settings.whatsapp_phone || '';
            if (whatsappEnabledEl) whatsappEnabledEl.checked = settings.whatsapp_enabled === '1' || settings.whatsapp_enabled === true || settings.whatsapp_enabled === 'true';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showAlertModal('خطأ', 'خطأ في تحميل الإعدادات');
    }
}

// Make loadSettings globally accessible
window.loadSettings = loadSettings;

// Toggle WhatsApp Accordion
function toggleWhatsAppAccordion() {
    const accordionSection = document.querySelector('.accordion-section');
    const accordionContent = document.getElementById('whatsappAccordionContent');
    const accordionIcon = document.getElementById('whatsappAccordionIcon');
    
    if (accordionSection && accordionContent && accordionIcon) {
        accordionSection.classList.toggle('active');
    }
}

// Make toggleWhatsAppAccordion globally accessible
window.toggleWhatsAppAccordion = toggleWhatsAppAccordion;

// Display QR Code
function displayQRCode(qrCodeString) {
    console.log('displayQRCode called with:', qrCodeString ? 'QR code string provided' : 'no QR code');
    
    const qrContainer = document.getElementById('whatsappQRContainer');
    const qrCodeDiv = document.getElementById('whatsappQRCode');
    
    if (!qrContainer) {
        console.error('QR Code container not found (whatsappQRContainer)');
        return;
    }
    
    if (!qrCodeDiv) {
        console.error('QR Code div not found (whatsappQRCode)');
        return;
    }
    
    if (!qrCodeString || !qrCodeString.trim()) {
        console.error('QR Code string is empty');
        return;
    }
    
    // Clear any existing refresh timer
    if (qrCodeRefreshTimer) {
        clearInterval(qrCodeRefreshTimer);
        qrCodeRefreshTimer = null;
    }
    
    // Clear previous QR Code
    qrCodeDiv.innerHTML = '';
    
    // Always use image fallback (more reliable)
    // QRCode library from CDN has compatibility issues, so we use api.qrserver.com
    generateQRCodeImage(qrCodeString, qrCodeDiv);
    
    // Show container
    qrContainer.style.display = 'block';
    console.log('✅ QR Code container displayed');
    
    // Open accordion if closed
    const accordionSection = document.querySelector('.accordion-section');
    if (accordionSection && !accordionSection.classList.contains('active')) {
        accordionSection.classList.add('active');
    }
    
    // Set up auto-refresh every 30 seconds
    qrCodeRefreshTimer = setInterval(async () => {
        try {
            if (!window.api) {
                return;
            }
            
            const data = await window.api.getWhatsAppQR();
            if (data && data.success) {
                if (data.qr_code) {
                    // Update QR code if it changed
                    const currentQR = qrCodeDiv.querySelector('img');
                    const newQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(data.qr_code)}`;
                    if (!currentQR || currentQR.src !== newQRUrl) {
                        console.log('🔄 تحديث الباركود...');
                        generateQRCodeImage(data.qr_code, qrCodeDiv);
                    }
                } else if (data.connected) {
                    // Connected - stop refresh and hide QR
                    if (qrCodeRefreshTimer) {
                        clearInterval(qrCodeRefreshTimer);
                        qrCodeRefreshTimer = null;
                    }
                    hideQRCode();
                    showConnectionStatus();
                    updateWhatsAppStatusIndicator();
                }
            }
        } catch (error) {
            console.error('Error refreshing QR Code:', error);
        }
    }, 30000); // 30 seconds
}

// Generate QR Code using Canvas
function generateQRCodeCanvas(qrCodeString, qrCodeDiv) {
    // Create canvas element
    const canvas = document.createElement('canvas');
    qrCodeDiv.appendChild(canvas);
    
    // Generate QR Code
    QRCode.toCanvas(canvas, qrCodeString, {
        width: 256,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    }, function (error) {
        if (error) {
            console.error('Error generating QR Code with canvas:', error);
            // Fallback: use img tag
            qrCodeDiv.innerHTML = '';
            generateQRCodeImage(qrCodeString, qrCodeDiv);
        } else {
            console.log('✅ QR Code generated successfully with canvas');
        }
    });
}

// Generate QR Code using Image (fallback)
function generateQRCodeImage(qrCodeString, qrCodeDiv) {
    const img = document.createElement('img');
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrCodeString)}`;
    img.alt = 'QR Code';
    img.style.maxWidth = '256px';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    img.onload = function() {
        console.log('✅ QR Code image loaded successfully');
    };
    img.onerror = function() {
        console.error('❌ Failed to load QR Code image');
        qrCodeDiv.innerHTML = '<p style="color: var(--error-color); padding: 16px;">فشل تحميل QR Code. يرجى المحاولة مرة أخرى.</p>';
    };
    qrCodeDiv.appendChild(img);
    console.log('✅ QR Code generated using image fallback');
}

// Hide QR Code
function hideQRCode() {
    // Clear refresh timer
    if (qrCodeRefreshTimer) {
        clearInterval(qrCodeRefreshTimer);
        qrCodeRefreshTimer = null;
    }
    
    const qrContainer = document.getElementById('whatsappQRContainer');
    if (qrContainer) {
        qrContainer.style.display = 'none';
    }
}

// Show Connection Status
function showConnectionStatus() {
    const statusContainer = document.getElementById('whatsappConnectionStatus');
    const qrContainer = document.getElementById('whatsappQRContainer');
    if (statusContainer) {
        statusContainer.style.display = 'block';
    }
    if (qrContainer) {
        qrContainer.style.display = 'none';
    }
    // Open accordion if closed
    const accordionSection = document.querySelector('.accordion-section');
    if (accordionSection && !accordionSection.classList.contains('active')) {
        accordionSection.classList.add('active');
    }
}

// Hide Connection Status
function hideConnectionStatus() {
    const statusContainer = document.getElementById('whatsappConnectionStatus');
    if (statusContainer) {
        statusContainer.style.display = 'none';
    }
}

// Check for QR Code
async function checkForQRCode() {
    try {
        if (!window.api) {
            return;
        }
        
        const data = await window.api.getWhatsAppQR();
        if (data && data.success) {
            if (data.qr_code) {
                displayQRCode(data.qr_code);
            } else if (data.connected) {
                hideQRCode();
                showAlertModal('نجح', 'تم الاتصال بـ WhatsApp بنجاح!');
            }
        }
    } catch (error) {
        console.error('Error checking QR Code:', error);
    }
}

// Check WhatsApp Status
async function checkWhatsAppStatus() {
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        const data = await window.api.getWhatsAppQR();
        if (data && data.success) {
            if (data.qr_code) {
                displayQRCode(data.qr_code);
                showAlertModal('معلومات', 'QR Code متاح، يرجى مسح الباركود');
            } else if (data.connected) {
                hideQRCode();
                showConnectionStatus();
                updateWhatsAppStatusIndicator();
                showAlertModal('نجح', '✅ تم الاتصال بـ WhatsApp بنجاح!\n\nالنظام جاهز الآن لإرسال الرسائل تلقائياً للمشتركين.');
            } else {
                showAlertModal('معلومات', 'لم يتم الاتصال بعد، يرجى المحاولة لاحقاً');
            }
        }
    } catch (error) {
        console.error('Error checking WhatsApp status:', error);
        showAlertModal('خطأ', 'حدث خطأ في التحقق من حالة الاتصال');
    }
}

// Generate WhatsApp QR Code
async function generateWhatsAppQR() {
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        // التحقق من وجود رقم الواتساب
        const whatsappPhone = document.getElementById('whatsapp_phone')?.value.trim();
        if (!whatsappPhone) {
            showAlertModal('خطأ', 'يرجى إدخال رقم الواتساب أولاً ثم حفظ الإعدادات');
            return;
        }
        
        // التحقق من أن الإعدادات محفوظة
        const whatsappEnabled = document.getElementById('whatsapp_enabled')?.checked;
        if (!whatsappEnabled) {
            showAlertModal('خطأ', 'يرجى تفعيل "إرسال رسائل الواتساب" أولاً ثم حفظ الإعدادات');
            return;
        }
        
        showAlertModal('معلومات', 'جاري توليد QR Code... يرجى الانتظار');
        
        // محاولة الحصول على QR Code من السيرفر
        const data = await window.api.getWhatsAppQR();
        if (data && data.success) {
            if (data.qr_code) {
                displayQRCode(data.qr_code);
                showAlertModal('نجح', 'تم توليد QR Code بنجاح! يرجى مسح الباركود باستخدام WhatsApp');
            } else if (data.connected) {
                hideQRCode();
                showConnectionStatus();
                updateWhatsAppStatusIndicator();
                showAlertModal('نجح', '✅ أنت متصل بالفعل بـ WhatsApp!\n\nالنظام جاهز لإرسال الرسائل.');
            } else {
                // إذا لم يكن هناك QR Code، نحاول تهيئة WhatsApp Client
                showAlertModal('معلومات', 'جاري تهيئة WhatsApp... يرجى الانتظار قليلاً ثم اضغط الزر مرة أخرى');
                
                // إعادة المحاولة بعد 3 ثوانٍ
                setTimeout(async () => {
                    const retryData = await window.api.getWhatsAppQR();
                    if (retryData && retryData.success && retryData.qr_code) {
                        displayQRCode(retryData.qr_code);
                        showAlertModal('نجح', 'تم توليد QR Code بنجاح! يرجى مسح الباركود');
                    } else {
                        showAlertModal('معلومات', 'يرجى المحاولة مرة أخرى بعد بضع ثوانٍ');
                    }
                }, 3000);
            }
        } else {
            showAlertModal('خطأ', 'حدث خطأ في توليد QR Code');
        }
    } catch (error) {
        console.error('Error generating WhatsApp QR:', error);
        showAlertModal('خطأ', 'حدث خطأ في توليد QR Code. يرجى المحاولة مرة أخرى');
    }
}

// Logout from WhatsApp
async function logoutWhatsApp() {
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        // تأكيد من المستخدم
        if (!confirm('هل أنت متأكد من تسجيل الخروج من WhatsApp؟\n\nملاحظة: ستحتاج إلى مسح QR Code مرة أخرى للاتصال.')) {
            return;
        }
        
        const data = await window.api.logoutWhatsApp();
        if (data && data.success) {
            hideQRCode();
            hideConnectionStatus();
            updateWhatsAppStatusIndicator();
            showAlertModal('نجح', data.message || 'تم تسجيل الخروج من WhatsApp بنجاح');
        } else {
            showAlertModal('خطأ', data.error || 'حدث خطأ في تسجيل الخروج');
        }
    } catch (error) {
        console.error('Error logging out from WhatsApp:', error);
        showAlertModal('خطأ', 'حدث خطأ في تسجيل الخروج من WhatsApp');
    }
}

// Load managers/companies for manual message sending
async function loadManagersForManualMessage() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        const data = await window.api.getOwnerCompanies();
        if (data && data.success && data.companies) {
            const managersSelect = document.getElementById('managersSelect');
            if (!managersSelect) return;
            
            managersSelect.innerHTML = '';
            
            if (data.companies.length === 0) {
                managersSelect.innerHTML = '<option value="" disabled style="color: var(--text-muted);">لا توجد شركات متاحة</option>';
                return;
            }
            
            // ترتيب الشركات حسب الاسم
            const sortedCompanies = [...data.companies].sort((a, b) => {
                const nameA = (a.company_name || '').toLowerCase();
                const nameB = (b.company_name || '').toLowerCase();
                return nameA.localeCompare(nameB, 'ar');
            });
            
            sortedCompanies.forEach(company => {
                const option = document.createElement('option');
                option.value = company.id;
                option.dataset.companyName = company.company_name || 'غير محدد';
                option.dataset.adminName = company.admin_name || company.admin_username || 'غير محدد';
                option.dataset.contactPhone = company.contact_phone || '';
                
                // نص الخيار: اسم الشركة - اسم المدير - رقم الهاتف
                let optionText = `${company.company_name || 'غير محدد'}`;
                if (company.admin_name || company.admin_username) {
                    optionText += ` | 👤 ${company.admin_name || company.admin_username}`;
                }
                if (company.contact_phone) {
                    optionText += ` | 📱 ${company.contact_phone}`;
                }
                
                option.textContent = optionText;
                option.style.padding = '12px 16px';
                option.style.fontSize = '14px';
                option.style.lineHeight = '1.6';
                
                managersSelect.appendChild(option);
            });
            
            // إضافة event listener للتحديث عند التغيير
            managersSelect.addEventListener('change', updateSelectedManagersPreview);
        }
    } catch (error) {
        console.error('Error loading managers:', error);
        const managersSelect = document.getElementById('managersSelect');
        if (managersSelect) {
            managersSelect.innerHTML = '<option value="" disabled style="color: var(--error-color);">خطأ في تحميل قائمة المدراء</option>';
        }
    }
}

// Update selected managers preview
function updateSelectedManagersPreview() {
    const managersSelect = document.getElementById('managersSelect');
    const previewContainer = document.getElementById('selectedManagersPreview');
    const previewList = document.getElementById('selectedManagersList');
    const selectedCount = document.getElementById('selectedCount');
    const sendBtn = document.getElementById('sendManualMessagesBtn');
    
    if (!managersSelect || !previewContainer || !previewList || !sendBtn) return;
    
    const selectedOptions = Array.from(managersSelect.selectedOptions);
    
    if (selectedOptions.length === 0) {
        previewContainer.style.display = 'none';
        sendBtn.disabled = true;
        return;
    }
    
    previewContainer.style.display = 'block';
    sendBtn.disabled = false;
    
    if (selectedCount) {
        selectedCount.textContent = selectedOptions.length;
    }
    
    previewList.innerHTML = '';
    
    selectedOptions.forEach(option => {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 10px 14px; background: rgba(255, 255, 255, 0.1); border-radius: 8px; border: 1px solid rgba(37, 211, 102, 0.2); display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;';
        item.innerHTML = `
            <div style="flex: 1;">
                <div style="font-weight: 600; color: var(--text-primary); font-size: 14px; margin-bottom: 4px;">${option.dataset.companyName}</div>
                <div style="font-size: 12px; color: var(--text-secondary); display: flex; gap: 12px; flex-wrap: wrap;">
                    <span>👤 ${option.dataset.adminName}</span>
                    ${option.dataset.contactPhone ? `<span>📱 ${option.dataset.contactPhone}</span>` : '<span style="color: var(--warning-color);">⚠️ لا يوجد رقم</span>'}
                </div>
            </div>
            <button type="button" onclick="removeManagerFromSelection('${option.value}')" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 12px; transition: all 0.2s; margin-right: 8px;" onmouseover="this.style.background='rgba(239, 68, 68, 0.25)'; this.style.transform='scale(1.05)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.15)'; this.style.transform='scale(1)'">✕</button>
        `;
        previewList.appendChild(item);
    });
}

// Remove manager from selection
function removeManagerFromSelection(companyId) {
    const managersSelect = document.getElementById('managersSelect');
    if (!managersSelect) return;
    
    const option = managersSelect.querySelector(`option[value="${companyId}"]`);
    if (option) {
        option.selected = false;
        updateSelectedManagersPreview();
    }
}

// Clear all selected managers
function clearSelectedManagers() {
    const managersSelect = document.getElementById('managersSelect');
    if (!managersSelect) return;
    
    Array.from(managersSelect.selectedOptions).forEach(option => {
        option.selected = false;
    });
    
    updateSelectedManagersPreview();
}

// Load managers/companies for modal
async function loadManagersForModal() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        const data = await window.api.getOwnerCompanies();
        if (data && data.success && data.companies) {
            const managersSelect = document.getElementById('managersSelectModal');
            if (!managersSelect) return;
            
            managersSelect.innerHTML = '';
            
            if (data.companies.length === 0) {
                managersSelect.innerHTML = '<option value="" disabled style="color: var(--text-muted);">لا توجد شركات متاحة</option>';
                return;
            }
            
            // ترتيب الشركات حسب الاسم
            const sortedCompanies = [...data.companies].sort((a, b) => {
                const nameA = (a.company_name || '').toLowerCase();
                const nameB = (b.company_name || '').toLowerCase();
                return nameA.localeCompare(nameB, 'ar');
            });
            
            sortedCompanies.forEach(company => {
                const option = document.createElement('option');
                option.value = company.id;
                option.dataset.companyName = company.company_name || 'غير محدد';
                option.dataset.adminName = company.admin_name || company.admin_username || 'غير محدد';
                option.dataset.contactPhone = company.contact_phone || '';
                
                // نص الخيار: اسم الشركة - اسم المدير - رقم الهاتف
                let optionText = `${company.company_name || 'غير محدد'}`;
                if (company.admin_name || company.admin_username) {
                    optionText += ` | 👤 ${company.admin_name || company.admin_username}`;
                }
                if (company.contact_phone) {
                    optionText += ` | 📱 ${company.contact_phone}`;
                }
                
                option.textContent = optionText;
                option.style.padding = '12px 16px';
                option.style.fontSize = '14px';
                option.style.lineHeight = '1.6';
                
                managersSelect.appendChild(option);
            });
            
            // إضافة event listener للتحديث عند التغيير
            managersSelect.addEventListener('change', updateSelectedManagersPreviewModal);
        }
    } catch (error) {
        console.error('Error loading managers:', error);
        const managersSelect = document.getElementById('managersSelectModal');
        if (managersSelect) {
            managersSelect.innerHTML = '<option value="" disabled style="color: var(--error-color);">خطأ في تحميل قائمة المدراء</option>';
        }
    }
}

// Open select managers modal
async function openSelectManagersModal() {
    try {
        const messageText = document.getElementById('manualMessageText')?.value.trim();
        if (!messageText) {
            showAlertModal('خطأ', 'يرجى إدخال نص الرسالة أولاً');
            return;
        }
        
        // تحميل قائمة المدراء
        await loadManagersForModal();
        
        // فتح الـ Modal
        const modal = document.getElementById('selectManagersModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            updateSelectedManagersPreviewModal();
        }
    } catch (error) {
        console.error('Error opening select managers modal:', error);
        showAlertModal('خطأ', 'حدث خطأ في فتح نافذة الاختيار');
    }
}

// Close select managers modal
function closeSelectManagersModal() {
    const modal = document.getElementById('selectManagersModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

// Select all managers in modal
function selectAllManagersInModal() {
    const managersSelect = document.getElementById('managersSelectModal');
    if (!managersSelect) return;
    
    Array.from(managersSelect.options).forEach(option => {
        if (option.value) {
            option.selected = true;
        }
    });
    
    updateSelectedManagersPreviewModal();
}

// Deselect all managers in modal
function deselectAllManagersInModal() {
    const managersSelect = document.getElementById('managersSelectModal');
    if (!managersSelect) return;
    
    Array.from(managersSelect.selectedOptions).forEach(option => {
        option.selected = false;
    });
    
    updateSelectedManagersPreviewModal();
}

// Update selected managers preview in modal
function updateSelectedManagersPreviewModal() {
    const managersSelect = document.getElementById('managersSelectModal');
    const previewContainer = document.getElementById('selectedManagersPreviewModal');
    const previewList = document.getElementById('selectedManagersListModal');
    const selectedCount = document.getElementById('selectedCountModal');
    const confirmBtn = document.getElementById('confirmSendBtn');
    
    if (!managersSelect || !previewContainer || !previewList || !confirmBtn) return;
    
    const selectedOptions = Array.from(managersSelect.selectedOptions);
    
    if (selectedOptions.length === 0) {
        previewContainer.style.display = 'none';
        confirmBtn.disabled = true;
        return;
    }
    
    previewContainer.style.display = 'block';
    confirmBtn.disabled = false;
    
    if (selectedCount) {
        selectedCount.textContent = selectedOptions.length;
    }
    
    previewList.innerHTML = '';
    
    selectedOptions.forEach(option => {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 10px 14px; background: rgba(255, 255, 255, 0.1); border-radius: 8px; border: 1px solid rgba(37, 211, 102, 0.2); display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;';
        item.innerHTML = `
            <div style="flex: 1;">
                <div style="font-weight: 600; color: var(--text-primary); font-size: 14px; margin-bottom: 4px;">${option.dataset.companyName}</div>
                <div style="font-size: 12px; color: var(--text-secondary); display: flex; gap: 12px; flex-wrap: wrap;">
                    <span>👤 ${option.dataset.adminName}</span>
                    ${option.dataset.contactPhone ? `<span>📱 ${option.dataset.contactPhone}</span>` : '<span style="color: var(--warning-color);">⚠️ لا يوجد رقم</span>'}
                </div>
            </div>
        `;
        previewList.appendChild(item);
    });
}

// Confirm and send messages
async function confirmSendMessages() {
    try {
        const managersSelect = document.getElementById('managersSelectModal');
        if (!managersSelect) {
            showAlertModal('خطأ', 'عنصر الاختيار غير موجود');
            return;
        }
        
        const selectedOptions = Array.from(managersSelect.selectedOptions);
        if (selectedOptions.length === 0) {
            showAlertModal('خطأ', 'يرجى اختيار شركة واحدة على الأقل');
            return;
        }
        
        const messageText = document.getElementById('manualMessageText')?.value.trim();
        if (!messageText) {
            showAlertModal('خطأ', 'يرجى إدخال نص الرسالة');
            return;
        }
        
        const companyIds = selectedOptions.map(option => parseInt(option.value));
        
        // التحقق من وجود أرقام هواتف
        const companiesWithoutPhone = selectedOptions.filter(option => !option.dataset.contactPhone);
        if (companiesWithoutPhone.length > 0) {
            const companyNames = companiesWithoutPhone.map(option => option.dataset.companyName).join(', ');
            if (!confirm(`تحذير: بعض الشركات المختارة لا تحتوي على رقم هاتف:\n${companyNames}\n\nهل تريد المتابعة؟`)) {
                return;
            }
        }
        
        // إغلاق Modal
        closeSelectManagersModal();
        
        // إرسال الرسائل
        await sendManualWhatsAppMessagesWithIds(messageText, companyIds);
    } catch (error) {
        console.error('Error confirming send messages:', error);
        showAlertModal('خطأ', 'حدث خطأ في إرسال الرسائل');
    }
}

// Send messages with company IDs
async function sendManualWhatsAppMessagesWithIds(messageText, companyIds) {
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        const sendBtn = document.getElementById('sendManualMessagesBtn');
        const statusDiv = document.getElementById('manualMessageStatus');
        
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.textContent = '⏳ جاري الإرسال...';
        }
        
        if (statusDiv) {
            statusDiv.style.display = 'block';
            statusDiv.innerHTML = '<div style="padding: 12px; background: rgba(255, 193, 7, 0.1); border-radius: 6px; color: var(--text-primary);">⏳ جاري إرسال الرسائل...</div>';
        }
        
        const data = await window.api.sendManualWhatsAppMessages({
            message: messageText,
            company_ids: companyIds
        });
        
        if (data && data.success) {
            // عرض النتائج
            let statusHTML = `<div style="padding: 16px; background: rgba(37, 211, 102, 0.1); border-radius: 6px; border-right: 3px solid #25D366; margin-bottom: 12px;">
                <p style="color: var(--text-primary); font-weight: 600; margin: 0 0 8px 0;">✅ ${data.message}</p>
                <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">إجمالي: ${data.summary.total} | نجح: ${data.summary.success} | فشل: ${data.summary.failed}</p>
            </div>`;
            
            if (data.results && data.results.length > 0) {
                statusHTML += '<div style="max-height: 300px; overflow-y: auto;">';
                data.results.forEach(result => {
                    const bgColor = result.success ? 'rgba(37, 211, 102, 0.1)' : 'rgba(255, 0, 0, 0.1)';
                    const borderColor = result.success ? '#25D366' : '#ff0000';
                    const icon = result.success ? '✅' : '❌';
                    statusHTML += `
                        <div style="padding: 10px; margin-bottom: 8px; background: ${bgColor}; border-radius: 4px; border-right: 2px solid ${borderColor};">
                            <div style="font-weight: 600; color: var(--text-primary);">${icon} ${result.company_name}</div>
                            ${result.phone ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">📱 ${result.phone}</div>` : ''}
                            ${result.error ? `<div style="font-size: 12px; color: var(--error-color); margin-top: 4px;">⚠️ ${result.error}</div>` : ''}
                        </div>
                    `;
                });
                statusHTML += '</div>';
            }
            
            if (statusDiv) {
                statusDiv.innerHTML = statusHTML;
            }
            
            showAlertModal('نجح', data.message);
        } else {
            if (statusDiv) {
                statusDiv.innerHTML = `<div style="padding: 12px; background: rgba(255, 0, 0, 0.1); border-radius: 6px; color: var(--error-color);">❌ ${data.error || 'حدث خطأ في إرسال الرسائل'}</div>`;
            }
            showAlertModal('خطأ', data.error || 'حدث خطأ في إرسال الرسائل');
        }
        
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = '📤 إرسال الرسائل';
        }
    } catch (error) {
        console.error('Error sending manual messages:', error);
        const sendBtn = document.getElementById('sendManualMessagesBtn');
        const statusDiv = document.getElementById('manualMessageStatus');
        
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = '📤 إرسال الرسائل';
        }
        
        if (statusDiv) {
            statusDiv.innerHTML = `<div style="padding: 12px; background: rgba(255, 0, 0, 0.1); border-radius: 6px; color: var(--error-color);">❌ حدث خطأ: ${error.message || 'خطأ غير معروف'}</div>`;
        }
        
        showAlertModal('خطأ', 'حدث خطأ في إرسال الرسائل');
    }
}

// Send manual WhatsApp messages (deprecated - now opens modal)
async function sendManualWhatsAppMessages() {
    // This function now opens the modal instead
    await openSelectManagersModal();
}

// Clear manual message form
function clearManualMessageForm() {
    const messageText = document.getElementById('manualMessageText');
    const statusDiv = document.getElementById('manualMessageStatus');
    
    if (messageText) messageText.value = '';
    if (statusDiv) {
        statusDiv.style.display = 'none';
        statusDiv.innerHTML = '';
    }
}

// Make functions globally accessible
window.displayQRCode = displayQRCode;
window.hideQRCode = hideQRCode;
window.showConnectionStatus = showConnectionStatus;
window.hideConnectionStatus = hideConnectionStatus;
window.checkForQRCode = checkForQRCode;
window.checkWhatsAppStatus = checkWhatsAppStatus;
window.logoutWhatsApp = logoutWhatsApp;
window.generateWhatsAppQR = generateWhatsAppQR;
window.openSelectManagersModal = openSelectManagersModal;
window.closeSelectManagersModal = closeSelectManagersModal;
window.selectAllManagersInModal = selectAllManagersInModal;
window.deselectAllManagersInModal = deselectAllManagersInModal;
window.updateSelectedManagersPreviewModal = updateSelectedManagersPreviewModal;
window.confirmSendMessages = confirmSendMessages;
window.sendManualWhatsAppMessages = sendManualWhatsAppMessages;
window.clearManualMessageForm = clearManualMessageForm;

// Update WhatsApp status indicator in header
async function updateWhatsAppStatusIndicator() {
    try {
        const statusIcon = document.getElementById('whatsappStatusIcon');
        const statusTextEl = document.getElementById('whatsappStatusText');
        const statusContainer = document.getElementById('whatsappStatusIndicator');
        
        if (!statusIcon || !statusTextEl || !statusContainer) return;
        
        if (!window.api) {
            statusIcon.textContent = '❌';
            statusTextEl.textContent = 'API غير متاح';
            statusContainer.style.background = 'rgba(255, 0, 0, 0.1)';
            statusContainer.style.border = '1px solid rgba(255, 0, 0, 0.3)';
            return;
        }
        
        const data = await window.api.getWhatsAppQR();
        if (data && data.success) {
            if (data.connected) {
                statusIcon.textContent = '✅';
                statusTextEl.textContent = 'واتساب مربوط';
                statusContainer.style.background = 'rgba(37, 211, 102, 0.2)';
                statusContainer.style.border = '1px solid rgba(37, 211, 102, 0.3)';
            } else if (data.qr_code) {
                statusIcon.textContent = '⏳';
                statusTextEl.textContent = 'في انتظار الربط';
                statusContainer.style.background = 'rgba(255, 193, 7, 0.2)';
                statusContainer.style.border = '1px solid rgba(255, 193, 7, 0.3)';
            } else {
                statusIcon.textContent = '❌';
                statusTextEl.textContent = 'واتساب غير مربوط';
                statusContainer.style.background = 'rgba(255, 0, 0, 0.1)';
                statusContainer.style.border = '1px solid rgba(255, 0, 0, 0.3)';
            }
        } else {
            statusIcon.textContent = '❌';
            statusTextEl.textContent = 'واتساب غير مربوط';
            statusContainer.style.background = 'rgba(255, 0, 0, 0.1)';
            statusContainer.style.border = '1px solid rgba(255, 0, 0, 0.3)';
        }
    } catch (error) {
        console.error('Error updating WhatsApp status indicator:', error);
        const statusIcon = document.getElementById('whatsappStatusIcon');
        const statusTextEl = document.getElementById('whatsappStatusText');
        const statusContainer = document.getElementById('whatsappStatusIndicator');
        if (statusIcon && statusTextEl && statusContainer) {
            statusIcon.textContent = '❌';
            statusTextEl.textContent = 'خطأ في التحقق';
            statusContainer.style.background = 'rgba(255, 0, 0, 0.1)';
            statusContainer.style.border = '1px solid rgba(255, 0, 0, 0.3)';
        }
    }
}

// Auto-check connection status on page load
async function checkConnectionStatusOnLoad() {
    try {
        if (!window.api) return;
        
        const data = await window.api.getWhatsAppQR();
        if (data && data.success) {
            if (data.connected) {
                showConnectionStatus();
            } else if (data.qr_code) {
                displayQRCode(data.qr_code);
            }
        }
        // Update status indicator
        updateWhatsAppStatusIndicator();
    } catch (error) {
        console.error('Error checking connection status on load:', error);
    }
}

// Setup settings form submission
document.addEventListener('DOMContentLoaded', function() {
    const whatsappSettingsForm = document.getElementById('whatsappSettingsForm');
    if (whatsappSettingsForm) {
        whatsappSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                whatsapp_phone: document.getElementById('whatsapp_phone').value.trim(),
                whatsapp_enabled: document.getElementById('whatsapp_enabled').checked ? '1' : '0'
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
                
                const data = await window.api.saveSettings(formData);
                if (data && data.success) {
                    // إذا كان هناك QR Code، عرضه مباشرة
                    if (data.qr_code) {
                        displayQRCode(data.qr_code);
                        showAlertModal('نجح', 'تم حفظ الإعدادات بنجاح! يرجى مسح الباركود');
                    } else if (data.connected) {
                        hideQRCode();
                        showConnectionStatus();
                        updateWhatsAppStatusIndicator();
                        showAlertModal('نجح', '✅ تم حفظ الإعدادات والاتصال بـ WhatsApp بنجاح!\n\nالنظام جاهز الآن لإرسال الرسائل تلقائياً.');
                    } else if (data.needs_qr) {
                        // إذا كان يحتاج QR Code، نبدأ بالتحقق بشكل دوري
                        showAlertModal('معلومات', 'تم حفظ الإعدادات. جاري تحميل QR Code...');
                        
                        // التحقق من QR Code كل ثانية لمدة 30 ثانية
                        let attempts = 0;
                        const maxAttempts = 30;
                        const checkInterval = setInterval(async () => {
                            attempts++;
                            try {
                                const qrData = await window.api.getWhatsAppQR();
                                if (qrData && qrData.success) {
                                    if (qrData.qr_code) {
                                        clearInterval(checkInterval);
                                        displayQRCode(qrData.qr_code);
                                        showAlertModal('نجح', 'تم تحميل QR Code! يرجى مسح الباركود');
                                    } else if (qrData.connected) {
                                        clearInterval(checkInterval);
                                        hideQRCode();
                                        showConnectionStatus();
                                        updateWhatsAppStatusIndicator();
                                        showAlertModal('نجح', '✅ تم الاتصال بـ WhatsApp بنجاح!\n\nالنظام جاهز الآن لإرسال الرسائل تلقائياً.');
                                    }
                                }
                            } catch (error) {
                                console.error('Error checking QR Code:', error);
                            }
                            
                            if (attempts >= maxAttempts) {
                                clearInterval(checkInterval);
                                showAlertModal('معلومات', 'لم يظهر QR Code بعد. يرجى الضغط على "التحقق من حالة الاتصال" لاحقاً');
                            }
                        }, 1000);
                    } else {
                        showAlertModal('نجح', 'تم حفظ الإعدادات بنجاح!');
                    }
                } else {
                    showAlertModal('خطأ', data?.error || 'حدث خطأ في حفظ الإعدادات');
                }
            } catch (error) {
                console.error('Error saving settings:', error);
                showAlertModal('خطأ', error.message || 'حدث خطأ في حفظ الإعدادات');
            }
        });
    }
});

// ==================== Helper Functions ====================
function formatCurrency(amount) {
    return new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD' }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA');
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ar-SA');
}

function getRoleName(role) {
    const roles = {
        'owner': 'مالك الموقع',
        'admin': 'مدير',
        'quality_staff': 'موظف جودة',
        'team_leader': 'قائد فريق',
        'technician': 'فني',
        'accountant': 'محاسب',
        'call_center': 'مركز اتصال',
        'agent': 'وكيل'
    };
    return roles[role] || role;
}

function getInvoiceStatusName(status) {
    const statuses = {
        'draft': 'مسودة',
        'sent': 'مرسلة',
        'paid': 'مدفوعة',
        'overdue': 'متأخرة',
        'cancelled': 'ملغاة'
    };
    return statuses[status] || status;
}

function getInvoiceStatusClass(status) {
    const classes = {
        'draft': 'secondary',
        'sent': 'info',
        'paid': 'success',
        'overdue': 'danger',
        'cancelled': 'secondary'
    };
    return classes[status] || 'secondary';
}

function getRequestStatusName(status) {
    const statuses = {
        'pending': 'معلقة',
        'contacted': 'تم التواصل',
        'approved': 'موافق عليها',
        'rejected': 'مرفوضة',
        'converted': 'محولة'
    };
    return statuses[status] || status;
}

function getRequestStatusClass(status) {
    const classes = {
        'pending': 'warning',
        'contacted': 'info',
        'approved': 'success',
        'rejected': 'danger',
        'converted': 'success'
    };
    return classes[status] || 'secondary';
}

window.showAlertModal = function(title, message) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    const modal = document.getElementById('alertModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
};

window.closeAlertModal = function() {
    const modal = document.getElementById('alertModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
};

// Mobile menu toggle
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.mobile-menu-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    });
};

// ==================== Owner Templates Management ====================
// Toggle templates accordion
function toggleOwnerTemplatesAccordion() {
    // Find the accordion section that contains this button
    const accordionSections = document.querySelectorAll('.form-section.accordion-section');
    let accordionSection = null;
    
    // Find the section that contains the ownerTemplatesAccordionContent
    accordionSections.forEach(section => {
        const content = section.querySelector('#ownerTemplatesAccordionContent');
        if (content) {
            accordionSection = section;
        }
    });
    
    const content = document.getElementById('ownerTemplatesAccordionContent');
    const icon = document.getElementById('ownerTemplatesAccordionIcon');
    
    if (accordionSection && content && icon) {
        const isOpen = accordionSection.classList.contains('active');
        
        if (isOpen) {
            accordionSection.classList.remove('active');
        } else {
            accordionSection.classList.add('active');
            loadOwnerTemplates();
        }
    }
}
window.toggleOwnerTemplatesAccordion = toggleOwnerTemplatesAccordion;

// Load owner templates
async function loadOwnerTemplates() {
    try {
        if (!window.api) {
            console.error('API not available');
            return;
        }
        
        const tbody = document.getElementById('ownerTemplatesTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--text-muted);">جاري التحميل...</td></tr>';
        
        const data = await window.api.getAdminTemplates(); // Owner uses same endpoint
        if (data && data.success && data.templates) {
            if (data.templates.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--text-muted);">لا توجد قوالب. اضغط "إضافة قالب جديد" لإنشاء قالب</td></tr>';
                return;
            }
            
            const categoryNames = {
                'subscription_expiry': 'انتهاء اشتراك الشركة',
                'subscriber_expiry': 'انتهاء اشتراك المشترك',
                'ticket_notification': 'إشعارات التذاكر',
                'custom': 'مخصص'
            };
            
            tbody.innerHTML = data.templates.map(template => {
                return `
                    <tr>
                        <td style="padding: 12px;">${template.title || '-'}</td>
                        <td style="padding: 12px;">${categoryNames[template.template_category] || template.template_category}</td>
                        <td style="padding: 12px;">${template.template_type || 'custom'}</td>
                        <td style="padding: 12px; text-align: center;">
                            <button onclick="editOwnerTemplate(${template.id})" class="btn btn-sm btn-primary">✏️ تعديل</button>
                            <button onclick="deleteOwnerTemplate(${template.id})" class="btn btn-sm btn-danger">🗑️ حذف</button>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--text-danger);">خطأ في تحميل القوالب</td></tr>';
        }
    } catch (error) {
        console.error('Error loading owner templates:', error);
        const tbody = document.getElementById('ownerTemplatesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--text-danger);">خطأ في تحميل القوالب</td></tr>';
        }
    }
}

// Open create template modal
function openCreateOwnerTemplateModal() {
    try {
        const modal = document.getElementById('owner-template-modal');
        const title = document.getElementById('owner-template-modal-title');
        const form = document.getElementById('ownerTemplateForm');
        
        if (!modal) {
            console.error('Modal not found!');
            alert('خطأ: لم يتم العثور على نافذة القالب');
            return;
        }
        
        if (title) {
            title.textContent = 'إضافة قالب جديد';
        }
        
        if (form) {
            form.reset();
        }
        
        const templateIdInput = document.getElementById('owner_template_id');
        if (templateIdInput) {
            templateIdInput.value = '';
        }
        
        // Show modal using CSS class (simpler and more reliable)
        modal.style.display = 'flex';
        modal.classList.add('active');
        
        // Ensure body doesn't scroll when modal is open
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Error in openCreateOwnerTemplateModal:', error);
        alert('خطأ: ' + error.message);
    }
}
// Make it globally available immediately
window.openCreateOwnerTemplateModal = openCreateOwnerTemplateModal;

// Close template modal
function closeOwnerTemplateModal() {
    const modal = document.getElementById('owner-template-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}
window.closeOwnerTemplateModal = closeOwnerTemplateModal;

// Edit template
async function editOwnerTemplate(templateId) {
    try {
        if (!window.api) {
            showAlertModal('خطأ', 'API غير متاح');
            return;
        }
        
        const data = await window.api.getTemplate(templateId);
        if (data && data.success && data.template) {
            const template = data.template;
            const modal = document.getElementById('owner-template-modal');
            const title = document.getElementById('owner-template-modal-title');
            
            if (modal && title) {
                title.textContent = 'تعديل القالب';
                document.getElementById('owner_template_id').value = template.id;
                document.getElementById('owner_template_title').value = template.title || '';
                document.getElementById('owner_template_category').value = template.template_category || 'custom';
                document.getElementById('owner_template_type').value = template.template_type || 'custom';
                document.getElementById('owner_template_description').value = template.description || '';
                document.getElementById('owner_template_text').value = template.template_text || '';
                
                // Show modal using CSS class
                modal.style.display = 'flex';
                modal.classList.add('active');
            }
        } else {
            showAlertModal('خطأ', data.error || 'فشل جلب القالب');
        }
    } catch (error) {
        console.error('Error editing owner template:', error);
        showAlertModal('خطأ', 'حدث خطأ أثناء جلب القالب');
    }
}
window.editOwnerTemplate = editOwnerTemplate;

// Delete template
async function deleteOwnerTemplate(templateId) {
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
            showAlertModal('نجح', 'تم حذف القالب بنجاح');
            loadOwnerTemplates();
        } else {
            showAlertModal('خطأ', data.error || 'فشل حذف القالب');
        }
    } catch (error) {
        console.error('Error deleting owner template:', error);
        showAlertModal('خطأ', 'حدث خطأ أثناء حذف القالب');
    }
}
window.deleteOwnerTemplate = deleteOwnerTemplate;

// Insert variable into template text
function insertOwnerVariable(variable) {
    const textarea = document.getElementById('owner_template_text');
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
window.insertOwnerVariable = insertOwnerVariable;

// Setup owner template form submission
function setupOwnerTemplateForm() {
    const form = document.getElementById('ownerTemplateForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const templateId = document.getElementById('owner_template_id').value;
        const formData = {
            title: document.getElementById('owner_template_title').value.trim(),
            template_text: document.getElementById('owner_template_text').value.trim(),
            template_type: document.getElementById('owner_template_type').value,
            template_category: document.getElementById('owner_template_category').value,
            description: document.getElementById('owner_template_description').value.trim()
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
                showAlertModal('نجح', templateId ? 'تم تحديث القالب بنجاح' : 'تم إنشاء القالب بنجاح');
                closeOwnerTemplateModal();
                loadOwnerTemplates();
            } else {
                showAlertModal('خطأ', data.error || 'فشل حفظ القالب');
            }
        } catch (error) {
            console.error('Error saving owner template:', error);
            showAlertModal('خطأ', 'حدث خطأ أثناء حفظ القالب');
        }
    });
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initOwnerDashboard();
        setupOwnerTemplateForm();
    });
} else {
    initOwnerDashboard();
    setupOwnerTemplateForm();
}

